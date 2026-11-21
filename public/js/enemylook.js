'use strict';
// ===== build 0148: Lee's picked enemy looks (Enemy Looks picker 0001, Nov 16) =====
// Each picked look takes the place of drawEnemy's body for that kind of enemy: new bodies and their own idle, walk,
// attack, hit and death moves. Looks only: stats, hit boxes, drops and XP are unchanged. Kinds with no pick (the world
// boss and the Forsworn King) and the Training Dummy are drawn as before. The server does not load this file.
// Kept cheap for packs: the extra pieces are the game's shared shapes, drawn instanced in a few batches per frame;
// floor monsters on a model follow the same 24-a-frame and distance rules as monModel, and far ones draw their round pieces with the game's cheaper shapes. Every look keeps all its
// pieces. If a model has not loaded, the old drawing is used.
const ENL = (function () {
  const MON_NEAR = 16; // floor monsters farther than this from the hero also draw rounded boxes as plain boxes
  // level of detail for floor monsters away from the hero: past 10, round pieces use the game's 140-triangle sphere instead of
  // the 520-triangle one; past 16, rounded boxes become plain boxes too. At that distance a piece is a few dozen pixels across.
  const LOD_MID = 10, LODG = [null, { sphere: 'blob' }, { sphere: 'blob', rbox: 'box' }];
  let lodP = null, lodO = null, lodM = null;
  function lodPart(s, g, B, a, b, c, d, f, h, i, j, k, l, m, n, o, p, q, r) { return lodP(s, lodM[g] || g, B, a, b, c, d, f, h, i, j, k, l, m, n, o, p, q, r); }
  function lodObj(s, g, x, y, z, ry, sx, sy, sz, c, em, a, e2) { return lodO(s, lodM[g] || g, x, y, z, ry, sx, sy, sz, c, em, a, e2); }
  // ===== kit: small helpers the new looks share. Each one is plain game.js-style code on the game's renderer =====
  // pre(e): what drawEnemy works out before drawing any body (the same lines as game.js build 0136): size, death shrink,
  // the flinch when struck, the wind-up blend, the white flash. dk is how far the death has gone (0 to 1).
  function pre(e, noShrink) {
    const col = GLX.col, md = e.md; let sc = e.sc, y = 0, tilt = 0, ox = 0, oz = 0;
    if (!e.alive && !noShrink) { if (e.fly) { const k = Math.min(1, Math.max(0, e.deadT / .3)); sc *= .35 + .65 * k; y = e.fly.y - (1 - k) * .6; tilt = e.fly.tilt; } else { const k = Math.max(0, e.deadT / .45); sc *= .3 + .7 * k; y = -(1 - k) * .8; } }
    const fdt = Math.min(.1, G.time - (e.wkT === undefined ? G.time : e.wkT)); e.wkT = G.time; e.wk = (e.wk || 0) + ((e.st === 'wind' ? 1 : 0) - (e.wk || 0)) * Math.min(1, fdt * 9);
    const em = e.flash > 0 ? 1.4 : 0, w = e.walk, sw = Math.sin(w), at = Math.max(0, e.atk), wind = e.wk;
    { const q = hitKick(e); if (e.alive && e.hf > 0) e.hf -= fdt; if (q) { tilt = -.42 * q; ox = (e.hdx || 0) * .34 * q; oz = (e.hdz || 0) * .34 * q; } } /* build 0169 (Lee's pick, Snap Back) */
    const moved = Math.abs((e.walk || 0) - (e._mw === undefined ? e.walk : e._mw)); e._mw = e.walk; e._mv = (e._mv || 0) + ((moved > .001 ? 1 : 0) - (e._mv || 0)) * .2;
    const mv = e.alive ? clamp(e._mv, 0, 1) : 0, hit = e.alive && e.hf > 0 ? Math.sin(Math.max(0, e.hf / .22) * Math.PI) : 0;
    const dk = e.alive ? 0 : clamp(1 - e.deadT / (e.dmax || .45), 0, 1);
    return { col, md, c: col(md.c), c2: col(md.c2), ec: col(md.e), sc, y, tilt, ox, oz, em, w, sw, at, wind, t: G.time, mv, hit, dk, alive: e.alive, fdt };
  }
  // post(e): the rings drawEnemy adds under every monster (champion rings, burning, the red wind-up circle). Unchanged.
  function post(e, sc) {
    const col = GLX.col;
    if (e.alive && e.elite === 1) GLX.obj('glow', 'ring', e.x, .07, e.z, G.time, 2.6, 1, 2.6, col(0x5a8cff), 1, .7, -1);
    if (e.alive && e.elite === 2) { GLX.obj('glow', 'ring', e.x, .07, e.z, G.time, 3, 1, 3, col(0xffd84a), 1, .8, -1); GLX.light(e.x, 2, e.z, 7, col(0xffd84a), .5, 2); }
    if (e.burnT > 0 && e.alive) GLX.halo(e.x, 1.2 * sc, e.z, 1.8, col(0xff7a2a), .35);
    if (e.alive && (e.st === 'wind' || e.st === 'cwind')) { const pr = clamp(1 - e.t / ((e.st === 'cwind' ? .7 : e.a.wind) || .5), 0, 1), cast = e.arch === 'caster', wc = col(cast ? 0xffe14a : 0xff3a2a), R = cast ? 1.6 : ((e.a.reach || 2) + e.r) * 2; GLX.obj('glow', 'ring', e.x, .09, e.z, 0, R * (.35 + pr * .65), 1, R * (.35 + pr * .65), wc, 1.4, .35 + pr * .55, -1); if (!cast) GLX.obj('glow', 'disc', e.x + Math.sin(e.rot) * (e.a.reach || 2) * .6, .08, e.z + Math.cos(e.rot) * (e.a.reach || 2) * .6, 0, R * .55, 1, R * .55, wc, 1, .12 + pr * .3, 1); GLX.halo(e.x, 2 * sc, e.z, 1 + pr * 1.4, wc, .25 + pr * .5); }
  }
  // a guardian's floor light and ring, as drawEnemy draws them under every code-built guardian
  function bossGlow(e, ec) { if (e.alive) { GLX.light(e.x, 3, e.z, 12, ec, .8, 5); GLX.obj('glow', 'ring', e.x, .07, e.z, G.time * .5, 6, 1, 6, ec, 1, .35, -1); } }
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const hot = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const ease = k => k * k * (3 - 2 * k);
  const pulse = (t, f) => .5 + .5 * Math.sin(t * f);

  // rig(e, P, nm, o): a monster on a real model, like monModel / bossModel in game.js, with the look, the layered animation,
  // the body sway and the extra pieces each new look adds. o.s scales the model, o.lay(X) gives the animation layers,
  // o.body(X) bends the whole body (lean, bob, lunge), o.look(kind, group, X) dyes each colour group, o.kit(X) adds pieces.
  // X.fr(bone) is that bone's frame in the world (model units); X.bf(bone) is the body's frame moved to that bone.
  const FRS = {};
  function rig(e, P, nm, o) {
    if (!MODELS_ON || !GLX.model) return null;
    const M = GLX.model(nm, 'models/' + nm + '.cdm' + AV()); if (!M || !M.anims || !M.anims.idle) return null;
    const up = UPMASK[nm] || (UPMASK[nm] = CDM.mask(M, ['spine_02'], 0));
    const wnd = e.st === 'wind' || e.st === 'hwind' || e.st === 'cwind', act = Math.max(wnd ? 1 : 0, P.at > 0 ? 1 : 0);
    const X = Object.assign({}, P, { e, M, A: M.anims, up, wnd, act, nm, s: (o.keep ? e.sc : P.sc) * MSC * (o.s || 1), lift: 0, lean: 0, fwd: 0, side: 0, roll: 0, yaw: 0 });
    X.mask = (key, roots, w0) => UPMASK[nm + '|' + key] || (UPMASK[nm + '|' + key] = CDM.mask(M, roots, w0 || 0));
    X.bm = (m, k, key) => { const id = '_b' + (key || 'u'), b = e[id] || (e[id] = new Float32Array(m.length)); for (let i = 0; i < m.length; i++) b[i] = 1 - k * m[i]; return b; };
    const lay = o.lay(X);
    if (o.body) o.body(X);
    if (X._wl && !o.ownGait) { X.lean += X._wl[0]; X.fwd += X._wl[1]; X.lift += X._wl[2]; } /* build 0169: Lurch */
    if (X._cb && e.alive) crushBody(X);
    const y = (o.keep && !e.alive ? (e.fly ? e.fly.y : 0) : P.y) + X.lift - M.head.minY * X.s, ry = e.rot + X.yaw;
    GLX.base(BMm, e.x + P.ox + Math.sin(ry) * X.fwd + Math.cos(ry) * X.side, y, e.z + P.oz + Math.cos(ry) * X.fwd - Math.sin(ry) * X.side, ry, X.s);
    const tl = (o.keep && !e.alive ? 0 : P.tilt) + X.lean; if (tl) tiltBase(BMm, ry, X.s, tl);
    if (X.roll) { /* lean sideways: turn the body's own x and y axes around its forward axis */ const c = Math.cos(X.roll), s = Math.sin(X.roll); for (let i = 0; i < 3; i++) { const a = BMm[i], b = BMm[4 + i]; BMm[i] = a * c + b * s; BMm[4 + i] = -a * s + b * c; } }
    if (!GLX.drawModel(M, BMm, lay, (gi, gr) => o.look(gr.kind, gr, X))) return null;
    X.B = Float32Array.from(BMm);
    X.fr = n => { const h = GLX.attach(M, n, MAT); if (!h) return null; return m4mul(FRS[n] || (FRS[n] = new Float32Array(16)), X.B, h); };
    X.bf = n => { const f = X.fr(n); if (!f) return null; const o2 = FRS['b' + n] || (FRS['b' + n] = new Float32Array(16)); o2.set(X.B); o2[12] = f[12]; o2[13] = f[13]; o2[14] = f[14]; return o2; };
    X.fb = n => boneFrame(M, n, X.B, FRS['k' + n] || (FRS['k' + n] = new Float32Array(16))); // any bone, not only the four attach points
    if (o.kit) o.kit(X);
    return X;
  }
  // pieces in a frame F (a bone's frame or a body frame): solid, and glowing
  function pc(F, g, x, y, z, rx, ry, rz, sx, sy, sz, c, mat, em) { GLX.part('dyn', g, F, x, y, z, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, em || 0, 1, mat || 0); }
  function pco(F, g, x, y, z, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, mat, em) { GLX.part('dyn', g, F, x, y, z, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, em || 0, 1, mat || 0); }
  function gp(F, g, x, y, z, rx, ry, rz, sx, sy, sz, c, em, a) { GLX.part('glow', g, F, x, y, z, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, em === undefined ? 1.6 : em, a === undefined ? 1 : a); }
  // the place a frame puts a point, in the world
  function wp(F, x, y, z) { return [F[0] * x + F[4] * y + F[8] * z + F[12], F[1] * x + F[5] * y + F[9] * z + F[13], F[2] * x + F[6] * y + F[10] * z + F[14]]; }
  // a code-built body's frame, like drawEnemy's BM: at the monster, turned to face, scaled, leaned back by tilt
  function bodyFrame(B, e, P, sc, y, lean, yaw) { GLX.base(B, e.x + P.ox, y === undefined ? P.y : y, e.z + P.oz, e.rot + (yaw || 0), sc); const t = (P.tilt || 0) + (lean || 0); if (t) tiltBase(B, e.rot + (yaw || 0), sc, t); return B; }
  // a spray of bits for a death: n pieces flung out from (x,y,z) over time k (0 to 1), placed the same way every frame
  function spray(e, n, k, x, y, z, R, H, f) { for (let i = 0; i < n; i++) { const a = i * 2.39996 + e.id, r = R * (.5 + .5 * ((i * 7919) % 13) / 13), h = H * (.6 + .4 * ((i * 104729) % 7) / 7), u = Math.min(1, k * 1.4); f(i, x + Math.cos(a) * r * u, Math.max(.04, y + h * u - h * 1.6 * u * u), z + Math.sin(a) * r * u, a, u); } }
  // the model's 'die' animation lies the body down flat, but the model sits on its feet (minus its lowest point when standing),
  // so a full-weight fall would sink under the floor. dieAt(X, rate) gives the animation time and remembers it; dieUp(X)
  // is how far to raise the body as it goes down, so it lands on the ground.
  function dieAt(X, rate) { const t = Math.min(X.A.die.dur * .92, since(X.e) * rate); X.dieT = t; return t; }
  function dieUp(X) { return X.M.head.minY * X.s * clamp(((X.dieT || 0) - .45) / .6, 0, 1); }
  // any bone's frame in the world: the bone's skin matrix (so its axes are the model's own +y up, +z forward when standing),
  // placed where the bone sits in the current pose. The game's GLX.attach gives this only for hands, head and chest.
  const BIND = new Map();
  function boneFrame(M, n, B, o) { let bp = BIND.get(M); if (!bp) BIND.set(M, bp = {}); let r = bp[n];
    if (!r) { const i = M.head.boneNames.indexOf(n); if (i < 0) return null; const I = M.ibm, s = i * 12; /* the bone's place when standing = minus the inverse bind's turn, transposed, times its shift */ const tx = I[s + 9], ty = I[s + 10], tz = I[s + 11]; r = bp[n] = [i, -(I[s] * tx + I[s + 1] * ty + I[s + 2] * tz), -(I[s + 3] * tx + I[s + 4] * ty + I[s + 5] * tz), -(I[s + 6] * tx + I[s + 7] * ty + I[s + 8] * tz)]; }
    const S = M.S, s = r[0] * 12, L = MHB; for (let c = 0; c < 3; c++) { L[c * 4] = S[s + c * 3]; L[c * 4 + 1] = S[s + c * 3 + 1]; L[c * 4 + 2] = S[s + c * 3 + 2]; L[c * 4 + 3] = 0; }
    for (let k = 0; k < 3; k++) L[12 + k] = S[s + k] * r[1] + S[s + 3 + k] * r[2] + S[s + 6 + k] * r[3] + S[s + 9 + k]; L[15] = 1; return m4mul(o, B, L); }


  // ---- from opts.js ----
  // ===== the new looks, part 1: monsters on real models (risen dead, brutes, casters, the Treasure Goblin) =====
  // Each look is { n: name, d: what changes, dead: how long its death plays (seconds), noFling: its own fall instead of
  // the corpse throw, draw(e) }. draw(e) takes the place of drawEnemy for that monster and reads the same fields.
  // the shared animation helpers: stand and walk, with the upper body freed while it attacks, like monModel
  function standWalk(X, idle, gait, gs, isp) {
    const e = X.e, A = X.A, lay = [], bm = X.bm(X.up, X.act);
    if (X.mv < 1) lay.push([idle, X.t * (isp || 1) + e.id * .37, true, 1 - X.mv, bm]);
    if (X.mv > 0) { let ph = (e.walk || 0) / 6.2832 * gs;
      if (gait === 'walk') { /* build 0169 (Lee's pick, Lurch): throws its weight forward with every step */ ph = ph - Math.floor(ph); ph += .03 * Math.sin(12.566 * ph); const sw = Math.sin(12.566 * ph), k = X.mv * (1 - X.act); X._wl = [(.08 + .13 * Math.max(0, sw)) * k, .07 * sw * k, -.05 * Math.pow(.5 + .5 * Math.cos(12.566 * ph), 3) * k]; }
      lay.push([gait, ph * A[gait].dur, true, X.mv, bm]); }
    return lay;
  }
  // where an attack animation is: holds at the strike frame while winding up, then plays the follow-through
  // build 0169 (Lee's pick, Crushing Blow): the sword-and-claw 'attack' winds back during the wind-up and lands its strike frame
  // (.45 s into the clip) at the moment the hit counts, holds a split second on contact, then follows through
  const CB_STRIKE = .45, eOut = (k, p) => 1 - Math.pow(1 - clamp(k, 0, 1), p);
  function swingAt(X, an, strike) { const D = X.A[an].dur;
    if (an === 'attack') { X._cb = 1; if (X.wnd) return .3 * eOut(X.wind, 1.5); const s = clamp(1 - X.at, 0, 1), h = .12; return s < h ? CB_STRIKE + .03 * s / h : CB_STRIKE + .03 + (D - CB_STRIKE - .03) * eOut((s - h) / (1 - h), 2.2); }
    return (X.wnd ? strike * clamp(X.wind, 0, 1) : strike + (1 - strike) * clamp(1 - X.at, 0, 1)) * D; }
  // the body for Crushing Blow: crouch and shiver at the end of the wind-up, a big lunge and a dust ring on contact (a look's own bigger moves win)
  function crushBody(X) { const e = X.e;
    if (X.wnd) { const w = clamp(X.wind, 0, 1), pr = e.st === 'wind' && e.a && e.a.wind ? clamp(1 - e.t / e.a.wind, 0, 1) : 0, sh = clamp((pr - .7) / .3, 0, 1); X.lean = Math.min(X.lean, -.1 * w); X.lift = Math.min(X.lift, -.05 * w); X.roll += .035 * Math.sin(X.t * 70) * sh; e._cbD = 0; }
    else if (X.at > 0) { const s = clamp(1 - X.at, 0, 1); X.fwd = Math.max(X.fwd, .5 * eOut(s / .15, 2) * (1 - ease(clamp((s - .45) / .55, 0, 1)))); X.lean = Math.max(X.lean, .22 * Math.exp(-s * 5)); X.lift = Math.min(X.lift, -.03 * Math.exp(-s * 6));
      if (!e._cbD) { e._cbD = 1; const r = (e.a && e.a.reach || 1.6) * .7; ring(e.x + Math.sin(e.rot) * r, e.z + Math.cos(e.rot) * r, .2, 1.4 * Math.max(.8, e.sc || 1), .45, 0xc8b8a0); } } }
  // seconds since it died
  const since = e => (e.dmax || .45) - e.deadT;
  // the struck reaction: alternates between the two hit animations so blows don't all look the same
  // build 0169 (Snap Back): the hit animation snaps in at full strength and plays out over .45 s; standing still it takes the whole body
  function hitLay(X, lay, w) { const e = X.e, u = e._hT === undefined ? 9 : X.t - e._hT;
    if (e.alive && !X.act && u >= 0 && u < .45) { if (e._hnT !== e._hT) { e._hnT = e._hT; e.hn = e.hn === 'hit' ? 'hit2' : e.hn === 'hit2' ? 'hit' : (e.id & 1 ? 'hit' : 'hit2'); }
      const an = e.hn, D = X.A[an].dur; lay.push([an, Math.min(D, u * (an === 'hit' ? 1 : .9)), false, Math.min(1, (.45 - u) * 4) * (w || 1), X.mv > .3 ? X.up : null]); } }
  // after the death animation, the body settles into the ground
  const sinkAfter = (e, t0, len, d) => -clamp((since(e) - t0) / len, 0, 1) * (d || .9);

  // ---------------- Risen dead (grunts) ----------------


  // ---------------- Hulking brutes ----------------
  // growths for the Living Crust, by floor: what grows on it, its colour, and whether it glows
  const CRUST = { forest: { g: 'tuft', c: 0x4a7a2a, c2: 0x8a6a3a, glow: 0 }, crypt: { g: 'rbox', c: 0x8a8a92, c2: 0x5a5a64, glow: 0 }, lava: { g: 'gem', c: 0x2a1a16, c2: 0xff6a1a, glow: 1 }, ice: { g: 'gem', c: 0xbfe6ff, c2: 0x7ac0ff, glow: 1 }, void: { g: 'gem', c: 0x3a1a5a, c2: 0xd080ff, glow: 1 } };
  function bruteLook(P, md, skinMix, k, gr) { if (k === 'plain') return [hot(P.ec, 3), 2.6, 0]; if (k === 'skin') return [mdye(gr, hexMix(md.c, 0x464e52, skinMix), .95, .72), P.em, 8]; if (k === 'cloth') return [mdye(gr, hexMix(md.c2, 0x2a2420, .45), .9, .8), P.em, 6]; return [MLIFT, P.em, gr.mat]; }

  function X0t() { return G.time; }

  // ---------------- Hooded casters ----------------
  function castLook(P, md, k, gr, robeMix, extra) { if (k === 'plain') return [hot(P.ec, 3), 2.6, 0]; if (k === 'skin') return [mdye(gr, hexMix(md.c, 0x5a6260, .74), .95, .72), P.em, 8]; if (k === 'hair') return [mdye(gr, 0x1a1414, .8, 1), P.em, 9];
    if (k === 'cloth') return [mdye(gr, hexMix(md.c2, 0x2a161a, robeMix), .9, .8), P.em + (extra || 0), 6]; if (k === 'leather') return [mdye(gr, 0x2a201a, .7, 1), P.em, 7]; if (k === 'metal') return [mdye(gr, 0x5a5650, .6, 1.1), P.em, 4]; return [MLIFT, P.em, gr.mat]; }
  // a ring of glowing marks on the floor under a caster while it winds up
  function runeRing(e, ec, k, R, t) { if (k <= 0) return; GLX.obj('glow', 'ring', e.x, .08, e.z, t * .8, R, 1, R, ec, 1.4, .3 + k * .5, -1); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832 + t * .8; GLX.obj('glow', 'box', e.x + Math.cos(a) * R * .42, .09, e.z + Math.sin(a) * R * .42, -a, .28, .02, .1, ec, 1.6, k * .8); } }

  const X0 = { w: 0 };

  // ---------------- Treasure Goblin ----------------
  // its long flapping ears and hooked nose, as today's goblin has them
  function gobHead(X, hd, em) { const t = X.t, sk = GLX.col(0x4e6e5e), skD = GLX.col(0x8a5a5a), flap = X.e.alive ? Math.sin(t * 16) * .12 * X.mv + Math.sin(t * 2.3 + X.e.id) * .05 : .4;
    for (const sd of [1, -1]) { pco(hd, 'cone', .085 * sd, .12, -.02, .25 + flap, 0, -sd * (1.25 - flap), 0, .13, 0, .055, .26, .03, sk, 8, em); pco(hd, 'cone', .085 * sd, .12, -.01, .25 + flap, 0, -sd * (1.25 - flap), 0, .115, .012, .03, .2, .012, skD, 8, em); }
    pco(hd, 'cone', 0, .06, .1, 1.35, 0, 0, 0, .06, 0, .03, .12, .03, sk, 8, em); }
  const gobSkin = (P, k, gr, cloth) => { if (k === 'plain') return [[3, 2.1, .6], 2.8, 0]; if (k === 'skin') return [mdye(gr, 0x4e6e5e, .92, .8), P.em, 8]; if (k === 'cloth') return [mdye(gr, cloth, .9, .85), P.em, 6]; return [MLIFT, P.em, gr.mat]; };
  // gold coins bursting out of something when the goblin dies
  function coinBurst(e, F, k, n, y) { const gd = GLX.col(0xe0b040); if (k <= 0) return; spray(e, n, k, 0, y, 0, 1.6, 1.8, (i, x, yy, z, a, u) => { pc(F, 'cyl', x, yy, z, a * 3, a, u * 6, .12, .035, .12, gd, 4, .5); if (i % 3 === 0) gp(F, 'gem', x, yy + .06, z, 0, a, 0, .05, .09, .05, GLX.col(0xfff0b0), 2.4, 1 - u * .7); }); if (k < .5) GLX.halo(e.x, 1, e.z, 3, gd, .5 * (1 - k * 2)); }
  // the gold glow and coins trailing behind it as it runs
  function coinTrail(e, X, ox, oy, oz, n) { const t = X.t, gd = GLX.col(0xe0b040), fw = [Math.sin(e.rot), Math.cos(e.rot)], q = wp(X.B, ox, oy, oz); if (X.mv > .2) for (let k = 0; k < n; k++) { const u = (t * 1.7 + k / n + e.id * .13) % 1, d = u * 1.4, side = Math.sin(k * 2.4) * .4 * u, h = q[1] + u * .9 - u * u * (1.8 + q[1]);
      GLX.obj('dyn', 'cyl', q[0] - fw[0] * d + fw[1] * side, Math.max(.04, h), q[2] - fw[1] * d - fw[0] * side, t * 9 + k, .09, .025, .09, gd, .6, 1, 4); } GLX.halo(q[0], q[1], q[2], 2.2, gd, .3); GLX.light(e.x, 1.6, e.z, 6, GLX.col(0xffb84a), .8, 3); }


  // ---- from opts2.js ----
  // ===== the new looks, part 2: code-built crawlers and bombers, drawn the way game.js draws them (shapes in a body frame) =====
  // a piece stretched between two points of a frame (a capsule for a leg, a cone for a horn)
  function seg(F, g, a, b, r, c, mat, em, set) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-4;
    GLX.part(set || 'dyn', g, F, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.acos(clamp(dy / L, -1, 1)), Math.atan2(dx, dz), 0, 0, 0, 0, r, L, r, c, em || 0, 1, mat || 0); }
  // a two-part leg from hip h to foot f, the knee bent up and out
  function leg2(F, h, f, L, r, c, c2, em, out) { const mx = (h[0] + f[0]) / 2, my = (h[1] + f[1]) / 2, mz = (h[2] + f[2]) / 2, d = Math.hypot(f[0] - h[0], f[1] - h[1], f[2] - h[2]), up = Math.sqrt(Math.max(0, L * L - d * d / 4));
    const k = [mx + (out || 0) * up * .5, my + up, mz]; seg(F, 'cap', h, k, r, c, 3, em); seg(F, 'cap', k, f, r * .8, c2 || c, 3, em); return k; }
  // where a foot is on its stride: phase ph, stride length s, lift height u
  function stepAt(x, z, ph, s, u, mv) { return [x, Math.max(0, Math.cos(ph)) * u * mv, z + Math.sin(ph) * s * mv]; }
  // the blast when a bomber bursts: a flash, a fireball and a ring rolling out
  function boom(e, k, c, c2, R) { if (k <= 0 || k >= 1) return; const u = ease(k), r = R * (.4 + u * .9); GLX.obj('glow', 'sphere', e.x, 1 + u * .4, e.z, 0, r * .55, r * .5, r * .55, mix3(c, [1, 1, 1], .4 * (1 - k)), 2.2, 1 - k); GLX.obj('glow', 'sphere', e.x, 1, e.z, 0, r * .8, r * .6, r * .8, c2, 1.4, (1 - k) * .5);
    GLX.obj('glow', 'ring', e.x, .1, e.z, 0, R * 2 * u, 1, R * 2 * u, c, 1.6, 1 - k, -1); GLX.halo(e.x, 1, e.z, R * 2.5, c, (1 - k) * .8); GLX.light(e.x, 1.5, e.z, R * 4, c, 2 * (1 - k), 4); }
  const FB = new Float32Array(16), FB2 = new Float32Array(16);

  // ---------------- Crawlers ----------------


  // ---------------- Bombers ----------------


  // ---- from opts3.js ----
  // ===== the new looks, part 3: guardians, the world boss and the pinnacle =====
  // --- shared for the armoured giants on the knight's model (Warden of Bones, Ashen Tyrant, Deepfire Colossus, Forsworn King) ---
  function knCols(md) { const dk = lumHex(md.c) < lumHex(md.c2), plate = hexMix(dk ? md.c : md.c2, 0x3a3a3e, .35), trim = dk ? md.c2 : md.c; return { plate, trim, P: GLX.col(plate), T: GLX.col(trim), steel: GLX.col(hexMix(plate, 0xc8ced8, .55)) }; }
  function knLook(P, K, k, gr, o) { o = o || {}; if (k === 'plain') return [hot(P.ec, 3.5), 3, 0]; if (k === 'hair' || k === 'beard' || k === 'hairb') return null; if (k === 'skin') return [mdye(gr, o.skin || 0x2a2826, .9, .7), P.em, 8];
    if (k === 'metal') return [mdye(gr, o.plate || K.plate, .55, o.lift || 1.15), P.em + (o.glow || 0), 4]; if (k === 'leather') return [mdye(gr, hexMix(K.trim, 0x2a1e16, .6), .7, 1), P.em, 7]; if (k === 'cloth') return [mdye(gr, o.cloth || hexMix(K.trim, 0x241818, .55), .9, .85), P.em, 6]; return [MLIFT, P.em, gr.mat]; }
  // the knight's layered moves: idle and a heavy walk, the upper body freed to swing, the struck flinch
  function knLay(X, an, strike, sp) { const e = X.e; if (!e.alive) return [['die', dieAt(X, sp || 1.3), false, 1]]; const lay = standWalk(X, 'idle', 'walk', .9, .8); if (X.act) lay.push([an || 'attack', swingAt(X, an || 'attack', strike || .38), false, 1, X.up]); hitLay(X, lay, .6); return lay; }
  // a cape of strips hanging from the shoulders that streams back as it moves
  function cape(F, n, W, L, c, t, mv, em, y0, z0) { for (let k = 0; k < n; k++) { const u = n > 1 ? k / (n - 1) - .5 : 0, wv = Math.sin(t * 3 - k * .9) * .08 + Math.sin(t * 1.3 + k) * .04; pco(F, 'rbox', u * W, y0, z0, .12 + mv * .4 + wv, u * .3, 0, 0, -L / 2, 0, W / n * 1.15, L * (1 - Math.abs(u) * .2), .02, k % 2 ? c : shade(c, .82), 6, em); } }
  // a long blade in a hand frame (the hand's z runs along the blade)
  function blade(h, L, Wd, steel, grip, guard, em, glow, gc) { pc(h, 'rbox', 0, 0, -.02, 0, 0, 0, .045, .045, .3, grip, 7, em); pc(h, 'rbox', 0, 0, .14, 0, 0, 0, .06, Wd * 3, .05, guard, 4, em); pc(h, 'rbox', 0, 0, .17 + L / 2, 0, 0, 0, .025, Wd, L, steel, 4, em + glow * .3); pc(h, 'cone', 0, 0, .17 + L + .05, 1.5708, 0, 0, .025, .12, Wd * .9, steel, 4, em);
    if (glow > 0) gp(h, 'rbox', 0, 0, .17 + L / 2, 0, 0, 0, .03, Wd * 1.2, L * .96, gc, 1.4, glow * .6); }
  function deadFade(e, a, b) { return e.alive ? 0 : clamp((since(e) - a) / b, 0, 1); }


  const X1 = { at: 0 };

  // --- the world boss and the pinnacle: the knight's model at twice the size ---


  // --- the shrouded guardians on the cultist model: they float above a shroud ---
  function wrLook(P, md, k, gr, robe, glow) { if (k === 'plain') return [hot(P.ec, 3.5), 3, 0]; if (k === 'hair' || k === 'beard' || k === 'hairb') return null; if (k === 'skin') return [mdye(gr, 0x0c0a10, .9, .6), P.em, 8]; if (k === 'metal') return [mdye(gr, 0x3a3640, .55, 1.1), P.em, 4]; if (k === 'leather') return [mdye(gr, 0x1a1418, .7, 1), P.em, 7]; if (k === 'cloth') return [mdye(gr, robe, .9, 1), P.em + (glow || .12), 6]; return [MLIFT, P.em, gr.mat]; }
  function wrLay(X, an) { const e = X.e, t = X.t; if (!e.alive) return [['die', dieAt(X, .9), false, 1]]; const lay = [['idle', t * .8 + e.id * .37, true, 1, X.bm(X.up, X.act)], ['spidle', t * .8 + e.id * .37, true, 1, X.up]]; if (X.act) lay.push([an || 'cast', swingAt(X, an || 'cast', .45), false, 1, X.up]); hitLay(X, lay, .6); return lay; }
  // how tall and wide a shroud must be to hide the legs: from the floor to just above the hips
  function hips(X, e) { const f = X && X.fb('pelvis'); return f ? [f[13] * 1.08 + .2, X.s * .2] : [2.6 * e.sc / 2.3, .75 * e.sc / 2.3]; }
  // a skirt of hanging strips around a floating body, in the world, centred on the guardian
  function shroud(e, n, R, H, c, t, em, k0, glowC) { for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + t * .15, sw = Math.sin(t * 3 + k * 1.3) * .2, L = H * (.7 + (k % 3) * .15); GLX.part('dyn', 'rbox', IDM, e.x + Math.cos(a) * R, L * .5 * k0 + .1, e.z + Math.sin(a) * R, sw - .1, -a + 1.5708, 0, 0, 0, 0, R * .55, L * k0, .04, shade(c, .7 + (k % 3) * .12), em, 1, 6); }
    if (glowC) GLX.obj('glow', 'disc', e.x, .06, e.z, 0, R * 2.4, 1, R * 2.4, glowC, 1, .3 * k0, 1); }


  // ---- from opts4.js ----
  // ===== the new looks, part 4: the code-built guardians (great beasts, the Rootmother, Magmaw, the Gaping Star) =====
  // a leg for a four-legged beast: hip h to foot f, the knee bent forward (dir 1) or back (dir -1)
  function legQ(F, h, f, L, r, c, c2, em, dir) { const dy = f[1] - h[1], dz = f[2] - h[2], d = Math.hypot(f[0] - h[0], dy, dz) || 1e-4, up = Math.sqrt(Math.max(0, L * L - d * d / 4)), nl = Math.hypot(dy, dz) || 1;
    const k = [(h[0] + f[0]) / 2, (h[1] + f[1]) / 2 - dz / nl * up * dir, (h[2] + f[2]) / 2 + dy / nl * up * dir * -1]; seg(F, 'cap', h, k, r, c, 3, em); seg(F, 'cap', k, f, r * .8, c2 || c, 3, em); return k; }
  // roll a frame onto its side (a for the angle) around its own forward axis
  function rollF(F, a) { if (!a) return F; const c = Math.cos(a), s = Math.sin(a); for (let i = 0; i < 3; i++) { const x = F[i], y = F[4 + i]; F[i] = x * c + y * s; F[4 + i] = -x * s + y * c; } return F; }
  // a guardian's own death: how far it has gone, and the slow sink at the end
  const gd0 = (e, len) => e.alive ? 0 : clamp(since(e) / len, 0, 1);

  // ---------------- Great beasts (Old Thornhide, Rimefang) ----------------


  // ---------------- The Rootmother ----------------
  function rootArm(F, s, sh, el, hd, r, bark, em, twig) { seg(F, 'cap', sh, el, r, bark, 3, em); seg(F, 'cap', el, hd, r * .75, bark, 3, em); for (let k = -1; k <= 1; k++) { const tip = [hd[0] + s * .15 + k * .12, hd[1] - .45, hd[2] + .25 + Math.abs(k) * -.1]; seg(F, 'cone', hd, tip, r * .35, twig || bark, 3, em); } }


  // ---------------- Magmaw ----------------


  // ---------------- The Gaping Star ----------------


  // the theme of a guardian's home floor, for the looks that change with it
  const BTH = new Map(); for (const th in BOSSES) for (const b of BOSSES[th]) BTH.set(b.n, th); if (typeof VAELOTH !== 'undefined') BTH.set(VAELOTH.n, 'lava');
  function bossTheme(e) { return (e.bd && BTH.get(e.bd.n)) || (G.zone && G.zone.def && G.zone.def.theme) || 'crypt'; }
  const LOOKS = {
    grunt: { n: 'Rusted Raider', d: 'A dented iron helm, a notched rusty blade and a split round shield. It walks upright with its shield up, swings the blade in a wide arc and drops its weapons as it falls.', dead: 1.3,
        draw(e) {
          const P = pre(e, true), md = e.md, rust = GLX.col(0x6a4430), iron = GLX.col(0x56524c), wood = GLX.col(0x5a3e26);
          const X = rig(e, P, 'risen', { s: .98, keep: 1,
            lay(X) { if (!e.alive) return [['die', dieAt(X, 2.4), false, 1]];
              const lay = standWalk(X, 'cstance', 'walk', 1.05, .8), L = X.mask('arml', ['clavicle_l'], 0);
              if (X.act) lay.push(['attack', swingAt(X, 'attack', .38), false, 1, X.up]); else lay.push(['torch', .35, false, .7, L]); /* the shield arm stays raised */ hitLay(X, lay); return lay; },
            body(X) { if (X.at > 0) X.fwd = .3 * clamp(X.at, 0, 1); if (X.wnd) X.yaw = -.35 * X.wind; else if (X.at > 0) X.yaw = .25 * clamp(X.at, 0, 1); if (!e.alive) X.lift = dieUp(X) + sinkAfter(e, .85, .45); },
            look(k, gr) { if (k === 'plain') return [hot(P.ec, 3), 2.6, 0]; if (k === 'skin') return [mdye(gr, hexMix(md.c, 0x5a6260, .6), .95, .72), P.em, 8]; if (k === 'cloth') return [mdye(gr, hexMix(md.c2, 0x3a2a20, .55), .9, .8), P.em, 6]; return [MLIFT, P.em, gr.mat]; },
            kit(X) { const hd = X.fr('Head'), hr = X.fr('hand_r'), hl = X.fr('hand_l'), em = P.em, dead = !e.alive;
              if (hd && (!dead || since(e) < .5)) { pc(hd, 'sphere', 0, .09, .0, 0, 0, 0, .27, .25, .29, iron, 4, em); pc(hd, 'rbox', 0, .03, .12, 0, 0, 0, .05, .16, .06, iron, 4, em); pc(hd, 'cyl', 0, .02, 0, 0, 0, 0, .29, .03, .31, rust, 4, em); pc(hd, 'cone', 0, .24, -.02, -.2, 0, 0, .05, .1, .05, rust, 4, em); }
              if (!dead) { if (hr) { pc(hr, 'rbox', 0, 0, -.03, 0, 0, 0, .04, .04, .18, GLX.col(0x3a2a1c), 7, em); pc(hr, 'rbox', 0, 0, .07, 0, 0, 0, .05, .2, .04, iron, 4, em); pc(hr, 'blade', 0, .01, .44, 1.5708, 0, 1.5708, .09, .66, .014, rust, 4, em + (X.at > .3 ? .4 : 0)); pc(hr, 'box', 0, .045, .3, 0, 0, 0, .012, .02, .1, GLX.col(0x2a1a12), 0); }
                if (hl) { pc(hl, 'cyl', .02, 0, .02, 0, 0, 1.5708, .46, .05, .46, wood, 3, em); pc(hl, 'cyl', .045, 0, .02, 0, 0, 1.5708, .14, .03, .14, iron, 4, em); pc(hl, 'cyl', .025, 0, .02, 0, 0, 1.5708, .47, .02, .47, rust, 4, em); pc(hl, 'box', .05, .06, .1, .5, 0, 0, .01, .02, .2, GLX.col(0x1a120c), 0); } } },
          });
          if (!e.alive) { const F = bodyFrame(BM, e, P, e.sc, 0), k = ease(clamp(since(e) * 2.4, 0, 1)); /* blade and shield clatter to the ground */ pc(F, 'blade', .55, .06 + (1 - k) * .9, .3, 1.5708 * k, .6, 1.5708, .12, .9, .02, rust, 4); pc(F, 'cyl', -.55, .05 + (1 - k) * .8, .15, 1.4 * k, 0, 0, .6, .07, .6, wood, 3); pc(F, 'cyl', -.55, .09 + (1 - k) * .8, .15, 1.4 * k, 0, 0, .2, .05, .2, iron, 4); }
          if (!X && e.alive) drawEnemy(e); post(e, P.sc);
        } },
    brute: { n: 'Grave Colossus', d: 'Stone shoulder plates, rusted chains wound round its chest and a huge stone maul. Each step shakes it, it lifts the maul overhead and smashes the ground with a shock ring, and it topples face down with the maul.', dead: 1.6,
        draw(e) {
          const P = pre(e, true), md = e.md, stone = mix3(GLX.col(0x6a6660), P.c, .25), chain = GLX.col(0x4a4440), wood = GLX.col(0x3a2a1c);
          const X = rig(e, P, 'risen', { s: .95, keep: 1, ownGait: 1, /* its own heavy walk */
            lay(X) { if (!e.alive) return [['die', dieAt(X, 1.9), false, 1]];
              const lay = standWalk(X, 'idle', 'walk', .9, .7);
              if (X.act) lay.push(['attack', swingAt(X, 'attack', .45), false, 1, X.up]); hitLay(X, lay, .7); return lay; },
            body(X) { const ph = (e.walk || 0) * .9; X.roll = Math.sin(ph) * .07 * X.mv; X.lift = -Math.abs(Math.cos(ph)) * .08 * X.mv;
              if (X.wnd) X.lean = -.2 * X.wind; else if (X.at > 0) { const k = clamp(X.at, 0, 1); X.lean = .35 * k; X.fwd = .35 * k; }
              if (!e.alive) X.lift = dieUp(X) + sinkAfter(e, 1.3, .3); },
            look(k, gr) { return bruteLook(P, md, .82, k, gr); },
            kit(X) { const em = P.em, cl = X.fb('upperarm_l'), cr = X.fb('upperarm_r'), sp = X.bf('spine_03'), hr = X.fr('hand_r');
              for (const [f, sd] of [[cl, 1], [cr, -1]]) if (f) { pc(f, 'sphere', 0, .06, 0, 0, 0, 0, .3, .2, .3, stone, 3, em); pc(f, 'rbox', 0, .1, 0, 0, 0, .25 * sd, .24, .06, .26, shade(stone, .8), 3, em); }
              if (sp) for (let k = 0; k < 2; k++) pc(sp, 'ring', 0, -.05 - k * .14, 0, 1.5708 + (k ? .25 : -.2), 0, .3 * (k ? -1 : 1), .3, .3, .05, chain, 4, em);
              if (hr && e.alive) { pc(hr, 'rbox', 0, 0, .2, 0, 0, 0, .05, .05, .75, wood, 3, em); pc(hr, 'rbox', 0, 0, .62, 0, 0, 0, .36, .26, .26, stone, 3, em); pc(hr, 'rbox', 0, 0, .62, 0, 0, 0, .38, .1, .28, chain, 4, em); if (X.at > .3) gp(hr, 'rbox', 0, 0, .62, 0, 0, 0, .4, .3, .3, P.ec, 1.4, .35); } },
          });
          if (e.alive && X && X.at > 0) { const k = 1 - clamp(X.at, 0, 1), R = 1 + k * 4, ry = e.rot, fx = e.x + Math.sin(ry) * 2, fz = e.z + Math.cos(ry) * 2; /* the shock ring where the maul lands */ GLX.obj('glow', 'ring', fx, .08, fz, 0, R, 1, R, P.ec, 1.4, (1 - k) * .8, -1); GLX.obj('glow', 'disc', fx, .07, fz, 0, R * .6, 1, R * .6, mix3(P.ec, [1, .9, .7], .5), 1, (1 - k) * .4, 1); }
          if (!e.alive) { const F = bodyFrame(BM, e, P, e.sc, 0), k = ease(clamp(since(e) * 1.6, 0, 1)); pc(F, 'rbox', .6, .2 + (1 - k) * 1.4, .7, 1.4 * k, .3, 0, .06, 1, .06, wood, 3); pc(F, 'rbox', .6, .25 + (1 - k) * 1.4, 1.1, 1.4 * k, .3, 0, .4, .3, .3, stone, 3); }
          if (!X && e.alive) drawEnemy(e); post(e, P.sc);
        } },
    caster: { n: 'Masked Hierophant', d: 'It floats above the ground in a pale mask, with a heavy tome hovering open at its side. Pages flutter as it chants, glowing marks circle it while it casts, and it drops to the ground as the mask falls and the tome slams shut.', dead: 1.4, noFling: 1,
        draw(e) {
          const P = pre(e, true), md = e.md, t = P.t, mask = GLX.col(0xe8e0d0), gold = GLX.col(0xc8a040), lth = GLX.col(0x4a1e1a), page = GLX.col(0xe0d6b8);
          const X = rig(e, P, 'cultist', { s: 1.02, keep: 1,
            lay(X) { if (!e.alive) return [['die', dieAt(X, 2), false, 1]];
              const lay = [['spidle', t + e.id * .37, true, 1, X.bm(X.up, X.act)], ['jloop', t * .5, true, .8, X.mask('legs', ['thigh_l', 'thigh_r'], 0)]]; /* it floats, legs hanging */
              if (X.act) lay.push(['cast', swingAt(X, 'cast', .45), false, 1, X.up]); hitLay(X, lay); return lay; },
            body(X) { X.lift = e.alive ? .7 + Math.sin(t * 1.8 + e.id) * .1 : dieUp(X) + .7 * (1 - ease(clamp(since(e) * 2.4, 0, 1))) + sinkAfter(e, 1.05, .35); X.lean = .1 * X.mv; if (X.wnd) X.lift += .15 * X.wind; },
            look(k, gr) { return castLook(P, md, k, gr, .45, .05); },
            kit(X) { const hd = X.fr('Head'), em = P.em, alive = e.alive;
              if (hd && (alive || since(e) < .35)) { pc(hd, 'sphere', 0, .06, .14, 0, 0, 0, .23, .28, .07, mask, 3, em + .15); pc(hd, 'rbox', 0, .22, .15, 0, 0, 0, .05, .14, .03, gold, 4, em); for (const sd of [1, -1]) gp(hd, 'sphere', .055 * sd, .09, .18, 0, 0, 0, .035, .02, .01, P.ec, 3); pc(hd, 'rbox', 0, -.03, .18, 0, 0, 0, .06, .015, .01, GLX.col(0x1a1414), 0); }
              if (!alive) return; const B = bodyFrame(MBK, e, P, e.sc, X.lift + .1), w = X.wnd ? X.wind : 0, ox = -.75, oy = 1.3 + Math.sin(t * 2.1) * .06, oz = .25; /* the tome floats at its left side */
              pc(B, 'rbox', ox, oy, oz, .5, .3, .05, .44, .06, .32, lth, 7, em); pc(B, 'rbox', ox, oy + .04, oz, .5, .3, .05, .4, .03, .3, page, 3, em + .2); for (let k = 0; k < 3; k++) { const f = Math.sin(t * 7 + k * 1.2) * .6 + .3; pco(B, 'rbox', ox, oy + .06, oz, .5, .3, f, 0, 0, .1, .2, .005, .28, page, 3, em + .3); }
              gp(B, 'sphere', ox, oy + .12, oz, 0, 0, 0, .25, .06, .2, P.ec, 1 + w, .35 + w * .3); GLX.obj('glow', 'disc', e.x, .07, e.z, 0, 1.3, 1, 1.3, P.ec, 1, .25 + w * .2, 1); /* its shadow glows under it as it floats */
              for (let k = 0; k < 5; k++) { const a = t * (1.2 + w * 2.5) + k * 1.2566, r = .85; gp(B, 'gem', Math.cos(a) * r, 1.1 + Math.sin(t * 2 + k) * .15, Math.sin(a) * r, 0, a, 0, .05, .12, .05, P.ec, 2, .25 + w * .75); } },
          });
          if (!e.alive) { const F = bodyFrame(BM, e, P, e.sc, 0), k = ease(clamp(since(e) * 1.8, 0, 1)); pc(F, 'rbox', -.6, .06 + (1 - k) * 1.3, .4, 0, .4 + k, 0, .44, .12, .32, lth, 7); const mk = ease(clamp((since(e) - .3) * 2, 0, 1)); pc(F, 'sphere', .4, .04 + (1 - mk) * 1.4, .6, -1.5708 * mk, 0, 0, .2, .25, .06, mask, 3); }
          if (!X && e.alive) drawEnemy(e); post(e, P.sc);
        } },
    swarm: { n: 'Armoured Beetle', d: 'A domed, glossy shell that splits open as it lunges, a horn and snapping jaws, and six jointed legs that scuttle in turn. When it dies it flips onto its back with its legs curling up.', dead: 1.2, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, alive = e.alive, sd = since(e), mv = P.mv, dark = shade(P.c2, .45), shell = mix3(P.c, P.c2, .3);
          const flip = alive ? 0 : ease(clamp(sd * 3, 0, 1)), sink = alive ? 0 : clamp((sd - .85) / .35, 0, 1) * .5, lunge = alive ? (P.at > 0 ? .5 * Math.sin(clamp(P.at, 0, 1) * Math.PI) : -.12 * P.wind) : 0;
          const F = bodyFrame(FB, e, P, P.sc, -sink + flip * .55, -.25 * P.wind * (alive ? 1 : 0)); if (flip) { const c = Math.cos(flip * Math.PI), s = Math.sin(flip * Math.PI); for (let i = 0; i < 3; i++) { const a = F[i], b = F[4 + i]; F[i] = a * c + b * s; F[4 + i] = -a * s + b * c; } }
          const by = .5 + Math.abs(Math.sin((e.walk || 0) * 2)) * .03 * mv, z0 = lunge, open = alive ? clamp(P.at * 1.5 + P.wind * .4, 0, 1) : 0;
          pc(F, 'sphere', 0, by - .08, z0 - .1, 0, 0, 0, .78, .32, 1.15, dark, 3, P.em); /* the belly */
          for (const s of [1, -1]) { pc(F, 'sphere', .2 * s, by + .08, z0 - .18, .1, 0, -s * open * .6, .44, .38, 1.1, shell, 2, P.em); pc(F, 'rbox', .02 * s, by + .26, z0 - .18, .08, 0, -s * open * .6, .03, .03, .9, shade(shell, .6), 2, P.em); } /* the two wing cases, glossy, splitting apart */
          if (open > .1) for (const s of [1, -1]) gp(F, 'sphere', .32 * s, by + .2, z0 - .3, .2, 0, -s * (.6 + open), .2, .02, .6 * open, P.ec, 1, .35 * open);
          pc(F, 'sphere', 0, by, z0 + .55, -.1, 0, 0, .46, .34, .4, shade(P.c, .8), 2, P.em); pco(F, 'cone', 0, by + .14, z0 + .7, -.5 - P.wind * .4, 0, 0, 0, .2, 0, .09, .42, .09, shade(P.c2, 1.2), 3, P.em); /* the head and its horn */
          const jaw = alive ? .5 + Math.sin(t * 14) * .12 + P.wind * .4 - P.at * .6 : .2; for (const s of [1, -1]) pco(F, 'cone', .1 * s, by - .05, z0 + .74, 1.5, s * jaw, 0, 0, .12, 0, .04, .26, .04, shade(P.c2, 1.3), 3, P.em);
          for (const s of [1, -1]) gp(F, 'sphere', .13 * s, by + .06, z0 + .76, 0, 0, 0, .06, .06, .05, P.ec, 2.6);
          for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, row = (i >> 1) - 1, ph = (e.walk || 0) * 2.2 + ((i + (i >> 1)) % 2) * Math.PI, hz = z0 + row * .32, h = [.3 * s, by - .05, hz];
            let f = alive ? stepAt(.72 * s, hz * .8 + row * .12, ph, .2, .14, mv) : [.25 * s, by + .2 + flip * .1, hz * .6]; if (alive && !mv) f[1] = Math.max(0, Math.sin(t * 3 + i) * .02);
            leg2(F, h, f, .34, .045, P.c2, dark, P.em, s * .6); }
          if (!alive && flip < 1) GLX.halo(e.x, .5, e.z, 1.2, P.ec, .3 * (1 - flip));
          post(e, P.sc);
        } },
    bomber: { n: 'Powder Keg', d: 'A living barrel of black powder on little legs, iron hoops and a sputtering fuse on top, two eyes glinting out of a crack. The fuse burns down fast with showers of sparks, then it goes off in a fiery blast with flying staves.', dead: .9, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, alive = e.alive, sd = since(e), w = P.wind, burst = !alive ? clamp(sd / .9, 0, 1) : P.at > 0 ? 1 - clamp(P.at, 0, 1) : 0, wood = GLX.col(0x6a4426), iron = GLX.col(0x3a3836), fire = GLX.col(0xffa040);
          if (alive && !(P.at > 0) || (!alive && sd < .08)) { const hop = Math.abs(Math.sin((e.walk || 0) * 2.4)) * .1 * P.mv, F = bodyFrame(FB, e, P, P.sc, hop, 0, Math.sin((e.walk || 0) * 2.4) * .12 * P.mv); const sh = w * .04 * Math.sin(t * 50);
            pc(F, 'cyl', sh, .85, 0, 0, 0, 0, .9, 1.05, .9, wood, 3, P.em); pc(F, 'sphere', sh, .85, 0, 0, 0, 0, .98, .85, .98, wood, 3, P.em); for (const y of [.45, .85, 1.25]) pc(F, 'cyl', sh, y, 0, 0, 0, 0, y === .85 ? 1.01 : .95, .07, y === .85 ? 1.01 : .95, iron, 4, P.em);
            for (let k = 0; k < 8; k++) { const a = k * .785; pc(F, 'rbox', Math.cos(a) * .47 + sh, .85, Math.sin(a) * .47, 0, -a, 0, .02, 1.02, .05, shade(wood, .7), 3, P.em); } /* the staves */
            pc(F, 'rbox', sh, 1.0, .47, 0, 0, 0, .36, .1, .05, GLX.col(0x0a0806), 0); for (const s of [1, -1]) gp(F, 'sphere', .1 * s + sh, 1.0, .5, 0, 0, 0, .06, .05, .03, P.ec, 3); /* eyes glinting through a crack */
            const fl = 1 - w * .75, tip = [sh + Math.sin(t * 3) * .05, 1.42 + .3 * fl, -.05]; seg(F, 'cap', [sh, 1.36, 0], tip, .035, GLX.col(0x3a2a1a), 7, P.em); gp(F, 'sphere', tip[0], tip[1], tip[2], 0, 0, 0, .1 + w * .08, .1 + w * .08, .1 + w * .08, fire, 2.6, 1); /* the fuse */
            const q = wp(F, tip[0], tip[1], tip[2]); for (let k = 0; k < 4 + w * 6; k++) { const u = (t * (2 + w * 3) + k * .27) % 1, a = k * 2.4 + t * 3; GLX.obj('glow', 'gem', q[0] + Math.cos(a) * u * .6, q[1] + u * .5 - u * u * .7, q[2] + Math.sin(a) * u * .6, a, .03, .07, .03, k % 2 ? fire : [1, .95, .7], 2.6, 1 - u); } GLX.halo(q[0], q[1], q[2], .8 + w * 1.4, fire, .4 + w * .3);
            for (const s of [1, -1]) { const ph = (e.walk || 0) * 2.4 + (s > 0 ? 0 : Math.PI); pc(F, 'cap', .25 * s, .22 + Math.max(0, Math.cos(ph)) * .07 * P.mv, Math.sin(ph) * .13 * P.mv, Math.sin(ph) * .5 * P.mv, 0, 0, .12, .36, .12, iron, 4, P.em); } }
          if (burst > 0 && burst < 1) { boom(e, burst, fire, GLX.col(0x5a2a10), 1.8); const F = bodyFrame(FB2, e, P, P.sc, 0); spray(e, 9, burst, 0, .8, 0, 2.2, 1.6, (i, x, y, z, a, u) => pc(F, i % 3 ? 'rbox' : 'cyl', x, y, z, a * 4 * u, a, u * 5, i % 3 ? .1 : .6, i % 3 ? .7 : .06, i % 3 ? .04 : .6, i % 3 ? wood : iron, 3, u < .3 ? 1 : 0)); }
          post(e, P.sc);
        } },
    goblin: { n: 'Goblin Kingpin', d: 'A crooked gold crown, a flowing purple cape, heavy gold chains and a jewelled sceptre. It struts along swinging the sceptre, cape flying, and when it dies the crown rolls away as its gold bursts out.', dead: 1.4,
        draw(e) {
          const P = pre(e, true), gd = GLX.col(0xe0b040), cape = GLX.col(0x5a2a6a), capeIn = GLX.col(0xa02a2a), gem = GLX.col(0xff3a5a), t = P.t;
          const X = rig(e, P, 'risen', { s: .72, keep: 1,
            lay(X) { if (!e.alive) return [['die', dieAt(X, 2.4), false, 1]]; const lay = standWalk(X, 'cstance', 'walk', 1.25, .8); hitLay(X, lay, .7); return lay; },
            body(X) { const ph = (e.walk || 0) * 1.25 * 3.14; X.roll = Math.sin(ph) * .09 * X.mv; X.lean = -.1 * X.mv; if (!e.alive) X.lift = dieUp(X) + sinkAfter(e, 1.05, .3, .6); },
            look(k, gr) { return gobSkin(P, k, gr, 0x3a2050); },
            kit(X) { const hd = X.fr('Head'), sp = X.bf('spine_03'), hr = X.fr('hand_r'), em = P.em; if (hd) { gobHead(X, hd, em); if (e.alive || since(e) < .3) { pc(hd, 'cyl', 0, .19, -.01, -.15, 0, .12, .2, .1, .2, gd, 4, em + .25); for (let k = 0; k < 5; k++) { const a = k * 1.2566; pc(hd, 'cone', Math.cos(a) * .09, .27, -.01 + Math.sin(a) * .09, -.15, 0, .12, .035, .08, .035, gd, 4, em + .25); } gp(hd, 'gem', 0, .2, .09, 0, 0, 0, .03, .045, .02, gem, 2, 1); } }
              if (sp) { const fl = .25 + X.mv * .8; for (let k = 0; k < 4; k++) { const a = -.5 + k * .33, wv = Math.sin(t * 6 - k) * .1 * (.4 + X.mv); pco(sp, 'rbox', Math.sin(a) * .22, .2, -.12 + Math.cos(a) * .02, fl * .6 + wv, a * .4, 0, 0, -.42, 0, .17, .84, .02, k % 2 ? cape : shade(cape, .85), 6, em); } pco(sp, 'rbox', 0, .2, -.1, fl * .6, 0, 0, 0, -.42, .012, .6, .82, .01, capeIn, 6, em);
                for (let k = 0; k < 2; k++) pc(sp, 'ring', 0, .1 - k * .1, .02 + k * .02, 1.25, 0, 0, .3 + k * .05, .3 + k * .05, .03, gd, 4, em + .3); }
              if (hr) { pc(hr, 'cyl', 0, 0, .15, 1.5708, 0, 0, .035, .6, .035, gd, 4, em + .2); pc(hr, 'sphere', 0, 0, .47, 0, 0, 0, .09, .09, .09, gd, 4, em + .2); gp(hr, 'gem', 0, 0, .54, t * 2, 0, 0, .05, .09, .05, gem, 2.2, 1); } },
          });
          if (X && e.alive) coinTrail(e, X, 0, 1.1, -.2, 3);
          if (!e.alive) { const F = bodyFrame(BM, e, P, e.sc, 0), k = clamp((since(e) - .2) * 1.2, 0, 1); coinBurst(e, F, clamp(since(e) * 1.5, 0, 1), 12, .7); if (since(e) > .3) { const r = ease(k); pc(F, 'cyl', .3 + r * 1.4, .1, .8 + r * .6, 1.5708, 0, r * 8, .2 * 1.4, .1 * 1.4, .2 * 1.4, gd, 4, .3); } }
          if (!X && e.alive) drawEnemy(e); post(e, P.sc); gobAlert(e);
        } },
    knight: { n: 'Death Knight', d: 'Black spiked plate with glowing runes, a torn cape and a greatsword wreathed in its floor\'s fire. It raises the blade in both hands and cleaves down, splitting the ground with a glowing crack. It falls to its knees and the sword stays planted where it fell.', dead: 2.2,
        draw(e) {
          const P = pre(e, true), md = e.md, K = knCols(md), t = P.t, dark = GLX.col(0x141218), spike = mix3(K.P, [0, 0, 0], .4);
          const X = rig(e, P, 'warden', { s: 1.5, keep: 1, lay: X => knLay(X, 'attack', .4, 1.1),
            body(X) { if (X.wnd) X.lean = -.15 * X.wind; else if (X.at > 0) { X.lean = .2 * clamp(X.at, 0, 1); X.fwd = .3 * clamp(X.at, 0, 1); } if (!e.alive) X.lift = dieUp(X) + sinkAfter(e, 1.7, .5, 1.4); },
            look: (k, gr) => knLook(P, K, k, gr, { plate: hexMix(K.plate, 0x101014, .55), glow: .05 }),
            kit(X) { const em = P.em, hd = X.fr('Head'), sp = X.bf('spine_03'), hr = X.fr('hand_r'), alive = e.alive;
              if (hd) { pc(hd, 'sphere', 0, .1, .03, 0, 0, 0, .27, .32, .31, dark, 4, em); pc(hd, 'rbox', 0, .02, .12, 0, 0, 0, .25, .22, .17, dark, 4, em); for (const s of [1, -1]) { gp(hd, 'rbox', .055 * s, .11, .21, 0, 0, -.2 * s, .07, .015, .01, P.ec, 3); for (let k = 0; k < 3; k++) pco(hd, 'cone', .1 * s, .2 + k * .03, -.04 - k * .06, -.6, 0, -s * (.5 + k * .2), 0, .1, 0, .04, .2, .04, spike, 4, em); } }
              for (const n of ['upperarm_l', 'upperarm_r']) { const f = X.fb(n); if (f) { pc(f, 'sphere', 0, .07, 0, 0, 0, 0, .3, .2, .3, dark, 4, em); for (let k = -1; k <= 1; k++) pc(f, 'cone', k * .08, .17, 0, 0, 0, k * .4, .04, .18, .04, spike, 4, em); } }
              if (sp) { cape(sp, 5, .6, 1.25, shade(GLX.col(hexMix(K.trim, 0x100808, .7)), 1), t, X.mv, em, .2, -.13); for (let k = 0; k < 3; k++) gp(sp, 'rbox', 0, .05 - k * .14, .16, 0, 0, k % 2 ? .6 : -.6, .1, .015, .01, P.ec, 1.8, .6 + pulse(t + k, 2) * .3); }
              if (hr && alive) { blade(hr, 1.25, .11, mix3(K.steel, [.1, .1, .12], .5), GLX.col(0x1a1416), dark, em, .5 + X.wind * .5 + (X.at > .2 ? .5 : 0), P.ec); for (let k = 0; k < 4; k++) { const u = (t * 1.5 + k / 4) % 1; gp(hr, 'gem', Math.sin(k * 2.3 + t) * .06, .05 + u * .2, .4 + k * .25, 0, k, 0, .04, .12 * (1 - u), .04, P.ec, 2.4, 1 - u); } } },
          });
          if (X && e.alive && X.at > 0) { const k = 1 - clamp(X.at, 0, 1), ry = e.rot; for (let i = 0; i < 6; i++) { const d = 1.5 + i * .9 * Math.min(1, k * 3); GLX.obj('glow', 'box', e.x + Math.sin(ry) * d, .08, e.z + Math.cos(ry) * d, ry + Math.sin(i * 2.7) * .4, .16, .02, 1, P.ec, 1.8, (1 - k) * .9); } }
          if (!e.alive) { const F = bodyFrame(BM, e, P, e.sc, 0), k = ease(clamp((since(e) - .2) * 2, 0, 1)); GLX.part('dyn', 'rbox', F, .9, .02, 1.2, -.12 * (1 - k) - .05, .3, .05, 0, 1.0 + (1 - k) * .6, 0, .12, 2.6, .04, mix3(K.steel, [.1, .1, .12], .5), 0, 1, 4); gp(F, 'rbox', .9, 1, 1.2, -.05, .3, .05, .14, 2.4, .05, P.ec, 1.4, .5 * (1 - deadFade(e, .8, 1))); }
          if (!X) drawEnemy(e); else if (e.alive) GLX.light(e.x, 2.4, e.z, 7, P.ec, .7, 3); post(e, P.sc);
        } },
    wraith: { n: 'Living Element', d: 'The shroud is made of its floor itself: shards of ice for the Pale Matriarch, licking flame for Vaeloth, rift crystal for Null and grave mist for the Choir. The element swirls faster as it casts, and it collapses into a heap of it when it dies.', dead: 2, noFling: 1,
        draw(e) {
          const P = pre(e, true), md = e.md, t = P.t, sc = e.sc, th = bossTheme(e), robe = hexMix(md.c2, 0x101014, .5), k0 = e.alive ? 1 : 1 - deadFade(e, .3, 1), u = sc / 2.3;
          const X = k0 <= 0 ? null : rig(e, P, 'cultist', { s: 1.45, keep: 1, lay: X => wrLay(X, 'cast'),
            body(X) { X.lift = e.alive ? .55 * u + Math.sin(t * 1.8) * .15 : dieUp(X) - (1 - k0) * 3; },
            look: (k, gr) => wrLook(P, md, k, gr, robe, .2), kit() { } });
          const w = X && X.wnd ? X.wind : 0, sp = 1 + w * 2.5, HR = hips(X, e), R = HR[1], H = HR[0];
          GLX.obj('dyn', 'cone', e.x, H * .5 * k0, e.z, t * .2, R * 1.7, H * k0, R * 1.7, GLX.col(th === 'ice' ? 0x5a7a9a : th === 'lava' ? 0x2a1008 : th === 'void' ? 0x1a1030 : 0x2a2a34), th === 'lava' ? .5 : .15, 1, 6); if (th === 'lava') GLX.obj('glow', 'cone', e.x, H * .45 * k0, e.z, t, R * 2.1, H * .95 * k0, R * 2.1, P.c2, 1.4, .35); /* a core of the element hides the legs */
          if (th === 'ice') for (let k = 0; k < 16; k++) { const a = k * .3927 + t * .2 * sp, r = R * (1 + (k % 3) * .25), h = H * (.4 + (k % 4) * .15) * k0; GLX.obj('dyn', 'gem', e.x + Math.cos(a) * r, h * .5, e.z + Math.sin(a) * r, a, .45, h, .45, mix3(GLX.col(0xcff0ff), P.c2, .3), .3, 1, 4); if (k % 2) GLX.obj('glow', 'gem', e.x + Math.cos(a) * r, h * .5, e.z + Math.sin(a) * r, a, .3, h * .9, .3, P.ec, 1.2, .5); }
          else if (th === 'lava') for (let k = 0; k < 18; k++) { const v = ((t * .9 * sp + k / 18) % 1), a = k * 2.4 + t * sp * .5, r = R * (1.2 - v * .6), h = H * k0; GLX.obj('glow', 'cone', e.x + Math.cos(a) * r, v * h, e.z + Math.sin(a) * r, a, 1.1 * (1 - v), 1.8 * (1 - v * .5), 1.1 * (1 - v), k % 3 ? P.c2 : P.ec, 2.2, (1 - v) * .9); }
          else if (th === 'void') for (let k = 0; k < 12; k++) { const a = k * .5236 - t * .4 * sp, r = R * 1.3, h = (.15 + (k % 4) * .22 + Math.sin(t * 2 + k) * .08) * H * k0; GLX.obj('dyn', 'gem', e.x + Math.cos(a) * r, h, e.z + Math.sin(a) * r, t + k, .5, 1.5, .5, GLX.col(md.c), .6, 1, 4); GLX.obj('glow', 'gem', e.x + Math.cos(a) * r, h, e.z + Math.sin(a) * r, t + k, .34, 1.25, .34, P.ec, 1.8, .7); }
          else for (let k = 0; k < 14; k++) { const v = ((t * .3 * sp + k / 14) % 1), a = k * 2.4 + t * .3 * sp, r = R * (1 + v * .8); GLX.obj('glow', 'sphere', e.x + Math.cos(a) * r, (.1 + v * .9) * H * k0, e.z + Math.sin(a) * r, 0, 1.6 * (1 - v * .3), 1.1, 1.6 * (1 - v * .3), mix3(GLX.col(md.c), P.ec, .3), 1, .35 * Math.sin(v * Math.PI)); }
          if (!e.alive) GLX.obj('dyn', 'blob', e.x, .2, e.z, 0, 2.2 * u * (1 - k0 * .5), .5 * u, 2.2 * u * (1 - k0 * .5), GLX.col(th === 'ice' ? 0xcff0ff : th === 'lava' ? 0x2a1410 : th === 'void' ? md.c : 0x5a5a6a), th === 'lava' ? .8 : .2, 1, 3);
          if (e.alive) { GLX.obj('glow', 'disc', e.x, .06, e.z, 0, R * 3, 1, R * 3, P.ec, 1, .35, 1); GLX.light(e.x, 2.4, e.z, 8, P.ec, .9 + w, 3); }
          if (!X && e.alive) drawEnemy(e); post(e, P.sc);
        } },
    beast: { n: 'Dire Boar', d: 'A massive boar with a ridge of bristling spines, a broad snout, great curved tusks and hooves. It paws the ground with its head down, then charges in a burst of dust. When it dies it rolls heavily onto its side.', dead: 2, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, sd = since(e), alive = e.alive, bone = GLX.col(0xe8e0c8), dark = GLX.col(0x14100c), w = alive ? P.wind : 0, at = alive ? P.at : 0, mv = P.mv;
          const roll = alive ? 0 : ease(clamp(sd * 1.6, 0, 1)) * 1.45, sink = alive ? 0 : clamp((sd - 1.5) / .5, 0, 1) * .8, ch = at > 0 ? Math.sin(clamp(at, 0, 1) * Math.PI) * 1.4 : 0;
          const F = rollF(bodyFrame(FB, e, P, e.sc, -sink + roll * .35, .12 * w - .05 * ch), roll); if (ch) { F[12] += Math.sin(e.rot) * ch * e.sc * .5; F[14] += Math.cos(e.rot) * ch * e.sc * .5; }
          const bh = 1.25 + Math.abs(Math.sin((e.walk || 0) * 1.2)) * .06 * mv, hz = 1.55 - w * .1, hy = bh - .05 - w * .35;
          pc(F, 'sphere', 0, bh, -.2, 0, 0, 0, 1.55, 1.3, 2.5, P.c, 3, P.em); pc(F, 'sphere', 0, bh + .35, .55, 0, 0, 0, 1.7, 1.5, 1.5, P.c, 3, P.em); pc(F, 'sphere', 0, bh - .3, 0, 0, 0, 0, 1.25, .8, 2, shade(P.c, .75), 3, P.em);
          for (let k = 0; k < 9; k++) { const z = 1 - k * .3, sw = Math.sin(t * 2 + k) * .06 + w * .2; pc(F, 'cone', 0, bh + 1 - Math.abs(k - 2) * .07, z, -.35 - k * .05 + sw, 0, 0, .2, .75 + (k < 4 ? .3 : 0), .2, P.c2, 3, P.em); for (const s of [1, -1]) pc(F, 'cone', .22 * s, bh + .9 - Math.abs(k - 2) * .07, z, -.4 - k * .05 + sw, 0, s * .5, .12, .45, .12, shade(P.c2, .8), 3, P.em); }
          pc(F, 'sphere', 0, hy + .3, hz, -.2 + w * .3, 0, 0, 1.05, .95, 1.15, P.c, 3, P.em); pc(F, 'cyl', 0, hy + .05, hz + .65, 1.5708 - .2 + w * .3, 0, 0, .6, .55, .55, shade(P.c, .85), 3, P.em); pc(F, 'cyl', 0, hy + .0, hz + .93, 1.5708 - .2 + w * .3, 0, 0, .5, .05, .45, GLX.col(0x3a2a2a), 3, P.em);
          for (const s of [1, -1]) { const b = [.3 * s, hy - .02, hz + .75], m = [.42 * s, hy + .3, hz + 1.05], tip = [.36 * s, hy + .62, hz + .95]; seg(F, 'cone', b, m, .14, bone, 3, P.em); seg(F, 'cone', m, tip, .09, bone, 3, P.em); pco(F, 'cone', .4 * s, hy + .75, hz - .1, -.4, 0, s * .6, 0, .2, 0, .14, .4, .1, P.c2, 3, P.em); gp(F, 'sphere', .32 * s, hy + .5, hz + .45, 0, 0, 0, .1, .07, .06, P.ec, 3); }
          for (const [lx, lz, ph, dir] of [[.6, .8, 0, 1], [-.6, .8, 3.14, 1], [.6, -.9, 3.14, -1], [-.6, -.9, 0, -1]]) { const p2 = (e.walk || 0) * 1.2 + ph + (w ? Math.sin(t * 9) * .6 * (lz > 0 && lx > 0 ? 1 : 0) : 0), f = alive ? stepAt(lx * 1.05, lz + (lz > 0 ? ch * .1 : 0), p2, .38, .3, Math.max(mv, w * (lz > 0 && lx > 0 ? 1 : 0))) : [lx * 1.1, .35, lz * 1.3];
            const k = legQ(F, [lx, bh - .25, lz], f, .66, .4, P.c, P.c2, P.em, dir); pc(F, 'sphere', f[0], f[1] + .1, f[2] + .05, 0, 0, 0, .38, .22, .44, dark, 3, P.em); }
          pc(F, 'cap', 0, bh + .2, -1.45, .9 + Math.sin(t * 4) * .3, 0, 0, .15, .55, .15, P.c2, 3, P.em);
          if (alive && (ch > .2 || (mv > .5))) for (let k = 0; k < 5; k++) { const u = (t * 2 + k / 5) % 1; GLX.obj('glow', 'sphere', e.x - Math.sin(e.rot) * (1 + u * 3) + Math.sin(k * 2.4) * .8, .3 + u * .6, e.z - Math.cos(e.rot) * (1 + u * 3) + Math.cos(k * 2.4) * .8, 0, .5 + u * .8, .4 + u * .6, .5 + u * .8, [.4, .35, .3], .6, (1 - u) * .35 * (ch > .2 ? 1 : .4)); }
          bossGlow(e, P.ec); post(e, P.sc);
        } },
    tree: { n: 'Ancient Treant', d: 'A great walking tree: a thick bark trunk with a glowing knot for a face, branch arms ending in twig claws, leafy crowns on its shoulders and head, and roots for feet. It lifts a branch and slams it down as roots burst from the ground. When it dies it topples slowly and its leaves fall.', dead: 2.6, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, sd = since(e), alive = e.alive, bark = mix3(P.c2, [.18, .12, .08], .3), leaf = P.c, w = alive ? P.wind : 0, at = alive ? P.at : 0, mv = P.mv;
          const fall = alive ? 0 : ease(clamp(sd / 1.6, 0, 1)) * 1.45, sink = alive ? 0 : clamp((sd - 1.9) / .7, 0, 1) * 1.2, sway = Math.sin(t * .9) * .04 + Math.sin((e.walk || 0) * .8) * .05 * mv;
          const F = bodyFrame(FB, e, P, e.sc, -sink, -fall + w * -.1 + (at > 0 ? .15 * clamp(at, 0, 1) : 0)); rollF(F, sway);
          pc(F, 'trunk', 0, 1.7, 0, 0, t * 0, 0, 1.25, 2.9, 1.1, bark, 3, P.em); for (let k = 0; k < 6; k++) { const a = k * 1.047 + .3; pc(F, 'rbox', Math.cos(a) * .52, 1.6 + (k % 2) * .4, Math.sin(a) * .45, 0, -a, 0, .08, 2.2, .1, shade(bark, .7), 3, P.em); } /* bark ridges */
          for (let k = 0; k < 5; k++) { const a = k * 1.2566 + .6, ph = (e.walk || 0) * .8 + k * 2, st = alive ? Math.sin(ph) * .2 * mv : 0; seg(F, 'cone', [Math.cos(a) * .35, .7, Math.sin(a) * .3], [Math.cos(a) * 1.25, .05 + Math.max(0, Math.cos(ph)) * .2 * mv, Math.sin(a) * 1.1 + st], .35, bark, 3, P.em); } /* root feet */
          gp(F, 'sphere', 0, 2.55, .5, 0, 0, 0, .55, .4, .1, mix3(P.ec, [0, 0, 0], .3), 1.4, .6 * (1 - gd0(e, 1.5))); for (const s of [1, -1]) gp(F, 'sphere', .17 * s, 2.65, .54, 0, 0, 0, .13, .1, .05, P.ec, 3 * (1 - gd0(e, 1.5))); pc(F, 'rbox', 0, 2.38, .55, 0, 0, 0, .3, .05, .05, GLX.col(0x0a0806), 0);
          const lr = -.2 - w * 1.2 + (at > 0 ? 1.4 * clamp(at, 0, 1) : 0); for (const s of [1, -1]) { const raise = s > 0 ? lr : -.2 + Math.sin(t * 1.1) * .08, sh = [.62 * s, 3, 0], el = [1.15 * s, 3 - Math.cos(raise) * .8, Math.sin(raise) * .8 + .2], hd = [1.25 * s, el[1] - Math.cos(raise + .4) * .85, el[2] + Math.sin(raise + .4) * .85];
            rootArm(F, s, sh, el, hd, .3, bark, P.em); pc(F, 'blob', .8 * s, 3.3, -.05, 0, s, 0, 1, .75, 1, shade(leaf, .9), 6, P.em); }
          const lf = alive ? 1 : 1 - clamp((sd - .4) / 1.2, 0, 1); if (lf > 0) for (let k = 0; k < 6; k++) { const a = k * 1.047 + .4, r = k ? .75 : 0; pc(F, 'blob', Math.cos(a) * r, 3.85 + (k ? 0 : .55) + Math.sin(t * .8 + k) * .04, Math.sin(a) * r * .8 - .1, 0, k, 0, (1.3 - (k ? .25 : 0)) * lf, (1 - (k ? .2 : 0)) * lf, (1.2 - (k ? .25 : 0)) * lf, k % 2 ? shade(leaf, 1.15) : leaf, 6, P.em); }
          if (!alive) { const k = clamp((sd - .3) / 1.6, 0, 1); spray(e, 12, k, 0, 3.5 / e.sc * 2.3, 0, 2.2, 1.5, (i, x, y, z, a, u) => GLX.obj('dyn', 'gem', e.x + x, Math.max(.05, y), e.z + z, a * 4 + u * 6, .3, .5, .1, i % 2 ? leaf : shade(leaf, .7), 0, 1, 6)); }
          if (alive && at > 0) { const k = 1 - clamp(at, 0, 1); for (let i = 0; i < 6; i++) { const d = 2 + i * .9, h = Math.sin(clamp(k * 3 - i * .25, 0, 1) * Math.PI) * 1.6; if (h > 0) GLX.obj('dyn', 'cone', e.x + Math.sin(e.rot + Math.sin(i * 2) * .3) * d, h * .4, e.z + Math.cos(e.rot + Math.sin(i * 2) * .3) * d, i, .5, h, .5, bark, 0, 1, 3); } }
          bossGlow(e, P.ec); post(e, P.sc);
        } },
    golem: { n: 'Magma Titan', d: 'Plates of cracked black rock over a bright molten core that shows through the gaps, lava dripping from its arms and huge fists. It raises both fists high, then slams them down in a splash of lava. When it dies it cools to dark stone and crumbles.', dead: 2.4, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, sd = since(e), alive = e.alive, cool = alive ? 0 : clamp(sd / 1.4, 0, 1), rock = mix3(P.c2, [.08, .06, .05], .3), hotC = mix3(P.ec, GLX.col(0xffd060), .35), w = alive ? P.wind : 0, at = alive ? P.at : 0, mv = P.mv, gl = (1 - cool) * (1 + w * .8);
          const crumble = alive ? 0 : clamp((sd - 1.2) / 1, 0, 1), F = bodyFrame(FB, e, P, e.sc, -crumble * 1.5, at > 0 ? .25 * clamp(at, 0, 1) : -.1 * w); rollF(F, Math.sin((e.walk || 0) * .8) * .06 * mv);
          gp(F, 'sphere', 0, 1.9, .1, 0, 0, 0, 1.7, 1.6, 1.4, hotC, 2.2, .9 * gl); GLX.light(e.x, 2.5, e.z, 10, P.ec, 1.4 * gl, 4);
          const plates = [[0, 2.4, .5, .3, 1.5, .9, .7], [-.6, 1.9, .55, .1, .9, 1, .7], [.6, 1.9, .55, -.1, .9, 1, .7], [0, 1.3, .45, -.2, 1.4, .8, .7], [0, 2.1, -.6, .1, 1.9, 1.6, .8], [-.95, 2.3, 0, 0, .8, 1.2, 1.2], [.95, 2.3, 0, 0, .8, 1.2, 1.2], [0, 3.05, .1, 0, 1.4, .7, 1.1]];
          plates.forEach(([x, y, z, rx, sx, sy, sz], i) => { const u = crumble, a = i * 2.4; pc(F, 'blob', x + Math.cos(a) * u * 1.5, y - u * y * .7, z + Math.sin(a) * u * 1.5, rx + u * a, i, 0, sx * .86, sy * .86, sz * .86, rock, 3, P.em); });
          if (crumble < 1) for (let k = 0; k < 9; k++) { const a = k * .7 - 2.8, y = 1.2 + (k % 3) * .75; gp(F, 'rbox', Math.sin(a) * .95, y, Math.cos(a) * .8, (k % 2 - .5) * .8, a, (k % 3 - 1) * .7, .1, .75, .06, hotC, 2.6, gl * (1 - crumble)); }
          pc(F, 'blob', 0, 3.3, .45, .2, 0, 0, 1, .8, .9, rock, 3, P.em); for (const s of [1, -1]) gp(F, 'sphere', .22 * s, 3.35, .88, 0, 0, 0, .16, .1, .06, hotC, 3, gl); gp(F, 'rbox', 0, 3.08, .88, .2, 0, 0, .5, .1, .06, hotC, 2.6, gl);
          const arm = -.3 - w * 2.6 + (at > 0 ? clamp(at, 0, 1) * 2.8 : 0); for (const s of [1, -1]) { const a2 = arm + (alive ? Math.sin((e.walk || 0) * .8) * .2 * s * mv : .8);
            pco(F, 'blob', 1.4 * s, 2.6, 0, a2, 0, -s * .2, 0, -.6, 0, .9, 1.2, .9, rock, 3, P.em); pco(F, 'blob', 1.5 * s, 2.6, 0, a2, 0, -s * .2, 0, -1.55, .15, 1.35, 1.2, 1.25, rock, 3, P.em); GLX.part('glow', 'blob', F, 1.5 * s, 2.6, 0, a2, 0, -s * .2, 0, -1.55, .15, 1.05, .95, 1, hotC, 2, .55 * gl);
            if (alive) for (let k = 0; k < 2; k++) { const u = (t * 1.2 + k * .5 + (s > 0 ? .25 : 0)) % 1; const q = wp(F, 1.5 * s, 2.6 - 1.55 * Math.cos(a2), 1.55 * Math.sin(a2)); GLX.obj('glow', 'sphere', q[0], q[1] - u * q[1], q[2], 0, .18, .3, .18, hotC, 2.4, 1 - u); } }
          for (const s of [1, -1]) { const ph = (e.walk || 0) * .8 + (s > 0 ? 0 : Math.PI); pco(F, 'blob', .6 * s, .9 + Math.max(0, Math.cos(ph)) * .3 * mv, Math.sin(ph) * .3 * mv, Math.sin(ph) * .3 * mv, 0, 0, 0, -.2, 0, 1, 1.2, 1, rock, 3, P.em); }
          if (alive && at > 0) { const k = 1 - clamp(at, 0, 1), fx = e.x + Math.sin(e.rot) * 3.5, fz = e.z + Math.cos(e.rot) * 3.5; GLX.obj('glow', 'ring', fx, .1, fz, 0, 2 + k * 8, 1, 2 + k * 8, hotC, 2, (1 - k), -1); GLX.obj('glow', 'disc', fx, .08, fz, 0, 2 + k * 5, 1, 2 + k * 5, P.ec, 1.4, (1 - k) * .6, 1); for (let i = 0; i < 8; i++) { const a = i * .785, u = k; GLX.obj('glow', 'sphere', fx + Math.cos(a) * u * 4, .3 + Math.sin(u * Math.PI) * 2, fz + Math.sin(a) * u * 4, 0, .3, .3, .3, hotC, 2.2, 1 - u); } }
          if (alive) bossGlow(e, P.ec); post(e, P.sc);
        } },
    orb: { n: 'Void Iris', d: 'An eye set inside a turning ring of jagged crystal, like a door into the void, with tendrils reaching out from its rim. The iris opens wide and pulses as it winds up, then fires a burst of void light. When it dies the ring breaks apart and the eye shrinks to nothing.', dead: 2, noFling: 1,
        draw(e) {
          const P = pre(e, true), t = P.t, sd = since(e), alive = e.alive, cry = GLX.col(0x2a1a46), dark = GLX.col(0x020206), w = alive ? P.wind : 0, at = alive ? P.at : 0, br = alive ? 0 : clamp(sd / 1.3, 0, 1);
          const cy = 3 + Math.sin(t * 1.3) * .2, F = bodyFrame(FB, e, P, e.sc, 0), rr = 1.8, sz = 1 - br;
          gp(F, 'disc', 0, cy, .05, 1.5708, 0, 0, rr * 1.8 * sz, 1, rr * 1.8 * sz, GLX.col(0x0a0614), 1, .9); gp(F, 'disc', 0, cy, .1, 1.5708, 0, 0, rr * 1.5 * sz, 1, rr * 1.5 * sz, P.c2, 1.2, .5);
          pc(F, 'sphere', 0, cy, .2, 0, 0, 0, 2 * sz, 2 * sz, 1.2 * sz, GLX.col(0xe8e0f0), 0, .2); const ir = (1 + w * .5 + (at > 0 ? .4 : 0)) * sz; gp(F, 'sphere', 0, cy, .75 * sz + .05, 0, 0, 0, 1.1 * ir, 1.1 * ir, .2, P.ec, 1.6 + w * 1.5); pc(F, 'sphere', 0, cy, .85 * sz + .1, 0, 0, 0, (.6 - w * .3) * sz, (.6 - w * .3) * sz, .1, dark, 0, 0);
          for (let k = 0; k < 14; k++) { const a = k * .4488 + t * .35 * (1 + w * 2), fallk = clamp(br * 1.5 - (k % 5) * .1, 0, 1), x = Math.cos(a) * rr * (1 + fallk * .6), y = cy + Math.sin(a) * rr - fallk * fallk * (cy + Math.sin(a) * rr - .3); pc(F, 'gem', x, Math.max(.3, y), fallk * Math.sin(k) * 1.5, 0, 0, a - 1.5708 + fallk * k, .35, .9 + (k % 3) * .3, .35, cry, 4, .3 + w * .5); if (k % 2) gp(F, 'gem', x, Math.max(.3, y), fallk * Math.sin(k) * 1.5, 0, 0, a - 1.5708, .2, .7, .2, P.c2, 1.8, (1 - br) * .8); }
          if (br < 1) for (let k = 0; k < 6; k++) { const a = k * 1.047 + .5; let p0 = [Math.cos(a) * rr * 1.1, cy + Math.sin(a) * rr * 1.1, 0]; for (let j = 0; j < 4; j++) { const wv = Math.sin(t * 2 + k + j * .7) * .4; const p1 = [p0[0] + Math.cos(a + wv) * .4 * sz, p0[1] + Math.sin(a + wv) * .4 * sz, p0[2] + .25 + w * .2]; seg(F, 'cap', p0, p1, (.25 - j * .05) * sz, P.c, 3, P.em); p0 = p1; } gp(F, 'sphere', p0[0], p0[1], p0[2], 0, 0, 0, .12, .12, .12, P.ec, 2.4); }
          if (alive && (w > .4 || at > 0)) { const k = at > 0 ? clamp(at, 0, 1) : (w - .4) * .5; for (let i = 0; i < 3; i++) GLX.part('glow', 'ring', F, 0, cy, 1 + i * 1.5 + (1 - k) * 2, 1.5708, 0, 0, 0, 0, 0, 1 + i * .6, 1, 1 + i * .6, P.ec, 2, k * (1 - i * .25), -1); }
          if (alive) { GLX.light(e.x, 3, e.z, 12, P.c2, 1 + w, 5); bossGlow(e, P.ec); } post(e, P.sc);
        } },
  };
  const MDL = {"grunt":"risen","brute":"risen","caster":"cultist","goblin":"risen","knight":"warden","wraith":"cultist"};
  // which look an enemy gets, or null to draw it as before
  function look(e) { if (!e || e.dummy || !e.md) return null; if (e.boss) { const bd = e.bd; if (!bd || e.wb || bd.n === WORLD_BOSS.n || bd.n === PINNACLE.n) return null; return LOOKS[bd.shape] || null; } return LOOKS[e.arch] || null; }
  function key(e) { return e.boss ? e.bd.shape : e.arch; }
  let busy = false;
  function draw(e) {
    if (busy || G.enemyLooks === false) return false; const L = look(e); if (!L) return false; if (e.escaped) return false;
    const k = key(e), nm = MDL[k], far = Math.hypot(e.x - P.x, e.z - P.z);
    if (nm) { if (!MODELS_ON || !GLX.model || G.realModels === false || G.monModels === false) return false;
      const M = GLX.model(nm, 'models/' + nm + '.cdm' + AV()); if (!M || !M.anims || !M.anims.idle) return false;
      if (!e.boss && (far > MON_FAR || (G._mN = (G._mN || 0) + 1) > 24)) return false; } // the same rule monModel keeps
    const lod = e.boss ? 0 : far > MON_NEAR ? 2 : far > LOD_MID ? 1 : 0;
    busy = true; if (lod) { lodP = GLX.part; lodO = GLX.obj; lodM = LODG[lod]; GLX.part = lodPart; GLX.obj = lodObj; }
    try { L.draw(e); } finally { busy = false; if (lod) { GLX.part = lodP; GLX.obj = lodO; } } return true;
  }
  // when it dies: how long its death plays, and whether the corpse is thrown (flingCorpse) or falls its own way
  function death(e) { const L = look(e); return L ? { dead: L.dead || (e.boss ? .45 : .95), noFling: !!L.noFling } : null; }
  return { draw, death, look, LOOKS, NAMES: {"grunt":"Rusted Raider","brute":"Grave Colossus","caster":"Masked Hierophant","swarm":"Armoured Beetle","bomber":"Powder Keg","goblin":"Goblin Kingpin","knight":"Death Knight","wraith":"Living Element","beast":"Dire Boar","tree":"Ancient Treant","golem":"Magma Titan","orb":"Void Iris"} };
})();
