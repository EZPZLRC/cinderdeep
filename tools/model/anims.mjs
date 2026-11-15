// build 0042: one shared animation file for every character model.
// usage: node tools/model/anims.mjs out.cdl --anims UAL1_Standard.glb --keep Idle_Loop=idle,Walk_Loop=walk,... [--fps 20]
// Stores, per animation frame, each bone's local rotation (16-bit quaternions) plus the root and pelvis moves.
// The game rebuilds the pose on each character's own skeleton, so women, men and kids keep their own proportions
// while sharing the same moves, and the moves are downloaded once instead of once per character.
import fs from 'fs'; import { loadGltf } from './build.mjs';
const args = process.argv.slice(2), out = args[0], opt = { fps: 20 };
for (let i = 1; i < args.length; i += 2) { const k = args[i].slice(2), v = args[i + 1]; opt[k] = k === 'keep' ? Object.fromEntries(v.split(',').map(s => s.split('='))) : isNaN(+v) ? v : +v; }
const G = loadGltf(opt.anims), J = G.json, sk = J.skins[0], bones = sk.joints.map(j => J.nodes[j].name), nodeOf = new Map(bones.map((b, i) => [sk.joints[i], i]));
const par = new Array(J.nodes.length).fill(-1); J.nodes.forEach((n, i) => (n.children || []).forEach(c => par[c] = i));
const parents = sk.joints.map(j => { let p = par[j]; while (p >= 0 && !nodeOf.has(p)) p = par[p]; return p >= 0 ? nodeOf.get(p) : -1; });
const TB = ['root', 'pelvis'].map(n => bones.indexOf(n)); if (TB.some(x => x < 0)) throw new Error('root or pelvis bone missing');
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1; if (d < 0) { d = -d; s = -1; } let k0 = 1 - t, k1 = t * s; if (d < .9995) { const th = Math.acos(d), sn = Math.sin(th); k0 = Math.sin((1 - t) * th) / sn; k1 = Math.sin(t * th) / sn * s; } const q = [0, 1, 2, 3].map(i => a[i] * k0 + b[i] * k1), l = Math.hypot(...q); return q.map(v => v / l); };
const bind = sk.joints.map(j => { const n = J.nodes[j]; return { t: (n.translation || [0, 0, 0]).slice(), r: (n.rotation || [0, 0, 0, 1]).slice() }; });
const anims = [], parts = []; let warnS = 0;
for (const an of J.animations) { const nm = opt.keep ? opt.keep[an.name] : an.name; if (!nm) continue;
  const ch = an.channels.map(c => { const s = an.samplers[c.sampler]; return { b: nodeOf.get(c.target.node), path: c.target.path, ti: G.acc(s.input).a, vo: G.acc(s.output), step: s.interpolation === 'STEP' }; }).filter(c => c.b !== undefined);
  const dur = Math.max(...ch.map(c => c.ti[c.ti.length - 1])), F = Math.max(2, Math.round(dur * opt.fps) + 1), B = bones.length, q = new Int16Array(F * B * 4), tr = new Float32Array(F * 2 * 3);
  for (let f = 0; f < F; f++) { const t = Math.min(dur, f / opt.fps), R = bind.map(x => x.r.slice()), T = bind.map(x => x.t.slice());
    for (const c of ch) { const n = c.vo.n, ti = c.ti; let k = 0; while (k < ti.length - 2 && ti[k + 1] <= t) k++; const a = Math.max(0, Math.min(1, ti.length > 1 ? (t - ti[k]) / ((ti[k + 1] - ti[k]) || 1) : 0)), A = Array.from(c.vo.a.subarray(k * n, k * n + n)), Bv = ti.length > 1 ? Array.from(c.vo.a.subarray((k + 1) * n, (k + 1) * n + n)) : A;
      const v = c.step ? A : c.path === 'rotation' ? slerp(A, Bv, a) : A.map((x, i) => x + (Bv[i] - x) * a);
      if (c.path === 'rotation') R[c.b] = v; else if (c.path === 'translation') T[c.b] = v; else if (c.path === 'scale' && v.some(x => Math.abs(x - 1) > .02)) warnS++; }
    for (let b = 0; b < B; b++) { let r = R[b]; if (r[3] < 0) r = r.map(x => -x); for (let i = 0; i < 4; i++) q[(f * B + b) * 4 + i] = Math.round(Math.max(-1, Math.min(1, r[i])) * 32767); }
    TB.forEach((b, k) => tr.set(T[b], (f * 2 + k) * 3)); }
  anims.push({ name: nm, frames: F, fps: opt.fps }); parts.push(q, tr); }
const miss = Object.values(opt.keep || {}).filter(n => !anims.find(a => a.name === n)); if (miss.length) throw new Error('animations not found: ' + miss.join(','));
const head = { bones: bones.length, boneNames: bones, parents, tb: TB, refT: TB.map(b => bind[b].t), anims };
let hj = Buffer.from(JSON.stringify(head)); hj = Buffer.concat([hj, Buffer.alloc((4 - hj.length % 4) % 4, 32)]); const hdr = Buffer.alloc(8); hdr.write('CDL1', 0); hdr.writeUInt32LE(hj.length, 4);
fs.writeFileSync(out, Buffer.concat([hdr, hj, ...parts.map(p => Buffer.from(p.buffer, p.byteOffset, p.byteLength))]));
console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', anims.map(a => a.name + ':' + a.frames).join(' '), warnS ? 'warning: ' + warnS + ' scaled bone samples ignored' : '');
