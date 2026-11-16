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
    if (md.ik) ikArms(md);
    // attach points: the bone's skin matrix moved to its grip point, so a sword turns with the wrist and a hat with the head
    const T = md.T, gr = H.grip; for (let i = 0; i < md.amap.length; i++) { const s = md.amap[i] * 12, o = i * 12, g = gr ? gr[i] : null; for (let j = 0; j < 9; j++) T[o + j] = S[s + j];
      for (let r = 0; r < 3; r++) T[o + 9 + r] = S[s + 9 + r] + (g ? S[s + r] * g[0] + S[s + 3 + r] * g[1] + S[s + 6 + r] * g[2] : 0); }
  }

  // build 0113: reach. Each md.ik entry {s: 'r' or 'l', p: wrist target, d: weapon axis (hand z), u: second axis (hand x), w: weight, pole: elbow hint}
  // bends that arm (shoulder and elbow) so the wrist lands on p and turns the hand so a held weapon points along d, then refreshes the skin.
  // Everything is in model space. This is how each weapon gets its own carry, stance and swing on top of the shared animations.
  const IKC = new Float32Array(9);
  function sub3(a, i, b, j) { return [a[i] - b[j], a[i + 1] - b[j + 1], a[i + 2] - b[j + 2]]; }
  function nrm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function crs(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function qm(q) { const [x, y, z, w] = q; IKC[0] = 1 - 2 * (y * y + z * z); IKC[1] = 2 * (x * y + z * w); IKC[2] = 2 * (x * z - y * w); IKC[3] = 2 * (x * y - z * w); IKC[4] = 1 - 2 * (x * x + z * z); IKC[5] = 2 * (y * z + x * w); IKC[6] = 2 * (x * z + y * w); IKC[7] = 2 * (y * z - x * w); IKC[8] = 1 - 2 * (x * x + y * y); return IKC; }
  function qft(a, b) { a = nrm(a); b = nrm(b); const c = crs(a, b), d = dot(a, b); if (d < -.9999) { let ax = crs(a, [1, 0, 0]); if (Math.hypot(ax[0], ax[1], ax[2]) < 1e-3) ax = crs(a, [0, 1, 0]); ax = nrm(ax); return [ax[0], ax[1], ax[2], 0]; } const q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(q[0], q[1], q[2], q[3]); return q.map(v => v / l); }
  function qpow(q, w) { if (w >= 1) return q; const c = Math.max(-1, Math.min(1, q[3])), a = Math.acos(c), sa = Math.sin(a); if (sa < 1e-6) return [0, 0, 0, 1]; const k = Math.sin(a * w) / sa; return [q[0] * k, q[1] * k, q[2] * k, Math.cos(a * w)]; }
  // mat3 (columns) to quaternion
  function m2q(m) { const t = m[0] + m[4] + m[8]; let x, y, z, w; if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m[5] - m[7]) / s; y = (m[6] - m[2]) / s; z = (m[1] - m[3]) / s; }
    else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; w = (m[5] - m[7]) / s; x = s / 4; y = (m[3] + m[1]) / s; z = (m[6] + m[2]) / s; }
    else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; w = (m[6] - m[2]) / s; x = (m[3] + m[1]) / s; y = s / 4; z = (m[7] + m[5]) / s; }
    else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; w = (m[1] - m[3]) / s; x = (m[6] + m[2]) / s; y = (m[7] + m[5]) / s; z = s / 4; } if (w < 0) { x = -x; y = -y; z = -z; w = -w; } return [x, y, z, w]; }
  function spin(md, list, q, c) { const R = qm(q), W = md.W; for (const b of list) { const i = b * 12; for (let k = 0; k < 4; k++) { const o = i + k * 3; let x = W[o], y = W[o + 1], z = W[o + 2]; if (k === 3) { x -= c[0]; y -= c[1]; z -= c[2]; }
        const nx = R[0] * x + R[3] * y + R[6] * z, ny = R[1] * x + R[4] * y + R[7] * z, nz = R[2] * x + R[5] * y + R[8] * z; W[o] = nx + (k === 3 ? c[0] : 0); W[o + 1] = ny + (k === 3 ? c[1] : 0); W[o + 2] = nz + (k === 3 ? c[2] : 0); } } }
  function ikArms(md) {
    const H = md.head, W = md.W, S = md.S; if (!md._ikc) { const nm = H.boneNames, par = H.parents, f = n => nm.indexOf(n), subOf = r => { const out = []; for (let b = 0; b < H.bones; b++) { let k = b; while (k >= 0 && k !== r) k = par[k]; if (k === r) out.push(b); } return out; };
      md._ikc = {}; for (const sd of ['r', 'l']) { const ua = f('upperarm_' + sd), la = f('lowerarm_' + sd), ha = f('hand_' + sd); if (ua < 0 || la < 0 || ha < 0) continue; md._ikc[sd] = { ua, la, ha, su: subOf(ua), sl: subOf(la), sh: subOf(ha) }; } }
    const L = typeof md.ik === 'function' ? md.ik(md) : md.ik; if (!L) return;
    for (const k of L) { const C = md._ikc[k.s], w = Math.max(0, Math.min(1, k.w)); if (!C || !(w > .001)) continue;
      const Sp = [W[C.ua * 12 + 9], W[C.ua * 12 + 10], W[C.ua * 12 + 11]], Ep = [W[C.la * 12 + 9], W[C.la * 12 + 10], W[C.la * 12 + 11]], Hp = [W[C.ha * 12 + 9], W[C.ha * 12 + 10], W[C.ha * 12 + 11]];
      const a = Math.hypot(Ep[0] - Sp[0], Ep[1] - Sp[1], Ep[2] - Sp[2]), b = Math.hypot(Hp[0] - Ep[0], Hp[1] - Ep[1], Hp[2] - Ep[2]);
      const P = [Hp[0] + (k.p[0] - Hp[0]) * w, Hp[1] + (k.p[1] - Hp[1]) * w, Hp[2] + (k.p[2] - Hp[2]) * w]; let dv = [P[0] - Sp[0], P[1] - Sp[1], P[2] - Sp[2]], d = Math.hypot(dv[0], dv[1], dv[2]);
      const dc = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, d)); const n = d > 1e-6 ? [dv[0] / d, dv[1] / d, dv[2] / d] : [0, -1, 0];
      let h = k.pole || [Ep[0] - Sp[0], Ep[1] - Sp[1], Ep[2] - Sp[2]]; h = [h[0] - n[0] * dot(h, n), h[1] - n[1] * dot(h, n), h[2] - n[2] * dot(h, n)]; if (Math.hypot(h[0], h[1], h[2]) < 1e-4) h = [0, -1, 0]; h = nrm(h);
      const cA = Math.max(-1, Math.min(1, (a * a + dc * dc - b * b) / (2 * a * dc))), sA = Math.sqrt(1 - cA * cA), E2 = [Sp[0] + (n[0] * cA + h[0] * sA) * a, Sp[1] + (n[1] * cA + h[1] * sA) * a, Sp[2] + (n[2] * cA + h[2] * sA) * a];
      spin(md, C.su, qft([Ep[0] - Sp[0], Ep[1] - Sp[1], Ep[2] - Sp[2]], [E2[0] - Sp[0], E2[1] - Sp[1], E2[2] - Sp[2]]), Sp);
      const H1 = [W[C.ha * 12 + 9], W[C.ha * 12 + 10], W[C.ha * 12 + 11]], Pc = [Sp[0] + n[0] * dc, Sp[1] + n[1] * dc, Sp[2] + n[2] * dc];
      spin(md, C.sl, qft([H1[0] - E2[0], H1[1] - E2[1], H1[2] - E2[2]], [Pc[0] - E2[0], Pc[1] - E2[1], Pc[2] - E2[2]]), E2);
      if (k.d) { // the hand's skin frame (what a held weapon follows) is W * ibm; turn the hand so that frame's z is d and x lies along u
        const hi = C.ha * 12, ib = md.ibm, R = new Float32Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) R[c * 3 + r] = W[hi + r] * ib[hi + c * 3] + W[hi + 3 + r] * ib[hi + c * 3 + 1] + W[hi + 6 + r] * ib[hi + c * 3 + 2];
        const zc = nrm([R[6], R[7], R[8]]), xc0 = [R[0], R[1], R[2]], xc = nrm(crs(crs(zc, xc0), zc)), yc = crs(zc, xc);
        const zt = nrm(k.d); let xt = k.u ? [k.u[0] - zt[0] * dot(k.u, zt), k.u[1] - zt[1] * dot(k.u, zt), k.u[2] - zt[2] * dot(k.u, zt)] : crs(crs(zt, xc), zt); if (Math.hypot(xt[0], xt[1], xt[2]) < 1e-4) xt = crs(crs(zt, xc), zt); xt = nrm(xt); const yt = crs(zt, xt);
        const M3 = new Array(9);
        // rotation taking current frame (xc,yc,zc) to target (xt,yt,zt): Rm = T * C^T
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) M3[c * 3 + r] = xt[r] * xc[c] + yt[r] * yc[c] + zt[r] * zc[c];
        spin(md, C.sh, qpow(m2q(M3), w * (k.dw === undefined ? 1 : k.dw)), Pc); }
      for (const bb of C.su) mm(S, bb * 12, W, bb * 12, md.ibm, bb * 12); }
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
