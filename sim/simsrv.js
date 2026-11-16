'use strict';
// Runs inside one sandbox per party, after data.js and game.js. The server keeps the monsters;
// each player keeps their own hero and reports hits. Host supplies __emit(playerId|null, message).
var SP = {}, known = new Set(), curTarget = null, curK = 1; // curK: how much monster life is scaled for the party's size
var ST = { chase: 0, wind: 1, rec: 2, charge: 3 };
function r2(v) { return Math.round(v * 100) / 100; }
function entInfo(e) { return { id: e.id, md: e.md, arch: e.arch, x: r2(e.x), z: r2(e.z), rot: r2(e.rot), lvl: e.lvl, elite: e.elite, pack: e.pack, r: e.r, sc: e.sc, maxHp: e.maxHp, hp: Math.round(e.hp), dmg: e.dmg, spd: e.spd, name: e.name, mods: e.mods, boss: !!e.boss, awake: !!e.awake, noLoot: !!e.noLoot, wb: e.wb ? 1 : undefined }; }
let depth = 0, rift = null, tierV = 0; // tierV (build 0074): the party's difficulty, used from its next new floor
function srvTierName(v) { return TIERS[Math.max(0, Math.min(TIERS.length - 1, v | 0))].n; }
function srvTier(v) { tierV = Math.max(0, Math.min(TIERS.length - 1, v | 0)); return tierV; }
 // rift (build 0021): a timed floor; the party races to slay its guardian
function srvNewZone(lvl, nPlayers, next) {
  const wasRift = !!rift; if (next === 'rift') rift = { t0: Date.now(), tier: Math.max(1, lvl | 0) + 2 }; else { rift = null; if (next === 'prev') depth = Math.max(0, depth - 1); else if (next && !wasRift) depth++; }
  const zd = rift ? zoneFor(((r12) => r12 === 9 ? 8 : r12)((Math.random() * 12) | 0)) /* build 0074: floor 10 is the Heart, so a rift rolls the Voidscar there instead */ : zoneFor(depth), def = { type: 'zone', theme: zd.theme, rift: rift ? 1 : 0, lvl: rift ? rift.tier : Math.max(1, lvl | 0), seed: !rift && forceSeed ? forceSeed : !rift && typeof DAILY === 'number' ? (Math.imul(DAILY ^ (depth + 1), 2654435761) >>> 0) % 1000000000 : (Math.random() * 1e9) | 0, name: rift ? 'Rift · ' + zd.name : zd.name, depth: depth + 1, tier: tierV };
  G.zone = genZone(def); G.ents.length = 0; G.projs.length = 0; G.areas.length = 0; G.boss = null; spawnAll(G.zone);
  const k = partyK(nPlayers); curK = k; known = new Set();
  for (const e of G.ents) { e.maxHp = Math.round(e.maxHp * k); e.hp = e.maxHp; known.add(e.id); }
  { const w = wbAdd(); if (w) known.add(w.id); } /* build 0075: the world boss is on every new floor while it lives */
  return { t: 'zone', seed: def.seed, lvl: def.lvl, d: depth, tier: def.tier, theme: def.theme, rift: rift ? Date.now() - rift.t0 : undefined, ents: G.ents.map(entInfo) };
}
// build 0062 (playtest): a party that reconnects after a server update gets a fresh floor at the depth it was on, not floor 1
var forceSeed = 0;
// build 0070 (Lee's playtest): after a dropped connection or a server restart the floor comes back with the same layout, so the hero keeps their exact spot.
// Monsters right around that spot are not put back, and a guardian already slain stays slain.
function srvResume(lvl, nPlayers, d, seed, x, z, clr) { rift = null; depth = Math.max(0, Math.min(500, (d | 0) - 1)); forceSeed = seed > 0 && seed < 1e9 ? seed | 0 : 0; let m; try { m = srvNewZone(lvl, nPlayers, false); } finally { forceSeed = 0; }
  if (m.seed !== (seed | 0)) return m; const near = e => isFinite(x) && isFinite(z) && Math.hypot(e.x - x, e.z - z) < 12;
  for (let i = G.ents.length - 1; i >= 0; i--) { const e = G.ents[i]; if ((!e.boss && near(e)) || (e.boss && clr)) G.ents.splice(i, 1); } if (clr) { G.zone.cleared = true; G.boss = null; }
  return srvState(); }
// TODO (Sprint 1, server side): switch to partyHpK(n) from data.js, about 1.7x monster life for a full group. Not changed in build 0028.
function partyK(n) { return 1 + .5 * Math.max(0, n - 1); }
// someone joined or left: scale the life of every monster on the floor to the new party size, keeping how hurt it is (build 0022)
function srvScale(n) { if (!G.zone || n < 1) return 0; const k = partyK(n), r = k / curK; if (Math.abs(r - 1) < .001) return 0; curK = k; for (const e of G.ents) { if (!e.alive || e.wb) continue; e.maxHp = Math.max(1, Math.round(e.maxHp * r)); e.hp = Math.min(e.maxHp, Math.max(1, Math.round(e.hp * r))); } return Math.round(r * 10000) / 10000; }
function srvFloor() { return depth + 1; } /* the floor this party is on, for the party browser */
function srvState() { return { t: 'zone', seed: G.zone.def.seed, lvl: G.zone.def.lvl, d: depth, tier: G.zone.def.tier | 0, theme: G.zone.def.theme, rift: rift ? (rift.done ? -1 : Date.now() - rift.t0) : undefined, cleared: !!G.zone.cleared, bossAt: G.zone.bossAt, ents: G.ents.filter(e => e.alive).map(entInfo) }; }
dmgPlayer = function (v, el, src) { if (curTarget) __emit(curTarget.id, { t: 'dmg', v: Math.round(v), el: el, src: src ? src.id : 0 }); };
addArea = function (o) { o.t = 0; G.areas.push(o); if (o.owner === 'e') __emit(null, { t: 'area', x: r2(o.x), z: r2(o.z), r: o.r, delay: o.delay, c: o.c, sh: o.sh, ang: o.ang === undefined ? undefined : r2(o.ang), arc: o.arc, len: o.len, w: o.w, n: o.n, hv: o.hvy }); return o; }; // build 0048: shapes and heavy blows go to every player
eShoot = function (e, ang, spd, dmgM, el) {
  const p = { x: e.x + Math.sin(ang) * e.r, z: e.z + Math.cos(ang) * e.r, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, life: 3, r: .45, dmg: e.dmg * (dmgM || 1), el: el || 'phys' };
  G.projs.push(p); __emit(null, { t: 'proj', x: r2(p.x), z: r2(p.z), vx: r2(p.vx), vz: r2(p.vz), c: e.md.e });
};
killEnemy = function (e) {
  if (!e.alive) return; e.alive = false; e.deadT = .45; __emit(null, { t: 'die', id: e.id, l: e.lvl, xm: (e.a && e.a.xp) || 1, el: e.elite | 0 }); if (!e.wb && !e.noLoot && typeof __kill === 'function') __kill(); /* build 0075: every real kill feeds the server-wide world boss count */
  if (e.volatile) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.boss && !e.wb) { G.zone.cleared = true; if (rift && !rift.done) { rift.done = true; __emit(null, { t: 'riftDone', ms: Date.now() - rift.t0, tier: rift.tier }); } }
};
function srvHit(pid, m) {
  const e = G.ents.find(x => x.id === m.id); if (!e || !e.alive) return; const p = SP[pid];
  // build 0074 (security): a hit has to come from near the monster, and no single hit or burst of hits can do more than the game itself allows.
  // A cull or an execute is at most twice a monster's life. A guardian takes at most 8% of its life from one hit and 12% a second from one player.
  if (!p || p.dead || Math.hypot(e.x - p.x, e.z - p.z) > 36) return;
  if (e.wb) { const v = Math.max(0, Math.min(+m.v || 0, e.maxHp * WB_HIT)); wake(e); if (m.el === 'cold') e.chill = 2.5; else if (m.el === 'light') e.shock = 3; if (WBS && v > 0 && typeof __wb === 'function') __wb(v / e.maxHp, pid); return; } /* the world boss has one life shared by the whole server: the host keeps it */
  let v = Math.max(0, Math.min(+m.v || 0, e.boss ? e.maxHp * .08 : e.maxHp * 2)); if (!isFinite(v)) return;
  if (e.boss) { const now = Date.now(), b = p.bossDmg || (p.bossDmg = { t: now, v: 0 }); b.v = Math.max(0, b.v - (now - b.t) / 1000 * e.maxHp * .12); b.t = now; const room = e.maxHp * .12 - b.v; if (room <= 0) return; v = Math.min(v, room); b.v += v; }
  e.hp -= v; wake(e);
  if (m.el === 'fire') { e.burn = Math.max(e.burn, v * .15); e.burnT = 3; } else if (m.el === 'cold') e.chill = 2.5; else if (m.el === 'light') e.shock = 3;
  if (m.fz && !e.boss) e.frozen = Math.min(3, +m.fz || 0);
  if (p && !e.boss && e.arch !== 'brute') { const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz) || 1; moveEnt(e, dx / l * .4, dz / l * .4, e.r); }
  if (e.hp <= 0) killEnemy(e);
}
function srvTick(dt) {
  G.time += dt; const all = Object.values(SP), pl = all.filter(p => !p.dead);
  repop(dt, all.filter(p => p.x > -900)); // monsters slowly repopulate the floor, far from every player
  if (all.length && !pl.length) { const rs = []; for (const e of G.ents) if (e.alive && e.awake) { e.awake = false; e.st = 'chase'; if (e.boss && !e.wb) { e.hp = e.maxHp; e.x = G.zone.bossAt[0]; e.z = G.zone.bossAt[1]; } rs.push([e.id, r2(e.x), r2(e.z), Math.round(e.hp)]); } if (rs.length) __emit(null, { t: 'rest', e: rs }); } /* build 0075: tell the players, so their screens match */
  const act = [];
  for (const e of G.ents) {
    if (!e.alive) { e.deadT -= dt; continue; }
    let b = null, bd = 1e9; for (const p of pl) { const d = (p.x - e.x) * (p.x - e.x) + (p.z - e.z) * (p.z - e.z); if (d < bd) { bd = d; b = p; } }
    if (!b) continue; curTarget = b; P.x = b.x; P.z = b.z; P.y = 0; P.dead = false; updEnemy(e, dt); if (e.alive && e.awake) act.push(e);
  }
  curTarget = null;
  for (let i = 0; i < act.length; i++) { const a = act[i]; for (let j = i + 1; j < act.length; j++) { const b = act[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d < m && d > .001) { const q = (m - d) * .5, nx = dx / d * q, nz = dz / d * q; if (!a.boss) moveEnt(a, -nx, -nz, a.r * .8); if (!b.boss) moveEnt(b, nx, nz, b.r * .8); } }
    if (!a.boss) for (const p of pl) { const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz), m = a.r + .5; if (d < m && d > .001) moveEnt(a, dx / d * (m - d), dz / d * (m - d), a.r * .8); } }
  if (G.ents.some(e => !e.alive && e.deadT <= 0)) G.ents = G.ents.filter(e => e.alive || e.deadT > 0);
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i]; p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt; let dead = p.life <= 0 || cellAt(p.x, p.z);
    if (!dead) for (const q of pl) if (Math.hypot(p.x - q.x, p.z - q.z) < p.r + .6) { __emit(q.id, { t: 'dmg', v: Math.round(p.dmg), el: p.el, src: 0 }); dead = true; break; }
    if (dead) G.projs.splice(i, 1);
  }
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const a = G.areas[i]; a.t += dt;
    if (!a.done && a.t >= a.delay) { a.done = true; if (a.owner === 'e' && !a.vis) for (const q of pl) if (inArea(a, q.x, q.z, .3) && bossSees(a.src, q.x, q.z)) __emit(q.id, { t: 'dmg', v: Math.round(a.dmg), el: a.el, src: a.src ? a.src.id : 0, hv: a.hvy || undefined }); }
    if (a.t >= a.delay + .05) G.areas.splice(i, 1);
  }
  G.fx.length = 0; G.texts.length = 0; G.hints.length = 0; G.drops.length = 0;
  const ns = []; for (const e of G.ents) if (!known.has(e.id)) { known.add(e.id); if (!e.boss) { e.maxHp = Math.round(e.maxHp * curK); e.hp = e.maxHp; } ns.push(entInfo(e)); } if (ns.length) __emit(null, { t: 'spawn', ents: ns });
}
function srvSnap() { const o = []; for (const e of G.ents) if (e.alive && e.awake) o.push([e.id, r2(e.x), r2(e.z), r2(e.rot), Math.max(0, Math.round(e.hp)), ST[e.st] | 0]); return o; }
function srvIsRift() { return !!(G.zone && G.zone.def && G.zone.def.rift); }
function srvCleared() { return !!(G.zone && G.zone.cleared); }

// ---- build 0075 (Lee, Nov 15): the world boss ----
// Every kill by every player on the server fills one shared count (kept by server.js). When it is full, the same boss rises on every party's floor.
// It has one life shared by the whole server: each hit takes the same share off it whatever floor or level the hitter is on.
var WBS = null; // set by the host while the boss lives: { f: share of life left (1 to 0), k: life scale for how many players were online }
function wbEnt() { for (const e of G.ents) if (e.wb && e.alive) return e; return null; }
function wbAdd() {
  if (!WBS || !G.zone || rift || wbEnt()) return null;
  const Z = G.zone, lv = Z.def.lvl, hit = refHit(lv + 2), bd = WORLD_BOSS, pls = Object.values(SP).filter(p => p.x > -900 && !p.dead);
  // it waits in open ground a short walk from the floor entrance, never on top of a player: you go to it when you are ready
  let x = Z.start[0], z = Z.start[1], best = -1;
  for (let t = 0; t < 400; t++) { const k = (Math.random() * GW * GW) | 0; if (Z.cell[k]) continue; const d = Z.dist ? Z.dist[k] : 5; if (d < 5) continue; const tx = (k % GW + .5) * CS, tz = ((k / GW | 0) + .5) * CS; if (blocked(tx, tz, 2.3)) continue;
    if (Math.hypot(tx - Z.bossAt[0], tz - Z.bossAt[1]) < 26) continue; let near = 1e9; for (const p of pls) near = Math.min(near, Math.hypot(p.x - tx, p.z - tz)); if (near < 20) continue;
    const sc = 100 - Math.abs(d - 9) * 4 + Math.random() * 3; if (sc > best) { best = sc; x = tx; z = tz; } if (d >= 7 && d <= 12) break; }
  const b = { id: ++G.eid, md: { a: 'boss', n: bd.n, c: bd.c, c2: bd.c2, e: bd.e }, a: { r: 2.3, sc: bd.sc, rec: .9, wind: .8, reach: 4.4, xp: 40, spd: 4 }, arch: 'boss', boss: true, wb: 1, bd, x, z, rot: 0, lvl: lv + 1, elite: 3, pack: -3, r: 2.3, sc: bd.sc,
    maxHp: Math.round(2.8 * hit * 40 * 1.6 * WB_LIFE * WBS.k), dmg: 5 * Math.pow(1.095, lv + 1) * 3 * (WBS.dk || 1), spd: 4, st: 'chase', t: 0, cd: 1, walk: 0, awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, pt: 2.5, pi: 0, name: bd.n, mods: [] };
  b.hp = Math.max(1, Math.round(b.maxHp * WBS.f)); G.ents.push(b); return b;
}
// called by the host every tick while the boss lives: keeps every floor's copy on the shared life, and puts the boss on floors that do not have it yet
function srvWbSync(f, k, dk) { dk = dk > 0 ? dk : 1; if (!WBS) WBS = { f: f, k: k, dk: dk }; WBS.f = f; let e = wbEnt(); if (!e) e = wbAdd();
  if (e) { let ch = 0; /* build 0089: follow the players online while it lives */ if (k > 0 && Math.abs(k - WBS.k) > 1e-6) { e.maxHp = Math.max(1, Math.round(e.maxHp * k / WBS.k)); WBS.k = k; ch = 1; } if (Math.abs(dk - (WBS.dk || 1)) > 1e-6) { e.dmg = e.dmg * dk / (WBS.dk || 1); WBS.dk = dk; ch = 1; }
    e.hp = Math.max(1, Math.round(e.maxHp * f)); if (ch && typeof __emit === 'function') __emit(null, { t: 'wbk', id: e.id, m: e.maxHp, hp: e.hp }); } }
function srvWbEnd() { const e = wbEnt(); WBS = null; if (e) killEnemy(e); }
