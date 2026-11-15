// makes a tiny skinned test character: a 1.8 m column, bones Hips > Spine > Head and Spine > Hand_R, a textured lower half and a plain upper half, and a 1 s "Walk" that swings the spine
import fs from 'fs'; import zlib from 'zlib';
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const W = 4, H = 4, raw = []; for (let y = 0; y < H; y++) { raw.push(0); for (let x = 0; x < W; x++) raw.push(x < 2 ? 200 : 40, x < 2 ? 40 : 160, 40); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(Buffer.from(raw))), chunk('IEND', Buffer.alloc(0))]);
// geometry: 8-sided column, 6 rings from y 0 to 1.8; rings 0-2 weighted to Hips, 3-5 to Spine; lower uses texture u .2 (red) or .8 (green) by side
const S = 8, R = 6, P = [], N = [], UV = [], J = [], Wt = [], I = [];
for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const a = s / S * Math.PI * 2, y = r / (R - 1) * 1.8; P.push(Math.cos(a) * .25, y, Math.sin(a) * .2); N.push(Math.cos(a), 0, Math.sin(a)); UV.push(Math.sin(a) > 0 ? .2 : .8, .5); const up = r >= 3; J.push(up ? 1 : 0, up ? 0 : 1, 0, 0); Wt.push(r === 2 || r === 3 ? .6 : 1, r === 2 || r === 3 ? .4 : 0, 0, 0); }
for (let r = 0; r < R - 1; r++) for (let s = 0; s < S; s++) { const a = r * S + s, b = r * S + (s + 1) % S, c = a + S, d = b + S; I.push(a, c, b, b, c, d); }
const half = I.length / 2;
const f32 = a => Buffer.from(new Float32Array(a).buffer), u16 = a => Buffer.from(new Uint16Array(a).buffer), u8 = a => Buffer.from(new Uint8Array(a).buffer);
const ibm = [ [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,-.9,0,1], [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,-1.7,0,1], [1,0,0,0, 0,1,0,0, 0,0,1,0, -.3,-1.3,0,1] ].flat();
const times = [0, .5, 1], rots = [0, 0, 0, 1, .2588, 0, 0, .9659, 0, 0, 0, 1];
const blobs = [f32(P), f32(N), f32(UV), u8(J), f32(Wt), u16(I.slice(0, half)), u16(I.slice(half)), f32(ibm), f32(times), f32(rots), png];
let off = 0; const views = blobs.map(b => { const v = { buffer: 0, byteOffset: off, byteLength: b.length }; off += b.length; const p = (4 - off % 4) % 4; off += p; return v; });
const bin = Buffer.concat(blobs.flatMap(b => { const p = (4 - b.length % 4) % 4; return [b, Buffer.alloc(p)]; }));
const VC = P.length / 3, mm = a => { const x = [1e9, 1e9, 1e9], y = [-1e9, -1e9, -1e9]; for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { x[k] = Math.min(x[k], a[i + k]); y[k] = Math.max(y[k], a[i + k]); } return [x, y]; }, [mn, mx] = mm(P);
const gltf = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 4] }],
  nodes: [{ name: 'Hips', children: [1], translation: [0, 0, 0] }, { name: 'Spine', children: [2, 3], translation: [0, .9, 0] }, { name: 'Head', translation: [0, .8, 0] }, { name: 'Hand_R', translation: [.3, .4, 0] }, { name: 'Body', mesh: 0, skin: 0 }],
  skins: [{ joints: [0, 1, 2, 3], inverseBindMatrices: 7 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4 }, indices: 5, material: 0 }, { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4 }, indices: 6, material: 1 }] }],
  materials: [{ name: 'Pants', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }, { name: 'Shirt', pbrMetallicRoughness: { baseColorFactor: [.3, .3, .8, 1] } }],
  textures: [{ source: 0 }], images: [{ bufferView: 10, mimeType: 'image/png' }],
  animations: [{ name: 'Walk', channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }], samplers: [{ input: 8, output: 9 }] }],
  accessors: [{ bufferView: 0, componentType: 5126, count: VC, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5126, count: VC, type: 'VEC3' }, { bufferView: 2, componentType: 5126, count: VC, type: 'VEC2' }, { bufferView: 3, componentType: 5121, count: VC, type: 'VEC4' }, { bufferView: 4, componentType: 5126, count: VC, type: 'VEC4' }, { bufferView: 5, componentType: 5123, count: half, type: 'SCALAR' }, { bufferView: 6, componentType: 5123, count: half, type: 'SCALAR' }, { bufferView: 7, componentType: 5126, count: 4, type: 'MAT4' }, { bufferView: 8, componentType: 5126, count: 3, type: 'SCALAR', min: [0], max: [1] }, { bufferView: 9, componentType: 5126, count: 3, type: 'VEC4' }],
  bufferViews: views, buffers: [{ byteLength: bin.length }] };
let js = Buffer.from(JSON.stringify(gltf)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 32)]);
const hd = Buffer.alloc(12); hd.writeUInt32LE(0x46546c67, 0); hd.writeUInt32LE(2, 4); hd.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4e4f534a, 4); const c2 = Buffer.alloc(8); c2.writeUInt32LE(bin.length, 0); c2.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(process.argv[2], Buffer.concat([hd, c1, js, c2, bin])); console.log('wrote', process.argv[2]);
