// build 0039: turns glTF/GLB character files into the game's compact .cdm model
// usage: node tools/model/build.mjs out.cdm --mesh a.glb [--mesh b.glb@bones=Head,neck_01] [--mesh c.gltf@nodes=Eyes] --anims anims.glb [--keep Walk=walk,Attack=attack] [--attach hand_r,hand_l,head]
//        [--kinds 'Boots|Bracer=leather,Hair=hair'] [--sat .55] [--drop 'Belt_1.001']
// - a mesh file can be filtered: @bones= keeps triangles whose vertices all lean on those bones (e.g. just the head of a full body),
//   @nodes= keeps only those mesh nodes; --drop removes nodes whose names match
// - every vertex keeps the texture colour under it (shrunk, with the ambient-occlusion map baked in), toned down by --sat for the Ashen Gothic look
// - triangles are grouped by material kind (cloth, leather, metal, skin, hair) so the game lights each group right
// - meshes are merged onto one skeleton (all files must share bone names)
// - triangles are grouped by colour (material colour, or the texture colour under each triangle) so the game can light each group as cloth, leather, steel or skin
// - animations are baked to skin matrices at 30 frames a second, so the game only blends matrices at run time
import fs from 'fs'; import zlib from 'zlib'; import path from 'path';
const args = process.argv.slice(2), out = args[0], opt = { mesh: [], anims: null, keep: null, attach: ['hand_r', 'hand_l', 'head'], fps: 30, maxCol: 8, mats: null };
for (let i = 1; i < args.length; i += 2) { const k = args[i].slice(2), v = args[i + 1]; if (k === 'mesh') opt.mesh.push(v); else if (k === 'keep') opt.keep = Object.fromEntries(v.split(',').map(s => s.split('='))); else if (k === 'attach') opt.attach = v.split(','); else if (k === 'mats') opt.mats = JSON.parse(fs.readFileSync(v, 'utf8')); else opt[k] = isNaN(+v) ? v : +v; }

export function loadGltf(file) {
  const buf = fs.readFileSync(file); let json, bin = null;
  if (buf.readUInt32LE(0) === 0x46546c67) { let o = 12; while (o < buf.length) { const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), d = buf.subarray(o + 8, o + 8 + len); if (type === 0x4e4f534a) json = JSON.parse(d.toString('utf8')); else if (type === 0x004e4942) bin = d; o += 8 + len; } }
  else json = JSON.parse(buf.toString('utf8'));
  const dir = path.dirname(file), bufs = (json.buffers || []).map((b, i) => b.uri ? (b.uri.startsWith('data:') ? Buffer.from(b.uri.split(',')[1], 'base64') : fs.readFileSync(path.join(dir, decodeURIComponent(b.uri)))) : bin);
  const view = bvI => { const bv = json.bufferViews[bvI]; return bufs[bv.buffer].subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
  const acc = i => { const a = json.accessors[i], n = NC[a.type], [T, sz] = CT[a.componentType], out = new Float64Array(a.count * n); if (a.bufferView === undefined) return { a: out, n, count: a.count };
    const d = view(a.bufferView), st = json.bufferViews[a.bufferView].byteStride || n * sz, base = a.byteOffset || 0, dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    const rd = { 5120: o => dv.getInt8(o), 5121: o => dv.getUint8(o), 5122: o => dv.getInt16(o, true), 5123: o => dv.getUint16(o, true), 5125: o => dv.getUint32(o, true), 5126: o => dv.getFloat32(o, true) }[a.componentType];
    const nm = a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType] : 0;
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { let v = rd(base + k * st + c * sz); if (nm) v = Math.max(v / nm, -1); out[k * n + c] = v; } return { a: out, n, count: a.count }; };
  const img = i => { const im = json.images[i]; const d = im.uri ? (im.uri.startsWith('data:') ? Buffer.from(im.uri.split(',')[1], 'base64') : fs.readFileSync(path.join(dir, decodeURIComponent(im.uri)))) : view(im.bufferView); return decodePNG(d); };
  return { json, acc, img };
}
// ---- small PNG reader (8-bit RGB/RGBA/grey/palette, non-interlaced), enough for colour-swatch textures ----
export function decodePNG(b) {
  if (b.readUInt32BE(0) !== 0x89504e47) return null; let o = 8, w, h, bd, ct, il, pal = null, trns = null; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; } else if (t === 'PLTE') pal = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break; o += 12 + len; }
  if (bd !== 8 || il) return null; const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), st = w * ch, px = new Uint8Array(w * h * 4); let prev = new Uint8Array(st), cur = new Uint8Array(st);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], row = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let x = 0; x < st; x++) { const a = x >= ch ? cur[x - ch] : 0, up = prev[x], c = x >= ch ? prev[x - ch] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; } cur[x] = v & 255; }
    for (let x = 0; x < w; x++) { const q = (y * w + x) * 4; if (ct === 3) { const k = cur[x]; px[q] = pal[k * 3]; px[q + 1] = pal[k * 3 + 1]; px[q + 2] = pal[k * 3 + 2]; px[q + 3] = trns && k < trns.length ? trns[k] : 255; } else if (ct === 0 || ct === 4) { px[q] = px[q + 1] = px[q + 2] = cur[x * ch]; px[q + 3] = ct === 4 ? cur[x * ch + 1] : 255; } else { px[q] = cur[x * ch]; px[q + 1] = cur[x * ch + 1]; px[q + 2] = cur[x * ch + 2]; px[q + 3] = ct === 6 ? cur[x * ch + 3] : 255; } }
    [prev, cur] = [cur, prev]; }
  return { w, h, px };
}
// ---- matrix helpers (column-major 4x4, like glTF) ----
const I4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const trs = (t, q, s) => { const [x, y, z, w] = q, [sx, sy, sz] = s; return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, t[0], t[1], t[2], 1]; };
const nodeLocal = n => n.matrix ? n.matrix.slice() : trs(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]);
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1; if (d < 0) { d = -d; s = -1; } let k0 = 1 - t, k1 = t * s; if (d < .9995) { const th = Math.acos(d), sn = Math.sin(th); k0 = Math.sin((1 - t) * th) / sn; k1 = Math.sin(t * th) / sn * s; } const q = [0, 1, 2, 3].map(i => a[i] * k0 + b[i] * k1), l = Math.hypot(...q); return q.map(v => v / l); };
const xf = (m, v, w) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w, m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w, m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w];
const parentsOf = json => { const p = new Array(json.nodes.length).fill(-1); json.nodes.forEach((n, i) => (n.children || []).forEach(c => p[c] = i)); return p; };
const worldOf = (json, local) => { const par = parentsOf(json), W = new Array(json.nodes.length); const get = i => W[i] || (W[i] = par[i] < 0 ? local[i] : mul(get(par[i]), local[i])); json.nodes.forEach((_, i) => get(i)); return W; };

function build() {
  // 1. skeleton from the first mesh file; bones are matched by name in the others
  const specs = opt.mesh.map(m => { const [f, ...fl] = m.split('@'), o = { f }; for (const x of fl) { const [k, v] = x.split('='); o[k] = v.split(','); } return o; });
  const files = specs.map(s => loadGltf(s.f)), G0 = files[0], sk0 = G0.json.skins[0], bones = sk0.joints.map(j => G0.json.nodes[j].name);
  const KIND = { cloth: 6, leather: 7, metal: 4, skin: 8, hair: 9, hairb: 9, beard: 9, trim: 6, plain: 0 }, kindRules = (opt.kinds || '').split(',').filter(Boolean).map(r => { const [re, k] = r.split('='); return [new RegExp(re, 'i'), k]; });
  const tintRules = (opt.tint || '').split(',').filter(Boolean).map(r => { const [re, v] = r.split('='), [hex, amt] = v.split(':'), c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return [new RegExp(re, 'i'), c, amt === undefined ? 1 : +amt]; });
  const drop = opt.drop ? new RegExp(opt.drop) : null, sat = opt.sat === undefined ? 1 : opt.sat, small = new Map();
  // shrink a texture to 256 px (box filter) so each vertex takes the average colour of its patch, not one stray texel
  const shrink = im => { if (!im) return null; if (small.has(im)) return small.get(im); const S = Math.min(256, im.w), k = im.w / S, out = new Float32Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = [0, 0, 0, 0]; let n = 0; for (let yy = Math.floor(y * k); yy < Math.floor((y + 1) * k); yy++) for (let xx = Math.floor(x * k); xx < Math.floor((x + 1) * k); xx++) { const q = (yy * im.w + xx) * 4; for (let c = 0; c < 4; c++) a[c] += im.px[q + c]; n++; } for (let c = 0; c < 4; c++) out[(y * S + x) * 4 + c] = a[c] / n / 255; }
    const r = { w: S, h: S, px: out }; small.set(im, r); return r; };
  const samp = (t, u, v) => { u -= Math.floor(u); v -= Math.floor(v); const x = u * t.w - .5, y = v * t.h - .5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, o = [0, 0, 0, 0];
    for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) { const xx = (x0 + dx + t.w) % t.w, yy = (y0 + dy + t.h) % t.h, q = (yy * t.w + xx) * 4; for (let c = 0; c < 4; c++) o[c] += t.px[q + c] * w; } return o; };
  const tris = []; // {p:[3], n:[3], j:[3], w:[3], c:[3 colours], kind}
  files.forEach((G, fi) => { const J = G.json, local = J.nodes.map(nodeLocal), W = worldOf(J, local), sp = specs[fi], keepB = sp.bones ? sp.bones.map(b => b.toLowerCase()) : null, dropB = sp.nobones ? sp.nobones.map(b => b.toLowerCase()) : null, pngCache = new Map();
    const img = i => { if (!pngCache.has(i)) { const d = G.img(i); pngCache.set(i, shrink(d)); } return pngCache.get(i); };
    J.nodes.forEach((node, ni) => { if (node.mesh === undefined) return; const nname = node.name || J.meshes[node.mesh].name || ''; if (sp.nodes && !sp.nodes.includes(nname)) return; if (drop && drop.test(nname)) return;
      const skin = node.skin !== undefined ? J.skins[node.skin] : null, remap = skin ? skin.joints.map(j => { const k = bones.indexOf(J.nodes[j].name); if (k < 0) throw new Error('bone ' + J.nodes[j].name + ' is not in the first skeleton'); return k; }) : null;
      const ibm = skin && skin.inverseBindMatrices !== undefined ? G.acc(skin.inverseBindMatrices).a : null;
      for (const pr of J.meshes[node.mesh].primitives) { if ((pr.mode ?? 4) !== 4) continue; const at = pr.attributes, P = G.acc(at.POSITION), N = at.NORMAL !== undefined ? G.acc(at.NORMAL) : null, UV = at.TEXCOORD_0 !== undefined ? G.acc(at.TEXCOORD_0) : null, JN = at.JOINTS_0 !== undefined ? G.acc(at.JOINTS_0) : null, WT = at.WEIGHTS_0 !== undefined ? G.acc(at.WEIGHTS_0) : null;
        const ix = pr.indices !== undefined ? G.acc(pr.indices).a : Float64Array.from({ length: P.count }, (_, i) => i), mt = J.materials && pr.material !== undefined ? J.materials[pr.material] : {}, pbr = mt.pbrMetallicRoughness || {}, fac = pbr.baseColorFactor || [1, 1, 1, 1];
        const texOf = ti => { if (!ti) return null; const t = J.textures[ti.index]; return t && t.source !== undefined ? img(t.source) : null; };
        const tex = texOf(pbr.baseColorTexture), mrName = pbr.metallicRoughnessTexture ? (J.images[J.textures[pbr.metallicRoughnessTexture.index].source].uri || '') : '', orm = /ORM/i.test(mrName) ? texOf(pbr.metallicRoughnessTexture) : null;
        const label = nname + '/' + (J.meshes[node.mesh].name || '') + '/' + (mt.name || ''); let kind = null; for (const [re, k] of kindRules) if (re.test(label)) { kind = k; break; }
        let tint = null; for (const r of tintRules) if (r[0].test(label)) { tint = r; break; }
        if (!kind) kind = /hair|brow|beard/i.test(label) ? 'hair' : /eye/i.test(label) ? 'plain' : /regular|superhero|skin|body_?skin/i.test(mt.name || '') ? 'skin' : 'cloth';
        const bindOf = k => { if (!skin) return W[ni]; let m = new Array(16).fill(0); for (let c = 0; c < 4; c++) { const w = WT.a[k * 4 + c]; if (!w) continue; const jl = JN.a[k * 4 + c], jm = mul(W[skin.joints[jl]], Array.from(ibm.subarray(jl * 16, jl * 16 + 16))); for (let i = 0; i < 16; i++) m[i] += jm[i] * w; } return m; };
        const pin = !skin ? (() => { let p = ni; const par = parentsOf(J); while (p >= 0 && bones.indexOf(J.nodes[p].name) < 0) p = par[p]; return p >= 0 ? bones.indexOf(J.nodes[p].name) : 0; })() : 0;
        const vcache = new Map(), vert = k => { if (vcache.has(k)) return vcache.get(k); const M = bindOf(k), p = xf(M, [P.a[k * 3], P.a[k * 3 + 1], P.a[k * 3 + 2]], 1); let n = null; if (N) { n = xf(M, [N.a[k * 3], N.a[k * 3 + 1], N.a[k * 3 + 2]], 0); const l = Math.hypot(...n) || 1; n = n.map(x => x / l); }
            let j = [pin, 0, 0, 0], w = [1, 0, 0, 0]; if (skin) { j = []; w = []; for (let c = 0; c < 4; c++) { j.push(remap[JN.a[k * 4 + c]]); w.push(WT.a[k * 4 + c]); } }
            let c = fac.slice(0, 3); if (tex && UV) { const s2 = samp(tex, UV.a[k * 2], UV.a[k * 2 + 1]); c = c.map((x, i) => x * s2[i]); } let metal = 0; if (orm && UV) { const o = samp(orm, UV.a[k * 2], UV.a[k * 2 + 1]); c = c.map(x => x * (.35 + .65 * o[0])); metal = o[2]; }
            const L = .3 * c[0] + .59 * c[1] + .11 * c[2]; c = c.map(x => L + (x - L) * sat); if (tint) { const tc = tint[1], tl = Math.max(.02, .3 * tc[0] + .59 * tc[1] + .11 * tc[2]); c = c.map((x, i) => x + (Math.min(1.5, L * tc[i] / tl) - x) * tint[2]); } const r = { p, n, j, w, c, metal, key: fi + ':' + ni + ':' + k }; vcache.set(k, r); return r; };
        for (let t = 0; t < ix.length; t += 3) { const vs = [vert(ix[t]), vert(ix[t + 1]), vert(ix[t + 2])];
          if (keepB) { const ok = vs.every(v => { let bi = 0; for (let c = 1; c < 4; c++) if (v.w[c] > v.w[bi]) bi = c; return keepB.includes(bones[v.j[bi]].toLowerCase()); }); if (!ok) continue; }
          if (dropB) { const bad = vs.some(v => { let bi = 0; for (let c = 1; c < 4; c++) if (v.w[c] > v.w[bi]) bi = c; return dropB.includes(bones[v.j[bi]].toLowerCase()); }); if (bad) continue; }
          let nrm = vs.map(v => v.n); if (!N) { const e1 = vs[1].p.map((x, i) => x - vs[0].p[i]), e2 = vs[2].p.map((x, i) => x - vs[0].p[i]), c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...c) || 1; nrm = [0, 1, 2].map(() => c.map(x => x / l)); }
          const mk = (vs[0].metal + vs[1].metal + vs[2].metal) / 3 > .5 && kind !== 'skin' && kind !== 'hair' ? 'metal' : kind;
          tris.push({ v: vs, n: nrm, kind: mk }); } } }); });
  // 1b. build 0042: optional simplify (--cluster metres): vertices of the same kind that fall in one small cell are merged, and triangles that collapse are dropped,
  //     so far-away detail (finger joints, boot stitching) costs no triangles on phones
  if (opt.cluster) { const cs = +opt.cluster, reps = new Map(), seen = new Set(), keep = [];
    const skipK = new Set((opt.clusterskip || 'hair,hairb,beard,plain').split(','));
    for (const t of tris) { if (skipK.has(t.kind)) { keep.push({ raw: t }); continue; } const ks = t.v.map((v, k) => { const key = t.kind + '|' + v.p.map(x => Math.round(x / cs)).join(','); let r = reps.get(key); if (!r) { r = { p: [0, 0, 0], n: [0, 0, 0], c: [0, 0, 0], k: 0, j: v.j, w: v.w, metal: v.metal, key: 'c' + key }; reps.set(key, r); }
        if (!v._in) { v._in = new Set(); } if (!v._in.has(key)) { v._in.add(key); for (let i = 0; i < 3; i++) { r.p[i] += v.p[i]; r.c[i] += v.c[i]; r.n[i] += t.n[k][i]; } r.k++; } return key; });
      if (ks[0] === ks[1] || ks[1] === ks[2] || ks[0] === ks[2]) continue; const id = t.kind + ks.slice().sort().join('#'); if (seen.has(id)) continue; seen.add(id); keep.push({ ks, kind: t.kind }); }
    for (const r of reps.values()) { if (!r.k) continue; r.p = r.p.map(x => x / r.k); r.c = r.c.map(x => x / r.k); const l = Math.hypot(...r.n) || 1; r.n = r.n.map(x => x / l); }
    const before = tris.length; tris.length = 0; for (const t of keep) { if (t.raw) { tris.push(t.raw); continue; } const vs = t.ks.map(k => reps.get(k)); tris.push({ v: vs, n: vs.map(v => v.n), kind: t.kind }); } console.log('simplified', before, '->', tris.length, 'triangles'); }
  // 2. group triangles by material kind
  const groups = new Map(); for (const t of tris) { if (!groups.has(t.kind)) groups.set(t.kind, []); groups.get(t.kind).push(t); }
  const gl = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  // 3. height and foot level, for scaling in game
  let minY = 1e9, maxY = -1e9; for (const t of tris) for (const { p } of t.v) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  // 4. animations: sample every bone at fps, write skin matrices (world x inverse bind) and attach-bone world matrices
  const AJ = opt.anims ? loadGltf(opt.anims) : G0, J0 = G0.json, ibm0 = G0.acc(sk0.inverseBindMatrices).a, AJs = AJ.json, nameIdx = new Map(AJs.nodes.map((n, i) => [n.name, i]));
  const bindLocal = AJs.nodes.map(n => { const k = J0.nodes.findIndex(m => m.name === n.name); return k >= 0 ? nodeLocal(J0.nodes[k]) : nodeLocal(n); });
  const anims = []; if (!opt.meshonly) for (const an of AJs.animations || []) { const nm = opt.keep ? opt.keep[an.name] : an.name; if (!nm) continue; const ch = an.channels.map(c => { const s = an.samplers[c.sampler], ti = AJ.acc(s.input).a, vo = AJ.acc(s.output); return { node: c.target.node, path: c.target.path, ti, vo, step: s.interpolation === 'STEP' }; }); const dur = Math.max(...ch.map(c => c.ti[c.ti.length - 1])), F = Math.max(2, Math.round(dur * opt.fps) + 1), skinM = new Float32Array(F * bones.length * 12), att = new Float32Array(F * opt.attach.length * 12);
    for (let f = 0; f < F; f++) { const t = Math.min(dur, f / opt.fps), T = AJs.nodes.map((n, i) => { const b = J0.nodes.find(m => m.name === n.name) || n; return { t: (b.translation || [0, 0, 0]).slice(), r: (b.rotation || [0, 0, 0, 1]).slice(), s: (b.scale || [1, 1, 1]).slice(), m: b.matrix }; });
      for (const c of ch) { const n = c.vo.n, ti = c.ti; let k = 0; while (k < ti.length - 2 && ti[k + 1] <= t) k++; const a = Math.max(0, Math.min(1, ti.length > 1 ? (t - ti[k]) / ((ti[k + 1] - ti[k]) || 1) : 0)), A = Array.from(c.vo.a.subarray(k * n, k * n + n)), B = ti.length > 1 ? Array.from(c.vo.a.subarray((k + 1) * n, (k + 1) * n + n)) : A; const key = { translation: 't', rotation: 'r', scale: 's' }[c.path]; if (!key) continue; T[c.node].m = null; T[c.node][key] = c.step ? A : key === 'r' ? slerp(A, B, a) : A.map((x, i) => x + (B[i] - x) * a); }
      const W = worldOf(AJs, T.map(x => x.m ? x.m : trs(x.t, x.r, x.s)));
      bones.forEach((bn, bi) => { const ni = nameIdx.get(bn), wm = ni !== undefined ? W[ni] : I4(), sm = mul(wm, Array.from(ibm0.subarray(bi * 16, bi * 16 + 16))), o = (f * bones.length + bi) * 12; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) skinM[o + c * 3 + r] = sm[c * 4 + r]; });
      opt.attach.forEach((an2, ai) => { const ni = [...nameIdx.keys()].find(k => k.toLowerCase().replace(/[^a-z]/g, '') === an2.toLowerCase().replace(/[^a-z]/g, '')); const wm = ni !== undefined ? W[nameIdx.get(ni)] : I4(), o = (f * opt.attach.length + ai) * 12; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) att[o + c * 3 + r] = wm[c * 4 + r]; }); }
    anims.push({ name: nm, frames: F, fps: opt.fps, skinM, att }); }
  // 5. write: shared vertices + 32-bit-free index lists per group (16-bit when they fit)
  const vmap = new Map(), verts = [], idx = [], groupsOut = [];
  for (const [kind, g] of gl) { const start = idx.length;
    for (const t of g) for (let k = 0; k < 3; k++) { const v = t.v[k], n = t.n[k], key = v.key + '|' + n.map(x => Math.round(x * 127)).join(','); let id = vmap.get(key); if (id === undefined) { id = verts.length; vmap.set(key, id); verts.push({ v, n }); } idx.push(id); }
    const av = [0, 0, 0]; for (const t of g) for (const v of t.v) for (let i = 0; i < 3; i++) av[i] += Math.max(0, Math.min(1, v.c[i])) ** 2; /* average colour (squared, as the shader reads it), so the game can dye a group to an exact colour */
    groupsOut.push({ start, count: idx.length - start, col: [1, 1, 1], mat: KIND[kind] ?? 6, kind, avg: av.map(x => Math.round(x / (g.length * 3) * 1e4) / 1e4) }); }
  const V = verts.length, pos = new Float32Array(V * 3), nrm = new Int8Array(V * 4), jn = new Uint8Array(V * 4), wt = new Uint8Array(V * 4), col = new Uint8Array(V * 4), I = V > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  verts.forEach(({ v, n }, i) => { pos.set(v.p, i * 3); for (let c = 0; c < 3; c++) nrm[i * 4 + c] = Math.round(n[c] * 127); const s = v.w.reduce((a, b) => a + b, 0) || 1; const ws = v.w.map(x => Math.round(x / s * 255)); ws[0] += 255 - ws.reduce((a, b) => a + b, 0);
    for (let c = 0; c < 4; c++) { jn[i * 4 + c] = v.j[c]; wt[i * 4 + c] = Math.max(0, ws[c]); } for (let c = 0; c < 3; c++) col[i * 4 + c] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, v.c[c]), 1) * 255))); col[i * 4 + 3] = 255; });
  const ib = Buffer.from(I.buffer), ipad = Buffer.alloc((4 - ib.length % 4) % 4);
  const r6 = x => Math.round(x * 1e6) / 1e6, libHead = {};
  if (opt.meshonly) { // build 0042: mesh only; the moves come from the shared animation file, rebuilt on this skeleton's own bone lengths
    const bn = sk0.joints.map(j => J0.nodes[j]), Wb = worldOf(J0, J0.nodes.map(nodeLocal)), wp = name => { const k = J0.nodes.findIndex(n => n.name === name); return k < 0 ? null : [Wb[k][12], Wb[k][13], Wb[k][14]]; };
    libHead.lib = 1; libHead.bindT = bn.map(n => (n.translation || [0, 0, 0]).map(r6)); libHead.bindR = bn.map(n => (n.rotation || [0, 0, 0, 1]).map(r6));
    libHead.ibm = bones.map((_, bi) => { const m = Array.from(ibm0.subarray(bi * 16, bi * 16 + 16)), o = []; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) o.push(r6(m[c * 4 + r])); return o; });
    // grip points (bind pose, model space): the palm for hands, the middle of the skull for the head, so weapons and hats sit right and follow the bone
    libHead.grip = opt.attach.map(a => { const p = wp(a); if (!p) return [0, 0, 0]; const sd = a.slice(-1), f = wp('middle_01_' + sd); if (/^hand/.test(a) && f) return p.map((x, i) => r6(x + (f[i] - x) * .75)); if (/^head$/i.test(a)) return [r6(p[0]), r6(p[1] + .1), r6(p[2] + .02)]; return p.map(r6); }); }
  const parts = [pos, nrm, jn, wt, col, ib, ipad, ...anims.flatMap(a => [a.skinM, a.att])], head = { ...libHead, v: V, i: idx.length, i32: V > 65535, bones: bones.length, boneNames: bones, parents: bones.map(bn => { const J = G0.json, ni = J.nodes.findIndex(n => n.name === bn); let pi = J.nodes.findIndex(n => (n.children || []).includes(ni)); while (pi >= 0 && bones.indexOf(J.nodes[pi].name) < 0) pi = J.nodes.findIndex(n => (n.children || []).includes(pi)); return pi >= 0 ? bones.indexOf(J.nodes[pi].name) : -1; }), groups: groupsOut, minY, maxY, attach: opt.attach, anims: anims.map(a => ({ name: a.name, frames: a.frames, fps: a.fps })) };
  let hj = Buffer.from(JSON.stringify(head)); const pad = (4 - (hj.length % 4)) % 4; hj = Buffer.concat([hj, Buffer.alloc(pad, 32)]);
  const hdr = Buffer.alloc(8); hdr.write('CDM2', 0); hdr.writeUInt32LE(hj.length, 4); fs.writeFileSync(out, Buffer.concat([hdr, hj, ...parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p.buffer, p.byteOffset, p.byteLength))]));
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', idx.length / 3 + ' triangles', V + ' vertices', bones.length + ' bones', groupsOut.map(g => g.kind + ':' + g.count / 3).join(' '), anims.map(a => a.name + ':' + a.frames).join(' '));
}
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) build();
