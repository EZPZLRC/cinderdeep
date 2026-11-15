// build 0042: every character shares one animation file (models/anims.cdl); each model only holds its mesh and skeleton,
// and the pose is rebuilt on its own bone lengths (forward kinematics), so women, men and kids keep their proportions.
// build 0039: real character models. Reads the game's baked .cdm files (made by tools/model/build.mjs from glTF),
// blends their baked animations and skins the mesh on the CPU into plain position+normal vertices, one buffer per colour group,
// so the renderer draws them like any other shape with the hero materials (cloth, leather, steel, skin, hair)
const CDM = (() => {
  function parse(ab) {
    const dv = new DataView(ab); const tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)); if (tag !== 'CDM1' && tag !== 'CDM2') throw new Error('not a CDM model');
    const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl))); let o = 8 + hl; const V = head.v, B = head.bones, A = head.attach.length;
    const take = (T, n) => { const a = new T(ab, o, n); o += n * T.BYTES_PER_ELEMENT; return a; };
    const md = { head, pos: take(Float32Array, V * 3), nrm: take(Int8Array, V * 4), jn: take(Uint8Array, V * 4), wt: take(Uint8Array, V * 4), anims: {}, inst: {} };
    // CDM2: a colour per vertex and shared vertices with index lists (much smaller files)
    if (tag === 'CDM2') { md.col = take(Uint8Array, V * 4); md.idx = take(head.i32 ? Uint32Array : Uint16Array, head.i); o = (o + 3) & ~3; }
    for (const a of head.anims) md.anims[a.name] = { F: a.frames, fps: a.fps, dur: (a.frames - 1) / a.fps, skin: take(Float32Array, a.frames * B * 12), att: take(Float32Array, a.frames * A * 12) };
    md.S = new Float32Array(B * 12); md.T = new Float32Array(A * 12);
    if (head.lib) { md.ibm = Float32Array.from(head.ibm.flat()); md.W = new Float32Array(B * 12); md.Q = new Float32Array(B * 4); md.tw = new Float32Array(B); md.dT = new Float32Array(B * 3); }
    return md;
  }
  // the shared animation file: per frame, each bone's local rotation (16-bit quaternion) plus the root and pelvis moves
  function lib(ab) {
    const dv = new DataView(ab); if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'CDL1') throw new Error('not an animation file');
    const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl))); let o = 8 + hl; const B = head.bones, anims = {};
    const take = (T, n) => { const a = new T(ab, o, n); o += n * T.BYTES_PER_ELEMENT; return a; };
    for (const a of head.anims) anims[a.name] = { F: a.frames, fps: a.fps, dur: (a.frames - 1) / a.fps, q: take(Int16Array, a.frames * B * 4), t: take(Float32Array, a.frames * 6) };
    return { head, anims };
  }
  // tie a mesh-only model to the shared animations: match bones by name, scale the hip moves to this skeleton's leg length
  function link(md, L) {
    const H = md.head, names = L.head.boneNames; md.L = L; md.anims = L.anims; md.lb = Int16Array.from(H.boneNames, n => names.indexOf(n));
    md.tbi = L.head.tb.map(li => H.boneNames.indexOf(names[li])); const pi = md.tbi[1], rp = L.head.refT[1], bp = pi >= 0 ? H.bindT[pi] : rp;
    md.hipK = Math.hypot(bp[0], bp[1], bp[2]) / (Math.hypot(rp[0], rp[1], rp[2]) || 1);
    md.amap = H.attach.map(a => { const k = H.boneNames.findIndex(n => n.toLowerCase().replace(/[^a-z]/g, '') === a.toLowerCase().replace(/[^a-z]/g, '')); return k < 0 ? 0 : k; });
  }
  // 3x4 column-major affine: o = a x b
  function mm(o, oi, a, ai, b, bi) { for (let c = 0; c < 4; c++) { const x = b[bi + c * 3], y = b[bi + c * 3 + 1], z = b[bi + c * 3 + 2]; for (let r = 0; r < 3; r++) o[oi + c * 3 + r] = a[ai + r] * x + a[ai + 3 + r] * y + a[ai + 6 + r] * z + (c === 3 ? a[ai + 9 + r] : 0); } }
  const LOC = new Float32Array(12);
  function poseFK(md, layers) {
    const H = md.head, B = H.bones, L = md.L, LB = L.head.bones, Q = md.Q, tw = md.tw, dT = md.dT, lb = md.lb, tbi = md.tbi; Q.fill(0); tw.fill(0); dT.fill(0);
    for (const [nm, t, loop, w, mk] of layers) { const an = md.anims[nm]; if (!an || !(w > 0)) continue; let f = t * an.fps; const last = an.F - 1; if (loop) { f %= last; if (f < 0) f += last; } else f = Math.max(0, Math.min(last, f));
      const f0 = Math.floor(f), f1 = Math.min(last, f0 + 1), k = f - f0, q = an.q;
      for (let b = 0; b < B; b++) { const wb = mk ? w * mk[b] : w, li = lb[b]; if (!(wb > 0) || li < 0) continue; const o0 = (f0 * LB + li) * 4, o1 = (f1 * LB + li) * 4;
        let x0 = q[o0], y0 = q[o0 + 1], z0 = q[o0 + 2], w0 = q[o0 + 3], x1 = q[o1], y1 = q[o1 + 1], z1 = q[o1 + 2], w1 = q[o1 + 3]; if (x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1 < 0) { x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
        let x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k, z = z0 + (z1 - z0) * k, ww = w0 + (w1 - w0) * k; const s = b * 4; if (Q[s] * x + Q[s + 1] * y + Q[s + 2] * z + Q[s + 3] * ww < 0) { x = -x; y = -y; z = -z; ww = -ww; }
        Q[s] += wb * x; Q[s + 1] += wb * y; Q[s + 2] += wb * z; Q[s + 3] += wb * ww; tw[b] += wb; }
      for (let j = 0; j < 2; j++) { const b = tbi[j]; if (b < 0) continue; const wb = mk ? w * mk[b] : w; if (!(wb > 0)) continue; const r = L.head.refT[j], o0 = f0 * 6 + j * 3, o1 = f1 * 6 + j * 3, K = j ? md.hipK : 1;
        for (let i = 0; i < 3; i++) dT[b * 3 + i] += wb * K * (an.t[o0 + i] + (an.t[o1 + i] - an.t[o0 + i]) * k - r[i]); } }
    const W = md.W, S = md.S, par = H.parents, bT = H.bindT, bR = H.bindR;
    for (let b = 0; b < B; b++) { const s = b * 4; let x, y, z, w; if (tw[b] > 0) { x = Q[s]; y = Q[s + 1]; z = Q[s + 2]; w = Q[s + 3]; const l = Math.hypot(x, y, z, w) || 1; x /= l; y /= l; z /= l; w /= l; } else { const r = bR[b]; x = r[0]; y = r[1]; z = r[2]; w = r[3]; }
      const tv = bT[b], dv = tw[b] > 0 ? 1 / tw[b] : 0;
      LOC[0] = 1 - 2 * (y * y + z * z); LOC[1] = 2 * (x * y + z * w); LOC[2] = 2 * (x * z - y * w); LOC[3] = 2 * (x * y - z * w); LOC[4] = 1 - 2 * (x * x + z * z); LOC[5] = 2 * (y * z + x * w); LOC[6] = 2 * (x * z + y * w); LOC[7] = 2 * (y * z - x * w); LOC[8] = 1 - 2 * (x * x + y * y);
      LOC[9] = tv[0] + dT[b * 3] * dv; LOC[10] = tv[1] + dT[b * 3 + 1] * dv; LOC[11] = tv[2] + dT[b * 3 + 2] * dv;
      const p = par[b]; if (p < 0) W.set(LOC, b * 12); else mm(W, b * 12, W, p * 12, LOC, 0);
      mm(S, b * 12, W, b * 12, md.ibm, b * 12); }
    // attach points: the bone's skin matrix moved to its grip point, so a sword turns with the wrist and a hat with the head
    const T = md.T, gr = H.grip; for (let i = 0; i < md.amap.length; i++) { const s = md.amap[i] * 12, o = i * 12, g = gr ? gr[i] : null; for (let j = 0; j < 9; j++) T[o + j] = S[s + j];
      for (let r = 0; r < 3; r++) T[o + 9 + r] = S[s + 9 + r] + (g ? S[s + r] * g[0] + S[s + 3 + r] * g[1] + S[s + 6 + r] * g[2] : 0); }
  }
  // add w x (frame-blended matrices of one animation at time t) into dst, per bone (mask: optional weight per bone); loop or hold the last frame
  function acc(dst, tot, src, an, t, loop, w, n, mask, map) {
    if (!an || w <= 0) return; let f = t * an.fps; const last = an.F - 1; if (loop) { f %= last; if (f < 0) f += last; } else f = Math.max(0, Math.min(last, f));
    const f0 = Math.floor(f), f1 = Math.min(last, f0 + 1), k = f - f0, a = src === 'skin' ? an.skin : an.att, o0 = f0 * n * 12, o1 = f1 * n * 12;
    for (let b = 0; b < n; b++) { const wb = mask ? w * mask[map ? map[b] : b] : w; if (!(wb > 0)) continue; tot[b] += wb; for (let i = b * 12, e = i + 12; i < e; i++) dst[i] += wb * (a[o0 + i] + (a[o1 + i] - a[o0 + i]) * k); }
  }
  // per-bone weights from a list of bone names (and everything under them), e.g. the upper body for shooting while the legs run
  function mask(md, roots, w0) { const H = md.head, names = H.boneNames, par = H.parents, m = new Float32Array(H.bones); const r = roots.map(x => x.toLowerCase());
    for (let b = 0; b < H.bones; b++) { let k = b, hit = 0; while (k >= 0) { const ix = r.indexOf(names[k].toLowerCase()); if (ix >= 0) { hit = 1; break; } k = par ? par[k] : -1; } m[b] = hit ? 1 : (w0 || 0); } return m; }
  // layers: [[animName, time, loop, weight, mask?], ...]; each bone's weights are normalised, so a masked layer only takes over its own bones
  function pose(md, layers) {
    if (md.L) return poseFK(md, layers);
    const B = md.head.bones, A = md.head.attach.length; md.S.fill(0); md.T.fill(0); const tb = md._tb || (md._tb = new Float32Array(B)), ta = md._ta || (md._ta = new Float32Array(A)); tb.fill(0); ta.fill(0);
    if (!md.amap) md.amap = md.head.attach.map(a => { const k = md.head.boneNames.findIndex(n => n.toLowerCase().replace(/[^a-z]/g, '') === a.toLowerCase().replace(/[^a-z]/g, '')); return k < 0 ? 0 : k; });
    for (const [nm, t, loop, w, mk] of layers) { const an = md.anims[nm]; if (!an || !(w > 0)) continue; acc(md.S, tb, 'skin', an, t, loop, w, B, mk, null); acc(md.T, ta, 'att', an, t, loop, w, A, mk, md.amap); }
    const fix = (M, tw, n) => { for (let b = 0; b < n; b++) { const s = b * 12; if (tw[b] <= 0) { M.fill(0, s, s + 12); M[s] = M[s + 4] = M[s + 8] = 1; } else if (Math.abs(tw[b] - 1) > 1e-4) for (let i = s; i < s + 12; i++) M[i] /= tw[b]; } };
    fix(md.S, tb, B); fix(md.T, ta, A);
  }
  // skin one colour group into out (6 floats a vertex: position then normal)
  function skin(md, gi, out) {
    const g = md.head.groups[gi], S = md.S, P = md.pos, N = md.nrm, J = md.jn, W = md.wt; let q = 0;
    const X = md.idx; for (let q0 = g.start, e = g.start + g.count; q0 < e; q0++) { const v = X ? X[q0] : q0;
      let m0 = 0, m1 = 0, m2 = 0, m3 = 0, m4 = 0, m5 = 0, m6 = 0, m7 = 0, m8 = 0, m9 = 0, m10 = 0, m11 = 0;
      for (let k = 0; k < 4; k++) { const w = W[v * 4 + k]; if (!w) continue; const s = J[v * 4 + k] * 12, f = w / 255; m0 += S[s] * f; m1 += S[s + 1] * f; m2 += S[s + 2] * f; m3 += S[s + 3] * f; m4 += S[s + 4] * f; m5 += S[s + 5] * f; m6 += S[s + 6] * f; m7 += S[s + 7] * f; m8 += S[s + 8] * f; m9 += S[s + 9] * f; m10 += S[s + 10] * f; m11 += S[s + 11] * f; }
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], nx = N[v * 4], ny = N[v * 4 + 1], nz = N[v * 4 + 2];
      out[q] = m0 * x + m3 * y + m6 * z + m9; out[q + 1] = m1 * x + m4 * y + m7 * z + m10; out[q + 2] = m2 * x + m5 * y + m8 * z + m11;
      let a = m0 * nx + m3 * ny + m6 * nz, b = m1 * nx + m4 * ny + m7 * nz, c = m2 * nx + m5 * ny + m8 * nz; const l = Math.hypot(a, b, c) || 1; out[q + 3] = a / l; out[q + 4] = b / l; out[q + 5] = c / l; q += 6;
    } return out;
  }
  // world matrix (3x4, column-major) of an attach bone in the current pose, as a 4x4
  function attach(md, name, o) { const i = md.head.attach.indexOf(name); if (i < 0) return null; const T = md.T, s = i * 12; o = o || new Float32Array(16); for (let c = 0; c < 4; c++) { o[c * 4] = T[s + c * 3]; o[c * 4 + 1] = T[s + c * 3 + 1]; o[c * 4 + 2] = T[s + c * 3 + 2]; o[c * 4 + 3] = c === 3 ? 1 : 0; } return o; }
  return { parse, lib, link, pose, skin, attach, mask };
})();
if (typeof module !== 'undefined') module.exports = CDM;
