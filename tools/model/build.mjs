// build 0039: turns glTF/GLB character files into the game's compact .cdm model
// usage: node tools/model/build.mjs out.cdm --mesh a.glb [--mesh b.glb ...] --anims anims.glb [--keep Walk=walk,Attack=attack] [--attach hand_r,hand_l,head]
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
  const files = opt.mesh.map(loadGltf), G0 = files[0], sk0 = G0.json.skins[0], bones = sk0.joints.map(j => G0.json.nodes[j].name);
  const tris = []; // [p0,p1,p2] [n0,n1,n2] [j0..] [w0..] colour
  for (const G of files) { const J = G.json, local = J.nodes.map(nodeLocal), W = worldOf(J, local);
    J.nodes.forEach((node, ni) => { if (node.mesh === undefined) return; const skin = node.skin !== undefined ? J.skins[node.skin] : null, remap = skin ? skin.joints.map(j => { const k = bones.indexOf(J.nodes[j].name); if (k < 0) throw new Error('bone ' + J.nodes[j].name + ' is not in the first skeleton'); return k; }) : null;
      const ibm = skin && skin.inverseBindMatrices !== undefined ? G.acc(skin.inverseBindMatrices).a : null;
      for (const pr of J.meshes[node.mesh].primitives) { if ((pr.mode ?? 4) !== 4) continue; const P = G.acc(pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? G.acc(pr.attributes.NORMAL) : null, UV = pr.attributes.TEXCOORD_0 !== undefined ? G.acc(pr.attributes.TEXCOORD_0) : null, JN = pr.attributes.JOINTS_0 !== undefined ? G.acc(pr.attributes.JOINTS_0) : null, WT = pr.attributes.WEIGHTS_0 !== undefined ? G.acc(pr.attributes.WEIGHTS_0) : null;
        const ix = pr.indices !== undefined ? G.acc(pr.indices).a : Float64Array.from({ length: P.count }, (_, i) => i), mt = J.materials && pr.material !== undefined ? J.materials[pr.material] : {}, pbr = mt.pbrMetallicRoughness || {}, fac = pbr.baseColorFactor || [1, 1, 1, 1];
        let tex = null; if (pbr.baseColorTexture) { const t = J.textures[pbr.baseColorTexture.index]; if (t && t.source !== undefined) tex = G.img(t.source); }
        // bind pose: skinned meshes go through their own bind matrices into skeleton space; unskinned parts follow their node
        const bindOf = k => { if (!skin) return W[ni]; let m = new Array(16).fill(0); for (let c = 0; c < 4; c++) { const w = WT.a[k * 4 + c]; if (!w) continue; const jl = JN.a[k * 4 + c], jm = mul(W[skin.joints[jl]], Array.from(ibm.subarray(jl * 16, jl * 16 + 16))); for (let i = 0; i < 16; i++) m[i] += jm[i] * w; } return m; };
        const pin = !skin ? (() => { let p = ni; const par = parentsOf(J); while (p >= 0 && bones.indexOf(J.nodes[p].name) < 0) p = par[p]; return p >= 0 ? bones.indexOf(J.nodes[p].name) : 0; })() : 0;
        for (let t = 0; t < ix.length; t += 3) { const v = [ix[t], ix[t + 1], ix[t + 2]], tri = { p: [], n: [], j: [], w: [], mat: mt.name || '' };
          for (const k of v) { const M = bindOf(k), p = xf(M, [P.a[k * 3], P.a[k * 3 + 1], P.a[k * 3 + 2]], 1); tri.p.push(p); if (N) { const n = xf(M, [N.a[k * 3], N.a[k * 3 + 1], N.a[k * 3 + 2]], 0), l = Math.hypot(...n) || 1; tri.n.push(n.map(x => x / l)); }
            if (skin) { const jj = [], ww = []; for (let c = 0; c < 4; c++) { jj.push(remap[JN.a[k * 4 + c]]); ww.push(WT.a[k * 4 + c]); } tri.j.push(jj); tri.w.push(ww); } else { tri.j.push([pin, 0, 0, 0]); tri.w.push([1, 0, 0, 0]); } }
          if (!N) { const e1 = tri.p[1].map((x, i) => x - tri.p[0][i]), e2 = tri.p[2].map((x, i) => x - tri.p[0][i]), c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...c) || 1; tri.n = [0, 1, 2].map(() => c.map(x => x / l)); }
          let col = fac.slice(0, 3); if (tex && UV) { const u = (UV.a[v[0] * 2] + UV.a[v[1] * 2] + UV.a[v[2] * 2]) / 3, vv = (UV.a[v[0] * 2 + 1] + UV.a[v[1] * 2 + 1] + UV.a[v[2] * 2 + 1]) / 3, x = Math.min(tex.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * tex.w))), y = Math.min(tex.h - 1, Math.max(0, Math.floor((vv - Math.floor(vv)) * tex.h))), q = (y * tex.w + x) * 4; col = [0, 1, 2].map(i => Math.pow(tex.px[q + i] / 255, 2.2) * fac[i]); }
          tri.c = col; tris.push(tri); } } }); }
  // 2. group triangles by colour (a few clusters), named by material when the source names it
  const keyOf = t => t.mat + '|' + t.c.map(x => Math.round(x * 12)).join(','); const groups = new Map(); for (const t of tris) { const k = keyOf(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  let gl = [...groups.values()].sort((a, b) => b.length - a.length); while (gl.length > opt.maxCol) { const s = gl.pop(); const avg = g => g[0].c; let bi = 0, bd = 1e9; gl.forEach((g, i) => { const d = avg(g).reduce((s2, x, k) => s2 + (x - avg(s)[k]) ** 2, 0); if (d < bd) { bd = d; bi = i; } }); gl[bi].push(...s); }
  // 3. height and foot level, for scaling in game
  let minY = 1e9, maxY = -1e9; for (const t of tris) for (const p of t.p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  // 4. animations: sample every bone at fps, write skin matrices (world x inverse bind) and attach-bone world matrices
  const AJ = opt.anims ? loadGltf(opt.anims) : G0, J0 = G0.json, ibm0 = G0.acc(sk0.inverseBindMatrices).a, AJs = AJ.json, nameIdx = new Map(AJs.nodes.map((n, i) => [n.name, i]));
  const bindLocal = AJs.nodes.map(n => { const k = J0.nodes.findIndex(m => m.name === n.name); return k >= 0 ? nodeLocal(J0.nodes[k]) : nodeLocal(n); });
  const anims = []; for (const an of AJs.animations || []) { const nm = opt.keep ? opt.keep[an.name] : an.name; if (!nm) continue; const ch = an.channels.map(c => { const s = an.samplers[c.sampler], ti = AJ.acc(s.input).a, vo = AJ.acc(s.output); return { node: c.target.node, path: c.target.path, ti, vo, step: s.interpolation === 'STEP' }; }); const dur = Math.max(...ch.map(c => c.ti[c.ti.length - 1])), F = Math.max(2, Math.round(dur * opt.fps) + 1), skinM = new Float32Array(F * bones.length * 12), att = new Float32Array(F * opt.attach.length * 12);
    for (let f = 0; f < F; f++) { const t = Math.min(dur, f / opt.fps), T = AJs.nodes.map((n, i) => { const b = J0.nodes.find(m => m.name === n.name) || n; return { t: (b.translation || [0, 0, 0]).slice(), r: (b.rotation || [0, 0, 0, 1]).slice(), s: (b.scale || [1, 1, 1]).slice(), m: b.matrix }; });
      for (const c of ch) { const n = c.vo.n, ti = c.ti; let k = 0; while (k < ti.length - 2 && ti[k + 1] <= t) k++; const a = Math.max(0, Math.min(1, ti.length > 1 ? (t - ti[k]) / ((ti[k + 1] - ti[k]) || 1) : 0)), A = Array.from(c.vo.a.subarray(k * n, k * n + n)), B = ti.length > 1 ? Array.from(c.vo.a.subarray((k + 1) * n, (k + 1) * n + n)) : A; const key = { translation: 't', rotation: 'r', scale: 's' }[c.path]; if (!key) continue; T[c.node].m = null; T[c.node][key] = c.step ? A : key === 'r' ? slerp(A, B, a) : A.map((x, i) => x + (B[i] - x) * a); }
      const W = worldOf(AJs, T.map(x => x.m ? x.m : trs(x.t, x.r, x.s)));
      bones.forEach((bn, bi) => { const ni = nameIdx.get(bn), wm = ni !== undefined ? W[ni] : I4(), sm = mul(wm, Array.from(ibm0.subarray(bi * 16, bi * 16 + 16))), o = (f * bones.length + bi) * 12; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) skinM[o + c * 3 + r] = sm[c * 4 + r]; });
      opt.attach.forEach((an2, ai) => { const ni = [...nameIdx.keys()].find(k => k.toLowerCase().replace(/[^a-z]/g, '') === an2.toLowerCase().replace(/[^a-z]/g, '')); const wm = ni !== undefined ? W[nameIdx.get(ni)] : I4(), o = (f * opt.attach.length + ai) * 12; for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) att[o + c * 3 + r] = wm[c * 4 + r]; }); }
    anims.push({ name: nm, frames: F, fps: opt.fps, skinM, att }); }
  // 5. write
  const V = tris.length * 3, pos = new Float32Array(V * 3), nrm = new Int8Array(V * 4), jn = new Uint8Array(V * 4), wt = new Uint8Array(V * 4), groupsOut = []; let v = 0;
  for (const g of gl) { const start = v, c = g[0].c, mats = {}; for (const t of g) mats[t.mat] = (mats[t.mat] || 0) + 1; const mname = Object.entries(mats).sort((a, b) => b[1] - a[1])[0][0];
    for (const t of g) for (let k = 0; k < 3; k++) { pos.set(t.p[k], v * 3); for (let i = 0; i < 3; i++) nrm[v * 4 + i] = Math.round(t.n[k][i] * 127); const s = t.w[k].reduce((a, b) => a + b, 0) || 1; let ws = t.w[k].map(x => Math.round(x / s * 255)); ws[0] += 255 - ws.reduce((a, b) => a + b, 0); for (let i = 0; i < 4; i++) { jn[v * 4 + i] = t.j[k][i]; wt[v * 4 + i] = Math.max(0, ws[i]); } v++; }
    groupsOut.push({ start, count: v - start, col: c.map(x => +x.toFixed(4)), mat: mname, kind: opt.mats && opt.mats[mname] || null }); }
  const parts = [pos, nrm, jn, wt, ...anims.flatMap(a => [a.skinM, a.att])], head = { v: V, bones: bones.length, boneNames: bones, groups: groupsOut, minY, maxY, attach: opt.attach, anims: anims.map(a => ({ name: a.name, frames: a.frames, fps: a.fps })) };
  let hj = Buffer.from(JSON.stringify(head)); const pad = (4 - (hj.length % 4)) % 4; hj = Buffer.concat([hj, Buffer.alloc(pad, 32)]);
  const hdr = Buffer.alloc(8); hdr.write('CDM1', 0); hdr.writeUInt32LE(hj.length, 4); fs.writeFileSync(out, Buffer.concat([hdr, hj, ...parts.map(p => Buffer.from(p.buffer, p.byteOffset, p.byteLength))]));
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', V / 3 + ' triangles', bones.length + ' bones', groupsOut.length + ' colour groups', anims.map(a => a.name + ':' + a.frames).join(' '));
}
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) build();
