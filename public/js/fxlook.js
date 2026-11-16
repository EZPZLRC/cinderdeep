'use strict';
/* build 0137 (Lee, Nov 16): the spell effects Lee picked on the Spell Effects Picker page, one look per moment of a fight:
   1 sword and fist swings: Steel arc          2 Burning Palm: Flaming handprint     3 arrows: Hunter's bolt
   4 Rain of Arrows: Golden volley             5 Shadow Volley: Frost rings          6 Firebolt: Fireball
   7 Shock Pulse: Linked sparks                8 Chain Lightning: Jumping arc        9 Frost Nova and Frost Stomp: Frozen ground
   10 Meteor and Earthshatter: Rock meteor     11 Arcane Bolt and Prism Shards: Prism crystals   12 Arcane Orb: Storm sphere
   13 Arcane Nova: Pull in, then burst         14 Arcane Torrent: Ring pulse         15 Ground Slam and Sweeping Kick: Shock dome
   16 Wave of Force: Spirit fist               17 every critical hit: Red X slash    18 danger marks on the floor: Stripes
   The code is the picker page's own code for each pick (picker build 0001, kept in the project files under oathbyte-fx/picker-0001).
   Only how things look changes: damage, range, hit areas and timing stay as they were, apart from Chain Lightning, whose jumps now land
   one after another (.08 s apart) so the bolt can be seen travelling. game.js asks FXL.of(skill) for a skill's look and falls back to the
   older effect when there is none (any skill not in the list keeps its look). New effect kinds live in FXL.kinds; an effect with nk set is
   stepped and drawn by them. This file is not loaded by the server, so game.js checks typeof FXL before using it. */
const FXL = (() => {
  const C = h => GLX.col(h), W = 0xffffff;
  const ease = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  const K = {}; // effect kinds: { draw(f, k), step(f, dt) }, k = life left (1 -> 0)
  function nfx(o) { o.max = o.life; G.fx.push(o); return o; } // the effect itself always shows
  function bit(o) { return fxRoom() ? nfx(o) : null; } // sparks, puffs and chunks only while there is room, like the game's own
  let lt = 0; const lightOK = () => ++lt <= 3; // at most three new lights a frame, like today's shots
  let swing = 0;
  function seg(A, B, w, c, em, al) { const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], L = Math.hypot(dx, dy, dz) || .01; GLX.part('glow', 'box', IDM, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, -Math.asin(clamp(dy / L, -1, 1)), Math.atan2(dx, dz), 0, 0, 0, 0, w, w, L, c, em, al); }
  function jag(A, B, n, amp) { const p = [A]; for (let q = 1; q < n; q++) { const u = q / n; p.push([A[0] + (B[0] - A[0]) * u + (Math.random() - .5) * amp, A[1] + (B[1] - A[1]) * u + (Math.random() - .5) * amp * .7, A[2] + (B[2] - A[2]) * u + (Math.random() - .5) * amp]); } p.push(B); return p; }
  function ring_(x, z, R, c, em, al, y) { GLX.obj('glow', 'ring', x, y || .1, z, 0, R * 2, 1, R * 2, c, em, al, -1); }
  function streak(x, y, z, rot, w, len, c, em, al) { GLX.obj('glow', 'box', x - Math.sin(rot) * len / 2, y, z - Math.cos(rot) * len / 2, rot, w, w, len, c, em, al); }
  // an arrow pointing along (dx, dy, dz): wooden shaft, steel head, white fletching
  function arrow3(x, y, z, dx, dy, dz, len, tip) { const L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L, ry = Math.atan2(dx, dz), rx = -Math.asin(clamp(uy, -1, 1)), h = len * .5;
    GLX.part('dyn', 'box', IDM, x, y, z, rx, ry, 0, 0, 0, 0, .05, .05, len, C(0xd8c8a0), .3, 1, 3);
    GLX.part('dyn', 'cone', IDM, x + ux * (h + .1), y + uy * (h + .1), z + uz * (h + .1), Math.acos(clamp(uy, -1, 1)), ry, 0, 0, 0, 0, .1, .24, .1, C(0xc8ced8), tip ? 1.4 : .2, 1, 4);
    GLX.part('dyn', 'box', IDM, x - ux * (h - .12), y - uy * (h - .12), z - uz * (h - .12), rx, ry, 0, 0, 0, 0, .2, .02, .22, C(0xece4d4), .2, 1, 2);
    GLX.part('dyn', 'box', IDM, x - ux * (h - .12), y - uy * (h - .12), z - uz * (h - .12), rx, ry, 0, 0, 0, 0, .02, .2, .22, C(0xece4d4), .2, 1, 2); }
  // lines drawn in a plane that faces the camera (the red X over a monster)
  const fpt = (x, y, z, a, L) => [x + Math.sin(a) * L, y + Math.cos(a) * L * .6, z - Math.cos(a) * L * .8];

  // ---- kinds ----
  K.fpuff = { step(f, dt) { f.vx *= .9; f.vz *= .9; f.vy = f.vy * .92 + 2.4 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; }, // a puff of flame that grows, rises and burns down to smoke
    draw(f, k) { const e = 1 - k, s = f.s * (.55 + e * 1.5), c = k > .62 ? 0xffe8a0 : k > .38 ? 0xff8a2a : k > .2 ? 0xd8401a : 0x4a2a1a; GLX.obj('glow', 'sphere', f.x, f.y, f.z, f.x, s, s * 1.15, s, C(c), k > .2 ? 1.7 : .4, Math.min(1, k * 2.2) * (f.a || .7)); } };
  const fpuff = (x, y, z, vx, vy, vz, s, life) => bit({ nk: 'fpuff', x, y, z, vx, vy, vz, s, life });
  K.mote = { step(f, dt) { f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; f.z += (f.vz || 0) * dt; }, draw(f, k) { const s = f.s * (.4 + k * .6); GLX.obj('glow', 'gem', f.x, f.y, f.z, f.life * 9, s, s, s, f.c, f.em || 2, k); } };
  K.puff = { step(f, dt) { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vx *= .92; f.vz *= .92; }, draw(f, k) { const s = f.s * (1 + (1 - k) * 1.6); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, s, s * .75, s, f.c, f.em || .4, k * (f.a || .3)); } }; // dust
  const puff = (x, y, z, vx, vy, vz, s, life, c, a) => bit({ nk: 'puff', x, y, z, vx, vy, vz, s, life, c: C(c || 0xb8a888), a });
  function rocks(x, z, n, c, sp) { for (let i = 0; i < n; i++) { if (!fxRoom()) return; const a = rnd(6.28), v = rnd(2, sp || 7); G.fx.push({ chunk: 1, g: Math.random() < .5 ? 'box' : 'gem', x: x + Math.sin(a) * .4, y: .4, z: z + Math.cos(a) * .4, vx: Math.sin(a) * v, vy: rnd(3, 8), vz: Math.cos(a) * v, life: rnd(.8, 1.3), max: 1.3, size: rnd(.15, .32), ar: rnd(.6, 1.2), spin: rnd(4, 12), c: C(c || 0x5a4a3a), em: 0, mat: 3 }); } }
  function dustRing(x, z, r, n) { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(-.2, .2), sp = rnd(1.5, 3.5); puff(x + Math.sin(a) * r, .3, z + Math.cos(a) * r, Math.sin(a) * sp, rnd(.2, .8), Math.cos(a) * sp, rnd(.25, .4), rnd(.6, .9)); } }
  // melee: a sweep that follows the blade through the swing
  function sweepArc(f, k, layers) { const e = 1 - k, head = clamp(e * (f.spd || 2), 0, 1), tail = clamp((e - .2) * 1.7, 0, 1), N = 16, fade = k < .4 ? k / .4 : 1, rr = f.r * .6;
    for (let i = 0; i < N; i++) { const u = i / N; if (u > head || u < tail - .07) continue; const a = f.rot + (u - .5) * f.arc * f.dir, q = (u - tail) / Math.max(.05, head - tail), s2 = f.arc * rr / N * 1.2;
      for (const L of layers) GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, L.y || 1.2, f.z + Math.cos(a) * rr, a + 1.5708, L.w0 + L.w1 * q, L.h || .04, s2, C(L.c), L.em, L.al * fade, 0); } }
  K.steel = { step(f, dt) { const e = 1 - f.life / f.max, head = clamp(e * 2.2, 0, 1); if (head < 1 && Math.random() < dt * 60 && fxRoom()) { const a = f.rot + (head - .5) * f.arc * f.dir, rr = f.r * .6, ta = a + 1.5708 * f.dir, sp = rnd(5, 10); G.fx.push({ spk: 1, x: f.x + Math.sin(a) * rr, y: 1.2, z: f.z + Math.cos(a) * rr, vx: Math.sin(ta) * sp + rnd(-1, 1), vy: rnd(.5, 3), vz: Math.cos(ta) * sp + rnd(-1, 1), life: rnd(.15, .3), max: .3, c: C(Math.random() < .5 ? W : 0xbfe4ff) }); } },
    draw(f, k) { f.spd = 2.2; sweepArc(f, k, [{ w0: .07, w1: .05, c: 0x9ad0ff, em: 1.4, al: .55 }, { w0: .025, w1: .02, c: W, em: 2.4, al: 1, y: 1.21 }]); } };
  // fire
  K.palm = { draw(f, k) { const e = 1 - k, d = .6 + (f.r * .85 - .6) * ease(e * 2.2), x = f.x + Math.sin(f.rot) * d, z = f.z + Math.cos(f.rot) * d, al = Math.min(1, k * 3), cs = Math.cos(f.rot), sn = Math.sin(f.rot), sc = .9 + e * .5;
    GLX.obj('glow', 'box', x, 1.3, z, f.rot, .62 * sc, .62 * sc, .14, C(0xff8a2a), 1.7, .75 * al); GLX.obj('glow', 'box', x, 1.3, z, f.rot, .38 * sc, .4 * sc, .1, C(0xffe8a0), 2.4, .9 * al);
    for (let i = 0; i < 4; i++) { const o = (i - 1.5) * .15 * sc; GLX.obj('glow', 'cap', x + cs * o, 1.3 + .52 * sc - Math.abs(i - 1.5) * .05, z - sn * o, f.rot, .12 * sc, .42 * sc, .1, C(0xffb050), 1.8, .8 * al); }
    GLX.part('glow', 'cap', IDM, x - cs * .38 * sc, 1.2, z + sn * .38 * sc, 0, f.rot, .8, 0, 0, 0, .12 * sc, .36 * sc, .1, C(0xffb050), 1.8, .8 * al);
    GLX.halo(x, 1.3, z, 2.6, C(0xff7a2a), .5 * al); GLX.light(x, 1.4, z, 7, C(0xff7a2a), 1.3 * al, 2); if (Math.random() < .7) fpuff(x + rnd(-.3, .3), 1.1 + rnd(.4), z + rnd(-.3, .3), -sn * 2, rnd(.5, 1.5), -cs * 2, rnd(.12, .2), rnd(.35, .5)); } };
  K.fexp = { draw(f, k) { const e = 1 - k, d = f.r * (.5 + ease(e * 1.4) * 1.5); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, d, d * .9, d, C(k > .6 ? 0xffe8a0 : 0xff6a1a), 1.8, k * k * .8); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, d * .55, d * .5, d * .55, C(W), 2.4, Math.max(0, k - .5) * 1.6); GLX.halo(f.x, f.y, f.z, d * 2, C(0xff7a2a), k * .7); GLX.light(f.x, f.y + .5, f.z, 9, C(0xff7a2a), 2 * k, 5); } };
  function fireBurst(x, z, big) { nfx({ nk: 'fexp', x, y: 1.1, z, r: big ? 1.3 : .8, life: .35 }); for (let i = 0; i < (big ? 14 : 8); i++) { const a = rnd(6.28), sp = rnd(1.5, 4); fpuff(x, 1, z, Math.cos(a) * sp, rnd(.5, 2), Math.sin(a) * sp, rnd(.15, .28), rnd(.4, .7)); } for (let i = 0; i < 10 && fxRoom(); i++) { const a = rnd(6.28), sp = rnd(1, 3); G.fx.push({ ember: 1, x, y: rnd(.6, 1.3), z, vx: Math.cos(a) * sp, vy: rnd(1.5, 4), vz: Math.sin(a) * sp, life: rnd(.5, 1), max: 1, size: rnd(.05, .1), c: C([0xffd060, 0xff8a2a, 0xff4a10][i % 3]) }); } G.fx.push({ scorch: 1, x, z, r: big ? 1.2 : .8, life: 1.6, max: 1.6, c: C(0xff6a1a) }); }
  // arcane
  K.shell = { draw(f, k) { const e = 1 - k, d = .8 + (f.r * 2 - .8) * ease(e * 1.3); GLX.obj('glow', 'sphere', f.x, 0, f.z, 0, d, d * .55, d, f.c, 1.4, k * .35); GLX.obj('glow', 'ring', f.x, .12, f.z, 0, d, 1, d, C(W), 1.8, k, -1); } };
  K.inmote = { draw(f, k) { const u = ease(1 - k), r = f.r * (1 - u), x = f.x + Math.sin(f.a) * r, z = f.z + Math.cos(f.a) * r, y = .4 + f.h * (1 - u); seg([x, y, z], [x + Math.sin(f.a) * .6, y + f.h * .1, z + Math.cos(f.a) * .6], .07, f.c, 1.8, .9); GLX.obj('glow', 'gem', x, y, z, 0, .12, .12, .12, C(W), 2.2, 1); } };
  // cold
  K.frostd = { init(f) { f.cr = []; for (let i = 0; i < 16; i++) f.cr.push([i / 16 * 6.283 + rnd(-.15, .15), rnd(.45, 1), rnd(-.3, .3)]); f.tw = []; for (let i = 0; i < 22; i++) f.tw.push([rnd(6.283), Math.sqrt(Math.random()), rnd(6.28)]); },
    draw(f, k) { if (!f.cr) this.init(f); const R = f.r * ease((1 - k) * 5), al = Math.min(1, k * 2.4); GLX.obj('glow', 'disc', f.x, .08, f.z, 0, R * 2, 1, R * 2, C(0xbfe8ff), 1, al * .3, 1); GLX.obj('glow', 'ring', f.x, .1, f.z, 0, R * 2, 1, R * 2, C(0xbfe8ff), 1.2, al * .3, -1);
      for (const c of f.cr) { const L = R * c[1], a = c[0]; GLX.obj('glow', 'box', f.x + Math.sin(a) * L / 2, .11, f.z + Math.cos(a) * L / 2, a, .06, .02, L, C(0xe0f6ff), 1.6, al * .7, 0); const b = a + c[2], L2 = L * .35; GLX.obj('glow', 'box', f.x + Math.sin(a) * L * .7 + Math.sin(b + .5) * L2 / 2, .11, f.z + Math.cos(a) * L * .7 + Math.cos(b + .5) * L2 / 2, b + .5, .04, .02, L2, C(0xe0f6ff), 1.4, al * .5, 0); }
      for (const w of f.tw) { const tw = .5 + .5 * Math.sin(G.time * 9 + w[2]); GLX.obj('glow', 'gem', f.x + Math.sin(w[0]) * w[1] * R, .25, f.z + Math.cos(w[0]) * w[1] * R, w[2], .1, .1, .1, C(W), 2.2, al * tw); } } };
  // lightning
  K.zap = { draw(f, k) { if (!f.pts || Math.random() < .4) { f.pts = jag([f.x1, f.y1, f.z1], [f.x2, f.y2, f.z2], f.n || 7, f.amp || .9); f.br = []; for (let q = 1; q < f.pts.length - 1; q++) if (Math.random() < (f.brp === undefined ? .5 : f.brp)) { const A = f.pts[q]; f.br.push([A, [A[0] + rnd(-1.4, 1.4), A[1] - rnd(.3, 1), A[2] + rnd(-1.4, 1.4)]]); } }
    const g = f.grow ? clamp((1 - k) / f.grow, 0, 1) : 1, m = Math.max(1, Math.ceil((f.pts.length - 1) * g)), c = f.c, wc = C(W), w = f.w || .2;
    for (let q = 0; q < m; q++) { seg(f.pts[q], f.pts[q + 1], w, c, 1.4, k * .75); seg(f.pts[q], f.pts[q + 1], w * .35, wc, 2.2, k); }
    for (const b of f.br) seg(b[0], b[1], w * .3, c, 1.6, k * .8);
    if (g >= 1) { GLX.halo(f.x2, f.y2, f.z2, f.hs || 2.8, c, k * .9); if (f.lit !== false) GLX.light(f.x2, f.y2 + .3, f.z2, 8, c, 1.3 * k, 3); } } };
  const zap = o => nfx(Object.assign({ nk: 'zap', y1: 1.35, y2: 1.3, life: .2 }, o));
  K.after = { draw(f, k) { seg([f.x1, 1.3, f.z1], [f.x2, 1.3, f.z2], .05, f.c, 1.6, k * .6); } };
  // force
  K.dome = { draw(f, k) { const e = 1 - k, d = 1 + (f.r * 2 - 1) * ease(e * 1.5); GLX.obj('glow', 'sphere', f.x, 0, f.z, 0, d, d * .5, d, f.c, 1.3, k * .3); GLX.obj('glow', 'ring', f.x, .12, f.z, 0, d, 1, d, C(W), 1.8, k * .9, -1); GLX.obj('glow', 'ring', f.x, .13, f.z, 0, d * .96, 1, d * .96, f.c, 1.4, k * .7, -1); } };
  // crit
  K.xcut = { draw(f, k) { const e = 1 - k, g = clamp(e * 6, 0, 1), L = f.r * g, al = Math.min(1, k * 2.5); for (const a of [.785, -.785]) { const A = fpt(f.x, f.y, f.z, a, L), B = fpt(f.x, f.y, f.z, a + 3.1416, L); seg(A, B, .26 * k + .06, f.c, 1.8, al * .9); seg(A, B, .07, C(W), 2.4, al); } GLX.halo(f.x, f.y, f.z, f.r * 1.2, f.c, al * .5); } };

  // ---- the looks: hooks game.js calls in place of the older effect ----
  const fwd = p => [Math.sin(p.rot), Math.cos(p.rot)];
  const H = {
    melee: { // Steel arc: a thin blue-white edge with sparks thrown off it, and a puff of dust on each hit
      slash(sk, r) { nfx({ nk: 'steel', x: P.x, z: P.z, rot: P.rot, r, arc: sk.arc + .4, dir: ++swing % 2 ? 1 : -1, life: .26 }); },
      hit(e) { for (let i = 0; i < 3; i++) puff(e.x + rnd(-.3, .3), .25, e.z + rnd(-.3, .3), (e.hdx || 0) * 2 + rnd(-1, 1), rnd(.2, .6), (e.hdz || 0) * 2 + rnd(-1, 1), .22, .6); } },
    palm: { // Flaming handprint: a burning hand flies out of the palm and through the enemies, shedding flame
      slash(sk, r) { nfx({ nk: 'palm', x: P.x, z: P.z, rot: P.rot, r, life: .4 }); } },
    arrows: { // Hunter's bolt: gold-tipped arrows with a flash at the bow, and a thump of dust where they hit
      projCast() { const s = Math.sin(P.rot), c = Math.cos(P.rot); G.fx.push({ flash: 1, x: P.x + s * .9, y: 1.4, z: P.z + c * .9, r: 2, life: .14, max: .14, c: C(0xffd27a) }); },
      draw(p) { const [s, c] = fwd(p); arrow3(p.x, 1.25, p.z, s, 0, c, 1.2, true); GLX.halo(p.x + s * .7, 1.25, p.z + c * .7, .9, C(0xffd27a), .5); streak(p.x, 1.25, p.z, p.rot, .06, 1.4, C(0xffd27a), 1.3, .4); },
      trail() { },
      pierce(p, e) { for (let i = 0; i < 2; i++) puff(e.x, .4, e.z, rnd(-1, 1), .4, rnd(-1, 1), .25, .5); G.fx.push({ shock: 1, x: e.x, z: e.z, r: .6, life: .25, max: .25, c: C(0xffd27a), h: 0 }); },
      die(p) { burst(p.x, 1.2, p.z, 0xffd27a, 4, 4); } },
    rain: { // Golden volley: streaks of gold light drop in and pop where they land
      areaDraw(a, k) { if (a.done) return; ring_(a.x, a.z, a.r * .5, C(0xffd27a), 1.2, .35 * k); const y = (1 - k) * 12 + .4; seg([a.x + .4, y + 2.2, a.z - .2], [a.x, y, a.z], .12, C(0xffd27a), 1.6, .8); GLX.obj('glow', 'gem', a.x, y, a.z, 0, .18, .18, .18, C(W), 2.4, 1); },
      land(a) { G.fx.push({ shock: 1, x: a.x, z: a.z, r: .9, life: .3, max: .3, c: C(0xffd27a), h: 0 }); burst(a.x, .4, a.z, 0xffd27a, 4, 5); } },
    volley: { // Frost rings: each wave lets out a ring of frost, and the shots are spinning ice crystals
      wave() { ring(P.x, P.z, .5, 7, .45, 0x9ad8ff); },
      draw(p) { GLX.part('glow', 'gem', IDM, p.x, 1.25, p.z, G.time * 9, p.rot, 0, 0, 0, 0, .3, .3, .3, C(0xd8f4ff), 1.8, .95); streak(p.x, 1.25, p.z, p.rot, .05, .9, p.c, 1.2, .35); },
      trail() { }, die(p) { bit({ shard: 1, x: p.x, z: p.z, rx: rnd(.2, .5), ry: p.rot, h: .6, w: .1, life: .7, c: C(0x9adfff) }); } },
    firebolt: { // Fireball: a rolling ball of flame with a smoky trail and a proper explosion
      draw(p) { const fl = .9 + .2 * Math.sin(G.time * 40 + p.x); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, .4, .4, .4, C(0xfff0c0), 2.4, 1); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, .8 * fl, .8 * fl, .8 * fl, C(0xff7a2a), 1.6, .8); GLX.part('glow', 'ring', IDM, p.x, 1.25, p.z, 1.5708, p.rot, G.time * 6, 0, 0, 0, 1.1, 1, 1.1, C(0xffb050), 1.4, .45, -1); GLX.halo(p.x, 1.25, p.z, 2.6, C(0xff7a2a), .45); if (lightOK()) GLX.light(p.x, 1.6, p.z, 7, C(0xff7a2a), 1.1, 1); },
      trail(p, dt) { if (Math.random() < dt * (LOWQ ? 20 : 40)) fpuff(p.x - p.vx * .02, 1.25, p.z - p.vz * .02, rnd(-.5, .5), rnd(.2, .8), rnd(-.5, .5), rnd(.14, .22), rnd(.3, .5)); },
      die(p) { fireBurst(p.x, p.z, true); } },
    spark: { // Linked sparks: the sparks of one cast fly joined by crackling arcs (the arcs are drawn by frame below)
      draw(p) { GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, .3, .3, .3, C(W), 2.6, 1); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, .55, .55, .55, p.c, 1.5, .5); GLX.halo(p.x, 1.25, p.z, 1.8, p.c, .4); },
      die(p) { for (let i = 0; i < 3; i++) { const a = rnd(6.28), L = rnd(.9, 1.6); zap({ x1: p.x, z1: p.z, x2: p.x + Math.cos(a) * L, z2: p.z + Math.sin(a) * L, y1: 1.25, y2: rnd(.3, 1.2), c: p.c, w: .1, n: 4, amp: .4, brp: 0, lit: false, hs: 1, life: .15 }); } } },
    chain: { // Jumping arc: the bolt jumps from one enemy to the next, leaving a glowing line behind
      chain(path, hit) { path.forEach((p, j) => G.timers.push({ t: j * .08, fn() { zap({ x1: p[0], z1: p[1], x2: p[2], z2: p[3], c: C(0xfff07a), grow: .45, life: .3 }); nfx({ nk: 'after', x1: p[0], z1: p[1], x2: p[2], z2: p[3], life: .6, c: C(0xfff07a) }); hit(p[4], j); } })); } },
    frost: { // Frozen ground: the floor freezes over in a pale circle with cracks and twinkles that linger
      nova(x, z, r) { nfx({ nk: 'frostd', x, z, r, life: 1.6 }); ring(x, z, .5, r, .3, 0xd8f4ff); burst(x, .5, z, 0xe8f8ff, LOWQ ? 8 : 14, 6); } },
    meteor: { // Rock meteor: a burning rock falls, leaves a crater and throws out chunks of stone
      areaDraw(a, k) { if (a.done) return; const big = idOf(a.sk) === 'meteor'; ring_(a.x, a.z, a.r, C(0xff7a2a), 1, .5); GLX.obj('glow', 'disc', a.x, .08, a.z, 0, a.r * 2 * k, 1, a.r * 2 * k, C(0xff7a2a), 1, .18, 0); const y = (1 - k) * 14 + .6, w = (1 - k) * 3, s = big ? 1.4 : .7; GLX.obj('dyn', 'blob', a.x + w, y, a.z - w * .5, G.time * 3, s, s, s, C(0x3a2a22), .2, 1, 3); GLX.obj('glow', 'sphere', a.x + w, y, a.z - w * .5, 0, s * 1.25, s * 1.25, s * 1.25, C(0xff7a2a), 1.4, .45); if (Math.random() < .5) fpuff(a.x + w, y + .3, a.z - w * .5, 0, .5, 0, s * .3, .4); },
      land(a) { const big = idOf(a.sk) === 'meteor'; fireBurst(a.x, a.z, big); rocks(a.x, a.z, big ? 12 : 5, 0x4a3a2e); dustRing(a.x, a.z, a.r * .5, big ? 12 : 6); G.fx.push({ scorch: 1, x: a.x, z: a.z, r: a.r * .7, life: 2.4, max: 2.4, c: C(0x1a1010) }); G.shake = Math.min(.6, G.shake + .25); } },
    abolt: { // Prism crystals: spinning crystals in violet, blue and pink that shatter into glints
      draw(p) { const t = [0xc890ff, 0x7ad0ff, 0xff8ad8][(p.i || 0) % 3]; GLX.part('glow', 'gem', IDM, p.x, 1.25, p.z, 0, p.rot, G.time * 10, 0, 0, 0, .28, .28, .9, C(t), 1.8, .95); GLX.part('glow', 'gem', IDM, p.x, 1.25, p.z, 0, p.rot, -G.time * 8, 0, 0, 0, .12, .12, .6, C(W), 2.2, .9); GLX.halo(p.x, 1.25, p.z, 1.5, C(t), .4); },
      trail() { }, die(p) { const t = [0xc890ff, 0x7ad0ff, 0xff8ad8][(p.i || 0) % 3]; for (let i = 0; i < 6; i++) bit({ nk: 'mote', x: p.x, y: 1.25, z: p.z, vx: rnd(-4, 4), vy: rnd(-1, 3), vz: rnd(-4, 4), s: .14, c: C(i % 2 ? W : t), life: rnd(.25, .45) }); } },
    orb: { // Storm sphere: an orb with lightning crawling over it, breaking in a dome of arcs (game.js still deals the burst's damage)
      draw(p) { GLX.obj('glow', 'sphere', p.x, 1.3, p.z, 0, .6, .6, .6, C(W), 2.4, 1); GLX.obj('glow', 'sphere', p.x, 1.3, p.z, 0, 1.4, 1.4, 1.4, p.c, 1.2, .4); for (let i = 0; i < 3; i++) { const a = rnd(6.28), b = rnd(-1, 1), L = rnd(.9, 1.6), E = [p.x + Math.cos(a) * L, 1.3 + b * L * .6, p.z + Math.sin(a) * L], pts = jag([p.x, 1.3, p.z], E, 3, .35); for (let q = 0; q < pts.length - 1; q++) seg(pts[q], pts[q + 1], .05, C(0xe8d0ff), 2, .9); } GLX.halo(p.x, 1.3, p.z, 3.4, p.c, .45); if (lightOK()) GLX.light(p.x, 1.6, p.z, 8, p.c, 1.1, 1); },
      trail() { },
      die(p, r) { r = r || p.sk.explode; nfx({ nk: 'dome', x: p.x, z: p.z, r, life: .45, c: p.c }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; zap({ x1: p.x, z1: p.z, x2: p.x + Math.sin(a) * r, z2: p.z + Math.cos(a) * r, y2: .3, c: C(0xd8b0ff), w: .12, n: 5, amp: .7, brp: .2, lit: i === 0, hs: 1.2, life: .25 }); } } },
    anova: { // Pull in, then burst: light rushes in to the hero for a split second, then bursts out as a shell
      nova(x, z, r) { for (let i = 0; i < 18; i++) nfx({ nk: 'inmote', x, z, r: r * rnd(.7, 1), a: i / 18 * 6.283, h: rnd(.6, 1.6), c: C(0xc890ff), life: .16 }); G.timers.push({ t: .16, fn() { nfx({ nk: 'shell', x, z, r, life: .45, c: C(0xb070ff) }); burst(x, 1, z, 0xc890ff, 12, 8); G.fx.push({ flash: 1, x, y: 1.2, z, r: 3.4, life: .2, max: .2, c: C(W) }); } }); } },
    torrent: { // Ring pulse: each wave sends out a ring of light along with the shots
      wave() { ring(P.x, P.z, .5, 12, .5, 0xb070ff); },
      draw(p) { GLX.obj('glow', 'gem', p.x, 1.25, p.z, G.time * 8, .22, .22, .22, C(W), 2.4, 1); streak(p.x, 1.25, p.z, p.rot, .08, .9, p.c, 1.5, .6); },
      trail() { }, die(p) { burst(p.x, 1.2, p.z, 0xc890ff, 2, 3); } },
    slam: { // Shock dome: a clean dome of force pushes out from the hero
      nova(x, z, r) { nfx({ nk: 'dome', x, z, r, life: .45, c: C(0xfff0d0) }); rocks(x, z, 4, 0x5a4a3a, 4); } },
    wave: { // Spirit fist: a big golden fist of light punches forward through the line
      draw(p) { const s = Math.sin(p.rot), c = Math.cos(p.rot), g = C(0xffd27a); GLX.obj('glow', 'rbox', p.x, 1.25, p.z, p.rot, 1.2, 1, .9, g, 1.6, .75); for (let i = 0; i < 4; i++) { const o = (i - 1.5) * .3; GLX.obj('glow', 'cap', p.x + c * o + s * .4, 1.55, p.z - s * o + c * .4, p.rot, .26, .3, .3, C(0xffe8b0), 2, .85); } GLX.obj('glow', 'cap', p.x - c * .62, 1.1, p.z + s * .62, p.rot, .26, .5, .26, C(0xffe8b0), 2, .8); streak(p.x, 1.25, p.z, p.rot, .7, 2.2, g, 1.2, .25); GLX.halo(p.x, 1.25, p.z, 2.6, g, .45); if (lightOK()) GLX.light(p.x, 1.6, p.z, 7, g, 1, 1); },
      trail() { }, pierce(p, e) { G.fx.push({ shock: 1, x: e.x, z: e.z, r: .9, life: .25, max: .25, c: C(0xffd27a), h: 0 }); },
      die(p) { G.fx.push({ flash: 1, x: p.x, y: 1.2, z: p.z, r: 2.4, life: .2, max: .2, c: C(0xffd27a) }); } },
  };
  const BY = { cleave: 'melee', bash: 'melee', jab: 'melee', hook: 'melee', punch: 'melee', palm: 'palm', shot: 'arrows', power: 'arrows', multi: 'arrows', arrows: 'rain', volley: 'volley', firebolt: 'firebolt', spark: 'spark', chain: 'chain', frost: 'frost', stomp: 'frost', meteor: 'meteor', quake: 'meteor', abolt: 'abolt', shards: 'abolt', orb: 'orb', anova: 'anova', torrent: 'torrent', slam: 'slam', sweep: 'slam', wave: 'wave' };
  let ids = null; // a skill's id: talent copies carry it; the plain skills, and copies made for a talent's second go, are found by object or by name
  function idOf(sk) { if (!sk) return null; if (sk.id) return sk.id; if (!ids) { ids = new Map(); for (const k in SKILLS) { ids.set(SKILLS[k], k); ids.set('n:' + SKILLS[k].n, k); } } return ids.get(sk) || (sk.n ? ids.get('n:' + sk.n) : null) || null; }
  function of(sk) { if (typeof document === 'undefined' || !sk || !sk.n) return null; const id = idOf(sk); return (id && H[BY[id]]) || null; }

  // a critical hit: Red X slash. A sharp red X tears across the monster and the screen shakes a little harder
  function crit(e, sk, v) { floatText(e.x, 1.6 * e.sc + .6, e.z, v + '!', '#ff6a4a', 1.1, 23); nfx({ nk: 'xcut', x: e.x, y: 1.3 * e.sc, z: e.z, r: 1.8, life: .3, c: C(0xff2a2a) }); burst(e.x, 1.1 * e.sc, e.z, 0xff4a2a, 8, 6); hitSpray(e, sk, true, true); G.shake = Math.min(.5, G.shake + .2); }

  // danger marks on the floor: Stripes. A red outline filled with moving warning stripes that speed up; the fill only flashes right before it lands
  function each(a, onLine, onCone, onCircle) { const L = areaLines(a); if (L) { for (const l of L) onLine(l[0], l[1], l[2], a.len, a.w); return; } if (a.sh === 'cone') return onCone(); onCircle(); }
  function slices(a, fn) { const n = Math.max(1, Math.round(2 * a.arc / .1745)), st = 2 * a.arc / n, f = Math.tan(st / 2) / Math.tan(.0873); for (let i = 0; i < n; i++) fn(a.ang - a.arc + st * (i + .5), f, st); }
  function tele(a, k) { const E = C(0xff3a2a), S2 = C(0xff2a1a), sp = 1.5 + k * 6, t = G.time * sp, fla = k > .75 && !a.done ? .1 + .15 * (.5 + .5 * Math.sin(G.time * 30)) : 0;
    each(a,
      (x0, z0, ang, len, w) => { const sn = Math.sin(ang), cs = Math.cos(ang), px = cs * w / 2, pz = -sn * w / 2; for (const sd of [1, -1]) GLX.obj('glow', 'box', x0 + sn * len / 2 + px * sd, .08, z0 + cs * len / 2 + pz * sd, ang, .12, .02, len, E, 1.3, .95, 0); GLX.obj('glow', 'box', x0 + sn * len, .08, z0 + cs * len, ang, w, .02, .12, E, 1.3, .95, 0); const g = 1.4, o = t % g; for (let d = o; d < len; d += g) GLX.obj('glow', 'box', x0 + sn * d, .07, z0 + cs * d, ang + .6, w * 1.1, .02, .28, S2, 1, .4, 0); if (fla) GLX.obj('glow', 'box', x0 + sn * len / 2, .06, z0 + cs * len / 2, ang, w, .02, len, S2, 1, fla, 0); },
      () => { const d = a.r * 2; for (const sd of [-1, 1]) { const q = a.ang + a.arc * sd; GLX.obj('glow', 'box', a.x + Math.sin(q) * a.r / 2, .08, a.z + Math.cos(q) * a.r / 2, q, .12, .02, a.r, E, 1.3, .95, 0); } slices(a, (q, f, st) => { const ch = 2 * Math.sin(st / 2); GLX.obj('glow', 'box', a.x + Math.sin(q) * a.r * Math.cos(st / 2), .08, a.z + Math.cos(q) * a.r * Math.cos(st / 2), q, ch * a.r, .02, .12, E, 1.3, .95, 0); for (let r = (t % 1.4) + .6; r < a.r; r += 1.4) GLX.obj('glow', 'box', a.x + Math.sin(q) * r, .07, a.z + Math.cos(q) * r, q, ch * r, .02, .26, S2, 1, .4, 0); if (fla) GLX.obj('glow', 'sect', a.x, .06, a.z, q, d * f, 1, d, S2, 1, fla, 0); }); },
      () => { const d = a.r * 2; GLX.obj('glow', 'ring', a.x, .08, a.z, 0, d * 1.03, 1, d * 1.03, E, 1.3, .95, -1); for (let r = a.r - (t * .6 % .8); r > .2; r -= .8) GLX.obj('glow', 'ring', a.x, .07, a.z, 0, r * 2, 1, r * 2, S2, 1, .35, -1); if (fla) GLX.obj('glow', 'disc', a.x, .06, a.z, 0, d, 1, d, S2, 1, fla, 0); }); }

  // once a frame, after the shots: the arcs that link the sparks of one Shock Pulse
  function frame() { let by = null; for (const p of G.pp) { if (!p.vid || of(p.sk) !== H.spark) continue; by = by || {}; (by[p.vid] = by[p.vid] || []).push(p); }
    if (!by) return; for (const k in by) { const L = by[k].sort((a, b) => a.i - b.i); for (let i = 0; i < L.length - 1; i++) { const pts = jag([L[i].x, 1.25, L[i].z], [L[i + 1].x, 1.25, L[i + 1].z], 5, .5); for (let q = 0; q < pts.length - 1; q++) { seg(pts[q], pts[q + 1], .12, L[i].c, 1.5, .7); seg(pts[q], pts[q + 1], .04, C(W), 2, .9); } } } }
  return { of, idOf, kinds: K, crit, tele, frame, begin() { lt = 0; } };
})();
