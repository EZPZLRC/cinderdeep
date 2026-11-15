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
    md.S = new Float32Array(B * 12); md.T = new Float32Array(A * 12); return md;
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
  return { parse, pose, skin, attach, mask };
})();
if (typeof module !== 'undefined') module.exports = CDM;
