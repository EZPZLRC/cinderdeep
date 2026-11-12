'use strict';
// Runs inside one sandbox per party, after data.js and game.js. The server keeps the monsters;
// each player keeps their own hero and reports hits. Host supplies __emit(playerId|null, message).
var SP = {}, known = new Set(), curTarget = null;
var ST = { chase: 0, wind: 1, rec: 2, charge: 3 };
function r2(v) { return Math.round(v * 100) / 100; }
function entInfo(e) { return { id: e.id, md: e.md, arch: e.arch, x: r2(e.x), z: r2(e.z), rot: r2(e.rot), lvl: e.lvl, elite: e.elite, pack: e.pack, r: e.r, sc: e.sc, maxHp: e.maxHp, hp: Math.round(e.hp), dmg: e.dmg, spd: e.spd, name: e.name, mods: e.mods, boss: !!e.boss, awake: !!e.awake, noLoot: !!e.noLoot }; }
let depth = 0;
function srvNewZone(lvl, nPlayers, next) {
  if (next === 'prev') depth = Math.max(0, depth - 1); else if (next) depth++; const zd = zoneFor(depth), def = { type: 'zone', theme: zd.theme, lvl: Math.max(1, lvl | 0), seed: (Math.random() * 1e9) | 0, name: zd.name, depth: depth + 1 };
  G.zone = genZone(def); G.ents.length = 0; G.projs.length = 0; G.areas.length = 0; G.boss = null; spawnAll(G.zone);
  const k = 1 + .5 * Math.max(0, nPlayers - 1); known = new Set();
  for (const e of G.ents) { e.maxHp = Math.round(e.maxHp * k); e.hp = e.maxHp; known.add(e.id); }
  return { t: 'zone', seed: def.seed, lvl: def.lvl, d: depth, ents: G.ents.map(entInfo) };
}
function srvState() { return { t: 'zone', seed: G.zone.def.seed, lvl: G.zone.def.lvl, d: depth, cleared: !!G.zone.cleared, bossAt: G.zone.bossAt, ents: G.ents.filter(e => e.alive).map(entInfo) }; }
dmgPlayer = function (v, el, src) { if (curTarget) __emit(curTarget.id, { t: 'dmg', v: Math.round(v), el: el, src: src ? src.id : 0 }); };
addArea = function (o) { o.t = 0; G.areas.push(o); if (o.owner === 'e') __emit(null, { t: 'area', x: r2(o.x), z: r2(o.z), r: o.r, delay: o.delay, c: o.c }); return o; };
eShoot = function (e, ang, spd, dmgM, el) {
  const p = { x: e.x + Math.sin(ang) * e.r, z: e.z + Math.cos(ang) * e.r, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, life: 3, r: .45, dmg: e.dmg * (dmgM || 1), el: el || 'phys' };
  G.projs.push(p); __emit(null, { t: 'proj', x: r2(p.x), z: r2(p.z), vx: r2(p.vx), vz: r2(p.vz), c: e.md.e });
};
killEnemy = function (e) {
  if (!e.alive) return; e.alive = false; e.deadT = .45; __emit(null, { t: 'die', id: e.id });
  if (e.volatile) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.boss) G.zone.cleared = true;
};
function srvHit(pid, m) {
  const e = G.ents.find(x => x.id === m.id); if (!e || !e.alive) return; const p = SP[pid];
  const v = Math.max(0, Math.min(+m.v || 0, e.maxHp * 3)); e.hp -= v; wake(e);
  if (m.el === 'fire') { e.burn = Math.max(e.burn, v * .15); e.burnT = 3; } else if (m.el === 'cold') e.chill = 2.5; else if (m.el === 'light') e.shock = 3;
  if (m.fz && !e.boss) e.frozen = Math.min(3, +m.fz || 0);
  if (p && !e.boss && e.arch !== 'brute') { const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz) || 1; moveEnt(e, dx / l * .4, dz / l * .4, e.r); }
  if (e.hp <= 0) killEnemy(e);
}
function srvTick(dt) {
  G.time += dt; const all = Object.values(SP), pl = all.filter(p => !p.dead);
  if (all.length && !pl.length) { for (const e of G.ents) if (e.alive && e.awake) { e.awake = false; e.st = 'chase'; if (e.boss) { e.hp = e.maxHp; e.x = G.zone.bossAt[0]; e.z = G.zone.bossAt[1]; } } }
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
    if (!a.done && a.t >= a.delay) { a.done = true; if (a.owner === 'e') for (const q of pl) if (Math.hypot(q.x - a.x, q.z - a.z) <= a.r + .3) __emit(q.id, { t: 'dmg', v: Math.round(a.dmg), el: a.el, src: a.src ? a.src.id : 0 }); }
    if (a.t >= a.delay + .05) G.areas.splice(i, 1);
  }
  G.fx.length = 0; G.texts.length = 0; G.hints.length = 0; G.drops.length = 0;
  const ns = []; for (const e of G.ents) if (!known.has(e.id)) { known.add(e.id); ns.push(entInfo(e)); } if (ns.length) __emit(null, { t: 'spawn', ents: ns });
}
function srvSnap() { const o = []; for (const e of G.ents) if (e.alive && e.awake) o.push([e.id, r2(e.x), r2(e.z), r2(e.rot), Math.max(0, Math.round(e.hp)), ST[e.st] | 0]); return o; }
function srvCleared() { return !!(G.zone && G.zone.cleared); }
