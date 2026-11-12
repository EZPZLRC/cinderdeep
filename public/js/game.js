'use strict';
// ---------- utils ----------
let _s = 1; function srand(s) { _s = (s >>> 0) || 1; }
function sr() { _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rnd = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CS = 3, GW = 60, SAVE_KEY = 'cinderdeep_save_v1';
const G = { set: { vol: 70, gfx: 'auto', shake: true, nums: true, map: true, gps: true, joy: true, autoLoot: true, chat: true, shadows: true, scale: 100, fps: false, ally: true, apSkill: true, apPot: true }, pp: [], online: false, auto: false, speed: 1, state: 'menu', hero: null, zone: null, time: 0, ents: [], projs: [], areas: [], drops: [], fx: [], texts: [], timers: [], shake: 0, zoom: .72, boss: null, hover: null, hoverObj: null, eid: 0, streak: 0, streakT: 0, bestStreak: 0, labels: [], hints: [], hitSfx: 0 };
const P = { x: 0, z: 0, y: 0, rot: 0, hp: 1, mana: 1, stats: {}, cds: {}, buffs: [], act: null, spin: null, dash: null, move: null, atk: null, inter: null, pick: null, walk: 0, mv: 0, moving: false, iframes: 0, cheatCd: 0, flaskT: 0, dead: false, hurt: 0, oomT: 0, swing: 0 };
const IN = { sx: 0, sy: 0, gx: 0, gz: 0, lmb: false, rmb: false, keys: {}, shift: false, lmbFresh: false, touch: false, tb: [false, false, false, false], joy: { on: false, x: 0, z: 0 } };
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
        case 'drop4': [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .9, 'triangle', .13, 1, i * .08)); tone(2637, 1.6, 'sine', .07, 1, .5); tone(131, 1.4, 'sine', .12); break;
        case 'drop3': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .7, 'triangle', .13, 1, i * .09)); tone(2093, 1.2, 'sine', .06, 1, .45); break;
        case 'level': [392, 523, 659, 784].forEach((f, i) => tone(f, .5, 'square', .06, 1, i * .1)); break;
        case 'flask': tone(300, .3, 'sine', .12, 2); break;
        case 'boss': tone(55, 1.4, 'sawtooth', .16, .7); noise(1.2, .12, 240); break;
        case 'shrine': [440, 554, 659].forEach((f, i) => tone(f, .8, 'sine', .09, 1, i * .05)); break;
        case 'die': tone(200, 1, 'sawtooth', .14, .25); break;
      }
    } catch (e) { }
  }
  // ambient bed: filtered noise that breathes like wind, plus sparse one-shots that suit the zone
  let amb = null, ambT = 2, ambKind = '', ambLvl = 0;
  const setAmb = () => { if (amb && ac) amb.g.gain.setTargetAtTime(mute ? 0 : ambLvl * master, ac.currentTime, .8); };
  function ambient(kind) {
    ambKind = kind || ''; const a = ctx(); if (!a) return;
    if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    if (!amb) { try { const src = a.createBufferSource(); src.buffer = nb; src.loop = true; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; const g = a.createGain(); g.gain.value = 0; src.connect(lp); lp.connect(g); g.connect(a.destination); src.start(); const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .09; lg.gain.value = 110; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); amb = { lp, g }; } catch (e) { amb = null; return; } }
    const p = { forest: [520, .05], town: [420, .032], crypt: [190, .06], lava: [150, .085], ice: [900, .055], void: [260, .05] }[ambKind] || [300, .04];
    amb.lp.frequency.setTargetAtTime(p[0], a.currentTime, 1.2); ambLvl = p[1]; setAmb();
  }
  function ambTick(dt) {
    if (!ac || mute || !ambKind) return; ambT -= dt; if (ambT > 0) return; ambT = 1.6 + Math.random() * 4.5; const k = ambKind;
    if (k === 'forest' || k === 'town') { if (Math.random() < .6) { const f = 3300 + Math.random() * 900; for (let i = 0; i < 3; i++) tone(f, .05, 'sine', .011, 1.02, i * .09); } else { const f = 1500 + Math.random() * 700; tone(f, .16, 'sine', .014, 1.25); tone(f * 1.2, .12, 'sine', .012, .85, .2); } }
    else if (k === 'crypt') { tone(900 + Math.random() * 600, .09, 'sine', .028, .5); if (Math.random() < .3) tone(55, 2.4, 'sine', .03, .97); }
    else if (k === 'lava') { noise(.05 + Math.random() * .08, .045, 900 + Math.random() * 1500); if (Math.random() < .4) tone(48, 1.8, 'sawtooth', .018, .8); }
    else if (k === 'ice') tone(2200 + Math.random() * 1400, .5, 'sine', .009, .97);
    else tone(70 + Math.random() * 30, 2.5, 'sine', .028, 1.1);
  }
  return { unlock: ctx, play, ambient, ambTick, toggle() { mute = !mute; setAmb(); return mute; }, vol(v) { master = v; mute = v <= 0; setAmb(); } };
})();

// ---------- items ----------
function affixVal(a, ilvl) { let v = a[1] + Math.random() * (a[2] - a[1]); if (a[3] === 'f') v *= Math.pow(1.085, ilvl); else if (a[3] === 'p') v *= 1 + Math.min(ilvl, 60) * .02; return Math.max(1, Math.round(v)); }
function rollAffix(it) { const have = new Set(it.aff.map(a => a.k)), as = AFF_ALIAS[it.slot] || it.slot; const pool = AFFIX.filter(a => a[4].split(' ').includes(as) && !have.has(a[0])); if (!pool.length) return false; const a = pick(pool); it.aff.push({ k: a[0], v: affixVal(a, it.ilvl) }); return true; }
function makeItem(ilvl, slot, rar, baseName) {
  slot = slot || pick(DROP_SLOTS);
  const it = { id: itemId++, slot, rar, ilvl, aff: [] };
  if (slot === 'weapon') { const b = (baseName && WEAPONS.find(w => w.n === baseName)) || pick(G.hero ? WEAPONS.filter(w => CLASSES[G.hero.cls].wts.includes(w.t)) : WEAPONS); const k = Math.pow(1.11, ilvl) * (1 + rar * .1); it.base = b.n; it.dmg = [Math.max(1, Math.round(b.d[0] * k)), Math.max(2, Math.round(b.d[1] * k))]; it.spd = b.s; it.wt = b.t; }
  else if (slot === 'offhand') { const oc = G.hero ? G.hero.cls : 'warden', b = OFFHAND[oc]; it.base = b.n; it.oc = oc; if (b.a) it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
  else if (ARMOR[slot]) { const b = pick(ARMOR[slot]); it.base = b.n; it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
  else it.base = pick(JEWEL[slot]);
  const n = rar === 0 ? 0 : rar === 1 ? rint(1, 2) : rar === 2 ? rint(3, 5) : rar === 3 ? rint(4, 5) : 6;
  for (let i = 0; i < n; i++) rollAffix(it);
  if (rar === 4) for (const a of it.aff) a.v = Math.round(a.v * 1.25);
  if (rar >= 3) { { const al = AFF_ALIAS[slot] || slot, ps = Object.keys(POWERS).filter(p => POWERS[p].slots.includes(slot) || POWERS[p].slots.includes(al)); it.power = pick(ps.length ? ps : Object.keys(POWERS)); } it.name = POWERS[it.power].n; }
  it.sd = (Math.random() * 2147483646 | 0) + 1; const L = itemLook(it), r = L.r;
  if (rar >= 3) it.name = it.name + ', ' + I_EPI[r() * I_EPI.length | 0];
  else if (rar === 2) it.name = RN1[r() * RN1.length | 0] + RN2[r() * RN2.length | 0].toLowerCase() + ', ' + L.mat[0] + ' ' + it.base;
  else if (rar === 1) it.name = MAGPRE[r() * MAGPRE.length | 0] + ' ' + it.base + ' of ' + I_OF[r() * I_OF.length | 0];
  else it.name = I_WEAR[r() * I_WEAR.length | 0] + ' ' + L.mat[0] + ' ' + it.base;
  return it;
}
// what an item is made of and where it came from, all from its seed, so no two are alike
function itemKind(it) { const b = it.base || ''; return it.slot === 'amulet' || it.slot === 'ring' || /Circlet|Charm|Orb/.test(b) ? 'jewel' : /Leather|Hood|Quiver|Belt/.test(b) ? 'leather' : /Silk|Sash|Robe|Tome/.test(b) ? 'cloth' : it.wt === 'bow' || it.wt === 'staff' ? 'wood' : 'metal'; }
function itemLook(it) {
  if (!it.sd) { let h = 7; const k = (it.name || '') + '|' + it.ilvl + '|' + it.slot + '|' + it.aff.map(a => a.k + a.v).join(); for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 2147483646; it.sd = h + 1; }
  let s = it.sd; const r = () => (s = (s * 48271) % 2147483647) / 2147483647; r(); r();
  const kind = itemKind(it), mat = I_MAT[kind][r() * I_MAT[kind].length | 0], acc = I_ACC[r() * I_ACC.length | 0], gem = I_GEM[r() * I_GEM.length | 0];
  const v = [r(), r(), r(), r()], lore = I_VERB[kind][r() * 4 | 0] + ' in ' + I_PLACE[r() * I_PLACE.length | 0] + ' by ' + I_MAKER[r() * I_MAKER.length | 0] + '.', note = I_NOTE[r() * I_NOTE.length | 0];
  return { kind, mat, acc, gem, v, lore, note, r };
}
function itemValue(it) { return Math.round((5 + it.ilvl * 3) * [1, 2.5, 6, 25, 80][it.rar]); }
function luck() { return (P.stats.mf || 0) + Math.min(G.streak, 50) * 2; }
const MYTHIC_CHANCE = .05; // a Legendary drop has this chance to be Mythic instead; no other drop rate moves
function rollRarity(bonus) {
  const mf = luck() / 100; const w = [62, 30 * (1 + mf), 7.5 * (1 + mf * 1.2) * (1 + bonus), .5 * (1 + mf * 1.5) * (1 + bonus * 2)];
  let r = Math.random() * (w[0] + w[1] + w[2] + w[3]); for (let i = 0; i < 4; i++) { if (r < w[i]) return i === 3 && Math.random() < MYTHIC_CHANCE ? 4 : i; r -= w[i]; } return 0;
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
  if (sl === 'ring') sl = 'ring1'; // one ring only else if (want && want !== sl) return false;
  const old = h.eq[sl] || null; h.inv[i] = null; if (old && !bagPut(h.inv, old, i)) { h.inv[i] = it; hint('No room in the bag to swap that.'); return false; }
  h.eq[sl] = it; goalDone('equip'); computeStats(); if (sl === 'weapon' && typeof UI !== 'undefined' && UI.buildBar) UI.buildBar(); SFX.play('pickup'); saveGame(); return true;
}
function unequip(sl, at) { const h = G.hero, it = h.eq[sl]; if (!it) return; if (!addItem(it, at)) { hint('Inventory is full.'); return; } delete h.eq[sl]; computeStats(); if (sl === 'weapon' && typeof UI !== 'undefined' && UI.buildBar) { UI.buildBar(); hint('Unarmed: you will punch until you equip a weapon.'); } saveGame(); }
function itemShards(it) { return [1, 2, 6, 25, 80][it.rar]; }
function scrapItem(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.shards = (h.shards || 0) + itemShards(it); h.inv[i] = null; SFX.play('gold'); saveGame(); }
function scrapAll(maxRar) { const h = G.hero; let g = 0; h.inv.forEach((it, i) => { if (it && it.rar <= maxRar) { g += itemShards(it); h.inv[i] = null; } }); if (g) { h.shards = (h.shards || 0) + g; SFX.play('gold'); hint('Scrapped for ' + g + ' shards.'); saveGame(); } }
function dropFromInv(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.inv[i] = null; G.drops.push({ x: P.x + Math.sin(P.rot) * 1.6, z: P.z + Math.cos(P.rot) * 1.6, item: it, t: 0 }); SFX.play('pickup'); saveGame(); }

// ---------- hero ----------
function newHero(cls) {
  cls = CLASSES[cls] ? cls : 'warden'; const c = CLASSES[cls], sk = c.skills;
  const h = { v: 1, name: c.n, cls, level: 1, xp: 0, gold: 0, inv: new Array(BAG_N).fill(null), bagV: 2, eq: {}, bar: [sk[0], null, null, null], picks: [null, null, null, null], goals: {}, filter: 0, kills: 0, runs: 0, best: 0 };
  h.eq.weapon = makeItem(1, 'weapon', 0, c.w); return h;
}
function calcStats(eq) {
  const h = G.hero, c = CLASSES[h.cls], s = {}; for (const k in STATS) s[k] = 0;
  const uk = Math.pow(1.11, h.level) * .7; let wmin = Math.max(1, Math.round(3 * uk)), wmax = Math.max(2, Math.round(5 * uk)), wspd = 1.3, arm = 0; // bare fists until a weapon says otherwise
  for (const sl of SLOTS) {
    const it = eq[sl]; if (!it) continue; if (it.dmg) { wmin = it.dmg[0]; wmax = it.dmg[1]; wspd = it.spd; } if (it.armor) arm += it.armor;
    for (const a of it.aff) s[a.k] = (s[a.k] || 0) + a.v; if (it.power) { const p = POWERS[it.power].s; for (const k in p) s[k] = (s[k] || 0) + p[k]; }
  }
  for (const b of P.buffs) for (const k in b.s) s[k] = (s[k] || 0) + b.s[k];
  const pg = h.pg || {}; s.dmg += pg.dmg || 0; s.lifePct += pg.life || 0; s.armorPct += (pg.armor || 0) * 2; s.critDmg += (pg.crit || 0) * 2; s.mf += pg.mf || 0; s.ms += Math.min(25, pg.ms || 0);
  s.wmin = wmin; s.wmax = wmax; s.wspd = wspd;
  s.maxLife = Math.round((c.life + h.level * c.lifeLv + s.life) * (1 + s.lifePct / 100)); s.maxMana = c.res.max;
  s.armorT = Math.round((arm + s.armor + c.armor * h.level) * (1 + s.armorPct / 100));
  s.rfire = Math.min(75, s.resFire + s.resAll); s.rcold = Math.min(75, s.resCold + s.resAll); s.rlight = Math.min(75, s.resLight + s.resAll);
  s.dodgeT = Math.min(60, s.dodge); s.critT = Math.min(80, 5 + s.crit); s.critM = 1.5 + s.critDmg / 100; s.msT = c.ms * (1 + Math.min(s.ms, 80) / 100); s.cdrT = Math.min(50, s.cdr);
  s.lifeRegenT = c.regen + s.lifeRegen + s.maxLife * .004; s.manaRegenT = 0;
  const el = (SKILLS[h.bar && h.bar[0]] || {}).el || 'phys', inc = 1 + (s.dmg + (s[el] || 0) + (el !== 'phys' ? s.ele : 0)) / 100, avg = (wmin + wmax) / 2 + s.addPhys + s.addFire + s.addCold + s.addLight, aps = wspd * (1 + s.aspd / 100);
  s.dps = Math.round(avg * inc * aps * (1 + s.critT / 100 * (s.critM - 1)));
  const hitv = 5 * Math.pow(1.095, h.level), mp = Math.min(.8, s.armorT / (s.armorT + 60 + hitv * 6)), mr = (s.rfire + s.rcold + s.rlight) / 300, taken = (1 - (.6 * mp + .4 * mr)) * (1 - Math.min(50, s.dr) / 100) * (1 - s.dodgeT / 100);
  s.tough = Math.round(s.maxLife / Math.max(.05, taken)); s.recov = Math.round(s.lifeRegenT + s.lifeOnHit * aps);
  return s;
}
function computeStats() { const s = calcStats(G.hero.eq); P.gear = gearDecode(P.gc = gearCode(G.hero.eq)); P.stats = s; P.hp = Math.min(P.hp, s.maxLife); P.mana = Math.min(P.mana, s.maxMana); return s; }
function paragonFree() { const h = G.hero, pg = h.pg || {}; let used = 0; for (const k in pg) used += pg[k]; return (h.plvl || 0) - used; }
function spendParagon(k) { const h = G.hero; if (!PARAGON[k] || paragonFree() < 1) return false; h.pg = h.pg || {}; if (PARAGON[k][2] && (h.pg[k] || 0) >= PARAGON[k][2]) { hint(PARAGON[k][0] + ' is at its limit.'); return false; } h.pg[k] = (h.pg[k] || 0) + 1; computeStats(); SFX.play('pickup'); saveGame(); return true; }
function gainXp(v) { if (v > 0 && G.hero && G.hero.level < MAX_LEVEL) { G.xpPop = (G.xpPop || 0) + v; G.xpPopT = 1.6; }
  const h = G.hero; v = Math.round(v * (1 + (P.stats.xp || 0) / 100));
  if (h.level >= MAX_LEVEL) {   // past the cap, experience feeds uncapped Paragon levels
    h.pxp = (h.pxp || 0) + v; h.plvl = h.plvl || 0;
    while (h.pxp >= paragonNeed(h.plvl)) { h.pxp -= paragonNeed(h.plvl); h.plvl++; SFX.play('level'); ring(P.x, P.z, 0, 9, .7, 0x7ad0ff); burst(P.x, 1.5, P.z, 0x7ad0ff, 30, 7); floatText(P.x, 3, P.z, 'PARAGON ' + h.plvl, '#7ad0ff', 1.8, 22); hint('Paragon ' + h.plvl + ' reached. Spend the point in your Inventory.'); if (typeof UI !== 'undefined') UI.invDirty = true; }
    return;
  }
  h.xp += v;
  while (h.level < MAX_LEVEL && h.xp >= xpNeed(h.level)) {
    h.xp -= xpNeed(h.level); h.level++; computeStats(); P.hp = P.stats.maxLife; P.mana = P.stats.maxMana; SFX.play('level'); ring(P.x, P.z, 0, 9, .7, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7); if (h.level >= MAX_LEVEL) { h.pxp = h.xp; h.xp = 0; hint('Level 60! From here you earn Paragon levels with no limit.'); }
    floatText(P.x, 3, P.z, 'LEVEL ' + h.level, '#ffd84a', 1.8, 22); { computeStats(); hint('Level ' + h.level + '! More life, harder hits. Life and ' + CLASSES[h.cls].res.n + ' refilled.'); const nt = TIER_LV.find(l => l > h.level); if (nt && skillTiers(h.cls)[TIER_LV.indexOf(nt)]) hint('Next skill choice at level ' + nt + '.'); } if (pendingPick(h) >= 0) { if (G.auto) { const i = pendingPick(h); pickSkill(i, skillTiers(h.cls)[i][Math.random() * 2 | 0]); } else if (typeof UI !== 'undefined') UI.openPick(); }
  }
}
function saveGame() { try { localStorage.setItem(SAVE_KEY + '_' + G.hero.cls, JSON.stringify(G.hero)); if (G.stash) localStorage.setItem(SAVE_KEY + '_stash', JSON.stringify(G.stash)); } catch (e) { } }
function loadStash() { let st = null; try { st = JSON.parse(localStorage.getItem(SAVE_KEY + '_stash')); } catch (e) { } if (!Array.isArray(st) || st.length !== 100) st = new Array(100).fill(null); for (const it of st) if (it) { if (it.id >= itemId) itemId = it.id + 1; if (it.aff) for (const a of it.aff) a.v = Math.max(1, Math.round(a.v)); } G.stash = st; }
function loadGame(cls) {
  try {
    let raw = localStorage.getItem(SAVE_KEY + '_' + cls); if (!raw && cls === 'warden') raw = localStorage.getItem(SAVE_KEY); const h = JSON.parse(raw);
    if (h && h.v === 1 && h.inv && h.eq && CLASSES[h.cls] && h.cls === cls) {
      let m = 0; for (const it of h.inv) if (it) m = Math.max(m, it.id); for (const k in h.eq) m = Math.max(m, h.eq[k].id); itemId = Math.max(itemId, m + 1);
      if (h.bagV !== 2 || h.inv.length !== BAG_N) { const old = h.inv.filter(x => x).sort((a, b) => b.rar - a.rar); h.inv = new Array(BAG_N).fill(null); for (const it of old) if (!bagPut(h.inv, it)) h.gold += itemValue(it); h.bagV = 2; }
      const rd = it => { if (it && it.aff) for (const a of it.aff) a.v = Math.max(1, Math.round(a.v)); }; h.inv.forEach(rd); for (const k in h.eq) rd(h.eq[k]);
      if (h.eq.ring2) { const r2 = h.eq.ring2; delete h.eq.ring2; if (!h.eq.ring1) h.eq.ring1 = r2; else if (!bagPut(h.inv, r2)) h.gold += itemValue(r2); } // the second ring slot is gone: the ring goes back in the bag
      if (!h.picks) { h.picks = skillTiers(cls).map(t => t.find(id => (h.bar || []).includes(id)) || null); if (h.bar) h.bar = h.bar.map((id, i) => i === 0 || (id && h.picks.includes(id)) ? id : null); }
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
  const bark = col(th.wc[0]), leaf = [col(th.wc[1]), col(th.wc[2]), col(0x3a4a22)], stone = col(0x6c6a64), grassC = ({ crypt: [0x56604a, 0x4a5644, 0x66684e, 0x3e4a3c], lava: [0x4a3428, 0x5a3a26, 0x3a2a22, 0x6a4428], ice: [0xa8c0c8, 0x90aab8, 0xc0d4d8, 0x7c98a8], void: [0x4a3a6a, 0x3a2e58, 0x5a4680, 0x2e2446] }[Z.def.theme] || [0x5c7a32, 0x688236, 0x748034, 0x4e6c2e]).map(c => col(c));
  const TB = new Float32Array(16), HP = 1.5708, lay = (g, x, y, z, ry, rx, rz, sx, sy, sz, c, m) => { GLX.base(TB, x, y, z, ry, 1); GLX.part('stat', g, TB, 0, 0, 0, rx, 0, rz, 0, 0, 0, sx, sy, sz, c, 0, 1, m); };
  const roots = (x, z, r, bc) => { for (let k = 0; k < 4; k++) { const a = sr() * 6.28; lay('fol', x + Math.cos(a) * r * .7, .22, z + Math.sin(a) * r * .7, -a + HP, 1.15, 0, r * .6, r * 2.2, r * .6, bc, 3); } };
  const pine = (x, z) => {
    const h = 7 + sr() * 5.5, k = .8 + sr() * .5, lc = shade(leaf[sr() * 3 | 0], .7 + sr() * .5), ry = sr() * 6.28, bc = shade(bark, .8 + sr() * .4), lx = (sr() - .5) * .5, lz = (sr() - .5) * .5;
    GLX.obj('stat', 'trunk', x, h * .26, z, ry, .62 * k, h * .54, .62 * k, bc, 0, 1, 3); roots(x, z, .5 * k, bc);
    for (let i = 0; i < 7; i++) { const t = i / 6, w = (4.3 - t * 3.3) * k; GLX.obj('stat', 'fol', x + lx * t + (sr() - .5) * .3, h * (.34 + t * .62), z + lz * t + (sr() - .5) * .3, ry + i * 1.3, w, h * .26, w, shade(lc, .8 + t * .35 + sr() * .1), 0, 1, 2); }
    if (sr() < .5) for (let b = 0; b < 2; b++) { const a = sr() * 6.28; lay('trunk', x + Math.cos(a) * .7, h * (.2 + sr() * .12), z + Math.sin(a) * .7, -a + HP, 1.2, 0, .12, 1.4, .12, bc, 3); }
  };
  const broad = (x, z) => {
    const h = 4.5 + sr() * 3.5, lc = shade(leaf[sr() * 3 | 0], .75 + sr() * .5), ry = sr() * 6.28, bc = shade(bark, .8 + sr() * .4);
    GLX.obj('stat', 'trunk', x, h * .5, z, ry, .9, h, .9, bc, 0, 1, 3); roots(x, z, .6, bc);
    for (let b = 0; b < 3; b++) { const a = b * 2.1 + sr(), L = 1.6 + sr() * 1.2; lay('trunk', x + Math.cos(a) * L * .4, h * .9 + L * .3, z + Math.sin(a) * L * .4, -a + HP, .9, 0, .28, L * 1.4, .28, bc, 3); }
    const n = (LOWQ ? 4 : 7) + (sr() * 3 | 0); for (let i = 0; i < n; i++) { const a = sr() * 6.28, d = i ? .8 + sr() * 2 : 0, r = i ? 1.6 + sr() * 1.5 : 3; GLX.obj('stat', 'blob', x + Math.cos(a) * d, h + .7 + sr() * 2.2 - d * .25, z + Math.sin(a) * d, sr() * 6, r, r * (.65 + sr() * .25), r, shade(lc, .7 + sr() * .5), 0, 1, 2); }
  };
  const dead = (x, z) => { const h = 4 + sr() * 3, bc = shade(bark, .55 + sr() * .2); GLX.obj('stat', 'trunk', x, h * .5, z, sr() * 6, .6, h, .6, bc, 0, 1, 3); roots(x, z, .45, bc); for (let b = 0; b < 4; b++) { const a = sr() * 6.28, L = 1 + sr() * 1.4, y = h * (.5 + sr() * .45); lay('trunk', x + Math.cos(a) * L * .4, y + L * .25, z + Math.sin(a) * L * .4, -a + HP, .8 + sr() * .4, 0, .14, L * 1.3, .14, bc, 3); } };
  const rock = (x, z, r) => { const ry = sr() * 6.28, w = r * (.8 + sr() * .6), hh = r * (.5 + sr() * .4), d = r * (.8 + sr() * .5); GLX.obj('stat', 'blob', x, hh * .44, z, ry, w, hh, d, shade(stone, .7 + sr() * .5), 0, 1, 3); if (r > .8 && sr() < .7) GLX.obj('stat', 'blob', x, hh * .8, z, ry, w * .8, hh * .35, d * .8, shade(leaf[2], .9 + sr() * .3), 0, 1, 2); if (r > 1 && sr() < .5) GLX.obj('stat', 'blob', x + w * .5, hh * .25, z + d * .3, ry + 1, w * .5, hh * .5, d * .5, shade(stone, .6 + sr() * .4), 0, 1, 3); };
  const grass = (x, z, n, sp) => { n = Math.max(1, Math.round(n / 4)); for (let k = 0; k < n; k++) { const h = .2 + sr() * .26, w = .5 + sr() * .45; GLX.obj('stat', 'tuft', x + (sr() - .5) * sp, h * .5, z + (sr() - .5) * sp, sr() * 6.28, w, h, w, shade(grassC[sr() * 4 | 0], .9 + sr() * .35), 0, 1, 5); } };
  const fern = (x, z) => { const fc = shade(leaf[2], 1 + sr() * .5), n = 6 + (sr() * 3 | 0); for (let k = 0; k < n; k++) { const a = k / n * 6.28 + sr() * .4; lay('blade', x + Math.cos(a) * .32, .26, z + Math.sin(a) * .32, -a + HP, 1.05 + sr() * .2, 0, .34, 1.0 + sr() * .4, .05, fc, 2); } };
  const shroom = (x, z) => { for (let k = 0; k < 3; k++) { const mx = x + (sr() - .5) * .7, mz = z + (sr() - .5) * .7, mh = .14 + sr() * .2; GLX.obj('stat', 'cyl', mx, mh / 2, mz, 0, .06, mh, .06, col(0xd8d0c0)); GLX.obj('stat', 'blob', mx, mh + .03, mz, 0, .22 + sr() * .14, .13, .22 + sr() * .14, col(sr() < .5 ? 0x9a3a2a : 0xb08a4a), 0, 1, 0); } };
  const logf = (x, z) => { const a = sr() * 6.28, Lg = 2.4 + sr() * 1.8, bc = shade(bark, .7 + sr() * .3), sa = Math.sin(a), ca = Math.cos(a), R = .3 + sr() * .1;
    lay('cyl', x, R, z, a, HP, 0, R * 2, Lg, R * 2, bc, 3); for (const e of [-1, 1]) { const ex = x + sa * Lg * .5 * e, ez = z + ca * Lg * .5 * e; lay('cyl', ex, R, ez, a, HP, 0, R * 1.9, .05, R * 1.9, col(0xb4946a), 0); lay('cyl', ex + sa * .03 * e, R, ez + ca * .03 * e, a, HP, 0, R * 1.2, .03, R * 1.2, col(0x8a6a44), 0); lay('cyl', ex + sa * .05 * e, R, ez + ca * .05 * e, a, HP, 0, R * .5, .03, R * .5, col(0x6a4e30), 0); }
    for (let k = 0; k < 3; k++) { const u = (sr() - .5) * Lg * .8, sd = sr() < .5 ? 1 : -1; lay('cyl', x + sa * u, R * 2.05, z + ca * u, a, HP, 0, R * 2.06, .1 + sr() * .25, R * .3, shade(bc, .75), 3); if (k < 2) GLX.obj('stat', 'taper', x + sa * u + ca * R * sd, R * 1.3, z + ca * u - sa * R * sd, a, .12, .5 + sr() * .4, .12, shade(bc, .9), 0, 1, 3); }
    GLX.obj('stat', 'blob', x + sa * (sr() - .5) * Lg * .5, R * 1.9, z + ca * (sr() - .5) * Lg * .5, a, .7, .2, 1.3, shade(leaf[2], 1.15), 0, 1, 2); for (let k = 0; k < 3; k++) { const u = (sr() - .5) * Lg * .7, mx = x + sa * u + ca * (R + .12), mz = z + ca * u - sa * (R + .12), mh = .14 + sr() * .12; GLX.obj('stat', 'cyl', mx, mh * .5, mz, 0, .05, mh, .05, col(0xd8cdb0), 0); GLX.obj('stat', 'cone', mx, mh + .04, mz, 0, .2, .1, .2, col(sr() < .5 ? 0xb8402a : 0xc9a060), 0); }
    grass(x, z, 6, 2.4); };
  const litter = (x, z) => { for (let k = 0; k < 5; k++) GLX.obj('stat', 'disc', x + (sr() - .5) * 2.6, .02 + k * .002, z + (sr() - .5) * 2.6, sr() * 6, .16 + sr() * .1, 1, .1 + sr() * .08, col([0x8a5a22, 0xa8742a, 0x6a4a1c, 0x9a3a1c][sr() * 4 | 0]), 0, 1, 0); };
  const gN = LOWQ ? 7 : 18;
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) {
    const wx = (x + .5) * CS, wz = (y + .5) * CS; GLX.statChunk((x / 6 | 0) + '_' + (y / 6 | 0), ((x / 6 | 0) * 6 + 3) * CS, ((y / 6 | 0) * 6 + 3) * CS);
    if (c[y * GW + x]) {
      let near = 9; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < GW && yy < GW && !c[yy * GW + xx]) near = Math.min(near, Math.max(Math.abs(i), Math.abs(j))); }
      if (near > 2) continue;
      if (th.wall === 'tree') {
        const jx = wx + (sr() - .5) * 1.6, jz = wz + (sr() - .5) * 1.6, tr = sr(); if (tr < .58) pine(jx, jz); else if (tr < .93) broad(jx, jz); else dead(jx, jz);
        if (near === 1 && sr() < .45) pine(wx + (sr() - .5) * 2.6, wz + (sr() - .5) * 2.6);
        if (sr() < .55) { const r = 1 + sr() * .8; GLX.obj('stat', 'blob', wx + (sr() - .5) * 2.4, r * .35, wz + (sr() - .5) * 2.4, sr() * 6, r * 1.3, r, r * 1.2, shade(leaf[sr() * 3 | 0], .7 + sr() * .4), 0, 1, 2); }
        if (sr() < .3) rock(wx + (sr() - .5) * 2.4, wz + (sr() - .5) * 2.4, 1 + sr() * 1.4);
        if (near === 1) { grass(wx, wz, gN >> 1, CS); if (!LOWQ && sr() < .45) fern(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2); if (!LOWQ && sr() < .3) litter(wx, wz); if (sr() < .15) shroom(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2); }
      } else { const h = 2.6 + sr() * 2, wc = col(th.wc[x * 7 + y * 3 & 1]), T = Z.def.theme; GLX.obj('stat', 'box', wx, h / 2, wz, 0, CS, h, CS, wc, 0, 1, 3);
        if (near === 1) { // each region dresses its walls differently
          if (T === 'crypt') { GLX.obj('stat', 'box', wx, h + .12, wz, 0, CS + .2, .24, CS + .2, shade(wc, 1.25), 0, 1, 3); if (sr() < .4) for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * .9, h + .5, wz, 0, .7, .6, CS, shade(wc, .9), 0, 1, 3); if (sr() < .22) { GLX.obj('stat', 'cyl', wx, h + 1.4, wz, 0, .7, 2.6, .7, shade(wc, 1.3), 0, 1, 3); GLX.obj('stat', 'cyl', wx, h + 2.8, wz, 0, 1, .24, 1, shade(wc, 1.1), 0, 1, 3); } if (sr() < .12) { GLX.obj('stat', 'box', wx, 1.9, wz + CS * .5 + .1, 0, .12, .5, .16, col(0x3a2a1a), 0, 1, 3); GLX.obj('stat', 'sphere', wx, 2.3, wz + CS * .5 + .16, 0, .2, .28, .2, col(0x7ad0ff), 2.2); } }
          else if (T === 'lava') { for (let k = 0; k < 3; k++) GLX.obj('stat', 'taper', wx + (sr() - .5) * 2.2, h + .7 + sr(), wz + (sr() - .5) * 2.2, sr() * 6, .9 + sr(), 1.8 + sr() * 2, .9 + sr(), shade(wc, .7 + sr() * .4), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'box', wx + (sr() - .5) * 2, h * .5, wz + CS * .5 + .03, sr() - .5, .1, h * .7, .04, col(0xff5a1a), 1.6); }
          else if (T === 'ice') { for (let k = 0; k < 3; k++) GLX.obj('stat', 'taper', wx + (sr() - .5) * 2.4, h + .9 + sr() * 1.2, wz + (sr() - .5) * 2.4, sr() * 6, .6 + sr() * .5, 2.4 + sr() * 2.6, .6 + sr() * .5, col([0xbfe4f4, 0x9ccae4, 0xdff2fa][k]), .12, 1, 4); GLX.obj('stat', 'blob', wx, h + .1, wz, sr() * 6, CS * 1.1, .5, CS * 1.1, col(0xeef6fa), 0, 1, 0); }
          else { GLX.obj('stat', 'taper', wx, h + 1.6, wz, sr() * 6, 1.2, 3.4, 1.2, shade(wc, .8), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'gem', wx, h + 4 + sr(), wz, sr() * 6, .4, .7, .4, col(0xb060ff), 1.8); if (sr() < .4) GLX.obj('stat', 'box', wx, h * .55, wz + CS * .5 + .03, 0, .5, .5, .04, col(0xff80ff), 1.4); }
        } }
    } else {
      grass(wx, wz, gN, CS); const r = sr(); if (!LOWQ && sr() < .16) litter(wx, wz); if (!LOWQ && sr() < .05) fern(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2);
      if (r > .07 && r < .23 && Z.def.theme !== 'forest' && Z.def.theme !== 'town') { // region props instead of forest ones
        const T = Z.def.theme, px = wx + (sr() - .5) * 1.6, pz = wz + (sr() - .5) * 1.6, ry = sr() * 6.28, stn = col(th.wc[0]);
        if (T === 'crypt') { if (r < .12) { const hh = .9 + sr() * .7; GLX.obj('stat', 'box', px, hh / 2, pz, ry, .9, hh, .22, shade(stn, 1.2), 0, 1, 3); GLX.obj('stat', 'cyl', px, hh, pz, ry, .9, .22, .9, shade(stn, 1.2), 0, 1, 3); GLX.obj('stat', 'box', px, .08, pz, ry, 1.3, .16, .7, shade(stn, .8), 0, 1, 3); GLX.obj('stat', 'box', px + Math.sin(ry) * .12, hh * .6, pz + Math.cos(ry) * .12, ry, .5, .08, .03, shade(stn, .6), 0, 1, 3); }
          else if (r < .15) { const n = 2 + (sr() * 3 | 0); for (let k = 0; k < n; k++) GLX.obj('stat', 'cyl', px, .3 + k * .6, pz, ry + k, 1 - k * .04, .6, 1 - k * .04, shade(stn, 1.1 + (k % 2) * .15), 0, 1, 3); GLX.obj('stat', 'cyl', px + 1.2, .3, pz + .5, 1.2, .9, 1.4, .9, shade(stn, 1), 0, 1, 3); }
          else if (r < .19) { for (let k = 0; k < 6; k++) GLX.obj('stat', 'cyl', px + (sr() - .5), .06, pz + (sr() - .5), sr() * 6, .08, .08, .7 + sr() * .4, col(0xd8d0b8), 0); GLX.obj('stat', 'sphere', px, .2, pz, ry, .34, .3, .36, col(0xd8d0b8), 0); GLX.obj('stat', 'sphere', px + .06, .2, pz + .14, ry, .08, .1, .06, col(0x1a1a1a), 0); }
          else if (r < .21) { GLX.obj('stat', 'box', px, .45, pz, ry, 2.4, .9, 1.1, shade(stn, 1.05), 0, 1, 3); GLX.obj('stat', 'box', px, .98, pz, ry + .12, 2.6, .18, 1.3, shade(stn, 1.3), 0, 1, 3); }
          else for (let k = 0; k < 3; k++) { const cx2 = px + (sr() - .5) * .7, cz2 = pz + (sr() - .5) * .7, ch = .2 + sr() * .3; GLX.obj('stat', 'cyl', cx2, ch / 2, cz2, 0, .12, ch, .12, col(0xe8e0c8), 0); GLX.obj('stat', 'sphere', cx2, ch + .08, cz2, 0, .08, .14, .08, col(0xffb03a), 2.4); } }
        else if (T === 'lava') { if (r < .12) { const n = 3 + (sr() * 4 | 0); for (let k = 0; k < n; k++) { const hh = .6 + sr() * 2.2; GLX.obj('stat', 'cyl', px + (sr() - .5) * 1.3, hh / 2, pz + (sr() - .5) * 1.3, 0, .6, hh, .6, shade(stn, .6 + sr() * .5), 0, 1, 3); } }
          else if (r < .16) { const rr = 1.4 + sr() * 1.6; GLX.obj('stat', 'cyl', px, .05, pz, ry, rr * 2.3, .1, rr * 1.9, col(0x2a1a14), 0, 1, 3); GLX.obj('stat', 'cyl', px, .08, pz, ry, rr * 2, .08, rr * 1.6, col(0xff5a1a), 1.6); GLX.obj('stat', 'cyl', px + .2, .1, pz, ry, rr, .08, rr * .8, col(0xffc040), 2.2); }
          else if (r < .2) { GLX.obj('stat', 'trunk', px, 1, pz, ry, .7, 2, .7, col(0x1a1614), 0, 1, 3); GLX.obj('stat', 'taper', px + .3, 1.6, pz, ry, .14, 1.2, .14, col(0x1a1614), 0, 1, 3); }
          else { GLX.obj('stat', 'cone', px, .35, pz, ry, 1.5, .7, 1.5, shade(stn, .7), 0, 1, 3); GLX.obj('stat', 'cyl', px, .7, pz, 0, .5, .06, .5, col(0xff7a2a), 2.2); } }
        else if (T === 'ice') { if (r < .13) { const n = 2 + (sr() * 4 | 0); for (let k = 0; k < n; k++) { const hh = 1 + sr() * 2.6; GLX.obj('stat', 'taper', px + (sr() - .5) * 1.4, hh / 2, pz + (sr() - .5) * 1.4, sr() * 6, .5 + sr() * .4, hh, .5 + sr() * .4, col([0xbfe4f4, 0x9ccae4, 0xdff2fa][k % 3]), .14, 1, 4); } }
          else if (r < .18) GLX.obj('stat', 'blob', px, .25, pz, ry, 2 + sr() * 1.6, .6 + sr() * .4, 1.8 + sr(), col(0xeef6fa), 0, 1, 0);
          else if (r < .21) { GLX.obj('stat', 'trunk', px, 1.6, pz, ry, .5, 3.2, .5, col(0x5a5048), 0, 1, 3); for (let k = 0; k < 3; k++) GLX.obj('stat', 'cone', px, 1.6 + k * .9, pz, ry + k, 2.4 - k * .6, 1.2, 2.4 - k * .6, col(0xdfeef4), 0, 1, 2); }
          else GLX.obj('stat', 'cyl', px, .04, pz, ry, 3 + sr() * 2, .06, 2.4 + sr(), col(0xa8d4ea), .08, 1, 4); }
        else { if (r < .12) { GLX.obj('stat', 'taper', px, 1.6, pz, ry, .9, 3.2, .5, col(0x241a3a), 0, 1, 3); GLX.obj('stat', 'box', px + Math.sin(ry) * .2, 1.7, pz + Math.cos(ry) * .2, ry, .3, 1.2, .04, col(0xb060ff), 1.8); }
          else if (r < .17) { const n = 2 + (sr() * 3 | 0); for (let k = 0; k < n; k++) GLX.obj('stat', 'gem', px + (sr() - .5) * 1.6, 1.2 + sr() * 2.2, pz + (sr() - .5) * 1.6, sr() * 6, .3 + sr() * .3, .5 + sr() * .5, .3 + sr() * .3, col(sr() < .5 ? 0xb060ff : 0xff80ff), 1.4); }
          else if (r < .2) { GLX.obj('stat', 'cyl', px, .05, pz, ry, 3.2, .06, 3.2, col(0x1a1230), 0, 1, 3); for (let k = 0; k < 8; k++) GLX.obj('stat', 'box', px + Math.cos(k * .785) * 1.3, .1, pz + Math.sin(k * .785) * 1.3, -k * .785, .5, .04, .1, col(0xff80ff), 1.6); }
          else GLX.obj('stat', 'sphere', px, .5, pz, ry, 1.2, 1, 1.2, col(0x0c0816), 0, 1, 4); }
      }
      else if (r < .07) { grass(wx + (sr() - .5), wz + (sr() - .5), gN, 1.1); }
      else if (r < .13) rock(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2, .3 + sr() * .45);
      else if (r < .155) { GLX.obj('stat', 'cyl', wx, .07, wz, sr() * 6, .1, .1, .9, col(0xc9c2aa), 0, 1, 0); GLX.obj('stat', 'sphere', wx + .4, .13, wz + .3, 0, .3, .24, .26, col(0xc9c2aa), 0, 1, 0); }
      else if (r < .175) { GLX.obj('stat', 'taper', wx, .3, wz, sr() * 6, .95, .6, .95, shade(bark, .9), 0, 1, 3); GLX.obj('stat', 'cyl', wx, .61, wz, 0, .56, .02, .56, col(0xa88a5a), 0, 1, 0); }
      else if (r < .19) logf(wx, wz); else if (r < .2) shroom(wx, wz);
      else if (r < .23) { const fc = col([0xd8c84a, 0xc86a8a, 0xe8e0d0][sr() * 3 | 0]); for (let k = 0; k < 4; k++) { const fx = wx + (sr() - .5) * 1.6, fz = wz + (sr() - .5) * 1.6; GLX.obj('stat', 'blade', fx, .22, fz, 0, .04, .44, .04, grassC[0], 0, 1, 2); GLX.obj('stat', 'sphere', fx, .46, fz, 0, .14, .1, .14, fc, .15, 1, 0); } }
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
      else if (o.kind === 'altar') { GLX.obj('stat', 'cyl', o.x, .15, o.z, 0, 3.4, .3, 3.4, stn, 0, 1, 3); GLX.obj('stat', 'taper', o.x, .9, o.z, 0, 1.6, 1.2, 1.6, stn, 0, 1, 3); GLX.obj('stat', 'cyl', o.x, 1.56, o.z, 0, 1.9, .14, 1.9, col(0x4a4a50), 0, 1, 4); GLX.obj('stat', 'cyl', o.x, 1.7, o.z, 0, 1.2, .2, 1.2, col(0xc9a030), .2, 1, 4); }
    }
    { // Emberwatch: a walled camp-town. Tall things stand on the far (north) side so nothing hides the people in front.
      const cx = Z.bossAt[0], cz = Z.bossAt[1], cob = col(0x56524c), cob2 = col(0x625c54), thatch = col(0x8a6a34), plaster = col(0xb8a888), red = col(0x7a2a22), blue = col(0x2a4a7a), iron = col(0x3a3c44);
      GLX.obj('stat', 'cyl', cx, .04, cz, 0, 20, .08, 20, cob, 0, 1, 3); for (let k = 0; k < 40; k++) { const a = k * 2.399, r = 1.5 + (k * 0.618 % 1) * 8.2; GLX.obj('stat', 'cyl', cx + Math.cos(a) * r, .09, cz + Math.sin(a) * r, a, .9 + (k % 3) * .3, .04, .8 + (k % 2) * .3, k % 2 ? cob2 : shade(cob, .85), 0, 1, 3); }
      for (const o of Z.objs) { const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz); GLX.obj('stat', 'box', cx + dx * .55, .07, cz + dz * .55, a, 2.6, .06, d * .8, cob2, 0, 1, 3); }
      for (let k = 0; k < 44; k++) { const a = k / 44 * 6.2832; if (Math.abs(a - 1.5708) < .22) continue; const px = cx + Math.cos(a) * 20.6, pz = cz + Math.sin(a) * 20.6; GLX.obj('stat', 'taper', px, 1.1, pz, a, .34, 2.2 + (k % 3) * .25, .34, wood, 0, 1, 3); GLX.obj('stat', 'box', px, 1.2, pz, -a, .12, .16, 3, shade(wood, .8), 0, 1, 3); }
      const house = (hx, hz, ry, w, roofC) => { GLX.obj('stat', 'box', hx, 1.3, hz, ry, w, 2.6, w * .8, plaster, 0, 1, 3); for (const sx of [-1, 1]) GLX.obj('stat', 'box', hx + Math.cos(ry) * w * .5 * sx, 1.3, hz - Math.sin(ry) * w * .5 * sx, ry, .16, 2.7, w * .82, wood, 0, 1, 3); GLX.obj('stat', 'box', hx, 2.55, hz, ry, w * 1.02, .16, w * .82, wood, 0, 1, 3); GLX.obj('stat', 'taper', hx, 3.5, hz, ry + .785, w * 1.25, 1.9, w * 1.05, roofC, 0, 1, 3); GLX.obj('stat', 'box', hx + Math.sin(ry) * w * .41, .9, hz + Math.cos(ry) * w * .41, ry, .9, 1.8, .08, shade(wood, .7), 0, 1, 3); GLX.obj('stat', 'box', hx + Math.sin(ry) * w * .41 + Math.cos(ry) * w * .28, 1.6, hz + Math.cos(ry) * w * .41 - Math.sin(ry) * w * .28, ry, .6, .6, .06, col(0xffd070), .9); GLX.obj('stat', 'box', hx - Math.cos(ry) * w * .3, 3.9, hz + Math.sin(ry) * w * .3, ry, .5, 1.6, .5, cob, 0, 1, 3); };
      house(cx - 9.5, cz - 16.5, .25, 5, thatch); house(cx + 9.5, cz - 16.5, -.25, 5, red); house(cx - 16.5, cz - 10.5, .8, 4.2, thatch); house(cx + 16.5, cz - 10.5, -.8, 4.2, shade(blue, 1.1));
      for (const [tx, tz, cc] of [[-17.5, 5.5, canvas2], [17.5, 5.5, canvas2]]) { GLX.obj('stat', 'cone', cx + tx, 1.3, cz + tz, 0, 3.4, 2.6, 3.4, cc); GLX.obj('stat', 'cyl', cx + tx, 1.5, cz + tz, 0, .1, 3.1, .1, wood, 0, 1, 3); }
      { const wx = cx + 6.5, wz = cz + 6; GLX.obj('stat', 'cyl', wx, .5, wz, 0, 2.2, 1, 2.2, cob2, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 1.02, wz, 0, 1.7, .04, 1.7, col(0x1a2a3a), 0, 1, 4); for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * 1, 1.6, wz, 0, .16, 2.2, .16, wood, 0, 1, 3); GLX.obj('stat', 'box', wx, 2.7, wz, 0, 2.5, .14, .9, thatch, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 2.3, wz, 0, .1, .1, 2, wood, 0, 1, 3); }
      for (const [bx, bz, n] of [[-6, 7, 3], [-15, 2, 2], [15, 2, 2], [4, -11, 2], [-4, -11, 3]]) for (let k = 0; k < n; k++) { const px = cx + bx + (k % 2) * 1.1, pz = cz + bz + (k > 1 ? 1.1 : 0); if (k % 2) { GLX.obj('stat', 'cyl', px, .55, pz, 0, .8, 1.1, .8, wood, 0, 1, 3); for (const y of [.25, .85]) GLX.obj('stat', 'cyl', px, y, pz, 0, .84, .08, .84, iron, 0, 1, 4); } else { GLX.obj('stat', 'box', px, .45, pz, k * .5, .9, .9, .9, shade(wood, 1.1), 0, 1, 3); GLX.obj('stat', 'box', px, .45, pz, k * .5, .94, .1, .94, shade(wood, .7), 0, 1, 3); } }
      for (const [sx, sz] of [[-3.2, 3.4], [3.2, 3.4]]) { GLX.obj('stat', 'box', cx + sx, .45, cz + sz, sx > 0 ? -.6 : .6, 2.2, .14, .6, wood, 0, 1, 3); for (const e of [-.9, .9]) GLX.obj('stat', 'box', cx + sx + e * Math.cos(sx > 0 ? -.6 : .6), .22, cz + sz - e * Math.sin(sx > 0 ? -.6 : .6), 0, .14, .44, .5, shade(wood, .8), 0, 1, 3); }
      for (const o of Z.objs) { if (o.kind === 'tportal') continue; const fc = o.kind === 'altar' ? col(0xff7a2a) : o.kind === 'vendor' ? col(0xc9a030) : blue, px = o.x + (o.kind === 'stash' ? 3 : 0), pz = o.z - (o.kind === 'stash' ? 0 : 4.6); GLX.obj('stat', 'cyl', px, 2.4, pz, 0, .12, 4.8, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', px + .7, 4.1, pz, 0, 1.3, 1, .06, fc, .15); GLX.obj('stat', 'cone', px, 4.9, pz, 0, .22, .3, .22, col(0xc9a030), 0, 1, 4); }
      for (const o of Z.objs) if (o.kind === 'altar') { GLX.obj('stat', 'cyl', o.x, .36, o.z, .3, 5.6, .14, 5.6, col(0x5a5a60), 0, 1, 3); for (let k = 0; k < 6; k++) { const a = k * 1.0472 + .5; GLX.obj('stat', 'taper', o.x + Math.cos(a) * 3.6, 1.8, o.z + Math.sin(a) * 3.6, a, .55, 3.2, .55, stn, 0, 1, 3); GLX.obj('stat', 'cyl', o.x + Math.cos(a) * 3.6, .3, o.z + Math.sin(a) * 3.6, a, .9, .4, .9, col(0x4a4a50), 0, 1, 3); } }
    }
  }
  GLX.statEnd();
}
// Reference basic-attack hit: expected for the level, kept close to the hero's real hit so normal enemies always die in 2-5 swings.
function refHit(lvl) { const s = P.stats, exp = 7.5 * Math.pow(1.11, lvl) * (1 + .04 * lvl); if (!s || !s.wmin) return exp; const act = ((s.wmin + s.wmax) / 2 + s.addPhys + s.addFire + s.addCold + s.addLight) * (1 + (s.dmg + s.phys) / 100); return clamp(exp, act * .7, act * 1.08); }
function mkEnemy(md, x, z, lvl, elite, pack) {
  const a = ARCH[md.a], hit = refHit(lvl);
  const e = { id: ++G.eid, md, a, arch: md.a, x, z, rot: rnd(6.28), lvl, elite, pack, r: a.r * (elite ? 1.2 : 1), sc: a.sc * (elite === 1 ? 1.2 : elite === 2 ? 1.38 : 1), maxHp: Math.round(2.8 * hit * a.hp * (elite === 1 ? 2.2 : elite === 2 ? 3.5 : 1)), dmg: 5 * Math.pow(1.095, lvl) * a.dmg * (elite ? 1.3 : 1), spd: a.spd, st: 'chase', t: 0, cd: rnd(.2, 1), walk: rnd(6), awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, modT: 2, name: md.n, mods: [] };
  if (elite) { const keys = Object.keys(EMODS); while (e.mods.length < elite) { const k = pick(keys); if (!e.mods.includes(k)) e.mods.push(k); } for (const k of e.mods) e[k] = true; if (e.hasted) e.spd *= 1.3; e.name = e.mods.map(k => EMODS[k].n).join(' ') + ' ' + md.n; }
  if (!elite && !md.boss && P.stats && P.stats.wmin && G.hero) { const s = P.stats, bs = (!G.hero.eq.weapon ? SKILLS.punch : SKILLS[G.hero.bar[0]]) || SKILLS.punch, low = (s.wmin + s.addPhys + s.addFire + s.addCold + s.addLight) * (1 + (s.dmg + (s[bs.el] || 0) + (bs.el !== 'phys' ? s.ele : 0)) / 100) * (bs.m || 1); e.maxHp = Math.max(1, Math.min(e.maxHp, Math.floor(low * 4.8))); }
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
  const bd = bossFor(Z.def.theme, Z.def.depth), hit = refHit(lv + 1);
  const b = { id: ++G.eid, md: { a: 'boss', n: bd.n, c: bd.c, c2: bd.c2, e: bd.e }, a: { r: 1.7, sc: bd.sc || 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 }, arch: 'boss', boss: true, bd, x: Z.bossAt[0], z: Z.bossAt[1], rot: 0, lvl: lv + 1, elite: 3, pack: -1, r: 1.7, sc: bd.sc || 2.3, maxHp: Math.round(2.8 * hit * 40), dmg: 5 * Math.pow(1.095, lv + 1) * 1.6, spd: 4, st: 'chase', t: 0, cd: 1, walk: 0, awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, pt: 2.5, pi: 0, name: bd.n, mods: [] };
  b.hp = b.maxHp; G.ents.push(b); G.boss = b;
}
function addReplica(i) {
  if (G.ents.some(e => e.id === i.id)) return; const e = Object.assign({}, i, { a: i.boss ? { r: 1.7, sc: 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 } : ARCH[i.arch], tx: i.x, tz: i.z, trot: i.rot || 0, rot: i.rot || 0, st: 'chase', t: 0, cd: 1, modT: 2, walk: Math.random() * 6, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0 });
  if (!e.a || !e.md) return; for (const k of e.mods || []) e[k] = true; if (e.boss) { e.bd = bossFor(G.zone.def.theme, G.zone.def.depth); G.boss = e; } G.ents.push(e);
}
function repEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.burnT > 0) e.burnT -= dt; if (e.shock > 0) e.shock -= dt; const ox = e.x, oz = e.z, k = Math.min(1, dt * 12); e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k;
  let da = e.trot - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * k; e.walk += Math.hypot(e.x - ox, e.z - oz) * 1.6;
}
function enterZone(net) {
  G.inTown = false; G.away = null;
  const h = G.hero, lvl = net ? net.lvl : h.level, dpt = net ? net.d | 0 : (h.depth === undefined ? (h.depth = h.runs) : h.depth), zd = zoneFor(dpt); const def = { type: 'zone', theme: zd.theme, lvl, seed: net ? net.seed : (Math.random() * 1e9) | 0, name: zd.name, depth: dpt + 1 };
  G.zone = genZone(def); const Z = G.zone; G.ents.length = 0; G.projs.length = 0; G.pp.length = 0; G.areas.length = 0; G.drops.length = 0; G.fx.length = 0; G.texts.length = 0; G.timers.length = 0; G.boss = null; G.streak = 0;
  P.buffs = []; computeStats(); buildStatic(Z); if (net) { for (const i of net.ents) addReplica(i); } else spawnAll(Z); BOT.path = null;
  P.x = Z.start[0]; P.z = Z.start[1]; P.y = 0; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; P.dead = false; P.lastHit = -9; P.flaskCd = 0; P.buffs = []; P.cds = {}; computeStats(); P.hp = P.stats.maxLife; P.mana = CLASSES[h.cls].res.regen ? P.stats.maxMana : 0; P.flaskCd = 0; P.lastHit = -9;
  setEnv(Z); if (net && net.sync && net.pos) { P.x = net.pos[0]; P.z = net.pos[1]; }
  G.state = 'play'; if (typeof UI !== 'undefined') UI.zoneBanner(def.name, 'Floor ' + def.depth + ' · monster level ' + lvl); saveGame();
}

// ---------- town ----------
function genTown() {
  const th = THEMES.town, c0 = GW / 2, Z = { def: { type: 'town', theme: 'town', lvl: G.hero.level, seed: 4242, name: 'Emberwatch' }, th, cell: new Uint8Array(GW * GW).fill(1), seen: new Uint8Array(GW * GW).fill(1), lamps: [], objs: [], packs: [], cleared: true };
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x + .5 - c0, y + .5 - c0) < 7.2) Z.cell[y * GW + x] = 0;
  const cx = c0 * CS, cz = c0 * CS; Z.start = [cx, cz + 9]; Z.bossAt = [cx, cz]; Z.dist = new Int16Array(GW * GW);
  Z.lamps.push({ x: cx, z: cz, big: 1 }, { x: cx - 11, z: cz - 8 }, { x: cx + 11, z: cz - 8 }, { x: cx - 8, z: cz + 10 }, { x: cx + 8, z: cz + 10 }, { x: cx - 16, z: cz + 1 }, { x: cx + 16, z: cz + 1 }, { x: cx - 4, z: cz - 15 }, { x: cx + 4, z: cz - 15 });
  Z.objs.push({ kind: 'stash', x: cx, z: cz - 13, name: 'Stash', used: false }, { kind: 'vendor', x: cx - 13, z: cz - 2, name: 'Mirel the Trader', used: false }, { kind: 'altar', x: cx + 13, z: cz - 2, name: 'Altar of Embers', used: false }, { kind: 'tportal', x: cx, z: cz + 14, name: 'Return to the Hollow', used: false });
  return Z;
}
function setEnv(Z) { const e = GLX.env, th = Z.th, n = Math.hypot(.55, .66, .42); e.sun = [.55 / n, .66 / n, .42 / n]; e.sunC = th.sunC; e.sky = th.sky; e.gnd = th.gnd; e.fog = GLX.col(th.fog); e.lightR = th.lightR; if (th !== THEMES.forest && th !== THEMES.town) { e.lightR *= 1.3; e.sky = e.sky.map(v => v * 1.45); e.gnd = e.gnd.map(v => v * 1.3);  } /* deeper regions were too dark to read */ e.wet = th.wet === undefined ? .4 : th.wet; e.mist = th.mist === undefined ? .35 : th.mist; SFX.ambient(Object.keys(THEMES).find(k => THEMES[k] === th)); }
function enterTown() { goalDone('town'); P.fl = FLASK_MAX; P.flaskCd = 0;
  if (G.inTown || P.dead || G.state !== 'play') return; for (const e of G.ents) if (e.alive && e.awake && Math.hypot(e.x - P.x, e.z - P.z) < 16) { hint('You cannot leave while enemies are near.'); return; }
  G.away = { zone: G.zone, ents: G.ents, drops: G.drops, boss: G.boss, x: P.x, z: P.z, seed: G.zone.def.seed }; G.ents = []; G.drops = []; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; G.boss = null; G.streak = 0;
  G.zone = genTown(); G.inTown = true; buildStatic(G.zone); setEnv(G.zone); P.x = G.zone.start[0]; P.z = G.zone.start[1]; P.y = 0; P.rot = Math.PI; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; BOT.path = null; P.hp = P.stats.maxLife;
  const h = G.hero; if (!h.stock || Math.abs(h.kills - (h.stockK || 0)) >= 25 || h.stockL !== h.level) { h.stock = []; for (let i = 0; i < 10; i++) h.stock.push(makeItem(h.level, null, Math.random() < .12 ? 3 : Math.random() < .5 ? 2 : 1)); h.stockK = h.kills; h.stockL = h.level; }
  SFX.play('shrine'); UI.zoneBanner('Emberwatch', 'Stash · Trader · Altar'); saveGame();
}
// jump straight to a party member; from town it walks you out through the portal first
function teleportTo(id) {
  if (!G.online) return; if (G.inTown) { G.tpTo = id; leaveTown(); return; }
  const p = NET.peers[id]; if (!p) { hint('That player is not on your floor right now.'); return; } if (P.dead) return;
  ring(P.x, P.z, 0, 4, .5, 0x7ad0ff); let x = p.x, z = p.z; for (let k = 0; k < 8; k++) { const a = k * .785, tx = p.x + Math.sin(a) * 1.6, tz = p.z + Math.cos(a) * 1.6; if (!blocked(tx, tz, .5)) { x = tx; z = tz; break; } }
  P.x = x; P.z = z; P.act = null; P.dash = null; P.iframes = Math.max(P.iframes || 0, 1.5); G.tpTo = 0; ring(x, z, 0, 5, .6, 0x7ad0ff); burst(x, 1.2, z, 0x7ad0ff, 24, 6); SFX.play('shrine'); hint('Teleported to ' + p.name + '.');
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
function affixRange(a, ilvl) { const k = a[3] === 'f' ? Math.pow(1.085, ilvl) : a[3] === 'p' ? 1 + Math.min(ilvl, 60) * .02 : 1, r = v => Math.max(1, Math.round(v)); return [r(a[1] * k), r(a[2] * k)]; }
function altarPool(it, idx) { const as = AFF_ALIAS[it.slot] || it.slot, have = new Set(it.aff.filter((a, i) => i !== idx).map(a => a.k)); return AFFIX.filter(a => a[4].split(' ').includes(as) && !have.has(a[0])); }
function altarCost(it) { const n = it.rr || 0; return { shards: Math.round((3 + it.rar * 2) * (1 + n * .5)), gold: Math.round(itemValue(it) * (1 + n * .5)) }; }
// The altar now forges an item stronger, up to +5. Every step raises its damage or armor and every line on it. No gamble: it always works.
function upCost(it) { const n = it.up || 0; return { shards: (2 + it.rar * 2) * (n + 1), gold: Math.round(itemValue(it) * .5 * (n + 1)) }; }
function upPreview(it) { const k = 1.08, o = { dmg: it.dmg ? [Math.max(it.dmg[0] + 1, Math.round(it.dmg[0] * k)), Math.max(it.dmg[1] + 1, Math.round(it.dmg[1] * k))] : null, armor: it.armor ? Math.max(it.armor + 1, Math.round(it.armor * k)) : 0, aff: it.aff.map(a => ({ k: a.k, v: Math.max(a.v + 1, Math.round(a.v * 1.06)) })) }; return o; }
function altarUpgrade(sel) {
  const h = G.hero, it = typeof sel === 'string' ? h.eq[sel] : h.inv[sel]; if (!it || (it.up || 0) >= MAX_UP) return false; const c = upCost(it); if ((h.shards || 0) < c.shards || h.gold < c.gold) { hint('Not enough shards or gold.'); return false; }
  const p = upPreview(it); h.shards -= c.shards; h.gold -= c.gold; if (p.dmg) it.dmg = p.dmg; if (p.armor) it.armor = p.armor; it.aff = p.aff; it.up = (it.up || 0) + 1; it.name = it.name.replace(/ \+\d$/, '') + ' +' + it.up;
  if (typeof sel === 'string') computeStats(); SFX.play('level'); G.shake = .6; if (G.zone) { const al = G.zone.objs.find(o => o.kind === 'altar'); if (al) { ring(al.x, al.z, 0, 12, 1, 0xffb03a); ring(al.x, al.z, 0, 7, .7, 0xfff0c0); burst(al.x, 2, al.z, 0xffb03a, 70, 12); } } saveGame(); return true;
}
function altarReroll(sel, idx) {
  const h = G.hero, it = typeof sel === 'string' ? h.eq[sel] : h.inv[sel]; if (!it || !it.aff[idx]) return false; if (it.ench !== undefined && it.ench !== idx) { hint('Only the line you first changed can be rerolled on this item.'); return false; }
  const c = altarCost(it); if ((h.shards || 0) < c.shards) { hint('Not enough shards. Scrap items to get more.'); return false; } if (h.gold < c.gold) { hint('Not enough gold.'); return false; }
  const pool = altarPool(it, idx); if (!pool.length) return false; const a = pick(pool); h.shards -= c.shards; h.gold -= c.gold; it.aff[idx] = { k: a[0], v: affixVal(a, it.ilvl) }; it.ench = idx; it.rr = (it.rr || 0) + 1; if (typeof sel === 'string') computeStats(); SFX.play('shrine'); saveGame(); return true;
}

// ---------- fx ----------
function burst(x, y, z, c, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(6.28), u = rnd(-.2, 1), s = rnd(.3, 1) * sp; G.fx.push({ x, y, z, vx: Math.cos(a) * s, vy: u * s, vz: Math.sin(a) * s, life: rnd(.25, .6), max: .6, size: rnd(.1, .24), c: GLX.col(c) }); } if (G.fx.length > 700) G.fx.splice(0, G.fx.length - 700); }
function ring(x, z, r0, r1, life, c) { G.fx.push({ ring: 1, x, z, r0, r1, life, max: life, c: GLX.col(c) }); }
function floatText(x, y, z, txt, col, life, size) { if (!G.set.nums && /^[-+✦\d]/.test(txt)) return; G.texts.push({ x: x + rnd(-.4, .4), y, z, txt, col, life: life || .9, max: life || .9, size: size || 15 }); if (G.texts.length > 60) G.texts.shift(); }
function addArea(o) { o.t = 0; G.areas.push(o); return o; }

// ---------- combat ----------
function wake(e) { if (e.awake) return; if (e.boss) { e.awake = true; SFX.play('boss'); UI.zoneBanner(e.name, 'Guardian of the Hollow'); return; } for (const o of G.ents) if (o.pack === e.pack && !o.awake) { o.awake = true; o.cd = rnd(.2, .9); } }
// fighting side by side pays: +10% damage per ally within reach, up to +30%
function partyBonus() { if (!G.online || G.inTown) return 0; let n = 0; for (const id in NET.peers) { const q = NET.peers[id]; if (!q.dead && Math.hypot(q.x - P.x, q.z - P.z) < 22) n++; } return Math.min(3, n) * 10; }
function rollDmg(sk, mult) { const s = P.stats; const base = rnd(s.wmin, s.wmax) + s.addPhys + s.addFire + s.addCold + s.addLight; let inc = s.dmg + (s[sk.el] || 0) + (sk.el !== 'phys' ? s.ele : 0); if (s.lowLife && P.hp < s.maxLife * .5) inc += s.lowLife; let v = base * sk.m * (mult || 1) * (1 + inc / 100) * (1 + partyBonus() / 100); const crit = Math.random() * 100 < s.critT; if (crit) v *= s.critM; return { v, crit }; }
function hitEnemy(e, sk, mult, noProc) {
  if (!e.alive) return; const s = P.stats, d = rollDmg(sk, mult); let v = d.v; if (e.armored) v *= .6; if (e.shock > 0) v *= 1.15; v = Math.max(1, Math.round(v));
  e.hp -= v; e.flash = .13; wake(e); P.lastHit = G.time; if (sk.gen) P.mana = Math.min(s.maxMana, P.mana + sk.gen);
  floatText(e.x, 1.6 * e.sc + .6, e.z, (d.crit ? '✦' : '') + v, d.crit ? '#ffe14a' : EL_CSS[sk.el], d.crit ? 1.1 : .8, d.crit ? 21 : 15);
  if (sk.freeze && !e.boss) e.frozen = sk.freeze;
  if (sk.el === 'fire') { e.burn = Math.max(e.burn, v * .15); e.burnT = 3; } else if (sk.el === 'cold') e.chill = 2.5; else if (sk.el === 'light') e.shock = 3;
  if (s.lifeOnHit) P.hp = Math.min(s.maxLife, P.hp + s.lifeOnHit); if (s.leech) P.hp = Math.min(s.maxLife, P.hp + v * s.leech / 100);
  if (!G.online && !e.boss && e.arch !== 'brute') { const dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1; moveEnt(e, dx / l * .4, dz / l * .4, e.r); }
  burst(e.x, 1.1 * e.sc, e.z, d.crit ? 0xffe14a : EL_COL[sk.el], d.crit ? 12 : 6, d.crit ? 7 : 5);
  { const heavy = sk.type === 'melee' || !!sk.land || sk.type === 'nova'; G.fx.push({ flash: 1, x: e.x, y: 1.1 * e.sc, z: e.z, r: d.crit ? 3.2 : heavy ? 2.2 : 1.4, life: .12, max: .12, c: GLX.col(d.crit ? 0xfff2b0 : EL_COL[sk.el]) }); if (heavy && !G.auto) G.hitStop = Math.max(G.hitStop || 0, d.crit ? .085 : .04); if (d.crit) G.shake = Math.min(.5, G.shake + .12); }
  if (G.time - G.hitSfx > .05) { G.hitSfx = G.time; SFX.play(d.crit ? 'crit' : 'hit'); }
  if (!noProc && s.procLight && Math.random() * 100 < s.procLight) addArea({ x: e.x, z: e.z, r: 2.6, delay: .15, owner: 'p', sk: { el: 'light', m: 1.5 }, c: 0xfff07a, proc: 1 });
  if (G.online) { const cl = !e.boss && s.cull && e.hp < e.maxHp * s.cull / 100; NET.send({ t: 'hit', id: e.id, v: cl ? e.maxHp * 2 : v, el: sk.el, fz: sk.freeze || 0 }); if (e.hp < 0) e.hp = 0; return; }
  if (e.hp <= 0 || (!e.boss && s.cull && e.hp < e.maxHp * s.cull / 100)) killEnemy(e);
}
function killEnemy(e) {
  if (!e.alive) return; e.alive = false; e.deadT = .45; const h = G.hero, s = P.stats; h.kills++; if (h.goals && !h.goals.kill) { h.goals.k = (h.goals.k || 0) + 1; if (h.goals.k >= 5) goalDone('kill'); } if (e.boss) goalDone('boss');
  let xp = 22 * Math.pow(1.13, e.lvl) * (e.a.xp || 1) * (e.elite === 1 ? 3 : e.elite === 2 ? 6 : 1); const diff = h.level - e.lvl; if (diff > 4) xp *= Math.max(.1, 1 - (diff - 4) * .15); if (G.set.nums !== false && h.level < MAX_LEVEL) floatText(e.x, 2.4 * e.sc, e.z, '+' + Math.max(1, Math.round(xp)) + ' xp', '#cfc4ff', 1, 12); gainXp(xp);
  G.streak++; G.streakT = 4; if (G.streak > G.bestStreak) G.bestStreak = G.streak; if (G.streak > (h.best || 0)) h.best = G.streak;
  dropLoot(e); burst(e.x, 1, e.z, e.md.c2, 14, 6); SFX.play('kill');
  if (!e.noLoot && (e.elite || Math.random() < .12)) G.drops.push({ x: e.x, z: e.z, globe: 1, t: 0 });
  if (s.boomFire) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'fire', m: 1.2 }, c: 0xff7a2a, proc: 1 });
  if (s.boomCold) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'cold', m: 1.0 }, c: 0x7ad0ff, proc: 1 });
  if (e.volatile && !G.online) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten && !G.online) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.boss) {
    G.zone.cleared = true; G.shake = .9; ring(e.x, e.z, 0, 16, 1.1, e.md.e); burst(e.x, 2, e.z, e.md.e, 60, 11); SFX.play('level'); h.runs++;
    G.zone.objs.push({ kind: 'portal', x: e.x, z: e.z, name: 'Next floor', used: false }); h.depthMax = Math.max(h.depthMax || 0, G.zone.def.depth || 1); UI.zoneBanner('Guardian slain', 'A great gate opens to the next floor'); ring(e.x, e.z, 0, 16, 1.2, 0x7ad0ff); ring(e.x, e.z, 0, 9, .8, 0xb48cff); burst(e.x, 2, e.z, 0x7ad0ff, 60, 12); G.shake = .9; SFX.play('shrine'); saveGame();
  }
}
// ---- first steps ----
function goalDone(k) { const h = G.hero; if (!h || !h.goals || h.goals.all || h.goals[k]) return; h.goals[k] = 1; const g = GOALS.find(x => x[0] === k); SFX.play('shrine'); floatText(P.x, 3.2, P.z, '✓ ' + g[1], '#9effa8', 2, 16);
  if (GOALS.every(x => h.goals[x[0]])) { h.goals.all = 1; if (typeof UI !== 'undefined') UI.zoneBanner('First steps complete', 'The deep is yours to explore'); SFX.play('level'); } saveGame(); }
const blessed = () => { const h = G.hero; return !!h && !h.runs && h.level < 4; }; // newcomer's blessing: softer hits until the first guardian falls
function dmgPlayer(v, el, src) {
  if (P.dead || P.iframes > 0) return; const s = P.stats; if (blessed()) v *= .6; if (src && src.name) P.killer = src.name; else if (!src) P.killer = '';
  if (Math.random() * 100 < s.dodgeT) { floatText(P.x, 2.6, P.z, 'Dodge', '#9fe', .7); return; }
  if (el === 'phys') v *= 1 - Math.min(.8, s.armorT / (s.armorT + 60 + v * 6)); else v *= 1 - (s['r' + el] || 0) / 100; v *= 1 - Math.min(50, s.dr) / 100; v = Math.max(1, Math.round(v));
  P.hp -= v; P.hurt = .25; P.lastHit = G.time; P.mana = Math.min(s.maxMana, P.mana + 2); G.shake = Math.min(.7, G.shake + .12 + v / s.maxLife); floatText(P.x, 2.6, P.z, '-' + v, '#ff5a4a', .9, 17); SFX.play('hurt');
  if (src && src.alive && s.thorns > 0) { src.flash = .1; if (G.online) NET.send({ t: 'hit', id: src.id, v: s.thorns, el: 'phys' }); else { src.hp -= s.thorns; if (src.hp <= 0) killEnemy(src); } }
  if (P.hp <= 0) { if (s.cheat && P.cheatCd <= 0) { P.hp = s.maxLife; P.cheatCd = 60; ring(P.x, P.z, 0, 10, .8, 0xff8a2a); hint('Emberheart saves you from death!'); } else { P.hp = 0; P.dead = true; P.act = P.spin = P.dash = null; G.streak = 0; SFX.play('die'); UI.showDeath(); } }
}
function tryCast(slot, tx, tz) {
  const h = G.hero, s = P.stats; let id = h.bar[slot];
  if (!h.eq.weapon) { if (slot !== 0) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Unarmed: you can only punch until you equip a weapon.'); } return false; } id = 'punch'; }
  if (!id) return false; const sk = SKILLS[id];
  if (P.act || P.dash || (P.cds[id] || 0) > 0) return false; if (sk.type === 'spin' && P.spin) return false;
  if (P.mana < (sk.cost || 0)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Not enough ' + CLASSES[h.cls].res.n + '.'); } return false; }
  if (tx === undefined) { tx = IN.gx; tz = IN.gz; }
  P.mana -= sk.cost || 0; if (sk.cd) P.cds[id] = sk.cd * (1 - s.cdrT / 100);
  const sp = 1 + s.aspd / 100;
  if (sk.type === 'spin') { P.spin = { t: sk.dur, tk: 0, sk }; return true; }
  if (slot > 0) goalDone('skill');
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
  const b = G.boss; return { x: b ? b.x : Z.bossAt[0], z: b ? b.z : Z.bossAt[1], text: 'Find and slay ' + (b ? b.name : bossFor(Z.def.theme, Z.def.depth).n) };
}
function updGps(dt) {
  GPS.t -= dt; if (GPS.t > 0) return; GPS.t = .4; const q = questTarget(); GPS.goal = q; GPS.text = q ? q.text : ''; GPS.pts = []; if (!q || !G.set.gps) return;
  const f = botField(), gc = cellOf(q.x, q.z); if (f.prev[gc] < 0) return; const out = [[q.x, q.z]]; let k = gc; while (k !== f.s) { k = f.prev[k]; if (k !== f.s) out.push([(k % GW + .5) * CS, ((k / GW | 0) + .5) * CS]); } out.push([P.x, P.z]); GPS.pts = out.reverse();
}

// ---------- autoplay ----------
const BOT = { t: 0, path: null, rv: 0, dodge: 0, kite: 0 };
// ---- the sellsword: a companion who fights beside you when no other player is in your party ----
const ALLY = { x: 0, y: 0, z: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls: 'ranger', on: false, cd: 0, name: 'Sellsword' };
const ALLY_SK = { n: 'Sellsword', type: 'ally', el: 'phys', m: .4 };
// Hand the Sellsword gear: it wears it, and hits harder for every piece (more for rarer, higher-level pieces).
function allyPower() { const q = G.hero.allyEq || {}; let m = .4; for (const k in q) { const it = q[k]; m += (k === 'weapon' ? .1 : .04) + it.rar * (k === 'weapon' ? .05 : .02) + (it.up || 0) * .01; } return Math.min(1.1, m); }
function allyGive(i) { const h = G.hero, it = h.inv[i]; if (!it || it.slot === 'ring' || it.slot === 'amulet' || it.slot === 'offhand') { hint('The Sellsword takes weapons and armor.'); return false; } h.allyEq = h.allyEq || {}; const old = h.allyEq[it.slot]; h.allyEq[it.slot] = it; h.inv[i] = null; if (old) addItem(old); ALLY.gear = gearDecode(gearCode(h.allyEq)); ALLY_SK.m = allyPower(); SFX.play('pickup'); hint('The Sellsword equips ' + it.name + '. Its hits are now worth ' + Math.round(ALLY_SK.m * 100) + '% of yours.'); saveGame(); return true; }
function allyTake(slot) { const h = G.hero, it = h.allyEq && h.allyEq[slot]; if (!it) return; if (!addItem(it)) return; delete h.allyEq[slot]; ALLY.gear = gearDecode(gearCode(h.allyEq)); ALLY_SK.m = allyPower(); saveGame(); }
function updAlly(dt) {
  const alone = !G.online || !Object.keys(NET.peers).length, want = G.set.ally !== false && !G.inTown && !P.dead && alone && G.state === 'play';
  if (!want) { ALLY.on = false; return; } const h = G.hero;
  if (!ALLY.on || Math.hypot(ALLY.x - P.x, ALLY.z - P.z) > 26) { ALLY.on = true; ALLY.x = P.x - 1.5; ALLY.z = P.z + 1.5; ALLY.cls = h.cls === 'warden' || h.cls === 'brawler' ? 'ranger' : 'warden'; ALLY.gear = h.allyEq && Object.keys(h.allyEq).length ? gearDecode(gearCode(h.allyEq)) : null; ALLY_SK.m = allyPower(); }
  const melee = ALLY.cls === 'warden', range = melee ? 2.4 : 9; let tg = null, bd = 13; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - ALLY.x, e.z - ALLY.z); if (d < bd && Math.hypot(e.x - P.x, e.z - P.z) < 16) { bd = d; tg = e; } }
  ALLY.cd -= dt; if (ALLY.swing > 0) ALLY.swing -= dt * 3; let tx = null, tz = null;
  if (tg) { ALLY.rot = Math.atan2(tg.x - ALLY.x, tg.z - ALLY.z); if (bd > range + tg.r) { tx = tg.x; tz = tg.z; } else if (ALLY.cd <= 0) { ALLY.cd = 1.15; ALLY.swing = 1; ALLY.act = { t: 0, d: .35, sk: ALLY_SK }; if (!melee) G.fx.push({ bolt: 1, x1: ALLY.x, z1: ALLY.z, x2: tg.x, z2: tg.z, life: .12, max: .12, c: GLX.col(0xfff0c0) }); hitEnemy(tg, ALLY_SK, 1, true); } }
  else { const d = Math.hypot(P.x - ALLY.x, P.z - ALLY.z); if (d > 4) { tx = P.x; tz = P.z; } }
  if (ALLY.act) { ALLY.act.t += dt; if (ALLY.act.t >= ALLY.act.d) ALLY.act = null; }
  if (tx !== null) { const dx = tx - ALLY.x, dz = tz - ALLY.z, d = Math.hypot(dx, dz) || 1, st = Math.min(d, P.stats.msT * 1.05 * dt), o = { x: ALLY.x, z: ALLY.z }; moveEnt(o, dx / d * st, dz / d * st, .5); if (Math.hypot(o.x - ALLY.x, o.z - ALLY.z) < st * .2 && Math.hypot(P.x - ALLY.x, P.z - ALLY.z) > 9) { o.x = P.x - 1; o.z = P.z + 1; } ALLY.x = o.x; ALLY.z = o.z; ALLY.rot = tg ? ALLY.rot : Math.atan2(dx, dz); ALLY.walk += st * 1.6; ALLY.mv = 1; } else ALLY.mv = 0;
}
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
  h.inv.forEach((it, i) => { if (!it || !canUse(it)) return; let cur; cur = h.eq[it.slot === 'ring' ? 'ring1' : it.slot]; if (!cur || itemScore(it) > itemScore(cur) * 1.02) { if (equipFromInv(i)) ch = true; } });
  if (bagFree() < 16) { scrapAll(2); ch = true; } if (ch) UI.invDirty = true;
}
function botStep(dt) {
  if (G.inTown) { leaveTown(); return false; }
  const h = G.hero, s = P.stats; BOT.t -= dt; if (G.set.apPot !== false && P.hp < s.maxLife * .45) useFlask();
  for (const a of G.areas) if (a.owner === 'e' && !a.done) { const d = Math.hypot(P.x - a.x, P.z - a.z); if (d < a.r + .8) { const nx = d > .1 ? (P.x - a.x) / d : 1, nz = d > .1 ? (P.z - a.z) / d : 0; P.atk = null; P.move = [P.x + nx * 4, P.z + nz * 4]; BOT.dodge = .2; return false; } }
  if (BOT.dodge > 0) { BOT.dodge -= dt; return false; }
  let tgt = null, bd = 17, goal = null, act = null; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tgt = e; } }
  if (tgt) {
    const clear = los(P.x, P.z, tgt.x, tgt.z), bs = SKILLS[h.bar[0]] || SKILLS.cleave;
    if (bs.range > 5 && bd < 4 && (BOT.kite || 0) <= 0 && tgt.arch !== 'caster' && !tgt.boss) BOT.kite = .7;
    if (BOT.kite > 0) { BOT.kite -= dt; if (BOT.kite > .3) { const ax = P.x - (tgt.x - P.x) / bd * 5, az = P.z - (tgt.z - P.z) / bd * 5; if (!blocked(ax, az, .6)) { P.atk = null; P.move = [ax, az]; return false; } } }
    for (let i = 1; i < (G.set.apSkill === false ? 1 : 4); i++) {
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
  if (!G.menuHold) P.hp = Math.min(s.maxLife, P.hp + s.lifeRegenT * dt); { const rs = CLASSES[h.cls].res; if (rs.regen) P.mana = Math.min(s.maxMana, P.mana + rs.regen * dt); else if (G.time - P.lastHit > 4) P.mana = Math.max(0, P.mana - rs.decay * dt); } if (P.fl === undefined) P.fl = FLASK_MAX; if (P.fl < FLASK_MAX) { P.flaskCd = P.flaskCd > 0 ? P.flaskCd - dt : FLASK_CD; if (P.flaskCd <= 0) { P.fl++; P.flaskCd = P.fl < FLASK_MAX ? FLASK_CD : 0; } } else P.flaskCd = 0;
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
  // thumb joystick + attack buttons: aim at the nearest foe by itself; a melee button held with the stick at rest walks you into reach
  { const K = IN.keys, kx = (K.arrowright ? 1 : 0) - (K.arrowleft ? 1 : 0), kz = (K.arrowdown ? 1 : 0) - (K.arrowup ? 1 : 0); if (kx || kz) { const l = Math.hypot(kx, kz); IN.joy.on = true; IN.joy.x = kx / l; IN.joy.z = kz / l; IN.joy.kb = true; } else if (IN.joy.kb) { IN.joy.kb = false; IN.joy.on = false; IN.joy.x = IN.joy.z = 0; } } // arrow keys steer like the thumb stick
  const jx = IN.joy.x, jz = IN.joy.z, jm = IN.joy.on ? Math.hypot(jx, jz) : 0; let chase = null;
  // auto-cast: skills switched to auto fire by themselves at the nearest foe, only while foes are near
  if (h.autoc && !P.act) for (let i = 1; i < 4; i++) { if (!h.autoc[i] || !h.bar[i]) continue; const sk = SKILLS[h.bar[i]], e = nearFoe(sk.type === 'melee' || sk.type === 'nova' || sk.type === 'spin' ? (sk.range || sk.r || 3) * .8 : 11); if (!e || (P.cds[h.bar[i]] || 0) > 0 || P.mana < (sk.cost || 0)) continue; const esc = sk.type === 'dash' && !sk.land; if (esc) continue; if (tryCast(i, e.x, e.z)) return; }
  for (let i = 0; i < 4; i++) if (IN.tb[i]) {
    const e = nearFoe(15), sk = SKILLS[i === 0 && !h.eq.weapon ? 'punch' : h.bar[i]];
    const melee = sk && sk.type === 'melee', dash = sk && sk.type === 'dash', steer = jm >= .18, far = dash ? sk.range * .85 : 6;
    if (e && melee) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > sk.range * .78 + e.r) { if (steer) continue; if (d < 10) { chase = e; break; } } } // out of reach: the stick steers, or at rest the hero closes in
    if (!e && steer && sk && (melee || sk.basic)) continue; // nothing to hit while running: keep running
    const t = steer && (dash || !e) ? [P.x + jx / jm * far, P.z + jz / jm * far] : e && !(dash && !sk.land) ? [e.x, e.z] : [P.x + Math.sin(P.rot) * far, P.z + Math.cos(P.rot) * far];
    if (tryCast(i, t[0], t[1])) return;
  }
  if (IN.lmb || IN.lmbFresh) {
    if (IN.shift) { P.atk = P.move = P.inter = P.pick = null; IN.lmbFresh = false; tryCast(0); return; }
    if (IN.lmbFresh) { IN.lmbFresh = false; if (P.pickNow) { P.pick = P.pickNow; P.pickNow = null; P.atk = P.inter = P.move = null; } else if (G.hoverObj) { P.inter = G.hoverObj; P.atk = P.move = P.pick = null; } else if (G.hover) { P.atk = G.hover; P.inter = P.move = P.pick = null; } else { P.atk = P.inter = P.pick = null; P.move = [IN.gx, IN.gz]; } }
    else if (!P.atk && !P.inter && !P.pick) { if (G.hover) P.atk = G.hover; else P.move = [IN.gx, IN.gz]; }
  }
  let tx, tz, spK = 1;
  if (P.atk && !P.atk.alive) { P.atk = null; }
  if (jm >= .18) { P.atk = P.inter = P.pick = P.move = null; tx = P.x + jx / jm * 4; tz = P.z + jz / jm * 4; spK = Math.min(1, .45 + jm * .7); }
  else if (chase) { P.atk = P.inter = P.pick = P.move = null; tx = chase.x; tz = chase.z; }
  else if (P.atk) { const e = P.atk, d = Math.hypot(e.x - P.x, e.z - P.z); if (d <= (SKILLS[G.hero.bar[0]] || SKILLS.cleave).range * .78 + e.r) { tryCast(0, e.x, e.z); if (!IN.lmb) P.atk = null; return; } tx = e.x; tz = e.z; }
  else if (P.pick) { if (!G.drops.includes(P.pick)) P.pick = null; else { if (Math.hypot(P.pick.x - P.x, P.pick.z - P.z) < 2.3) { pickup(P.pick); P.pick = null; return; } tx = P.pick.x; tz = P.pick.z; } }
  else if (P.inter) { const o = P.inter; if (Math.hypot(o.x - P.x, o.z - P.z) < 2.6) { interact(o); P.inter = null; return; } tx = o.x; tz = o.z; }
  else if (P.move) { tx = P.move[0]; tz = P.move[1]; if (Math.hypot(tx - P.x, tz - P.z) < .3) { P.move = null; tx = undefined; } }
  if (tx !== undefined) {
    const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz) || 1, sp = s.msT * (P.spin ? .8 : 1) * spK, st = Math.min(d, sp * dt);
    if (!P.spin) { let da = Math.atan2(dx, dz) - P.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; P.rot += da * Math.min(1, dt * 18); }
    const ox = P.x, oz = P.z; moveEnt(P, dx / d * st, dz / d * st, .55); let moved = Math.hypot(P.x - ox, P.z - oz);
    if (moved < st * .5) { const ccx = (Math.floor(P.x / CS) + .5) * CS, ccz = (Math.floor(P.z / CS) + .5) * CS; if (Math.abs(dx) > Math.abs(dz)) moveEnt(P, 0, Math.sign(ccz - P.z) * Math.min(st, Math.abs(ccz - P.z)), .55); else moveEnt(P, Math.sign(ccx - P.x) * Math.min(st, Math.abs(ccx - P.x)), 0, .55); moved = Math.hypot(P.x - ox, P.z - oz); }
    if (moved < st * .15) { if (P.move && !IN.lmb) P.move = null; } else { P.moving = true; P.walk += moved * 1.5; }
  }
}
// ---- skill choices ----
function knows(h, id) { const sk = SKILLS[id]; return !!sk && (sk.basic ? CLASSES[h.cls].skills.includes(id) : (h.picks || []).includes(id)); }
function pendingPick(h) { const t = skillTiers(h.cls); for (let i = 0; i < t.length; i++) if (h.level >= TIER_LV[i] && !h.picks[i]) return i; return -1; }
function pickSkill(i, id) {
  const h = G.hero, t = skillTiers(h.cls)[i]; if (!t || !t.includes(id) || h.level < TIER_LV[i]) return false; const old = h.picks[i]; if (old === id) return true;
  h.picks[i] = id; let j = old ? h.bar.indexOf(old) : -1; if (j < 1) j = h.bar.indexOf(null, 1); if (j > 0) h.bar[j] = id; else if (old) { const k = h.bar.indexOf(old); if (k > 0) h.bar[k] = null; }
  SFX.play('shrine'); hint((old ? 'Swapped to ' : 'Learned ') + SKILLS[id].n + (j > 0 ? ' — on ' + SLOT_KEY[j] + '.' : ' — open Skills to slot it.')); if (typeof UI !== 'undefined') UI.buildBar(); saveGame(); return true;
}
function setSkill(slot, id) {
  const h = G.hero, sk = SKILLS[id]; if (!sk || !knows(h, id)) return false; if (!!sk.basic !== (slot === 0)) return false;
  const j = h.bar.indexOf(id); if (j === slot) return true; if (j >= 0) h.bar[j] = h.bar[slot]; h.bar[slot] = id; SFX.play('pickup'); saveGame(); return true;
}
function giveItem(i) {
  const h = G.hero, it = h.inv[i]; if (!it || !G.online) return false; let b = null, bd = 16; for (const id in NET.peers) { const q = NET.peers[id], d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; b = q; } }
  if (!b) { hint('No party member close enough to give this to.'); return false; } NET.send({ t: 'give', to: b.id, item: it }); h.inv[i] = null; hint('Gave ' + it.name + ' to ' + b.name + '.'); saveGame(); return true;
}
const FLASK_MAX = 5, FLASK_CD = 15; // up to five potions saved; one refills every 15 seconds
function useFlask() { if (P.dead) return; if (P.fl === undefined) P.fl = FLASK_MAX; if (P.hp >= P.stats.maxLife) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('You are at full health. The potion is saved.'); } return; } if (P.fl <= 0) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('No potions left. The next one is ready in ' + Math.ceil(P.flaskCd) + ' seconds.'); } return; } if (P.flaskT > 0) return; P.fl--; if (!(P.flaskCd > 0)) P.flaskCd = FLASK_CD; P.flaskT = 1.2; SFX.play('flask'); burst(P.x, 1.4, P.z, 0xff4a4a, 14, 4); }
function pickup(d) {
  const i = G.drops.indexOf(d); if (i < 0) return;
  if (d.globe) { P.hp = Math.min(P.stats.maxLife, P.hp + P.stats.maxLife * .25); floatText(d.x, 1.4, d.z, '+life', '#ff6a6a', .8, 14); SFX.play('flask'); G.drops.splice(i, 1); return; }
  if (d.gold) { G.hero.gold += d.gold; floatText(d.x, 1.2, d.z, '+' + d.gold + ' gold', '#ffd84a', .9, 13); SFX.play('gold'); G.drops.splice(i, 1); return; }
  if (!addItem(d.item)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Inventory is full. Open it (I) and scrap or drop something.'); } return; }
  G.drops.splice(i, 1); SFX.play('pickup'); floatText(d.x, 1.4, d.z, d.item.name, RAR[d.item.rar].c, 1.1, 13); UI.invDirty = true;
  if (d.item.rar >= 3 && !d.item.fd) { d.item.fd = 1; if (G.online) NET.send({ t: 'found', item: d.item.name, r: d.item.rar }); else hint('You found a ' + RAR[d.item.rar].n + ' item: ' + d.item.name); }
}
function nearFoe(r) { let b = null, bd = r; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z) - e.r; if (d < bd) { bd = d; b = e; } } return b; }
function nearObj() { if (!G.zone) return null; let b = null, bd = 1e9; for (const o of G.zone.objs) { if (o.used) continue; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < (o.kind === 'portal' ? 5.5 : 3.6) && d < bd) { bd = d; b = o; } } return b; }
function useNear() { const o = nearObj(); if (o) interact(o); else pickupNear(); }
function pickupNear() { for (const d of G.drops.slice()) if (d.item && Math.hypot(d.x - P.x, d.z - P.z) < 5 && d.item.rar >= G.hero.filter) pickup(d); }
function interact(o) {
  if (o.used) return;
  if (o.kind === 'chest') { o.used = true; const lv = G.hero.level; for (let i = 0; i < 3; i++) dropItem(o.x, o.z, makeItem(lv, null, rollRarity(1))); dropGold(o.x, o.z, (10 + lv * 5) * rnd(.8, 1.5)); burst(o.x, 1, o.z, 0xffd84a, 20, 6); SFX.play('pickup'); }
  else if (o.kind === 'shrine') { o.used = true; P.buffs.push({ s: o.sh.s, t: 45, n: o.sh.n }); computeStats(); ring(o.x, o.z, 0, 8, .7, o.sh.c); SFX.play('shrine'); hint(o.sh.n + ' empowers you for 45 seconds.'); }
  else if (o.kind === 'stash' || o.kind === 'vendor' || o.kind === 'altar') UI.openTown(o.kind);
  else if (o.kind === 'tportal') leaveTown();
  else if (o.kind === 'portal') { if (G.online) NET.send({ t: 'next' }); else { G.hero.depth = (G.hero.depth || 0) + 1; enterZone(); } }
  else if (o.kind === 'pback') { if (G.online) NET.send({ t: 'prev' }); else { G.hero.depth = Math.max(0, (G.hero.depth || 0) - 1); enterZone(); } }
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
  if (e.cd2 > 0) e.cd2 -= dt;
  if (e.st === 'cwind') { if (e.t <= 0) { e.st = 'charge'; e.t = .5; e.chit = false; } return; } // rush telegraphed: it has locked its line
  if (e.st === 'wind') { face(); if (e.t <= 0) { e.atk = 1; if (e.arch === 'caster' && e.md.v === 'lob') addArea({ x: e.lx, z: e.lz, r: 2.3, delay: .75, owner: 'e', dmg: e.dmg * 1.1, el: G.zone.th.elem, c: e.md.e, src: e }); else if (e.arch === 'caster') eShoot(e, Math.atan2(dx, dz), 12, 1, G.zone.th.elem); else if (e.arch === 'bomber') { addArea({ x: e.x, z: e.z, r: 3.3, delay: .05, owner: 'e', dmg: e.dmg, el: 'fire', c: 0xff7a2a }); e.noXp = true; killEnemy(e); return; } else if (e.arch !== 'brute' && d <= a.reach + e.r + .9) dmgPlayer(e.dmg, 'phys', e); e.st = 'rec'; e.t = a.rec / (e.hasted ? 1.3 : 1); } return; }
  if (e.st === 'rec') { if (e.t <= 0) e.st = 'chase'; return; }
  face();
  if (e.boss) {
    const q = Math.ceil(e.hp / e.maxHp * 4); if (e.q && q < e.q) for (let i = 0; i < 2; i++) G.drops.push({ x: e.x + rnd(-4, 4), z: e.z + rnd(-4, 4), globe: 1, t: 0 }); e.q = q;
    if (e.spiral > 0) { e.spiral -= dt; e.spT = (e.spT || 0) - dt; if (e.spT <= 0) { e.spT = .09; e.spA = (e.spA || 0) + .5; eShoot(e, e.spA, 10, .7, G.zone.th.elem); eShoot(e, e.spA + Math.PI, 10, .7, G.zone.th.elem); } return; }
    e.pt -= dt; if (e.pt <= 0) { e.pt = e.hp < e.maxHp * .4 ? 2.3 : 3.3; bossPattern(e); return; }
  }
  if (e.arch === 'caster') { if (d > 11) go(1); else if (d < 6) go(-1, .8); else { const sd = Math.sin(G.time * .5 + e.id) > 0 ? 1 : -1, st = sp * dt * .55; moveEnt(e, dz / d * st * sd, -dx / d * st * sd, e.r * .8); e.walk += st * 1.6; } // keeps moving sideways so it is harder to line up
    if (e.cd <= 0 && d < 14) { e.cd = 2.4; e.st = 'wind'; e.t = a.wind; e.lx = P.x; e.lz = P.z; } return; }
  if (e.md.v === 'charge' && !e.boss && d > 4.5 && d < 10 && !(e.cd2 > 0)) { e.cd2 = 5.5; e.st = 'cwind'; e.t = .7; e.cdir = Math.atan2(dx, dz); e.rot = e.cdir; for (const k of [3, 6, 9]) addArea({ x: e.x + Math.sin(e.cdir) * k, z: e.z + Math.cos(e.cdir) * k, r: 1.1, delay: .7, owner: 'e', vis: true, dmg: 0, el: 'phys', c: 0xff4a2a }); return; }
  const reach = a.reach + e.r * .5;
  if (d > reach) { if (d > 3.2 && !e.boss && e.arch !== 'brute') { if (e.fl === undefined) e.fl = ((e.id * 7919 % 100) / 100 - .5) * 6; const fx = P.x - dz / d * e.fl - e.x, fz = P.z + dx / d * e.fl - e.z, fd = Math.hypot(fx, fz) || 1, st = sp * dt; moveEnt(e, fx / fd * st, fz / fd * st, e.r * .8); e.walk += st * 1.6; } else go(1); } // the pack fans out to surround instead of queueing up
  else if (e.cd <= 0) {
    e.cd = .3; e.st = 'wind'; e.t = a.wind / (e.hasted ? 1.3 : 1);
    if (e.arch === 'brute') addArea({ x: e.x + dx / d * 2, z: e.z + dz / d * 2, r: 3, delay: e.t, owner: 'e', dmg: e.dmg, el: 'phys', c: 0xff4a2a, src: e });
    else if (e.boss) addArea({ x: e.x + dx / d * 2.5, z: e.z + dz / d * 2.5, r: 4, delay: e.t, owner: 'e', dmg: e.dmg * 1.3, el: 'phys', c: 0xff4a2a, src: e });
  }
}
function update(dt) {
  if (typeof UI !== 'undefined' && UI.panelOpen && UI.panelOpen()) { if (!G.online) return; G.menuHold = true; P.iframes = Math.max(P.iframes || 0, .4); P.move = P.atk = null; } else G.menuHold = false; // menus pause the game; online, where the world cannot stop, they shield you instead
  if (G.hitStop > 0) { G.hitStop -= dt; dt *= .12; } // a heavy blow lands: the world holds its breath for a few frames
  if (G.auto && G.hero && G.hero.picks) { const i = pendingPick(G.hero); if (i >= 0) pickSkill(i, skillTiers(G.hero.cls)[i][Math.random() * 2 | 0]); }
  SFX.ambTick(dt); updAlly(dt); G.time += dt; if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
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
  if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) { if (o.kind !== 'portal' && o.kind !== 'pback') continue; const dd = Math.hypot(o.x - P.x, o.z - P.z), R = o.kind === 'portal' ? 1.9 : 1.4; if (dd > R + 1.5) o.arm = true; else if (dd < R && o.arm && !o.gone) { o.gone = true; interact(o); return; } } // step into a gate to travel
  for (const d of G.drops.slice()) { d.t += dt; if (d.item && d.t > .5 && G.set.autoLoot !== false && !P.dead && d.item.rar >= G.hero.filter && Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && G.time - (d.tryT || -9) > 2.5) { d.tryT = G.time; pickup(d); continue; } // walk over loot to collect it
    if (d.globe) { if (Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && P.hp < P.stats.maxLife) pickup(d); } else if (d.gold && d.t > .3) { const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < 4.5) { d.x += (P.x - d.x) / dd * 14 * dt; d.z += (P.z - d.z) / dd * 14 * dt; if (dd < .9) pickup(d); } } }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) { G.fx.splice(i, 1); continue; } if (!f.ring && !f.slash && !f.bolt && !f.flash) { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 14 * dt; if (f.y < .05) { f.y = .05; f.vy *= -.3; } } }
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
function gearDecode(c) { const g = {}; if (typeof c !== 'string' || c.length !== GSL.length * 2) return null; GSL.forEach((sl, i) => { const b = c.charCodeAt(i * 2) - 48, r = c.charCodeAt(i * 2 + 1) - 48; g[sl] = b >= 0 && b <= 9 && r >= 0 && r <= 4 ? [b, r] : null; }); return g; }
const DEFGEAR = gearDecode('0101011101010101010100');
const TRIMC = [0x77726a, 0x5878d8, 0xd8b030, 0xff8a2a, 0xb060ff];
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
  if (L.robe) { p('taper', 0, .62, 0, 0, 0, 0, 0, 0, 0, .86, 1.2, .8, ac, am); p('cyl', 0, .08, 0, 0, 0, 0, 0, 0, 0, .9, .1, .84, trim, 4, te); p('box', 0, .62, .37, .12, 0, 0, 0, 0, 0, .2, 1.0, .04, trim, 0, te); for (const sd of [1, -1]) p('sphere', .16 * sd, .08, .12 + sd * lg * .25, 0, 0, 0, 0, 0, 0, .2, .14, .38, bm ? bm[0] : skin, bm ? bm[1] : 0); }
  else for (const sd of [1, -1]) {
    const r = sd * lg + air * (sd > 0 ? 1 : .5), shc = bm ? bm[0] : pm[0], shm = bm ? bm[1] : pm[1]; p('taper', .16 * sd, .98, 0, r, 0, 0, 0, -.25, 0, .3, -.54, .32, pm[0], pm[1]); p('sphere', .16 * sd, .98, 0, r, 0, 0, 0, -.5, .03, .22, .22, .24, pm[0], pm[1]); p('taper', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.7, .0, .24, -.46, .27, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.6, -.06, .2, .26, .2, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.93, .1, .2, .13, .4, bm ? bm[0] : dkLeather, bm ? bm[1] : 0);
    if (bm) p('cyl', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.5, .02, .25, .07, .27, tr(g.boots)[0], 4, tr(g.boots)[1]);
    if (g.pants) { p('sphere', .17 * sd, .95, 0, r * 1.1, 0, 0, 0, -.46, .1, .2, .18, .2, pm[0], pm[1]); if (g.pants[0] === 0) p('box', .2 * sd, 1.0, .02, .06 + sd * lg * .4, 0, -sd * .12, 0, -.2, .14, .24, .36, .06, steelC, 4); else p('box', .16 * sd, .98, -.02, .16 + mv * .25, 0, 0, 0, -.3, -.2, .16, .5, .04, cloth); }
  }
  let lean = .06, rx = -lg * .7, ry = 0, lrx = lg * .6 - .2, lry = 0, drw = -1;
  if (o.act) { const k = o.swing, e = k < .42 ? k / .42 : 1; lean = .28 * Math.sin(k * Math.PI); if (wt === 'bow') { drw = k < .42 ? k / .42 : 0; const pull = k < .42 ? drw : 1; rx = -1.57; ry = -1.0 - pull * .45; lrx = -1.57; lry = .36; lean = .03; } else if (ranged) { rx = -1.55; lrx = -1.5; lean = .05; } else if (o.act.sk.type === 'nova') rx = -3 + e * 2.6; else if (wt === 'fist' || wt === 'none') { rx = -1.5 + Math.sin(k * 6.28) * .5; lrx = -1.5 - Math.sin(k * 6.28) * .5; } else { rx = -1.5; ry = 1.3 - e * 2.6; } }
  if (spin) { rx = -1.5; ry = .3; lrx = -1.5; } if (o.dash) rx = -2.8;
  // torso, belt
  p('taper', 0, 1.36, 0, lean, 0, 0, 0, 0, 0, .7, -.7, .46, ac, am); p('sphere', 0, 1.52, -.01, lean, 0, 0, 0, 0, 0, .74, .44, .4, ac, am); p('sphere', 0, 1.06, 0, lean, 0, 0, 0, 0, 0, .6, .34, .42, g.pants && !L.robe ? pm[0] : ac, g.pants && !L.robe ? pm[1] : am); if (!L.robe) p('cyl', 0, .98, 0, lean, 0, 0, 0, -.12, 0, .6, .32, .44, g.pants ? pm[0] : under, g.pants ? pm[1] : 0);
  if (plate) { p('sphere', 0, 1.5, .14, lean, 0, 0, 0, 0, 0, .5, .44, .3, ac, 4); p('cyl', 0, 1.74, 0, lean, 0, 0, 0, 0, 0, .34, .1, .34, ac, 4); p('box', 0, 1.18, .24, lean, 0, 0, 0, 0, 0, .34, .2, .05, shade(ac, .6), 4); }
  else if (g.chest) { p('box', 0, 1.3, .22, lean, 0, 0, 0, 0, 0, .14, .5, .06, trim, 0, te); if (L.robe) p('taper', 0, 1.62, 0, lean, 0, 0, 0, 0, 0, .98, .26, .7, shade(ac, 1.2)); }
  if (g.chest) p('box', 0, 1.46, .26, lean, 0, 0, 0, 0, 0, .5, .05, .04, trim, 4, te);
  if (g.belt) { const bt = tr(g.belt); p('box', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .56, .16, .4, g.belt[0] === 0 ? dkLeather : cloth); p('box', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .18, .16, .06, bt[0], 4, bt[1]); } else p('box', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .5, .06, .34, dkLeather);
  if (g.amulet) { const at = tr(g.amulet); p('gem', 0, 1.6, .3, lean, G.time, 0, 0, 0, 0, .1, .14, .08, at[0], 0, 1.2); }
  // head (drawn a little smaller than the body so the proportions read as human)
  const hp = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => p(gm2, px * .84, 1.82 + (py - 1.8) * .84, pz * .84, rx, ry, rz, ox * .84, oy * .84, oz * .84, sx * .84, sy * .84, sz * .84, c, m, e);
  p('cyl', 0, 1.8, 0, lean, 0, 0, 0, 0, 0, .15, .16, .15, skin); hp('sphere', 0, 2.0, .02, lean, 0, 0, 0, 0, 0, .34, .42, .37, skin); hp('sphere', 0, 1.9, .05, lean, 0, 0, 0, 0, 0, .27, .22, .28, skin);
  const hb = g.helm ? g.helm[0] : -1, ht = tr(g.helm);
  if (hb === 0) { hp('sphere', 0, 2.04, -.07, lean, 0, 0, 0, 0, 0, .43, .42, .36, steelC, 4); hp('sphere', 0, 2.12, -.03, lean, 0, 0, 0, 0, 0, .45, .3, .46, steelC, 4); hp('box', 0, 2.13, .2, lean, 0, 0, 0, 0, 0, .3, .05, .05, ht[0], 4, ht[1]); hp('cone', 0, 2.34, -.08, lean - .5, 0, 0, 0, .1, 0, .1, .5, .16, cloth); for (const sd of [1, -1]) { hp('box', .17 * sd, 1.92, .12, lean, 0, 0, 0, 0, 0, .06, .22, .16, steelC, 4); if (g.helm[1] >= 1) hp('cone', .2 * sd, 2.22, -.04, lean, 0, -sd * .8, 0, .12, 0, .09, .2 + g.helm[1] * .08, .09, ht[0], 4, ht[1]); } }
  else if (hb === 1) { hp('sphere', 0, 2.05, -.05, lean, 0, 0, 0, 0, 0, .46, .44, .48, cloth); hp('cone', 0, 2.2, -.14, lean - .9, 0, 0, 0, .12, 0, .34, .4, .3, cloth); hp('box', 0, 2.14, .2, lean, 0, 0, 0, 0, 0, .3, .04, .04, ht[0], 4, ht[1]); }
  else { const hair = col(cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0x9c98ac : 0x4a3626); hp('sphere', 0, 2.1, -.06, lean, 0, 0, 0, 0, 0, .4, .32, .42, hair); if (cls === 'brawler') hp('sphere', 0, 2.26, -.1, lean, 0, 0, 0, 0, 0, .16, .16, .16, hair); else hp('box', 0, 1.94, -.2, lean, 0, 0, 0, 0, 0, .34, .3, .1, hair); if (hb === 2) { hp('cyl', 0, 2.12, 0, lean, 0, 0, 0, 0, 0, .42, .06, .44, gold, 4); hp('gem', 0, 2.14, .22, lean, 0, 0, 0, 0, 0, .08, .1, .06, ht[0], 0, 1.4); } }
  // face: eyes that blink, brows, nose, mouth, ears, and a little character per class
  { const fz = .185, hairF = col(cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0x9c98ac : 0x4a3626), blink = ((G.time + o.x * .37) % 4.3) < .12, eyeC = col(cls === 'arcanist' ? 0x9a5aff : cls === 'elementalist' ? 0xc8641e : cls === 'ranger' ? 0x3a7a3a : 0x3a5a8a);
    for (const sd of [1, -1]) {
      hp('sphere', .078 * sd, 2.03, fz, lean, 0, 0, 0, 0, 0, .085, blink ? .012 : .058, .03, col(0xf2eee2), 0, .25); if (!blink) hp('sphere', .078 * sd, 2.03, fz + .014, lean, 0, 0, 0, 0, 0, .042, .046, .02, eyeC, 0, cls === 'arcanist' ? 1.2 : .2), hp('sphere', .078 * sd, 2.03, fz + .022, lean, 0, 0, 0, 0, 0, .018, .02, .012, col(0x050505));
      hp('box', .08 * sd, 2.085, fz + .004, lean, 0, sd * (cls === 'warden' || cls === 'brawler' ? .28 : .1), 0, 0, 0, .1, .02, .025, hairF); hp('sphere', .19 * sd, 2.0, 0, lean, 0, 0, 0, 0, 0, .05, .09, .06, skin);
      hp('sphere', .115 * sd, 1.955, fz - .04, lean, 0, 0, 0, 0, 0, .07, .06, .04, shade(skin, 1.03, .97, .95));
    }
    hp('box', 0, 1.99, fz + .02, lean - .12, 0, 0, 0, 0, 0, .045, .09, .055, shade(skin, .9)); hp('box', 0, 1.9, fz, lean, 0, 0, 0, 0, 0, .1, .02, .02, col(cls === 'elementalist' ? 0xa83a3a : 0x6a322c)); hp('box', 0, 1.84, fz - .03, lean, 0, 0, 0, 0, 0, .12, .05, .05, skin);
    if (cls === 'warden') { hp('box', 0, 1.86, fz - .035, lean, 0, 0, 0, 0, 0, .24, .1, .05, shade(hairF, .8)); hp('box', 0, 1.93, fz + .005, lean, 0, 0, 0, 0, 0, .13, .025, .02, hairF); hp('box', .1, 1.97, fz + .006, lean, 0, .5, 0, 0, 0, .012, .1, .01, col(0x8a4a40)); }
    else if (cls === 'arcanist') { hp('cone', 0, 1.86, fz - .04, lean + 3.0, 0, 0, 0, .16, 0, .2, .36, .1, hairF); hp('box', 0, 1.925, fz + .005, lean, 0, 0, 0, 0, 0, .16, .03, .02, hairF); }
    else if (cls === 'brawler') { hp('box', 0, 1.925, fz + .005, lean, 0, 0, 0, 0, 0, .15, .028, .02, hairF); hp('cone', 0, 1.84, fz - .02, lean + 3.0, 0, 0, 0, .06, 0, .07, .14, .05, hairF); }
    else if (cls === 'ranger') { for (const sd of [1, -1]) hp('box', .1 * sd, 1.975, fz + .002, lean, 0, 0, 0, 0, 0, .09, .02, .012, col(0x2f6a34)); }
    else { for (const sd of [1, -1]) hp('box', .078 * sd, 2.06, fz + .006, lean, 0, 0, 0, 0, 0, .1, .012, .012, col(0x1a1210)); hp('sphere', 0, 2.1, fz - .02, lean, 0, 0, 0, 0, 0, .05, .05, .03, col(0xff7a2a), 0, 1.4); }
  }
  // shoulders
  if (sm) { const st = tr(g.shoulders), big = g.shoulders[0] === 0; for (const sd of [1, -1]) { p('sphere', .47 * sd, 1.7, 0, 0, 0, 0, 0, 0, 0, big ? .44 : .34, big ? .36 : .26, big ? .44 : .36, sm[0], sm[1]); p('cyl', .47 * sd, 1.64, 0, 0, 0, 0, 0, 0, 0, big ? .48 : .38, .05, big ? .48 : .38, st[0], 4, st[1]); if (big && g.shoulders[1] >= 1) p('cone', .56 * sd, 1.84, 0, 0, 0, -sd * .9, 0, .12, 0, .16, .2 + g.shoulders[1] * .08, .16, sm[0], 4); } }
  else for (const sd of [1, -1]) p('sphere', .46 * sd, 1.66, 0, 0, 0, 0, 0, 0, 0, .26, .24, .26, ac, am);
  // arms: sleeve, bracer, hand
  for (const sd of [1, -1]) {
    const arx = sd > 0 ? rx : lrx, ary = sd > 0 ? ry : lry, px = .47 * sd;
    const slv = shade(ac, g.chest ? .8 : .92); p('taper', px, 1.62, 0, arx, ary, 0, 0, -.18, 0, .21, -.38, .21, slv, am); p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .17, .17, .17, slv, am);
    p('taper', px, 1.62, 0, arx, ary, 0, 0, -.5, 0, brm ? .21 : .165, -.3, brm ? .21 : .165, brm ? brm[0] : skin, brm ? brm[1] : 0); if (brm) p('cyl', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .22, .05, .22, tr(g.bracers)[0], 4, tr(g.bracers)[1]);
    const fist = wt === 'fist'; p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.68, 0, fist ? .25 : .15, fist ? .25 : .2, fist ? .25 : .13, fist ? dkLeather : gm ? gm[0] : skin, gm ? gm[1] : 0); if (!fist) p('sphere', px, 1.62, 0, arx, ary, 0, -sd * .07, -.66, .04, .06, .12, .06, gm ? gm[0] : skin, gm ? gm[1] : 0);
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
  } else if (wt === 'bow') {
    const bc = wglow || wood, be = wglow ? .6 : 0, strC = col(0xe8e0d0);
    if (drw < 0) { p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -.2, .7, .05, .7, .06, bc, 3, be); p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -1.0, .64, .05, .7, .06, bc, 3, be); p('box', -.47, 1.62, 0, lrx, 0, 0, 0, -.62, .5, .015, 1.5, .015, strC); }
    else {   // aiming: bow upright in the left hand, string drawn back to the cheek, arrow nocked until release
      const X = -.2, Y = 1.62, Z = .78, az = Z - .14 - drw * .55, tz = Z - .2;
      p('box', X, Y, Z, 0, 0, 0, 0, 0, 0, .07, .3, .08, col(0x4a3524)); for (const sd of [1, -1]) { p('box', X, Y + sd * .38, Z - .01, -sd * .08, 0, 0, 0, 0, 0, .05, .5, .06, bc, 3, be); p('box', X, Y + sd * .8, Z - .09, -sd * .38, 0, 0, 0, 0, 0, .045, .42, .05, bc, 3, be); const dz = tz - az, len = Math.hypot(.98, dz); p('box', X, Y + sd * .49, az + dz / 2, sd * Math.atan2(dz, .98), 0, 0, 0, 0, 0, .014, len, .014, strC); }
      if (drw > 0) { p('box', X, Y, az + .6, 0, 0, 0, 0, 0, 0, .025, .025, 1.2, col(0xb89a6a)); p('cone', X, Y, az + 1.24, 1.5708, 0, 0, 0, 0, 0, .07, .14, .07, col(0xc8ced8), 4); for (const a of [0, 1.5708]) p('box', X, Y, az + .06, 0, 0, a, 0, 0, 0, .1, .012, .16, col(0xd8d0c0)); }
    }
  }
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
  if (e.alive && (e.st === 'wind' || e.st === 'cwind')) { const pr = clamp(1 - e.t / ((e.st === 'cwind' ? .7 : e.a.wind) || .5), 0, 1), cast = e.arch === 'caster', wc = col(cast ? 0xffe14a : 0xff3a2a), R = cast ? 1.6 : ((e.a.reach || 2) + e.r) * 2; GLX.obj('glow', 'ring', e.x, .09, e.z, 0, R * (.35 + pr * .65), 1, R * (.35 + pr * .65), wc, 1.4, .35 + pr * .55, -1); if (!cast) GLX.obj('glow', 'disc', e.x + Math.sin(e.rot) * (e.a.reach || 2) * .6, .08, e.z + Math.cos(e.rot) * (e.a.reach || 2) * .6, 0, R * .55, 1, R * .55, wc, 1, .12 + pr * .3, 1); GLX.halo(e.x, 2 * sc, e.z, 1 + pr * 1.4, wc, .25 + pr * .5); }
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
const BEAM = [0, 3.2, 6.5, 12, 18], RC = [0xc9c9c9, 0x5a8cff, 0xffd84a, 0xff8a2a, 0xb060ff];
function drawWorld() {
  const col = GLX.col, Z = G.zone;
  const sh = G.set.shake ? G.shake * G.shake * 1.5 : 0, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
  GLX.env.player = [P.x, 0, P.z]; GLX.env.t = G.time; const zf = innerWidth < innerHeight ? 1.3 : 1; GLX.setCamera([P.x + sx, 25 * G.zoom * zf + sz, P.z + 18 * G.zoom * zf], [P.x + sx, 1, P.z + sz], .66);
  if (ALLY.on) drawHero(ALLY, false);
  drawHero(P, true); if (G.online && !G.inTown) for (const id in NET.peers) { const q = NET.peers[id]; if (!q.dead) drawHero(q, false); }
  for (const e of G.ents) { if (Math.abs(e.x - P.x) > 34 || Math.abs(e.z - P.z) > 34) continue; drawEnemy(e); }
  for (const L of Z.lamps) { const d = Math.hypot(L.x - P.x, L.z - P.z); if (d > 32) continue; const c = col(L.big ? 0xff9a3a : Z.th.lamp), fl = 1 + Math.sin(G.time * 9 + L.x) * .08; GLX.light(L.x, L.big ? 2.2 : 1.2, L.z, L.big ? 13 : 7, c, (L.big ? 1.3 : .8) * fl); GLX.halo(L.x, L.big ? 1.6 : .5, L.z, L.big ? 3.2 : 1.8, c, .4 * fl); }
  for (const o of Z.objs) {
    if (Math.hypot(o.x - P.x, o.z - P.z) > 34) continue; const hov = G.hoverObj === o ? .5 : 0;
    if (o.kind === 'vendor') { NPCV.x = o.x; NPCV.z = o.z - 1.1; NPCV.rot = Math.atan2(P.x - NPCV.x, P.z - NPCV.z); drawHero(NPCV, false); if (hov) GLX.obj('glow', 'ring', o.x, .07, o.z, G.time, 4.6, 1, 4.6, col(0xffd84a), 1, .5, -1); continue; }
    if (o.kind === 'stash') { GLX.halo(o.x, 1.4, o.z + .8, 2 + hov * 2, col(0xffd84a), .3 + hov * .4); continue; }
    if (o.kind === 'altar') { const c = col(0xff7a2a), c2 = col(0xffd84a), t = G.time; GLX.obj('dyn', 'gem', o.x, 3 + Math.sin(t * 2) * .2, o.z, t, .8, 1.3, .8, c, 2.6); GLX.obj('glow', 'cyl', o.x, 9, o.z, t, .7, 16, .7, c, 1, .2); GLX.obj('glow', 'cyl', o.x, 9, o.z, -t, 1.8, 16, 1.8, c2, .6, .06);
      for (let k = 0; k < 6; k++) { const a = k * 1.0472 + .5, px = o.x + Math.cos(a) * 3.6, pz = o.z + Math.sin(a) * 3.6; GLX.obj('dyn', 'gem', px, 3.5 + Math.sin(t * 2 + k) * .12, pz, t + k, .26, .4, .26, k % 2 ? c2 : c, 2.2); GLX.halo(px, 3.5, pz, 1.4, c, .5); }
      for (let k = 0; k < 3; k++) GLX.obj('glow', 'ring', o.x, .4 + k * .05, o.z, t * (k % 2 ? -.6 : .6), 5 + k * 2.2, 1, 5 + k * 2.2, k % 2 ? c2 : c, 1, .5 - k * .12, -1);
      for (let k = 0; k < 10; k++) { const a = t * .8 + k * .628, y = (t * 1.6 + k * .7) % 6; GLX.obj('glow', 'sphere', o.x + Math.cos(a) * (2.4 - y * .3), 1.6 + y, o.z + Math.sin(a) * (2.4 - y * .3), 0, .1, .1, .1, c2, 2.4 * (1 - y / 6), .9); }
      GLX.halo(o.x, 3, o.z, 7 + hov * 2, c, .55 + hov * .3); GLX.light(o.x, 3, o.z, 20, c, 1.8, 5); if (hov) GLX.obj('glow', 'ring', o.x, .07, o.z, G.time, 7.4, 1, 7.4, c2, 1, .6, -1); continue; }
    if (o.kind === 'tportal') { const c = col(0x7ad0ff); for (let i = 0; i < 3; i++) GLX.obj('glow', 'ring', o.x, .1 + i * .9 + Math.sin(G.time * 2 + i) * .2, o.z, G.time * (1 + i), 3 - i * .5, 1, 3 - i * .5, c, 1, .9, -1); GLX.halo(o.x, 1.6, o.z, 5, c, .6); GLX.light(o.x, 2, o.z, 12, c, 1.4, 4); continue; }
    if (o.kind === 'chest') { const wd = col(0x6a4426), wd2 = col(0x4e3018), ir = col(0x3a3c44), gd = col(0xc9a030), ry = .4, cs = Math.cos(ry), sn = Math.sin(ry), at = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
      GLX.obj('dyn', 'box', o.x, .42, o.z, ry, 1.5, .84, .95, wd, hov, 1, 3); for (const lx of [-.5, 0, .5]) { const q = at(lx, 0); GLX.obj('dyn', 'box', q[0], .42, q[1], ry, .03, .86, .97, wd2, hov, 1, 3); }
      const ly = o.used ? 1.2 : .98; GLX.obj('dyn', 'box', o.x, ly, o.z - (o.used ? .35 : 0), ry, 1.56, .3, 1, wd, hov, 1, 3); GLX.obj('dyn', 'box', o.x, ly + .17, o.z - (o.used ? .35 : 0), ry, 1.4, .08, .84, wd2, hov, 1, 3);
      for (const lx of [-.6, .6]) { const q = at(lx, 0); GLX.obj('dyn', 'box', q[0], .5, q[1], ry, .12, 1.02, 1.0, ir, hov, 1, 4); } { const q = at(0, .5); GLX.obj('dyn', 'box', q[0], .78, q[1], ry, .26, .3, .08, gd, hov + .1, 1, 4); } for (const lx of [-.72, .72]) for (const lz of [-.44, .44]) { const q = at(lx, lz); GLX.obj('dyn', 'box', q[0], .1, q[1], ry, .12, .2, .12, ir, hov, 1, 4); }
      if (!o.used) GLX.halo(o.x, 1.2, o.z, 2.4, col(0xffd84a), .35 + Math.sin(G.time * 3) * .1); else GLX.obj('glow', 'box', o.x, .86, o.z, ry, 1.2, .04, .7, col(0xffd84a), 1, .25); }
    else if (o.kind === 'shrine') { const st = col(0x5a5c60), c = col(o.sh.c), t = G.time; GLX.obj('dyn', 'cyl', o.x, .12, o.z, 0, 3, .24, 3, st, hov, 1, 3); GLX.obj('dyn', 'cyl', o.x, .34, o.z, .4, 2.2, .22, 2.2, col(0x6a6c70), hov, 1, 3); GLX.obj('dyn', 'taper', o.x, 1.7, o.z, .78, 1.1, 2.6, 1.1, st, hov, 1, 3); GLX.obj('dyn', 'taper', o.x, 3.2, o.z, .78, .7, .5, .7, col(0x44464c), hov, 1, 3);
      for (let k = 0; k < 4; k++) { const a = k * 1.5708 + .78; GLX.obj('dyn', 'taper', o.x + Math.cos(a) * 1.25, .75, o.z + Math.sin(a) * 1.25, a, .3, 1, .3, st, hov, 1, 3); }
      if (!o.used) { for (const y of [1.1, 1.8, 2.5]) GLX.obj('glow', 'ring', o.x, y, o.z, t * .5 + y, 1.5 - y * .22, 1, 1.5 - y * .22, c, 1.2, .7, -1); GLX.obj('dyn', 'gem', o.x, 4 + Math.sin(t * 2) * .2, o.z, t, .8, 1.2, .8, c, 2.4); GLX.obj('glow', 'cyl', o.x, 7, o.z, t, .5, 9, .5, c, 1, .18); GLX.obj('glow', 'ring', o.x, .3, o.z, -t, 5.6, 1, 5.6, c, 1, .5 + Math.sin(t * 3) * .2, -1); GLX.halo(o.x, 4, o.z, 4.5, c, .7); GLX.light(o.x, 3, o.z, 13, c, 1.3); } }
    else if (o.kind === 'portal' || o.kind === 'pback') { // one clean gate: step in to travel
      const back = o.kind === 'pback', c = col(back ? 0xffb03a : 0x7ad0ff), t = G.time, R = back ? 1.6 : 2.4;
      GLX.obj('dyn', 'cyl', o.x, .08, o.z, 0, R * 2.3, .16, R * 2.3, col(0x4a4c56), 0, 1, 3); GLX.obj('glow', 'disc', o.x, .2, o.z, t * .6, R * 2, 1, R * 2, c, 1, .55, 1);
      for (let k = 0; k < 3; k++) GLX.obj('glow', 'ring', o.x, .3 + k * 1.1 + Math.sin(t * 2 + k) * .15, o.z, t * (k % 2 ? -1.2 : 1.2), R * (2 - k * .35), 1, R * (2 - k * .35), c, 1, .8, -1);
      GLX.obj('glow', 'cyl', o.x, 5, o.z, t, R * .5, 10, R * .5, c, 1, .16); GLX.halo(o.x, 2, o.z, R * 3.2, c, .4); GLX.light(o.x, 2.5, o.z, back ? 10 : 18, c, 1.3, 5);
    }
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
    if (p.arrow) { GLX.obj('dyn', 'box', p.x, 1.25, p.z, p.rot, .05, .05, 1.2, col(0xd8c8a0), .3); GLX.obj('dyn', 'cone', p.x + Math.sin(p.rot) * .65, 1.25, p.z + Math.cos(p.rot) * .65, p.rot, .1, .1, .22, col(0xc8ced8), .2, 1, 4); GLX.halo(p.x, 1.25, p.z, 1.1, p.c, .35); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * 1.8, 1.25, p.z - Math.cos(p.rot) * 1.8, p.rot, .03, .03, 2.4, p.c, 1, .18); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .9, 1.25, p.z - Math.cos(p.rot) * .9, p.rot, .05, .05, 1.6, p.c, 1, .35); }
    else { const s = p.r * 1.5, sx = Math.sin(p.rot), cz2 = Math.cos(p.rot); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, s, s, s, p.c, 2.2, 1); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, s * .5, s * .5, s * .5, col(0xffffff), 2, .9); GLX.halo(p.x, 1.25, p.z, p.r * 7, p.c, .7); for (let k = 1; k <= 5; k++) { const q = s * (1 - k * .15), wob = Math.sin(G.time * 30 + k * 1.7) * .08 * k; GLX.obj('glow', 'sphere', p.x - sx * k * .42 + cz2 * wob, 1.25 + Math.cos(G.time * 26 + k) * .05 * k, p.z - cz2 * k * .42 - sx * wob, 0, q, q, q, p.c, 1.4, .6 - k * .1); } GLX.obj('glow', 'ring', p.x, 1.25, p.z, G.time * 8, s * 1.9, 1, s * 1.9, p.c, 1, .35, -1); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .8, 1.25, p.z - Math.cos(p.rot) * .8, p.rot, p.r * .5, p.r * .5, 1.6, p.c, 1, .4); if (pl++ < 3) GLX.light(p.x, 1.5, p.z, 6, p.c, .8, 1); }
  }
  for (const p of G.projs) { GLX.obj('glow', 'sphere', p.x, 1.2, p.z, 0, p.r * 1.6, p.r * 1.6, p.r * 1.6, p.c, 1.6, 1); GLX.halo(p.x, 1.2, p.z, p.r * 5, p.c, .6); }
  for (const a of G.areas) {
    const c = col(a.c), k = clamp(a.t / a.delay, 0, 1), d = a.r * 2;
    GLX.obj('glow', 'ring', a.x, .09, a.z, 0, d, 1, d, c, 1, a.owner === 'e' ? .9 : .5, -1); GLX.obj('glow', 'disc', a.x, .08, a.z, 0, d * k, 1, d * k, c, 1, a.owner === 'e' ? .35 : .2, 0);
  }
  // the air itself: fireflies, embers, snow or dust, anchored to the world so they do not swim with the camera
  if (GLX.env.q > 0 && G.zone) {
    const kind = G.zone.th.amb || 'dust', n = GLX.env.q > 1 ? 4 : 3, cx = Math.floor(P.x / 6), cz = Math.floor(P.z / 6), t = G.time, pc = col(kind === 'fly' ? 0xd8ff70 : kind === 'ember' ? 0xff7a2a : kind === 'snow' ? 0xdfeeff : 0xc8c0a8);
    for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) {
      const gx = cx + ix, gz = cz + iz; let s = ((gx * 73856093) ^ (gz * 19349663)) >>> 0; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; r();
      const x = gx * 6 + r() * 6, z = gz * 6 + r() * 6, ph = r() * 6.28, sp = .4 + r() * .8, y0 = r();
      if (kind === 'fly') { const bl = Math.sin(t * sp * 1.7 + ph); if (bl > .2) GLX.obj('glow', 'sphere', x + Math.sin(t * sp + ph) * 1.3, 1 + y0 * 2 + Math.sin(t * sp * .7 + ph) * .5, z + Math.cos(t * sp * .8 + ph) * 1.3, 0, .1, .1, .1, pc, 2.4 * bl, .9); }
      else if (kind === 'ember') { const y = (t * sp * .9 + ph) % 5; GLX.obj('glow', 'sphere', x + Math.sin(t * sp + ph + y) * .6, y, z + Math.cos(t * .7 + ph) * .4, 0, .08, .08, .08, pc, 2.6 * (1 - y / 5), .9); }
      else if (kind === 'snow') { const y = 6 - ((t * sp * 1.2 + ph) % 6); GLX.obj('glow', 'sphere', x + Math.sin(t * sp + ph) * .8, y, z + y * .15, 0, .07, .07, .07, pc, .9, .8); }
      else GLX.obj('glow', 'sphere', x + Math.sin(t * sp * .5 + ph) * 1.5, .8 + y0 * 2.5 + Math.sin(t * sp * .4 + ph) * .6, z + Math.cos(t * sp * .45 + ph) * 1.5, 0, .055, .055, .055, pc, .7, .5);
    }
  }
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.flash) { GLX.halo(f.x, f.y, f.z, f.r * (1.25 - k * .5), f.c, k * .85); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, f.r * .22 * k, f.r * .22 * k, f.r * .22 * k, f.c, 2, k); }
    else if (f.ring) { const r = (f.r0 + (f.r1 - f.r0) * (1 - k)) * 2; GLX.obj('glow', 'ring', f.x, .12, f.z, 0, r, 1, r, f.c, 1, k, -1); GLX.obj('glow', 'ring', f.x, .16, f.z, G.time * 3, r * .8, 1, r * .8, col(0xffffff), 1, k * .5, -1); GLX.obj('glow', 'ring', f.x, .5 + (1 - k) * 1.2, f.z, -G.time * 2, r * .92, 1, r * .92, f.c, 1, k * .45, -1); if (f.r1 > 3) { GLX.halo(f.x, 1, f.z, r * .7, f.c, k * .35); for (let q = 0; q < 8; q++) { const a = q * .785 + f.r1; GLX.obj('glow', 'box', f.x + Math.cos(a) * r * .5, .3 + (1 - k) * 1.6, f.z + Math.sin(a) * r * .5, -a, .07, .5 * k, .07, f.c, 1.5, k); } } GLX.obj('glow', 'disc', f.x, .1, f.z, 0, r, 1, r, f.c, 1, k * .25, 1); }
    else if (f.bolt) { const dx = f.x2 - f.x1, dz = f.z2 - f.z1, L = Math.hypot(dx, dz), a = Math.atan2(dx, dz); for (let j = 0; j < 2; j++) GLX.obj('glow', 'box', (f.x1 + f.x2) / 2 + (Math.random() - .5) * .4, 1.3 + (Math.random() - .5) * .4, (f.z1 + f.z2) / 2 + (Math.random() - .5) * .4, a + (Math.random() - .5) * .08, .12, .12, L, f.c, 1.6, k); GLX.halo(f.x2, 1.3, f.z2, 2.4, f.c, k * .8); }
    else if (f.slash) { for (let i = 0; i < 9; i++) { const a = f.rot + (i / 8 - .5) * f.arc * (1.25 - k * .4), rr = f.r * .95; GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, 1.25, f.z + Math.cos(a) * rr, a + 1.5708, .1, .03, f.r * .5, col(0xffffff), 1.5, k * .7); } GLX.halo(f.x + Math.sin(f.rot) * f.r * .8, 1.2, f.z + Math.cos(f.rot) * f.r * .8, f.r * 1.3, f.c, k * .3); for (let i = 0; i < 7; i++) { const a = f.rot + (i / 6 - .5) * f.arc * (1.2 - k * .4), rr = f.r * .82; GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, 1.25, f.z + Math.cos(a) * rr, a + 1.5708, .12, .08, f.r * .62, f.c, 1, k * .9); } }
    else GLX.obj('glow', 'gem', f.x, f.y, f.z, f.life * 9, f.size, f.size, f.size, f.c, 1, k);
  }
  if (GPS.pts.length > 1 && G.set.gps) { const c = col(0xffd84a); let acc = (G.time * 3) % 1.6, tot = 0; for (let i = 1; i < GPS.pts.length && tot < 34; i++) { const a = GPS.pts[i - 1], b = GPS.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ry = Math.atan2(b[0] - a[0], b[1] - a[1]); while (acc < L && tot + acc < 34) { const t = acc / L, k = 1 - (tot + acc) / 34; if (tot + acc > 1.6) GLX.obj('glow', 'cone', a[0] + (b[0] - a[0]) * t, .1, a[1] + (b[1] - a[1]) * t, ry, .5, .04, .9, c, 1, .75 * k); acc += 1.6; } acc -= L; tot += L; } }
  if (P.move && !P.atk) GLX.obj('glow', 'ring', P.move[0], .06, P.move[1], 0, .8, 1, .8, col(0xffffff), 1, .25, -1);
  if (G.tj && !G.auto && !P.dead) { const e = nearFoe(15); if (e && e !== G.hover) GLX.obj('glow', 'ring', e.x, .06, e.z, G.time * 1.5, e.r * 2.5, 1, e.r * 2.5, col(0xffb03a), 1, .55, -1); }
  if (G.hover && G.hover.alive) GLX.obj('glow', 'ring', G.hover.x, .06, G.hover.z, 0, G.hover.r * 2.6, 1, G.hover.r * 2.6, col(0xff5a4a), 1, .7, -1);
}
