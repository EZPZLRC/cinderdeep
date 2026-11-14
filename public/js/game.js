'use strict';
// ---------- utils ----------
let _s = 1; function srand(s) { _s = (s >>> 0) || 1; }
function sr() { _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rnd = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CS = 3, GW = 60, SAVE_KEY = 'cinderdeep_save_v1';
const G = { set: { vol: 70, gfx: 'auto', shake: true, nums: true, map: true, gps: true, joy: true, autoLoot: true, pet: true, weather: true, chat: true, shadows: true, scale: 100, fps: false, ally: true, apSkill: true, apPot: true }, pp: [], online: false, auto: false, speed: 1, state: 'menu', hero: null, zone: null, time: 0, ents: [], projs: [], areas: [], drops: [], fx: [], texts: [], timers: [], shake: 0, zoom: .72, boss: null, hover: null, hoverObj: null, eid: 0, streak: 0, streakT: 0, bestStreak: 0, labels: [], hints: [], hitSfx: 0 };
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

  // background music (build 0020): a driving rock loop written on the fly. Drums, distorted power chords, bass and a lead riff in E minor.
  let mBus = null, gBus = null, mLvl = .4, mNext = 0, mStep = 0, mOn = true;
  const MF = n => 82.41 * Math.pow(2, n / 12), RIFF = [0, 0, -4, -2, 0, 0, 3, 5], PENT = [0, 3, 5, 7, 10, 12, 15, 17], BPM = 138;
  const mVol = () => (mute || !mOn ? 0 : mLvl * master * .5);
  function nz() { if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } return nb; }
  function env(node, t, a, v, d) { node.gain.setValueAtTime(.0001, t); node.gain.linearRampToValueAtTime(v, t + a); node.gain.exponentialRampToValueAtTime(.0001, t + d); }
  function osc(type, f, t, d, v, out, det) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; env(g, t, .005, v, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .05); return o; }
  function hit(t, fq, type, v, d, out) { const b = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); b.buffer = nz(); f.type = type; f.frequency.value = fq; env(g, t, .002, v, d); b.connect(f); f.connect(g); g.connect(out); b.start(t, Math.random() * .5, d + .05); }
  function kick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); env(g, t, .003, .55, .28); o.connect(g); g.connect(mBus); o.start(t); o.stop(t + .32); hit(t, 3000, 'lowpass', .08, .03, mBus); }
  function snare(t, v) { hit(t, 1900, 'bandpass', .32 * v, .17, mBus); osc('triangle', 190, t, .09, .14 * v, mBus); }
  function chord(n, t, d, v) { for (const [k, det] of [[0, -7], [0, 7], [7, 0], [12, 4]]) osc('sawtooth', MF(n + k), t, d, v * (k === 12 ? .5 : 1), gBus, det); }
  function musTick() {
    if (!ac || ac.state !== 'running') return;
    if (!mBus) { mBus = ac.createGain(); mBus.gain.value = 0; const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; mBus.connect(comp); comp.connect(ac.destination);
      gBus = ac.createGain(); gBus.gain.value = .5; const ws = ac.createWaveShaper(), cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 6) * .8; } ws.curve = cv; ws.oversample = '2x'; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; gBus.connect(ws); ws.connect(hp); hp.connect(lp); lp.connect(mBus); mNext = ac.currentTime + .1; }
    mBus.gain.setTargetAtTime(mVol(), ac.currentTime, .5); if (mVol() <= 0) { mNext = ac.currentTime + .1; return; }
    const st = 60 / BPM / 2; if (mNext < ac.currentTime - .5) mNext = ac.currentTime + .05;
    while (mNext < ac.currentTime + .25) {
      const t = mNext, i = mStep % 8, bar = (mStep >> 3) % 4, phrase = (mStep >> 5) % 4, root = RIFF[bar * 2 + (i >> 2)], fill = bar === 3 && phrase % 2 === 1 && i >= 4;
      // drums: kick on 1 and 3 with a push before 3, snare on 2 and 4, eighth-note hats, a crash at the top of each phrase, a snare fill every other phrase
      if (!fill) { if (i === 0 || i === 4 || (i === 3 && bar % 2)) kick(t); if (i === 2 || i === 6) snare(t, 1); } else { snare(t, .6 + (i - 4) * .15); if (i === 7) snare(t + st / 2, 1); }
      hit(t, 8000, 'highpass', i % 2 ? .05 : .08, .045, mBus); if (i === 0 && bar === 0) hit(t, 5000, 'highpass', .16, 1.3, mBus);
      // rhythm guitar: chugging power chords, a ringing accent on each change
      if (phrase === 0 && bar < 2) { if (i === 0) chord(root, t, st * 7.5, .05); }
      else if (i % 4 === 0) chord(root, t, st * 1.7, .06); else chord(root, t, st * .55, .035);
      // bass locks to the kick on the root
      osc('sawtooth', MF(root - 12), t, st * .9, .13, mBus); osc('sine', MF(root - 12), t, st * .9, .12, mBus);
      // lead: a pentatonic riff over the second half of each long phrase
      if (phrase >= 2 && (i % 2 === 0 || Math.random() < .35)) { const n = PENT[(mStep * 7 + bar * 3 + (phrase === 3 ? 2 : 0)) % PENT.length] + 12; const o = osc('square', MF(n + root), t, st * (i % 4 === 0 ? 1.8 : .9), .028, gBus); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(18, t + st); }
      mStep++; mNext += st;
    }
  }
  return { unlock: ctx, play, ambient, ambTick(dt) { ambTick(dt); musTick(); }, musTick, music(v) { mLvl = v; }, toggle() { mute = !mute; setAmb(); return mute; }, vol(v) { master = v; mute = v <= 0; setAmb(); } };
})();

// ---------- items ----------
function affixVal(a, ilvl) { let v = a[1] + Math.random() * (a[2] - a[1]); if (a[3] === 'f') v *= Math.pow(1.085, ilvl); else if (a[3] === 'p') v *= 1 + Math.min(ilvl, 60) * .02; return Math.max(1, Math.round(v)); }
function rollAffix(it) { const have = new Set(it.aff.map(a => a.k)), as = AFF_ALIAS[it.slot] || it.slot; const pool = AFFIX.filter(a => a[4].split(' ').includes(as) && !have.has(a[0])); if (!pool.length) return false; const a = pick(pool); it.aff.push({ k: a[0], v: affixVal(a, it.ilvl) }); return true; }
function makeItem(ilvl, slot, rar, baseName) {
  slot = slot || pick(DROP_SLOTS);
  const it = { id: itemId++, slot, rar, ilvl, aff: [] };
  if (slot === 'weapon') { const b = (baseName && WEAPONS.find(w => w.n === baseName)) || pick(G.hero ? WEAPONS.filter(w => CLASSES[G.hero.cls].wts.includes(w.t)) : WEAPONS); const k = Math.pow(1.11, ilvl) * (1 + rar * .1); it.base = b.n; it.dmg = [Math.max(1, Math.round(b.d[0] * k)), Math.max(2, Math.round(b.d[1] * k))]; it.spd = b.s; it.wt = b.t; if (G.hero) it.cls = G.hero.cls; }
  else if (slot === 'offhand') { const oc = G.hero ? G.hero.cls : 'warden', b = OFFHAND[oc]; it.base = b.n; it.oc = oc; it.cls = oc; if (b.a) it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
  else if (ARMOR[slot]) { const L = ARMOR[slot], pref = { warden: 0, ranger: 1, brawler: 1, arcanist: L.length - 1, elementalist: L.length - 1 }[G.hero ? G.hero.cls : ''], b = pref !== undefined && Math.random() < .6 ? L[Math.min(pref, L.length - 1)] : pick(L); /* armour leans toward what your class wears */ it.base = b.n; it.armor = Math.round(b.a * Math.pow(1.085, ilvl) * (1 + rar * .08)); }
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
  if (e.boss) { n = 5; bonus = 3; minR = 2; } else if (e.elite === 2) { n = 2; bonus = 1.5; } else if (e.elite === 1) { n = 1 + (Math.random() < .5 ? 1 : 0); bonus = .8; } else if (Math.random() < .12 || (G.dry || 0) >= 14) n = 1; /* Lee, Nov 13: never more than 14 plain kills in a row without an item */ G.dry = n ? 0 : (G.dry || 0) + 1;
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
  h.eq.weapon = makeItem(1, 'weapon', 0, c.w); applyKit(h); return h;
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
    h.xp -= xpNeed(h.level); h.level++; computeStats(); P.hp = P.stats.maxLife; P.mana = P.stats.maxMana; SFX.play('level'); G.fx.push({ pillar: 1, x: P.x, z: P.z, life: 1.8, max: 1.8, c: GLX.col(0xffd84a) }); ring(P.x, P.z, 0, 9, .7, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7); if (h.level >= MAX_LEVEL) { h.pxp = h.xp; h.xp = 0; hint('Level 60! From here you earn Paragon levels with no limit.'); }
    floatText(P.x, 3, P.z, 'LEVEL ' + h.level, '#ffd84a', 1.8, 22); { computeStats(); hint('Level ' + h.level + '! More life, harder hits. Life and ' + CLASSES[h.cls].res.n + ' refilled.'); const nt = TIER_LV.find(l => l > h.level); if (nt && skillTiers(h.cls)[TIER_LV.indexOf(nt)]) hint('Next skill choice at level ' + nt + '.'); } applyKit(h, true);
  }
}
function seasonCheck() { try { if (localStorage.getItem('cinderdeep_season') === SEASON) return false; const old = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(SAVE_KEY + '_') === 0) old.push(k); } old.forEach(k => localStorage.removeItem(k)); localStorage.setItem('cinderdeep_season', SEASON); return old.length > 0; } catch (e) { return false; } }
function saveGame() { if (G.hero && G.hero.hc && G.hero.dead) return; /* a fallen hardcore hero is gone for good */ try { localStorage.setItem(SAVE_KEY + '_' + G.hero.cls, JSON.stringify(G.hero)); if (G.stash) localStorage.setItem(SAVE_KEY + '_stash', JSON.stringify(G.stash)); } catch (e) { } }
function loadStash() { let st = null; try { st = JSON.parse(localStorage.getItem(SAVE_KEY + '_stash')); } catch (e) { } if (!Array.isArray(st) || st.length !== 100) st = new Array(100).fill(null); for (const it of st) if (it) { if (it.id >= itemId) itemId = it.id + 1; if (it.aff) for (const a of it.aff) a.v = Math.max(1, Math.round(a.v)); } G.stash = st; }
function loadGame(cls) {
  try {
    let raw = localStorage.getItem(SAVE_KEY + '_' + cls); if (!raw && cls === 'warden') raw = localStorage.getItem(SAVE_KEY); const h = JSON.parse(raw);
    if (h && h.v === 1 && h.inv && h.eq && CLASSES[h.cls] && h.cls === cls) {
      let m = 0; for (const it of h.inv) if (it) m = Math.max(m, it.id); for (const k in h.eq) m = Math.max(m, h.eq[k].id); itemId = Math.max(itemId, m + 1);
      if (h.bagV !== 2 || h.inv.length !== BAG_N) { const old = h.inv.filter(x => x).sort((a, b) => b.rar - a.rar); h.inv = new Array(BAG_N).fill(null); for (const it of old) if (!bagPut(h.inv, it)) h.gold += itemValue(it); h.bagV = 2; }
      const rd = it => { if (it && it.aff) for (const a of it.aff) a.v = Math.max(1, Math.round(a.v)); }; h.inv.forEach(rd); for (const k in h.eq) rd(h.eq[k]);
      if (h.eq.ring2) { const r2 = h.eq.ring2; delete h.eq.ring2; if (!h.eq.ring1) h.eq.ring1 = r2; else if (!bagPut(h.inv, r2)) h.gold += itemValue(r2); } // the second ring slot is gone: the ring goes back in the bag
      applyKit(h);
      const sk = CLASSES[cls].skills; if (!h.bar || h.bar.some(id => id && !sk.includes(id))) { h.bar = [sk[0], null, null, null]; for (const id of sk) if (!SKILLS[id].basic && SKILLS[id].lv <= h.level) { const i = h.bar.indexOf(null); if (i > 0) h.bar[i] = id; } }
      return h;
    }
  } catch (e) { } return null;
}
function hint(t) { G.hints.push({ t, life: 4 }); if (G.hints.length > 5) G.hints.shift(); }

// ---------- zone ----------
function cellAt(x, z) { const cx = Math.floor(x / CS), cz = Math.floor(z / CS); if (cx < 0 || cz < 0 || cx >= GW || cz >= GW) return 1; return G.zone.cell[cz * GW + cx]; }
function blocked(x, z, r) { return cellAt(x - r, z - r) || cellAt(x + r, z - r) || cellAt(x - r, z + r) || cellAt(x + r, z + r) || (G.zone.solid ? solidAt(x, z, r) : 0); }
function solidAt(x, z, r) { for (const s of G.zone.solid) { const dx = x - s[0], dz = z - s[1], c = Math.cos(s[4]), sn = Math.sin(s[4]), lx = c * dx - sn * dz, lz = sn * dx + c * dz; if (Math.abs(lx) < s[2] + r && Math.abs(lz) < s[3] + r) return 1; } return 0; } // town buildings you cannot walk through
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
function buildStatic(Z) { Z.torches = [];
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
          if (T === 'crypt') { GLX.obj('stat', 'box', wx, h + .12, wz, 0, CS + .2, .24, CS + .2, shade(wc, 1.25), 0, 1, 3); GLX.obj('stat', 'box', wx, .22, wz, 0, CS + .16, .44, CS + .16, shade(wc, .8), 0, 1, 0); for (const hb of [1.0, 2.0]) if (hb < h - .3) GLX.obj('stat', 'box', wx, hb, wz, 0, CS + .05, .06, CS + .05, shade(wc, .62), 0, 1, 0); if (sr() < .4) for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * .9, h + .5, wz, 0, .7, .6, CS, shade(wc, .9), 0, 1, 3); if (sr() < .22) { GLX.obj('stat', 'cyl', wx, h + 1.4, wz, 0, .7, 2.6, .7, shade(wc, 1.3), 0, 1, 3); GLX.obj('stat', 'cyl', wx, h + 2.8, wz, 0, 1, .24, 1, shade(wc, 1.1), 0, 1, 3); } if (sr() < .2) { GLX.obj('stat', 'box', wx, 1.9, wz + CS * .5 + .1, 0, .12, .5, .16, col(0x3a2a1a), 0, 1, 3); GLX.obj('stat', 'cone', wx, 2.22, wz + CS * .5 + .2, 0, .2, .14, .2, col(0x2a2018), 0, 1, 4); (Z.torches = Z.torches || []).push([wx, 2.42, wz + CS * .5 + .22]); } /* build 0024: warm torches, drawn live so they flicker */ }
          else if (T === 'lava') { for (let k = 0; k < 3; k++) GLX.obj('stat', 'taper', wx + (sr() - .5) * 2.2, h + .7 + sr(), wz + (sr() - .5) * 2.2, sr() * 6, .9 + sr(), 1.8 + sr() * 2, .9 + sr(), shade(wc, .7 + sr() * .4), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'box', wx + (sr() - .5) * 2, h * .5, wz + CS * .5 + .03, sr() - .5, .1, h * .7, .04, col(0xff5a1a), 1.6); }
          else if (T === 'ice') { for (let k = 0; k < 3; k++) GLX.obj('stat', 'taper', wx + (sr() - .5) * 2.4, h + .9 + sr() * 1.2, wz + (sr() - .5) * 2.4, sr() * 6, .6 + sr() * .5, 2.4 + sr() * 2.6, .6 + sr() * .5, col([0x5a7e98, 0x46688a, 0x6e90a8][k]), .04, 1, 4); GLX.obj('stat', 'blob', wx, h + .1, wz, sr() * 6, CS * 1.1, .5, CS * 1.1, col(0x9aaab8), 0, 1, 0); }
          else { GLX.obj('stat', 'taper', wx, h + 1.6, wz, sr() * 6, 1.2, 3.4, 1.2, shade(wc, .8), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'gem', wx, h + 4 + sr(), wz, sr() * 6, .4, .7, .4, col(0xb060ff), 1.8); if (sr() < .4) GLX.obj('stat', 'box', wx, h * .55, wz + CS * .5 + .03, 0, .5, .5, .04, col(0xff80ff), 1.4); }
        } }
    } else {
      if (Z.def.theme === 'crypt') { const stn0 = col(th.wc[0]); for (let q = 0; q < 4; q++) { if (sr() < .14) continue; const qx = wx + ((q & 1) - .5) * 1.48, qz = wz + ((q >> 1) - .5) * 1.48; GLX.obj('stat', 'box', qx, .025, qz, (sr() - .5) * .08, 1.38, .05 + sr() * .03, 1.38, shade(stn0, .78 + sr() * .3), 0, 1, 0); } grass(wx, wz, gN >> 3, CS); } /* build 0024: flagstones, not a lawn */
      else grass(wx, wz, gN, CS); const r = sr(); if (!LOWQ && sr() < .16) litter(wx, wz); if (!LOWQ && sr() < .05) fern(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2);
      if (Z.def.theme === 'crypt' && (r <= .07 || r >= .23) && sr() < .1) { const px = wx + (sr() - .5) * 2, pz = wz + (sr() - .5) * 2; if (sr() < .5) for (let k = 0; k < 3; k++) { const cx2 = px + (sr() - .5) * .6, cz2 = pz + (sr() - .5) * .6, ch = .15 + sr() * .3; GLX.obj('stat', 'cyl', cx2, ch / 2, cz2, 0, .1, ch, .1, col(0xe8e0c8), 0); GLX.obj('stat', 'sphere', cx2, ch + .07, cz2, 0, .07, .12, .07, col(0xffb03a), 2.4); } else { for (let k = 0; k < 5; k++) GLX.obj('stat', 'cyl', px + (sr() - .5) * .8, .05, pz + (sr() - .5) * .8, sr() * 6, .07, .07, .5 + sr() * .4, col(0xd0c8b0), 0); GLX.obj('stat', 'sphere', px, .16, pz, sr() * 6, .26, .24, .28, col(0xd8d0b8), 0); } }
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
        else if (T === 'ice') { if (r < .13) { const n = 2 + (sr() * 4 | 0); for (let k = 0; k < n; k++) { const hh = 1 + sr() * 2.6; GLX.obj('stat', 'taper', px + (sr() - .5) * 1.4, hh / 2, pz + (sr() - .5) * 1.4, sr() * 6, .5 + sr() * .4, hh, .5 + sr() * .4, col([0x5a7e98, 0x46688a, 0x6e90a8][k % 3]), .02, 1, 4); } }
          else if (r < .18) GLX.obj('stat', 'blob', px, .25, pz, ry, 2 + sr() * 1.6, .6 + sr() * .4, 1.8 + sr(), col(0x9aaab8), 0, 1, 0);
          else if (r < .21) { GLX.obj('stat', 'trunk', px, 1.6, pz, ry, .5, 3.2, .5, col(0x5a5048), 0, 1, 3); for (let k = 0; k < 3; k++) GLX.obj('stat', 'cone', px, 1.6 + k * .9, pz, ry + k, 2.4 - k * .6, 1.2, 2.4 - k * .6, col(0x8ea2b2), 0, 1, 2); }
          else GLX.obj('stat', 'cyl', px, .04, pz, ry, 3 + sr() * 2, .06, 2.4 + sr(), col(0x5a7c94), .03, 1, 4); }
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
      for (const o of Z.objs) { if (o.kind === 'npc') continue; const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz); GLX.obj('stat', 'box', cx + dx * .55, .07, cz + dz * .55, a, 2.6, .06, d * .8, cob2, 0, 1, 3); }
      for (let k = 0; k < 44; k++) { const a = k / 44 * 6.2832; if (Math.abs(a - 1.5708) < .22) continue; const px = cx + Math.cos(a) * 20.6, pz = cz + Math.sin(a) * 20.6; GLX.obj('stat', 'taper', px, 1.1, pz, a, .34, 2.2 + (k % 3) * .25, .34, wood, 0, 1, 3); GLX.obj('stat', 'box', px, 1.2, pz, -a, .12, .16, 3, shade(wood, .8), 0, 1, 3); }
      // ---- Emberwatch homes (build 0020): every building is different, and the town grows livelier as you help its people ----
      const gold = col(0xc9a030), steelC = col(0x8e97a8), bladeC = col(0xc8ced8);
      const done = (G.hero && G.hero.tqd) || [], has = id => done.includes(id), slate = col(0x3a4a5a), stoneW = col(0x7a746a), stoneD = col(0x5a5650), dark = shade(wood, .6), glass = col(0xffc870), flowerC = [0xe84a6a, 0xffd04a, 0xb070e0, 0xff8a3a, 0xf0f0f0];
      const W = (hx, hz, ry) => { const c = Math.cos(ry), sn = Math.sin(ry); return (lx, lz) => [hx + c * lx + sn * lz, hz - sn * lx + c * lz]; };
      const Bx = (g, F, ry, lx, ly, lz, sx, sy, sz, c, e2, rx, rz, em) => { const w = F(lx, lz); GLX.part('stat', g, IDM, w[0], ly, w[1], rx || 0, ry, rz || 0, 0, 0, 0, sx, sy, sz, c, em || 0, 1, e2 || 0); };
      Z.solid = []; Z.smoke = []; const solid = (x, z, hw, hd, ry) => Z.solid.push([x, z, hw, hd, ry]);
      const gable = (F, ry, w, d, h, rise, roofC, over) => { // a pitched roof: two sloped panels over a triangular gable
        const a = rise * 1.414; Bx('box', F, ry, 0, h, 0, w * .98, a, a, shade(roofC, .7), 0, .785); const th = Math.atan2(rise, d / 2), L = Math.hypot(d / 2, rise) + (over || .45);
        for (const sd of [1, -1]) Bx('box', F, ry, 0, h + rise / 2 + .08, sd * d / 4, w + .7, .2, L, roofC, 3, sd * th); Bx('box', F, ry, 0, h + rise + .06, 0, w + .76, .22, .3, shade(roofC, .8), 3); };
      const win = (F, ry, lx, ly, lz, sw, sh, shut, box) => { Bx('box', F, ry, lx, ly, lz, sw, sh, .08, glass, 0, 0, 0, .9); Bx('box', F, ry, lx, ly, lz + .03, .06, sh, .1, dark); Bx('box', F, ry, lx, ly, lz + .03, sw, .06, .1, dark);
        if (shut) for (const sd of [1, -1]) Bx('box', F, ry, lx + sd * (sw * .5 + .2), ly, lz + .02, .34, sh + .1, .06, shut);
        if (box) { Bx('box', F, ry, lx, ly - sh * .5 - .14, lz + .22, sw + .2, .2, .34, wood); for (let k = 0; k < 5; k++) Bx('sphere', F, ry, lx - sw * .45 + k * sw * .22, ly - sh * .5 - .02, lz + .24, .16, .16, .16, col(flowerC[(k + Math.round(lx * 3)) % 5])); } };
      const door = (F, ry, lx, lz, dc) => { Bx('box', F, ry, lx, 1.0, lz, 1.0, 2.0, .1, dc || dark); Bx('box', F, ry, lx, 2.08, lz + .02, 1.2, .16, .14, wood); Bx('box', F, ry, lx, .08, lz + .4, 1.4, .16, .7, stoneD, 3); Bx('sphere', F, ry, lx + .32, 1.0, lz + .08, .08, .08, .08, gold, 0, 0, 0, .2); };
      const chimney = (F, ry, lx, lz, base, top) => { Bx('box', F, ry, lx, (base + top) / 2, lz, .7, top - base, .7, stoneD, 3); Bx('box', F, ry, lx, top + .08, lz, .86, .16, .86, shade(stoneD, .8), 3); const w = F(lx, lz); (Z.smoke = Z.smoke || []).push([w[0], top + .2, w[1]]); };
      const frame = (F, ry, w, d, h, y0) => { y0 = y0 || 0; for (const sx of [-1, 1]) for (const sz of [-1, 1]) Bx('box', F, ry, sx * w / 2, y0 + h / 2, sz * d / 2, .2, h, .2, dark); Bx('box', F, ry, 0, y0 + h * .55, d / 2 + .02, w, .16, .08, dark); Bx('box', F, ry, 0, y0 + h - .08, d / 2 + .02, w + .1, .18, .1, dark); for (const sx of [-1, 1]) Bx('box', F, ry, sx * w * .3, y0 + h * .78, d / 2 + .03, .12, h * .5, .06, dark, 0, 0, sx * .7); };
      // 1. The Sleeping Ember inn: stone ground floor, timber upper floor that juts out, sign, benches and barrels
      { const hx = cx - 8.8, hz = cz - 14.6, ry = .3, F = W(hx, hz, ry), w = 7, d = 4.6; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
        Bx('box', F, ry, 0, 1.25, 0, w, 2.5, d, stoneW, 3); Bx('box', F, ry, 0, 3.6, .15, w + .5, 2.2, d + .3, plaster); frame(F, ry, w + .5, d + .3, 2.2, 2.5); Bx('box', F, ry, 0, 2.5, 0, w + .6, .2, d + .4, dark);
        gable(F, ry, w + .5, d + .3, 4.7, 2.2, red); chimney(F, ry, -2.4, -.6, 4.4, 7.6); chimney(F, ry, 2.6, -.8, 4.6, 7.2);
        door(F, ry, -.6, d / 2 + .02, col(0x6a3a1a)); win(F, ry, 1.9, 1.4, d / 2 + .02, 1.2, .9, null, true); win(F, ry, -2.7, 1.4, d / 2 + .02, 1.0, .9, null, true);
        for (const lx of [-2.4, 0, 2.4]) win(F, ry, lx, 3.7, d / 2 + .3, .9, .8, col(0x2a4a3a), lx !== 0);
        Bx('box', F, ry, 3.9, 3.0, d / 2 + .3, 1.2, .08, .08, iron); Bx('box', F, ry, 4.3, 2.55, d / 2 + .3, .9, .7, .08, col(0x3a2a1a)); Bx('cyl', F, ry, 4.3, 2.55, d / 2 + .36, .28, .36, .28, col(0xe0a030), 0, 1.5708); // sign: a frothy mug
        for (const sx of [-2.6, 2.4]) { Bx('box', F, ry, sx, .45, d / 2 + 1.5, 1.8, .12, .5, wood, 3); Bx('box', F, ry, sx, .22, d / 2 + 1.5, 1.6, .44, .1, shade(wood, .8), 3); }
        for (const [bx, bz] of [[3.8, d / 2 + .7], [4.4, d / 2 + 1.4]]) { Bx('cyl', F, ry, bx, .55, bz, .8, 1.1, .8, wood, 3); Bx('cyl', F, ry, bx, .3, bz, .84, .08, .84, iron, 4); Bx('cyl', F, ry, bx, .8, bz, .84, .08, .84, iron, 4); } }
      // 2. Doran's smithy: open front, glowing forge, anvil, quench barrel, weapon rack, lean-to roof
      { const hx = cx + 8.8, hz = cz - 14.6, ry = -.3, F = W(hx, hz, ry), w = 6, d = 4.4; solid(hx, hz - .4, w / 2 + .2, d / 2, ry); Z.forge = F(-1.6, -.8);
        Bx('box', F, ry, 0, 1.5, -d / 2 + .2, w, 3, .4, stoneW, 3); for (const sx of [-1, 1]) Bx('box', F, ry, sx * (w / 2 - .2), 1.5, 0, .4, 3, d, stoneW, 3); for (const sx of [-1, 1]) Bx('cyl', F, ry, sx * (w / 2 - .2), 1.6, d / 2, .32, 3.2, .32, dark, 3);
        Bx('box', F, ry, 0, 3.6, .2, w + .8, .22, d + 1.4, slate, 3, .28); Bx('box', F, ry, -1.6, .7, -.8, 2, 1.4, 1.6, stoneD, 3); Bx('box', F, ry, -1.6, 1.42, -.8, 1.6, .06, 1.2, col(0xff5a1a), 0, 0, 0, 1.4); chimney(F, ry, -1.6, -1.2, 1.4, 5.8);
        Bx('box', F, ry, 1.2, .45, .6, .6, .9, .5, stoneD, 3); Bx('box', F, ry, 1.2, 1.0, .6, 1.2, .3, .5, iron, 4); Bx('cone', F, ry, 1.95, 1.0, .6, .3, .5, .3, iron, 4, 0, -1.5708);
        Bx('cyl', F, ry, 2.3, .5, -1.2, .9, 1, .9, wood, 3); Bx('cyl', F, ry, 2.3, 1.0, -1.2, .8, .04, .8, col(0x1a2a3a), 4);
        Bx('box', F, ry, -2.4, 1.4, d / 2 + .8, .1, 1.6, 1.8, wood, 3); for (let k = 0; k < (has('steel') ? 5 : 2); k++) Bx('box', F, ry, -2.34, 1.5, d / 2 + .2 + k * .32, .06, 1.6, .1, bladeC, 4);
        if (has('steel')) { Bx('box', F, ry, 0, 3.1, d / 2 + .25, 1.6, 1.0, .06, col(0xd8a040), 0, 0, 0, .1); Bx('box', F, ry, 0, 3.1, d / 2 + .28, .6, .6, .06, iron, 4); } }
      // 3. Bram's windmill: round stone tower, cone roof, sails that turn once the grain is home
      { const hx = cx - .4, hz = cz - 18.4; Z.mill = [hx, 7.2, hz + 2.05]; solid(hx, hz, 2.2, 2.2, 0); GLX.obj('stat', 'taper', hx, 3.2, hz, 0, 4.2, 6.4, 4.2, stoneW, 0, 1, 3); GLX.obj('stat', 'cyl', hx, 6.5, hz, 0, 3.4, .3, 3.4, dark, 0, 1, 3); GLX.obj('stat', 'cone', hx, 7.8, hz, 0, 3.6, 2.6, 3.6, thatch); GLX.obj('stat', 'box', hx, 1.0, hz + 1.95, 0, 1, 2, .2, dark); GLX.obj('stat', 'box', hx + .9, 4, hz + 1.7, 0, .6, .7, .1, glass, .8); GLX.obj('stat', 'cyl', hx, 7.2, hz + 2.0, 0, .5, .5, .5, dark, 0, 1, 3);
        for (let k = 0; k < (has('grain') ? 5 : 1); k++) GLX.obj('stat', 'sphere', hx + 2.4 + (k % 3) * .7, .4 + (k > 2 ? .55 : 0), hz + 1.6 + (k % 2) * .4, k, .8, .7, .7, col(0xd8c090)); }
      // 4. Stone cottage: grey walls, slate roof, round window, ivy
      { const hx = cx - 15.6, hz = cz - 9.6, ry = .95, F = W(hx, hz, ry), w = 4.6, d = 3.8; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
        Bx('box', F, ry, 0, 1.3, 0, w, 2.6, d, stoneD, 3); gable(F, ry, w, d, 2.6, 1.8, slate); chimney(F, ry, -1.4, -.4, 2.4, 5.4); door(F, ry, .8, d / 2 + .02, col(0x2a4a6a)); win(F, ry, -1.1, 1.5, d / 2 + .02, .9, .9, col(0x2a4a6a), true);
        Bx('cyl', F, ry, 0, 3.2, d / 2 + .1, .6, .6, .1, glass, 0, 1.5708, 0, .8); for (let k = 0; k < 7; k++) Bx('blob', F, ry, w / 2 - .1, .4 + k * .32, -d / 2 + .6 + (k % 3) * .5, .5, .5, .5, col(0x3a6a2a), 2);
        for (let k = 0; k < 6; k++) Bx('cyl', F, ry, -w / 2 - .5, .25 + Math.floor(k / 3) * .4, -1 + (k % 3) * .45, .4, 1.4, .4, col(0x7a5a3a), 3, 1.5708); }
      // 5. Timber-frame cottage: white plaster, dark beams, deep thatch
      { const hx = cx + 15.6, hz = cz - 9.6, ry = -.95, F = W(hx, hz, ry), w = 4.4, d = 3.8; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
        Bx('box', F, ry, 0, 1.3, 0, w, 2.6, d, col(0xe0d4b8)); frame(F, ry, w, d, 2.6); GLX.part('stat', 'taper', IDM, hx, 3.4, hz, 0, ry + .785, 0, 0, 0, 0, w * 1.3, 1.9, d * 1.3, thatch, 0, 1, 3); chimney(F, ry, 1.2, -.6, 3, 5.2);
        door(F, ry, -.7, d / 2 + .02, col(0x7a3a2a)); win(F, ry, 1.1, 1.5, d / 2 + .02, .9, .8, col(0x7a3a2a), true); for (let k = 0; k < 3; k++) Bx('sphere', F, ry, -1.8 + k * .5, .3, d / 2 + .7, .5, .5, .5, col(0x6a4a2a)); }
      // 6. Old Hesta's herb hut: round cob walls, cone thatch, drying herbs, a bubbling pot
      { const hx = cx - 17.2, hz = cz + 4.8; solid(hx, hz, 2.3, 2.3, 0); Z.pot = [hx + 2.8, hz + .6]; GLX.obj('stat', 'cyl', hx, 1.2, hz, 0, 4.6, 2.4, 4.6, col(0xa89070), 0, 1, 3); GLX.obj('stat', 'cone', hx, 3.5, hz, 0, 5.6, 2.6, 5.6, thatch); GLX.obj('stat', 'box', hx + 2.25, 1.0, hz, 1.5708, 1, 2, .1, dark); GLX.obj('stat', 'box', hx + 1.6, 1.5, hz - 1.6, .8, .7, .6, .1, glass, .8);
        for (let k = 0; k < 6; k++) GLX.obj('stat', 'box', hx + 2.5, 2.1 - (k % 2) * .1, hz - 1.4 + k * .55, 0, .14, .5, .14, col(k % 2 ? 0x6a8a3a : 0x9a7a3a)); GLX.obj('stat', 'box', hx + 2.5, 2.4, hz, 0, .08, .08, 3.6, wood);
        GLX.obj('stat', 'sphere', hx + 2.8, .5, hz + .6, 0, 1, .8, 1, col(0x2a2a2e), 0, 1, 4); for (const a of [0, 2.1, 4.2]) GLX.obj('stat', 'box', hx + 2.8 + Math.cos(a) * .5, .2, hz + .6 + Math.sin(a) * .5, a, .1, .5, .1, dark);
        const bloom = has('herbs') ? 14 : 5; for (let k = 0; k < bloom; k++) { const a = k * 2.4, r = 1 + (k % 3) * .6; GLX.obj('stat', 'sphere', hx + 4.2 + Math.cos(a) * r * .5, .25, hz + 2.2 + Math.sin(a) * r * .5, 0, .28, .28, .28, col(flowerC[k % 5])); GLX.obj('stat', 'cyl', hx + 4.2 + Math.cos(a) * r * .5, .12, hz + 2.2 + Math.sin(a) * r * .5, 0, .06, .24, .06, col(0x3a6a2a)); } }
      // 7. Guard post by the east wall: tent, banner, weapon rack
      { const tx = cx + 17.5, tz = cz + 5.5; GLX.obj('stat', 'cone', tx, 1.3, tz, 0, 3.4, 2.6, 3.4, canvas2); GLX.obj('stat', 'cyl', tx, 1.5, tz, 0, .1, 3.1, .1, wood, 0, 1, 3); GLX.obj('stat', 'cyl', tx - 2.4, 2, tz - 1.6, 0, .12, 4, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', tx - 2.0, 3.2, tz - 1.6, 0, .8, 1.4, .05, blue); GLX.obj('stat', 'box', tx - 2.0, 3.3, tz - 1.58, 0, .3, .3, .05, col(0xd8a040), .2);
        for (let k = 0; k < 3; k++) GLX.obj('stat', 'cyl', tx - 2.6 + k * .3, 1.1, tz + 2.2, 0, .06, 2.2, .06, k === 1 ? steelC : wood, 0, 1, k === 1 ? 4 : 3); }
      // 8. Gardens by the gate: vegetables with a scarecrow, and flowers with beehives
      { const fence = (x0, z0, w, d) => { for (let k = 0; k <= w; k += 1) for (const zz of [z0, z0 + d]) GLX.obj('stat', 'box', cx + x0 + k, .35, cz + zz, 0, .1, .7, .1, wood, 0, 1, 3); for (let k = 0; k <= d; k += 1) for (const xx of [x0, x0 + w]) GLX.obj('stat', 'box', cx + xx, .35, cz + z0 + k, 0, .1, .7, .1, wood, 0, 1, 3); for (const zz of [z0, z0 + d]) GLX.obj('stat', 'box', cx + x0 + w / 2, .5, cz + zz, 0, w, .08, .06, wood, 0, 1, 3); for (const xx of [x0, x0 + w]) GLX.obj('stat', 'box', cx + xx, .5, cz + z0 + d / 2, 0, .06, .08, d, wood, 0, 1, 3); };
        fence(-14, 9, 5, 4); GLX.obj('stat', 'box', cx - 11.5, .06, cz + 11, 0, 4.6, .08, 3.6, col(0x4a3420), 0, 1, 3); for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 5; k++) GLX.obj('stat', r2 === 1 ? 'sphere' : 'blob', cx - 13.4 + k * .9, .25, cz + 9.8 + r2 * 1.2, k, r2 === 1 ? .5 : .45, r2 === 1 ? .4 : .4, r2 === 1 ? .5 : .45, col(r2 === 1 ? 0xd87a2a : 0x4a8a3a), 0, 1, r2 === 1 ? 0 : 2);
        GLX.obj('stat', 'cyl', cx - 10, 1.0, cz + 12.4, 0, .1, 2, .1, wood, 0, 1, 3); GLX.obj('stat', 'box', cx - 10, 1.6, cz + 12.4, 0, 1.4, .1, .1, wood, 0, 1, 3); GLX.obj('stat', 'sphere', cx - 10, 2.1, cz + 12.4, 0, .4, .45, .4, col(0xd8c090)); GLX.obj('stat', 'cone', cx - 10, 2.45, cz + 12.4, 0, .7, .3, .7, thatch); GLX.obj('stat', 'box', cx - 10, 1.4, cz + 12.4, 0, .7, .7, .3, col(0x8a3a3a));
        fence(9, 9, 5, 4); for (let k = 0; k < (has('herbs') ? 26 : 10); k++) { const fx = cx + 9.5 + (k * 0.618 % 1) * 4, fz = cz + 9.5 + ((k * 0.381 + .2) % 1) * 3; GLX.obj('stat', 'sphere', fx, .3, fz, 0, .26, .26, .26, col(flowerC[k % 5])); GLX.obj('stat', 'cyl', fx, .14, fz, 0, .05, .28, .05, col(0x3a6a2a)); }
        for (const bx of [13, 13.9]) { GLX.obj('stat', 'taper', cx + bx, .5, cz + 12.4, 0, .7, .8, .7, col(0xd8b048), 0, 1, 3); GLX.obj('stat', 'box', cx + bx, .95, cz + 12.4, 0, .8, .1, .8, wood, 0, 1, 3); } }
      // 9. Washing line, a cart of hay, a notice board by the gate
      { const p1 = [cx - 13.4, cz - 4.6], p2 = [cx - 10.2, cz - 7.6]; for (const q of [p1, p2]) GLX.obj('stat', 'cyl', q[0], 1.2, q[1], 0, .1, 2.4, .1, wood, 0, 1, 3); const a = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]), L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); GLX.obj('stat', 'box', (p1[0] + p2[0]) / 2, 2.25, (p1[1] + p2[1]) / 2, a, .03, .03, L, col(0xd8d0c0)); for (let k = 0; k < 4; k++) { const t2 = .2 + k * .2; GLX.obj('stat', 'box', p1[0] + (p2[0] - p1[0]) * t2, 1.85, p1[1] + (p2[1] - p1[1]) * t2, a + 1.5708, .7, .75, .04, col([0xc8d8f0, 0xe0b0a0, 0xf0e8d0, 0x9ab07a][k])); } }
      { const kx = cx - 9.4, kz = cz - 3.2; GLX.obj('stat', 'box', kx, .7, kz, .4, 2.2, .5, 1.3, wood, 0, 1, 3); for (const sd of [-1, 1]) GLX.part('stat', 'cyl', IDM, kx + Math.cos(.4) * .9 * sd, .55, kz - Math.sin(.4) * .9 * sd, 0, .4, 1.5708, 0, 0, 0, 1.1, .12, 1.1, dark, 0, 1, 3); GLX.obj('stat', 'box', kx, 1.25, kz, .4, 1.9, .6, 1.1, col(0xc8a850), 0, 1, 2); GLX.obj('stat', 'box', kx + 1.5, .55, kz + .6, .4, 1.4, .1, .1, wood, 0, 1, 3); }
      { const nx = cx - 4.4, nz = cz + 13.4; for (const sd of [-1, 1]) GLX.obj('stat', 'cyl', nx + sd * .9, 1.1, nz, 0, .12, 2.2, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', nx, 1.6, nz, 0, 2, 1.2, .1, shade(wood, 1.2), 0, 1, 3); for (let k = 0; k < 4; k++) GLX.obj('stat', 'box', nx - .6 + (k % 2) * 1.1, 1.75 - Math.floor(k / 2) * .5, nz + .07, (k - 1.5) * .1, .5, .38, .02, col(0xf0e8d0)); GLX.obj('stat', 'box', nx, 2.3, nz, 0, 2.3, .16, .3, red, 0, 1, 3); solid(nx, nz, 1.1, .3, 0); }
      { const ro = Z.objs.find(o => o.kind === 'rift'); if (ro) { const rk = col(0x2a2038); GLX.obj('stat', 'cyl', ro.x, .15, ro.z, 0, 2.6, .3, 2.6, col(0x4a4a50), 0, 1, 3); GLX.obj('stat', 'taper', ro.x, 1.8, ro.z, .4, 1.1, 3.4, .8, rk, 0, 1, 3); for (let k = 0; k < 4; k++) GLX.obj('stat', 'box', ro.x + Math.cos(k * 1.57 + .4) * .48, 1.2 + k * .5, ro.z - Math.sin(k * 1.57 + .4) * .38, .4 + k * 1.57, .08, .3, .08, col(0xb070ff), 1.2); solid(ro.x, ro.z, .7, .7, 0); } } // the rift stone
      if (has('lily')) for (let k = 0; k < 10; k++) { const a = k * .628, lx = cx + 6.5 + Math.cos(a) * 2.9, lz = cz + 6 + Math.sin(a) * 2.9; GLX.obj('stat', 'cyl', lx, .2, lz, 0, .07, .4, .07, col(0x3a8a4a)); GLX.obj('stat', 'gem', lx, .5, lz, a, .26, .36, .2, col(0xbfe8ff), .9); } // chapter 2: lilies round the well
      if (has('feast')) for (const tz of [-4.6, -6.6]) { GLX.obj('stat', 'box', cx, .8, cz + tz, 0, 7, .14, 1.2, wood, 0, 1, 3); for (const lx of [-3, 0, 3]) GLX.obj('stat', 'box', cx + lx, .4, cz + tz, 0, .14, .8, 1, shade(wood, .8), 0, 1, 3); for (let k = 0; k < 7; k++) { const fx = cx - 3 + k, c2 = [0xb86a4a, 0xd8a040, 0xe84a4a, 0xf0e8d8, 0x7aa040][k % 5]; GLX.obj('stat', k % 2 ? 'sphere' : 'cyl', fx, .98, cz + tz, k, .34, .22, .34, col(c2)); } for (const sd of [-1, 1]) GLX.obj('stat', 'box', cx, .45, cz + tz + sd * 1.05, 0, 6.6, .1, .4, shade(wood, .9), 0, 1, 3); } // chapter 2: the feast tables
      if (has('deep')) { const sx = cx + 4.6, sz = cz + 13.2, cc = col(CLASS_COL[G.hero.cls] || 0xd8a040), sto = col(0x8a8680); GLX.obj('stat', 'box', sx, .6, sz, 0, 1.8, 1.2, 1.8, sto, 0, 1, 3); GLX.obj('stat', 'box', sx, 1.25, sz, 0, 2.1, .12, 2.1, shade(sto, .8), 0, 1, 3); GLX.obj('stat', 'taper', sx, 2.4, sz, 0, .9, 2.0, .7, sto, 0, 1, 3); GLX.obj('stat', 'sphere', sx, 3.75, sz, 0, .62, .7, .62, sto, 0, 1, 3); GLX.obj('stat', 'box', sx + .55, 2.9, sz, -.5, .14, 2.2, .14, sto, 0, 1, 3); GLX.obj('stat', 'box', sx, 2.2, sz + .38, 0, .5, 1.3, .06, cc, .2); solid(sx, sz, .95, .95, 0); } // chapter 2: a statue of you by the gate
      { const wx = cx + 6.5, wz = cz + 6; GLX.obj('stat', 'cyl', wx, .5, wz, 0, 2.2, 1, 2.2, cob2, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 1.02, wz, 0, 1.7, .04, 1.7, col(0x1a2a3a), 0, 1, 4); for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * 1, 1.6, wz, 0, .16, 2.2, .16, wood, 0, 1, 3); GLX.obj('stat', 'box', wx, 2.7, wz, 0, 2.5, .14, .9, thatch, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 2.3, wz, 0, .1, .1, 2, wood, 0, 1, 3); }
      for (const [bx, bz, n] of [[-6, 7, 3], [-15, 2, 2], [15, 2, 2], [4, -11, 2], [-4, -11, 3]]) for (let k = 0; k < n; k++) { const px = cx + bx + (k % 2) * 1.1, pz = cz + bz + (k > 1 ? 1.1 : 0); if (k % 2) { GLX.obj('stat', 'cyl', px, .55, pz, 0, .8, 1.1, .8, wood, 0, 1, 3); for (const y of [.25, .85]) GLX.obj('stat', 'cyl', px, y, pz, 0, .84, .08, .84, iron, 0, 1, 4); } else { GLX.obj('stat', 'box', px, .45, pz, k * .5, .9, .9, .9, shade(wood, 1.1), 0, 1, 3); GLX.obj('stat', 'box', px, .45, pz, k * .5, .94, .1, .94, shade(wood, .7), 0, 1, 3); } }
      for (const [sx, sz] of [[-3.2, 3.4], [3.2, 3.4]]) { GLX.obj('stat', 'box', cx + sx, .45, cz + sz, sx > 0 ? -.6 : .6, 2.2, .14, .6, wood, 0, 1, 3); for (const e of [-.9, .9]) GLX.obj('stat', 'box', cx + sx + e * Math.cos(sx > 0 ? -.6 : .6), .22, cz + sz - e * Math.sin(sx > 0 ? -.6 : .6), 0, .14, .44, .5, shade(wood, .8), 0, 1, 3); }
      for (const o of Z.objs) { if (o.kind === 'tportal' || o.kind === 'npc') continue; const fc = o.kind === 'altar' ? col(0xff7a2a) : o.kind === 'vendor' ? col(0xc9a030) : blue, px = o.x + (o.kind === 'stash' ? 3 : 0), pz = o.z - (o.kind === 'stash' ? 0 : 4.6); GLX.obj('stat', 'cyl', px, 2.4, pz, 0, .12, 4.8, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', px + .7, 4.1, pz, 0, 1.3, 1, .06, fc, .15); GLX.obj('stat', 'cone', px, 4.9, pz, 0, .22, .3, .22, col(0xc9a030), 0, 1, 4); }
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
  b.hp = b.maxHp; G.ents.push(b); G.boss = b; Z.ent0 = G.ents.filter(e => !e.boss).length; Z.repT = 30;
}
function addReplica(i) {
  if (G.ents.some(e => e.id === i.id)) return; const e = Object.assign({}, i, { a: i.boss ? { r: 1.7, sc: 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 } : ARCH[i.arch], tx: i.x, tz: i.z, trot: i.rot || 0, rot: i.rot || 0, st: 'chase', t: 0, cd: 1, modT: 2, walk: Math.random() * 6, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0 });
  if (!e.a || !e.md) return; for (const k of e.mods || []) e[k] = true; if (e.boss) { e.bd = bossFor(G.zone.def.theme, G.zone.def.depth); G.boss = e; } G.ents.push(e);
}
function repEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.burnT > 0) e.burnT -= dt; if (e.shock > 0) e.shock -= dt; const ox = e.x, oz = e.z, k = Math.min(1, dt * 12); if (e.sT1 && e.sT1 > e.sT0) { /* play back 100 ms behind the server and slide evenly between its last two updates */ const u = Math.min(1.2, Math.max(0, (performance.now() / 1000 - .1 - e.sT0) / (e.sT1 - e.sT0))), gx = e.sx0 + (e.sx1 - e.sx0) * u, gz = e.sz0 + (e.sz1 - e.sz0) * u, kk = Math.min(1, dt * 20); e.x += (gx - e.x) * kk; e.z += (gz - e.z) * kk; } else { e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; }
  let da = e.trot - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * k; e.walk += Math.hypot(e.x - ox, e.z - oz) * 1.6;
}
function enterZone(net) {
  G.inTown = false; G.away = null;
  const h = G.hero, lvl = net ? net.lvl : h.level, dpt = net ? net.d | 0 : (h.depth === undefined ? (h.depth = h.runs) : h.depth), zd = zoneFor(dpt); const def = { type: 'zone', theme: net && net.theme ? net.theme : zd.theme, lvl, seed: net ? net.seed : (Math.random() * 1e9) | 0, name: zd.name, depth: dpt + 1 };
  { const isRift = net ? net.rift !== undefined : !!G.riftNext; G.riftNext = false; G.riftDone = 0; if (isRift) { if (!net) { def.lvl += 2; def.theme = pick(Object.keys(THEMES).filter(k => k !== 'town')); } def.rift = 1; def.name = 'Rift · ' + def.theme[0].toUpperCase() + def.theme.slice(1); G.riftT0 = G.time - (net && net.rift > 0 ? net.rift / 1000 : 0); if (net && net.rift === -1) G.riftDone = 1; } } // timed rift (build 0021)
  G.zone = genZone(def); const Z = G.zone; G.ents.length = 0; G.projs.length = 0; G.pp.length = 0; G.areas.length = 0; G.drops.length = 0; G.fx.length = 0; G.texts.length = 0; G.timers.length = 0; G.boss = null; G.streak = 0;
  P.buffs = []; computeStats(); buildStatic(Z); if (net) { for (const i of net.ents) addReplica(i); } else spawnAll(Z); BOT.path = null; questZone(Z); if (typeof GPS !== 'undefined') GPS.t = 0; /* quest text refreshes at once on a new floor */
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
  for (const id in FOLK) { const f = FOLK[id]; Z.objs.push({ kind: 'npc', id, x: cx + f.at[0], z: cz + f.at[1], name: f.n, used: false }); }
  Z.objs.push({ kind: 'rift', x: cx + 11.6, z: cz + 4.4, name: 'Rift Stone', used: false });
  return Z;
}
function setEnv(Z) { const e = GLX.env, th = Z.th, n = Math.hypot(.55, .66, .42); e.sun = [.55 / n, .66 / n, .42 / n]; e.sunC = th.sunC; e.sky = th.sky; e.gnd = th.gnd; e.fog = GLX.col(th.fog); e.lightR = th.lightR; if (th !== THEMES.forest && th !== THEMES.town && th !== THEMES.ice) { e.lightR *= 1.3; e.sky = e.sky.map(v => v * 1.45); e.gnd = e.gnd.map(v => v * 1.3);  } /* deeper regions were too dark to read */ e.wet = th.wet === undefined ? .4 : th.wet; e.mist = th.mist === undefined ? .35 : th.mist; SFX.ambient(Object.keys(THEMES).find(k => THEMES[k] === th)); }
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
  G.inTown = false; G.away = null; G.zone = a.zone; G.ents = a.ents; G.drops = a.drops; G.boss = a.boss; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; buildStatic(G.zone); setEnv(G.zone); P.x = a.x; P.z = a.z; P.move = P.atk = P.inter = P.pick = null; BOT.path = null; questZone(G.zone);
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
// build 0024: monsters break apart in the stuff of their region (leaves, bone, embers, ice, void crystal)
function deathFx(e) { if (!G.zone || G.fx.length > 600) return; const T = G.zone.def.theme, sc = e.sc || 1, big = e.elite ? 1.6 : 1, n = Math.round((e.boss ? 18 : 7) * big);
  const kit = { forest: [[0x4a6a2a, 0x6a4a28, 0x8aa040], 'gem', 0, 0x9adf5a], crypt: [[0xd8d0b8, 0xb8b09a, 0xe8e0c8], 'gem', .08, 0xa0a8c0], lava: [[0x2a1a14, 0x3a2418, 0x1a1210], 'gem', .35, 0xff7a2a], ice: [[0xbfe6ff, 0xe8f6ff, 0x9ad0f0], 'gem', .55, 0xc8f0ff], void: [[0x6a3aa0, 0x9a6ad0, 0x4a2a70], 'gem', .9, 0xc080ff] }[T] || [[e.md.c, e.md.c2, e.md.c], 'gem', 0, e.md.e];
  for (let i = 0; i < n; i++) { const a = rnd(6.28), s = rnd(1.5, 4.5) * sc; G.fx.push({ chunk: 1, x: e.x + Math.cos(a) * .3, y: rnd(.6, 1.6) * sc, z: e.z + Math.sin(a) * .3, vx: Math.cos(a) * s, vy: rnd(2, 5.5), vz: Math.sin(a) * s, life: rnd(1.1, 1.7), max: 1.7, size: rnd(.1, .2) * sc * (e.boss ? 1.8 : 1), ar: kit[1] === 'cyl' ? rnd(2.5, 4) : rnd(.8, 1.6), spin: rnd(4, 9), g: kit[1], c: GLX.col(kit[0][i % 3]), em: kit[2], mat: 0 }); }
  if (T === 'lava' || T === 'void' || T === 'forest') for (let i = 0; i < 6 * big; i++) G.fx.push({ smoke: 1, x: e.x + rnd(-.5, .5), y: rnd(.4, 1.4), z: e.z + rnd(-.5, .5), vx: rnd(-.6, .6), vy: rnd(.5, 1.5), vz: rnd(-.6, .6), life: rnd(.8, 1.4), max: 1.4, size: rnd(.05, .1), c: GLX.col(kit[3]), mote: 1 });
  else if (T === 'crypt') for (let i = 0; i < 5; i++) G.fx.push({ smoke: 1, x: e.x + rnd(-.6, .6), y: .3, z: e.z + rnd(-.6, .6), vx: rnd(-.8, .8), vy: rnd(.3, .9), vz: rnd(-.8, .8), life: rnd(.7, 1.1), max: 1.1, size: rnd(.4, .7), c: GLX.col(0x8a8a90), dust: 1 }); }
function burst(x, y, z, c, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(6.28), u = rnd(-.2, 1), s = rnd(.3, 1) * sp; G.fx.push({ x, y, z, vx: Math.cos(a) * s, vy: u * s, vz: Math.sin(a) * s, life: rnd(.25, .6), max: .6, size: rnd(.1, .24), c: GLX.col(c) }); } if (G.fx.length > 700) G.fx.splice(0, G.fx.length - 700); }
// spell impact (build 0018): white-hot core flash, expanding shockwave, ground scorch, flying sparks and a burst of light
function impact(x, z, r, c, heavy) { if (typeof document === 'undefined') return; const C = GLX.col(c); G.fx.push({ shock: 1, x, z, r, life: heavy ? .55 : .4, max: heavy ? .55 : .4, c: C, h: heavy ? 1 : 0 }); G.fx.push({ scorch: 1, x, z, r: r * .8, life: heavy ? 2.4 : 1.4, max: heavy ? 2.4 : 1.4, c: C });
  const n = heavy ? 18 : 9; for (let i = 0; i < n; i++) { const a = rnd(6.28), sp = rnd(6, heavy ? 15 : 10); G.fx.push({ spk: 1, x: x + Math.sin(a) * .3, y: rnd(.4, 1.4), z: z + Math.cos(a) * .3, vx: Math.sin(a) * sp, vy: rnd(2, heavy ? 9 : 6), vz: Math.cos(a) * sp, life: rnd(.3, .6), max: .6, c: i % 3 ? C : GLX.col(0xffffff) }); }
  if (heavy) { G.shake = Math.min(.6, G.shake + .22); for (let i = 0; i < 6; i++) G.fx.push({ x, y: .4, z, vx: rnd(-2, 2), vy: rnd(3, 6), vz: rnd(-2, 2), life: rnd(.6, 1), max: 1, size: rnd(.25, .4), c: GLX.col(0x5a4a3a), smoke: 1 }); }
  if (G.fx.length > 900) G.fx.splice(0, G.fx.length - 900); }
function ring(x, z, r0, r1, life, c) { G.fx.push({ ring: 1, x, z, r0, r1, life, max: life, c: GLX.col(c) }); }
function floatText(x, y, z, txt, col, life, size) { if (!G.set.nums && /^[-+✦\d]/.test(txt)) return; G.texts.push({ x: x + rnd(-.4, .4), y, z, txt, col, life: life || .9, max: life || .9, size: size || 15 }); if (G.texts.length > 60) G.texts.shift(); }
function addArea(o) { o.t = 0; G.areas.push(o); return o; }

// ---------- combat ----------
function wake(e) { if (e.awake) return; if (e.boss) { e.awake = true; return; } /* the boss intro card in ui.js announces it */ for (const o of G.ents) if (o.pack === e.pack && !o.awake) { o.awake = true; o.cd = rnd(.2, .9); } }
// fighting side by side pays: +10% damage per ally within reach, up to +30%
function partyBonus() { if (!G.online || G.inTown) return 0; let n = 0; for (const id in NET.peers) { const q = NET.peers[id]; if (!q.dead && Math.hypot(q.x - P.x, q.z - P.z) < 22) n++; } return Math.min(3, n) * 10; }
function rollDmg(sk, mult) { const s = P.stats; const base = rnd(s.wmin, s.wmax) + s.addPhys + s.addFire + s.addCold + s.addLight; let inc = s.dmg + (s[sk.el] || 0) + (sk.el !== 'phys' ? s.ele : 0); if (s.lowLife && P.hp < s.maxLife * .5) inc += s.lowLife; let v = base * sk.m * (mult || 1) * (1 + inc / 100) * (1 + partyBonus() / 100); const crit = Math.random() * 100 < s.critT; if (crit) v *= s.critM; return { v, crit }; }
function hitEnemy(e, sk, mult, noProc) {
  if (!e.alive) return; const s = P.stats, d = rollDmg(sk, mult); let v = d.v; if (e.armored) v *= .6; if (e.shock > 0) v *= 1.15; if (!e.boss && !e.elite && e.hp > e.maxHp * .95) v = Math.min(v, e.maxHp * .65); v = Math.max(1, Math.round(v)); // house rule: ordinary monsters always take at least 2 hits
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
  let xp = 22 * Math.pow(1.13, e.lvl) * (e.a.xp || 1) * (e.elite === 1 ? 3 : e.elite === 2 ? 6 : 1); const diff = h.level - e.lvl, pf = diff > 4 ? Math.max(.1, 1 - (diff - 4) * .15) : 1; xp *= pf; if (e.boss) { xp = Math.max(xp, xpNeed(h.level) * .65 * pf); G.bossXp = Math.round(xp); } /* one announcement only: the Guardian slain banner shows the XP */ /* Lee, Nov 13: guardians give a lot of XP, about two thirds of a level */ if (G.set.nums !== false && h.level < MAX_LEVEL) floatText(e.x, 2.4 * e.sc, e.z, '+' + Math.max(1, Math.round(xp)) + ' xp', '#cfc4ff', 1, 12); gainXp(xp);
  G.streak++; G.streakT = 4; if (G.streak > G.bestStreak) G.bestStreak = G.streak; if (G.streak > (h.best || 0)) h.best = G.streak;
  { const MS = { 10: ['Rampage!', 0xffb03a], 25: ['Massacre!', 0xff6a3a], 50: ['Unstoppable!', 0xff3a6a], 100: ['Godlike!', 0xc070ff] }, m = MS[G.streak]; if (m) { const bonus = Math.round((8 + h.level * 4) * (G.streak / 10)); h.gold += bonus; UI.streakPop && UI.streakPop('x' + G.streak + ' ' + m[0], '+' + bonus + ' gold', m[1]); impact(P.x, P.z, 2.2, m[1], true); SFX.play('level'); } } // kill streak milestones with a small gold bonus
  if (!G.inTown && h.tq) { const q = tqCur(); if (q) { const g = q.goal; const fl = G.zone.def.depth || 1; if (g.k === 'kills') tqAdd('kills'); else if (g.k === 'elite' && e.elite) tqAdd('elite'); else if (g.k === 'arch' && e.arch === g.arch) tqAdd('arch'); else if (g.k === 'boss' && e.boss && fl >= (g.min || 1)) tqAdd('boss'); else if (g.k === 'collect' && fl >= (g.min || 1) && h.tq.n + G.drops.filter(d => d.q).length < g.n && Math.random() < (e.boss ? 1 : e.elite ? .7 : g.p)) G.drops.push({ q: g.item, qc: g.c, x: e.x + rnd(-.5, .5), z: e.z + rnd(-.5, .5), t: 0, y: 0 }); } } // townsfolk quests
  dropLoot(e); burst(e.x, 1, e.z, e.md.c2, 8, 6); deathFx(e); SFX.play('kill');
  if (!e.noLoot && (e.elite || Math.random() < .12)) G.drops.push({ x: e.x, z: e.z, globe: 1, t: 0 });
  if (s.boomFire) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'fire', m: 1.2 }, c: 0xff7a2a, proc: 1 });
  if (s.boomCold) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'cold', m: 1.0 }, c: 0x7ad0ff, proc: 1 });
  if (e.volatile && !G.online) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten && !G.online) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.boss) {
    if (G.zone.def.rift && !G.riftDone && !G.online) riftDone((G.time - G.riftT0) * 1000, G.zone.def.lvl);
    if (typeof GPS !== 'undefined') GPS.t = 0; G.zone.cleared = true; G.shake = .9; ring(e.x, e.z, 0, 16, 1.1, e.md.e); burst(e.x, 2, e.z, e.md.e, 60, 11); SFX.play('level'); h.runs++; h.maxClear = Math.max(h.maxClear || 0, G.zone.def.depth || 1); /* deepest floor you have completed, for the leaderboard */
    G.zone.objs.push({ kind: 'portal', x: e.x, z: e.z, name: 'Next floor', used: false }); h.depthMax = Math.max(h.depthMax || 0, G.zone.def.depth || 1); if (!G.zone.def.rift) UI.zoneBanner('Guardian slain', (G.bossXp ? '+' + G.bossXp.toLocaleString() + ' XP · ' : '') + 'a great gate opens to the next floor'); ring(e.x, e.z, 0, 16, 1.2, 0x7ad0ff); ring(e.x, e.z, 0, 9, .8, 0xb48cff); burst(e.x, 2, e.z, 0x7ad0ff, 60, 12); G.shake = .9; SFX.play('shrine'); saveGame();
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
  P.hp -= v; P.hurt = .25; P.lastHit = G.time; P.mana = Math.min(s.maxMana, P.mana + 2); G.shake = Math.min(.7, G.shake + .12 + v / s.maxLife); floatText(P.x, 2.6, P.z, '-' + v, '#ff5a4a', .9, 17); SFX.play('hurt'); burst(P.x, 1.4, P.z, 0xffc070, 7, 5); { const hf = typeof document !== 'undefined' && document.getElementById('hurtFx'); if (hf && hf.animate) hf.animate([{ opacity: Math.min(.75, .3 + v / s.maxLife * 2) }, { opacity: 0 }], { duration: 450, easing: 'ease-out' }); }
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
  if (sk.type !== 'melee' && !sk.basic && EL_COL[sk.el] !== undefined) { const c = GLX.col(EL_COL[sk.el]), fx = P.x + Math.sin(P.rot) * .8, fz = P.z + Math.cos(P.rot) * .8; G.fx.push({ flash: 1, x: fx, y: 1.6, z: fz, r: 2.4, life: .22, max: .22, c }); ring(P.x, P.z, .3, 1.8, .3, EL_COL[sk.el]); for (let i = 0; i < 8; i++) { const an = P.rot + rnd(-.7, .7), sp = rnd(4, 9); G.fx.push({ spk: 1, x: fx, y: 1.5, z: fz, vx: Math.sin(an) * sp, vy: rnd(1, 4), vz: Math.cos(an) * sp, life: rnd(.2, .4), max: .4, c }); } } // casting flare at the hands
  if (sk.type === 'melee') {
    const range = sk.range * Math.sqrt(ar); let n = 0;
    for (const e of G.ents) { if (!e.alive) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d > range + e.r) continue; let da = Math.atan2(dx, dz) - P.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; if (Math.abs(da) <= sk.arc / 2 || d < 1.2) { hitEnemy(e, sk); n++; } }
    G.fx.push({ slash: 1, x: P.x, z: P.z, rot: P.rot, r: range, arc: sk.arc, life: .16, max: .16, c: GLX.col(0xfff0d0) }); if (G.online) NET.send({ t: 'fx', k: 's', x: P.x, z: P.z, rot: P.rot, r: range, arc: sk.arc }); if (n) G.shake = Math.min(.5, G.shake + .06);
  } else if (sk.type === 'nova') {
    const r = sk.r * ar; areaHit(P.x, P.z, r, sk); ring(P.x, P.z, .5, r, .35, EL_COL[sk.el]); if (G.online) NET.send({ t: 'fx', k: 'r', x: P.x, z: P.z, r, c: EL_COL[sk.el] }); burst(P.x, .4, P.z, 0xc8b89a, 26, 9); impact(P.x, P.z, r * .6, EL_COL[sk.el], true); G.shake = .45; SFX.play('slam');
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
    if (!goal) { let bdist = 1e9, be = null; for (const e of G.ents) { if (!e.alive) continue; const dc = f.dist[cellOf(e.x, e.z)]; if (dc >= 0 && dc < bdist) { bdist = dc; be = e; } } if (be) goal = [be.x, be.z]; else { const po = G.zone.objs.find(o => o.kind === 'portal' && !o.used); if (po) { goal = [po.x, po.z]; act = () => { po.gone = true; interact(po); }; } } }
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
  if (h.autoPot && !P.dead && P.stats && P.hp < P.stats.maxLife * .5 && (P.fl === undefined || P.fl > 0) && !(P.flaskT > 0)) useFlask();
  if (h.autoc && !P.act) for (let i = 1; i < 4; i++) { if (!h.autoc[i] || !h.bar[i]) continue; const sk = SKILLS[h.bar[i]], e = nearFoe(sk.type === 'melee' || sk.type === 'nova' || sk.type === 'spin' ? (sk.range || sk.r || 3) * .8 : 11); if (!e || (P.cds[h.bar[i]] || 0) > 0 || P.mana < (sk.cost || 0)) continue; const esc = sk.type === 'dash' && !sk.land; if (esc) continue; if (tryCast(i, e.x, e.z)) return; }
  for (let i = 0; i < 4; i++) if (IN.tb[i]) {
    const e = nearFoe(15), sk = SKILLS[i === 0 && !h.eq.weapon ? 'punch' : h.bar[i]];
    const melee = sk && sk.type === 'melee', dash = sk && sk.type === 'dash', steer = jm >= .18, far = dash ? sk.range * .85 : 6;
    if (e && melee) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > sk.range * .78 + e.r) { if (steer) continue; chase = e; break; } } // out of reach: the stick steers, or at rest the hero closes in
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
function knows(h, id) { const sk = SKILLS[id]; if (!sk) return false; if (sk.basic) return CLASSES[h.cls].skills.includes(id); const i = (KIT[h.cls] || []).indexOf(id); return i >= 0 && h.level >= KIT_LV[i]; }
function applyKit(h, announce) { const k = KIT[h.cls] || []; h.bar = h.bar || [CLASSES[h.cls].skills[0], null, null, null]; if (!h.bar[0] || !knows(h, h.bar[0])) h.bar[0] = CLASSES[h.cls].skills[0]; h.autoc = h.autoc || [0, 1, 1, 1]; k.forEach((id, i) => { if (h.level >= KIT_LV[i] && h.bar[i + 1] !== id) { h.bar[i + 1] = id; h.autoc[i + 1] = 1; /* Lee, Nov 13: every skill starts on autocast */ if (announce) hint('New skill: ' + SKILLS[id].n + ' — on ' + SLOT_KEY[i + 1] + ', autocast on.'); } else if (h.level < KIT_LV[i]) h.bar[i + 1] = null; }); if (typeof UI !== 'undefined' && UI.buildBar && G.hero === h) UI.buildBar(); }
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
  if (!b) { hint('No party member close enough to give this to.'); return false; } if (it.cls && NET.cls && NET.cls[b.id] && NET.cls[b.id] !== it.cls) { hint('That is a ' + CLASSES[it.cls].n + ' item, and ' + b.name + ' is a ' + CLASSES[NET.cls[b.id]].n + '.'); return false; } NET.send({ t: 'give', to: b.id, item: it }); h.inv[i] = null; hint('Gave ' + it.name + ' to ' + b.name + '.'); saveGame(); return true;
}
const FLASK_MAX = 5, FLASK_CD = 15; // up to five potions saved; one refills every 15 seconds
function useFlask() { if (P.dead) return; if (P.fl === undefined) P.fl = FLASK_MAX; if (P.hp >= P.stats.maxLife) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('You are at full health. The potion is saved.'); } return; } if (P.fl <= 0) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('No potions left. The next one is ready in ' + Math.ceil(P.flaskCd) + ' seconds.'); } return; } if (P.flaskT > 0) return; P.fl--; if (!(P.flaskCd > 0)) P.flaskCd = FLASK_CD; P.flaskT = 1.2; SFX.play('flask'); burst(P.x, 1.4, P.z, 0xff4a4a, 14, 4); }
function pickup(d) {
  const i = G.drops.indexOf(d); if (i < 0) return;
  if (d.globe) { P.hp = Math.min(P.stats.maxLife, P.hp + P.stats.maxLife * .25); floatText(d.x, 1.4, d.z, '+life', '#ff6a6a', .8, 14); SFX.play('flask'); G.drops.splice(i, 1); return; }
  if (d.gold) { G.hero.gold += d.gold; floatText(d.x, 1.2, d.z, '+' + d.gold + ' gold', '#ffd84a', .9, 13); SFX.play('gold'); G.drops.splice(i, 1); return; }
  if (d.item && d.item.cls && d.item.cls !== G.hero.cls && G.online && Object.keys(NET.peers).length) { if (G.time - (d.clsT || -9) > 2) { d.clsT = G.time; hint('That is a ' + CLASSES[d.item.cls].n + ' item: only a ' + CLASSES[d.item.cls].n + ' can pick it up in a party.'); } return; }
  if (d.q) { tqAdd('collect'); floatText(d.x, 1.4, d.z, d.q, '#8affc0', 1, 13); SFX.play('pickup'); burst(d.x, 1, d.z, d.qc || 0x8affc0, 10, 4); G.drops.splice(i, 1); return; }
  if (!addItem(d.item)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Inventory is full. Open it (I) and scrap or drop something.'); } return; }
  G.drops.splice(i, 1); SFX.play('pickup'); floatText(d.x, 1.4, d.z, d.item.name, RAR[d.item.rar].c, 1.1, 13); UI.invDirty = true;
  if (d.item.rar >= 3) G.hero['f' + Math.min(4, d.item.rar)] = 1;
  if (d.item.rar >= 3 && !d.item.fd) { d.item.fd = 1; if (G.online) NET.send({ t: 'found', item: d.item.name, r: d.item.rar }); else hint('You found a ' + RAR[d.item.rar].n + ' item: ' + d.item.name); }
}
// line of sight: true when no wall cell lies between two points (auto-aim never picks targets behind walls)
function los(x0, z0, x1, z1) { const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.ceil(L / .35); for (let i = 1; i < n; i++) { const t = i / n; if (cellAt(x0 + dx * t, z0 + dz * t)) return false; } return true; }
function nearFoe(r) { let b = null, bd = r; for (const e of G.ents) { if (!e.alive) continue; /* sleeping monsters count too, so the attack button never swings at air */ const d = Math.hypot(e.x - P.x, e.z - P.z) - e.r; if (d < bd && los(P.x, P.z, e.x, e.z)) { bd = d; b = e; } } return b; }
function nearObj() { if (!G.zone) return null; let b = null, bd = 1e9; for (const o of G.zone.objs) { if (o.used) continue; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < (o.kind === 'portal' ? 5.5 : 3.6) && d < bd) { bd = d; b = o; } } return b; }
function useNear() { const o = nearObj(); if (o) interact(o); else pickupNear(); }
// ---- life in Emberwatch (build 0020): sails, smoke, forge, villagers, townsfolk with quest marks, a festival once the siege breaks ----
const FOLKGEAR = { bram: { chest: [2, 0], pants: [1, 0], boots: [1, 0], belt: [1, 0] }, hesta: { chest: [2, 0], boots: [1, 0] }, lysa: { chest: [2, 0], boots: [1, 0], belt: [1, 0] }, doran: { chest: [1, 0], gloves: [1, 0], pants: [1, 0], boots: [1, 0], belt: [1, 0] }, roek: { chest: [0, 1], helm: [0, 0], shoulders: [0, 0], pants: [0, 0], boots: [0, 0], weapon: [0, 1] } };
const TOWNIES = [{ cls: 'vil6', hair: 0x5a3a20, path: [[-6, -4], [-2, -8], [4, -7], [7, -2], [5, 4], [-1, 6], [-6, 3]] }, { cls: 'vil1', hair: 0x6a4a2a, path: [[-11.5, 7.6], [-8.2, -1.4], [-5, 2.5]] }, { cls: 'vil5', hair: 0x2a1a10, path: [[5, 9], [10.5, -7.5], [3, -6.5], [1, 4]] }].map(t => Object.assign({ x: 0, z: 0, y: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, wp: 0, wait: 0, gear: { chest: [2, 0], pants: [1, 0], boots: [1, 0] } }, t));
const PIPK = { cls: 'kid', sc: .68, hair: 0xc08040, x: 0, z: 0, y: 0, rot: 0, walk: 0, mv: 1, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, gear: { chest: [2, 0], pants: [1, 0] } };
function drawTownLife() {
  const Z = G.zone, col = GLX.col, t = G.time, cx = Z.bossAt[0], cz = Z.bossAt[1], done = G.hero.tqd || [], has = id => done.includes(id), dt = Math.min(.1, t - (Z.lifeT === undefined ? t : Z.lifeT)); Z.lifeT = t;
  if (Z.mill) { const [mx, my, mz] = Z.mill, a0 = has('grain') ? t * .9 : .35; for (let k = 0; k < 4; k++) { const a = a0 + k * 1.5708, broken = !has('grain') && k === 2; GLX.part('dyn', 'box', IDM, mx, my, mz + .2, 0, 0, a, 0, broken ? 1.2 : 2.3, 0, .16, broken ? 2.4 : 4.6, .12, col(0x5a4028), 0, 1, 3); if (!broken) GLX.part('dyn', 'box', IDM, mx, my, mz + .26, 0, 0, a, .42, 2.6, 0, .8, 3.6, .04, col(0xe8e0c8), 0, 1, 0); } GLX.obj('dyn', 'sphere', mx, my, mz + .3, 0, .5, .5, .5, col(0x3a2a1a)); }
  if (Z.smoke) for (const [sx, sy, sz] of Z.smoke) for (let k = 0; k < 5; k++) { const ph = (t * .22 + k / 5 + sx * .07) % 1, r = .35 + ph * 1.1; GLX.obj('glow', 'sphere', sx + ph * 1.6 + Math.sin(t + k) * .2, sy + ph * 4.5, sz - ph * .6, 0, r, r, r, col(0x9a948c), .2, (1 - ph) * .1); }
  if (Z.forge) { const [fx, fz] = Z.forge, hot = has('steel') ? 1.5 : 1, fl = .8 + Math.sin(t * 13) * .1 + Math.sin(t * 7.3) * .1; GLX.obj('glow', 'sphere', fx, 1.5, fz, 0, .9 * hot, .35, .7 * hot, col(0xff7a2a), 2, .8 * fl); GLX.halo(fx, 1.7, fz, 2.4 * hot, col(0xff6a1a), .6 * fl); GLX.light(fx, 2, fz, 7 * hot, col(0xff7a2a), 1.6 * fl * hot, 8);
    for (let k = 0; k < 4; k++) { const ph = (t * 1.3 + k / 4) % 1; GLX.obj('glow', 'gem', fx + Math.sin(k * 2.1 + t) * .4, 1.6 + ph * 2.2, fz + Math.cos(k * 1.7) * .3, t, .04, .08, .04, col(0xffc050), 2, 1 - ph); } }
  { const ro = Z.objs.find(o => o.kind === 'rift'); if (ro) { const c = col(0xb070ff), pu = .7 + Math.sin(t * 2.3) * .3; GLX.halo(ro.x, 2.4, ro.z, 2.6 * pu, c, .45); GLX.obj('glow', 'ring', ro.x, .1, ro.z, t * .6, 3.2, 1, 3.2, c, 1, .35 * pu, -1); for (let k = 0; k < 5; k++) { const ph = (t * .5 + k / 5) % 1, a = k * 1.26 + t; GLX.obj('glow', 'gem', ro.x + Math.cos(a) * .9, .4 + ph * 3.6, ro.z + Math.sin(a) * .9, a, .06, .12, .06, c, 2, 1 - ph); } GLX.light(ro.x, 2.5, ro.z, 6, c, .9 * pu, 7); } }
  if (Z.pot) { const [px, pz] = Z.pot; GLX.obj('glow', 'disc', px, .95, pz, 0, .8, 1, .8, col(0x6aff8a), 1.4, .7, 0); GLX.halo(px, 1.1, pz, 1.3, col(0x6aff8a), .4); for (let k = 0; k < 3; k++) { const ph = (t * .8 + k / 3) % 1; GLX.obj('glow', 'sphere', px + Math.sin(k * 3) * .25, 1 + ph * .5, pz + Math.cos(k * 3) * .25, 0, .1 * (1 - ph) + .04, .1, .1, col(0x9affb0), 1.2, 1 - ph); } }
  if (has('siege')) { // festival: strings of lanterns and bunting across the square
    for (const [a, b] of [[[-11, -8], [0, -.5]], [[0, -.5], [11, -8]], [[-8, 10], [0, -.5]], [[0, -.5], [8, 10]]]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 1.3); for (let k = 1; k < n; k++) { const u = k / n, x = cx + a[0] + (b[0] - a[0]) * u, z = cz + a[1] + (b[1] - a[1]) * u, y = 4.6 - Math.sin(u * Math.PI) * 1.2, c = col([0xff5a4a, 0xffd04a, 0x6ad0ff, 0x9aff6a, 0xff8ad0][k % 5]);
      if (k % 2) { GLX.obj('glow', 'sphere', x, y - .3, z, 0, .26, .32, .26, c, 1.8, .9); GLX.halo(x, y - .3, z, .9, c, .35); } else GLX.part('dyn', 'cone', IDM, x, y - .25, z, 3.14159, Math.atan2(b[0] - a[0], b[1] - a[1]) + 1.5708, 0, 0, 0, 0, .34, .45, .04, c, .3, 1, 0); } } }
  // villagers out for a walk
  for (const v of TOWNIES) { if (!v.init) { v.init = 1; v.x = cx + v.path[0][0]; v.z = cz + v.path[0][1]; } const w = v.path[v.wp], tx = cx + w[0], tz = cz + w[1], dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
    if (v.wait > 0) { v.wait -= dt; v.mv = 0; } else if (d < .3) { v.wp = (v.wp + 1) % v.path.length; v.wait = 1 + Math.random() * 2.5; } else { const st = Math.min(d, 1.7 * dt); v.x += dx / d * st; v.z += dz / d * st; let da = Math.atan2(dx, dz) - v.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; v.rot += da * Math.min(1, dt * 6); v.walk += st * 2.6; v.mv = .7; } drawHero(v, false); }
  if (has('pip')) { const a = t * 1.4, k = PIPK; const nx = cx + 6.5 + Math.cos(a) * 3.2, nz = cz + 6 + Math.sin(a) * 3.2; k.rot = Math.atan2(nx - k.x, nz - k.z); k.walk += Math.hypot(nx - k.x, nz - k.z) * 3; k.x = nx; k.z = nz; drawHero(k, false); }
  // the townsfolk, each by their home, with a mark over their head when they have work for you
  for (const o of Z.objs) { if (o.kind !== 'npc') continue; const f = FOLK[o.id]; if (!o.st) o.st = { x: o.x, z: o.z, y: 0, rot: Math.atan2(cx - o.x, cz - o.z), walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls: f.look, hair: f.hair, beard: f.beard, gear: FOLKGEAR[o.id] };
    const st = o.st, near = Math.hypot(P.x - o.x, P.z - o.z) < 7, want = near ? Math.atan2(P.x - o.x, P.z - o.z) : Math.atan2(cx - o.x, cz - o.z); let da = want - st.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; st.rot += da * Math.min(1, dt * 4); drawHero(st, false);
    const mk = tqMark(o.id), y = 3.15 + Math.sin(t * 3 + o.x) * .12; if (mk === '!') { const c = col(0xffd84a); GLX.obj('glow', 'box', o.x, y + .25, o.z, 0, .16, .55, .16, c, 2, 1); GLX.obj('glow', 'sphere', o.x, y - .22, o.z, 0, .18, .18, .18, c, 2, 1); GLX.halo(o.x, y, o.z, 1.6, c, .5); }
    else if (mk === '?') { const c = col(0x8affc0); GLX.obj('glow', 'gem', o.x, y + .1, o.z, t * 2, .34, .5, .34, c, 2, 1); GLX.halo(o.x, y, o.z, 1.8, c, .6); GLX.obj('glow', 'ring', o.x, .06, o.z, t, 2.6, 1, 2.6, c, 1, .5, -1); }
    else if (mk === '.') for (let k = -1; k <= 1; k++) GLX.obj('glow', 'sphere', o.x + k * .22, y, o.z, 0, .09, .09, .09, col(0xc8c0b0), 1, .7); }
}
function drawQuestBits() { // Pip, lost out in the world
  if (!G.zone || !G.zone.objs) return; const col = GLX.col, t = G.time;
  for (const o of G.zone.objs) { if (o.kind !== 'lost') continue; const k = o.st || (o.st = Object.assign({}, PIPK, { x: o.x, z: o.z, rot: 0, mv: 0 }));
    if (o.used) { const u = (t - o.runT) / 3; if (u > 1) continue; const a = Math.atan2(G.zone.start[0] - o.x, G.zone.start[1] - o.z); k.x = o.x + Math.sin(a) * u * 9; k.z = o.z + Math.cos(a) * u * 9; k.rot = a; k.mv = 1; k.walk = t * 9; drawHero(k, false); continue; }
    k.mv = 0; k.rot = Math.atan2(P.x - o.x, P.z - o.z); k.y = Math.abs(Math.sin(t * 6)) * .05; drawHero(k, false); const c = col(0xff9ad0), y = 2.4 + Math.sin(t * 3) * .12; GLX.obj('glow', 'box', o.x, y + .22, o.z, 0, .14, .48, .14, c, 2, 1); GLX.obj('glow', 'sphere', o.x, y - .2, o.z, 0, .16, .16, .16, c, 2, 1); GLX.halo(o.x, 1.2, o.z, 2.6, c, .45); GLX.light(o.x, 2, o.z, 6, c, .8, 6); }
}
// pet (build 0020): Ember, a little fox-sprite that trots after you and fetches gold
const PET = { x: 0, z: 0, y: 0, rot: 0, walk: 0, tgt: null, hop: 0, init: false };
function updPet(dt) {
  if (G.set.pet === false || P.dead) return; if (!PET.init || Math.hypot(PET.x - P.x, PET.z - P.z) > 18) { PET.x = P.x - 1; PET.z = P.z - 1; PET.init = true; }
  if (PET.tgt && !G.drops.includes(PET.tgt)) PET.tgt = null;
  if (!PET.tgt) { const h = G.hero, room = h.inv.includes(null), hurt = P.hp < P.stats.maxLife * .8; let best = 1e9; // gold, loot your filter keeps, and health orbs when you are hurt
    for (const d of G.drops) { if (d.petSkip || (d.t || 0) < .3) continue; const want = d.gold || d.q || (d.globe && hurt) || (d.item && room && d.item.rar >= (h.filter || 0)); if (!want) continue; const fromHero = Math.hypot(d.x - P.x, d.z - P.z); if (fromHero > 10) continue; const dd = Math.hypot(d.x - PET.x, d.z - PET.z); if (dd < best) { best = dd; PET.tgt = d; } } }
  let tx, tz, sp; if (PET.tgt) { tx = PET.tgt.x; tz = PET.tgt.z; sp = 11; } else { const a = P.rot + 2.4; tx = P.x + Math.sin(a) * 1.5; tz = P.z + Math.cos(a) * 1.5; sp = Math.min(12, 3 + Math.hypot(tx - PET.x, tz - PET.z) * 3); }
  const dx = tx - PET.x, dz = tz - PET.z, d = Math.hypot(dx, dz);
  if (d > .15) { const st = Math.min(d, sp * dt); PET.x += dx / d * st; PET.z += dz / d * st; PET.rot = Math.atan2(dx, dz); PET.walk += st * 3.2; PET.mv = Math.min(1, st / (dt * 4 + 1e-4)); } else PET.mv = 0;
  if (PET.tgt && d < .5) { const tg = PET.tgt; pickup(tg); if (G.drops.includes(tg)) tg.petSkip = true; else { PET.hop = .35; burst(PET.x, .8, PET.z, 0xffb050, 6, 3); } PET.tgt = null; } PET.hop = Math.max(0, PET.hop - dt);
}
function drawPet() {
  if (G.set.pet === false || P.dead || !PET.init) return; const k0 = G.set.petKind || 'fox', pt = PETS.find(q => q[0] === k0), got = G.ach || (G.ach = achLoad()), kind = pt && (!pt[2] || got[pt[2]]) ? k0 : 'fox';
  if (kind === 'owl' || kind === 'drake') return drawFlyer(kind); if (kind === 'cat') return drawCat();
  const col = GLX.col, t = G.time, B = BM2, run = PET.mv || 0, bob = Math.abs(Math.sin(PET.walk)) * .12 * run + Math.sin(t * 3) * .03 + Math.sin(Math.min(1, PET.hop / .35) * Math.PI) * .5;
  GLX.base(B, PET.x, bob, PET.z, PET.rot, .55); const fur = col(kind === 'gold' ? 0xe8c040 : 0xe8742a), cream = col(0xfff0dc), dark = col(0x3a2418), CC = col(CLASS_COL[G.hero.cls] || 0xd8a040), q = (g, px, py, pz, rx, ry, rz, sx, sy, sz, c, e) => GLX.part('dyn', g, B, px, py, pz, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, e || 0, 1, 0);
  q('sphere', 0, .62, 0, 0, 0, 0, .52, .46, .8, fur); q('sphere', 0, .56, .18, 0, 0, 0, .34, .3, .4, cream); // body, chest
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) q('taper', .16 * sx, .3, .22 * sz, Math.sin(PET.walk + (sx * sz > 0 ? 0 : 3.14)) * .7 * run, 0, 0, .13, -.42, .13, dark);
  q('sphere', 0, .98, .42, 0, 0, 0, .46, .4, .42, fur); q('sphere', 0, .92, .64, 0, 0, 0, .2, .16, .26, cream); q('sphere', 0, .95, .78, 0, 0, 0, .07, .06, .06, dark); // head, muzzle, nose
  for (const sd of [1, -1]) { q('cone', .14 * sd, 1.24, .38, 0, 0, -sd * .25, .14, .26, .1, fur); q('cone', .14 * sd, 1.22, .4, 0, 0, -sd * .25, .07, .16, .05, cream); q('sphere', .11 * sd, 1.02, .6, 0, 0, 0, .07, .08, .04, col(0xffd060), 1.6); }
  q('cap', 0, .82, .34, 0, 0, 0, .4, .08, .4, CC); // scarf in your class colour
  const tw = Math.sin(t * 5) * .35 + run * .3; q('taper', 0, .72, -.36, -1.1 + Math.sin(t * 3) * .15, tw, 0, .26, .55, .26, fur); q('sphere', Math.sin(tw) * .3, .95, -.82, 0, 0, 0, .2, .2, .2, cream);
  GLX.obj('glow', 'sphere', PET.x - Math.sin(PET.rot) * .5, .55 + bob * .55, PET.z - Math.cos(PET.rot) * .5, 0, .14, .14, .14, col(0xffa040), 1.8, .6); // the ember at its tail tip
  for (let k = 0; k < 3; k++) { const ph = (t * .9 + k / 3) % 1; GLX.obj('glow', 'gem', PET.x - Math.sin(PET.rot) * .5 + Math.sin(k * 2 + t) * .15, .6 + ph * 1.1, PET.z - Math.cos(PET.rot) * .5, t, .03, .06, .03, col(0xffb050), 2, 1 - ph); }
}
function achLoad() { try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_ach')) || {}; } catch (e) { return {}; } }
function achCheck() { if (!G.hero || typeof document === 'undefined') return; const got = G.ach || (G.ach = achLoad()); let nw = false; for (const a of ACH) if (!got[a[0]] && a[4](G.hero)) { got[a[0]] = Date.now(); nw = true; UI.achToast && UI.achToast(a); } if (nw) { try { localStorage.setItem(SAVE_KEY + '_ach', JSON.stringify(got)); } catch (e) { } } }
function achBadge() { const got = G.ach || (G.ach = achLoad()); let b = ''; for (const a of ACH) if (got[a[0]]) b = a[1]; return b; } // your rarest badge, shown in chat
// ---- townsfolk quests (build 0020): take a job in Emberwatch, do it out in the world, come home for the reward ----
function tqCur() { const h = G.hero; if (!h || !h.tq) return null; return h.tq.id === 'bounty' ? BOUNTY : QUESTS.find(q => q.id === h.tq.id) || null; }
function tqNext() { const d = (G.hero && G.hero.tqd) || []; return QUESTS.find(q => !d.includes(q.id)) || BOUNTY; }
function tqMark(id) { const h = G.hero, q = tqCur(); if (q) return q.by !== id ? '' : h.tq.n >= q.goal.n ? '?' : '.'; return tqNext().by === id ? '!' : ''; }
function tqHow(q) { const g = q.goal; return g.k === 'collect' ? 'Monsters ' + (g.min ? 'on floor ' + g.min + ' and deeper' : 'out in the world') + ' now drop ' + g.item + '. Collect ' + g.n + '.' : g.k === 'arch' ? 'Defeat ' + g.n + ' spell-casting monsters out in the world.' : g.k === 'floor' ? 'Reach floor ' + g.n + '. Take the portal after each guardian to go deeper.' : g.k === 'rescue' ? 'Leave town and search the floor for Pip. Look for the pink star on your map.' : g.k === 'elite' ? 'Defeat ' + g.n + ' champions: the monsters with names over their heads.' : g.k === 'boss' ? 'Defeat a floor guardian' + (g.min ? ' on floor ' + g.min + ' or deeper' : '') + '.' : 'Defeat ' + g.n + ' monsters out in the world.'; }
function tqReward(q) { const lv = G.hero.level; return { gold: Math.round((60 + 30 * lv) * q.gold), shards: 3 + Math.floor(lv / 3), rar: q.rar }; }
function tqAdd(kind, amt) { const h = G.hero, q = tqCur(); if (!q || q.goal.k !== kind || h.tq.n >= q.goal.n) return; h.tq.n = Math.min(q.goal.n, h.tq.n + (amt || 1));
  if (h.tq.n >= q.goal.n) { hint('Quest done: ' + q.t + '! Go back to ' + FOLK[q.by].n + ' in Emberwatch (press T) for your reward.'); SFX.play('shrine'); UI.streakPop && UI.streakPop('Quest complete!', q.t + ' · return to town', 0x8affc0); }
  else if (kind !== 'kills' || h.tq.n % 10 === 0) hint(q.goal.item + ': ' + h.tq.n + ' / ' + q.goal.n); saveGame(); }
function tqAccept() { const h = G.hero, q = tqNext(); h.tq = { id: q.id, n: 0 }; saveGame(); SFX.play('pickup'); hint('New quest: ' + q.t + '. ' + tqHow(q)); }
function tqClaim() { const h = G.hero, q = tqCur(); if (!q || h.tq.n < q.goal.n) return null; const r = tqReward(q); h.gold += r.gold; h.shards = (h.shards || 0) + r.shards; const it = makeItem(h.level, null, r.rar); if (!addItem(it)) dropItem(P.x, P.z, it);
  h.tqd = h.tqd || []; if (!q.repeat && !h.tqd.includes(q.id)) h.tqd.push(q.id); h.tq = null; saveGame(); UI.invDirty = true; SFX.play('level'); ring(P.x, P.z, 0, 8, .8, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7); if (G.inTown) buildStatic(G.zone); return { r, it, q }; }
function questZone(Z) { // the rescue quest puts Pip somewhere far out on the next floor you visit
  if (!Z || !Z.def || Z.def.type === 'town') return; const q = tqCur(); if (q && q.goal.k === 'floor' && (Z.def.depth || 1) > G.hero.tq.n) tqAdd('floor', (Z.def.depth || 1) - G.hero.tq.n); if (!q || q.goal.k !== 'rescue' || G.hero.tq.n >= q.goal.n || Z.objs.some(o => o.kind === 'lost')) return;
  let best = null; for (let i = 0; i < GW * GW; i++) { if (Z.cell[i]) continue; const dd = Z.dist ? Z.dist[i] : -1; if (dd < 10) continue; const sc = Math.abs(dd - 22) + Math.random() * 4; if (!best || sc < best[1]) best = [i, sc]; }
  if (!best) return; const x = (best[0] % GW + .5) * CS, z = ((best[0] / GW | 0) + .5) * CS; Z.objs.push({ kind: 'lost', x, z, name: 'Pip', used: false }); setTimeout(() => hint('Pip is lost somewhere on this floor. Look for the pink star on your map!'), 1800); }
// monsters slowly come back (build 0020): every half minute or so a fresh pack moves into a quiet part of the floor, far from every player
let repN = 0;
function repop(dt, pls) {
  const Z = G.zone; if (!Z || !Z.def || Z.def.type === 'town' || !Z.packs || !Z.packs.length || !pls.length) return;
  if (Z.ent0 === undefined) Z.ent0 = G.ents.filter(e => e.alive && !e.boss).length; Z.repT = (Z.repT === undefined ? 30 : Z.repT) - dt; if (Z.repT > 0) return; Z.repT = 24 + Math.random() * 14;
  if (G.ents.filter(e => e.alive && !e.boss).length >= Z.ent0 * .8) return;
  let k = -1; for (let t = 0; t < 30 && k < 0; t++) { const c = Z.packs[(Math.random() * Z.packs.length) | 0], x = (c % GW + .5) * CS, z = ((c / GW | 0) + .5) * CS; if (pls.every(p => Math.hypot(p.x - x, p.z - z) > 26)) k = c; } if (k < 0) return;
  const th = Z.th, cx = (k % GW + .5) * CS, cz = ((k / GW | 0) + .5) * CS, main = th.mon[(Math.random() * th.mon.length) | 0], n = main.a === 'brute' ? 2 : main.a === 'swarm' ? 6 : 4, pk = 'r' + (++repN);
  for (let i = 0; i < n; i++) for (let t = 0; t < 8; t++) { const x = cx + rnd(-3.5, 3.5), z = cz + rnd(-3.5, 3.5); if (!blocked(x, z, .7)) { mkEnemy(main, x, z, Z.def.lvl, 0, pk); break; } }
}
function drawFlyer(kind) { // the frost owl and the ember drake fly at your shoulder
  const col = GLX.col, t = G.time, B = BM2, owl = kind === 'owl', y = 1.5 + Math.sin(t * 2.4) * .18 + Math.sin(Math.min(1, PET.hop / .35) * Math.PI) * .4, flap = Math.sin(t * (owl ? 9 : 13)) * .7;
  GLX.base(B, PET.x, y, PET.z, PET.rot, .5); const body = col(owl ? 0xd8e4f0 : 0xc0401a), belly = col(owl ? 0xf4f8fc : 0xf0a040), eye = col(owl ? 0xffd040 : 0xffe080), q = (g, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, e) => GLX.part('dyn', g, B, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, e || 0, 1, 0);
  q('sphere', 0, 0, 0, owl ? 0 : .3, 0, 0, 0, 0, 0, owl ? .7 : .6, owl ? .8 : .5, owl ? .65 : 1, body); q('sphere', 0, -.05, .2, 0, 0, 0, 0, 0, 0, owl ? .5 : .35, owl ? .55 : .3, .3, belly);
  if (owl) { q('sphere', 0, .55, .05, 0, 0, 0, 0, 0, 0, .6, .5, .55, body); for (const sd of [1, -1]) { q('sphere', .14 * sd, .58, .3, 0, 0, 0, 0, 0, 0, .16, .16, .06, eye, 1.6); q('cone', .2 * sd, .85, 0, 0, 0, -sd * .4, 0, 0, 0, .1, .2, .08, body); } q('cone', 0, .5, .36, 1.57, 0, 0, 0, 0, 0, .07, .14, .07, col(0x8a6a3a)); }
  else { q('sphere', 0, .25, .55, .2, 0, 0, 0, 0, 0, .34, .3, .42, body); q('cone', 0, .22, .82, 1.57, 0, 0, 0, 0, 0, .14, .26, .12, body); for (const sd of [1, -1]) { q('sphere', .1 * sd, .32, .72, 0, 0, 0, 0, 0, 0, .07, .07, .05, eye, 2); q('cone', .1 * sd, .5, .45, -.5, 0, 0, 0, 0, 0, .05, .2, .05, col(0x2a1a10)); } q('taper', 0, -.05, -.6, -1.4 + Math.sin(t * 4) * .2, Math.sin(t * 3) * .4, 0, 0, .3, 0, .2, .8, .2, body); }
  for (const sd of [1, -1]) q('box', .3 * sd, .1, 0, 0, 0, sd * (.4 + flap), sd * .45, 0, 0, .9, .05, owl ? .5 : .6, owl ? col(0xb8c8d8) : col(0x8a2a12));
  const tail = owl ? col(0x9ad8ff) : col(0xff8a30); GLX.halo(PET.x, y, PET.z, 1.2, tail, owl ? .2 : .35); if (!owl) for (let k = 0; k < 3; k++) { const ph = (t * 1.2 + k / 3) % 1; GLX.obj('glow', 'gem', PET.x - Math.sin(PET.rot) * .4, y - .1 - ph * .6, PET.z - Math.cos(PET.rot) * .4, t, .04, .08, .04, tail, 2, 1 - ph); }
}
function drawCat() { // the shadow cat pads along beside you
  const col = GLX.col, t = G.time, B = BM2, run = PET.mv || 0, bob = Math.abs(Math.sin(PET.walk)) * .08 * run + Math.sin(Math.min(1, PET.hop / .35) * Math.PI) * .45; GLX.base(B, PET.x, bob, PET.z, PET.rot, .5);
  const fur = col(0x2a2238), eye = col(0xb070ff), q = (g, px, py, pz, rx, ry, rz, sx, sy, sz, c, e) => GLX.part('dyn', g, B, px, py, pz, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, e || 0, 1, 0);
  q('sphere', 0, .55, 0, 0, 0, 0, .44, .4, .9, fur); for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) q('taper', .13 * sx, .28, .25 * sz, Math.sin(PET.walk + (sx * sz > 0 ? 0 : 3.14)) * .7 * run, 0, 0, .1, -.44, .1, fur);
  q('sphere', 0, .85, .45, 0, 0, 0, .4, .36, .38, fur); for (const sd of [1, -1]) { q('cone', .13 * sd, 1.1, .42, 0, 0, -sd * .2, .12, .24, .08, fur); q('sphere', .1 * sd, .9, .62, 0, 0, 0, .08, .07, .04, eye, 2); }
  q('taper', 0, .7, -.42, -.6 + Math.sin(t * 2.6) * .3, Math.sin(t * 1.7) * .5, 0, .1, .75, .1, fur); GLX.halo(PET.x - Math.sin(PET.rot) * .2, .9, PET.z - Math.cos(PET.rot) * .2, .9, eye, .18);
}
function riftDone(ms, tier) { G.riftDone = 1; const s2 = Math.round(ms / 1000), t = Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); const best = G.hero.riftBest || {}; const pb = !best[tier] || ms < best[tier]; if (pb) { best[tier] = ms; G.hero.riftBest = best; saveGame(); } UI.streakPop && UI.streakPop('Rift cleared · ' + t, pb ? 'New personal best!' : 'Monster level ' + tier, 0xb070ff); hint('Rift cleared in ' + t + '. Take the portal to go back to your floor.'); }
function pickupNear() { for (const d of G.drops.slice()) if (d.item && Math.hypot(d.x - P.x, d.z - P.z) < 5 && d.item.rar >= G.hero.filter) pickup(d); }
function interact(o) {
  if (o.used) return;
  if (o.kind === 'chest') { o.used = true; const lv = G.hero.level; for (let i = 0; i < 3; i++) dropItem(o.x, o.z, makeItem(lv, null, rollRarity(1))); dropGold(o.x, o.z, (10 + lv * 5) * rnd(.8, 1.5)); burst(o.x, 1, o.z, 0xffd84a, 20, 6); SFX.play('pickup'); }
  else if (o.kind === 'shrine') { o.used = true; P.buffs.push({ s: o.sh.s, t: 45, n: o.sh.n }); computeStats(); ring(o.x, o.z, 0, 8, .7, o.sh.c); SFX.play('shrine'); hint(o.sh.n + ' empowers you for 45 seconds.'); }
  else if (o.kind === 'stash' || o.kind === 'vendor' || o.kind === 'altar') UI.openTown(o.kind);
  else if (o.kind === 'tportal') leaveTown();
  else if (o.kind === 'npc') UI.openFolk && UI.openFolk(o.id);
  else if (o.kind === 'lost') { o.used = true; o.runT = G.time; tqAdd('rescue'); SFX.play('shrine'); burst(o.x, 1.2, o.z, 0xff9ad0, 24, 5); hint('Pip: "You found me! I will run straight home to Mum!"'); }
  else if ((o.kind === 'portal' || o.kind === 'pback') && !o.gone && typeof UI !== 'undefined' && UI.askGate) { UI.askGate(o); return; } /* click, E or the phone Use button: ask before leaving the floor, like walking in */
  else if (o.kind === 'portal') { if (G.online) NET.send({ t: 'next' }); else { if (!G.zone.def.rift) G.hero.depth = (G.hero.depth || 0) + 1; enterZone(); } }
  else if (o.kind === 'rift') UI.openRift && UI.openRift();
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
  updPlayer(dt); if (G.online) NET.tick(dt); updGps(dt); updPet(dt); if (!G.online && !G.inTown) repop(dt, [P]); if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) if (o.kind === 'lost' && !o.used && Math.hypot(o.x - P.x, o.z - P.z) < 2.4) interact(o); G.achT = (G.achT || 0) - dt; if (G.achT <= 0) { G.achT = 1; achCheck(); }
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
    if (dead) { if (p.sk.explode) { const r = p.sk.explode * (1 + P.stats.area / 100); areaHit(p.x, p.z, r, p.sk); ring(p.x, p.z, .4, r, .35, EL_COL[p.sk.el]); impact(p.x, p.z, r * .7, EL_COL[p.sk.el], true); SFX.play('slam'); } else if (!p.arrow) impact(p.x, p.z, .7, EL_COL[p.sk.el], false); burst(p.x, 1.2, p.z, EL_COL[p.sk.el], 5, 4); G.pp.splice(i, 1); }
  }
  // areas
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const a = G.areas[i]; a.t += dt;
    if (!a.done && a.t >= a.delay) { a.done = true; if (a.owner === 'p') { for (const e of G.ents) if (e.alive && Math.hypot(e.x - a.x, e.z - a.z) <= a.r + e.r) hitEnemy(e, a.sk, a.mult, a.proc); } else if (!a.vis && !P.dead && Math.hypot(P.x - a.x, P.z - a.z) <= a.r + .3 && P.y < 1.5) dmgPlayer(a.dmg, a.el, a.src); ring(a.x, a.z, a.r * .3, a.r, .3, a.c); burst(a.x, .5, a.z, a.c, 12, 7); if (a.owner === 'p' && !a.proc) impact(a.x, a.z, a.r * .8, a.c, a.r >= 2.5); if (a.owner === 'e') G.shake = Math.min(.5, G.shake + .08); }
    if (a.t >= a.delay + .05) G.areas.splice(i, 1);
  }
  // drops
  if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) if ((o.kind === 'chest' || o.kind === 'shrine') && !o.used && Math.hypot(o.x - P.x, o.z - P.z) < (o.kind === 'shrine' ? 2.2 : 1.9)) interact(o); // walk over chests and shrines to open or touch them
  if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) { if (o.kind !== 'portal' && o.kind !== 'pback') continue; const dd = Math.hypot(o.x - P.x, o.z - P.z), R = o.kind === 'portal' ? 1.9 : 1.4; if (dd > R + 1.5) o.arm = true; else if (dd < R && o.arm && !o.gone) { o.arm = false; if (typeof UI !== 'undefined' && UI.askGate) UI.askGate(o); else { o.gone = true; interact(o); } return; } } // step into a gate to travel
  for (const d of G.drops.slice()) { d.t += dt; if (d.item && d.t > .5 && G.set.autoLoot !== false && !P.dead && d.item.rar >= G.hero.filter && Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && G.time - (d.tryT || -9) > 2.5) { d.tryT = G.time; pickup(d); continue; } // walk over loot to collect it
    if (d.globe) { if (Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && P.hp < P.stats.maxLife) pickup(d); } else if ((d.gold || d.q) && d.t > .3) { const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < 4.5) { d.x += (P.x - d.x) / dd * 14 * dt; d.z += (P.z - d.z) / dd * 14 * dt; if (dd < .9) pickup(d); } } }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) { G.fx.splice(i, 1); continue; } if (!f.ring && !f.slash && !f.bolt && !f.flash && !f.pillar && !f.shock && !f.scorch) { if (f.smoke) { f.vx *= .96; f.vz *= .96; f.vy += 13 * dt; } f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 14 * dt; if (f.y < .05) { f.y = .05; f.vy *= -.3; if (f.chunk) { f.vx *= .8; f.vz *= .8; f.spin *= .7; } } } }
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
const BM = new Float32Array(16), BM2 = new Float32Array(16), IDM = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
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
  // attack animation (build 0018): wind-up, fast strike, follow-through, blended in and out so poses never snap
  const eo = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), smo = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const dtp = Math.min(.1, Math.max(0, G.time - (o._lt === undefined ? G.time : o._lt))); o._lt = G.time;
  o.actW = (o.actW || 0) + ((o.act ? 1 : 0) - (o.actW || 0)) * Math.min(1, dtp * (o.act ? 22 : 9));
  if (o.act) { const k = clamp(o.swing || 0, 0, 1), ty = o.act.sk && o.act.sk.type, A = o.lastA = { rx: -1.5, ry: 0, lrx: -1.2, lry: 0, lean: .1, tw: 0, lu: 0, dy: 0, drw: -1, trail: -1 };
    if (wt === 'bow') { const pull = eo(k / .42), rel = eo((k - .42) / .2), back = smo((k - .62) / .38); A.drw = k < .42 ? pull : 0; A.rx = -1.57; A.lrx = -1.57; A.lry = .36; A.ry = k < .42 ? -1 - pull * .45 : -1.45 - .35 * rel + .8 * back; A.lean = .03 - (k >= .42 ? .06 * (1 - back) : 0); A.tw = -.12 * (k < .42 ? pull : 1 - back); }
    else if (ty === 'nova') { const up = eo(k / .4), dn = eo((k - .4) / .15), rs = smo((k - .55) / .45); A.rx = A.lrx = k < .4 ? -.3 - 2.7 * up : -3 + 2.5 * dn + .9 * rs; A.ry = .25; A.lry = -.25; A.lean = k < .4 ? -.12 * up : .35 * dn * (1 - rs); A.dy = -.16 * dn * (1 - rs); }
    else if (wt === 'staff' || wt === 'wand') { const ch = eo(k / .42), rc = eo((k - .42) / .12), st = smo((k - .54) / .46); A.rx = k < .42 ? -1.1 - .3 * ch : -1.4 - .4 * rc * (1 - st) - .1 * st; A.lrx = k < .42 ? -.9 - .5 * ch : -1.4 + .3 * st; A.lean = k < .42 ? -.04 * ch : .14 * rc * (1 - st); A.tw = .18 * (k < .42 ? ch : 1 - st); A.lu = .12 * rc * (1 - st); }
    else if (wt === 'fist' || wt === 'none') { const j1 = Math.sin(Math.PI * clamp(k / .5, 0, 1)), j2 = Math.sin(Math.PI * clamp((k - .4) / .6, 0, 1)); A.rx = -1.15 - .55 * j1; A.lrx = -1.15 - .55 * j2; A.ry = -.15 * j1; A.lry = .15 * j2; A.tw = .3 * j1 - .3 * j2; A.lu = .14 * Math.max(j1, j2); A.lean = .12 + .1 * Math.max(j1, j2); }
    else { const wu = eo(k / .3), sk2 = eo((k - .3) / .18), fo = smo((k - .48) / .52); // wind-up, strike, follow-through
      if (k < .3) { A.ry = .2 + 1.4 * wu; A.rx = -1.5 - .7 * wu; A.tw = .32 * wu; A.lean = .02 - .1 * wu; A.lrx = -.6 - .3 * wu; }
      else if (k < .48) { A.ry = 1.6 - 3.0 * sk2; A.rx = -2.2 + .8 * sk2; A.tw = .32 - .64 * sk2; A.lu = .28 * sk2; A.lean = -.08 + .38 * sk2; A.lrx = -.9 + .6 * sk2; A.trail = sk2; }
      else { A.ry = -1.4 + .5 * fo; A.rx = -1.4 + .4 * fo; A.tw = -.32 * (1 - fo); A.lu = .28 * (1 - fo); A.lean = .3 * (1 - fo) + .06 * fo; A.lrx = -.3; A.trail = k < .62 ? 1 + (k - .48) / .14 : -1; } }
  }
  const AW = o.actW, AP = o.lastA, tw = AP ? AP.tw * AW : 0, lu = AP ? AP.lu * AW : 0;
  const breath = (1 - Math.min(1, mv)) * Math.sin(G.time * 2.3 + o.x) * .022; GLX.base(BM, o.x + Math.sin(rot) * lu, o.y + bob + breath + (AP ? AP.dy * AW : 0), o.z + Math.cos(rot) * lu, rot + tw, o.sc || 1.08);
  if (o.dead) { if (o.fallT0 === undefined) o.fallT0 = G.time; const fk = Math.min(1, (G.time - o.fallT0) * 2.6), fa = 1.45 * fk * fk; const c = Math.cos(fa), sn = Math.sin(fa); for (let i = 0; i < 3; i++) { const u = BM[4 + i], f = BM[8 + i]; BM[4 + i] = u * c - f * sn; BM[8 + i] = u * sn + f * c; } BM[13] += .12 * fk; } else o.fallT0 = undefined; const p = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => GLX.part('dyn', gm2, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, e === undefined ? em : e + em, 1, m || 0);
  { const st = Math.sin(w) > 0; if (mv > .5 && o.lstep !== undefined && st !== o.lstep && !o.dash && G.state === 'play') { const sd = st ? 1 : -1; for (let i = 0; i < 3; i++) G.fx.push({ dust: 1, x: o.x + Math.cos(rot) * .16 * sd + (Math.random() - .5) * .3, y: .12, z: o.z - Math.sin(rot) * .16 * sd + (Math.random() - .5) * .3, vx: (Math.random() - .5) * .8, vy: .5 + Math.random() * .5, vz: (Math.random() - .5) * .8, life: .55, max: .55, c: GLX.col(G.zone && G.zone.th && G.zone.th.dust || 0xa89878) }); } o.lstep = st; }
  const lg = Math.sin(w) * .8 * mv, air = o.dash ? -1 : 0, ranged = wt === 'bow' || wt === 'staff';
  // legs or robe
  if (L.robe) { p('taper', 0, .62, 0, 0, 0, 0, 0, 0, 0, .86, 1.2, .8, ac, am); p('cap', 0, .08, 0, 0, 0, 0, 0, 0, 0, .9, .1, .84, trim, 4, te); p('rbox', 0, .62, .37, .12, 0, 0, 0, 0, 0, .2, 1.0, .04, trim, 0, te); for (const sd of [1, -1]) p('sphere', .16 * sd, .08, .12 + sd * lg * .25, 0, 0, 0, 0, 0, 0, .2, .14, .38, bm ? bm[0] : skin, bm ? bm[1] : 0); }
  else for (const sd of [1, -1]) {
    const r = sd * lg + air * (sd > 0 ? 1 : .5), shc = bm ? bm[0] : pm[0], shm = bm ? bm[1] : pm[1]; p('taper', .16 * sd, .98, 0, r, 0, 0, 0, -.25, 0, .3, -.54, .32, pm[0], pm[1]); p('sphere', .16 * sd, .98, 0, r, 0, 0, 0, -.5, .03, .22, .22, .24, pm[0], pm[1]); p('taper', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.7, .0, .24, -.46, .27, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.6, -.06, .2, .26, .2, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.93, .1, .2, .13, .4, bm ? bm[0] : dkLeather, bm ? bm[1] : 0); p('sphere', .16 * sd, .98, 0, r, 0, 0, 0, -.5, .1, .14, .14, .08, shade(pm[0], .8), pm[1]); p('cap', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.74, .0, .27, .05, .29, shade(shc, .75), shm); p('rbox', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.97, .3, .16, .06, .1, shade(bm ? bm[0] : dkLeather, .7), bm ? bm[1] : 0);
    if (bm) p('cap', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.5, .02, .25, .07, .27, tr(g.boots)[0], 4, tr(g.boots)[1]);
    if (g.pants) { p('sphere', .17 * sd, .95, 0, r * 1.1, 0, 0, 0, -.46, .1, .2, .18, .2, pm[0], pm[1]); if (g.pants[0] === 0) p('rbox', .2 * sd, 1.0, .02, .06 + sd * lg * .4, 0, -sd * .12, 0, -.2, .14, .24, .36, .06, steelC, 4); else p('rbox', .16 * sd, .98, -.02, .16 + mv * .25, 0, 0, 0, -.3, -.2, .16, .5, .04, cloth); }
  }
  let lean = .06, rx = -lg * .7, ry = 0, lrx = lg * .6 - .2, lry = 0, drw = -1;
  if (AP && AW > .01) { const m = (a, b) => a + (b - a) * AW; rx = m(rx, AP.rx); ry = m(ry, AP.ry); lrx = m(lrx, AP.lrx); lry = m(lry, AP.lry); lean = m(lean, AP.lean); if (o.act) drw = AP.drw; }
  if (false) { const k = o.swing, e = k < .42 ? k / .42 : 1; lean = .28 * Math.sin(k * Math.PI); if (wt === 'bow') { drw = k < .42 ? k / .42 : 0; const pull = k < .42 ? drw : 1; rx = -1.57; ry = -1.0 - pull * .45; lrx = -1.57; lry = .36; lean = .03; } else if (ranged) { rx = -1.55; lrx = -1.5; lean = .05; } else if (o.act.sk.type === 'nova') rx = -3 + e * 2.6; else if (wt === 'fist' || wt === 'none') { rx = -1.5 + Math.sin(k * 6.28) * .5; lrx = -1.5 - Math.sin(k * 6.28) * .5; } else { rx = -1.5; ry = 1.3 - e * 2.6; } }
  if (spin) { rx = -1.5; ry = .3; lrx = -1.5; } if (o.dash) rx = -2.8;
  lean += Math.min(1, mv) * .12; if (o.hurt > 0) { lean -= Math.min(.3, o.hurt) * 1.3; rx -= o.hurt * 2; lrx -= o.hurt * 2; }
  if (o.dead) { rx = lrx = -2.6; }
  // torso, belt
  p('taper', 0, 1.36, 0, lean, 0, 0, 0, 0, 0, .76, -.72, .46, ac, am); p('sphere', 0, 1.53, -.01, lean, 0, 0, 0, 0, 0, .8, .46, .42, ac, am); p('sphere', 0, 1.24, .02, lean, 0, 0, 0, 0, 0, .52, .4, .38, shade(ac, .93), am); p('cap', 0, 1.76, 0, lean, 0, 0, 0, 0, 0, .3, .07, .28, g.chest ? trim : shade(ac, .8), g.chest ? 4 : 0, g.chest ? te * .5 : 0); p('sphere', 0, 1.06, 0, lean, 0, 0, 0, 0, 0, .6, .34, .42, g.pants && !L.robe ? pm[0] : ac, g.pants && !L.robe ? pm[1] : am); if (!L.robe) p('cap', 0, .98, 0, lean, 0, 0, 0, -.12, 0, .6, .32, .44, g.pants ? pm[0] : under, g.pants ? pm[1] : 0);
  if (plate) { p('sphere', 0, 1.5, .14, lean, 0, 0, 0, 0, 0, .5, .44, .3, ac, 4); p('cap', 0, 1.74, 0, lean, 0, 0, 0, 0, 0, .34, .1, .34, ac, 4); p('rbox', 0, 1.18, .24, lean, 0, 0, 0, 0, 0, .34, .2, .05, shade(ac, .6), 4); }
  else if (g.chest) { p('rbox', 0, 1.3, .22, lean, 0, 0, 0, 0, 0, .14, .5, .06, trim, 0, te); if (L.robe) p('taper', 0, 1.62, 0, lean, 0, 0, 0, 0, 0, .98, .26, .7, shade(ac, 1.2)); }
  if (g.chest) p('rbox', 0, 1.46, .26, lean, 0, 0, 0, 0, 0, .5, .05, .04, trim, 4, te);
  if (g.chest && g.chest[1] >= 2) { const cw = Math.sin((o.walk || 0) * .9) * .06 + (o.mv || (o.moving) ? .28 : .05); p('rbox', 0, 1.66, -.2, lean * .4 + cw, 0, 0, 0, -.5, -.03, .62, 1.0, .035, shade(trim, .55), 0, te * .3); p('rbox', 0, 1.66, -.2, lean * .4 + cw, 0, 0, 0, -.99, -.035, .64, .06, .04, trim, 4, te); } // rare and better chests come with a cape
  if (g.belt) { const bt = tr(g.belt); p('rbox', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .56, .16, .4, g.belt[0] === 0 ? dkLeather : cloth); p('rbox', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .18, .16, .06, bt[0], 4, bt[1]); } else { p('rbox', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .52, .08, .4, dkLeather); p('rbox', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .1, .09, .03, gold, 4); }
  if (!L.robe) for (const sd of [1, -1]) { p('rbox', .25 * sd, .96, .1, lean, 0, sd * .3, 0, 0, 0, .12, .14, .08, leatherC); p('rbox', .25 * sd, 1.02, .12, lean, 0, sd * .3, 0, 0, 0, .13, .04, .09, shade(leatherC, .8)); }
  if (cls === 'ranger' || cls === 'warden') p('rbox', 0, 1.36, .23, lean, 0, 0, cls === 'ranger' ? .62 : -.62, 0, 0, .09, .82, .03, cls === 'ranger' ? dkLeather : shade(dkLeather, .9)); // shoulder strap across the chest
  if (g.amulet) { const at = tr(g.amulet); p('gem', 0, 1.6, .3, lean, G.time, 0, 0, 0, 0, .1, .14, .08, at[0], 0, 1.2); }
  // head (drawn a little smaller than the body so the proportions read as human)
  const hp = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => p(gm2, px * .84, 1.82 + (py - 1.8) * .84, pz * .84, rx, ry, rz, ox * .84, oy * .84, oz * .84, sx * .84, sy * .84, sz * .84, c, m, e);
  p('cap', 0, 1.8, 0, lean, 0, 0, 0, 0, 0, .15, .16, .15, skin); hp('sphere', 0, 2.0, .02, lean, 0, 0, 0, 0, 0, .34, .42, .37, skin); hp('sphere', 0, 1.9, .05, lean, 0, 0, 0, 0, 0, .27, .22, .28, skin);
  const hb = g.helm ? g.helm[0] : -1, ht = tr(g.helm);
  if (hb === 0) { hp('sphere', 0, 2.04, -.07, lean, 0, 0, 0, 0, 0, .43, .42, .36, steelC, 4); hp('sphere', 0, 2.12, -.03, lean, 0, 0, 0, 0, 0, .45, .3, .46, steelC, 4); hp('rbox', 0, 2.13, .2, lean, 0, 0, 0, 0, 0, .3, .05, .05, ht[0], 4, ht[1]); hp('cone', 0, 2.34, -.08, lean - .5, 0, 0, 0, .1, 0, .1, .5, .16, cloth); for (const sd of [1, -1]) { hp('rbox', .17 * sd, 1.92, .12, lean, 0, 0, 0, 0, 0, .06, .22, .16, steelC, 4); if (g.helm[1] >= 1) hp('cone', .2 * sd, 2.22, -.04, lean, 0, -sd * .8, 0, .12, 0, .09, .2 + g.helm[1] * .08, .09, ht[0], 4, ht[1]); } }
  else if (hb === 1) { hp('sphere', 0, 2.05, -.05, lean, 0, 0, 0, 0, 0, .46, .44, .48, cloth); hp('cone', 0, 2.2, -.14, lean - .9, 0, 0, 0, .12, 0, .34, .4, .3, cloth); hp('rbox', 0, 2.14, .2, lean, 0, 0, 0, 0, 0, .3, .04, .04, ht[0], 4, ht[1]); }
  else { const hair = col(o.hair || (cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0x9c98ac : 0x4a3626)); hp('sphere', 0, 2.1, -.06, lean, 0, 0, 0, 0, 0, .4, .32, .42, hair); if (cls === 'brawler') hp('sphere', 0, 2.26, -.1, lean, 0, 0, 0, 0, 0, .16, .16, .16, hair); else hp('rbox', 0, 1.94, -.2, lean, 0, 0, 0, 0, 0, .34, .3, .1, hair);
    hp('sphere', 0, 2.06, -.14, lean, 0, 0, 0, 0, 0, .4, .36, .3, shade(hair, .9)); for (const sd of [1, -1]) hp('rbox', .18 * sd, 2.0, .04, lean, 0, 0, 0, 0, 0, .04, .16, .1, hair); // fuller hair and sideburns
    if (cls === 'ranger') { hp('sphere', 0, 2.0, -.24, lean, 0, 0, 0, 0, 0, .12, .12, .12, shade(hair, .8)); hp('rbox', 0, 1.82, -.27, lean + .15 + Math.sin(G.time * 3 + o.x) * .06 + Math.min(1, mv) * .3, 0, 0, 0, -.12, 0, .09, .3, .07, hair); }
    else if (cls === 'elementalist') for (let k = 0; k < 5; k++) hp('cone', (k - 2) * .07, 2.2, -.04 - Math.abs(k - 2) * .02, lean - .3, 0, (k - 2) * .35, 0, .08, 0, .09, .2, .09, k % 2 ? shade(hair, 1.25) : hair);
    else if (cls === 'arcanist') hp('rbox', 0, 1.86, -.2, lean + .06, 0, 0, 0, -.1, 0, .32, .44, .08, hair); if (hb === 2) { hp('cap', 0, 2.12, 0, lean, 0, 0, 0, 0, 0, .42, .06, .44, gold, 4); hp('gem', 0, 2.14, .22, lean, 0, 0, 0, 0, 0, .08, .1, .06, ht[0], 0, 1.4); } }
  // face: eyes that blink, brows, nose, mouth, ears, and a little character per class
  { const fz = .185, hairF = col(o.hair || (cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0x9c98ac : 0x4a3626)), blink = ((G.time + o.x * .37) % 4.3) < .12, eyeC = col(cls === 'arcanist' ? 0x9a5aff : cls === 'elementalist' ? 0xc8641e : cls === 'ranger' ? 0x3a7a3a : 0x3a5a8a);
    for (const sd of [1, -1]) {
      hp('sphere', .078 * sd, 2.03, fz, lean, 0, 0, 0, 0, 0, .085, blink ? .012 : .058, .03, col(0xf2eee2), 0, .25); if (!blink) hp('sphere', .078 * sd, 2.03, fz + .014, lean, 0, 0, 0, 0, 0, .042, .046, .02, eyeC, 0, cls === 'arcanist' ? 1.2 : .2), hp('sphere', .078 * sd, 2.03, fz + .022, lean, 0, 0, 0, 0, 0, .018, .02, .012, col(0x050505));
      hp('rbox', .08 * sd, 2.085, fz + .004, lean, 0, sd * (cls === 'warden' || cls === 'brawler' ? .28 : .1), 0, 0, 0, .1, .02, .025, hairF); hp('sphere', .19 * sd, 2.0, 0, lean, 0, 0, 0, 0, 0, .05, .09, .06, skin);
      hp('sphere', .115 * sd, 1.955, fz - .04, lean, 0, 0, 0, 0, 0, .07, .06, .04, shade(skin, 1.03, .97, .95));
    }
    hp('rbox', 0, 1.99, fz + .02, lean - .12, 0, 0, 0, 0, 0, .045, .09, .055, shade(skin, .9)); hp('rbox', 0, 1.9, fz, lean, 0, 0, 0, 0, 0, .1, .02, .02, col(cls === 'elementalist' ? 0xa83a3a : 0x6a322c)); hp('rbox', 0, 1.84, fz - .03, lean, 0, 0, 0, 0, 0, .12, .05, .05, skin);
    if (cls === 'warden' || o.beard) { hp('rbox', 0, 1.86, fz - .035, lean, 0, 0, 0, 0, 0, .24, .1, .05, shade(hairF, .8)); hp('rbox', 0, 1.93, fz + .005, lean, 0, 0, 0, 0, 0, .13, .025, .02, hairF); hp('rbox', .1, 1.97, fz + .006, lean, 0, .5, 0, 0, 0, .012, .1, .01, col(0x8a4a40)); }
    else if (cls === 'arcanist') { hp('cone', 0, 1.86, fz - .04, lean + 3.0, 0, 0, 0, .16, 0, .2, .36, .1, hairF); hp('rbox', 0, 1.925, fz + .005, lean, 0, 0, 0, 0, 0, .16, .03, .02, hairF); }
    else if (cls === 'brawler') { hp('rbox', 0, 1.925, fz + .005, lean, 0, 0, 0, 0, 0, .15, .028, .02, hairF); hp('cone', 0, 1.84, fz - .02, lean + 3.0, 0, 0, 0, .06, 0, .07, .14, .05, hairF); }
    else if (cls === 'ranger') { for (const sd of [1, -1]) hp('rbox', .1 * sd, 1.975, fz + .002, lean, 0, 0, 0, 0, 0, .09, .02, .012, col(0x2f6a34)); }
    else if (cls === 'elementalist') { for (const sd of [1, -1]) hp('rbox', .078 * sd, 2.06, fz + .006, lean, 0, 0, 0, 0, 0, .1, .012, .012, col(0x1a1210)); hp('sphere', 0, 2.1, fz - .02, lean, 0, 0, 0, 0, 0, .05, .05, .03, col(0xff7a2a), 0, 1.4); }
  }
  // shoulders
  if (sm) { const st = tr(g.shoulders), big = g.shoulders[0] === 0; for (const sd of [1, -1]) { p('sphere', .47 * sd, 1.7, 0, 0, 0, 0, 0, 0, 0, big ? .44 : .34, big ? .36 : .26, big ? .44 : .36, sm[0], sm[1]); p('cap', .47 * sd, 1.64, 0, 0, 0, 0, 0, 0, 0, big ? .48 : .38, .05, big ? .48 : .38, st[0], 4, st[1]); if (big && g.shoulders[1] >= 1) p('cone', .56 * sd, 1.84, 0, 0, 0, -sd * .9, 0, .12, 0, .16, .2 + g.shoulders[1] * .08, .16, sm[0], 4); } }
  else for (const sd of [1, -1]) p('sphere', .45 * sd, 1.66, 0, 0, 0, sd * .2, 0, 0, 0, .24, .2, .26, shade(ac, .95), am);
  // arms: sleeve, bracer, hand
  for (const sd of [1, -1]) {
    const arx = sd > 0 ? rx : lrx, ary = sd > 0 ? ry : lry, px = .47 * sd;
    const slv = shade(ac, g.chest ? .8 : .92); p('taper', px, 1.62, 0, arx, ary, 0, 0, -.18, 0, .21, -.38, .21, slv, am); p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .17, .17, .17, slv, am);
    p('taper', px, 1.62, 0, arx, ary, 0, 0, -.5, 0, brm ? .21 : .165, -.3, brm ? .21 : .165, brm ? brm[0] : skin, brm ? brm[1] : 0); if (brm) p('cap', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .22, .05, .22, tr(g.bracers)[0], 4, tr(g.bracers)[1]);
    const fist = wt === 'fist'; p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.68, 0, fist ? .25 : .15, fist ? .25 : .2, fist ? .25 : .13, fist ? dkLeather : gm ? gm[0] : skin, gm ? gm[1] : 0); if (!fist) p('sphere', px, 1.62, 0, arx, ary, 0, -sd * .07, -.66, .04, .06, .12, .06, gm ? gm[0] : skin, gm ? gm[1] : 0);
    if (fist) for (let k = 0; k < 3; k++) p('cone', px, 1.62, 0, arx + 1.5708, ary, 0, (k - 1) * .08, .1, .68, .06, .14, .06, wglow || steelC, 4, wglow ? .8 : 0);
  }
  // off-hand
  if (g.offhand) { const ot = tr(g.offhand);
    if (cls === 'warden') { GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .17, .2, .8, .06, .8, leatherC, em, 1, 0); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .2, .2, .86, .03, .86, steelC, em, 1, 4); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .21, .2, .62, .02, .62, cloth, em, 1, 0); GLX.part('dyn', 'sphere', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .24, .2, .26, .12, .26, ot[0], em + ot[1], 1, 4); }
    else if (cls === 'ranger') { p('rbox', .1, 1.5, -.3, lean + .3, 0, .4, 0, 0, 0, .2, .7, .16, leatherC); for (let k = 0; k < 3; k++) p('rbox', .22 + k * .05, 1.95, -.36, lean + .3, 0, .4, 0, 0, 0, .03, .3, .03, k === 1 ? ot[0] : wood); }
    else if (cls === 'elementalist') { p('rbox', -.34, 1.0, .1, lean, .3, 0, 0, 0, 0, .12, .34, .28, dkLeather); p('rbox', -.41, 1.0, .1, lean, .3, 0, 0, 0, 0, .02, .16, .12, ot[0], 4, ot[1]); }
    else if (cls === 'brawler') { for (let k = 0; k < 7; k++) { const a = -1.2 + k * .4; p('sphere', Math.sin(a) * .26, 1.72 - Math.cos(a) * .1, .2 + Math.cos(a) * .06, lean, 0, 0, 0, 0, 0, .09, .09, .09, ot[0], 0, ot[1]); } }
    else { const a = G.time * 1.3, oc2 = col(L.orb || TRIMC[g.offhand[1]]); GLX.obj('glow', 'sphere', o.x + Math.cos(a) * 1.1, o.y + 2.2 + Math.sin(a * 2) * .15, o.z + Math.sin(a) * 1.1, 0, .34, .34, .34, oc2, 1.4, 1); GLX.halo(o.x + Math.cos(a) * 1.1, o.y + 2.2, o.z + Math.sin(a) * 1.1, 1.4, oc2, .5); }
  }
  // weapon
  if (wt === 'sword') { /* build 0024: a broadsword that reads from the game camera */ p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .9, .21, .05, 1.5, blade, 4, .22); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .84, .06, .07, 1.22, shade(blade, .62), 4); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.72, .13, .05, .2, blade, 4, .22); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.86, .06, .045, .14, col(0xeef2f8), 4, .45); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .12, .58, .09, .11, gold, 4); p('sphere', .47, 1.62, 0, rx, ry, 0, .29, -.66, .12, .08, .08, .08, gold, 4); p('sphere', .47, 1.62, 0, rx, ry, 0, -.29, -.66, .12, .08, .08, .08, gold, 4); p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, -.04, .66, .07, .3, .07, dkLeather); if (wglow) p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .9, .23, .03, 1.52, wglow, 0, .55); }
  else if (wt === 'axe' || wt === 'maul') { p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, .5, .66, .08, 1.9, .08, wood, 3); if (wt === 'axe') { p('rbox', .47, 1.62, 0, rx, ry, 0, .2, -.66, 1.3, .44, .05, .44, blade, 4, .2); p('rbox', .47, 1.62, 0, rx, ry, 0, .44, -.66, 1.3, .06, .04, .6, wglow || col(0xeef2f8), 4, wglow ? .8 : .4); } else { p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .62, .36, .42, steelC, 4); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .66, .12, .46, wglow || gold, 4, wglow ? .8 : 0); } }
  else if (wt === 'staff') {
    const len = wb === 4 ? 1.0 : 2.1, tip = wb === 4 ? .86 : 1.4; p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, wb === 4 ? .36 : .25, .64, .07, len, .07, wood, 3); const oc = wglow || col(L.orb || 0x9ad0ff), act = o.act ? 1.6 : 1; p('gem', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, tip, .64, .26 * act, .32 * act, .26 * act, oc, 0, 2.2);
    const cr = Math.cos(rot), sr2 = Math.sin(rot), a1 = rx + 1.5708, oy = Math.cos(a1) * tip - Math.sin(a1) * .64, oz = Math.sin(a1) * tip + Math.cos(a1) * .64, wx = o.x + cr * .5 + sr2 * oz, wz = o.z - sr2 * .5 + cr * oz, wy = o.y + 1.75 + oy; GLX.halo(wx, wy, wz, 1.5 * act, oc, .6); if (self) GLX.light(wx, wy, wz, 6, oc, .7, 3);
  } else if (wt === 'bow') {
    const bc = wglow || wood, be = wglow ? .6 : 0, strC = col(0xe8e0d0);
    if (drw < 0) { p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -.2, .7, .05, .7, .06, bc, 3, be); p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -1.0, .64, .05, .7, .06, bc, 3, be); p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -.62, .5, .015, 1.5, .015, strC); }
    else {   // aiming: bow upright in the left hand, string drawn back to the cheek, arrow nocked until release
      const X = -.2, Y = 1.62, Z = .78, az = Z - .14 - drw * .55, tz = Z - .2;
      p('rbox', X, Y, Z, 0, 0, 0, 0, 0, 0, .07, .3, .08, col(0x4a3524)); for (const sd of [1, -1]) { p('rbox', X, Y + sd * .38, Z - .01, -sd * .08, 0, 0, 0, 0, 0, .05, .5, .06, bc, 3, be); p('rbox', X, Y + sd * .8, Z - .09, -sd * .38, 0, 0, 0, 0, 0, .045, .42, .05, bc, 3, be); const dz = tz - az, len = Math.hypot(.98, dz); p('rbox', X, Y + sd * .49, az + dz / 2, sd * Math.atan2(dz, .98), 0, 0, 0, 0, 0, .014, len, .014, strC); }
      if (drw > 0) { p('rbox', X, Y, az + .6, 0, 0, 0, 0, 0, 0, .025, .025, 1.2, col(0xb89a6a)); p('cone', X, Y, az + 1.24, 1.5708, 0, 0, 0, 0, 0, .07, .14, .07, col(0xc8ced8), 4); for (const a of [0, 1.5708]) p('rbox', X, Y, az + .06, 0, 0, a, 0, 0, 0, .1, .012, .16, col(0xd8d0c0)); }
    }
  }
  if (L.robe) for (let k = 0; k < 3; k++) { const a = G.time * 1.6 + k * 2.09; GLX.obj('glow', 'gem', o.x + Math.cos(a) * .95, o.y + 1.5 + Math.sin(a * 1.7) * .25, o.z + Math.sin(a) * .95, a, .12, .2, .12, col(L.orb), 1.5, .9); }
  if (cls === 'brawler') for (const sd of [1, -1]) p('rbox', .2 * sd, 1.0, -.2, lean + .3 + mv * .4 + sw2, 0, 0, 0, -.34, 0, .12, .6, .03, cloth);
  if (L.cape) { p('rbox', 0, 1.66, -.28, lean + .12 + mv * .3 + sw2, 0, 0, 0, -.36, 0, .78, .74, .05, cloth); p('rbox', 0, 1.66, -.28, lean + .22 + mv * .5 + sw2 * 2, 0, 0, 0, -1.0, -.06, .84, .62, .04, shade(cloth, .8)); p('rbox', 0, 1.7, -.26, lean, 0, 0, 0, 0, 0, .7, .08, .1, trim, 4, te); }

  // ---- class signature look (build 0016): silhouette, class colour, moving cloth, aura, rarity glow ----
  { const CC = col(CLASS_COL[cls] || 0xd8a040), t = G.time, sway = Math.sin(t * 2.6 + o.x) * .08 + Math.min(1, mv) * .35, cr = Math.cos(rot), sr = Math.sin(rot);
    const hand = (sd, arx) => { const lx = .47 * sd * 1.08, ly = (1.62 - .68 * Math.cos(arx)) * 1.08, lz = -.68 * Math.sin(arx) * 1.08; return [o.x + cr * lx + sr * lz, o.y + ly, o.z - sr * lx + cr * lz]; };
    const HERO = !!CLASS_COL[cls]; if (HERO) p('rbox', 0, 1.12, .25, lean, 0, 0, 0, -.18, 0, .2, .56, .04, shade(CC, .3)); // tabard in the class colour (plain material: the rock/bark one bends thin parts)
    if (HERO) p('rbox', 0, 1.12, .27, lean, 0, 0, 0, .06, 0, .08, .08, .03, shade(CC, .75), 4);
    if (cls === 'warden') {
      for (const sd of [1, -1]) { p('sphere', .5 * sd, 1.76, 0, 0, 0, -sd * .25, 0, 0, 0, .42, .24, .42, shade(steelC, .7), 4); p('cap', .5 * sd, 1.7, 0, 0, 0, -sd * .25, 0, 0, 0, .45, .04, .45, shade(CC, .7), 4); hp('cone', .2 * sd, 2.28, -.02, lean, 0, -sd * 1.1, 0, .14, 0, .07, .34, .07, col(0xe8dcc0), 3); }
      if (!g.offhand) { p('rbox', 0, 1.35, -.34, lean * .5, 0, 0, 0, 0, 0, .78, 1.0, .07, steelC, 4); p('rbox', 0, 1.35, -.38, lean * .5, 0, 0, 0, 0, 0, .58, .8, .03, CC, 0, .1); }
    } else if (cls === 'ranger') {
      if (!g.helm) { hp('sphere', 0, 2.08, -.08, lean, 0, 0, 0, 0, 0, .5, .48, .5, cloth); hp('cone', 0, 2.1, -.3, lean - 1.2 - sway * .4, 0, 0, 0, .12, 0, .2, .4, .16, cloth); }
      if (!g.offhand) { p('rbox', .1, 1.5, -.3, lean + .3, 0, .4, 0, 0, 0, .2, .7, .16, leatherC); for (let k = 0; k < 3; k++) p('rbox', .22 + k * .05, 1.95, -.36, lean + .3, 0, .4, 0, 0, 0, .03, .3, .03, k === 1 ? CC : wood); }
      p('rbox', 0, 1.62, -.26, lean + .1 + sway, 0, 0, 0, -.5, 0, .6, 1.0, .03, shade(CC, .55));
    } else if (cls === 'arcanist') {
      if (!g.helm) { hp('cap', 0, 2.17, 0, lean, 0, 0, 0, 0, 0, .58, .05, .58, cloth); hp('cone', 0, 2.2, -.02, lean - .15 - sway * .3, 0, 0, 0, .34, 0, .3, .7, .3, cloth); hp('cap', 0, 2.2, 0, lean, 0, 0, 0, 0, 0, .34, .05, .34, CC, 0, .6); }
      if (!g.offhand) { const a = t * 1.3, x = o.x + Math.cos(a) * .9, z = o.z + Math.sin(a) * .9, y = o.y + 2.1 + Math.sin(a * 2) * .15; GLX.obj('glow', 'sphere', x, y, z, 0, .18, .18, .18, CC, 1.2, .9); GLX.halo(x, y, z, .55, CC, .22); }
    } else if (cls === 'brawler') {
      for (const sd of [1, -1]) { const arx = sd > 0 ? rx : lrx, ary = sd > 0 ? ry : lry; for (let k = 0; k < 3; k++) p('cap', .47 * sd, 1.62, 0, arx, ary, 0, 0, -.42 - k * .07, 0, .2, .035, .2, col(0xe8e0d0)); }
      p('cap', 0, 1.02, 0, lean, 0, 0, 0, 0, 0, .66, .1, .5, CC, 0, .05); p('rbox', .22, .98, .18, lean + .1 + sway, 0, -.2, 0, -.3, 0, .12, .5, .03, CC);
      hp('sphere', 0, 2.34, -.12, lean, 0, 0, 0, 0, 0, .14, .2, .14, col(0x2a2018)); hp('cap', 0, 2.26, -.1, lean, 0, 0, 0, 0, 0, .12, .04, .12, CC);
    } else if (cls === 'elementalist') {
      for (let k = 0; k < 5; k++) { const a = t * .9 + k * 1.2566, x = o.x + Math.cos(a) * .42, z = o.z + Math.sin(a) * .42, y = o.y + 2.55 + Math.sin(t * 2 + k) * .06; GLX.obj('glow', 'gem', x, y, z, a, .08, .14, .08, k % 2 ? CC : col(0xffd06a), 1.6, .95); }
      for (const sd of [1, -1]) { const h = hand(sd, sd > 0 ? rx : lrx); GLX.obj('glow', 'sphere', h[0], h[1], h[2], 0, .12, .12, .12, CC, 1.6, .7); GLX.halo(h[0], h[1], h[2], .5, CC, .28); }
    }
    if (L.robe) for (const sd of [1, -1]) p('rbox', .22 * sd, .5, -.28, sway * .6 + Math.sin(t * 3.1 + sd) * .05, 0, 0, 0, -.35, 0, .26, .7, .03, shade(ac, .85), am); // robe tails
    // aura: motes rising around the feet
    if (HERO) for (let k = 0; k < 6; k++) { const ph = (t * .35 + k / 6 + o.x * .1) % 1, a = k * 1.047 + t * .4, r = .55 + ph * .2; GLX.obj('glow', 'gem', o.x + Math.cos(a) * r, o.y + .1 + ph * 2.2, o.z + Math.sin(a) * r, a, .05, .09, .05, CC, 1.4, (1 - ph) * .7); }
    if (HERO) GLX.obj('glow', 'ring', o.x, o.y + .05, o.z, t * .3, 1.5, 1, 1.5, CC, 1, .12 + Math.sin(t * 2) * .04, -1);
    // swing trail: a bright arc behind melee weapons during the strike
    if (o.act && AP && AP.trail >= 0 && (wt === 'sword' || wt === 'axe' || wt === 'maul')) { const sp = AP.trail, fade = sp > 1 ? Math.max(0, 2 - sp) : 1, tc = wglow || col(0xfff2d8), sx = .47 * 1.08, base = rot + tw;
      const ca = Math.cos(base), sa = Math.sin(base), px = o.x + ca * sx + Math.sin(rot) * lu, pz = o.z - sa * sx + Math.cos(rot) * lu, pt = (q, rr) => { const a = base + 1.6 - 3.0 * eo(q); return [px + Math.sin(a) * rr, o.y + 1.55 - (rr - 1) * .22, pz + Math.cos(a) * rr]; };
      for (let j = 0; j < 9; j++) { const q0 = Math.min(1, sp - j * .08), q1 = Math.min(1, sp - (j + 1) * .08); if (q1 < 0) break; const al = (1 - j / 9) * fade;
        for (const [rr, w, c2, em2, a2] of [[1.7, .09, col(0xffffff), 2.2, .9], [1.45, .22, tc, 1.6, .55], [1.15, .3, tc, 1.2, .25]]) { const A = pt(q0, rr), B = pt(q1, rr), dx = B[0] - A[0], dz = B[2] - A[2], L = Math.hypot(dx, dz) + .02; GLX.part('glow', 'box', IDM, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, 0, Math.atan2(dx, dz), 0, 0, 0, 0, .04, w, L, c2, em2, al * a2); } } }
    // weapons shine by rarity: rare and up glow, legendary and mythic trail sparks
    if (wr >= 2 && wt !== 'none' && wt !== 'bow') { const h = hand(1, rx), rc = col(TRIMC[wr]); GLX.halo(h[0], h[1] + .3, h[2], wr >= 4 ? 1.6 : 1.1, rc, wr >= 4 ? .5 : .3); if (wr >= 4) for (let k = 0; k < 3; k++) { const ph = (t * 1.2 + k / 3) % 1; GLX.obj('glow', 'gem', h[0] + Math.sin(k * 2 + t) * .3, h[1] + .2 + ph * 1.2, h[2] + Math.cos(k * 2 + t) * .3, t, .05, .09, .05, rc, 2, 1 - ph); } }
    // see your hero through walls: a soft class-coloured ghost drawn only where walls hide you
    if (self && GLX.cam.eye && typeof blocked === 'function') { const E = GLX.cam.eye, dx = E[0] - o.x, dz = E[2] - o.z, dl = Math.hypot(dx, dz) || 1; let hid = false; for (let d = 1; d <= 5 && !hid; d += .5) hid = blocked(o.x + dx / dl * d, o.z + dz / dl * d, .1);
      o.xrK = (o.xrK || 0) + ((hid ? 1 : 0) - (o.xrK || 0)) * .12; const k = o.xrK; if (k > .02) { GLX.obj('xr', 'sphere', o.x, o.y + 1.3, o.z, rot, .62, 1.05, .5, CC, 1, .5 * k); GLX.obj('xr', 'sphere', o.x, o.y + 2.08, o.z, rot, .3, .32, .3, CC, 1, .5 * k); GLX.obj('xr', 'sphere', o.x, o.y + .5, o.z, rot, .42, .7, .36, CC, 1, .45 * k); } }
  }
  if (self) GLX.light(o.x, 3, o.z, 15, col(G.zone.th.torch), 1.1 * (G.zone.th.torchI || 1), 10);
  if (spin) { for (let i = 0; i < 3; i++) { const a = G.time * 20 + i * 2.09; GLX.obj('glow', 'box', o.x + Math.sin(a) * 2.2, 1.2, o.z + Math.cos(a) * 2.2, a + 1.57, .16, .1, 3, col(0xfff0d0), 1, .7); } GLX.obj('glow', 'ring', o.x, .1, o.z, 0, o.spin.sk.r * 2, 1, o.spin.sk.r * 2, col(0xfff0d0), 1, .25, -1); }
  if (o.buffs && o.buffs.length) GLX.obj('glow', 'ring', o.x, .08, o.z, G.time, 2.4, 1, 2.4, col(0xffd84a), 1, .5, -1);
  if (o.flaskT > 0) GLX.halo(o.x, 1.4, o.z, 3.5, col(0xff3a3a), .5);
}
function drawEnemy(e) {
  const col = GLX.col, md = e.md, c = col(md.c), c2 = col(md.c2), ec = col(md.e); let sc = e.sc, y = 0;
  if (!e.alive) { const k = Math.max(0, e.deadT / .45); sc *= .3 + .7 * k; y = -(1 - k) * .8; }
  const fdt = Math.min(.1, G.time - (e.wkT === undefined ? G.time : e.wkT)); e.wkT = G.time; e.wk = (e.wk || 0) + ((e.st === 'wind' ? 1 : 0) - (e.wk || 0)) * Math.min(1, fdt * 9); /* wind-ups blend in and out instead of snapping */ const em = e.flash > 0 ? 1.4 : 0, w = e.walk, sw = Math.sin(w), at = Math.max(0, e.atk), wind = e.wk;
  GLX.base(BM, e.x, y, e.z, e.rot, sc); const p = (g, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, mat, ee) => GLX.part('dyn', g, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, ee === undefined ? em : ee, 1, mat || 0);
  const eyes = (ex, ey, ez, r) => { p('sphere', ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); p('sphere', -ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); };
  if (e.arch === 'grunt') {
    for (const sd of [1, -1]) { p('cap', .16 * sd, .82, 0, sd * sw * .7, 0, 0, 0, -.2, 0, .2, .42, .22, c2); p('cap', .16 * sd, .82, 0, sd * sw * .9, 0, 0, 0, -.6, .03, .16, .42, .17, c); }
    p('taper', 0, 1.18, .04, .35, 0, 0, 0, 0, 0, .56, -.72, .36, c, 3); p('sphere', 0, 1.0, 0, .3, 0, 0, 0, 0, 0, .5, .36, .36, c2); p('sphere', 0, 1.66, .2, .3, 0, 0, 0, 0, 0, .36, .4, .38, c, 3); p('rbox', 0, 1.52, .36, .5, 0, 0, 0, 0, 0, .2, .1, .12, c2);
    const arm = -1.3 - wind * 1.2 + at * 1.6; for (const sd of [1, -1]) { p('cap', .35 * sd, 1.42, .08, arm + sd * sw * .15, 0, 0, 0, -.2, 0, .14, .4, .14, c2); p('cap', .35 * sd, 1.42, .08, arm + sd * sw * .15 - .3, 0, 0, 0, -.55, 0, .11, .4, .11, c); }
    eyes(.09, 1.72, .36, .07);
    for (let k = 0; k < 3; k++) p('rbox', 0, 1.3 - k * .13, .2, .35, 0, 0, 0, 0, 0, .34, .035, .06, col(0xd8d0b8)); p('rbox', 0, 1.5, .44, .5, 0, 0, 0, 0, 0, .16, .06, .1, col(0x1a1210)); p('rbox', .2, 1.0, -.14, .5 + sw * .2, 0, .2, 0, -.26, 0, .16, .5, .03, c2); p('rbox', -.18, 1.0, .16, .1 - sw * .2, 0, 0, 0, -.24, 0, .2, .46, .03, c2); p('sphere', .3, 1.5, .02, 0, 0, 0, 0, 0, 0, .22, .18, .22, c2, 3); p('cone', -.12, 1.84, .1, -.3, 0, .4, 0, .08, 0, .06, .2, .06, col(0xd8d0b8));
  } else if (e.arch === 'swarm') {
    p('sphere', 0, .5, -.15, 0, 0, 0, 0, 0, 0, .8, .5, 1.2, c, 3); p('sphere', 0, .62, -.5, .3, 0, 0, 0, 0, 0, .6, .4, .7, c2, 3); p('sphere', 0, .56, .58 + at * .3, 0, 0, 0, 0, 0, 0, .46, .38, .5, c2);
    for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1, sz = (i >> 1) * .4 - .4; p('cap', .34 * sd, .5, sz, (i % 2 ? sw : -sw) * .8, 0, -sd * .9, 0, -.3, 0, .07, .6, .07, c2); }
    p('cone', .12, .5, .84, 1.4, 0, 0, 0, .1, 0, .06, .26, .06, c); p('cone', -.12, .5, .84, 1.4, 0, 0, 0, .1, 0, .06, .26, .06, c); eyes(.12, .68, .76, .08);
    for (let k = 0; k < 4; k++) p('cone', 0, .72 - k * .03, .1 - k * .28, -.5, 0, 0, 0, .1, 0, .1, .3 - k * .03, .1, c2, 3); p('cone', 0, .5, -.74, -1.9, 0, 0, 0, .2, 0, .12, .5, .12, c, 3);
  } else if (e.arch === 'caster') {
    const fl = .25 + Math.sin(G.time * 2.5 + e.id) * .12; p('taper', 0, .85 + fl, 0, 0, 0, 0, 0, 0, 0, 1.05, 1.5, 1.05, c); p('taper', 0, 1.5 + fl, 0, 0, 0, 0, 0, 0, 0, .7, .5, .6, c2); p('sphere', 0, 1.9 + fl, .02, 0, 0, 0, 0, 0, 0, .38, .42, .4, col(0x1a1a1a));
    p('cone', 0, 2.1 + fl, -.06, -.35, 0, 0, 0, .12, 0, .56, .7, .56, c);
    for (const sd of [1, -1]) p('cap', .38 * sd, 1.55 + fl, 0, -1.4 - wind * .8, 0, 0, 0, -.3, 0, .13, .6, .13, c);
    eyes(.08, 1.92 + fl, .2, .06); p('rbox', 0, 1.78 + fl, .2, 0, 0, 0, 0, 0, 0, .14, .06, .05, col(0xd8d0b8)); p('cap', 0, 1.22 + fl, 0, 0, 0, 0, 0, 0, 0, .78, .08, .78, c2, 4); p('rbox', 0, .9 + fl, .44, .1, 0, 0, 0, 0, 0, .16, 1.0, .04, c2); for (let k = 0; k < 5; k++) { const a = k * 1.256; p('cone', Math.cos(a) * .44, .2 + fl, Math.sin(a) * .44, 3.14, 0, 0, 0, 0, 0, .2, .4, .2, c); } for (const sd of [1, -1]) p('sphere', .38 * sd, 1.58 + fl, 0, 0, 0, 0, 0, 0, 0, .3, .24, .3, c2);
    const ox = e.x + Math.sin(e.rot) * .8 * sc, oz = e.z + Math.cos(e.rot) * .8 * sc, s = .3 + wind * .35; GLX.obj('glow', 'sphere', ox, (1.5 + fl) * sc, oz, 0, s * .8, s * .8, s * .8, ec, .9 + wind * .6, 1); GLX.halo(ox, (1.5 + fl) * sc, oz, 1.1 + wind * 1.4, ec, .3);
  } else if (e.arch === 'brute') {
    for (const sd of [1, -1]) p('cap', .3 * sd, .72, 0, sd * sw * .5, 0, 0, 0, -.36, 0, .38, .72, .4, c2, 3);
    p('sphere', 0, 1.25, 0, .2, 0, 0, 0, 0, 0, 1.15, 1.05, .85, c, 3); p('sphere', 0, 1.62, -.22, 0, 0, 0, 0, 0, 0, 1.1, .7, .8, c2, 2); p('sphere', 0, 1.8, .3, 0, 0, 0, 0, 0, 0, .44, .4, .44, c, 3);
    const arm = -.2 - wind * 2.6 + at * 2.4; for (const sd of [1, -1]) { p('cap', .7 * sd, 1.55, 0, arm + sd * sw * .2, 0, -sd * .15, 0, -.4, 0, .36, .8, .38, c, 3); p('sphere', .7 * sd, 1.55, 0, arm + sd * sw * .2, 0, -sd * .15, 0, -.95, 0, .5, .5, .5, c2, 3); }
    eyes(.11, 1.84, .5, .08); for (const sd of [1, -1]) { p('cone', .16 * sd, 1.7, .5, 1.2, 0, 0, 0, .08, 0, .08, .24, .08, col(0xe8e0c8)); p('cone', .5 * sd, 1.9, -.2, -.4, 0, -sd * .5, 0, .2, 0, .2, .5, .2, c2, 3); p('sphere', .3 * sd, .72, 0, sd * sw * .5, 0, 0, 0, -.5, .14, .34, .22, .34, c, 3); } for (let k = 0; k < 3; k++) p('cone', 0, 1.9 - k * .2, -.5 - k * .04, -.9, 0, 0, 0, .14, 0, .16, .4, .16, c2, 3); p('sphere', 0, 1.02, .34, 0, 0, 0, 0, 0, 0, .8, .6, .4, col(0x8a8468), 3);
  } else if (e.arch === 'bomber') {
    const pu = 1 + wind * .35 * Math.sin(G.time * 40); p('sphere', 0, .8, 0, 0, 0, 0, 0, 0, 0, pu, pu, pu, c, 3, em + .3 + wind * 2); for (const sd of [1, -1]) p('cap', .2 * sd, .35, 0, sd * sw, 0, 0, 0, -.18, 0, .14, .4, .14, c2);
    p('sphere', 0, .9, .44, 0, 0, 0, 0, 0, 0, .3, .2, .1, ec, 0, 3);
  } else if (e.bd && e.bd.shape && e.bd.shape !== 'tree') { // each guardian has its own body
    const S = e.bd.shape, bone = col(0xe8e0c8), dark = col(0x14100c), t = G.time, arm = -.4 - wind * 2 + at * 2.2;
    if (S === 'beast') { // a great four-legged brute: tusks, spines, a low charge
      const bh = 1.15, lunge = at * .5 - wind * .25;
      p('sphere', 0, bh + .1, -.1, 0, 0, 0, 0, 0, 0, 1.5, 1.25, 2.5, c, 3); p('sphere', 0, bh + .35, .55, 0, 0, 0, 0, 0, 0, 1.6, 1.4, 1.5, c, 3); p('sphere', 0, bh - .2, 0, 0, 0, 0, 0, 0, 0, 1.2, .8, 2, c2, 3);
      for (const [lx, lz, ph] of [[.55, .75, 0], [-.55, .75, 3.14], [.55, -.8, 3.14], [-.55, -.8, 0]]) { const s = Math.sin(w + ph) * .55; p('cap', lx, bh - .1, lz, s, 0, 0, 0, -.45, 0, .42, 1.1, .46, c2, 3); p('sphere', lx, bh - .1, lz, s, 0, 0, 0, -1, .08, .46, .26, .56, dark, 3); }
      p('sphere', 0, bh + .4 - wind * .3, 1.45 + lunge, -.15 + wind * .35, 0, 0, 0, 0, 0, 1, .85, 1.1, c, 3); p('rbox', 0, bh + .15 - wind * .3, 2.0 + lunge, -.1, 0, 0, 0, 0, 0, .7, .5, .6, c2, 3);
      for (const sd of [1, -1]) { p('cone', .32 * sd, bh + .05 - wind * .3, 2.15 + lunge, -1.1, 0, sd * .5, 0, .35, 0, .14, .8, .14, bone, 3); p('cone', .38 * sd, bh + .8 - wind * .3, 1.3 + lunge, -.5, 0, sd * 1, 0, .4, 0, .16, .9, .16, bone, 3); }
      for (let k = 0; k < 7; k++) p('cone', 0, bh + 1.05 - Math.abs(k - 2) * .07, 1 - k * .35, -.3 - k * .05, 0, 0, 0, .3, 0, .22, .7 + (k < 3 ? .3 : 0), .22, c2, 3);
      p('cap', 0, bh + .3, -1.35, .9 + sw * .3, 0, 0, 0, -.4, 0, .2, .9, .2, c2, 3); eyes(.3, bh + .6 - wind * .3, 2.0 + lunge, .1);
    } else if (S === 'knight') { // a towering armoured champion with a two-handed blade
      for (const sd of [1, -1]) { p('cap', .4 * sd, 1, 0, sd * sw * .5, 0, 0, 0, -.25, 0, .44, 1.1, .46, c2, 4); p('rbox', .4 * sd, 1, 0, sd * sw * .5, 0, 0, 0, -.88, .1, .52, .3, .7, c2, 4); }
      p('rbox', 0, 1.2, 0, 0, 0, 0, 0, 0, 0, 1.1, .5, .8, c, 4); p('rbox', 0, 1.95, 0, .05, 0, 0, 0, 0, 0, 1.5, 1.2, .95, c2, 4); p('rbox', 0, 2.05, .3, .05, 0, 0, 0, 0, 0, 1.1, .9, .4, c, 4); p('sphere', 0, 2.1, .52, 0, 0, 0, 0, 0, 0, .3, .3, .1, ec, 0, 1.5);
      for (const sd of [1, -1]) { p('sphere', .85 * sd, 2.5, 0, 0, 0, sd * .3, 0, 0, 0, .8, .55, .8, c2, 4); p('cone', .95 * sd, 2.85, 0, 0, 0, -sd * .4, 0, .2, 0, .2, .6, .2, c, 4); p('cap', .95 * sd, 2.4, 0, arm, 0, -sd * .15, 0, -.55, 0, .36, 1.15, .36, c2, 4); p('sphere', .95 * sd, 2.4, 0, arm, 0, -sd * .15, 0, -1.15, 0, .4, .4, .4, c, 4); }
      p('rbox', 0, 2.95, .05, 0, 0, 0, 0, 0, 0, .7, .8, .75, c2, 4); p('rbox', 0, 2.95, .43, 0, 0, 0, 0, 0, 0, .5, .1, .06, dark, 0); eyes(.12, 2.97, .44, .07); for (const sd of [1, -1]) p('cone', .38 * sd, 3.3, 0, 0, 0, -sd * .9, 0, .35, 0, .16, .8, .16, bone, 3); p('cone', 0, 3.5, -.05, -.2, 0, 0, 0, .3, 0, .12, .7, .5, ec, 0, 1);
      p('rbox', 0, 2.4, 0, arm, 0, 0, 0, -1.25, .55, .22, .22, .9, col(0x3a2a1a), 0); p('rbox', 0, 2.4, 0, arm, 0, 0, 0, -1.25, .95, .9, .1, .16, col(0xb08a3a), 4); p('rbox', 0, 2.4, 0, arm, 0, 0, 0, -1.25, 2.4, .12, .32, 2.8, col(0xc8ced8), 4, at > .2 ? 1 : 0); p('rbox', 0, 2.4, 0, arm, 0, 0, 0, -1.25, 2.4, .04, .34, 2.6, ec, 0, .8);
      for (let k = 0; k < 5; k++) p('rbox', (k - 2) * .28, 1.6 - Math.abs(k - 2) * .06, -.5, .2 + Math.sin(t * 2 + k) * .08, 0, 0, 0, -.9, 0, .3, 1.8, .06, shade(c, .6), 0);
    } else if (S === 'wraith') { // a floating shroud that sways; arms reach out to strike
      const bob = Math.sin(t * 1.8) * .18;
      p('cone', 0, 1.5 + bob, 0, 0, 0, 0, 0, 0, 0, 1.9, 2.8, 1.7, c2, 3); p('cone', 0, 1.2 + bob, 0, 0, .4, 0, 0, 0, 0, 2.3, 2, 2, shade(c2, .75), 3);
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28, s = Math.sin(t * 3 + k) * .25; p('rbox', Math.cos(a) * .95, .25 + bob, Math.sin(a) * .95, s, -a, 0, 0, -.2, 0, .45, .7, .06, shade(c2, .7), 0); }
      p('sphere', 0, 2.55 + bob, 0, 0, 0, 0, 0, 0, 0, 1.3, .8, 1, c2, 3); p('sphere', 0, 3.15 + bob, .05, -.15, 0, 0, 0, 0, 0, 1, 1.15, 1, c, 3); p('sphere', 0, 3.1 + bob, .3, 0, 0, 0, 0, 0, 0, .66, .8, .5, dark, 0, 0); eyes(.16, 3.18 + bob, .58, .1); p('sphere', 0, 2.9 + bob, .55, 0, 0, 0, 0, 0, 0, .12, .06, .04, ec, 0, 2);
      for (const sd of [1, -1]) { const ar = arm * .8 - .4; p('cap', .7 * sd, 2.55 + bob, .1, ar, 0, -sd * .35, 0, -.65, 0, .3, 1.35, .3, c2, 3); for (let f = -1; f <= 1; f++) p('cone', .7 * sd, 2.55 + bob, .1, ar, f * .25, -sd * .35, 0, -1.55, 0, .07, .55, .07, bone, 3); }
      if (e.alive) for (let k = 0; k < 4; k++) { const a = t * 1.3 + k * 1.57; GLX.obj('glow', 'sphere', e.x + Math.cos(a) * 2.4 * sc / 2.2, (2.2 + Math.sin(t * 2 + k) * .4) * sc / 2.2, e.z + Math.sin(a) * 2.4 * sc / 2.2, 0, .3, .3, .3, ec, 2.2, .9); }
    } else if (S === 'golem') { // a heap of molten rock with glowing seams and huge fists
      p('blob', 0, 1.9, 0, .1, 0, 0, 0, 0, 0, 2.4, 2, 1.9, c, 3); p('blob', 0, 1.15, 0, 0, .7, 0, 0, 0, 0, 1.8, 1.2, 1.5, c2, 3); p('blob', 0, 3, .3, .2, 0, 0, 0, 0, 0, 1, .8, .9, c, 3); eyes(.2, 3.05, .74, .14); p('rbox', 0, 2.78, .72, .3, 0, 0, 0, 0, 0, .55, .12, .1, ec, 0, 2.2);
      for (let k = 0; k < 9; k++) { const a = k * .7 + .3, y = 1.2 + (k % 4) * .45; p('rbox', Math.cos(a) * 1.02, y, Math.sin(a) * .85, 0, -a, (k % 3 - 1) * .5, 0, 0, 0, .05, .5 + (k % 2) * .3, .04, ec, 0, 2.2); }
      for (const sd of [1, -1]) { p('blob', .55 * sd, .7, 0, sd * sw * .4, 0, 0, 0, -.2, 0, .8, 1.1, .85, c2, 3); p('blob', 1.35 * sd, 2.4, 0, arm, 0, -sd * .2, 0, -.2, 0, 1, .9, 1, c, 3); p('blob', 1.45 * sd, 2.4, 0, arm, 0, -sd * .2, 0, -1.15, .1, .85, 1.1, .85, c2, 3); p('blob', 1.5 * sd, 2.4, 0, arm, 0, -sd * .2, 0, -2.05, .2, 1.15, 1, 1.1, c, 3); p('rbox', 1.5 * sd, 2.4, 0, arm, 0, -sd * .2, 0, -2.05, .78, .6, .08, .05, ec, 0, 2.2); }
      for (let k = 0; k < 4; k++) p('gem', (k - 1.5) * .45, 3.35 + (k % 2) * .2, -.2, 0, k, 0, 0, 0, 0, .3, .6, .3, c2, 3);
      if (e.alive) GLX.light(e.x, 2, e.z, 9, ec, 1, 4);
    } else { // orb: a floating eye wrapped in turning rings, with lashing tendrils beneath
      const bob = Math.sin(t * 1.5) * .25, cy = 2.6 + bob, look = wind ? .25 : 0;
      p('sphere', 0, cy, 0, 0, 0, 0, 0, 0, 0, 2.6, 2.6, 2.6, c, 3); p('sphere', 0, cy, .35, look, 0, 0, 0, 0, 0, 2.2, 2.2, 2.1, bone, 0); p('sphere', 0, cy, 1.08, look, 0, 0, 0, 0, 0, 1.1, 1.1, .3, ec, 0, .9 + at * .6); p('sphere', 0, cy, 1.2, look, 0, 0, 0, 0, 0, .5, .7, .14, dark, 0, 0);
      for (const sd of [1, -1]) p('sphere', 0, cy + sd * .95 * (1 - wind * .4), .55, sd * .6, 0, 0, 0, 0, 0, 2.5, 1.2, 1.8, c2, 3);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, s = Math.sin(t * 2.5 + k) * .45; p('cap', Math.cos(a) * .7, cy - 1, Math.sin(a) * .7, Math.sin(a) * .4 + s, 0, -Math.cos(a) * .4, 0, -.8, 0, .22, 1.7, .22, c2, 3); p('cone', Math.cos(a) * .7, cy - 1, Math.sin(a) * .7, Math.sin(a) * .4 + s, 0, -Math.cos(a) * .4, 0, -1.9, 0, .2, .6, .2, ec, 0, 1); }
      if (e.alive) { for (let k = 0; k < 3; k++) GLX.obj('glow', 'ring', e.x, cy * sc / 2.2, e.z, t * (k + 1) * .7, (3.4 + k * .9) * sc / 2.2, 1, (3.4 + k * .9) * sc / 2.2, k === 1 ? c2 : ec, 1, .3, -1); GLX.halo(e.x, cy * sc / 2.2, e.z, 4 * sc / 2.2, ec, .18); }
    }
    if (e.alive) { GLX.light(e.x, 3, e.z, 12, ec, .8, 5); GLX.obj('glow', 'ring', e.x, .07, e.z, G.time * .5, 6, 1, 6, ec, 1, .35, -1); }
  } else { // boss
    p('taper', 0, 1, 0, 0, 0, 0, 0, 0, 0, 1.6, 2, 1.6, c2, 3); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; p('cone', Math.cos(a) * .6, .3, Math.sin(a) * .6, Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2, 0, .5, 0, .4, 1.3, .4, c2, 3); }
    p('sphere', 0, 1.9, 0, 0, 0, 0, 0, 0, 0, 1.5, 1.2, 1.3, c2, 3); p('sphere', 0, 2.1, -.2, 0, 0, 0, 0, 0, 0, 1.7, 1, 1.4, c, 2); p('sphere', 0, 2.55, .25, 0, 0, 0, 0, 0, 0, .7, .66, .7, c2, 3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; p('cone', Math.cos(a) * .3, 2.85, Math.sin(a) * .3, Math.sin(a) * .7, 0, -Math.cos(a) * .7, 0, .3, 0, .16, .9, .16, c2, 3); }
    const arm = -.5 - wind * 2.3 + at * 2.2; for (const sd of [1, -1]) { p('taper', .95 * sd, 2.1, 0, arm + sd * sw * .2, 0, -sd * .25, 0, -.7, 0, .42, -1.6, .42, c2, 3); p('sphere', .95 * sd, 2.1, 0, arm + sd * sw * .2, 0, -sd * .25, 0, -1.55, 0, .7, .6, .7, c, 2); }
    eyes(.17, 2.62, .55, .13); for (let k = 0; k < 6; k++) { const a = k * 1.05 + .4; p('rbox', Math.cos(a) * .72, 1.0 + (k % 3) * .4, Math.sin(a) * .72, 0, -a, 0, 0, 0, 0, .1, .5, .34, c, 3); p('rbox', Math.cos(a + .5) * .66, .7 + (k % 2) * .7, Math.sin(a + .5) * .66, 0, -a, 0, 0, 0, 0, .05, .5, .05, ec, 0, 1.6); } p('rbox', 0, 2.4, .56, .2, 0, 0, 0, 0, 0, .34, .08, .1, col(0x120c08)); for (const sd of [1, -1]) p('sphere', .5 * sd, 2.5, -.3, 0, 0, 0, 0, 0, 0, .7, .5, .6, c, 2);
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
  GLX.env.player = [P.x, 0, P.z]; GLX.env.t = G.time; const zf = innerWidth < innerHeight ? 1.42 : 1; /* portrait phones see a little more around the hero */ GLX.setCamera([P.x + sx, 25 * G.zoom * zf + sz, P.z + 18 * G.zoom * zf], [P.x + sx, 1, P.z + sz], .66);
  if (ALLY.on) drawHero(ALLY, false); drawPet(); if (G.inTown) drawTownLife(); else drawQuestBits();
  if (!G.inTown && G.zone.torches) { const tc = GLX.col(0xffa040), tw = GLX.col(0xffe0a0); for (const t of G.zone.torches) { if (Math.abs(t[0] - P.x) > 26 || Math.abs(t[2] - P.z) > 26) continue; const fl = .85 + Math.sin(G.time * 11 + t[0]) * .08 + Math.sin(G.time * 17.3 + t[2]) * .07; GLX.obj('glow', 'cone', t[0], t[1] + .12 * fl, t[2], 0, .2 * fl, .42 * fl, .2 * fl, tc, 1.6, 1); GLX.obj('glow', 'cone', t[0], t[1] + .08, t[2], 0, .1, .26 * fl, .1, tw, 2.2, 1); GLX.halo(t[0], t[1] + .1, t[2], 1.6 * fl, tc, .5); GLX.halo(t[0], .06, t[2] + .9, 3.4 * fl, tc, .14); } }
  { const gl = G.hero.goals, nx = gl && !gl.all ? GOALS.find(g => !gl[g[0]]) : null; let tx = null; // tutorial pointer in the world: a bouncing arrow over what to go for
    if (nx && !G.inTown && !P.dead) { if (nx[0] === 'kill') { let bd = 26; for (const e of G.ents) { if (!e.alive || e.boss) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tx = [e.x, e.z, 2.6 * e.sc + .8]; } } }
      else if (nx[0] === 'equip' && !G.hero.inv.some(Boolean)) { let bd = 30; for (const d of G.drops) { if (!d.item) continue; const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < bd) { bd = dd; tx = [d.x, d.z, 1.8]; } } } }
    if (tx) { const c = GLX.col(0xffd84a), b = Math.abs(Math.sin(G.time * 4)) * .5; GLX.part('glow', 'cone', IDM, tx[0], tx[2] + .5 + b, tx[1], 3.14159, G.time * 2, 0, 0, 0, 0, .5, .8, .5, c, 2, .95); GLX.obj('glow', 'ring', tx[0], .07, tx[1], G.time * 2, 2.6 + b, 1, 2.6 + b, c, 1.4, .7, -1); GLX.halo(tx[0], tx[2] + .5 + b, tx[1], 1.4, c, .5); } }
  if (!P.dead && !G.inTown) { const hc = h => GLX.col(EL_COL[h] || 0xfff0c0), t = G.time;
    if (P.act && P.act.sk && P.act.sk.type !== 'melee' && P.act.sk.type !== 'spin') { const kk = clamp(P.act.t / (P.act.d || .3), 0, 1), c = hc(P.act.sk.el), hx = P.x + Math.sin(P.rot) * .6 + Math.cos(P.rot) * .35, hz = P.z + Math.cos(P.rot) * .6 - Math.sin(P.rot) * .35, rr = .22 + kk * .25;
      GLX.obj('glow', 'sphere', hx, 1.45, hz, 0, rr, rr, rr, c, 2.4, .95); GLX.halo(hx, 1.45, hz, 1.4 + kk, c, .7); GLX.obj('glow', 'ring', P.x, .1, P.z, t * 2.4, 2.4 + kk * .8, 1, 2.4 + kk * .8, c, 1.2, .55 * (1 - kk * .5), -1); GLX.obj('glow', 'ring', P.x, .12, P.z, -t * 3.1, 1.6, 1, 1.6, c, 1.2, .4, -1); for (let q = 0; q < 6; q++) { const an = t * 3 + q * 1.047; GLX.obj('glow', 'box', P.x + Math.cos(an) * 1.2, .12, P.z + Math.sin(an) * 1.2, -an, .3, .02, .08, c, 1.6, .7); } GLX.light(hx, 1.6, hz, 6, c, 1, 4); }
    if (P.buffs && P.buffs.length) { const c = GLX.col(0xffd84a); for (let q = 0; q < 2; q++) GLX.obj('glow', 'ring', P.x, .3 + q * 1.1 + Math.sin(t * 2 + q) * .2, P.z, t * (q ? -1.5 : 1.5), 1.7 - q * .3, 1, 1.7 - q * .3, c, 1.2, .45, -1); for (let q = 0; q < 6; q++) { const an = t * 1.4 + q * 1.047, y = (t * 1.2 + q * .4) % 2.4; GLX.obj('glow', 'sphere', P.x + Math.cos(an) * .8, .2 + y, P.z + Math.sin(an) * .8, 0, .07, .07, .07, c, 2.4, 1 - y / 2.4); } }
    if (P.dash) { const c = hc(P.dash.sk && P.dash.sk.el), dx = P.x - P.dash.x0, dz = P.z - P.dash.z0; for (let q = 1; q <= 5; q++) { const u = q / 6; GLX.obj('glow', 'cap', P.x - dx * u * .8, 1.1, P.z - dz * u * .8, P.rot, .55 * (1 - u * .5), 1.6 * (1 - u * .4), .4, c, 1.2, .35 * (1 - u)); } }
  }
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
    else if (o.kind === 'portal' || o.kind === 'pback') { // a turning rainbow kaleidoscope: step in to travel
      const t = G.time, R = 2.4, hue = (hh, l) => { const h6 = ((hh % 1) + 1) % 1 * 6, x = 1 - Math.abs(h6 % 2 - 1), q = h6 < 1 ? [1, x, 0] : h6 < 2 ? [x, 1, 0] : h6 < 3 ? [0, 1, x] : h6 < 4 ? [0, x, 1] : h6 < 5 ? [x, 0, 1] : [1, 0, x]; return [q[0] * l, q[1] * l, q[2] * l]; };
      GLX.obj('dyn', 'cyl', o.x, .08, o.z, 0, R * 2.5, .16, R * 2.5, col(0x2a2830), 0, 1, 4); GLX.obj('glow', 'disc', o.x, .18, o.z, t * .5, R * 2.2, 1, R * 2.2, hue(t * .15, 1), .6, .22, 1);
      for (let ring = 0; ring < 3; ring++) { const n = 12, rr = R * (.45 + ring * .38), sp = (ring % 2 ? -1 : 1) * (.8 + ring * .4); for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + t * sp, c = hue(k / n + t * .2 + ring * .15, 1); GLX.obj('glow', 'box', o.x + Math.cos(a) * rr, .22 + ring * .02, o.z + Math.sin(a) * rr, -a, .9 - ring * .15, .03, .22, c, 1.4, .8); GLX.obj('glow', 'gem', o.x + Math.cos(a) * rr, 1.2 + ring * 1.1 + Math.sin(t * 3 + k) * .25, o.z + Math.sin(a) * rr, a, .18, .36, .18, c, 2.4, .85); } }
      for (let k = 0; k < 6; k++) { const yy = .4 + k * .9, s = R * (2 - k * .22) * (1 + Math.sin(t * 2.5 + k) * .06); GLX.obj('glow', 'ring', o.x, yy, o.z, t * (k % 2 ? -1.3 : 1.1), s, 1, s, hue(t * .25 + k / 6, 1), .9, .5, -1); }
      GLX.obj('glow', 'cyl', o.x, 7, o.z, t, R * .45, 14, R * .45, hue(t * .3, 1), 1, .14); GLX.obj('glow', 'cyl', o.x, 7, o.z, -t * 1.4, R * .95, 14, R * .95, hue(t * .3 + .5, 1), .8, .08);
      for (let k = 0; k < 14; k++) { const a = t * 1.8 + k * .449, y = (t * 2 + k * .6) % 7, r2 = R * (1.1 - y * .1); GLX.obj('glow', 'sphere', o.x + Math.cos(a) * r2, y, o.z + Math.sin(a) * r2, 0, .1, .1, .1, hue(k / 14 + t * .3, 1), 2.6, 1 - y / 7); }
      GLX.halo(o.x, 2.5, o.z, R * 3.2, hue(t * .2, 1), .2); GLX.light(o.x, 2.5, o.z, 18, hue(t * .2, 1), 1, 5);
    }
  }
  for (const d of G.drops) {
    if (Math.hypot(d.x - P.x, d.z - P.z) > 32) continue; const hop = Math.max(0, Math.sin(Math.min(1, d.t * 2.5) * Math.PI)) * 1.6;
    if (d.globe) { const gc = col(0xff2a2a); GLX.obj('dyn', 'sphere', d.x, .6 + Math.sin(G.time * 3 + d.x) * .12, d.z, 0, .7, .7, .7, gc, 1.6); GLX.halo(d.x, .6, d.z, 2.2, gc, .5); GLX.light(d.x, 1, d.z, 4, gc, .6); continue; }
    if (d.gold) { GLX.obj('dyn', 'cyl', d.x, .1 + hop, d.z, 0, .5, .14, .5, col(0xffc83a), .6); GLX.halo(d.x, .3 + hop, d.z, .9, col(0xffd84a), .3); continue; }
    if (d.q) { const qc = col(d.qc || 0x8affc0), bob = Math.sin(G.time * 3 + d.x) * .08; if (/Lily/.test(d.q)) { GLX.obj('dyn', 'cyl', d.x, .25 + hop, d.z, 0, .08, .5, .08, col(0x3a8a4a), .2); for (let k = 0; k < 5; k++) GLX.obj('dyn', 'gem', d.x + Math.cos(k * 1.26) * .2, .6 + hop, d.z + Math.sin(k * 1.26) * .2, k * 1.26, .16, .3, .1, qc, 1.4); } else if (/Ham/.test(d.q)) { GLX.obj('dyn', 'sphere', d.x, .35 + hop + bob, d.z, d.x, .7, .45, .45, col(0xb86a4a), .2); GLX.obj('dyn', 'cyl', d.x + .4, .38 + hop + bob, d.z, 1.57, .12, .3, .12, col(0xf0e8d8)); } else if (/Glowcap/.test(d.q)) { GLX.obj('dyn', 'cyl', d.x, .25 + hop, d.z, 0, .14, .5, .14, col(0xe8e0d0), .3); GLX.obj('dyn', 'sphere', d.x, .55 + hop, d.z, 0, .6, .3, .6, qc, 1.2); } else { GLX.obj('dyn', 'sphere', d.x, .4 + hop + bob, d.z, d.x, .7, .75, .6, col(0xc8a868)); GLX.obj('dyn', 'cyl', d.x, .82 + hop + bob, d.z, 0, .2, .14, .2, col(0x8a6a3a)); }
      GLX.obj('glow', 'box', d.x, 1.6, d.z, .78, .16, 3.2, .16, qc, 1, .4); GLX.halo(d.x, .5, d.z, 2, qc, .45); continue; }
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
    if (a.owner === 'p' && !a.done) { const fy = (1 - k) * 10 + .3, wb = (1 - k) * 1.6; GLX.obj('glow', 'ring', a.x, .12, a.z, G.time * 2, d * .7, 1, d * .7, c, 1, .3 + k * .4, -1); // something falls from the sky onto the marked spot
      GLX.obj('glow', 'sphere', a.x + wb, fy, a.z - wb, 0, .3 + a.r * .12, .3 + a.r * .12, .3 + a.r * .12, c, 2.2, .95); GLX.obj('glow', 'sphere', a.x + wb, fy, a.z - wb, 0, .14, .14, .14, col(0xffffff), 2, .9); GLX.part('glow', 'box', IDM, a.x + wb * 1.6, fy + 1.2, a.z - wb * 1.6, -.15, -.785, 0, 0, 0, 0, .12, .12, 2.6, c, 1.2, .45); GLX.halo(a.x + wb, fy, a.z - wb, 1.2 + a.r * .3, c, .5); }
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
  // weather by region (build 0020): rain in the woods, falling ash over lava, heavy snow on the ice, rising motes in the void
  if (GLX.env.q > 0 && G.zone && G.set.weather !== false && !G.inTown) {
    const wx = G.zone.th.wx, t = G.time; if (wx) { const n = 5, cs = 4, cx = Math.floor(P.x / cs), cz = Math.floor(P.z / cs);
      const wc = col(wx === 'rain' ? 0xb8d0e8 : wx === 'ash' ? 0x8a7a70 : wx === 'snow' ? 0xf2f8ff : 0xb890ff);
      for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) { const gx = cx + ix, gz = cz + iz; let sd = ((gx * 83492791) ^ (gz * 2971215073)) >>> 0; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
        for (let q = 0; q < (wx === 'rain' ? 3 : 2); q++) { const x = gx * cs + r() * cs, z = gz * cs + r() * cs, ph = r() * 20, sp = .8 + r() * .4;
          if (wx === 'rain') { const H = 9, y = H - ((t * 16 * sp + ph * 3) % H); GLX.part('glow', 'box', IDM, x - y * .12, y, z + y * .05, .12, 0, 0, 0, 0, 0, .025, .55, .025, wc, .8, .32); if (y < .9) GLX.obj('glow', 'ring', x, .06, z, 0, .2 + (.9 - y) * .5, 1, .2 + (.9 - y) * .5, wc, .6, (y / .9) * .35, -1); }
          else if (wx === 'ash') { const H = 8, y = H - ((t * 1.1 * sp + ph) % H); GLX.obj('glow', 'gem', x + Math.sin(t * .8 + ph) * .9, y, z + Math.cos(t * .6 + ph) * .7, t + ph, .05, .03, .05, q ? wc : col(0xff6a2a), q ? .2 : 2, q ? .55 : .8); }
          else if (wx === 'snow') { const H = 8, y = H - ((t * 1.6 * sp + ph) % H); GLX.obj('glow', 'sphere', x + Math.sin(t * 1.3 * sp + ph) * .7, y, z + Math.cos(t + ph) * .4 + y * .1, 0, .06, .06, .06, wc, .8, .85); }
          else { const y = (t * .7 * sp + ph) % 6; GLX.obj('glow', 'gem', x + Math.sin(t * sp + ph) * .5, y, z + Math.cos(t * sp * .7 + ph) * .5, t, .05, .09, .05, wc, 1.6, (1 - y / 6) * .7); } } } } }
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.pillar) { const e = Math.min(1, (1 - k) * 6), w = (1.3 + (1 - k) * .4) * e; f.x = P.x; f.z = P.z; GLX.obj('glow', 'cyl', f.x, 9, f.z, G.time, w, 18, w, f.c, 1.5, k * .55); GLX.obj('glow', 'cyl', f.x, 9, f.z, -G.time, w * .4, 18, w * .4, col(0xffffff), 2, k * .7); GLX.halo(f.x, 1.2, f.z, 5 * e, f.c, k * .6); for (let i = 0; i < 10; i++) { const ph = ((1 - k) * 1.6 + i / 10) % 1, a = i * .63 + G.time * 2; GLX.obj('glow', 'gem', f.x + Math.cos(a) * w * .9, ph * 10, f.z + Math.sin(a) * w * .9, a, .1, .2, .1, f.c, 2, k); } GLX.light(f.x, 3, f.z, 12, f.c, 1.6 * k, 9); }
    else if (f.shock) { const e = 1 - Math.pow(k, 2.2), r = f.r * (.3 + e * 1.1) * 2; GLX.obj('glow', 'ring', f.x, .14, f.z, 0, r, 1, r, f.c, 1.4, k * 1.1, -1); GLX.obj('glow', 'ring', f.x, .18, f.z, G.time, r * .86, 1, r * .86, col(0xffffff), 1.6, k * .7, -1); GLX.obj('glow', 'disc', f.x, .1, f.z, 0, r * .9, 1, r * .9, f.c, 1, k * k * .45, 0);
      const fl = Math.max(0, 1 - (1 - k) * 4); if (fl > 0) { GLX.obj('glow', 'sphere', f.x, 1.1, f.z, 0, f.r * .9 * (1.4 - fl * .4), f.r * .7, f.r * .9 * (1.4 - fl * .4), col(0xffffff), 2.4, fl * .85); GLX.halo(f.x, 1.2, f.z, f.r * 2.8, f.c, fl); }
      if (f.h) GLX.obj('glow', 'cyl', f.x, 2.5, f.z, G.time * 2, f.r * .5 * k, 5, f.r * .5 * k, f.c, 1.6, k * .4); GLX.light(f.x, 1.5, f.z, f.r * 3 + 4, f.c, (f.h ? 2.6 : 1.6) * k, 9); }
    else if (f.scorch) { const d = f.r * 2; GLX.obj('glow', 'disc', f.x, .07, f.z, f.x, d, 1, d, f.c, .6, Math.min(1, k * 1.5) * .22, 0); }
    else if (f.spk) { const sp = Math.hypot(f.vx, f.vy, f.vz) || 1, L = Math.min(1.1, sp * .06); GLX.part('glow', 'box', IDM, f.x, f.y, f.z, -Math.asin(clamp(f.vy / sp, -1, 1)), Math.atan2(f.vx, f.vz), 0, 0, 0, 0, .06, .06, L, f.c, 2, k); }
    else if (f.smoke) { const s3 = f.size * (2.5 - k * 1.5); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, s3, s3, s3, f.c, .1, k * .18); }
    else if (f.dust) { const s2 = .18 + (1 - k) * .35; GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, s2, s2 * .7, s2, f.c, .2, k * .28); }
    else if (f.flash) { GLX.halo(f.x, f.y, f.z, f.r * (1.25 - k * .5), f.c, k * .85); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, f.r * .22 * k, f.r * .22 * k, f.r * .22 * k, f.c, 2, k); }
    else if (f.ring) { const r = (f.r0 + (f.r1 - f.r0) * (1 - k)) * 2; GLX.obj('glow', 'ring', f.x, .12, f.z, 0, r, 1, r, f.c, 1, k, -1); GLX.obj('glow', 'ring', f.x, .16, f.z, G.time * 3, r * .8, 1, r * .8, col(0xffffff), 1, k * .5, -1); GLX.obj('glow', 'ring', f.x, .5 + (1 - k) * 1.2, f.z, -G.time * 2, r * .92, 1, r * .92, f.c, 1, k * .45, -1); if (f.r1 > 3) { GLX.halo(f.x, 1, f.z, r * .7, f.c, k * .35); for (let q = 0; q < 8; q++) { const a = q * .785 + f.r1; GLX.obj('glow', 'box', f.x + Math.cos(a) * r * .5, .3 + (1 - k) * 1.6, f.z + Math.sin(a) * r * .5, -a, .07, .5 * k, .07, f.c, 1.5, k); } } GLX.obj('glow', 'disc', f.x, .1, f.z, 0, r, 1, r, f.c, 1, k * .25, 1); }
    else if (f.bolt) { // jagged lightning: a forked chain of segments with a white-hot core
      if (!f.pts || Math.random() < .35) { const n = 7, pts = [[f.x1, 1.35, f.z1]]; for (let q = 1; q < n; q++) { const u = q / n; pts.push([f.x1 + (f.x2 - f.x1) * u + (Math.random() - .5) * .9, 1.35 + (Math.random() - .5) * .8, f.z1 + (f.z2 - f.z1) * u + (Math.random() - .5) * .9]); } pts.push([f.x2, 1.3, f.z2]); f.pts = pts; }
      const seg = (A, B, w, cc, em, al) => { const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], L = Math.hypot(dx, dy, dz) || .01; GLX.part('glow', 'box', IDM, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, -Math.asin(dy / L), Math.atan2(dx, dz), 0, 0, 0, 0, w, w, L, cc, em, al); };
      for (let q = 0; q < f.pts.length - 1; q++) { seg(f.pts[q], f.pts[q + 1], .2, f.c, 1.4, k * .7); seg(f.pts[q], f.pts[q + 1], .07, col(0xffffff), 2, k); if (q % 2 && Math.random() < .7) { const A = f.pts[q], B = [A[0] + (Math.random() - .5) * 1.8, A[1] - .5 - Math.random() * .6, A[2] + (Math.random() - .5) * 1.8]; seg(A, B, .06, f.c, 1.6, k * .8); } }
      GLX.halo(f.x2, 1.3, f.z2, 2.8, f.c, k * .9); GLX.halo(f.x1, 1.3, f.z1, 1.6, f.c, k * .5); GLX.light(f.x2, 1.5, f.z2, 8, f.c, 1.2 * k, 3); }
    else if (f.slash) { for (let i = 0; i < 9; i++) { const a = f.rot + (i / 8 - .5) * f.arc * (1.25 - k * .4), rr = f.r * .95; GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, 1.25, f.z + Math.cos(a) * rr, a + 1.5708, .1, .03, f.r * .5, col(0xffffff), 1.5, k * .7); } GLX.halo(f.x + Math.sin(f.rot) * f.r * .8, 1.2, f.z + Math.cos(f.rot) * f.r * .8, f.r * 1.3, f.c, k * .3); for (let i = 0; i < 7; i++) { const a = f.rot + (i / 6 - .5) * f.arc * (1.2 - k * .4), rr = f.r * .82; GLX.obj('glow', 'box', f.x + Math.sin(a) * rr, 1.25, f.z + Math.cos(a) * rr, a + 1.5708, .12, .08, f.r * .62, f.c, 1, k * .9); } }
    else if (f.chunk) { const q = f.size * Math.min(1, k * 3); GLX.obj('dyn', f.g, f.x, f.y, f.z, f.life * f.spin, q, q * f.ar, q, f.c, f.em * k, 1, f.mat); }
    else if (f.dust) GLX.halo(f.x, f.y, f.z, f.size * (2 - k), f.c, k * .22);
else GLX.obj('glow', 'gem', f.x, f.y, f.z, f.life * 9, f.size, f.size, f.size, f.c, 1, k);
  }
  if (GPS.pts.length > 1 && G.set.gps) { const c = col(0xffd84a), c2g = col(0xffa040); let acc = (G.time * 3) % 1.6, tot = 0; for (let i = 1; i < GPS.pts.length && tot < 34; i++) { const a = GPS.pts[i - 1], b = GPS.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ry = Math.atan2(b[0] - a[0], b[1] - a[1]); while (acc < L && tot + acc < 34) { const t = acc / L, k = 1 - (tot + acc) / 34; if (tot + acc > 1.6) { const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, al = .55 * k; for (const sd of [1, -1]) { const fx = Math.sin(ry), fz = Math.cos(ry), sx = fz, sz = -fx; GLX.obj('glow', 'box', x - fx * .12 + sx * sd * .15, .06, z - fz * .12 + sz * sd * .15, ry - sd * .62, .08, .02, .44, c2g, 1, al); } } acc += 1.3; } acc -= L; tot += L; } }
  if (P.move && !P.atk) GLX.obj('glow', 'ring', P.move[0], .06, P.move[1], 0, .8, 1, .8, col(0xffffff), 1, .25, -1);
  if (G.tj && !G.auto && !P.dead) { const e = nearFoe(15); if (e && e !== G.hover) GLX.obj('glow', 'ring', e.x, .06, e.z, G.time * 1.5, e.r * 2.5, 1, e.r * 2.5, col(0xffb03a), 1, .55, -1); }
  if (G.hover && G.hover.alive) GLX.obj('glow', 'ring', G.hover.x, .06, G.hover.z, 0, G.hover.r * 2.6, 1, G.hover.r * 2.6, col(0xff5a4a), 1, .7, -1);
}
