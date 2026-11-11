'use strict';
// ---------- utils ----------
let _s = 1; function srand(s) { _s = (s >>> 0) || 1; }
function sr() { _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rnd = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CS = 3, GW = 60, SAVE_KEY = 'cinderdeep_save_v1';
const G = { set: { vol: 70, gfx: 'auto', shake: true, nums: true, map: true, gps: true }, pp: [], online: false, auto: false, speed: 1, state: 'menu', hero: null, zone: null, time: 0, ents: [], projs: [], areas: [], drops: [], fx: [], texts: [], timers: [], shake: 0, zoom: .72, boss: null, hover: null, hoverObj: null, eid: 0, streak: 0, streakT: 0, bestStreak: 0, labels: [], hints: [], hitSfx: 0 };
const P = { x: 0, z: 0, y: 0, rot: 0, hp: 1, mana: 1, stats: {}, cds: {}, buffs: [], act: null, spin: null, dash: null, move: null, atk: null, inter: null, pick: null, walk: 0, mv: 0, moving: false, iframes: 0, cheatCd: 0, flaskT: 0, dead: false, hurt: 0, oomT: 0, swing: 0 };
const IN = { sx: 0, sy: 0, gx: 0, gz: 0, lmb: false, rmb: false, keys: {}, shift: false, lmbFresh: false, touch: false, tb: [false, false, false, false] };
let itemId = 1;

// ---------- sound ----------
const SFX = (() => {
  let ac = null, mute = false, nb = null, master = .7;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume().catch(() => { }); return ac; }
  function tone(f, d, type, vol, slide, delay) {
    const a = ctx(); if (!a || mute) return; const t = a.currentTime + (delay || 0); const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d); g.gain.setValueAtTime(Math.max(.0002, (vol || .1) * master), t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  function noise(d, vol, freq, delay) {
    const a = ctx(); if (!a || mute) return; if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + (delay || 0); const s = a.createBufferSource(); s.buffer = nb; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200; const g = a.createGain(); g.gain.setValueAtTime(Math.max(.0002, (vol || .1) * master), t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * .5, d + .05);
  }
  function play(n) {
    try {
      switch (n) {
        case 'swing': noise(.12, .07, 2600); break;
        case 'hit': noise(.09, .16, 900); tone(140, .1, 'triangle', .12, .5); break;
        case 'crit': noise(.14, .22, 1800); tone(220, .16, 'square', .07, .4); break;
        case 'hurt': tone(110, .2, 'sawtooth', .12, .5); break;
        case 'kill': tone(90, .22, 'triangle', .14, .4); noise(.16, .1, 500); break;
        case 'slam': noise(.4, .3, 320); tone(60, .4, 'sine', .3, .5); break;
        case 'leap': noise(.25, .08, 3000); break;
        case 'whirl': noise(.3, .08, 2200); break;
        case 'gold': tone(1568, .06, 'square', .035); tone(2093, .08, 'square', .035, 1, .05); break;
        case 'pickup': tone(520, .08, 'triangle', .1, 1.5); break;
        case 'drop1': tone(660, .25, 'sine', .1); break;
        case 'drop2': tone(784, .22, 'triangle', .12); tone(1047, .4, 'triangle', .12, 1, .12); break;
        case 'drop3': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .7, 'triangle', .13, 1, i * .09)); tone(2093, 1.2, 'sine', .06, 1, .45); break;
        case 'level': [392, 523, 659, 784].forEach((f, i) => tone(f, .5, 'square', .06, 1, i * .1)); break;
        case 'flask': tone(300, .3, 'sine', .12, 2); break;
        case 'boss': tone(55, 1.4, 'sawtooth', .16, .7); noise(1.2, .12, 240); break;
        case 'shrine': [440, 554, 659].forEach((f, i) => tone(f, .8, 'sine', .09, 1, i * .05)); break;
        case 'die': tone(200, 1, 'sawtooth', .14, .25); break;
      }
    } catch (e) { }
  }
  return { unlock: ctx, play, toggle() { mute = !mute; return mute; }, vol(v) { master = v; mute = v <= 0; } };
})();

// ---------- items ----------
function affixVal(a, ilvl) { let v = a[1] + Math.random() * (a[2] - a[1]); if (a[3] === 'f') v *= Math.pow(1.085, ilvl); else if (a[3] === 'p') v *= 1 + Math.min(ilvl, 60) * .02; return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10; }
function rollAffix(it) { const have = new Set(it.aff.map(a => a.k)), as = AFF_ALIAS[it.slot] || it.slot; const pool = AFFIX.filter(a => a[4].split(' ').includes(as) && !have.has(a[0])); if (!pool.length) return false; const a = pick(pool); it.aff.push({ k: a[0], v: affixVal(a, it.ilvl) }); return true; }
function makeItem(ilvl, slot, rar, baseName) {
  slot = slot || pick(DROP_SLOTS);
  const it = { id: itemId++, slot, rar, ilvl, aff: [] };
  if (slot === 'weapon') { const b = (baseName && WEAPONS.find(w => w.n === baseName)) || pick(G.hero ? WEAPONS.filter(w => CLASSES[G.hero.cls].wts.includes(w.t)) : WEAPONS); const k = Math.pow(1.11, ilvl) * (1 + rar * .1); it.base = b.n; it.dmg = [Math.max(1, Math.round(b.d[0] * k)), Math.max(2, Math.round(b.d[1] * k))]; it.spd = b.s; it.wt = b.t; }
  else if (slot === 'offhand') { const oc = G.hero ? G.hero.cls : 'warden', b = OFFHAND[oc]; it.base = b.n; it.oc = oc; if (b.a) it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
  else if (ARMOR[slot]) { const b = pick(ARMOR[slot]); it.base = b.n; it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
  else it.base = pick(JEWEL[slot]);
  const n = rar === 0 ? 0 : rar === 1 ? rint(1, 2) : rar === 2 ? rint(3, 5) : rint(4, 5);
  for (let i = 0; i < n; i++) rollAffix(it);
  if (rar === 3) { { const al = AFF_ALIAS[slot] || slot, ps = Object.keys(POWERS).filter(p => POWERS[p].slots.includes(slot) || POWERS[p].slots.includes(al)); it.power = pick(ps.length ? ps : Object.keys(POWERS)); } it.name = POWERS[it.power].n; }
  else if (rar === 2) it.name = pick(RN1) + ' ' + pick(RN2); else if (rar === 1) it.name = pick(MAGPRE) + ' ' + it.base; else it.name = it.base;
  return it;
}
function itemValue(it) { return Math.round((5 + it.ilvl * 3) * [1, 2.5, 6, 25][it.rar]); }
function luck() { return (P.stats.mf || 0) + Math.min(G.streak, 50) * 2; }
function rollRarity(bonus) {
  const mf = luck() / 100; const w = [62, 30 * (1 + mf), 7.5 * (1 + mf * 1.2) * (1 + bonus), .5 * (1 + mf * 1.5) * (1 + bonus * 2)];
  let r = Math.random() * (w[0] + w[1] + w[2] + w[3]); for (let i = 0; i < 4; i++) { if (r < w[i]) return i; r -= w[i]; } return 0;
}
function dropItem(x, z, it) { const a = rnd(6.28), d = rnd(.6, 1.8); let dx = x + Math.cos(a) * d, dz = z + Math.sin(a) * d; if (blocked(dx, dz, .3)) { dx = x; dz = z; } G.drops.push({ x: dx, z: dz, item: it, t: 0 }); if (it.rar > 0) SFX.play('drop' + it.rar); }
function dropGold(x, z, amt) { const a = rnd(6.28), d = rnd(.4, 1.5); let dx = x + Math.cos(a) * d, dz = z + Math.sin(a) * d; if (blocked(dx, dz, .3)) { dx = x; dz = z; } G.drops.push({ x: dx, z: dz, gold: Math.max(1, Math.round(amt * (1 + (P.stats.gf || 0) / 100))), t: 0 }); }
function dropLoot(e) {
  const lv = Math.max(e.lvl, G.hero.level), x = e.x, z = e.z; let n = 0, bonus = 0, minR = 0;
  if (e.boss) { n = 5; bonus = 3; minR = 2; } else if (e.elite === 2) { n = 2; bonus = 1.5; } else if (e.elite === 1) { n = 1 + (Math.random() < .5 ? 1 : 0); bonus = .8; } else if (Math.random() < .12) n = 1;
  for (let i = 0; i < n; i++) { let r = rollRarity(bonus); if (i === 0 && r < minR) r = minR; dropItem(x, z, makeItem(lv, null, r)); }
  if (e.boss || e.elite || Math.random() < .4) dropGold(x, z, (4 + lv * 2.2) * rnd(.6, 1.4) * (e.boss ? 12 : e.elite ? 4 : 1));
}
// Bag: a 10 x 6 grid. Belts, rings and amulets take one cell; everything else is two cells tall.
function itemH(it) { return it.slot === 'belt' || it.slot === 'ring' || it.slot === 'amulet' ? 1 : 2; }
function bagOcc(inv, skip, skip2) { const o = new Array(inv.length).fill(null); inv.forEach((it, i) => { if (!it || it === skip || it === skip2) return; o[i] = it; if (itemH(it) === 2 && i + BAG_W < inv.length) o[i + BAG_W] = it; }); return o; }
function bagFits(i, it, occ) { if (i < 0 || i >= occ.length || occ[i]) return false; return itemH(it) === 1 || (i + BAG_W < occ.length && !occ[i + BAG_W]); }
function bagPut(inv, it, at) { const occ = bagOcc(inv); if (at !== undefined && bagFits(at, it, occ)) { inv[at] = it; return true; } for (let i = 0; i < inv.length; i++) if (bagFits(i, it, occ)) { inv[i] = it; return true; } return false; }
function sortBag(inv) { const o = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'pants', 'boots', 'belt', 'amulet', 'ring'], items = inv.filter(x => x).sort((a, b) => itemH(b) - itemH(a) || o.indexOf(a.slot) - o.indexOf(b.slot) || b.rar - a.rar || b.ilvl - a.ilvl || (a.name < b.name ? -1 : 1)); inv.fill(null); for (const it of items) bagPut(inv, it); SFX.play('pickup'); saveGame(); }
function bagFree() { return bagOcc(G.hero.inv).filter(x => !x).length; }
function addItem(it, at) { return bagPut(G.hero.inv, it, at); }
function canUse(it) { const h = G.hero; if (it.dmg && !CLASSES[h.cls].wts.includes(it.wt)) return false; if (it.slot === 'offhand' && it.oc && it.oc !== h.cls) return false; return true; }
function moveItem(from, to) {
  const inv = G.hero.inv, it = inv[from]; if (!it || from === to) return false; let occ = bagOcc(inv, it);
  if (bagFits(to, it, occ)) { inv[from] = null; inv[to] = it; return true; }
  const other = occ[to] || (itemH(it) === 2 && to + BAG_W < inv.length ? occ[to + BAG_W] : null); if (!other) return false; const oi = inv.indexOf(other); occ = bagOcc(inv, it, other);
  if (!bagFits(to, it, occ)) return false; inv[from] = null; inv[oi] = null; inv[to] = it; if (bagPut(inv, other, from)) return true; inv[to] = null; inv[from] = it; inv[oi] = other; return false;
}
function equipFromInv(i, want) {
  const h = G.hero, it = h.inv[i]; if (!it) return false; let sl = it.slot;
  if (!canUse(it)) { hint('A ' + CLASSES[h.cls].n + ' cannot use that.'); return false; }
  if (sl === 'ring') sl = want === 'ring1' || want === 'ring2' ? want : !h.eq.ring1 ? 'ring1' : !h.eq.ring2 ? 'ring2' : 'ring1'; else if (want && want !== sl) return false;
  const old = h.eq[sl] || null; h.inv[i] = null; if (old && !bagPut(h.inv, old, i)) { h.inv[i] = it; hint('No room in the bag to swap that.'); return false; }
  h.eq[sl] = it; computeStats(); SFX.play('pickup'); saveGame(); return true;
}
function unequip(sl, at) { const h = G.hero, it = h.eq[sl]; if (!it) return; if (sl === 'weapon') { hint('You need a weapon in hand.'); return; } if (!addItem(it, at)) { hint('Inventory is full.'); return; } delete h.eq[sl]; computeStats(); saveGame(); }
function itemShards(it) { return [1, 2, 6, 25][it.rar]; }
function scrapItem(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.shards = (h.shards || 0) + itemShards(it); h.inv[i] = null; SFX.play('gold'); saveGame(); }
function scrapAll(maxRar) { const h = G.hero; let g = 0; h.inv.forEach((it, i) => { if (it && it.rar <= maxRar) { g += itemShards(it); h.inv[i] = null; } }); if (g) { h.shards = (h.shards || 0) + g; SFX.play('gold'); hint('Scrapped for ' + g + ' shards.'); saveGame(); } }
function dropFromInv(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.inv[i] = null; G.drops.push({ x: P.x + Math.sin(P.rot) * 1.6, z: P.z + Math.cos(P.rot) * 1.6, item: it, t: 0 }); SFX.play('pickup'); saveGame(); }

// ---------- hero ----------
function newHero(cls) {
  cls = CLASSES[cls] ? cls : 'warden'; const c = CLASSES[cls], sk = c.skills;
  const h = { v: 1, name: c.n, cls, level: 1, xp: 0, gold: 0, inv: new Array(BAG_N).fill(null), bagV: 2, eq: {}, bar: [sk[0], sk.find(id => !SKILLS[id].basic && SKILLS[id].lv === 1) || null, null, null], filter: 0, kills: 0, runs: 0, best: 0 };
  h.eq.weapon = makeItem(1, 'weapon', 0, c.w); return h;
}
function calcStats(eq) {
  const h = G.hero, c = CLASSES[h.cls], s = {}; for (const k in STATS) s[k] = 0;
  let wmin = 3, wmax = 5, wspd = 1.2, arm = 0;
  for (const sl of SLOTS) {
    const it = eq[sl]; if (!it) continue; if (it.dmg) { wmin = it.dmg[0]; wmax = it.dmg[1]; wspd = it.spd; } if (it.armor) arm += it.armor;
    for (const a of it.aff) s[a.k] = (s[a.k] || 0) + a.v; if (it.power) { const p = POWERS[it.power].s; for (const k in p) s[k] = (s[k] || 0) + p[k]; }
  }
  for (const b of P.buffs) for (const k in b.s) s[k] = (s[k] || 0) + b.s[k];
  s.wmin = wmin; s.wmax = wmax; s.wspd = wspd;
  s.maxLife = Math.round((c.life + h.level * c.lifeLv + s.life) * (1 + s.lifePct / 100)); s.maxMana = c.res.max;
  s.armorT = Math.round((arm + s.armor + c.armor * h.level) * (1 + s.armorPct / 100));
  s.rfire = Math.min(75, s.resFire + s.resAll); s.rcold = Math.min(75, s.resCold + s.resAll); s.rlight = Math.min(75, s.resLight + s.resAll);
  s.dodgeT = Math.min(60, s.dodge); s.critT = Math.min(80, 5 + s.crit); s.critM = 1.5 + s.critDmg / 100; s.msT = c.ms * (1 + Math.min(s.ms, 80) / 100); s.cdrT = Math.min(50, s.cdr);
  s.lifeRegenT = c.regen + s.lifeRegen + s.maxLife * .004; s.manaRegenT = 0;
  const el = (SKILLS[h.bar && h.bar[0]] || {}).el || 'phys', inc = 1 + (s.dmg + (s[el] || 0) + (el !== 'phys' ? s.ele : 0)) / 100, avg = (wmin + wmax) / 2 + s.addPhys + s.addFire + s.addCold + s.addLight, aps = wspd * (1 + s.aspd / 100);
  s.dps = Math.round(avg * inc * aps * (1 + s.critT / 100 * (s.critM - 1)));
  const hitv = 5 * Math.pow(1.095, h.level), mp = Math.min(.8, s.armorT / (s.armorT + 60 + hitv * 6)), mr = (s.rfire + s.rcold + s.rlight) / 300, taken = (1 - (.6 * mp + .4 * mr)) * (1 - Math.min(50, s.dr) / 100) * (1 - s.dodgeT / 100);
  s.tough = Math.round(s.maxLife / Math.max(.05, taken)); s.recov = Math.round((s.lifeRegenT + s.lifeOnHit * aps) * 10) / 10;
  return s;
}
function computeStats() { const s = calcStats(G.hero.eq); P.gear = gearDecode(P.gc = gearCode(G.hero.eq)); P.stats = s; P.hp = Math.min(P.hp, s.maxLife); P.mana = Math.min(P.mana, s.maxMana); return s; }
function gainXp(v) {
  const h = G.hero; if (h.level >= MAX_LEVEL) return; h.xp += Math.round(v * (1 + (P.stats.xp || 0) / 100));
  while (h.level < MAX_LEVEL && h.xp >= xpNeed(h.level)) {
    h.xp -= xpNeed(h.level); h.level++; computeStats(); P.hp = P.stats.maxLife; P.mana = P.stats.maxMana; SFX.play('level'); ring(P.x, P.z, 0, 9, .7, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7);
    floatText(P.x, 3, P.z, 'LEVEL ' + h.level, '#ffd84a', 1.8, 22); for (const id of CLASSES[h.cls].skills) if (SKILLS[id].lv === h.level) { const sk = SKILLS[id]; let i = sk.basic ? -1 : h.bar.indexOf(null); if (i > 0) { h.bar[i] = id; hint('New skill: ' + sk.n + ' — placed on ' + SLOT_KEY[i] + '.'); } else hint('New skill: ' + sk.n + ' — open Skills to slot it.'); if (typeof UI !== 'undefined') UI.buildBar(); }
  }
}
function saveGame() { try { localStorage.setItem(SAVE_KEY + '_' + G.hero.cls, JSON.stringify(G.hero)); if (G.stash) localStorage.setItem(SAVE_KEY + '_stash', JSON.stringify(G.stash)); } catch (e) { } }
function loadStash() { let st = null; try { st = JSON.parse(localStorage.getItem(SAVE_KEY + '_stash')); } catch (e) { } if (!Array.isArray(st) || st.length !== 100) st = new Array(100).fill(null); for (const it of st) if (it && it.id >= itemId) itemId = it.id + 1; G.stash = st; }
function loadGame(cls) {
  try {
    let raw = localStorage.getItem(SAVE_KEY + '_' + cls); if (!raw && cls === 'warden') raw = localStorage.getItem(SAVE_KEY); const h = JSON.parse(raw);
    if (h && h.v === 1 && h.inv && h.eq && h.eq.weapon && CLASSES[h.cls] && h.cls === cls) {
      let m = 0; for (const it of h.inv) if (it) m = Math.max(m, it.id); for (const k in h.eq) m = Math.max(m, h.eq[k].id); itemId = Math.max(itemId, m + 1);
      if (h.bagV !== 2 || h.inv.length !== BAG_N) { const old = h.inv.filter(x => x).sort((a, b) => b.rar - a.rar); h.inv = new Array(BAG_N).fill(null); for (const it of old) if (!bagPut(h.inv, it)) h.gold += itemValue(it); h.bagV = 2; }
      const sk = CLASSES[cls].skills; if (!h.bar || h.bar.some(id => id && !sk.includes(id))) { h.bar = [sk[0], null, null, null]; for (const id of sk) if (!SKILLS[id].basic && SKILLS[id].lv <= h.level) { const i = h.bar.indexOf(null); if (i > 0) h.bar[i] = id; } }
      return h;
    }
  } catch (e) { } return null;
}
function hint(t) { G.hints.push({ t, life: 4 }); if (G.hints.length > 5) G.hints.shift(); }

// ---------- zone ----------
function cellAt(x, z) { const cx = Math.floor(x / CS), cz = Math.floor(z / CS); if (cx < 0 || cz < 0 || cx >= GW || cz >= GW) return 1; return G.zone.cell[cz * GW + cx]; }
function blocked(x, z, r) { return cellAt(x - r, z - r) || cellAt(x + r, z - r) || cellAt(x - r, z + r) || cellAt(x + r, z + r); }
function moveEnt(o, dx, dz, r) { let m = false; if (!blocked(o.x + dx, o.z, r)) { o.x += dx; m = true; } if (!blocked(o.x, o.z + dz, r)) { o.z += dz; m = true; } return m; }
function carveCave(c) {
  const edge = (x, y) => x < 2 || y < 2 || x >= GW - 2 || y >= GW - 2;
  for (let i = 0; i < GW * GW; i++) c[i] = edge(i % GW, i / GW | 0) ? 1 : (sr() < .43 ? 1 : 0);
  for (let it = 0; it < 4; it++) {
    const n = new Uint8Array(GW * GW);
    for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) { if (edge(x, y)) { n[y * GW + x] = 1; continue; } let w = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) w += c[(y + j) * GW + x + i]; n[y * GW + x] = (w >= 5 || (c[y * GW + x] && w >= 4)) ? 1 : 0; }
    c.set(n);
  }
  const reg = new Int32Array(GW * GW).fill(-1); let best = -1, bestN = 0, rid = 0;
  for (let i = 0; i < GW * GW; i++) {
    if (c[i] || reg[i] >= 0) continue; let n = 0; const st = [i]; reg[i] = rid;
    while (st.length) { const k = st.pop(); n++; const x = k % GW; for (const d of [-1, 1, -GW, GW]) { const q = k + d; if (q < 0 || q >= GW * GW) continue; if ((d === -1 && x === 0) || (d === 1 && x === GW - 1)) continue; if (!c[q] && reg[q] < 0) { reg[q] = rid; st.push(q); } } }
    if (n > bestN) { bestN = n; best = rid; } rid++;
  }
  for (let i = 0; i < GW * GW; i++) if (!c[i] && reg[i] !== best) c[i] = 1;
  return bestN;
}
function bfs(c, from) { const d = new Int16Array(GW * GW).fill(-1); const q = [from]; d[from] = 0; for (let h = 0; h < q.length; h++) { const k = q[h], x = k % GW; for (const s of [-1, 1, -GW, GW]) { const n = k + s; if (n < 0 || n >= GW * GW) continue; if ((s === -1 && x === 0) || (s === 1 && x === GW - 1)) continue; if (!c[n] && d[n] < 0) { d[n] = d[k] + 1; q.push(n); } } } return d; }
function disc(c, cx, cy, r) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (x >= 2 && y >= 2 && x < GW - 2 && y < GW - 2 && Math.hypot(x - cx, y - cy) <= r) c[y * GW + x] = 0; }
function genZone(def) {
  const th = THEMES[def.theme]; const Z = { def, th, cell: new Uint8Array(GW * GW), seen: new Uint8Array(GW * GW), lamps: [], objs: [], start: [0, 0], bossAt: [0, 0], cleared: false };
  const c = Z.cell;
  for (let t = 0; t < 30; t++) { srand(def.seed + t * 7919); if (carveCave(c) >= 900) break; }
  const corner = [sr() < .5 ? 6 : GW - 7, sr() < .5 ? 6 : GW - 7]; let s = -1, sd = 1e9;
  for (let i = 0; i < GW * GW; i++) if (!c[i]) { const d = Math.hypot(i % GW - corner[0], (i / GW | 0) - corner[1]); if (d < sd) { sd = d; s = i; } }
  let dist = bfs(c, s), b = s; for (let i = 0; i < GW * GW; i++) if (dist[i] > dist[b]) b = i;
  const bx = clamp(b % GW, 8, GW - 9), by = clamp(b / GW | 0, 8, GW - 9); disc(c, bx, by, 5); disc(c, b % GW, b / GW | 0, 2); disc(c, s % GW, s / GW | 0, 2.2);
  dist = bfs(c, s); Z.dist = dist; Z.start = [(s % GW + .5) * CS, ((s / GW | 0) + .5) * CS]; Z.bossAt = [(bx + .5) * CS, (by + .5) * CS];
  const cand = []; for (let i = 0; i < GW * GW; i++) if (!c[i] && dist[i] > 8 && Math.hypot(i % GW - bx, (i / GW | 0) - by) > 8) cand.push(i);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(sr() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  const packs = [], N = 24; for (const k of cand) { if (packs.length >= N) break; if (packs.every(q => Math.hypot(q % GW - k % GW, (q / GW | 0) - (k / GW | 0)) >= 5)) packs.push(k); }
  Z.packs = packs; const W = i => [(i % GW + .5) * CS, ((i / GW | 0) + .5) * CS];
  const rest = cand.filter(k => !packs.includes(k));
  for (let i = 0; i < 4 && i < rest.length; i++) { const p = W(rest[i]); Z.objs.push({ kind: 'chest', x: p[0], z: p[1], name: 'Chest', used: false }); }
  for (let i = 4; i < 6 && i < rest.length; i++) { const p = W(rest[i]); const sh = SHRINES[Math.floor(sr() * SHRINES.length)]; Z.objs.push({ kind: 'shrine', x: p[0], z: p[1], name: sh.n, sh, used: false }); }
  for (let i = 6; i < 22 && i < rest.length; i++) { const p = W(rest[i]); Z.lamps.push({ x: p[0] + (sr() - .5), z: p[1] + (sr() - .5) }); }
  Z.lamps.push({ x: Z.start[0] + 2.5, z: Z.start[1] - 2, big: 1 });
  return Z;
}
const LOWQ = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
function shade(c, f, g, b) { return [c[0] * f, c[1] * (g || f), c[2] * (b || f)]; }
function buildStatic(Z) {
  GLX.statBegin(); const th = Z.th, S = GW * CS, c = Z.cell, col = GLX.col;
  GLX.obj('stat', 'box', S / 2, -.5, S / 2, 0, S + 120, 1, S + 120, col(th.ground), 0, 1, th.gdet);
  srand(Z.def.seed ^ 0x5bd1e995);
  const bark = col(th.wc[0]), leaf = [col(th.wc[1]), col(th.wc[2]), col(0x3a4a22)], stone = col(0x6c6a64), grassC = [col(0x4e6a2c), col(0x5a7230), col(0x66722e), col(0x3e5a28)];
  const pine = (x, z) => {
    const h = 6.5 + sr() * 5, k = .8 + sr() * .5, lc = shade(leaf[sr() * 3 | 0], .75 + sr() * .5), ry = sr() * 6.28;
    GLX.obj('stat', 'trunk', x, h * .24, z, ry, .6 * k, h * .5, .6 * k, shade(bark, .8 + sr() * .4), 0, 1, 3);
    for (let i = 0; i < 5; i++) { const w = (3.9 - i * .68) * k; GLX.obj('stat', 'fol', x + (sr() - .5) * .25, h * (.36 + i * .145), z + (sr() - .5) * .25, ry + i * 1.3, w, h * .3, w, shade(lc, .85 + i * .07), 0, 1, 2); }
  };
  const broad = (x, z) => {
    const h = 4.5 + sr() * 3, lc = shade(leaf[sr() * 3 | 0], .8 + sr() * .5), ry = sr() * 6.28;
    GLX.obj('stat', 'trunk', x, h * .5, z, ry, .8, h, .8, shade(bark, .8 + sr() * .4), 0, 1, 3);
    const n = 4 + (sr() * 3 | 0); for (let i = 0; i < n; i++) { const a = sr() * 6.28, d = i ? 1 + sr() * 1.3 : 0, r = 2.4 + sr() * 1.4; GLX.obj('stat', 'blob', x + Math.cos(a) * d, h + .6 + sr() * 1.6, z + Math.sin(a) * d, sr() * 6, r, r * (.7 + sr() * .25), r, shade(lc, .8 + sr() * .35), 0, 1, 2); }
  };
  const rock = (x, z, r) => GLX.obj('stat', 'blob', x, r * .22, z, sr() * 6.28, r * (.8 + sr() * .6), r * (.5 + sr() * .4), r * (.8 + sr() * .5), shade(stone, .7 + sr() * .5), 0, 1, 3);
  const grass = (x, z, n, sp) => { for (let k = 0; k < n; k++) { const h = .16 + sr() * .34; GLX.obj('stat', 'blade', x + (sr() - .5) * sp, h * .5, z + (sr() - .5) * sp, sr() * 6.28, .09, h, .04, shade(grassC[sr() * 4 | 0], .7 + sr() * .6), 0, 1, 2); } };
  const gN = LOWQ ? 9 : 24;
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) {
    const wx = (x + .5) * CS, wz = (y + .5) * CS; GLX.statChunk((x / 6 | 0) + '_' + (y / 6 | 0), ((x / 6 | 0) * 6 + 3) * CS, ((y / 6 | 0) * 6 + 3) * CS);
    if (c[y * GW + x]) {
      let near = 9; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < GW && yy < GW && !c[yy * GW + xx]) near = Math.min(near, Math.max(Math.abs(i), Math.abs(j))); }
      if (near > 2) continue;
      if (th.wall === 'tree') {
        const jx = wx + (sr() - .5) * 1.6, jz = wz + (sr() - .5) * 1.6; if (sr() < .62) pine(jx, jz); else broad(jx, jz);
        if (near === 1 && sr() < .45) pine(wx + (sr() - .5) * 2.6, wz + (sr() - .5) * 2.6);
        if (sr() < .55) { const r = 1 + sr() * .8; GLX.obj('stat', 'blob', wx + (sr() - .5) * 2.4, r * .35, wz + (sr() - .5) * 2.4, sr() * 6, r * 1.3, r, r * 1.2, shade(leaf[sr() * 3 | 0], .7 + sr() * .4), 0, 1, 2); }
        if (sr() < .3) rock(wx + (sr() - .5) * 2.4, wz + (sr() - .5) * 2.4, 1 + sr() * 1.4);
        if (near === 1) grass(wx, wz, gN >> 1, CS);
      } else { const h = 2.6 + sr() * 2; GLX.obj('stat', 'box', wx, h / 2, wz, 0, CS, h, CS, col(th.wc[x * 7 + y * 3 & 1]), 0, 1, 3); }
    } else {
      grass(wx, wz, gN, CS); const r = sr();
      if (r < .07) { grass(wx + (sr() - .5), wz + (sr() - .5), gN, 1.1); }
      else if (r < .13) rock(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2, .3 + sr() * .45);
      else if (r < .155) { GLX.obj('stat', 'cyl', wx, .07, wz, sr() * 6, .1, .1, .9, col(0xc9c2aa), 0, 1, 0); GLX.obj('stat', 'sphere', wx + .4, .13, wz + .3, 0, .3, .24, .26, col(0xc9c2aa), 0, 1, 0); }
      else if (r < .175) GLX.obj('stat', 'taper', wx, .3, wz, sr() * 6, .95, .6, .95, shade(bark, .9), 0, 1, 3);
      else if (r < .2) { const fc = col([0xd8c84a, 0xc86a8a, 0xe8e0d0][sr() * 3 | 0]); for (let k = 0; k < 4; k++) { const fx = wx + (sr() - .5) * 1.6, fz = wz + (sr() - .5) * 1.6; GLX.obj('stat', 'blade', fx, .22, fz, 0, .04, .44, .04, grassC[0], 0, 1, 2); GLX.obj('stat', 'sphere', fx, .46, fz, 0, .14, .1, .14, fc, .15, 1, 0); } }
    }
  }
  for (const L of Z.lamps) {
    const lx = Math.floor(L.x / CS / 6), lz = Math.floor(L.z / CS / 6); GLX.statChunk(lx + '_' + lz, (lx * 6 + 3) * CS, (lz * 6 + 3) * CS);
    if (L.big) { GLX.obj('stat', 'taper', L.x, .5, L.z, 0, 1, 1, 1, col(0x4a4a4e), 0, 1, 3); GLX.obj('stat', 'cyl', L.x, 1.02, L.z, 0, .8, .1, .8, col(0x2a2a2e), 0, 1, 4); GLX.obj('stat', 'cone', L.x, 1.4, L.z, 0, .5, .8, .5, col(0xff9a3a), 2.4); }
    else { for (let k = 0; k < 3; k++) { const mx = L.x + (sr() - .5) * .7, mz = L.z + (sr() - .5) * .7, mh = .2 + sr() * .3; GLX.obj('stat', 'cyl', mx, mh / 2, mz, 0, .08, mh, .08, col(0xd8d0c0)); GLX.obj('stat', 'sphere', mx, mh + .04, mz, 0, .3 + sr() * .2, .16, .3 + sr() * .2, col(th.lamp), 1.5); } }
  }
  if (Z.def.type === 'town') {
    GLX.statChunk('all', 0, 0, true); const wood = col(0x5a4028), cloth = col(0x7a2a22), canvas2 = col(0xb8a888), stn = col(0x6a6a6e);
    for (const o of Z.objs) {
      if (o.kind === 'vendor') { for (const sx of [-1.6, 1.6]) for (const sz of [-1.2, 1.2]) GLX.obj('stat', 'cyl', o.x + sx, 1.4, o.z + sz - 1.6, 0, .16, 2.8, .16, wood, 0, 1, 3); GLX.obj('stat', 'box', o.x, 2.9, o.z - 1.6, 0, 4, .12, 3.2, cloth); GLX.obj('stat', 'box', o.x, .5, o.z - .2, 0, 3.4, 1, .9, wood, 0, 1, 3); GLX.obj('stat', 'box', o.x - 1, 1.15, o.z - .2, .3, .5, .3, .5, canvas2); GLX.obj('stat', 'sphere', o.x + .9, 1.2, o.z - .2, 0, .4, .4, .4, col(0xc9a030), 0, 1, 4); GLX.obj('stat', 'box', o.x - 2.6, .5, o.z - 2, .4, 1, 1, 1, wood, 0, 1, 3); }
      else if (o.kind === 'stash') { GLX.obj('stat', 'box', o.x, .7, o.z, 0, 2.6, 1.4, 1.5, wood, 0, 1, 3); GLX.obj('stat', 'cyl', o.x, 1.4, o.z, 0, 2.6, .5, 1.5, wood, 0, 1, 3); for (const sx of [-1, 0, 1]) GLX.obj('stat', 'box', o.x + sx * 1.1, .9, o.z, 0, .18, 1.9, 1.56, col(0x8a6a2a), 0, 1, 4); GLX.obj('stat', 'box', o.x, .9, o.z + .78, 0, .4, .5, .08, col(0xc9a030), .1, 1, 4); }
      else if (o.kind === 'altar') { GLX.obj('stat', 'cyl', o.x, .15, o.z, 0, 3.4, .3, 3.4, stn, 0, 1, 3); GLX.obj('stat', 'taper', o.x, .9, o.z, 0, 1.6, 1.2, 1.6, stn, 0, 1, 3); GLX.obj('stat', 'cyl', o.x, 1.56, o.z, 0, 1.9, .14, 1.9, col(0x4a4a50), 0, 1, 4); for (let k = 0; k < 4; k++) { const a = k * 1.57 + .78; GLX.obj('stat', 'taper', o.x + Math.cos(a) * 2.2, 1.2, o.z + Math.sin(a) * 2.2, 0, .4, 2.4, .4, stn, 0, 1, 3); } }
    }
    for (let k = 0; k < 3; k++) { const a = 2.2 + k * 1.1, tx = Z.bossAt[0] + Math.cos(a) * 15, tz = Z.bossAt[1] + Math.sin(a) * 15; GLX.obj('stat', 'cone', tx, 1.5, tz, k, 4, 3, 4, canvas2); GLX.obj('stat', 'cyl', tx, 1.6, tz, 0, .12, 3.4, .12, wood, 0, 1, 3); }
  }
  GLX.statEnd();
}
// Reference basic-attack hit: expected for the level, kept close to the hero's real hit so normal enemies always die in 2-5 swings.
function refHit(lvl) { const s = P.stats, exp = 7.5 * Math.pow(1.11, lvl) * (1 + .04 * lvl); if (!s || !s.wmin) return exp; const act = ((s.wmin + s.wmax) / 2 + s.addPhys + s.addFire + s.addCold + s.addLight) * (1 + (s.dmg + s.phys) / 100); return clamp(exp, act * .7, act * 1.25); }
function mkEnemy(md, x, z, lvl, elite, pack) {
  const a = ARCH[md.a], hit = refHit(lvl);
  const e = { id: ++G.eid, md, a, arch: md.a, x, z, rot: rnd(6.28), lvl, elite, pack, r: a.r * (elite ? 1.2 : 1), sc: a.sc * (elite === 1 ? 1.2 : elite === 2 ? 1.38 : 1), maxHp: Math.round(2.8 * hit * a.hp * (elite === 1 ? 2.2 : elite === 2 ? 3.5 : 1)), dmg: 5 * Math.pow(1.095, lvl) * a.dmg * (elite ? 1.3 : 1), spd: a.spd, st: 'chase', t: 0, cd: rnd(.2, 1), walk: rnd(6), awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, modT: 2, name: md.n, mods: [] };
  if (elite) { const keys = Object.keys(EMODS); while (e.mods.length < elite) { const k = pick(keys); if (!e.mods.includes(k)) e.mods.push(k); } for (const k of e.mods) e[k] = true; if (e.hasted) e.spd *= 1.3; e.name = e.mods.map(k => EMODS[k].n).join(' ') + ' ' + md.n; }
  e.hp = e.maxHp; G.ents.push(e); return e;
}
function spawnAll(Z) {
  const th = Z.th, lv = Z.def.lvl; const wsum = th.mon.reduce((s, m) => s + ARCH[m.a].w, 0); const pm = () => { let r = Math.random() * wsum; for (const m of th.mon) { r -= ARCH[m.a].w; if (r < 0) return m; } return th.mon[0]; };
  Z.packs.forEach((k, pi) => {
    const cx = (k % GW + .5) * CS, cz = ((k / GW | 0) + .5) * CS, eliteRoll = Math.random(), elite = eliteRoll < .07 ? 2 : eliteRoll < .22 ? 1 : 0; const main = pm(); let n = main.a === 'brute' ? rint(1, 2) : main.a === 'swarm' ? rint(6, 9) : rint(4, 7);
    const place = (md, el) => { for (let t = 0; t < 8; t++) { const x = cx + rnd(-3.5, 3.5), z = cz + rnd(-3.5, 3.5); if (!blocked(x, z, .7)) return mkEnemy(md, x, z, lv, el, pi); } return null; };
    if (elite) { place(main.a === 'swarm' || main.a === 'bomber' ? th.mon[0] : main, elite); n = Math.max(3, n - 2); }
    for (let i = 0; i < n; i++) place(Math.random() < .75 ? main : pm(), 0);
  });
  const bd = BOSSES[Z.def.theme], hit = refHit(lv + 1);
  const b = { id: ++G.eid, md: { a: 'boss', n: bd.n, c: bd.c, c2: bd.c2, e: bd.e }, a: { r: 1.7, sc: 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 }, arch: 'boss', boss: true, bd, x: Z.bossAt[0], z: Z.bossAt[1], rot: 0, lvl: lv + 1, elite: 3, pack: -1, r: 1.7, sc: 2.3, maxHp: Math.round(2.8 * hit * 40), dmg: 5 * Math.pow(1.095, lv + 1) * 1.6, spd: 4, st: 'chase', t: 0, cd: 1, walk: 0, awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, pt: 2.5, pi: 0, name: bd.n, mods: [] };
  b.hp = b.maxHp; G.ents.push(b); G.boss = b;
}
function addReplica(i) {
  if (G.ents.some(e => e.id === i.id)) return; const e = Object.assign({}, i, { a: i.boss ? { r: 1.7, sc: 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 } : ARCH[i.arch], tx: i.x, tz: i.z, trot: i.rot || 0, rot: i.rot || 0, st: 'chase', t: 0, cd: 1, modT: 2, walk: Math.random() * 6, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0 });
  if (!e.a || !e.md) return; for (const k of e.mods || []) e[k] = true; if (e.boss) { e.bd = BOSSES[G.zone.def.theme]; G.boss = e; } G.ents.push(e);
}
function repEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.burnT > 0) e.burnT -= dt; if (e.shock > 0) e.shock -= dt; const ox = e.x, oz = e.z, k = Math.min(1, dt * 12); e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k;
  let da = e.trot - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * k; e.walk += Math.hypot(e.x - ox, e.z - oz) * 1.6;
}
function enterZone(net) {
  G.inTown = false; G.away = null;
  const h = G.hero, lvl = net ? net.lvl : h.level; const def = { type: 'zone', theme: 'forest', lvl, seed: net ? net.seed : (Math.random() * 1e9) | 0, name: ZONES[0].name };
  G.zone = genZone(def); const Z = G.zone; G.ents.length = 0; G.projs.length = 0; G.pp.length = 0; G.areas.length = 0; G.drops.length = 0; G.fx.length = 0; G.texts.length = 0; G.timers.length = 0; G.boss = null; G.streak = 0;
  P.buffs = []; computeStats(); buildStatic(Z); if (net) { for (const i of net.ents) addReplica(i); } else spawnAll(Z); BOT.path = null;
  P.x = Z.start[0]; P.z = Z.start[1]; P.y = 0; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; P.dead = false; P.lastHit = -9; P.flaskCd = 0; P.buffs = []; P.cds = {}; computeStats(); P.hp = P.stats.maxLife; P.mana = CLASSES[h.cls].res.regen ? P.stats.maxMana : 0; P.flaskCd = 0; P.lastHit = -9;
  setEnv(Z); if (net && net.sync && net.pos) { P.x = net.pos[0]; P.z = net.pos[1]; }
  G.state = 'play'; if (typeof UI !== 'undefined') UI.zoneBanner(def.name, 'Monster level ' + lvl); saveGame();
}

// ---------- town ----------
function genTown() {
  const th = THEMES.town, c0 = GW / 2, Z = { def: { type: 'town', theme: 'town', lvl: G.hero.level, seed: 4242, name: 'Emberwatch Camp' }, th, cell: new Uint8Array(GW * GW).fill(1), seen: new Uint8Array(GW * GW).fill(1), lamps: [], objs: [], packs: [], cleared: true };
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x + .5 - c0, y + .5 - c0) < 7.2) Z.cell[y * GW + x] = 0;
  const cx = c0 * CS, cz = c0 * CS; Z.start = [cx, cz + 9]; Z.bossAt = [cx, cz]; Z.dist = new Int16Array(GW * GW);
  Z.lamps.push({ x: cx, z: cz, big: 1 }, { x: cx - 11, z: cz - 8 }, { x: cx + 11, z: cz - 8 }, { x: cx - 8, z: cz + 10 }, { x: cx + 8, z: cz + 10 });
  Z.objs.push({ kind: 'stash', x: cx, z: cz - 13, name: 'Stash', used: false }, { kind: 'vendor', x: cx - 13, z: cz - 2, name: 'Mirel the Trader', used: false }, { kind: 'altar', x: cx + 13, z: cz - 2, name: 'Altar of Embers', used: false }, { kind: 'tportal', x: cx, z: cz + 14, name: 'Return to the Hollow', used: false });
  return Z;
}
function setEnv(Z) { const e = GLX.env, th = Z.th, n = Math.hypot(.55, .66, .42); e.sun = [.55 / n, .66 / n, .42 / n]; e.sunC = th.sunC; e.sky = th.sky; e.gnd = th.gnd; e.fog = GLX.col(th.fog); e.lightR = th.lightR; }
function enterTown() {
  if (G.inTown || P.dead || G.state !== 'play') return; for (const e of G.ents) if (e.alive && e.awake && Math.hypot(e.x - P.x, e.z - P.z) < 16) { hint('You cannot leave while enemies are near.'); return; }
  G.away = { zone: G.zone, ents: G.ents, drops: G.drops, boss: G.boss, x: P.x, z: P.z, seed: G.zone.def.seed }; G.ents = []; G.drops = []; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; G.boss = null; G.streak = 0;
  G.zone = genTown(); G.inTown = true; buildStatic(G.zone); setEnv(G.zone); P.x = G.zone.start[0]; P.z = G.zone.start[1]; P.y = 0; P.rot = Math.PI; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; BOT.path = null; P.hp = P.stats.maxLife;
  const h = G.hero; if (!h.stock || Math.abs(h.kills - (h.stockK || 0)) >= 25 || h.stockL !== h.level) { h.stock = []; for (let i = 0; i < 10; i++) h.stock.push(makeItem(h.level, null, Math.random() < .12 ? 3 : Math.random() < .5 ? 2 : 1)); h.stockK = h.kills; h.stockL = h.level; }
  SFX.play('shrine'); UI.zoneBanner('Emberwatch Camp', 'Stash · Trader · Altar'); saveGame();
}
function leaveTown() {
  if (!G.inTown) return; const a = G.away; UI.closeTown();
  if (G.online) { NET.send({ t: 'sync' }); hint('Returning to your party…'); return; }
  if (!a) { enterZone(); return; }
  G.inTown = false; G.away = null; G.zone = a.zone; G.ents = a.ents; G.drops = a.drops; G.boss = a.boss; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; buildStatic(G.zone); setEnv(G.zone); P.x = a.x; P.z = a.z; P.move = P.atk = P.inter = P.pick = null; BOT.path = null;
  SFX.play('shrine'); UI.zoneBanner(G.zone.def.name, 'Monster level ' + G.zone.def.lvl);
}
function toStash(i) { const h = G.hero, it = h.inv[i]; if (!it) return; if (!bagPut(G.stash, it)) { hint('The stash is full.'); return; } h.inv[i] = null; SFX.play('pickup'); saveGame(); }
function fromStash(j) { const it = G.stash[j]; if (!it) return; if (!addItem(it)) { hint('Inventory is full.'); return; } G.stash[j] = null; SFX.play('pickup'); saveGame(); }
function sellItem(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.gold += itemValue(it); h.inv[i] = null; SFX.play('gold'); saveGame(); }
function buyPrice(it) { return itemValue(it) * 5; }
function buyItem(k) { const h = G.hero, it = h.stock && h.stock[k]; if (!it) return; const pr = buyPrice(it); if (h.gold < pr) { hint('Not enough gold.'); return; } if (!addItem(it)) { hint('Inventory is full.'); return; } h.gold -= pr; h.stock[k] = null; SFX.play('gold'); saveGame(); }
// Altar: reroll ONE line of an item. Once a line is chosen, only that line can be rerolled again.
function affixRange(a, ilvl) { const k = a[3] === 'f' ? Math.pow(1.085, ilvl) : a[3] === 'p' ? 1 + Math.min(ilvl, 60) * .02 : 1, r = v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10; return [r(a[1] * k), r(a[2] * k)]; }
function altarPool(it, idx) { const as = AFF_ALIAS[it.slot] || it.slot, have = new Set(it.aff.filter((a, i) => i !== idx).map(a => a.k)); return AFFIX.filter(a => a[4].split(' ').includes(as) && !have.has(a[0])); }
function altarCost(it) { const n = it.rr || 0; return { shards: Math.round((3 + it.rar * 2) * (1 + n * .5)), gold: Math.round(itemValue(it) * (1 + n * .5)) }; }
function altarReroll(i, idx) {
  const h = G.hero, it = h.inv[i]; if (!it || !it.aff[idx]) return false; if (it.ench !== undefined && it.ench !== idx) { hint('Only the line you first changed can be rerolled on this item.'); return false; }
  const c = altarCost(it); if ((h.shards || 0) < c.shards) { hint('Not enough shards. Scrap items to get more.'); return false; } if (h.gold < c.gold) { hint('Not enough gold.'); return false; }
  const pool = altarPool(it, idx); if (!pool.length) return false; const a = pick(pool); h.shards -= c.shards; h.gold -= c.gold; it.aff[idx] = { k: a[0], v: affixVal(a, it.ilvl) }; it.ench = idx; it.rr = (it.rr || 0) + 1; SFX.play('shrine'); saveGame(); return true;
}

// ---------- fx ----------
function burst(x, y, z, c, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(6.28), u = rnd(-.2, 1), s = rnd(.3, 1) * sp; G.fx.push({ x, y, z, vx: Math.cos(a) * s, vy: u * s, vz: Math.sin(a) * s, life: rnd(.25, .6), max: .6, size: rnd(.1, .24), c: GLX.col(c) }); } if (G.fx.length > 700) G.fx.splice(0, G.fx.length - 700); }
function ring(x, z, r0, r1, life, c) { G.fx.push({ ring: 1, x, z, r0, r1, life, max: life, c: GLX.col(c) }); }
function floatText(x, y, z, txt, col, life, size) { if (!G.set.nums && /^[-+✦\d]/.test(txt)) return; G.texts.push({ x: x + rnd(-.4, .4), y, z, txt, col, life: life || .9, max: life || .9, size: size || 15 }); if (G.texts.length > 60) G.texts.shift(); }
function addArea(o) { o.t = 0; G.areas.push(o); return o; }

// ---------- combat ----------
function wake(e) { if (e.awake) return; if (e.boss) { e.awake = true; SFX.play('boss'); UI.zoneBanner(e.name, 'Guardian of the Hollow'); return; } for (const o of G.ents) if (o.pack === e.pack && !o.awake) { o.awake = true; o.cd = rnd(.2, .9); } }
function rollDmg(sk, mult) { const s = P.stats; const base = rnd(s.wmin, s.wmax) + s.addPhys + s.addFire + s.addCold + s.addLight; let inc = s.dmg + (s[sk.el] || 0) + (sk.el !== 'phys' ? s.ele : 0); if (s.lowLife && P.hp < s.maxLife * .5) inc += s.lowLife; let v = base * sk.m * (mult || 1) * (1 + inc / 100); const crit = Math.random() * 100 < s.critT; if (crit) v *= s.critM; return { v, crit }; }
function hitEnemy(e, sk, mult, noProc) {
  if (!e.alive) return; const s = P.stats, d = rollDmg(sk, mult); let v = d.v; if (e.armored) v *= .6; if (e.shock > 0) v *= 1.15; v = Math.max(1, Math.round(v));
  e.hp -= v; e.flash = .13; wake(e); P.lastHit = G.time; if (sk.gen) P.mana = Math.min(s.maxMana, P.mana + sk.gen);
  floatText(e.x, 1.6 * e.sc + .6, e.z, (d.crit ? '✦' : '') + v, d.crit ? '#ffe14a' : EL_CSS[sk.el], d.crit ? 1.1 : .8, d.crit ? 21 : 15);
  if (sk.freeze && !e.boss) e.frozen = sk.freeze;
  if (sk.el === 'fire') { e.burn = Math.max(e.burn, v * .15); e.burnT = 3; } else if (sk.el === 'cold') e.chill = 2.5; else if (sk.el === 'light') e.shock = 3;
  if (s.lifeOnHit) P.hp = Math.min(s.maxLife, P.hp + s.lifeOnHit); if (s.leech) P.hp = Math.min(s.maxLife, P.hp + v * s.leech / 100);
  if (!G.online && !e.boss && e.arch !== 'brute') { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; moveEnt(e, dx / l * .4, dz / l * .4, e.r); }
  burst(e.x, 1.1 * e.sc, e.z, d.crit ? 0xffe14a : EL_COL[sk.el], d.crit ? 9 : 5, 5);
  if (G.time - G.hitSfx > .05) { G.hitSfx = G.time; SFX.play(d.crit ? 'crit' : 'hit'); }
  if (!noProc && s.procLight && Math.random() * 100 < s.procLight) addArea({ x: e.x, z: e.z, r: 2.6, delay: .15, owner: 'p', sk: { el: 'light', m: 1.5 }, c: 0xfff07a, proc: 1 });
  if (G.online) { const cl = !e.boss && s.cull && e.hp < e.maxHp * s.cull / 100; NET.send({ t: 'hit', id: e.id, v: cl ? e.maxHp * 2 : v, el: sk.el, fz: sk.freeze || 0 }); if (e.hp < 0) e.hp = 0; return; }
  if (e.hp <= 0 || (!e.boss && s.cull && e.hp < e.maxHp * s.cull / 100)) killEnemy(e);
}
function killEnemy(e) {
  if (!e.alive) return; e.alive = false; e.deadT = .45; const h = G.hero, s = P.stats; h.kills++;
  let xp = 22 * Math.pow(1.13, e.lvl) * (e.a.xp || 1) * (e.elite === 1 ? 3 : e.elite === 2 ? 6 : 1); const diff = h.level - e.lvl; if (diff > 4) xp *= Math.max(.1, 1 - (diff - 4) * .15); gainXp(xp);
  G.streak++; G.streakT = 4; if (G.streak > G.bestStreak) G.bestStreak = G.streak; if (G.streak > (h.best || 0)) h.best = G.streak;
  dropLoot(e); burst(e.x, 1, e.z, e.md.c2, 14, 6); SFX.play('kill');
  if (!e.noLoot && (e.elite || Math.random() < .12)) G.drops.push({ x: e.x, z: e.z, globe: 1, t: 0 });
  if (s.boomFire) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'fire', m: 1.2 }, c: 0xff7a2a, proc: 1 });
  if (s.boomCold) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'cold', m: 1.0 }, c: 0x7ad0ff, proc: 1 });
  if (e.volatile && !G.online) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten && !G.online) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.boss) {
    G.zone.cleared = true; G.shake = .9; ring(e.x, e.z, 0, 16, 1.1, e.md.e); burst(e.x, 2, e.z, e.md.e, 60, 11); SFX.play('level'); h.runs++;
    G.zone.objs.push({ kind: 'portal', x: e.x, z: e.z, name: 'Descend deeper', used: false }); UI.zoneBanner('Guardian slain', 'Take the portal to go deeper'); saveGame();
  }
}
function dmgPlayer(v, el, src) {
  if (P.dead || P.iframes > 0) return; const s = P.stats;
  if (Math.random() * 100 < s.dodgeT) { floatText(P.x, 2.6, P.z, 'Dodge', '#9fe', .7); return; }
  if (el === 'phys') v *= 1 - Math.min(.8, s.armorT / (s.armorT + 60 + v * 6)); else v *= 1 - (s['r' + el] || 0) / 100; v *= 1 - Math.min(50, s.dr) / 100; v = Math.max(1, Math.round(v));
  P.hp -= v; P.hurt = .25; P.lastHit = G.time; P.mana = Math.min(s.maxMana, P.mana + 2); G.shake = Math.min(.7, G.shake + .12 + v / s.maxLife); floatText(P.x, 2.6, P.z, '-' + v, '#ff5a4a', .9, 17); SFX.play('hurt');
  if (src && src.alive && s.thorns > 0) { src.flash = .1; if (G.online) NET.send({ t: 'hit', id: src.id, v: s.thorns, el: 'phys' }); else { src.hp -= s.thorns; if (src.hp <= 0) killEnemy(src); } }
  if (P.hp <= 0) { if (s.cheat && P.cheatCd <= 0) { P.hp = s.maxLife; P.cheatCd = 60; ring(P.x, P.z, 0, 10, .8, 0xff8a2a); hint('Emberheart saves you from death!'); } else { P.hp = 0; P.dead = true; P.act = P.spin = P.dash = null; G.streak = 0; SFX.play('die'); UI.showDeath(); } }
}
function tryCast(slot, tx, tz) {
  const h = G.hero, id = h.bar[slot], s = P.stats; if (!id) return false; const sk = SKILLS[id];
  if (P.act || P.dash || (P.cds[id] || 0) > 0) return false; if (sk.type === 'spin' && P.spin) return false;
  if (P.mana < (sk.cost || 0)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Not enough ' + CLASSES[h.cls].res.n + '.'); } return false; }
  if (tx === undefined) { tx = IN.gx; tz = IN.gz; }
  P.mana -= sk.cost || 0; if (sk.cd) P.cds[id] = sk.cd * (1 - s.cdrT / 100);
  const sp = 1 + s.aspd / 100;
  if (sk.type === 'spin') { P.spin = { t: sk.dur, tk: 0, sk }; return true; }
  if (sk.type === 'buff') { P.buffs = P.buffs.filter(b => b.n !== sk.n); P.buffs.push({ s: sk.s, t: sk.dur, n: sk.n }); computeStats(); ring(P.x, P.z, 0, 7, .5, 0xffb03a); SFX.play('shrine'); P.mana = Math.min(s.maxMana, P.mana + 20); return true; }
  P.rot = Math.atan2(tx - P.x, tz - P.z); const dur = sk.basic ? 1 / (s.wspd * sp * (sk.as || 1)) : (sk.ct || .35) / sp;
  P.act = { sk, id, t: 0, dur, fireAt: dur * .42, fired: false, tx, tz }; P.swing = 0; SFX.play('swing'); return true;
}
function shoot(ang, sk) {
  const sx = Math.sin(ang), cz = Math.cos(ang), c = sk.c || EL_COL[sk.el];
  G.pp.push({ x: P.x + sx * .8, z: P.z + cz * .8, vx: sx * sk.spd, vz: cz * sk.spd, rot: ang, life: (sk.range || 15) / sk.spd, r: sk.pr || .45, sk, pierce: sk.pierce || 0, hit: new Set(), c: GLX.col(c), arrow: !!sk.arrow });
  if (G.online) NET.send({ t: 'fx', k: 'p', x: P.x + sx * .8, z: P.z + cz * .8, rot: ang, r: sk.spd, arc: (sk.range || 15) / sk.spd, c });
}
function areaHit(x, z, r, sk, mult) { let n = 0; for (const e of G.ents) if (e.alive && Math.hypot(e.x - x, e.z - z) <= r + e.r) { hitEnemy(e, sk, mult); n++; } return n; }
function fireSkill(a) {
  const sk = a.sk, s = P.stats, ar = 1 + s.area / 100;
  if (sk.type === 'melee') {
    const range = sk.range * Math.sqrt(ar); let n = 0;
    for (const e of G.ents) { if (!e.alive) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d > range + e.r) continue; let da = Math.atan2(dx, dz) - P.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; if (Math.abs(da) <= sk.arc / 2 || d < 1.2) { hitEnemy(e, sk); n++; } }
    G.fx.push({ slash: 1, x: P.x, z: P.z, rot: P.rot, r: range, arc: sk.arc, life: .16, max: .16, c: GLX.col(0xfff0d0) }); if (G.online) NET.send({ t: 'fx', k: 's', x: P.x, z: P.z, rot: P.rot, r: range, arc: sk.arc }); if (n) G.shake = Math.min(.5, G.shake + .06);
  } else if (sk.type === 'nova') {
    const r = sk.r * ar; areaHit(P.x, P.z, r, sk); ring(P.x, P.z, .5, r, .35, EL_COL[sk.el]); if (G.online) NET.send({ t: 'fx', k: 'r', x: P.x, z: P.z, r, c: EL_COL[sk.el] }); burst(P.x, .4, P.z, 0xc8b89a, 26, 9); G.shake = .45; SFX.play('slam');
  } else if (sk.type === 'dash') {
    let dx = a.tx - P.x, dz = a.tz - P.z; const d = Math.hypot(dx, dz) || 1, L = Math.min(d, sk.range); dx /= d; dz /= d; let ex = P.x, ez = P.z;
    for (let t = .5; t <= L; t += .5) { const nx = P.x + dx * t, nz = P.z + dz * t; if (!blocked(nx, nz, .55)) { ex = nx; ez = nz; } }
    if (sk.blink) { ring(P.x, P.z, 0, 2.5, .3, EL_COL.arc); burst(P.x, 1.2, P.z, EL_COL.arc, 14, 5); P.x = ex; P.z = ez; ring(ex, ez, 0, 3, .35, EL_COL.arc); P.iframes = .35; SFX.play('leap'); return; }
    P.dash = { x0: P.x, z0: P.z, x1: ex, z1: ez, t: 0, dur: sk.flat ? .24 : .34, sk }; P.iframes = .45; SFX.play('leap');
  } else if (sk.type === 'rain') {
    let dx = a.tx - P.x, dz = a.tz - P.z; const d = Math.hypot(dx, dz) || 1, L = Math.min(d, 13); const cx = P.x + dx / d * L, cz = P.z + dz / d * L;
    for (let i = 0; i < sk.cnt; i++) { const an = rnd(6.28), rr = Math.sqrt(Math.random()) * sk.spread; addArea({ x: cx + Math.cos(an) * rr, z: cz + Math.sin(an) * rr, r: sk.r * ar, delay: sk.delay + i * (sk.stagger || 0), owner: 'p', sk, c: EL_COL[sk.el] }); }
    G.shake = .4; SFX.play('slam');
  } else if (sk.type === 'proj') {
    const n = (sk.cnt || 1) + (s.projExtra || 0), base = Math.atan2(a.tx - P.x, a.tz - P.z), sp = n > 1 ? Math.max(sk.spread || 0, .12 * (n - 1)) : 0;
    for (let i = 0; i < n; i++) shoot(base + (n > 1 ? (i / (n - 1) - .5) * sp : 0), sk);
  } else if (sk.type === 'chain') {
    let cur = null, bd = 6; for (const e of G.ents) { if (!e.alive) continue; const d = Math.hypot(e.x - a.tx, e.z - a.tz); if (d < bd) { bd = d; cur = e; } }
    if (!cur) { bd = sk.range; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; cur = e; } } }
    if (cur && Math.hypot(cur.x - P.x, cur.z - P.z) > sk.range + 2) cur = null;
    if (!cur) { G.fx.push({ bolt: 1, x1: P.x, z1: P.z, x2: P.x + Math.sin(P.rot) * 8, z2: P.z + Math.cos(P.rot) * 8, life: .18, max: .18, c: GLX.col(EL_COL[sk.el]) }); return; }
    const hit = new Set(); let px = P.x, pz = P.z;
    for (let j = 0; j <= sk.jumps && cur; j++) {
      G.fx.push({ bolt: 1, x1: px, z1: pz, x2: cur.x, z2: cur.z, life: .2, max: .2, c: GLX.col(EL_COL[sk.el]) }); hit.add(cur); px = cur.x; pz = cur.z; hitEnemy(cur, sk, 1 - j * .07);
      let nx = null, nd = 7.5; for (const e of G.ents) { if (!e.alive || hit.has(e)) continue; const d = Math.hypot(e.x - px, e.z - pz); if (d < nd) { nd = d; nx = e; } } cur = nx;
    }
    if (G.online) NET.send({ t: 'fx', k: 'r', x: px, z: pz, r: 2.5, c: EL_COL[sk.el] });
  } else if (sk.type === 'barrage') {
    for (let w = 0; w < sk.waves; w++) G.timers.push({ t: w * .22, fn: () => { if (P.dead) return; const n = sk.cnt + (s.projExtra || 0); for (let i = 0; i < n; i++) shoot(i / n * 6.2832 + w * .17, sk); SFX.play('swing'); } });
  }
}

// ---------- quest + GPS path ----------
const GPS = { t: 0, pts: [], goal: null, text: '' };
function questTarget() {
  const Z = G.zone; if (!Z) return null; if (G.inTown) { const o = Z.objs.find(o => o.kind === 'tportal'); return { x: o.x, z: o.z, text: 'Take the portal back to the Hollow' }; }
  const po = Z.objs.find(o => o.kind === 'portal' && !o.used); if (po) return { x: po.x, z: po.z, text: 'Take the portal deeper' };
  const b = G.boss; return { x: b ? b.x : Z.bossAt[0], z: b ? b.z : Z.bossAt[1], text: 'Find and slay ' + (b ? b.name : BOSSES[Z.def.theme].n) };
}
function updGps(dt) {
  GPS.t -= dt; if (GPS.t > 0) return; GPS.t = .4; const q = questTarget(); GPS.goal = q; GPS.text = q ? q.text : ''; GPS.pts = []; if (!q || !G.set.gps) return;
  const f = botField(), gc = cellOf(q.x, q.z); if (f.prev[gc] < 0) return; const out = [[q.x, q.z]]; let k = gc; while (k !== f.s) { k = f.prev[k]; if (k !== f.s) out.push([(k % GW + .5) * CS, ((k / GW | 0) + .5) * CS]); } out.push([P.x, P.z]); GPS.pts = out.reverse();
}

// ---------- autoplay ----------
const BOT = { t: 0, path: null, rv: 0, dodge: 0, kite: 0 };
const NPCV = { x: 0, y: 0, z: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls: 'ranger' };
function itemScore(it) { return it.dmg ? (it.dmg[0] + it.dmg[1]) / 2 * it.spd * (1 + it.aff.length * .06) : (it.armor || 0) + it.ilvl * (2 + it.aff.length * 2) + (it.power ? it.ilvl * 4 : 0); }
function botField() {
  const c = G.zone.cell, N = GW * GW, s = clamp(Math.floor(P.z / CS), 0, GW - 1) * GW + clamp(Math.floor(P.x / CS), 0, GW - 1), prev = new Int32Array(N).fill(-1), dist = new Int16Array(N).fill(-1), q = [s]; prev[s] = s; dist[s] = 0;
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % GW; for (const d of [-1, 1, -GW, GW]) { const n = k + d; if (n < 0 || n >= N) continue; if ((d === -1 && x === 0) || (d === 1 && x === GW - 1)) continue; if (!c[n] && prev[n] < 0) { prev[n] = k; dist[n] = dist[k] + 1; q.push(n); } } }
  return { s, prev, dist };
}
const cellOf = (x, z) => clamp(Math.floor(z / CS), 0, GW - 1) * GW + clamp(Math.floor(x / CS), 0, GW - 1);
function los(x1, z1, x2, z2) { const d = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(d / .4); for (let i = 1; i < n; i++) { const t = i / n; if (cellAt(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t)) return false; } return true; }
function botGear() {
  const h = G.hero; let ch = false;
  h.inv.forEach((it, i) => { if (!it || !canUse(it)) return; let cur; if (it.slot === 'ring') cur = !h.eq.ring1 || !h.eq.ring2 ? null : h.eq.ring1; else cur = h.eq[it.slot]; if (!cur || itemScore(it) > itemScore(cur) * 1.02) { if (equipFromInv(i)) ch = true; } });
  if (bagFree() < 16) { scrapAll(2); ch = true; } if (ch) UI.invDirty = true;
}
function botStep(dt) {
  if (G.inTown) { leaveTown(); return false; }
  const h = G.hero, s = P.stats; BOT.t -= dt; if (P.hp < s.maxLife * .45) useFlask();
  for (const a of G.areas) if (a.owner === 'e' && !a.done) { const d = Math.hypot(P.x - a.x, P.z - a.z); if (d < a.r + .8) { const nx = d > .1 ? (P.x - a.x) / d : 1, nz = d > .1 ? (P.z - a.z) / d : 0; P.atk = null; P.move = [P.x + nx * 4, P.z + nz * 4]; BOT.dodge = .2; return false; } }
  if (BOT.dodge > 0) { BOT.dodge -= dt; return false; }
  let tgt = null, bd = 17, goal = null, act = null; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tgt = e; } }
  if (tgt) {
    const clear = los(P.x, P.z, tgt.x, tgt.z), bs = SKILLS[h.bar[0]] || SKILLS.cleave;
    if (bs.range > 5 && bd < 4 && (BOT.kite || 0) <= 0 && tgt.arch !== 'caster' && !tgt.boss) BOT.kite = .7;
    if (BOT.kite > 0) { BOT.kite -= dt; if (BOT.kite > .3) { const ax = P.x - (tgt.x - P.x) / bd * 5, az = P.z - (tgt.z - P.z) / bd * 5; if (!blocked(ax, az, .6)) { P.atk = null; P.move = [ax, az]; return false; } } }
    for (let i = 1; i < 4; i++) {
      const id = h.bar[i]; if (!id) continue; const sk = SKILLS[id]; if ((P.cds[id] || 0) > 0 || P.mana < (sk.cost || 0) || (sk.type === 'spin' && P.spin)) continue;
      if (sk.type === 'dash') { if (!sk.land) { if (bd < 3.5 && P.hp < s.maxLife * .6 && tryCast(i, P.x * 2 - tgt.x, P.z * 2 - tgt.z)) return true; continue; } if (bd > 5 && bd < sk.range && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'buff') { if (bd < 8 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'rain') { if (bd < 12 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'proj' || sk.type === 'chain') { if (clear && bd < (sk.range || 14) * .8 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'barrage') { if (bd < 7 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (bd < (sk.r || sk.range || 4) * .8 + tgt.r && tryCast(i, tgt.x, tgt.z)) return true;
    }
    const basic = SKILLS[h.bar[0]] || SKILLS.cleave; if (bd <= basic.range * .78 + tgt.r && (clear || basic.range < 5)) { P.move = null; return tryCast(0, tgt.x, tgt.z); }
    goal = [tgt.x, tgt.z];
  } else {
    let best = 26; const want = P.hp < s.maxLife * .7;
    for (const d of G.drops) { if (d.gold || (d.globe && !want) || (d.item && d.item.rar < 1 && h.level > 3)) continue; const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < best) { best = dd; goal = [d.x, d.z]; act = () => { pickup(d); botGear(); }; } }
    if (!goal) for (const o of G.zone.objs) { if (o.used || o.kind === 'portal') continue; const dd = Math.hypot(o.x - P.x, o.z - P.z); if (dd < 22 && dd < best) { best = dd; goal = [o.x, o.z]; act = () => interact(o); } }
  }
  if (BOT.t <= 0 || !BOT.path) {
    BOT.t = .35; const f = botField();
    if (!goal) { let bdist = 1e9, be = null; for (const e of G.ents) { if (!e.alive) continue; const dc = f.dist[cellOf(e.x, e.z)]; if (dc >= 0 && dc < bdist) { bdist = dc; be = e; } } if (be) goal = [be.x, be.z]; else { const po = G.zone.objs.find(o => o.kind === 'portal' && !o.used); if (po) { goal = [po.x, po.z]; act = () => interact(po); } } }
    if (!goal) { BOT.path = null; return false; }
    const g = cellOf(goal[0], goal[1]), out = [goal]; if (f.prev[g] >= 0) { let k = g; while (k !== f.s) { k = f.prev[k]; if (k !== f.s) out.push([(k % GW + .5) * CS, ((k / GW | 0) + .5) * CS]); } } BOT.path = out.reverse(); BOT.act = act; BOT.goal = goal;
  }
  const path = BOT.path; if (!path || !path.length) return false;
  if (BOT.act && Math.hypot(BOT.goal[0] - P.x, BOT.goal[1] - P.z) < 2.3) { const a = BOT.act; BOT.act = null; BOT.path = null; BOT.t = 0; a(); return false; }
  while (path.length > 1 && Math.hypot(path[0][0] - P.x, path[0][1] - P.z) < 1.6) path.shift();
  P.atk = null; P.move = [path[0][0], path[0][1]]; return false;
}

// ---------- update ----------
function updPlayer(dt) {
  const s = P.stats, h = G.hero; if (P.dead) return;
  P.hp = Math.min(s.maxLife, P.hp + s.lifeRegenT * dt); { const rs = CLASSES[h.cls].res; if (rs.regen) P.mana = Math.min(s.maxMana, P.mana + rs.regen * dt); else if (G.time - P.lastHit > 4) P.mana = Math.max(0, P.mana - rs.decay * dt); } if (P.flaskCd > 0) P.flaskCd -= dt;
  for (const k in P.cds) if (P.cds[k] > 0) P.cds[k] -= dt;
  if (P.iframes > 0) P.iframes -= dt; if (P.hurt > 0) P.hurt -= dt; if (P.cheatCd > 0) P.cheatCd -= dt;
  if (P.buffs.length) { let ex = false; for (const b of P.buffs) { b.t -= dt; if (b.t <= 0) ex = true; } if (ex) { P.buffs = P.buffs.filter(b => b.t > 0); computeStats(); } }
  if (P.flaskT > 0) { P.flaskT -= dt; P.hp = Math.min(s.maxLife, P.hp + s.maxLife * .5 * dt); }
  if (G.streakT > 0) { G.streakT -= dt; if (G.streakT <= 0) G.streak = 0; }
  P.moving = false;
  if (P.dash) {
    const d = P.dash; d.t += dt; const k = Math.min(1, d.t / d.dur); P.x = d.x0 + (d.x1 - d.x0) * k; P.z = d.z0 + (d.z1 - d.z0) * k; P.y = d.sk.flat ? 0 : Math.sin(k * Math.PI) * 3.2;
    if (k >= 1) { P.y = 0; P.dash = null; if (d.sk.land) { const r = d.sk.land * (1 + s.area / 100); areaHit(P.x, P.z, r, d.sk); ring(P.x, P.z, .5, r, .35, 0xffc890); if (G.online) NET.send({ t: 'fx', k: 'r', x: P.x, z: P.z, r, c: 0xffc890 }); burst(P.x, .4, P.z, 0xc8b89a, 22, 9); G.shake = .5; SFX.play('slam'); } }
    return;
  }
  if (P.spin) { const sp = P.spin; sp.t -= dt; sp.tk -= dt; if (sp.tk <= 0) { sp.tk = sp.sk.tick / (1 + s.aspd / 100); areaHit(P.x, P.z, sp.sk.r * (1 + s.area / 100), sp.sk); SFX.play('whirl'); } if (sp.t <= 0) P.spin = null; }
  if (P.act) { const a = P.act; a.t += dt; P.swing = a.t / a.dur; if (!a.fired && a.t >= a.fireAt) { a.fired = true; fireSkill(a); } if (a.t >= a.dur) P.act = null; else return; }
  if (G.auto && botStep(dt)) return;
  if (IN.rmb && tryCast(1)) return; if (IN.keys.q && tryCast(2)) return; if (IN.keys.w && tryCast(3)) return;
  for (let i = 0; i < 4; i++) if (IN.tb[i]) { const t = autoTarget(); if (tryCast(i, t[0], t[1])) return; }
  if (IN.lmb || IN.lmbFresh) {
    if (IN.shift) { P.atk = P.move = P.inter = P.pick = null; IN.lmbFresh = false; tryCast(0); return; }
    if (IN.lmbFresh) { IN.lmbFresh = false; if (P.pickNow) { P.pick = P.pickNow; P.pickNow = null; P.atk = P.inter = P.move = null; } else if (G.hoverObj) { P.inter = G.hoverObj; P.atk = P.move = P.pick = null; } else if (G.hover) { P.atk = G.hover; P.inter = P.move = P.pick = null; } else { P.atk = P.inter = P.pick = null; P.move = [IN.gx, IN.gz]; } }
    else if (!P.atk && !P.inter && !P.pick) { if (G.hover) P.atk = G.hover; else P.move = [IN.gx, IN.gz]; }
  }
  let tx, tz;
  if (P.atk && !P.atk.alive) { P.atk = null; }
  if (P.atk) { const e = P.atk, d = Math.hypot(e.x - P.x, e.z - P.z); if (d <= (SKILLS[G.hero.bar[0]] || SKILLS.cleave).range * .78 + e.r) { tryCast(0, e.x, e.z); if (!IN.lmb) P.atk = null; return; } tx = e.x; tz = e.z; }
  else if (P.pick) { if (!G.drops.includes(P.pick)) P.pick = null; else { if (Math.hypot(P.pick.x - P.x, P.pick.z - P.z) < 2.3) { pickup(P.pick); P.pick = null; return; } tx = P.pick.x; tz = P.pick.z; } }
  else if (P.inter) { const o = P.inter; if (Math.hypot(o.x - P.x, o.z - P.z) < 2.6) { interact(o); P.inter = null; return; } tx = o.x; tz = o.z; }
  else if (P.move) { tx = P.move[0]; tz = P.move[1]; if (Math.hypot(tx - P.x, tz - P.z) < .3) { P.move = null; tx = undefined; } }
  if (tx !== undefined) {
    const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz) || 1, sp = s.msT * (P.spin ? .8 : 1), st = Math.min(d, sp * dt);
    if (!P.spin) { let da = Math.atan2(dx, dz) - P.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; P.rot += da * Math.min(1, dt * 18); }
    const ox = P.x, oz = P.z; moveEnt(P, dx / d * st, dz / d * st, .55); let moved = Math.hypot(P.x - ox, P.z - oz);
    if (moved < st * .5) { const ccx = (Math.floor(P.x / CS) + .5) * CS, ccz = (Math.floor(P.z / CS) + .5) * CS; if (Math.abs(dx) > Math.abs(dz)) moveEnt(P, 0, Math.sign(ccz - P.z) * Math.min(st, Math.abs(ccz - P.z)), .55); else moveEnt(P, Math.sign(ccx - P.x) * Math.min(st, Math.abs(ccx - P.x)), 0, .55); moved = Math.hypot(P.x - ox, P.z - oz); }
    if (moved < st * .15) { if (P.move && !IN.lmb) P.move = null; } else { P.moving = true; P.walk += moved * 1.5; }
  }
}
function setSkill(slot, id) {
  const h = G.hero, sk = SKILLS[id]; if (!sk || h.level < sk.lv) return false; if (!!sk.basic !== (slot === 0)) return false;
  const j = h.bar.indexOf(id); if (j === slot) return true; if (j >= 0) h.bar[j] = h.bar[slot]; h.bar[slot] = id; SFX.play('pickup'); saveGame(); return true;
}
function giveItem(i) {
  const h = G.hero, it = h.inv[i]; if (!it || !G.online) return false; let b = null, bd = 16; for (const id in NET.peers) { const q = NET.peers[id], d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; b = q; } }
  if (!b) { hint('No party member close enough to give this to.'); return false; } NET.send({ t: 'give', to: b.id, item: it }); h.inv[i] = null; hint('Gave ' + it.name + ' to ' + b.name + '.'); saveGame(); return true;
}
function useFlask() { if (P.dead || P.flaskCd > 0 || P.hp >= P.stats.maxLife) return; P.flaskCd = 30; P.flaskT = 1.2; SFX.play('flask'); burst(P.x, 1.4, P.z, 0xff4a4a, 14, 4); }
function pickup(d) {
  const i = G.drops.indexOf(d); if (i < 0) return;
  if (d.globe) { P.hp = Math.min(P.stats.maxLife, P.hp + P.stats.maxLife * .25); floatText(d.x, 1.4, d.z, '+life', '#ff6a6a', .8, 14); SFX.play('flask'); G.drops.splice(i, 1); return; }
  if (d.gold) { G.hero.gold += d.gold; floatText(d.x, 1.2, d.z, '+' + d.gold + ' gold', '#ffd84a', .9, 13); SFX.play('gold'); G.drops.splice(i, 1); return; }
  if (!addItem(d.item)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Inventory is full. Open it (I) and scrap or drop something.'); } return; }
  G.drops.splice(i, 1); SFX.play('pickup'); floatText(d.x, 1.4, d.z, d.item.name, RAR[d.item.rar].c, 1.1, 13); UI.invDirty = true;
}
function pickupNear() { for (const d of G.drops.slice()) if (d.item && Math.hypot(d.x - P.x, d.z - P.z) < 5 && d.item.rar >= G.hero.filter) pickup(d); }
function interact(o) {
  if (o.used) return;
  if (o.kind === 'chest') { o.used = true; const lv = G.hero.level; for (let i = 0; i < 3; i++) dropItem(o.x, o.z, makeItem(lv, null, rollRarity(1))); dropGold(o.x, o.z, (10 + lv * 5) * rnd(.8, 1.5)); burst(o.x, 1, o.z, 0xffd84a, 20, 6); SFX.play('pickup'); }
  else if (o.kind === 'shrine') { o.used = true; P.buffs.push({ s: o.sh.s, t: 45, n: o.sh.n }); computeStats(); ring(o.x, o.z, 0, 8, .7, o.sh.c); SFX.play('shrine'); hint(o.sh.n + ' empowers you for 45 seconds.'); }
  else if (o.kind === 'stash' || o.kind === 'vendor' || o.kind === 'altar') UI.openTown(o.kind);
  else if (o.kind === 'tportal') leaveTown();
  else if (o.kind === 'portal') { if (G.online) NET.send({ t: 'next' }); else enterZone(); }
}
function eShoot(e, ang, spd, dmgM, el) { G.projs.push({ x: e.x + Math.sin(ang) * e.r, z: e.z + Math.cos(ang) * e.r, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, life: 3, r: .45, dmg: e.dmg * (dmgM || 1), el: el || 'phys', src: e, c: GLX.col(e.md.e) }); }
function bossPattern(e) {
  const pat = e.bd.pat[e.pi++ % e.bd.pat.length], el = G.zone.th.elem;
  if (pat === 'ring') { const n = 18; for (let i = 0; i < n; i++) eShoot(e, i / n * 6.2832 + e.pi, 9, .8, el); }
  else if (pat === 'slam') addArea({ x: P.x, z: P.z, r: 5, delay: 1.1, owner: 'e', dmg: e.dmg * 2, el: 'phys', c: 0xff4a2a, src: e });
  else if (pat === 'summon') { const md = G.zone.th.mon.find(m => m.a === 'swarm') || G.zone.th.mon[0]; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28, x = e.x + Math.cos(a) * 3.5, z = e.z + Math.sin(a) * 3.5; if (!blocked(x, z, .6)) { const m = mkEnemy(md, x, z, e.lvl - 1, 0, -2); m.awake = true; m.noLoot = true; ring(x, z, 0, 2, .4, e.md.e); } } }
  else if (pat === 'barrage') { for (let i = 0; i < 7; i++) addArea({ x: P.x + rnd(-6, 6), z: P.z + rnd(-6, 6), r: 2.6, delay: .9 + i * .14, owner: 'e', dmg: e.dmg * 1.4, el, c: 0xff7a2a, src: e }); }
  else if (pat === 'nova') addArea({ x: e.x, z: e.z, r: 8.5, delay: 1.3, owner: 'e', dmg: e.dmg * 2.2, el, c: 0xff4a2a, src: e });
  else if (pat === 'charge') { e.st = 'charge'; e.t = .8; e.cdir = Math.atan2(P.x - e.x, P.z - e.z); e.chit = false; }
  else if (pat === 'spiral') e.spiral = 2;
}
function updEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.chill > 0) e.chill -= dt; if (e.shock > 0) e.shock -= dt;
  if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt; if (e.hp <= 0) { killEnemy(e); return; } }
  const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || .001;
  if (!e.awake) { if (d < (e.boss ? 17 : 14) && !P.dead) wake(e); else return; }
  if (P.dead) return; if (e.frozen > 0) { e.frozen -= dt; return; }
  const slow = e.chill > 0 ? .6 : 1, sp = e.spd * slow, a = e.a; e.cd -= dt * slow; e.t -= dt * slow;
  if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .02 * dt);
  if (e.storm) { e.modT -= dt; if (e.modT <= 0) { e.modT = 3.2; addArea({ x: P.x, z: P.z, r: 2.4, delay: .9, owner: 'e', dmg: e.dmg * 1.2, el: 'light', c: 0xfff07a, src: e }); } }
  const face = () => { let da = Math.atan2(dx, dz) - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * Math.min(1, dt * 10); };
  const go = (dir, k) => { const st = sp * dt * (k || 1); moveEnt(e, dx / d * st * dir, dz / d * st * dir, e.r * .8); e.walk += st * 1.6; };
  if (e.st === 'charge') { const st = 24 * dt; if (!moveEnt(e, Math.sin(e.cdir) * st, Math.cos(e.cdir) * st, e.r)) e.t = 0; e.rot = e.cdir; e.walk += st; if (!e.chit && d < e.r + 1.2) { e.chit = true; dmgPlayer(e.dmg * 1.8, 'phys', e); } if (e.t <= 0) { e.st = 'rec'; e.t = .6; } return; }
  if (e.st === 'wind') { face(); if (e.t <= 0) { e.atk = 1; if (e.arch === 'caster') eShoot(e, Math.atan2(dx, dz), 12, 1, G.zone.th.elem); else if (e.arch === 'bomber') { addArea({ x: e.x, z: e.z, r: 3.3, delay: .05, owner: 'e', dmg: e.dmg, el: 'fire', c: 0xff7a2a }); e.noXp = true; killEnemy(e); return; } else if (e.arch !== 'brute' && d <= a.reach + e.r + .9) dmgPlayer(e.dmg, 'phys', e); e.st = 'rec'; e.t = a.rec / (e.hasted ? 1.3 : 1); } return; }
  if (e.st === 'rec') { if (e.t <= 0) e.st = 'chase'; return; }
  face();
  if (e.boss) {
    const q = Math.ceil(e.hp / e.maxHp * 4); if (e.q && q < e.q) for (let i = 0; i < 2; i++) G.drops.push({ x: e.x + rnd(-4, 4), z: e.z + rnd(-4, 4), globe: 1, t: 0 }); e.q = q;
    if (e.spiral > 0) { e.spiral -= dt; e.spT = (e.spT || 0) - dt; if (e.spT <= 0) { e.spT = .09; e.spA = (e.spA || 0) + .5; eShoot(e, e.spA, 10, .7, G.zone.th.elem); eShoot(e, e.spA + Math.PI, 10, .7, G.zone.th.elem); } return; }
    e.pt -= dt; if (e.pt <= 0) { e.pt = e.hp < e.maxHp * .4 ? 2.3 : 3.3; bossPattern(e); return; }
  }
  if (e.arch === 'caster') { if (d > 11) go(1); else if (d < 6) go(-1, .8); if (e.cd <= 0 && d < 14) { e.cd = 2.4; e.st = 'wind'; e.t = a.wind; } return; }
  const reach = a.reach + e.r * .5;
  if (d > reach) go(1); else if (e.cd <= 0) {
    e.cd = .3; e.st = 'wind'; e.t = a.wind / (e.hasted ? 1.3 : 1);
    if (e.arch === 'brute') addArea({ x: e.x + dx / d * 2, z: e.z + dz / d * 2, r: 3, delay: e.t, owner: 'e', dmg: e.dmg, el: 'phys', c: 0xff4a2a, src: e });
    else if (e.boss) addArea({ x: e.x + dx / d * 2.5, z: e.z + dz / d * 2.5, r: 4, delay: e.t, owner: 'e', dmg: e.dmg * 1.3, el: 'phys', c: 0xff4a2a, src: e });
  }
}
function update(dt) {
  G.time += dt; if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
  P.mv += ((P.moving ? 1 : 0) - P.mv) * Math.min(1, dt * 12);
  updPlayer(dt); if (G.online) NET.tick(dt); updGps(dt);
  if (G.auto && P.dead) { BOT.rv += dt; if (BOT.rv > 2.5) { BOT.rv = 0; UI.revive(); } }
  // enemies
  const act = [];
  for (const e of G.ents) { if (!e.alive) { e.deadT -= dt; continue; } if (G.online) repEnemy(e, dt); else updEnemy(e, dt); if (e.alive && e.awake) act.push(e); }
  if (!G.online) for (let i = 0; i < act.length; i++) { const a = act[i]; for (let j = i + 1; j < act.length; j++) { const b = act[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d < m && d > .001) { const p = (m - d) * .5, nx = dx / d * p, nz = dz / d * p; if (!a.boss) moveEnt(a, -nx, -nz, a.r * .8); if (!b.boss) moveEnt(b, nx, nz, b.r * .8); } }
    const dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz), m = a.r + .5; if (d < m && d > .001 && !a.boss && !P.dash) moveEnt(a, dx / d * (m - d), dz / d * (m - d), a.r * .8); }
  if (G.ents.length && G.ents.some(e => !e.alive && e.deadT <= 0)) G.ents = G.ents.filter(e => e.alive || e.deadT > 0);
  if (G.boss && !G.boss.alive) G.boss = null;
  // projectiles (enemy)
  for (let i = G.projs.length - 1; i >= 0; i--) { const p = G.projs[i]; p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt; let dead = p.life <= 0 || cellAt(p.x, p.z); if (!dead && !p.peer && !P.dead && Math.hypot(p.x - P.x, p.z - P.z) < p.r + .6 && P.y < 1.5) { if (!p.vis) dmgPlayer(p.dmg, p.el, null); dead = true; } if (dead) { burst(p.x, 1.2, p.z, 0xffffff, 3, 3); G.projs.splice(i, 1); } }
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
  for (let i = G.pp.length - 1; i >= 0; i--) {
    const p = G.pp[i], n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / .45)), h = dt / n; let dead = false; p.life -= dt;
    for (let k = 0; k <= n && !dead; k++) {   // sub-steps so fast shots cannot skip past a close enemy or a wall corner
      if (k) { p.x += p.vx * h; p.z += p.vz * h; } if (cellAt(p.x, p.z)) { dead = true; break; }
      for (const e of G.ents) { if (!e.alive || p.hit.has(e) || Math.hypot(e.x - p.x, e.z - p.z) > p.r + e.r) continue; if (p.sk.explode) { dead = true; break; } p.hit.add(e); hitEnemy(e, p.sk); if (p.pierce-- <= 0) { dead = true; break; } }
    }
    if (p.life <= 0) dead = true;
    if (dead) { if (p.sk.explode) { const r = p.sk.explode * (1 + P.stats.area / 100); areaHit(p.x, p.z, r, p.sk); ring(p.x, p.z, .4, r, .35, EL_COL[p.sk.el]); G.shake = Math.min(.5, G.shake + .2); SFX.play('slam'); } burst(p.x, 1.2, p.z, EL_COL[p.sk.el], 5, 4); G.pp.splice(i, 1); }
  }
  // areas
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const a = G.areas[i]; a.t += dt;
    if (!a.done && a.t >= a.delay) { a.done = true; if (a.owner === 'p') { for (const e of G.ents) if (e.alive && Math.hypot(e.x - a.x, e.z - a.z) <= a.r + e.r) hitEnemy(e, a.sk, a.mult, a.proc); } else if (!a.vis && !P.dead && Math.hypot(P.x - a.x, P.z - a.z) <= a.r + .3 && P.y < 1.5) dmgPlayer(a.dmg, a.el, a.src); ring(a.x, a.z, a.r * .3, a.r, .3, a.c); burst(a.x, .5, a.z, a.c, 12, 7); if (a.owner === 'e') G.shake = Math.min(.5, G.shake + .08); }
    if (a.t >= a.delay + .05) G.areas.splice(i, 1);
  }
  // drops
  for (const d of G.drops.slice()) { d.t += dt; if (d.globe) { if (Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && P.hp < P.stats.maxLife) pickup(d); } else if (d.gold && d.t > .3) { const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < 4.5) { d.x += (P.x - d.x) / dd * 14 * dt; d.z += (P.z - d.z) / dd * 14 * dt; if (dd < .9) pickup(d); } } }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) { G.fx.splice(i, 1); continue; } if (!f.ring && !f.slash && !f.bolt) { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 14 * dt; if (f.y < .05) { f.y = .05; f.vy *= -.3; } } }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y += dt * 1.6; if (t.life <= 0) G.texts.splice(i, 1); }
  for (let i = G.hints.length - 1; i >= 0; i--) { G.hints[i].life -= dt; if (G.hints[i].life <= 0) G.hints.splice(i, 1); }
  // fog of war
  const Z = G.zone, pcx = Math.floor(P.x / CS), pcz = Math.floor(P.z / CS); for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const x = pcx + i, y = pcz + j; if (x >= 0 && y >= 0 && x < GW && y < GW && i * i + j * j <= 49) Z.seen[y * GW + x] = 1; }
  computeHover();
}
function computeHover() {
  const Z = G.zone, k = IN.touch ? 1.7 : 1; G.hover = null; G.hoverObj = null; let best = 1e9;
  for (const e of G.ents) { if (!e.alive || !e.awake) continue; const sp = GLX.toScreen(e.x, e.sc * .9, e.z); if (!sp) continue; const d = Math.hypot(sp[0] - IN.sx, sp[1] - IN.sy); if (d < (26 * e.sc + 14) * k && d < best) { best = d; G.hover = e; } }
  if (!G.hover) for (const o of Z.objs) { if (o.used) continue; const sp = GLX.toScreen(o.x, 1, o.z); if (sp && Math.hypot(sp[0] - IN.sx, sp[1] - IN.sy) < 44 * k) G.hoverObj = o; }
}
function autoTarget() { let b = null, bd = 15; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; b = e; } } return b ? [b.x, b.z] : [P.x + Math.sin(P.rot) * 6, P.z + Math.cos(P.rot) * 6]; }

// ---------- draw ----------
const BM = new Float32Array(16);
// What the hero is wearing, as a compact look the model (and other players) can read.
const GSL = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet'];
function gearCode(eq) { let c = ''; for (const sl of GSL) { const it = eq[sl]; if (!it) { c += 'xx'; continue; } let b = 0; if (sl === 'weapon') b = Math.max(0, WEAPONS.findIndex(w => w.n === it.base)); else if (ARMOR[sl]) b = Math.max(0, ARMOR[sl].findIndex(a => a.n === it.base)); c += b + '' + it.rar; } return c; }
function gearDecode(c) { const g = {}; if (typeof c !== 'string' || c.length !== GSL.length * 2) return null; GSL.forEach((sl, i) => { const b = c.charCodeAt(i * 2) - 48, r = c.charCodeAt(i * 2 + 1) - 48; g[sl] = b >= 0 && b <= 9 && r >= 0 && r <= 3 ? [b, r] : null; }); return g; }
const DEFGEAR = gearDecode('0101011101010101010100');
const TRIMC = [0x77726a, 0x5878d8, 0xd8b030, 0xff8a2a];
function drawHero(o, self) {
  const col = GLX.col, cls = o.cls || G.hero.cls, L = LOOK[cls] || LOOK.warden, g = o.gear || DEFGEAR, cloth = col(L.cl), leatherC = col(0x6a4a30), dkLeather = col(0x4a3524), steelC = col(0x8e97a8), skin = col(0xc99a78), blade = col(0xc8ced8), gold = col(0xb08a3a), wood = col(0x5a4028), under = shade(cloth, .55);
  const mat = (it, base0, alt) => !it ? null : it[0] === 0 ? [steelC, 4] : [alt || leatherC, 0], tr = it => { const r = it ? it[1] : 0; return [col(TRIMC[r]), r >= 3 ? .7 : r === 2 ? .15 : 0]; };
  const cm = g.chest ? (g.chest[0] === 0 ? [steelC, 4] : g.chest[0] === 2 ? [cloth, 0] : [leatherC, 0]) : [under, 0], ac = cm[0], am = cm[1], ct = tr(g.chest), trim = ct[0], te = ct[1];
  const pm = mat(g.pants) || [under, 0], bm = mat(g.boots, 0, dkLeather), gm = mat(g.gloves), brm = mat(g.bracers), sm = mat(g.shoulders), plate = !!g.chest && g.chest[0] === 0;
  const wb = g.weapon ? g.weapon[0] : -1, wt = wb < 0 ? 'none' : WEAPONS[wb] ? WEAPONS[wb].t : 'sword', wr = g.weapon ? g.weapon[1] : 0, wglow = wr >= 2 ? col(TRIMC[wr]) : null;
  const spin = !!o.spin, rot = spin ? G.time * 20 : o.rot, w = o.walk, mv = o.mv, bob = Math.abs(Math.sin(w)) * .07 * mv, em = o.hurt > 0 ? .9 : 0, sw2 = Math.sin(G.time * 2.2 + o.x) * .06;
  GLX.base(BM, o.x, o.y + bob, o.z, rot, 1.08); const p = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => GLX.part('dyn', gm2, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, e === undefined ? em : e + em, 1, m || 0);
  const lg = Math.sin(w) * .8 * mv, air = o.dash ? -1 : 0, ranged = wt === 'bow' || wt === 'staff';
  // legs or robe
  if (L.robe) { p('taper', 0, .62, 0, 0, 0, 0, 0, 0, 0, .86, 1.2, .8, ac, am); p('cyl', 0, .08, 0, 0, 0, 0, 0, 0, 0, .9, .1, .84, trim, 4, te); p('box', 0, .62, .37, .12, 0, 0, 0, 0, 0, .2, 1.0, .04, trim, 0, te); for (const sd of [1, -1]) p('box', .16 * sd, .1, .1 + sd * lg * .25, 0, 0, 0, 0, 0, 0, .18, .12, .34, bm ? bm[0] : skin, bm ? bm[1] : 0); }
  else for (const sd of [1, -1]) {
    const r = sd * lg + air * (sd > 0 ? 1 : .5); p('cyl', .17 * sd, .95, 0, r, 0, 0, 0, -.24, 0, .25, .5, .27, pm[0], pm[1]); p('cyl', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.66, .02, .21, .46, .23, bm ? bm[0] : g.pants ? pm[0] : skin, bm ? bm[1] : 0); p('box', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.9, .08, .22, .12, .38, bm ? bm[0] : skin, bm ? bm[1] : 0);
    if (bm) p('cyl', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.5, .02, .25, .07, .27, tr(g.boots)[0], 4, tr(g.boots)[1]);
    if (g.pants) { p('sphere', .17 * sd, .95, 0, r * 1.1, 0, 0, 0, -.46, .1, .2, .18, .2, pm[0], pm[1]); if (g.pants[0] === 0) p('box', .2 * sd, 1.0, .02, .06 + sd * lg * .4, 0, -sd * .12, 0, -.2, .14, .24, .36, .06, steelC, 4); else p('box', .16 * sd, .98, -.02, .16 + mv * .25, 0, 0, 0, -.3, -.2, .16, .5, .04, cloth); }
  }
  let lean = .06, rx = -lg * .7, ry = 0, lrx = lg * .6 - .2;
  if (o.act) { const k = o.swing, e = k < .42 ? k / .42 : 1; lean = .28 * Math.sin(k * Math.PI); if (ranged) { rx = -1.55; lrx = -1.5; lean = .05; } else if (o.act.sk.type === 'nova') rx = -3 + e * 2.6; else if (wt === 'fist') { rx = -1.5 + Math.sin(k * 6.28) * .5; lrx = -1.5 - Math.sin(k * 6.28) * .5; } else { rx = -1.5; ry = 1.3 - e * 2.6; } }
  if (spin) { rx = -1.5; ry = .3; lrx = -1.5; } if (o.dash) rx = -2.8;
  // torso, belt
  p('taper', 0, 1.38, 0, lean, 0, 0, 0, 0, 0, .78, -.74, .5, ac, am); if (!L.robe) p('cyl', 0, .98, 0, lean, 0, 0, 0, -.12, 0, .6, .32, .44, g.pants ? pm[0] : under, g.pants ? pm[1] : 0);
  if (plate) { p('sphere', 0, 1.5, .14, lean, 0, 0, 0, 0, 0, .5, .44, .3, ac, 4); p('cyl', 0, 1.74, 0, lean, 0, 0, 0, 0, 0, .34, .1, .34, ac, 4); p('box', 0, 1.18, .24, lean, 0, 0, 0, 0, 0, .34, .2, .05, shade(ac, .6), 4); }
  else if (g.chest) { p('box', 0, 1.3, .22, lean, 0, 0, 0, 0, 0, .14, .5, .06, trim, 0, te); if (L.robe) p('taper', 0, 1.62, 0, lean, 0, 0, 0, 0, 0, .98, .26, .7, shade(ac, 1.2)); }
  if (g.chest) p('box', 0, 1.46, .26, lean, 0, 0, 0, 0, 0, .5, .05, .04, trim, 4, te);
  if (g.belt) { const bt = tr(g.belt); p('box', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .56, .16, .4, g.belt[0] === 0 ? dkLeather : cloth); p('box', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .18, .16, .06, bt[0], 4, bt[1]); } else p('box', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .5, .06, .34, dkLeather);
  if (g.amulet) { const at = tr(g.amulet); p('gem', 0, 1.6, .3, lean, G.time, 0, 0, 0, 0, .1, .14, .08, at[0], 0, 1.2); }
  // head
  p('cyl', 0, 1.78, 0, lean, 0, 0, 0, 0, 0, .2, .14, .2, skin); p('sphere', 0, 2.0, .02, lean, 0, 0, 0, 0, 0, .36, .4, .38, skin);
  const hb = g.helm ? g.helm[0] : -1, ht = tr(g.helm);
  if (hb === 0) { p('sphere', 0, 2.06, -.01, lean, 0, 0, 0, 0, 0, .43, .4, .44, steelC, 4); p('box', 0, 1.98, .2, lean, 0, 0, 0, 0, 0, .05, .2, .06, steelC, 4); p('box', 0, 2.0, .18, lean, 0, 0, 0, 0, 0, .26, .06, .06, col(0x0a0a0c)); p('cone', 0, 2.34, -.08, lean - .5, 0, 0, 0, .1, 0, .1, .5, .16, cloth); for (const sd of [1, -1]) { p('box', .17 * sd, 1.92, .12, lean, 0, 0, 0, 0, 0, .06, .22, .16, steelC, 4); if (g.helm[1] >= 1) p('cone', .2 * sd, 2.22, -.04, lean, 0, -sd * .8, 0, .12, 0, .09, .2 + g.helm[1] * .08, .09, ht[0], 4, ht[1]); } }
  else if (hb === 1) { p('sphere', 0, 2.05, -.05, lean, 0, 0, 0, 0, 0, .46, .44, .48, cloth); p('cone', 0, 2.2, -.14, lean - .9, 0, 0, 0, .12, 0, .34, .4, .3, cloth); p('box', 0, 1.98, .19, lean, 0, 0, 0, 0, 0, .22, .16, .04, col(0x120e0c)); p('box', 0, 2.14, .2, lean, 0, 0, 0, 0, 0, .3, .04, .04, ht[0], 4, ht[1]); }
  else { const hair = col(cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0xd8d4e8 : 0x4a3626); p('sphere', 0, 2.1, -.06, lean, 0, 0, 0, 0, 0, .4, .32, .42, hair); if (cls === 'brawler') p('sphere', 0, 2.26, -.1, lean, 0, 0, 0, 0, 0, .16, .16, .16, hair); else p('box', 0, 1.94, -.2, lean, 0, 0, 0, 0, 0, .34, .3, .1, hair); if (hb === 2) { p('cyl', 0, 2.12, 0, lean, 0, 0, 0, 0, 0, .42, .06, .44, gold, 4); p('gem', 0, 2.14, .22, lean, 0, 0, 0, 0, 0, .08, .1, .06, ht[0], 0, 1.4); } for (const sd of [1, -1]) p('sphere', .08 * sd, 2.02, .19, lean, 0, 0, 0, 0, 0, .05, .04, .03, col(0x1a1410)); }
  // shoulders
  if (sm) { const st = tr(g.shoulders), big = g.shoulders[0] === 0; for (const sd of [1, -1]) { p('sphere', .47 * sd, 1.7, 0, 0, 0, 0, 0, 0, 0, big ? .44 : .34, big ? .36 : .26, big ? .44 : .36, sm[0], sm[1]); p('cyl', .47 * sd, 1.64, 0, 0, 0, 0, 0, 0, 0, big ? .48 : .38, .05, big ? .48 : .38, st[0], 4, st[1]); if (big && g.shoulders[1] >= 1) p('cone', .56 * sd, 1.84, 0, 0, 0, -sd * .9, 0, .12, 0, .16, .2 + g.shoulders[1] * .08, .16, sm[0], 4); } }
  else for (const sd of [1, -1]) p('sphere', .47 * sd, 1.7, 0, 0, 0, 0, 0, 0, 0, .24, .22, .24, g.chest ? ac : skin, am);
  // arms: sleeve, bracer, hand
  for (const sd of [1, -1]) {
    const arx = sd > 0 ? rx : lrx, ary = sd > 0 ? ry : 0, px = .47 * sd;
    p('cyl', px, 1.62, 0, arx, ary, 0, 0, -.18, 0, .17, .36, .17, g.chest ? shade(ac, .8) : skin, am);
    p('cyl', px, 1.62, 0, arx, ary, 0, 0, -.48, 0, brm ? .2 : .15, .3, brm ? .2 : .15, brm ? brm[0] : skin, brm ? brm[1] : 0); if (brm) p('cyl', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .22, .05, .22, tr(g.bracers)[0], 4, tr(g.bracers)[1]);
    const fist = wt === 'fist'; p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.66, 0, fist ? .27 : .2, fist ? .27 : .2, fist ? .27 : .2, fist ? dkLeather : gm ? gm[0] : skin, gm ? gm[1] : 0);
    if (fist) for (let k = 0; k < 3; k++) p('cone', px, 1.62, 0, arx + 1.5708, ary, 0, (k - 1) * .08, .1, .68, .06, .14, .06, wglow || steelC, 4, wglow ? .8 : 0);
  }
  // off-hand
  if (g.offhand) { const ot = tr(g.offhand);
    if (cls === 'warden') { GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .17, .2, .8, .06, .8, leatherC, em, 1, 0); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .2, .2, .86, .03, .86, steelC, em, 1, 4); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .21, .2, .62, .02, .62, cloth, em, 1, 0); GLX.part('dyn', 'sphere', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .24, .2, .26, .12, .26, ot[0], em + ot[1], 1, 4); }
    else if (cls === 'ranger') { p('box', .1, 1.5, -.3, lean + .3, 0, .4, 0, 0, 0, .2, .7, .16, leatherC); for (let k = 0; k < 3; k++) p('box', .22 + k * .05, 1.95, -.36, lean + .3, 0, .4, 0, 0, 0, .03, .3, .03, k === 1 ? ot[0] : wood); }
    else if (cls === 'elementalist') { p('box', -.34, 1.0, .1, lean, .3, 0, 0, 0, 0, .12, .34, .28, dkLeather); p('box', -.41, 1.0, .1, lean, .3, 0, 0, 0, 0, .02, .16, .12, ot[0], 4, ot[1]); }
    else if (cls === 'brawler') { for (let k = 0; k < 7; k++) { const a = -1.2 + k * .4; p('sphere', Math.sin(a) * .26, 1.72 - Math.cos(a) * .1, .2 + Math.cos(a) * .06, lean, 0, 0, 0, 0, 0, .09, .09, .09, ot[0], 0, ot[1]); } }
    else { const a = G.time * 1.3, oc2 = col(L.orb || TRIMC[g.offhand[1]]); GLX.obj('glow', 'sphere', o.x + Math.cos(a) * 1.1, o.y + 2.2 + Math.sin(a * 2) * .15, o.z + Math.sin(a) * 1.1, 0, .34, .34, .34, oc2, 1.4, 1); GLX.halo(o.x + Math.cos(a) * 1.1, o.y + 2.2, o.z + Math.sin(a) * 1.1, 1.4, oc2, .5); }
  }
  // weapon
  if (wt === 'sword') { p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, .95, .09, .03, 1.7, blade, 4, .25); p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, .95, .03, .045, 1.6, col(0xeef2f8), 4, .5); p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, .1, .42, .07, .08, gold, 4); p('cyl', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, -.04, .66, .07, .3, .07, dkLeather); if (wglow) p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, .95, .1, .05, 1.7, wglow, 0, .6); }
  else if (wt === 'axe' || wt === 'maul') { p('cyl', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, .5, .66, .08, 1.9, .08, wood, 3); if (wt === 'axe') { p('box', .47, 1.62, 0, rx, ry, 0, .2, -.66, 1.3, .44, .05, .44, blade, 4, .2); p('box', .47, 1.62, 0, rx, ry, 0, .44, -.66, 1.3, .06, .04, .6, wglow || col(0xeef2f8), 4, wglow ? .8 : .4); } else { p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .62, .36, .42, steelC, 4); p('box', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .66, .12, .46, wglow || gold, 4, wglow ? .8 : 0); } }
  else if (wt === 'staff') {
    const len = wb === 4 ? 1.0 : 2.1, tip = wb === 4 ? .86 : 1.4; p('cyl', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, wb === 4 ? .36 : .25, .64, .07, len, .07, wood, 3); const oc = wglow || col(L.orb || 0x9ad0ff), act = o.act ? 1.6 : 1; p('gem', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, tip, .64, .26 * act, .32 * act, .26 * act, oc, 0, 2.2);
    const cr = Math.cos(rot), sr2 = Math.sin(rot), a1 = rx + 1.5708, oy = Math.cos(a1) * tip - Math.sin(a1) * .64, oz = Math.sin(a1) * tip + Math.cos(a1) * .64, wx = o.x + cr * .5 + sr2 * oz, wz = o.z - sr2 * .5 + cr * oz, wy = o.y + 1.75 + oy; GLX.halo(wx, wy, wz, 1.5 * act, oc, .6); if (self) GLX.light(wx, wy, wz, 6, oc, .7, 3);
  } else if (wt === 'bow') { const bc = wglow || wood; p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -.2, .7, .05, .7, .06, bc, 3, wglow ? .6 : 0); p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -1.0, .64, .05, .7, .06, bc, 3, wglow ? .6 : 0); p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -.62, .5, .015, 1.5, .015, col(0xe8e0d0)); }
  if (L.robe) for (let k = 0; k < 3; k++) { const a = G.time * 1.6 + k * 2.09; GLX.obj('glow', 'gem', o.x + Math.cos(a) * .95, o.y + 1.5 + Math.sin(a * 1.7) * .25, o.z + Math.sin(a) * .95, a, .12, .2, .12, col(L.orb), 1.5, .9); }
  if (cls === 'brawler') for (const sd of [1, -1]) p('box', .2 * sd, 1.0, -.2, lean + .3 + mv * .4 + sw2, 0, 0, 0, -.34, 0, .12, .6, .03, cloth);
  if (L.cape) { p('box', 0, 1.66, -.28, lean + .12 + mv * .3 + sw2, 0, 0, 0, -.36, 0, .78, .74, .05, cloth); p('box', 0, 1.66, -.28, lean + .22 + mv * .5 + sw2 * 2, 0, 0, 0, -1.0, -.06, .84, .62, .04, shade(cloth, .8)); p('box', 0, 1.7, -.26, lean, 0, 0, 0, 0, 0, .7, .08, .1, trim, 4, te); }
  if (self) GLX.light(o.x, 3, o.z, 15, col(G.zone.th.torch), 1.1, 10);
  if (spin) { for (let i = 0; i < 3; i++) { const a = G.time * 20 + i * 2.09; GLX.obj('glow', 'box', o.x + Math.sin(a) * 2.2, 1.2, o.z + Math.cos(a) * 2.2, a + 1.57, .16, .1, 3, col(0xfff0d0), 1, .7); } GLX.obj('glow', 'ring', o.x, .1, o.z, 0, o.spin.sk.r * 2, 1, o.spin.sk.r * 2, col(0xfff0d0), 1, .25, -1); }
  if (o.buffs && o.buffs.length) GLX.obj('glow', 'ring', o.x, .08, o.z, G.time, 2.4, 1, 2.4, col(0xffd84a), 1, .5, -1);
  if (o.flaskT > 0) GLX.halo(o.x, 1.4, o.z, 3.5, col(0xff3a3a), .5);
}
function drawEnemy(e) {
  const col = GLX.col, md = e.md, c = col(md.c), c2 = col(md.c2), ec = col(md.e); let sc = e.sc, y = 0;
  if (!e.alive) { const k = Math.max(0, e.deadT / .45); sc *= .3 + .7 * k; y = -(1 - k) * .8; }
  const em = e.flash > 0 ? 1.4 : 0, w = e.walk, sw = Math.sin(w), at = Math.max(0, e.atk), wind = e.st === 'wind' ? 1 : 0;
  GLX.base(BM, e.x, y, e.z, e.rot, sc); const p = (g, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, mat, ee) => GLX.part('dyn', g, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, ee === undefined ? em : ee, 1, mat || 0);
  const eyes = (ex, ey, ez, r) => { p('sphere', ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); p('sphere', -ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); };
  if (e.arch === 'grunt') {
    for (const sd of [1, -1]) { p('cyl', .16 * sd, .82, 0, sd * sw * .7, 0, 0, 0, -.2, 0, .2, .42, .22, c2); p('cyl', .16 * sd, .82, 0, sd * sw * .9, 0, 0, 0, -.6, .03, .16, .42, .17, c); }
    p('taper', 0, 1.18, .04, .35, 0, 0, 0, 0, 0, .56, -.72, .36, c, 3); p('sphere', 0, 1.0, 0, .3, 0, 0, 0, 0, 0, .5, .36, .36, c2); p('sphere', 0, 1.66, .2, .3, 0, 0, 0, 0, 0, .36, .4, .38, c, 3); p('box', 0, 1.52, .36, .5, 0, 0, 0, 0, 0, .2, .1, .12, c2);
    const arm = -1.3 - wind * 1.2 + at * 1.6; for (const sd of [1, -1]) { p('cyl', .35 * sd, 1.42, .08, arm + sd * sw * .15, 0, 0, 0, -.2, 0, .14, .4, .14, c2); p('cyl', .35 * sd, 1.42, .08, arm + sd * sw * .15 - .3, 0, 0, 0, -.55, 0, .11, .4, .11, c); }
    eyes(.09, 1.72, .36, .07);
    for (let k = 0; k < 3; k++) p('box', 0, 1.3 - k * .13, .2, .35, 0, 0, 0, 0, 0, .34, .035, .06, col(0xd8d0b8)); p('box', 0, 1.5, .44, .5, 0, 0, 0, 0, 0, .16, .06, .1, col(0x1a1210)); p('box', .2, 1.0, -.14, .5 + sw * .2, 0, .2, 0, -.26, 0, .16, .5, .03, c2); p('box', -.18, 1.0, .16, .1 - sw * .2, 0, 0, 0, -.24, 0, .2, .46, .03, c2); p('sphere', .3, 1.5, .02, 0, 0, 0, 0, 0, 0, .22, .18, .22, c2, 3); p('cone', -.12, 1.84, .1, -.3, 0, .4, 0, .08, 0, .06, .2, .06, col(0xd8d0b8));
  } else if (e.arch === 'swarm') {
    p('sphere', 0, .5, -.15, 0, 0, 0, 0, 0, 0, .8, .5, 1.2, c, 3); p('sphere', 0, .62, -.5, .3, 0, 0, 0, 0, 0, .6, .4, .7, c2, 3); p('sphere', 0, .56, .58 + at * .3, 0, 0, 0, 0, 0, 0, .46, .38, .5, c2);
    for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1, sz = (i >> 1) * .4 - .4; p('cyl', .34 * sd, .5, sz, (i % 2 ? sw : -sw) * .8, 0, -sd * .9, 0, -.3, 0, .07, .6, .07, c2); }
    p('cone', .12, .5, .84, 1.4, 0, 0, 0, .1, 0, .06, .26, .06, c); p('cone', -.12, .5, .84, 1.4, 0, 0, 0, .1, 0, .06, .26, .06, c); eyes(.12, .68, .76, .08);
    for (let k = 0; k < 4; k++) p('cone', 0, .72 - k * .03, .1 - k * .28, -.5, 0, 0, 0, .1, 0, .1, .3 - k * .03, .1, c2, 3); p('cone', 0, .5, -.74, -1.9, 0, 0, 0, .2, 0, .12, .5, .12, c, 3);
  } else if (e.arch === 'caster') {
    const fl = .25 + Math.sin(G.time * 2.5 + e.id) * .12; p('taper', 0, .85 + fl, 0, 0, 0, 0, 0, 0, 0, 1.05, 1.5, 1.05, c); p('taper', 0, 1.5 + fl, 0, 0, 0, 0, 0, 0, 0, .7, .5, .6, c2); p('sphere', 0, 1.9 + fl, .02, 0, 0, 0, 0, 0, 0, .38, .42, .4, col(0x1a1a1a));
    p('cone', 0, 2.1 + fl, -.06, -.35, 0, 0, 0, .12, 0, .56, .7, .56, c);
    for (const sd of [1, -1]) p('cyl', .38 * sd, 1.55 + fl, 0, -1.4 - wind * .8, 0, 0, 0, -.3, 0, .13, .6, .13, c);
    eyes(.08, 1.92 + fl, .2, .06); p('box', 0, 1.78 + fl, .2, 0, 0, 0, 0, 0, 0, .14, .06, .05, col(0xd8d0b8)); p('cyl', 0, 1.22 + fl, 0, 0, 0, 0, 0, 0, 0, .78, .08, .78, c2, 4); p('box', 0, .9 + fl, .44, .1, 0, 0, 0, 0, 0, .16, 1.0, .04, c2); for (let k = 0; k < 5; k++) { const a = k * 1.256; p('cone', Math.cos(a) * .44, .2 + fl, Math.sin(a) * .44, 3.14, 0, 0, 0, 0, 0, .2, .4, .2, c); } for (const sd of [1, -1]) p('sphere', .38 * sd, 1.58 + fl, 0, 0, 0, 0, 0, 0, 0, .3, .24, .3, c2);
    const ox = e.x + Math.sin(e.rot) * .8 * sc, oz = e.z + Math.cos(e.rot) * .8 * sc, s = .3 + wind * .35; GLX.obj('glow', 'sphere', ox, (1.5 + fl) * sc, oz, 0, s, s, s, ec, 1.5, 1); GLX.halo(ox, (1.5 + fl) * sc, oz, 1.6 + wind * 1.4, ec, .5);
  } else if (e.arch === 'brute') {
    for (const sd of [1, -1]) p('cyl', .3 * sd, .72, 0, sd * sw * .5, 0, 0, 0, -.36, 0, .38, .72, .4, c2, 3);
    p('sphere', 0, 1.25, 0, .2, 0, 0, 0, 0, 0, 1.15, 1.05, .85, c, 3); p('sphere', 0, 1.62, -.22, 0, 0, 0, 0, 0, 0, 1.1, .7, .8, c2, 2); p('sphere', 0, 1.8, .3, 0, 0, 0, 0, 0, 0, .44, .4, .44, c, 3);
    const arm = -.2 - wind * 2.6 + at * 2.4; for (const sd of [1, -1]) { p('cyl', .7 * sd, 1.55, 0, arm + sd * sw * .2, 0, -sd * .15, 0, -.4, 0, .36, .8, .38, c, 3); p('sphere', .7 * sd, 1.55, 0, arm + sd * sw * .2, 0, -sd * .15, 0, -.95, 0, .5, .5, .5, c2, 3); }
    eyes(.11, 1.84, .5, .08); for (const sd of [1, -1]) { p('cone', .16 * sd, 1.7, .5, 1.2, 0, 0, 0, .08, 0, .08, .24, .08, col(0xe8e0c8)); p('cone', .5 * sd, 1.9, -.2, -.4, 0, -sd * .5, 0, .2, 0, .2, .5, .2, c2, 3); p('sphere', .3 * sd, .72, 0, sd * sw * .5, 0, 0, 0, -.5, .14, .34, .22, .34, c, 3); } for (let k = 0; k < 3; k++) p('cone', 0, 1.9 - k * .2, -.5 - k * .04, -.9, 0, 0, 0, .14, 0, .16, .4, .16, c2, 3); p('sphere', 0, 1.02, .34, 0, 0, 0, 0, 0, 0, .8, .6, .4, col(0x8a8468), 3);
  } else if (e.arch === 'bomber') {
    const pu = 1 + wind * .35 * Math.sin(G.time * 40); p('sphere', 0, .8, 0, 0, 0, 0, 0, 0, 0, pu, pu, pu, c, 3, em + .3 + wind * 2); for (const sd of [1, -1]) p('cyl', .2 * sd, .35, 0, sd * sw, 0, 0, 0, -.18, 0, .14, .4, .14, c2);
    p('sphere', 0, .9, .44, 0, 0, 0, 0, 0, 0, .3, .2, .1, ec, 0, 3);
  } else { // boss
    p('taper', 0, 1, 0, 0, 0, 0, 0, 0, 0, 1.6, 2, 1.6, c2, 3); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; p('cone', Math.cos(a) * .6, .3, Math.sin(a) * .6, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2, 0, .5, 0, .4, 1.3, .4, c2, 3); }
    p('sphere', 0, 1.9, 0, 0, 0, 0, 0, 0, 0, 1.5, 1.2, 1.3, c2, 3); p('sphere', 0, 2.1, -.2, 0, 0, 0, 0, 0, 0, 1.7, 1, 1.4, c, 2); p('sphere', 0, 2.55, .25, 0, 0, 0, 0, 0, 0, .7, .66, .7, c2, 3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; p('cone', Math.cos(a) * .3, 2.85, Math.sin(a) * .3, Math.sin(a) * .7, 0, -Math.cos(a) * .7, 0, .3, 0, .16, .9, .16, c2, 3); }
    const arm = -.5 - wind * 2.3 + at * 2.2; for (const sd of [1, -1]) { p('taper', .95 * sd, 2.1, 0, arm + sd * sw * .2, 0, -sd * .25, 0, -.7, 0, .42, -1.6, .42, c2, 3); p('sphere', .95 * sd, 2.1, 0, arm + sd * sw * .2, 0, -sd * .25, 0, -1.55, 0, .7, .6, .7, c, 2); }
    eyes(.17, 2.62, .55, .13); for (let k = 0; k < 6; k++) { const a = k * 1.05 + .4; p('box', Math.cos(a) * .72, 1.0 + (k % 3) * .4, Math.sin(a) * .72, 0, -a, 0, 0, 0, 0, .1, .5, .34, c, 3); p('box', Math.cos(a + .5) * .66, .7 + (k % 2) * .7, Math.sin(a + .5) * .66, 0, -a, 0, 0, 0, 0, .05, .5, .05, ec, 0, 1.6); } p('box', 0, 2.4, .56, .2, 0, 0, 0, 0, 0, .34, .08, .1, col(0x120c08)); for (const sd of [1, -1]) p('sphere', .5 * sd, 2.5, -.3, 0, 0, 0, 0, 0, 0, .7, .5, .6, c, 2);
    if (e.alive) { GLX.light(e.x, 3, e.z, 12, ec, .8, 5); GLX.obj('glow', 'ring', e.x, .07, e.z, G.time * .5, 6, 1, 6, ec, 1, .35, -1); }
  }
  if (e.alive && e.elite === 1) GLX.obj('glow', 'ring', e.x, .07, e.z, G.time, 2.6, 1, 2.6, col(0x5a8cff), 1, .7, -1);
  if (e.alive && e.elite === 2) { GLX.obj('glow', 'ring', e.x, .07, e.z, G.time, 3, 1, 3, col(0xffd84a), 1, .8, -1); GLX.light(e.x, 2, e.z, 7, col(0xffd84a), .5, 2); }
  if (e.burnT > 0 && e.alive) GLX.halo(e.x, 1.2 * sc, e.z, 1.8, col(0xff7a2a), .35);
}
function drawItemModel(d, hop) {
  const it = d.item, col = GLX.col, rc = col(RC[it.rar]), steel = col(0xaab2c0), wood = col(0x6a4a2a), leather = col(0x5c4230), gold = col(0xc9a030), cloth = col(0x6a5a8a), em = it.rar ? .1 : 0;
  GLX.base(BM, d.x, .1 + hop, d.z, G.time * .7 + d.x * 3, 1.25);
  const p = (g, px, py, pz, rx, ry, rz, sx, sy, sz, c, mat, e) => GLX.part('dyn', g, BM, px, py, pz, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, e === undefined ? em : e, 1, mat || 0), H = 1.5708;
  const sl = it.slot, wt = it.wt, b = it.base || '';
  if (sl === 'weapon') {
    if (wt === 'sword') { p('box', 0, .06, .28, 0, 0, 0, .12, .04, 1.15, steel, 4); p('box', 0, .06, -.32, 0, 0, 0, .42, .07, .08, rc, 4); p('cyl', 0, .06, -.5, H, 0, 0, .08, .3, .08, leather); p('sphere', 0, .06, -.68, 0, 0, 0, .13, .13, .13, rc, 4); }
    else if (wt === 'axe') { p('cyl', 0, .07, 0, H, 0, 0, .08, 1.3, .08, wood, 3); p('box', .2, .07, .42, 0, 0, 0, .42, .05, .4, steel, 4); p('box', .42, .07, .42, 0, 0, 0, .06, .04, .56, rc, 4); }
    else if (wt === 'maul') { p('cyl', 0, .1, -.1, H, 0, 0, .09, 1.3, .09, wood, 3); p('box', 0, .16, .5, 0, 0, 0, .56, .32, .36, steel, 4); p('box', 0, .16, .5, 0, 0, 0, .6, .1, .4, rc, 4); }
    else if (wt === 'bow') { p('box', .1, .06, .36, 0, .32, 0, .06, .06, .78, wood, 3); p('box', .1, .06, -.36, 0, -.32, 0, .06, .06, .78, wood, 3); p('box', -.02, .06, 0, 0, 0, 0, .015, .015, 1.4, col(0xe8e0d0)); p('box', .21, .06, 0, 0, 0, 0, .09, .08, .26, rc, 4); }
    else if (wt === 'fist') { for (const sd of [1, -1]) { p('box', .2 * sd, .1, 0, 0, 0, 0, .26, .18, .34, leather); p('box', .2 * sd, .14, .16, 0, 0, 0, .28, .08, .08, steel, 4); for (let k = 0; k < 3; k++) p('cone', .2 * sd + (k - 1) * .08, .16, .24, H, 0, 0, .06, .14, .06, rc, 4); } }
    else { p('cyl', 0, .07, 0, H, 0, 0, .07, b === 'Wand' ? .8 : 1.7, .07, wood, 3); const z = b === 'Wand' ? .46 : .92; p('gem', 0, .12, z, 0, G.time * 2, 0, .26, .3, .26, rc, 0, 1.6); p('cyl', 0, .07, z - .16, H, 0, 0, .12, .1, .12, gold, 4); }
  } else if (sl === 'offhand') {
    if (b === 'Shield') { p('cyl', 0, .1, 0, 0, 0, 0, .9, .1, .9, wood, 3); p('cyl', 0, .14, 0, 0, 0, 0, .96, .04, .96, steel, 4); p('sphere', 0, .18, 0, 0, 0, 0, .3, .16, .3, rc, 4); }
    else if (b === 'Quiver') { p('cyl', 0, .14, 0, H, 0, 0, .26, .8, .26, leather); for (let k = 0; k < 3; k++) p('box', (k - 1) * .07, .16, .56, 0, 0, 0, .03, .03, .4, k === 1 ? rc : wood); }
    else if (b === 'Orb') { p('sphere', 0, .32, 0, 0, 0, 0, .5, .5, .5, rc, 0, 1.2); p('cyl', 0, .06, 0, 0, 0, 0, .4, .1, .4, gold, 4); }
    else if (b === 'Tome') { p('box', 0, .1, 0, 0, 0, 0, .56, .16, .74, leather); p('box', 0, .1, 0, 0, 0, 0, .5, .12, .78, col(0xe8e0c8)); p('box', 0, .19, 0, 0, 0, 0, .2, .02, .2, rc, 4); }
    else { p('gem', 0, .3, 0, 0, G.time, 0, .4, .56, .4, rc, 0, 1.2); p('ring', 0, .04, 0, 0, 0, 0, .7, 1, .7, gold, 4); }
  } else if (sl === 'shoulders') { for (const sd of [1, -1]) { p('sphere', .24 * sd, .16, 0, 0, 0, 0, .44, .3, .5, b === 'Pauldrons' ? steel : leather, b === 'Pauldrons' ? 4 : 0); p('box', .24 * sd, .08, 0, 0, 0, 0, .46, .06, .52, rc, 4); } }
  else if (sl === 'bracers') { for (const sd of [1, -1]) { p('cyl', .18 * sd, .12, 0, H, 0, 0, .24, .5, .2, b === 'Vambraces' ? steel : leather, b === 'Vambraces' ? 4 : 0); p('cyl', .18 * sd, .12, .22, H, 0, 0, .27, .07, .23, rc, 4); } }
  else if (sl === 'belt') { p('cyl', 0, .08, 0, 0, 0, 0, .8, .14, .56, b === 'War Belt' ? leather : cloth); p('box', 0, .1, .28, 0, 0, 0, .22, .18, .06, rc, 4); }
  else if (sl === 'pants') { const m = b === 'Plate Tassets' ? steel : leather, mt = b === 'Plate Tassets' ? 4 : 0; p('box', 0, .1, -.3, 0, 0, 0, .54, .14, .2, m, mt); for (const sd of [1, -1]) p('box', .14 * sd, .1, .12, 0, sd * .08, 0, .24, .13, .7, m, mt); p('box', 0, .12, -.3, 0, 0, 0, .58, .06, .1, rc, 4); }
  else if (sl === 'helm') {
    const m = b === 'Iron Helm' ? steel : b === 'Circlet' ? gold : leather, mt = b === 'Leather Hood' ? 0 : 4;
    if (b === 'Circlet') { p('cyl', 0, .14, 0, 0, 0, 0, .5, .12, .5, gold, 4); p('gem', 0, .2, .26, 0, 0, 0, .14, .16, .1, rc, 0, 1.4); }
    else { p('sphere', 0, .24, 0, 0, 0, 0, .56, .5, .58, m, mt); p('cyl', 0, .08, 0, 0, 0, 0, .6, .12, .62, m, mt); p('box', 0, .16, .29, 0, 0, 0, .07, .26, .06, rc, 4); p('cone', 0, .56, -.06, -.4, 0, 0, .1, .34, .16, rc); }
  } else if (sl === 'chest') {
    const m = b === 'Chainmail' ? steel : b === 'Silk Robe' ? cloth : leather, mt = b === 'Chainmail' ? 4 : 0;
    p('taper', 0, .14, 0, H, 0, 0, .7, -.76, .3, m, mt); p('sphere', .34, .14, .3, 0, 0, 0, .3, .26, .3, m, mt); p('sphere', -.34, .14, .3, 0, 0, 0, .3, .26, .3, m, mt); p('box', 0, .3, .12, 0, 0, 0, .16, .05, .16, rc, 4); p('box', 0, .16, -.34, 0, 0, 0, .56, .2, .1, rc, 4);
  } else if (sl === 'gloves') {
    const m = b === 'Gauntlets' ? steel : leather, mt = b === 'Gauntlets' ? 4 : 0;
    for (const sd of [1, -1]) { p('box', .2 * sd, .09, .1, 0, sd * .2, 0, .24, .14, .34, m, mt); p('cyl', .2 * sd, .09, -.16, H, sd * .2, 0, .26, .22, .2, m, mt); p('box', .2 * sd, .09, -.28, 0, sd * .2, 0, .3, .17, .06, rc, 4); p('box', .34 * sd, .08, .04, 0, sd * .7, 0, .09, .1, .2, m, mt); }
  } else if (sl === 'boots') {
    const m = b === 'Greaves' ? steel : leather, mt = b === 'Greaves' ? 4 : 0;
    for (const sd of [1, -1]) { p('box', .18 * sd, .08, .1, 0, 0, 0, .2, .15, .46, m, mt); p('cyl', .18 * sd, .28, -.06, 0, 0, 0, .22, .44, .22, m, mt); p('cyl', .18 * sd, .5, -.06, 0, 0, 0, .25, .07, .25, rc, 4); }
  } else if (sl === 'amulet') {
    p('ring', 0, .04, -.05, 0, 0, 0, .62, 1, .7, gold, 4); p('ring', 0, .05, -.05, 0, 0, 0, .56, 1, .64, gold, 4); p('gem', 0, .1, .32, 0, G.time * 2, 0, .2, .24, .2, rc, 0, 1.6); p('cyl', 0, .05, .32, 0, 0, 0, .26, .05, .26, gold, 4);
  } else { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; p('sphere', Math.cos(a) * .17, .07, Math.sin(a) * .17, 0, 0, 0, .09, .1, .09, gold, 4); } p('gem', 0, .16, .19, 0, G.time * 2, 0, .15, .18, .15, rc, 0, 1.6); }
}
const BEAM = [0, 3.2, 6.5, 12], RC = [0xc9c9c9, 0x5a8cff, 0xffd84a, 0xff8a2a];
function drawWorld() {
  const col = GLX.col, Z = G.zone;
  const sh = G.set.shake ? G.shake * G.shake * 1.5 : 0, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
  GLX.env.player = [P.x, 0, P.z]; GLX.env.t = G.time; const zf = innerWidth < innerHeight ? 1.3 : 1; GLX.setCamera([P.x + sx, 25 * G.zoom * zf + sz, P.z + 18 * G.zoom * zf], [P.x + sx, 1, P.z + sz], .66);
  drawHero(P, true); if (G.online && !G.inTown) for (const id in NET.peers) { const q = NET.peers[id]; if (!q.dead) drawHero(q, false); }
  for (const e of G.ents) { if (Math.abs(e.x - P.x) > 34 || Math.abs(e.z - P.z) > 34) continue; drawEnemy(e); }
  for (const L of Z.lamps) { const d = Math.hypot(L.x - P.x, L.z - P.z); if (d > 32) continue; const c = col(L.big ? 0xff9a3a : Z.th.lamp), fl = 1 + Math.sin(G.time * 9 + L.x) * .08; GLX.light(L.x, L.big ? 2.2 : 1.2, L.z, L.big ? 13 : 7, c, (L.big ? 1.3 : .8) * fl); GLX.halo(L.x, L.big ? 1.6 : .5, L.z, L.big ? 3.2 : 1.8, c, .4 * fl); }
  for (const o of Z.objs) {
    if (Math.hypot(o.x - P.x, o.z - P.z) > 34) continue; const hov = G.hoverObj === o ? .5 : 0;
    if (o.kind === 'vendor') { NPCV.x = o.x; NPCV.z = o.z - 1.1; NPCV.rot = Math.atan2(P.x - NPCV.x, P.z - NPCV.z); drawHero(NPCV, false); if (hov) GLX.obj('glow', 'ring', o.x, .07, o.z, G.time, 4.6, 1, 4.6, col(0xffd84a), 1, .5, -1); continue; }
    if (o.kind === 'stash') { GLX.halo(o.x, 1.4, o.z + .8, 2 + hov * 2, col(0xffd84a), .3 + hov * .4); continue; }
    if (o.kind === 'altar') { const c = col(0xff7a2a); GLX.obj('dyn', 'gem', o.x, 2.5 + Math.sin(G.time * 2) * .15, o.z, G.time, .6, .9, .6, c, 2 + hov * 2); GLX.halo(o.x, 2.5, o.z, 3.4, c, .6); GLX.light(o.x, 2.6, o.z, 10, c, 1.1, 4); continue; }
    if (o.kind === 'tportal') { const c = col(0x7ad0ff); for (let i = 0; i < 3; i++) GLX.obj('glow', 'ring', o.x, .1 + i * .9 + Math.sin(G.time * 2 + i) * .2, o.z, G.time * (1 + i), 3 - i * .5, 1, 3 - i * .5, c, 1, .9, -1); GLX.halo(o.x, 1.6, o.z, 5, c, .6); GLX.light(o.x, 2, o.z, 12, c, 1.4, 4); continue; }
    if (o.kind === 'chest') { GLX.obj('dyn', 'box', o.x, .4, o.z, .4, 1.4, .8, .9, col(0x5a3a22), hov, 1, 3); GLX.obj('dyn', 'box', o.x, .85, o.z, .4, 1.5, o.used ? .1 : .3, 1, col(0x8a6a2a), hov + .05, 1, 4); GLX.obj('dyn', 'box', o.x, .5, o.z, .4, .2, .9, .96, col(0x8a6a2a), hov, 1, 4); if (!o.used) GLX.halo(o.x, 1.2, o.z, 2.4, col(0xffd84a), .35 + Math.sin(G.time * 3) * .1); }
    else if (o.kind === 'shrine') { GLX.obj('dyn', 'taper', o.x, 1, o.z, 0, 1.1, 2, 1.1, col(0x5a5c60), hov, 1, 3); if (!o.used) { const c = col(o.sh.c); GLX.obj('dyn', 'gem', o.x, 2.7 + Math.sin(G.time * 2) * .2, o.z, G.time, .6, .9, .6, c, 2); GLX.halo(o.x, 2.7, o.z, 3, c, .6); GLX.light(o.x, 2.6, o.z, 9, c, 1); } }
    else if (o.kind === 'stash' || o.kind === 'vendor' || o.kind === 'altar') UI.openTown(o.kind);
  else if (o.kind === 'tportal') leaveTown();
  else if (o.kind === 'portal') { const c = col(0x7ad0ff); for (let i = 0; i < 3; i++) GLX.obj('glow', 'ring', o.x, .1 + i * .9 + Math.sin(G.time * 2 + i) * .2, o.z, G.time * (1 + i), 3 - i * .5, 1, 3 - i * .5, c, 1, .9, -1); GLX.halo(o.x, 1.6, o.z, 5, c, .6); GLX.light(o.x, 2, o.z, 12, c, 1.4, 4); }
  }
  for (const d of G.drops) {
    if (Math.hypot(d.x - P.x, d.z - P.z) > 32) continue; const hop = Math.max(0, Math.sin(Math.min(1, d.t * 2.5) * Math.PI)) * 1.6;
    if (d.globe) { const gc = col(0xff2a2a); GLX.obj('dyn', 'sphere', d.x, .6 + Math.sin(G.time * 3 + d.x) * .12, d.z, 0, .7, .7, .7, gc, 1.6); GLX.halo(d.x, .6, d.z, 2.2, gc, .5); GLX.light(d.x, 1, d.z, 4, gc, .6); continue; }
    if (d.gold) { GLX.obj('dyn', 'cyl', d.x, .1 + hop, d.z, 0, .5, .14, .5, col(0xffc83a), .6); GLX.halo(d.x, .3 + hop, d.z, .9, col(0xffd84a), .3); continue; }
    const r = d.item.rar, c = col(RC[r]); drawItemModel(d, hop);
    if (r > 0) { const h = BEAM[r], p = .8 + Math.sin(G.time * 4 + d.x) * .2; GLX.obj('glow', 'box', d.x, h / 2, d.z, .78, .14 + r * .05, h, .14 + r * .05, c, 1, .55 * p); GLX.halo(d.x, .4, d.z, 1.4 + r * .9, c, .55 * p); GLX.obj('glow', 'ring', d.x, .06, d.z, G.time, 1.2 + r * .4, 1, 1.2 + r * .4, c, 1, .7, -1); if (r >= 2) GLX.light(d.x, 1.5, d.z, 5 + r * 2, c, .7 + r * .2, r); }
  }
  let pl = 0;
  for (const p of G.pp) {
    if (p.arrow) { GLX.obj('dyn', 'box', p.x, 1.25, p.z, p.rot, .05, .05, 1.2, col(0xd8c8a0), .3); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .9, 1.25, p.z - Math.cos(p.rot) * .9, p.rot, .05, .05, 1.6, p.c, 1, .35); }
    else { const s = p.r * 1.5; GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, s, s, s, p.c, 1.8, 1); GLX.halo(p.x, 1.25, p.z, p.r * 5.5, p.c, .6); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .8, 1.25, p.z - Math.cos(p.rot) * .8, p.rot, p.r * .5, p.r * .5, 1.6, p.c, 1, .4); if (pl++ < 3) GLX.light(p.x, 1.5, p.z, 6, p.c, .8, 1); }
  }
  for (const p of G.projs) { GLX.obj('glow', 'sphere', p.x, 1.2, p.z, 0, p.r * 1.6, p.r * 1.6, p.r * 1.6, p.c, 1.6, 1); GLX.halo(p.x, 1.2, p.z, p.r * 5, p.c, .6); }
  for (const a of G.areas) {
    const c = col(a.c), k = clamp(a.t / a.delay, 0, 1), d = a.r * 2;
    GLX.obj('glow', 'ring', a.x, .09, a.z, 0, d, 1, d, c, 1, a.owner === 'e' ? .9 : .5, -1); GLX.obj('glow', 'disc', a.x, .08, a.z, 0, d * k, 1, d * k, c, 1, a.owner === 'e' ? .35 : .2, 0);
  }
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.ring) { const r = (f.r0 + (f.r1 - f.r0) * (1 - k)) * 2; GLX.obj('glow', 'ring', f.x, .12, f.z, 0, r, 1, r, f.c, 1, k, -1); GLX.obj('glow', 'disc', f.x, .1, f.z, 0, r, 1, r, f.c, 1, k * .25, 1); }
    else if (f.bolt) { const dx = f.x2 - f.x1, dz = f.z2 - f.z1, L = Math.hypot(dx, dz), a = Math.atan2(dx, dz); for (let j = 0; j < 2; j++) GLX.obj('glow', 'box', (f.x1 + f.x2) / 2 + (Math.random() - .5) * .4, 1.3 + (Math.random() - .5) * .4, (f.z1 + f.z2) / 2 + (Math.random() - .5) * .4, a + (Math.random() - .5) * .08, .12, .12, L, f.c, 1.6, k); GLX.halo(f.x2, 1.3, f.z2, 2.4, f.c, k * .8); }
    else if (f.slash) { for (let i = 0; i < 7; i++) { const a = f.rot + (i / 6 - .5) * f.arc * (1.2 - k * .4), rr = f.r * .82; GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, 1.25, f.z + Math.cos(a) * rr, a + 1.5708, .12, .08, f.r * .62, f.c, 1, k * .9); } }
    else GLX.obj('glow', 'gem', f.x, f.y, f.z, f.life * 9, f.size, f.size, f.size, f.c, 1, k);
  }
  if (GPS.pts.length > 1 && G.set.gps) { const c = col(0xffd84a); let acc = (G.time * 3) % 1.6, tot = 0; for (let i = 1; i < GPS.pts.length && tot < 34; i++) { const a = GPS.pts[i - 1], b = GPS.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ry = Math.atan2(b[0] - a[0], b[1] - a[1]); while (acc < L && tot + acc < 34) { const t = acc / L, k = 1 - (tot + acc) / 34; if (tot + acc > 1.6) GLX.obj('glow', 'cone', a[0] + (b[0] - a[0]) * t, .1, a[1] + (b[1] - a[1]) * t, ry, .5, .04, .9, c, 1, .75 * k); acc += 1.6; } acc -= L; tot += L; } }
  if (P.move && !P.atk) GLX.obj('glow', 'ring', P.move[0], .06, P.move[1], 0, .8, 1, .8, col(0xffffff), 1, .25, -1);
  if (G.hover && G.hover.alive) GLX.obj('glow', 'ring', G.hover.x, .06, G.hover.z, 0, G.hover.r * 2.6, 1, G.hover.r * 2.6, col(0xff5a4a), 1, .7, -1);
}
