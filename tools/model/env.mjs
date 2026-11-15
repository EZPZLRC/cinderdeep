// build 0045: bake scenery (buildings, props, trees, rocks) from glTF packs into one mesh pack for the game.
// usage: node tools/model/env.mjs <recipe.json> <packs folder> <out.cde> <textures.json>
// The recipe lists items; each item is one or more glTF pieces merged into one mesh: { "n": name, "parts": [[file, x, y, z, ry, s]], "s": scale }.
// Every vertex keeps its UV, a texture layer (one per base-colour image, or a flat colour) and a material code for the game shader.
import fs from 'fs'; import path from 'path'; import { loadGltf } from './build.mjs';
const [recipeF, root, outF, texF] = process.argv.slice(2), R = JSON.parse(fs.readFileSync(recipeF, 'utf8'));
const find = (() => { const all = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.gltf') || e.name.endsWith('.glb')) all.push(p); } }; walk(root); return n => { const f = all.find(p => path.basename(p).replace(/\.gl(tf|b)$/, '') === n); if (!f) throw new Error('no glTF named ' + n); return f; }; })();
const matRules = (R.mats || []).map(([re, code]) => [new RegExp(re, 'i'), code]);
const layers = [], layerOf = key => { let i = layers.findIndex(l => l.key === key.key); if (i < 0) { i = layers.length; layers.push(key); } return i; };
const cache = new Map(), I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const trs = (t, q, s) => { const [x, y, z, w] = q, [sx, sy, sz] = s; return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, t[0], t[1], t[2], 1]; };
const nodeLocal = n => n.matrix ? n.matrix.slice() : trs(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]);
// one glTF file -> triangles in its own space: {p, n, uv, layer, mat}
function piece(name) {
  if (cache.has(name)) return cache.get(name); const file = find(name), G = loadGltf(file), J = G.json, par = new Array(J.nodes.length).fill(-1); J.nodes.forEach((n, i) => (n.children || []).forEach(c => par[c] = i));
  const W = []; const world = i => W[i] || (W[i] = par[i] < 0 ? nodeLocal(J.nodes[i]) : mul(world(par[i]), nodeLocal(J.nodes[i])));
  const V = [], T = [];
  J.nodes.forEach((node, ni) => { if (node.mesh === undefined) return; const M = world(ni);
    for (const pr of J.meshes[node.mesh].primitives) { if ((pr.mode ?? 4) !== 4) continue; const at = pr.attributes, P = G.acc(at.POSITION), N = at.NORMAL !== undefined ? G.acc(at.NORMAL) : null, UV = at.TEXCOORD_0 !== undefined ? G.acc(at.TEXCOORD_0) : null;
      const mt = J.materials && pr.material !== undefined ? J.materials[pr.material] : { name: 'none' }, pbr = mt.pbrMetallicRoughness || {}, fac = pbr.baseColorFactor || [1, 1, 1, 1];
      let code = 0; for (const [re, c] of matRules) if (re.test(mt.name || '')) { code = c; break; }
      const bt = pbr.baseColorTexture, img = bt && J.textures[bt.index] && J.textures[bt.index].source !== undefined ? J.images[J.textures[bt.index].source] : null;
      const layer = img && img.uri ? layerOf({ key: path.join(path.dirname(file), decodeURIComponent(img.uri)), file: path.join(path.dirname(file), decodeURIComponent(img.uri)), alpha: code === 2, fac }) : layerOf({ key: 'flat:' + fac.slice(0, 3).map(v => Math.round(v * 255)).join(','), flat: fac.slice(0, 3) });
      const base = V.length, ix = pr.indices !== undefined ? G.acc(pr.indices).a : Float64Array.from({ length: P.count }, (_, i) => i);
      for (let k = 0; k < P.count; k++) { const x = P.a[k * 3], y = P.a[k * 3 + 1], z = P.a[k * 3 + 2]; const p = [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]];
        let n = [0, 1, 0]; if (N) { const a = N.a[k * 3], b = N.a[k * 3 + 1], c = N.a[k * 3 + 2]; n = [M[0] * a + M[4] * b + M[8] * c, M[1] * a + M[5] * b + M[9] * c, M[2] * a + M[6] * b + M[10] * c]; const l = Math.hypot(...n) || 1; n = n.map(v => v / l); }
        V.push({ p, n, uv: UV ? [UV.a[k * 2], UV.a[k * 2 + 1]] : [.5, .5], layer, mat: code }); }
      for (let t = 0; t < ix.length; t += 3) T.push([base + ix[t], base + ix[t + 1], base + ix[t + 2]]); } });
  const r = { V, T }; cache.set(name, r); return r;
}
const items = [];
for (const it of R.items) { const V = [], T = [], s0 = it.s || R.s || 1;
  for (const [f, x = 0, y = 0, z = 0, ry = 0, s = 1] of it.parts.map(p => typeof p === 'string' ? [p] : p)) { const pc = piece(f), c = Math.cos(ry), sn = Math.sin(ry), k = s * s0, base = V.length;
    for (const v of pc.V) { const [px, py, pz] = v.p, [nx, ny, nz] = v.n; V.push({ ...v, p: [(px * c + pz * sn) * k + x * s0, py * k + y * s0, (-px * sn + pz * c) * k + z * s0], n: [nx * c + nz * sn, ny, -nx * sn + nz * c] }); }
    for (const t of pc.T) T.push(t.map(i => i + base)); }
  // weld identical vertices so the index buffer does its job
  const key = v => v.p.map(x => Math.round(x * 1e4)).join(',') + '|' + v.n.map(x => Math.round(x * 100)).join(',') + '|' + v.uv.map(x => Math.round(x * 1e4)).join(',') + '|' + v.layer + '|' + v.mat, map = new Map(), V2 = [], remap = V.map(v => { const k = key(v); if (!map.has(k)) { map.set(k, V2.length); V2.push(v); } return map.get(k); });
  const T2 = T.map(t => t.map(i => remap[i])).filter(t => t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const v of V2) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], v.p[i]); mx[i] = Math.max(mx[i], v.p[i]); }
  items.push({ n: it.n, V: V2, T: T2, b: [...mn, ...mx].map(v => +v.toFixed(3)) }); }
// pack: 'CDE1', header length, JSON header, then per mesh: positions i16x3, normals i8x4, uv i16x2, layer+mat u8x2 (padded to 4), indices u16/u32
const chunks = [], head = { tex: layers.map((l, i) => ({ i, src: l.file ? path.relative(root, l.file) : null, flat: l.flat || null, alpha: !!l.alpha })), meshes: [] }; let off = 0;
const add = (ta) => { const b = Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength), pad = (4 - b.length % 4) % 4; const o = off; chunks.push(b); if (pad) chunks.push(Buffer.alloc(pad)); off += b.length + pad; return o; };
// positions and UVs are stored as 16-bit steps across each mesh's own range (q = [min xyz, size xyz, min uv, size uv]); the game expands them on load
for (const m of items) { const n = m.V.length, P = new Int16Array(n * 3), Nn = new Int8Array(n * 4), U = new Int16Array(n * 2), L = new Uint8Array(n * 2);
  const un = [1e9, 1e9], ux = [-1e9, -1e9]; for (const v of m.V) for (let i = 0; i < 2; i++) { un[i] = Math.min(un[i], v.uv[i]); ux[i] = Math.max(ux[i], v.uv[i]); }
  const q = [...m.b.slice(0, 3), ...[0, 1, 2].map(i => Math.max(1e-4, m.b[i + 3] - m.b[i])), ...un, ...[0, 1].map(i => Math.max(1e-4, ux[i] - un[i]))].map(v => +v.toFixed(5)), Q = (v, a, s) => Math.round(((v - a) / s) * 65535 - 32768);
  m.V.forEach((v, i) => { for (let k = 0; k < 3; k++) P[i * 3 + k] = Q(v.p[k], q[k], q[3 + k]); Nn.set(v.n.map(x => Math.round(x * 127)), i * 4); for (let k = 0; k < 2; k++) U[i * 2 + k] = Q(v.uv[k], q[6 + k], q[8 + k]); L[i * 2] = v.layer; L[i * 2 + 1] = v.mat; });
  const i32 = n > 65535, I = i32 ? new Uint32Array(m.T.length * 3) : new Uint16Array(m.T.length * 3); m.T.forEach((t, k) => I.set(t, k * 3));
  head.meshes.push({ n: m.n, v: n, i: I.length, i32, b: m.b, q, o: [add(P), add(Nn), add(U), add(L), add(I)] }); }
const hj = Buffer.from(JSON.stringify(head)), hpad = (4 - (hj.length + 8) % 4) % 4, pre = Buffer.alloc(8); pre.write('CDE1', 0, 'ascii'); pre.writeUInt32LE(hj.length + hpad, 4);
fs.writeFileSync(outF, Buffer.concat([pre, hj, Buffer.alloc(hpad, 32), ...chunks])); fs.writeFileSync(texF, JSON.stringify(head.tex, null, 1));
console.log(outF, (fs.statSync(outF).size / 1024).toFixed(0) + ' KB', items.length + ' meshes', layers.length + ' texture layers'); for (const m of items) console.log(' ', m.n, m.T.length + ' tris', m.b.join(' '));
