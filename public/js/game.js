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
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } if (ac) { loadSmp(); setTimeout(loadFight, 3500); } } if (ac && ac.state === 'suspended') ac.resume().catch(() => { }); return ac; }
  function tone(f, d, type, vol, slide, delay) {
    const a = ctx(); if (!a || mute) return; const t = a.currentTime + (delay || 0); const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d); g.gain.setValueAtTime(Math.max(.0002, (vol || .1) * master), t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  function noise(d, vol, freq, delay) {
    const a = ctx(); if (!a || mute) return; if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + (delay || 0); const s = a.createBufferSource(); s.buffer = nb; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200; const g = a.createGain(); g.gain.setValueAtTime(Math.max(.0002, (vol || .1) * master), t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * .5, d + .05);
  }
  /* build 0051: recorded sounds (Kenney's CC0 packs) for hits, kills, footsteps, coins and more. Until they load, or if they can't, the old synth sounds play */
  const SMP = {}, SLAST = {}, SFILES = ['hit', 'impact', 'kill', 'big_kill', 'boss', 'hurt', 'coin', 'step', 'land', 'dash'], SQ = '?v=' + (typeof BUILD !== 'undefined' ? BUILD : '');
  let smpGo = false, sBus = null;
  function getBuf(f, done) { if (typeof fetch === 'undefined') return; fetch(f + SQ).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) ac.decodeAudioData(b, done, () => { }); }).catch(() => { }); }
  function loadSmp() { if (smpGo || !ac) return; smpGo = true; for (const k of SFILES) getBuf('sfx/' + k + '.mp3', buf => { SMP[k] = buf; }); }
  function smp(k, vol, rate, delay) {
    const a = ac, b = SMP[k]; if (!a || !b) return false; if (mute) return true; const now = a.currentTime; if (!delay && now - (SLAST[k] || -1) < .045) return true; SLAST[k] = now;
    if (!sBus) { sBus = a.createDynamicsCompressor(); sBus.threshold.value = -10; sBus.ratio.value = 6; sBus.connect(a.destination); }
    const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = (rate || 1) * (.93 + Math.random() * .14); g.gain.value = (vol || .5) * master; s.connect(g); g.connect(sBus); s.start(now + (delay || 0)); return true;
  }
  function play(n) {
    try {
      switch (n) {
        case 'swing': noise(.12, .07, 2600); break;
        case 'hit': if (smp('hit', .55)) tone(140, .08, 'triangle', .05, .5); else { noise(.09, .16, 900); tone(140, .1, 'triangle', .12, .5); } break;
        case 'crit': if (smp('impact', .65, 1.15)) { smp('hit', .45, 1.25); noise(.07, .08, 3200); } else { noise(.14, .22, 1800); tone(220, .16, 'square', .07, .4); } break;
        case 'taunt': if (!smp('impact', .35, .7)) tone(140, .25, 'square', .08, .6); tone(90, .3, 'sawtooth', .05, .7); break;
        case 'block': if (!smp('hit', .22, .62)) tone(240, .08, 'square', .05, .6); break;
        case 'mend': tone(520, .35, 'sine', .07, 1.5); tone(780, .45, 'sine', .05, 1.25, .08); tone(1040, .5, 'sine', .03, 1.1, .16); break;
        case 'hurt': if (!smp('hurt', .5)) tone(110, .2, 'sawtooth', .12, .5); break;
        case 'kill': if (smp('kill', .55)) tone(90, .16, 'triangle', .06, .4); else { tone(90, .22, 'triangle', .14, .4); noise(.16, .1, 500); } break;
        case 'bigkill': if (smp('big_kill', .5)) smp('kill', .55, .85); else { tone(70, .5, 'triangle', .16, .4); noise(.3, .14, 400); } break;
        case 'step': smp('step', .11, .9 + Math.random() * .25); break;
        case 'slam': if (smp('impact', .75, .72)) { smp('land', .6, .8); tone(55, .4, 'sine', .22, .5); } else { noise(.4, .3, 320); tone(60, .4, 'sine', .3, .5); } break;
        case 'leap': if (!smp('dash', .5)) noise(.25, .08, 3000); break;
        case 'whirl': if (!smp('dash', .38, .78)) noise(.3, .08, 2200); break;
        case 'gold': if (!smp('coin', .32)) { tone(1568, .06, 'square', .035); tone(2093, .08, 'square', .035, 1, .05); } break;
        case 'goblin': [1319, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone(f, .14, 'triangle', .09, 1, i * .075)); tone(3136, .5, 'sine', .05, 1, .46); break; /* build 0034: a coin jingle when a Treasure Goblin is near */
        case 'pickup': tone(520, .08, 'triangle', .1, 1.5); break;
        case 'drop1': tone(660, .25, 'sine', .1); break;
        case 'drop2': tone(784, .22, 'triangle', .12); tone(1047, .4, 'triangle', .12, 1, .12); break;
        case 'drop4': [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .9, 'triangle', .13, 1, i * .08)); tone(2637, 1.6, 'sine', .07, 1, .5); tone(131, 1.4, 'sine', .12); break;
        case 'drop3': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .7, 'triangle', .13, 1, i * .09)); tone(2093, 1.2, 'sine', .06, 1, .45); break;
        case 'level': [392, 523, 659, 784].forEach((f, i) => tone(f, .5, 'square', .06, 1, i * .1)); break;
        case 'flask': tone(300, .3, 'sine', .12, 2); break;
        case 'boss': if (smp('boss', .7)) { smp('big_kill', .4, .7, .15); tone(55, 1.4, 'sawtooth', .07, .7); } else { tone(55, 1.4, 'sawtooth', .16, .7); noise(1.2, .12, 240); } break;
        case 'shrine': [440, 554, 659].forEach((f, i) => tone(f, .8, 'sine', .09, 1, i * .05)); break;
        case 'bossdie': if (smp('big_kill', .8, .55)) { smp('boss', .6, .7, .1); smp('impact', .7, .5); } else { tone(45, 2, 'sawtooth', .2, .5); noise(1.6, .2, 300); } tone(38, 2.2, 'sine', .25, .6); break;
        case 'die': smp('big_kill', .5, .6); tone(200, 1, 'sawtooth', .14, .25); break;
        case 'warn': tone(70, .55, 'sawtooth', .07, 1.9); noise(.45, .06, 700); tone(140, .3, 'sine', .05, 1.5, .12); break; // build 0048: a heavy blow is being marked
        case 'evade': tone(880, .12, 'sine', .05, 1.4); tone(1320, .1, 'sine', .03, 1.2, .05); break;
        case 'hum': tone(55, 3.4, 'sine', .07); tone(82.4, 3.2, 'triangle', .025, 1.01); tone(110, 3, 'sine', .03, .99, .2); noise(2.6, .025, 260); break; // build 0046: the portal's low hum
        case 'warp': tone(110, .9, 'sine', .14, 4); tone(220, .7, 'triangle', .06, 3, .1); noise(.8, .12, 1600); [523, 659, 784].forEach((f, i) => tone(f, .6, 'sine', .05, 1, .25 + i * .07)); break;
      }
    } catch (e) { }
  }
  // ambient bed: filtered noise that breathes like wind, plus sparse one-shots that suit the zone
  let amb = null, ambT = 2, ambKind = '', ambLvl = 0;
  const setAmb = () => { if (amb && ac) amb.g.gain.setTargetAtTime(mute ? 0 : ambLvl * master, ac.currentTime, .8); };
  function ambient(kind) {
    ambKind = kind || ''; gameSong = THEMES['s_' + ambKind] ? 's_' + ambKind : ''; const a = ctx(); if (!a) return;
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
  const mVol = () => (mute || !mOn ? 0 : mLvl * master * .5 * (fBuf ? 1 - .9 * Math.min(1, fLvl * 1.6) : 1));
  /* build 0051: fight music. "Battle Theme A" by cynicmusic (CC0) fades in over the area tune when a fight starts, and its sound opens up as the fight grows */
  let fBuf = null, fSrc = null, fG = null, fLp = null, fLvl = 0, fGo = false, fT0 = 0, fOff = 0;
  function loadFight() { if (fGo || !ac) return; fGo = true; getBuf('sfx/battle.mp3', b => { fBuf = b; }); }
  function fight(k, dt) {
    if (!ac || !(dt > 0)) return; fLvl += (k - fLvl) * Math.min(1, dt * (k > fLvl ? 1.4 : .3)); if (fLvl < .003 && k <= 0) fLvl = 0; if (!fBuf) return;
    const v = mute || !mOn ? 0 : Math.min(1, fLvl * 1.3) * mLvl * master * .8, now = ac.currentTime;
    if (v > .001 && !fSrc) { fG = ac.createGain(); fG.gain.value = 0; fLp = ac.createBiquadFilter(); fLp.type = 'lowpass'; fLp.frequency.value = 600; fSrc = ac.createBufferSource(); fSrc.buffer = fBuf; fSrc.loop = true; fSrc.connect(fLp); fLp.connect(fG); fG.connect(ac.destination); fSrc.start(now, fOff % fBuf.duration); fT0 = now - fOff; }
    if (!fSrc) return; fG.gain.setTargetAtTime(v, now, .25); fLp.frequency.setTargetAtTime(500 + fLvl * fLvl * 14000, now, .3);
    if (fLvl <= 0 || v <= 0) { fOff = (now - fT0) % fBuf.duration; try { fSrc.stop(now + .6); } catch (e) { } fSrc = null; }
  }
  function nz() { if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } return nb; }
  function env(node, t, a, v, d) { node.gain.setValueAtTime(.0001, t); node.gain.linearRampToValueAtTime(v, t + a); node.gain.exponentialRampToValueAtTime(.0001, t + d); }
  function osc(type, f, t, d, v, out, det) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; env(g, t, .005, v, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .05); return o; }
  function hit(t, fq, type, v, d, out) { const b = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); b.buffer = nz(); f.type = type; f.frequency.value = fq; env(g, t, .002, v, d); b.connect(f); f.connect(g); g.connect(out); b.start(t, Math.random() * .5, d + .05); }
  function kick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); env(g, t, .003, .55, .28); o.connect(g); g.connect(mBus); o.start(t); o.stop(t + .32); hit(t, 3000, 'lowpass', .08, .03, mBus); }
  function snare(t, v) { hit(t, 1900, 'bandpass', .32 * v, .17, mBus); osc('triangle', 190, t, .09, .14 * v, mBus); }
  function chord(n, t, d, v) { for (const [k, det] of [[0, -7], [0, 7], [7, 0], [12, 4]]) osc('sawtooth', MF(n + k), t, d, v * (k === 12 ? .5 : 1), gBus, det); }
  /* build 0033: each hero has a theme on the selection screen. Same instruments as the rock loop, plus a clean bus with an echo for bells, flutes and pads. Degrees index the theme's scale; null is a rest */
  const SC = { min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], hmin: [0, 2, 3, 5, 7, 8, 11], blues: [0, 3, 5, 6, 7, 10], maj: [0, 2, 4, 5, 7, 9, 11], phr: [0, 1, 3, 5, 7, 8, 10] }, _ = null;
  const THEMES = {
    warden: { bpm: 92, base: 73.42, len: 8, sc: 'min', prog: [0, 0, -2, -2, -4, -4, -5, -5], kick: [0, 3, 4], snare: [6], tom: [1, 5, 7], gtr: 'hold', bass: 'root', crash: 1,
      lead: { w: 'sawtooth', v: .05, lp: 1300, oct: 12, m: [0, _, _, 0, 2, _, 4, _, 3, _, 2, _, 0, _, _, _, 0, _, _, 0, 2, _, 4, _, 5, _, 4, _, 7, _, _, _] }, pad: { w: 'sawtooth', v: .018, lp: 700 } },
    ranger: { bpm: 172, base: 110, len: 6, sc: 'dor', prog: [0, 0, -2, -2, 0, 0, -5, -2], kick: [0, 3], snare: [], tom: [5], hat: [0, 1, 2, 3, 4, 5], hv: .035, bass: 'root', bw: 'triangle',
      arp: { w: 'triangle', v: .05, d: .28, n: [0, 7, 12, 15, 12, 7] }, lead: { w: 'sine', v: .09, oct: 24, vib: 1, m: [4, _, 3, 2, _, 0, 1, _, 2, 4, _, _, 4, _, 5, 6, _, 4, 3, _, 2, 0, _, _] } },
    arcanist: { bpm: 76, base: 65.41, len: 8, sc: 'hmin', prog: [0, 0, -4, -4, -7, -7, -5, -5], kick: [0], snare: [], hat: [3, 7], hv: .02, bass: 'long', bw: 'sine', echo: .45,
      arp: { w: 'sine', v: .06, d: 1.4, oct: 24, n: [0, 3, 7, 12, 15, 12, 7, 3] }, pad: { w: 'sine', v: .05, det: 9 }, lead: { w: 'triangle', v: .06, oct: 36, m: [_, _, 6, _, 4, _, _, _, 5, _, 4, _, 2, _, 3, _, _, _, 6, _, 7, _, 8, _, 7, _, 6, _, 4, _, _, _] } },
    brawler: { bpm: 176, base: 82.41, len: 8, sc: 'blues', prog: [0, 0, 0, 0, 5, 5, 3, -2], kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hv: .06, gtr: 'chug', bass: 'pulse', hey: 1,
      lead: { w: 'square', v: .03, oct: 12, dist: 1, m: [0, _, 1, 2, 3, _, 2, _, 0, _, 2, _, 1, 0, _, _, 0, _, 1, 2, 3, _, 5, _, 4, 3, 2, _, 1, 0, _, _] } },
    elementalist: { bpm: 128, base: 92.5, len: 8, sc: 'min', prog: [0, 0, -4, -4, 3, 3, -2, -2], kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], hv: .07, bass: 'off', bw: 'sawtooth', echo: .3,
      arp: { w: 'square', v: .03, d: .18, oct: 24, n: [0, 7, 12, 15, 12, 7, 3, 7], split: 1 }, pad: { w: 'sawtooth', v: .02, lp: 1800, det: 12 }, lead: { w: 'sawtooth', v: .045, oct: 24, lp: 2400, m: [4, _, _, 3, 4, _, 6, _, 7, _, 6, _, 4, _, _, _, 2, _, _, 3, 4, _, 2, _, 0, _, _, _, _, _, _, _] } }
  };
  /* build 0034: in-game music changes with the place you are in.
     build 0075 (Lee, Nov 15: make the music more adventurous and epic): every place now has an orchestral adventure score instead of the rock loop and the quiet synth tunes.
     A horn carries the tune (horn: 1), brass holds the chords (brass), strings drive a galloping rhythm (ost), a choir sits behind (pad) and timpani land the beats (timp).
     q gives each chord its third (3 minor, 4 major) so the brass plays full chords; mB is the tune for the bridge. */
  const GAL = [1, 0, .6, .7, 1, 0, .6, .7], DRV = [1, .5, .7, .5, 1, .5, .7, .8], SLOW = [1, 0, 0, 0, .7, 0, .5, 0];
  Object.assign(THEMES, {
    // the Blighted Hollow: the main adventure theme. D minor, a rising horn call over galloping strings
    s_forest: { bpm: 132, base: 73.42, len: 8, sc: 'min', prog: [0, 0, -4, -4, 3, 3, -2, -2], q: [3, 3, 4, 4, 4, 4, 4, 4], progB: [-4, -4, -2, -2, 0, 0, -2, -2], qB: [4, 4, 4, 4, 3, 3, 4, 4], kick: [0, 4], snare: [2, 6], tom: [7], timp: [0, 3, 6], bass: 'root', bw: 'triangle', echo: .28,
      ost: { v: .026, lp: 2200, p: GAL, n: [0, 0, 7, 12, 0, 0, 7, 12] }, brass: { v: .02, lp: 1500 }, pad: { w: 'sine', v: .022, iv: [0, 7, 12], det: 7 },
      lead: { horn: 1, v: .05, lp: 1700, oct: 24, m: [0, _, _, 4, 4, _, 3, 2, 3, _, _, 2, 0, _, _, _, 2, _, _, 4, 7, _, 6, 4, 6, _, 3, _, 8, _, _, _] },
      mB: [7, _, _, _, 9, _, 7, _, 8, _, _, _, 10, _, 8, _, 11, _, _, 9, 7, _, _, _, 8, _, 6, _, 4, _, _, _] },
    // Emberwatch: home. Warm and proud, G major, a gentle horn over harp and soft strings
    s_town: { bpm: 104, base: 98, len: 6, sc: 'maj', prog: [0, 0, 5, 5, 9, 9, 7, 7], q: [4, 4, 4, 4, 3, 3, 4, 4], progB: [5, 5, 7, 7, 9, 9, 7, 2], qB: [4, 4, 4, 4, 3, 3, 4, 3], kick: [], snare: [], timp: [0], bass: 'root', bw: 'triangle', echo: .35,
      arp: { w: 'triangle', v: .04, d: .5, n: [0, 7, 12, 19, 12, 7] }, brass: { v: .011, lp: 1100 }, pad: { w: 'sine', v: .028, iv: [0, 7, 12], det: 6 },
      lead: { horn: 1, v: .04, lp: 1500, oct: 24, m: [4, _, 2, 4, _, 7, 5, _, 4, 2, _, _, 1, _, 2, 4, _, 2, 0, _, _, _, _, _] } },
    // the Sunken Catacombs: slow and vast. Low choir, heavy timpani, a dark horn line in B harmonic minor
    s_crypt: { bpm: 84, base: 61.74, len: 8, sc: 'hmin', prog: [0, 0, -4, -4, 5, 5, 7, 7], q: [3, 3, 4, 4, 3, 3, 4, 4], kick: [0], snare: [], tom: [6], timp: [0, 4, 7], bass: 'long', bw: 'sine', echo: .5,
      ost: { v: .02, lp: 1400, p: SLOW, n: [0, 0, 0, 0, 7, 0, 12, 0] }, brass: { v: .016, lp: 1000 }, pad: { w: 'sawtooth', v: .016, lp: 900, iv: [0, 7, 12, 15] },
      lead: { horn: 1, v: .045, lp: 1300, oct: 24, m: [0, _, _, _, 1, _, 0, _, 6, _, _, _, 4, _, _, _, 0, _, _, _, 1, _, 2, _, 4, _, 3, _, 1, _, _, _] },
      mB: [4, _, _, _, 5, _, 4, _, 2, _, _, _, 0, _, _, _, 4, _, _, _, 5, _, 6, _, 7, _, _, _, 6, _, _, _] },
    // the Cinder Wastes: a war march. Pounding drums, driving strings and brass stabs in D phrygian
    s_lava: { bpm: 146, base: 73.42, len: 8, sc: 'phr', prog: [0, 0, 1, 1, 0, 0, -2, 1], q: [3, 3, 4, 4, 3, 3, 4, 4], progB: [-4, -4, -2, -2, 1, 1, 0, 0], qB: [4, 4, 4, 4, 4, 4, 3, 3], kick: [0, 3, 4, 6], snare: [2, 6], tom: [5, 7], timp: [0, 3, 4], hat: [0, 2, 4, 6], hv: .035, bass: 'pulse', bw: 'triangle',
      ost: { v: .03, lp: 2400, p: DRV, n: [0, 0, 7, 0, 12, 0, 7, 0] }, brass: { v: .024, lp: 1700 }, pad: { w: 'sawtooth', v: .012, lp: 800, iv: [0, 7, 12] },
      lead: { horn: 1, v: .05, lp: 1900, oct: 24, m: [0, _, 1, _, 0, _, 4, 3, 1, _, 0, _, _, _, _, _, 0, _, 1, _, 2, _, 4, _, 5, 4, 2, 1, 0, _, _, _] },
      mB: [7, _, _, 5, 4, _, _, _, 6, _, _, 4, 3, _, _, _, 8, _, 7, _, 5, _, 4, _, 7, _, _, _, _, _, 4, 5] },
    // Frostveil Pass: wide and majestic. Bells and choir, a soaring horn in F dorian
    s_ice: { bpm: 112, base: 87.31, len: 8, sc: 'dor', prog: [0, 0, 3, 3, 5, 5, -2, -2], q: [3, 3, 4, 4, 4, 4, 4, 4], kick: [0, 5], snare: [], tom: [7], timp: [0, 4], bass: 'root', bw: 'sine', echo: .45,
      arp: { w: 'sine', v: .032, d: .6, oct: 36, n: [0, 7, 14, 7, 12, 19, 14, 7] }, ost: { v: .018, lp: 1800, p: GAL, n: [0, 0, 7, 12, 0, 0, 7, 12] }, brass: { v: .017, lp: 1300 }, pad: { w: 'sine', v: .03, det: 10, iv: [0, 7, 12] },
      lead: { horn: 1, v: .048, lp: 1600, oct: 24, m: [0, _, _, 4, 5, _, 4, _, 7, _, _, _, 6, _, 4, _, 5, _, _, 7, 9, _, 8, 7, 6, _, 4, _, 3, _, _, _] },
      mB: [7, _, _, _, 9, _, 8, 7, 6, _, _, _, 4, _, _, _, 5, _, _, _, 7, _, 9, _, 11, _, _, 9, 8, _, _, _] },
    // the Voidscar: dark and urgent. Relentless strings, low brass and a choir in C sharp minor
    s_void: { bpm: 126, base: 69.3, len: 8, sc: 'min', prog: [0, 0, -4, -4, 1, 1, -2, -2], q: [3, 3, 4, 4, 4, 4, 4, 4], kick: [0, 2, 4, 6], snare: [6], tom: [3, 7], timp: [0, 4, 6], bass: 'off', bw: 'triangle', echo: .35,
      ost: { v: .028, lp: 2000, p: DRV, n: [0, 12, 7, 12, 3, 12, 7, 12] }, brass: { v: .021, lp: 1300 }, pad: { w: 'sawtooth', v: .014, lp: 1200, det: 12, iv: [0, 7, 12] },
      lead: { horn: 1, v: .046, lp: 1500, oct: 24, m: [0, _, _, 2, 3, _, 2, _, 0, _, _, _, -1, _, 0, _, 4, _, _, 3, 2, _, 0, _, 2, _, _, _, _, _, _, _] },
      mB: [4, _, _, _, 7, _, 6, 4, 5, _, _, _, 3, _, _, _, 4, _, 5, _, 7, _, 8, _, 9, _, _, 7, 6, _, _, _] }
  });
  let gameSong = '';
  let theme = null, themeK = '', cBus = null;
  if (typeof setInterval !== 'undefined' && typeof document !== 'undefined') setInterval(() => { try { musTick(); } catch (e) { } }, 90); /* keeps the music steady when frames are slow */
  function setTheme(k) { k = THEMES[k] ? k : ''; if (k === themeK) return; themeK = k; theme = THEMES[k] || null; if (mBus && ac) { mBus.gain.cancelScheduledValues(ac.currentTime); mBus.gain.setValueAtTime(0, ac.currentTime); } mStep = 0; if (ac) mNext = ac.currentTime + .25; }
  function tom(t, f, v) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .55, t + .3); env(g, t, .003, v, .45); o.connect(g); g.connect(mBus); o.start(t); o.stop(t + .5); hit(t, 600, 'lowpass', v * .3, .08, mBus); }
  function filt(out, f) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f; lp.connect(out); return lp; }
  /* build 0034: songs now move through sections (intro, verse, a bridge with its own chords and tune, then a big last verse) and every other time round they lift up a key, so they keep changing */
  function themeStep(t, st) {
    const T = theme, L = T.len, P16 = L * 16, i = mStep % L, bar = Math.floor(mStep / L) % 4, phrase = Math.floor(mStep / L / 4) % 4, cyc = Math.floor(mStep / P16), ks = cyc % 2 ? 2 : 0, half = i < L / 2 ? 0 : 1;
    const B = phrase === 2, prog = B ? (T.progB || T.prog.slice(4).concat(T.prog.slice(0, 4))) : T.prog, root = prog[bar * 2 + half], F = n => T.base * Math.pow(2, (n + ks) / 12), scl = SC[T.sc];
    const deg = (d, o) => { const k = scl.length; return scl[((d % k) + k) % k] + 12 * Math.floor(d / k) + (o || 0); };
    const intro = phrase === 0 && bar < 2 && cyc === 0, brk = B && bar < 2, big = phrase === 3;
    if (T.kick.includes(i) && !(brk && i !== 0)) kick(t); if (T.snare.includes(i) && !intro && !(brk && i !== T.snare[T.snare.length - 1])) snare(t, .9); if (T.tom && T.tom.includes(i) && !intro) tom(t, i === T.tom[T.tom.length - 1] ? 70 : 105, .32);
    if (T.hat && !brk) for (const h of T.hat) if (h === i) hit(t, 8000, 'highpass', T.hv * (i % 2 ? .7 : 1), .04, mBus);
    if (i === 0 && (bar === 0 || (big && bar === 2))) hit(t, 5000, 'highpass', .14, 1.4, mBus);
    if (bar === 3 && phrase % 2 === 1 && i >= L - 2 && T.snare.length) snare(t, .7 + (i - L + 2) * .2); /* a fill into the next part */
    if (T.hey && bar === 3 && i === 6) { hit(t, 1100, 'bandpass', .3, .16, mBus); hit(t, 1500, 'bandpass', .2, .14, mBus); }
    const ch = i === 0 || i === L / 2;
    if (!intro) { if (T.gtr === 'hold' && ch) for (const [k, det] of [[0, -7], [0, 7], [7, 0], [12, 4]]) osc('sawtooth', F(root + k), t, st * (L / 2) * .95, .05 * (k === 12 ? .5 : 1), gBus, det);
      if (T.gtr === 'chug' && !(brk && !ch)) for (const [k, det] of [[0, -7], [0, 7], [7, 0]]) osc('sawtooth', F(root + k), t, st * (ch ? 1.6 : .5), ch ? .06 : .035, gBus, det); }
    const bw = T.bw || 'sawtooth', bf = (() => { let f = F(root - 12); while (f < 40) f *= 2; return f; })(), bs = (d, v) => { osc(bw, bf, t, d, v, mBus); osc('sine', bf, t, d, v * .9, mBus); };
    if (T.bass === 'root' && ch) bs(st * (L / 2) * .8, .12); else if (T.bass === 'long' && i === 0) bs(st * L * .95, .1); else if (T.bass === 'pulse' && !brk) bs(st * .85, .11); else if (T.bass === 'pulse' && ch) bs(st * (L / 2) * .8, .11); else if (T.bass === 'off' && i % 2) bs(st * .8, .12);
    if (T.pad && ch) { const o = T.pad.lp ? filt(cBus, T.pad.lp) : cBus, iv = T.pad.iv || [0, 3, 7, 12], pv = T.pad.v * (B ? 1.4 : 1); for (const k of iv) { osc(T.pad.w, F(root + k + 12), t, st * (L / 2) * 1.05, pv, o, -(T.pad.det || 0)); if (T.pad.det) osc(T.pad.w, F(root + k + 12), t, st * (L / 2) * 1.05, pv, o, T.pad.det); } }
    // build 0075: the orchestra. oa is a note with a soft start that holds, then lets go (horns, brass and bowed strings do not click on like a synth)
    const oa = (f, d, v, out, det, att) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.detune.value = det || 0; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setValueAtTime(v, t + Math.max(att, d * .72)); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + .05); };
    if (T.timp && T.timp.includes(i) && !intro) { let f = F(root - 12); while (f < 58) f *= 2; while (f > 116) f /= 2; tom(t, f * 1.3, i === 0 ? .36 : .26); }
    if (T.brass && ch && !intro) { const qs = B ? (T.qB || T.q) : T.q, third = qs ? qs[bar * 2 + half] : 0, o = filt(cBus, T.brass.lp || 1500), d = st * (L / 2) * .98, bv = T.brass.v * (big ? 1.25 : 1) * (brk ? .6 : 1); for (const k of [0, 7, 12].concat(third ? [12 + third] : [], big ? [19] : [])) { oa(F(root + k + 12), d, bv * (k > 12 ? .7 : 1), o, -5, .07); oa(F(root + k + 12), d, bv * .6, o, 6, .09); } }
    if (T.ost && !intro && !brk) { const O = T.ost, pv = O.p[i % O.p.length]; if (pv) { const f = F(root + O.n[i % O.n.length] + (O.oct === undefined ? 12 : O.oct)), o = filt(cBus, O.lp || 2000), v = O.v * pv * (big ? 1.2 : 1); oa(f, st * .6, v, o, -6, .008); oa(f, st * .6, v * .8, o, 7, .008); } }
    if (T.arp && !intro) { const A = T.arp, n = A.n[i % A.n.length] + (B ? 12 : 0); osc(A.w, F(root + n + (A.oct || 12)), t, A.d, A.v, cBus); if (A.split || big) osc(A.w, F(root + n + (A.oct || 12)), t + st / 2, A.d, A.v * .6, cBus); }
    if (T.lead && !(phrase === 0 && cyc === 0) && !brk) { const Ld = T.lead, mm = B ? (T.mB || Ld.m.map(d => d === null ? null : d + 2)) : Ld.m, k = mStep % (L * 4), d = mm[k % mm.length]; if (d !== null && d !== undefined) { let len = 1; while (len < 4 && mm[(k + len) % mm.length] === null) len++;
      const up = big && bar >= 2 ? 12 : 0; if (Ld.horn) { const f = F(deg(d, (Ld.oct || 12) + (up && B ? 0 : up))), ho = filt(cBus, Ld.lp || 1500), hd = st * len * .98; oa(f, hd, Ld.v, ho, -4, .04); oa(f, hd, Ld.v * .5, ho, 5, .05); oa(f / 2, hd, Ld.v * .6, ho, 0, .05); return; } /* build 0075: the horn section, doubled an octave down */ const out = Ld.dist ? gBus : Ld.lp ? filt(cBus, Ld.lp) : cBus, o = osc(Ld.w, F(deg(d, (Ld.oct || 12) + up)), t, st * len * .95, Ld.v, out); if (Ld.vib) { o.detune.setValueAtTime(0, t); for (let q = 1; q <= len * 3; q++) o.detune.linearRampToValueAtTime(q % 2 ? 14 : -14, t + q * st / 3); } } }
  }
  function musTick() {
    if (!ac || ac.state !== 'running') return;
    if (!mBus) { mBus = ac.createGain(); mBus.gain.value = 0; const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; mBus.connect(comp); comp.connect(ac.destination);
      gBus = ac.createGain(); gBus.gain.value = .5; const ws = ac.createWaveShaper(), cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cv[i] = Math.tanh(x * 6) * .8; } ws.curve = cv; ws.oversample = '2x'; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90; gBus.connect(ws); ws.connect(hp); hp.connect(lp); lp.connect(mBus); mNext = ac.currentTime + .1; }
    if (!cBus) { cBus = ac.createGain(); cBus.gain.value = 1; const dl = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain(); dl.delayTime.value = .33; fb.gain.value = .32; wet.gain.value = .3; cBus.connect(mBus); cBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(mBus); cBus.wet = wet; }
    mBus.gain.setTargetAtTime(mVol(), ac.currentTime, .5); if (mVol() <= 0) { mNext = ac.currentTime + .1; return; }
    const st = 60 / (theme ? theme.bpm : BPM) / 2; if (mNext < ac.currentTime - .5) mNext = ac.currentTime + .05;
    if (theme) { cBus.wet.gain.value = theme.echo || .2; while (mNext < ac.currentTime + .25) { themeStep(mNext, st); mStep++; mNext += st; } return; }
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
  return { unlock: ctx, play, fight, ambient, ambTick(dt) { setTheme(gameSong); ambTick(dt); musTick(); }, musTick, theme: setTheme, music(v) { mLvl = v; }, toggle() { mute = !mute; setAmb(); return mute; }, vol(v) { master = v; mute = v <= 0; setAmb(); } };
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
// build 0074 (security): could this item have come out of the game? The highest roll at its item level, rarity and upgrades,
// with a little room for rounding. Used on items passed between players; it never touches a hero's own saved gear.
function itemLegit(it, maxIlvl) {
  if (!it || typeof it !== 'object' || !DROP_SLOTS.includes(it.slot) || !Array.isArray(it.aff)) return false;
  const rar = it.rar, il = it.ilvl, up = it.up || 0; if (![0, 1, 2, 3, 4].includes(rar) || !(il >= 1 && il <= Math.min(80, maxIlvl || 80) && il === Math.round(il)) || !(up >= 0 && up <= MAX_UP && up === Math.round(up))) return false;
  const nMax = [0, 2, 5, 5, 6][rar], uk = Math.pow(1.08, up), tol = v => v * 1.02 + up + 1; if (it.aff.length > nMax) return false;
  const as = AFF_ALIAS[it.slot] || it.slot, seen = new Set();
  for (const f of it.aff) { if (!f || typeof f.k !== 'string' || seen.has(f.k)) return false; seen.add(f.k); const a = AFFIX.find(x => x[0] === f.k); if (!a || !a[4].split(' ').includes(as) || !(f.v >= 1) || !isFinite(f.v)) return false;
    let mx = a[2]; if (a[3] === 'f') mx *= Math.pow(1.085, il); else if (a[3] === 'p') mx *= 1 + Math.min(il, 60) * .02; mx = Math.round(mx) * (rar === 4 ? 1.25 : 1) * Math.pow(1.06, up); if (f.v > tol(mx) + 1) return false; }
  if (it.slot === 'weapon') { if (!Array.isArray(it.dmg) || it.dmg.length !== 2 || !it.dmg.every(v => isFinite(v) && v >= 1)) return false; const k = Math.pow(1.11, il) * (1 + rar * .1) * uk, hi = Math.max(...WEAPONS.map(w => w.d[1])) * k, lo = Math.max(...WEAPONS.map(w => w.d[0])) * k; if (it.dmg[1] > tol(hi) + 1 || it.dmg[0] > tol(lo) + 1 || it.dmg[0] > it.dmg[1]) return false; if (!(it.spd >= .5 && it.spd <= 2.5)) return false; }
  if (it.armor !== undefined) { const bases = it.slot === 'offhand' ? Object.values(OFFHAND).map(b => b.a || 0) : (ARMOR[it.slot] || []).map(b => b.a), mx = Math.max(0, ...bases) * Math.pow(1.085, il) * (1 + rar * .08) * uk; if (!(it.armor >= 0) || it.armor > tol(mx) + 1) return false; }
  if (it.power !== undefined && (rar < 3 || !POWERS[it.power])) return false;
  return true;
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
  const mf = luck() / 100; const w = [62, 30 * (1 + mf), 7.5 * (1 + mf * 1.2) * (1 + bonus), .35 * (1 + mf * 1.5) * (1 + bonus * 2) * tierOf().leg]; /* build 0074: higher tiers raise only the Legendary (and so Mythic) chance */ /* build 0034 (Lee, Nov 14: make loot scarcer): legendary weight .5 -> .35, about one legendary every 2.5 floors instead of every 1.4 */
  let r = Math.random() * (w[0] + w[1] + w[2] + w[3]); for (let i = 0; i < 4; i++) { if (r < w[i]) return i === 3 && Math.random() < MYTHIC_CHANCE ? 4 : i; r -= w[i]; } return 0;
}
function dropItem(x, z, it, exact) { const a = rnd(6.28), d = exact ? 0 : rnd(.6, 1.8); let dx = x + Math.cos(a) * d, dz = z + Math.sin(a) * d; if (blocked(dx, dz, .3)) { dx = x; dz = z; } G.drops.push({ x: dx, z: dz, ox: x, oz: z, item: it, t: 0, spin: rnd(-1, 1) }); if (it.rar >= 3) jackpot(it); else if (it.rar > 0) SFX.play('drop' + it.rar); }
function dropGold(x, z, amt, exact) { const a = rnd(6.28), d = exact ? 0 : rnd(.4, 1.5); let dx = x + Math.cos(a) * d, dz = z + Math.sin(a) * d; if (blocked(dx, dz, .3)) { dx = x; dz = z; } G.drops.push({ x: dx, z: dz, gold: Math.max(1, Math.round(amt * (1 + (P.stats.gf || 0) / 100) * (1 + .15 * townLv('guild')) * (1 + tierOf().gold / 100))), t: 0 }); }
/* build 0034 (Lee, Nov 14): a guardian's loot no longer lands on the gate that opens where it fell. It bursts out in a fan toward you, 3.6 to 5.6 steps from the gate, so picking it up never brings up the "next floor?" question */
function lootFan(x, z, i, n) { const toP = typeof P !== 'undefined' && isFinite(P.x) ? Math.atan2(P.z - z, P.x - x) : rnd(6.28), spread = n > 1 ? 2.4 : 0, a0 = toP + (n > 1 ? (i / (n - 1) - .5) * spread : 0), R0 = 3.6 + (i % 3);
  for (const R of [R0, R0 - .6, R0 + .8, 3.4, 3]) for (const da of [0, .35, -.35, .8, -.8, 1.4, -1.4, 2.2, -2.2, 3.14]) { const a = a0 + da, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R; if (!blocked(px, pz, .4) && los(x, z, px, pz)) return [px, pz]; } return null; }
const DROP_MOB = .03, DRY_MAX = 20; /* build 0034 (Lee, Nov 14): loot is scarcer so each drop matters. Plain monsters 9% -> 3% and the dry-spell guarantee 14 -> 20 kills, which halves what plain monsters drop. Champions, guardians, goblins, vaults and wells stay the big loot moments */
function dropLoot(e) {
  const lv = Math.max(e.lvl, G.hero.level), x = e.x, z = e.z; let n = 0, bonus = 0, minR = 0;
  if (e.boss) { n = 5; bonus = 3; minR = 2; } else if (e.elite === 2) { n = 2; bonus = 1.5; minR = 2; } else if (e.elite === 1) { n = 1 + (Math.random() < .5 ? 1 : 0); bonus = .8; minR = 2; } /* build 0027: a champion's first item is always rare or better */ else if (e.arch === 'goblin') { n = 4; bonus = 2; minR = 2; for (let i = 0; i < 8; i++) dropGold(x, z, (15 + lv * 7) * rnd(.8, 1.3)); if (Math.random() < .2) dropItem(x, z, makeItem(lv, null, 3)); if (typeof UI !== 'undefined') UI.zoneBanner('Treasure Goblin caught!', 'Its whole sack spills out for you'); } else if (Math.random() < DROP_MOB || (G.dry || 0) >= DRY_MAX) n = 1; /* Lee, Nov 13: a guaranteed item after a dry spell (14 kills then, 20 since build 0034) */ G.dry = n ? 0 : (G.dry || 0) + 1;
  for (let i = 0; i < n; i++) { let r = rollRarity(bonus); if ((i === 0 || e.arch === 'goblin') && r < minR) r = minR; const sp = e.boss ? lootFan(x, z, i, n + 1) : null; if (sp) dropItem(sp[0], sp[1], makeItem(lv, null, r), true); else dropItem(x, z, makeItem(lv, null, r)); }
  if (e.boss || e.elite || Math.random() < .4) { const sp = e.boss ? lootFan(x, z, n, n + 1) : null, amt = (4 + lv * 2.2) * rnd(.6, 1.4) * (e.boss ? 12 : e.elite ? 4 : 1); if (sp) dropGold(sp[0], sp[1], amt, true); else dropGold(x, z, amt); }
}
// Bag: a 10 x 6 grid. Belts, rings and amulets take one cell; everything else is two cells tall.
function itemH(it) { return it.slot === 'belt' || it.slot === 'ring' || it.slot === 'amulet' ? 1 : 2; }
function bagOcc(inv, skip, skip2) { const o = new Array(inv.length).fill(null); inv.forEach((it, i) => { if (!it || it === skip || it === skip2) return; o[i] = it; if (itemH(it) === 2 && i + BAG_W < inv.length) o[i + BAG_W] = it; }); return o; }
function bagFits(i, it, occ) { if (i < 0 || i >= occ.length || occ[i]) return false; return itemH(it) === 1 || (i + BAG_W < occ.length && !occ[i + BAG_W]); }
function bagPut(inv, it, at) { const occ = bagOcc(inv); if (at !== undefined && bagFits(at, it, occ)) { inv[at] = it; return true; } for (let i = 0; i < inv.length; i++) if (bagFits(i, it, occ)) { inv[i] = it; return true; } return false; }
function sortBag(inv) { const o = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'pants', 'boots', 'belt', 'amulet', 'ring'], items = inv.filter(x => x).sort((a, b) => itemH(b) - itemH(a) || o.indexOf(a.slot) - o.indexOf(b.slot) || b.rar - a.rar || b.ilvl - a.ilvl || (a.name < b.name ? -1 : 1)); inv.fill(null); for (const it of items) bagPut(inv, it); SFX.play('pickup'); saveGame(); }
function bagFree() { return bagOcc(G.hero.inv).filter(x => !x).length; }
function addItem(it, at) { const inv = G.hero.inv; if (bagPut(inv, it, at)) return true; if (bagFree() < itemH(it)) return false; /* build 0062 (playtest): free cells were scattered, so tidy the bag (tall items first) and try again instead of saying it is full */ const items = inv.filter(x => x).sort((a, b) => itemH(b) - itemH(a)); inv.fill(null); const rows = Math.ceil(inv.length / BAG_W), cells = []; for (let r = rows - 2; r >= -1; r -= 2) for (let c = BAG_W - 1; c >= 0; c--) for (const rr of [r + 1, r]) if (rr >= 0 && rr < rows) cells.push(rr * BAG_W + c); for (const x of items) { if (itemH(x) === 2) bagPut(inv, x); else { const occ = bagOcc(inv), i = cells.find(j => j < inv.length && !occ[j]); if (i !== undefined) inv[i] = x; else bagPut(inv, x); } } if (typeof UI !== 'undefined') UI.invDirty = true; return bagPut(inv, it); }
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
function itemShards(it) { return Math.round([1, 2, 6, 25, 80][it.rar] * (1 + .25 * townLv('yard'))); }
function scrapItem(i) { const h = G.hero, it = h.inv[i]; if (!it) return; if (it.lock) { hint('That item is locked. Unlock it first to salvage it.'); return; } h.shards = (h.shards || 0) + itemShards(it); h.inv[i] = null; SFX.play('gold'); saveGame(); }
function scrapAll(maxRar) { const h = G.hero; let g = 0; h.inv.forEach((it, i) => { if (it && it.rar <= maxRar && !it.lock) { /* build 0046: locked items are never salvaged */ g += itemShards(it); h.inv[i] = null; } }); if (g) { h.shards = (h.shards || 0) + g; SFX.play('gold'); hint('Scrapped for ' + g + ' shards.'); saveGame(); } }
function dropFromInv(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.inv[i] = null; G.drops.push({ x: P.x + Math.sin(P.rot) * 1.6, z: P.z + Math.cos(P.rot) * 1.6, item: it, t: 0 }); SFX.play('pickup'); saveGame(); }

// ---------- hero ----------
function newHero(cls) {
  cls = CLASSES[cls] ? cls : 'warden'; const c = CLASSES[cls], sk = c.skills;
  const h = { v: 1, name: c.n, cls, level: 1, xp: 0, gold: 0, inv: new Array(BAG_N).fill(null), bagV: 2, eq: {}, bar: [sk[0], null, null, null], picks: [null, null, null, null], goals: {}, filter: 0, kills: 0, runs: 0, best: 0 };
  h.eq.weapon = makeItem(1, 'weapon', 0, c.w); applyKit(h); return h;
}
function calcStats(eq, noBuff) { /* build 0090: noBuff leaves out skill buffs, so item comparisons don't shift while War Cry and the like are up */
  const h = G.hero, c = CLASSES[h.cls], s = {}; for (const k in STATS) s[k] = 0;
  const uk = Math.pow(1.11, h.level) * .7; let wmin = Math.max(1, Math.round(3 * uk)), wmax = Math.max(2, Math.round(5 * uk)), wspd = 1.3, arm = 0; // bare fists until a weapon says otherwise
  for (const sl of SLOTS) {
    const it = eq[sl]; if (!it) continue; if (it.dmg) { wmin = it.dmg[0]; wmax = it.dmg[1]; wspd = it.spd; } if (it.armor) arm += it.armor;
    for (const a of it.aff) s[a.k] = (s[a.k] || 0) + a.v; if (it.power) { const p = POWERS[it.power].s; for (const k in p) s[k] = (s[k] || 0) + p[k]; }
  }
  if (!noBuff) for (const b of P.buffs) for (const k in b.s) s[k] = (s[k] || 0) + b.s[k];
  const pg = h.pg || {}; s.dmg += pg.dmg || 0; s.lifePct += pg.life || 0; s.armorPct += (pg.armor || 0) * 2; s.critDmg += (pg.crit || 0) * 2; s.mf += pg.mf || 0; s.ms += Math.min(25, pg.ms || 0);
  { const ts = talBuild().s; for (const k in ts) s[k] = (s[k] || 0) + ts[k]; } /* build 0074: talent cards */
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
/* 0032: what unique effects (and the affixes that share them) are worth, so the upgrade arrows and tooltips count them. Returned as extra fractions of damage (d) and toughness (t), weighted by the skills on your bar */
function effectWorth(s) { const h = G.hero, bar = ((h && h.bar) || []).map((id, i) => [SKILLS[id], i]).filter(x => x[0]); let W = 0, pj = 0, ar = 0, cd = 0;
  for (const [k, i] of bar) { const w = i === 0 ? 2 : 1; W += w; if (k.type === 'proj' || k.type === 'barrage') pj += w; if (/nova|rain|spin|melee/.test(k.type)) ar += w; if (k.cd) cd += w; }
  W = W || 1; pj /= W; ar /= W; cd /= W; const g = k => s[k] || 0; let d = 0, t = 0;
  d += g('projExtra') * .25 * pj; d += g('echo') / 100 * .8; d += g('procLight') / 100 * .75; d += g('lowLife') / 100 * .3; d += (g('boomFire') ? .12 : 0) + (g('boomCold') ? .12 : 0);
  d += g('area') / 100 * .45 * ar; d += 1 / (1 - Math.min(50, g('cull')) / 100) - 1; d += (s.cdrT || 0) / 100 * .5 * cd; d += Math.min(80, g('ms')) / 100 * .15;
  t += g('leech') * .03 + (g('cheat') ? .35 : 0);
  /* build 0090 (Lee: every stat counts): elemental damage for the other skills on the bar, not only the first one */
  { const inc = k => 1 + (g('dmg') + g(k.el || 'phys') + (k.el && k.el !== 'phys' ? g('ele') : 0)) / 100, b0 = bar.find(x => x[1] === 0); if (b0) { const i0 = inc(b0[0]); for (const [k, i] of bar) if (i > 0 && k.el && k.m) d += (1 / W) * (inc(k) / i0 - 1); } }
  /* life regen, life on hit and thorns keep you alive; cooldown helps any bar a little; movement also helps you get out of the way */
  const ml = Math.max(1, s.maxLife || 1), aps = (s.wspd || 1) * (1 + g('aspd') / 100);
  t += g('lifeRegen') / ml * 3 + g('lifeOnHit') * aps / ml * 2 + g('thorns') / ml * .3 + Math.min(80, g('ms')) / 100 * .1; d += (s.cdrT || 0) / 100 * .1;
  /* finding loot, gold and experience: worth less than damage or life, but never nothing */
  const u = g('mf') * .002 + g('gf') * .0015 + g('xp') * .01;
  return { d, t, u }; }
function gearValue(s) { const w = effectWorth(s); return { dps: s.dps * (1 + w.d), tough: s.tough * (1 + w.t), util: 1 + w.u }; }
/* build 0090: the one comparison behind the bag arrows, the tooltip, the Trader and the pet. Every stat on both items counts: damage, toughness and finding (magic find, gold find, experience) */
function gearCmp(eqA, eqB) { const a = gearValue(calcStats(eqA, 1)), b = gearValue(calcStats(eqB, 1)), L = (x, y) => Math.log(Math.max(1, x) / Math.max(1, y)), d = L(b.dps, a.dps), t = L(b.tough, a.tough), u = Math.log(b.util / a.util); return { d, t, u, v: d + t + u, a, b }; }
function itemCmp(it) { const eq = Object.assign({}, G.hero.eq); eq[it.slot === 'ring' ? 'ring1' : it.slot] = it; return gearCmp(G.hero.eq, eq); }
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
    floatText(P.x, 3, P.z, 'LEVEL ' + h.level, '#ffd84a', 1.8, 22); { computeStats(); hint('Level ' + h.level + '! More life, harder hits. Life and ' + CLASSES[h.cls].res.n + ' refilled.'); const nt = TIER_LV.find(l => l > h.level); if (nt && skillTiers(h.cls)[TIER_LV.indexOf(nt)]) hint('Next skill choice at level ' + nt + '.'); } applyKit(h, true); if (TAL_LV.includes(h.level)) hint('New talent cards at level ' + h.level + '! Open Skills to pick one.'); /* build 0074 */
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
      if (h.allyEq) { for (const k in h.allyEq) { const it = h.allyEq[k]; if (!it) continue; rd(it); if (bagPut(h.inv, it)) continue; const st = G.stash, si = st ? st.indexOf(null) : -1; if (si >= 0) { st[si] = it; try { localStorage.setItem(SAVE_KEY + '_stash', JSON.stringify(st)); } catch (e) { } } else h.gold += itemValue(it); } delete h.allyEq; } /* 0031: gear the Sellsword wore comes back to you (bag, then stash) */
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
  dist = bfs(c, s);
  { /* build 0071 (Lee's playtest): the main road from the start to the guardian is never a one-cell squeeze between trees; pinch points are opened to three cells */
    let k = by * GW + bx, prev = -1, guard = 0; while (dist[k] > 0 && guard++ < GW * GW) { let nk = -1; for (const d of [-1, 1, -GW, GW]) { const n = k + d; if (n >= 0 && n < GW * GW && dist[n] === dist[k] - 1) { nk = n; break; } } if (nk < 0) break;
      const horiz = Math.abs(nk - k) === 1, x = k % GW, y = k / GW | 0, side = horiz ? [-GW, GW] : [-1, 1];
      if (side.every(d => c[k + d])) for (const d of side) { const n = k + d, nx = n % GW, ny = n / GW | 0; if (nx > 0 && ny > 0 && nx < GW - 1 && ny < GW - 1) c[n] = 0; }
      prev = k; k = nk; }
    dist = bfs(c, s); }
  Z.dist = dist; Z.start = [(s % GW + .5) * CS, ((s / GW | 0) + .5) * CS]; Z.bossAt = [(bx + .5) * CS, (by + .5) * CS];
  const cand = []; for (let i = 0; i < GW * GW; i++) if (!c[i] && dist[i] > 8 && Math.hypot(i % GW - bx, (i / GW | 0) - by) > 8) cand.push(i);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(sr() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  const packs = [], N = 24; for (const k of cand) { if (packs.length >= N) break; if (packs.every(q => Math.hypot(q % GW - k % GW, (q / GW | 0) - (k / GW | 0)) >= 5)) packs.push(k); }
  Z.packs = packs; const W = i => [(i % GW + .5) * CS, ((i / GW | 0) + .5) * CS];
  const rest = cand.filter(k => !packs.includes(k));
  for (let i = 0; i < 4 && i < rest.length; i++) { const p = W(rest[i]); Z.objs.push({ kind: 'chest', x: p[0], z: p[1], name: 'Chest', used: false }); }
  for (let i = 4; i < 6 && i < rest.length; i++) { const p = W(rest[i]); const sh = SHRINES[Math.floor(sr() * SHRINES.length)]; Z.objs.push({ kind: 'shrine', x: p[0], z: p[1], name: sh.n, sh, used: false }); }
  { const ev = sr(); if (Z.def.type === 'zone' && rest.length > 40) { const far = rest.slice(22).filter(k => Z.dist && Z.dist[k] > 12); const k = far[(sr() * far.length) | 0]; if (k !== undefined) { const p = W(k); if (ev < .33) Z.objs.push({ kind: 'well', x: p[0], z: p[1], name: 'Wishing Well', used: false }); else if (ev < .58) { Z.vault = { x: p[0], z: p[1] }; for (const [ox, oz] of [[-.85, -.85], [.85, -.85], [-.85, .85], [.85, .85]]) Z.objs.push({ kind: 'gchest', x: p[0] + ox, z: p[1] + oz, name: 'Golden Chest', used: false }); } } } } /* build 0027: a happy surprise on most floors */
  for (let i = 6; i < 22 && i < rest.length; i++) { const p = W(rest[i]); Z.lamps.push({ x: p[0] + (sr() - .5), z: p[1] + (sr() - .5) }); }
  Z.lamps.push({ x: Z.start[0] + 2.5, z: Z.start[1] - 2, big: 1 });
  if (Z.def.type === 'zone' && !Z.def.rift && (Z.def.depth || 1) > 1) { /* build 0062 (playtest): the gate back to the previous floor was never placed; it now stands just behind where you arrive */
    let bk = -1, bd = 1e9; for (let i = 0; i < GW * GW; i++) if (!c[i] && (dist[i] === 2 || dist[i] === 3)) { const d = (i / GW | 0) * 10 + Math.hypot(i % GW - corner[0], (i / GW | 0) - corner[1]) * .1; if (d < bd) { bd = d; bk = i; } } /* up-screen of the start, so it never stands between the camera and the hero */
    if (bk >= 0) { const p = W(bk); Z.objs.push({ kind: 'pback', x: p[0], z: p[1], name: 'Previous floor', used: false }); } }
  return Z;
}
const LOWQ = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
function shade(c, f, g, b) { const r = [c[0] * f, c[1] * (g || f), c[2] * (b || f)]; if (c.mt) r.mt = c.mt; return r; } // a shaded colour keeps its material (build 0036)
// build 0046: scenery from Lee's three free packs (village, props, nature). It loads after the game starts; until it arrives, or if a phone can't draw it, the old scenery stays
const ENV_ON = !(typeof location !== 'undefined' && /[?&]scenery=0/.test(location.search)), ENV_W = [1, 1, 1];
function buildStatic(Z) { Z.torches = [];
  GLX.statBegin(); const th = Z.th, S = GW * CS, c = Z.cell, col = GLX.col;
  const EV = ENV_ON && !!GLX.envOn && GLX.envOn() && (Z.def.type === 'town' || th.wall === 'tree'), Mx = (n, x, y, z, ry, s, cc, sy) => GLX.obj('stat', 'm:' + n, x, y, z, ry, s, sy || s, s, cc || ENV_W, 0, 1, 0);
  if (ENV_ON && GLX.envLoad && GLX.envInfo && (GLX.envInfo().state === 'off' || GLX.envInfo().state === 'loading') && (Z.def.type === 'town' || th.wall === 'tree')) GLX.envLoad('env/', BUILD).then(ok => { const z2 = G.zone; if (ok && z2 && z2.th && (z2.def.type === 'town' || z2.th.wall === 'tree')) buildStatic(z2); });
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
  const rock = (x, z, r) => { if (EV) { const ry = sr() * 6.28, rn = 'Rock_Medium_' + (1 + (sr() * 3 | 0)), rs = r * (.42 + sr() * .2), rc = shade([.78, .76, .72], .85 + sr() * .3); if (!(Z.def.type === 'town' && Math.hypot(x - (GW / 2 * CS - 6.5), z - (GW / 2 * CS + 10.5)) < 2.6)) Mx(rn, x, -.12 * r, z, ry, rs, rc); /* keep the Training Dummy's spot clear */ if (r > .8 && sr() < .4) Mx('Fern_1', x + r * .6, 0, z + r * .3, ry, .3 + sr() * .1); return; } const ry = sr() * 6.28, w = r * (.8 + sr() * .6), hh = r * (.5 + sr() * .4), d = r * (.8 + sr() * .5); GLX.obj('stat', 'blob', x, hh * .44, z, ry, w, hh, d, shade(stone, .7 + sr() * .5), 0, 1, 3); if (r > .8 && sr() < .7) GLX.obj('stat', 'blob', x, hh * .8, z, ry, w * .8, hh * .35, d * .8, shade(leaf[2], .9 + sr() * .3), 0, 1, 2); if (r > 1 && sr() < .5) GLX.obj('stat', 'blob', x + w * .5, hh * .25, z + d * .3, ry + 1, w * .5, hh * .5, d * .5, shade(stone, .6 + sr() * .4), 0, 1, 3); };
  // build 0075: in town nothing grows through buildings, stalls, the paved square or its paths
  const TC = Z.def.type === 'town' ? (() => { const c = GW / 2 * CS, K = [[0, 0, 10.6], [-8.8, -14.6, 4.9], [8.8, -15, 4.4], [-.4, -18.4, 3], [-15.6, -9.6, 3.8], [15.6, -9.6, 3.8], [-17.2, 4.8, 3.2], [0, -13, 2.2], [-13, -3.2, 3.2], [13, -2, 4.4], [17.5, 5.5, 2.2], [11.6, 4.4, 1.7], [6.5, 6, 1.6], [6.5, 10.5, 1.5], [-11.5, 11, 3.2], [-4.4, 13.4, 1.4], [4.6, 13.2, 1.5], [-18.5, -.4, 2.4], [12.6, -12, 1.6], [-11, 14.6, 1.3], [-8.6, 14.6, 1.3], [-6.2, 14.6, 1.3], [8.2, 15.4, 2.8], [15.6, 10.6, 1.9], [-7.2, 4.4, 1.4], [0, 12, 1.6], [0, 14, 2]];
    return (x, z) => { const dx = x - c, dz = z - c; for (const k of K) if ((dx - k[0]) * (dx - k[0]) + (dz - k[1]) * (dz - k[1]) < k[2] * k[2]) return true; return (Math.abs(dx) < 1.5 && dz > -13 && dz < 15) || (Math.abs(dz + 2) < 1.5 && Math.abs(dx) < 13); }; })() : null;
  const grass = (x, z, n, sp) => { n = Math.max(1, Math.round(n / 4)); for (let k = 0; k < n; k++) { const h = .2 + sr() * .26, w = .5 + sr() * .45, gx = x + (sr() - .5) * sp, gz = z + (sr() - .5) * sp, gr = sr() * 6.28, gc = shade(grassC[sr() * 4 | 0], .9 + sr() * .35); if (TC && TC(gx, gz)) continue; GLX.obj('stat', 'tuft', gx, h * .5, gz, gr, w, h, w, gc, 0, 1, 5); } };
  const fern = (x, z) => { if (EV) { Mx('Fern_1', x, 0, z, sr() * 6.28, .32 + sr() * .14, shade([.9, .95, .85], .85 + sr() * .3)); return; } const fc = shade(leaf[2], 1 + sr() * .5), n = 6 + (sr() * 3 | 0); for (let k = 0; k < n; k++) { const a = k / n * 6.28 + sr() * .4; lay('blade', x + Math.cos(a) * .32, .26, z + Math.sin(a) * .32, -a + HP, 1.05 + sr() * .2, 0, .34, 1.0 + sr() * .4, .05, fc, 2); } };
  const shroom = (x, z) => { if (EV) { for (let k = 0; k < 2; k++) { const a = x + (sr() - .5) * .8, b = z + (sr() - .5) * .8, c = sr() * 6.28, d = .8 + sr() * .5; if (!LOWQ || !k) Mx('Mushroom_Common', a, 0, b, c, d); } return; } /* phones draw one mushroom a spot */ for (let k = 0; k < 3; k++) { const mx = x + (sr() - .5) * .7, mz = z + (sr() - .5) * .7, mh = .14 + sr() * .2; GLX.obj('stat', 'cyl', mx, mh / 2, mz, 0, .06, mh, .06, col(0xd8d0c0)); GLX.obj('stat', 'blob', mx, mh + .03, mz, 0, .22 + sr() * .14, .13, .22 + sr() * .14, col(sr() < .5 ? 0x9a3a2a : 0xb08a4a), 0, 1, 0); } };
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
        let ox = 0, oz = 0; if (near === 1) { for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < GW && yy < GW && !c[yy * GW + xx]) { ox -= i; oz -= j; } } const ol = Math.hypot(ox, oz) || 1; ox = ox / ol * .75; oz = oz / ol * .75; } /* build 0071: trees at the edge of a path lean back into the woods, so the way through stays visible */
        const jx = wx + ox + (sr() - .5) * 1.1, jz = wz + oz + (sr() - .5) * 1.1, tr = sr();
        if (EV && near === 1 && sr() < (LOWQ ? .35 : .75)) { const ry = sr() * 6.28, v = sr(), lc = shade([.92, .96, .9], .8 + sr() * .35); // build 0046: real trees where you can see them; deeper rows stay simple to keep phones smooth
          if (tr < .5) Mx(['Pine_1', 'Pine_2', 'Pine_3', 'Pine_5'][v * 4 | 0], jx, 0, jz, ry, 1.25 + sr() * .45, lc); else if (tr < .92) Mx('CommonTree_' + (1 + (v * 4 | 0)), jx, 0, jz, ry, 1.05 + sr() * .4, lc); else Mx('DeadTree_' + (1 + (v * 3 | 0)), jx, 0, jz, ry, .8 + sr() * .25, shade(lc, .8)); }
        else if (tr < .58) pine(jx, jz); else if (tr < .93) broad(jx, jz); else dead(jx, jz);
        if (near === 1 && sr() < .45) pine(wx + ox * 1.3 + (sr() - .5) * 1.4, wz + oz * 1.3 + (sr() - .5) * 1.4);
        if (sr() < .55) { const r = 1 + sr() * .8; if (EV && near === 1) { const bn = sr() < .25 ? 'Bush_Common_Flowers' : 'Bush_Common', bx = wx + (sr() - .5) * 2.4, bz = wz + (sr() - .5) * 2.4, br = sr() * 6.28, bc = shade([.9, .95, .88], .8 + sr() * .3); if (!LOWQ || ((Math.abs(wx * 7.3 + wz * 13.1) | 0) % 10) > 2) Mx(bn, bx, 0, bz, br, r * 1.25, bc); } /* phones skip about a third of the bushes */ else GLX.obj('stat', 'blob', wx + (sr() - .5) * 2.4, r * .35, wz + (sr() - .5) * 2.4, sr() * 6, r * 1.3, r, r * 1.2, shade(leaf[sr() * 3 | 0], .7 + sr() * .4), 0, 1, 2); }
        if (sr() < .3) rock(wx + (sr() - .5) * 2.4, wz + (sr() - .5) * 2.4, 1 + sr() * 1.4);
        if (near === 1) { grass(wx, wz, gN >> 1, CS); if (!LOWQ && sr() < .45) fern(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2); if (!LOWQ && sr() < .3) litter(wx, wz); if (sr() < .15) shroom(wx + (sr() - .5) * 2, wz + (sr() - .5) * 2); }
      } else { const h = 2.6 + sr() * 2, wc = col(th.wc[x * 7 + y * 3 & 1]), T = Z.def.theme; GLX.obj('stat', 'box', wx, h / 2, wz, 0, CS, h, CS, wc, 0, 1, (T === 'crypt' ? 11 : T === 'lava' ? 12 : T === 'void' ? 13 : T === 'ice' ? 14 : 3)); // build 0056: crypt walls are coursed stone
        if (near === 1) { // each region dresses its walls differently
          if (T === 'lava' || T === 'void' || T === 'ice') { const wm = T === 'lava' ? 12 : T === 'void' ? 13 : 14; if (T !== 'ice') GLX.obj('stat', 'box', wx, h + .1, wz, 0, CS + .14, .2, CS + .14, shade(wc, 1.08), 0, 1, wm); GLX.obj('stat', 'box', wx, .2, wz, 0, CS + .14, .4, CS + .14, shade(wc, .82), 0, 1, wm); if (T !== 'ice' && sr() < .25) GLX.obj('stat', T === 'void' ? 'gem' : 'cone', wx + (sr() - .5) * 1.2, h + (T === 'void' ? .8 : .5), wz + (sr() - .5) * 1.2, sr() * 6, .8, T === 'lava' ? 1 : 1.4, .8, shade(wc, .9), 0, 1, wm); } /* build 0059: lava and void walls get a cap, a plinth and a few jagged crowns */
          if (T === 'crypt') { GLX.obj('stat', 'box', wx, h + .12, wz, 0, CS + .2, .24, CS + .2, shade(wc, 1.1), 0, 1, 11); GLX.obj('stat', 'box', wx, .22, wz, 0, CS + .16, .44, CS + .16, shade(wc, .8), 0, 1, 11); if (sr() < .4) for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * .9, h + .5, wz, 0, .7, .6, CS, shade(wc, .9), 0, 1, 11); if (sr() < .22) { GLX.obj('stat', 'cyl', wx, h + 1.4, wz, 0, .7, 2.6, .7, shade(wc, 1.3), 0, 1, 11); GLX.obj('stat', 'cyl', wx, h + 2.8, wz, 0, 1, .24, 1, shade(wc, 1.1), 0, 1, 11); } if (sr() < .2) { GLX.obj('stat', 'box', wx, 1.9, wz + CS * .5 + .1, 0, .12, .5, .16, col(0x3a2a1a), 0, 1, 3); GLX.obj('stat', 'cone', wx, 2.22, wz + CS * .5 + .2, 0, .2, .14, .2, col(0x2a2018), 0, 1, 4); (Z.torches = Z.torches || []).push([wx, 2.42, wz + CS * .5 + .22]); } /* build 0024: warm torches, drawn live so they flicker */ }
          else if (T === 'lava') { for (let k = 0; k < 3; k++) GLX.obj('stat', 'taper', wx + (sr() - .5) * 2.2, h + .7 + sr(), wz + (sr() - .5) * 2.2, sr() * 6, .9 + sr(), 1.8 + sr() * 2, .9 + sr(), shade(wc, .7 + sr() * .4), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'box', wx + (sr() - .5) * 2, h * .5, wz + CS * .5 + .03, sr() - .5, .1, h * .7, .04, col(0xff5a1a), 1.6); }
          else if (T === 'ice') { const n = 2 + (sr() * 4 | 0); for (let k = 0; k < n; k++) { const hh = 1.4 + sr() * 2.8, w = .35 + sr() * .35; GLX.obj('stat', 'blade', wx + (sr() - .5) * 2.4, h + .1 + hh / 2, wz + (sr() - .5) * 2.4, sr() * 6, w, hh, w * (.8 + sr() * .4), col([0x7aa8c8, 0x5a8cb4, 0x9ac4dc, 0x6a9ac0][k & 3]), .12 + sr() * .1, 1, 0); } /* build 0060: ice walls grow clusters of faceted crystal shards */ GLX.obj('stat', 'blob', wx, h + .05, wz, sr() * 6, CS * 1.06, .36, CS * 1.06, col(0x6e7a8a), 0, 1, 0); }
          else { GLX.obj('stat', 'taper', wx, h + 1.6, wz, sr() * 6, 1.2, 3.4, 1.2, shade(wc, .8), 0, 1, 3); if (sr() < .5) GLX.obj('stat', 'gem', wx, h + 4 + sr(), wz, sr() * 6, .4, .7, .4, col(0xb060ff), 1.8); if (sr() < .4) GLX.obj('stat', 'box', wx, h * .55, wz + CS * .5 + .03, 0, .5, .5, .04, col(0xff80ff), 1.4); }
        } }
    } else {
      if (Z.def.theme === 'crypt') { const stn0 = col(th.wc[0]); for (let q = 0; q < 4; q++) { if (sr() < .14) continue; const qx = wx + ((q & 1) - .5) * 1.48, qz = wz + ((q >> 1) - .5) * 1.48; GLX.obj('stat', 'box', qx, .025, qz, (sr() - .5) * .08, 1.38, .05 + sr() * .03, 1.38, shade(stn0, .78 + sr() * .3), 0, 1, 0); } grass(wx, wz, gN >> 3, CS); } /* build 0024: flagstones, not a lawn */
      else grass(wx, wz, gN, CS); const r = sr(); if (!LOWQ && sr() < .16) { if (TC && TC(wx, wz)) { for (let k = 0; k < 30; k++) sr(); } else litter(wx, wz); } if (!LOWQ && sr() < .05) { const fx = wx + (sr() - .5) * 2, fz = wz + (sr() - .5) * 2; if (!(TC && TC(fx, fz))) fern(fx, fz); }
      if (Z.def.theme === 'crypt' && (r <= .07 || r >= .23) && sr() < .1) { const px = wx + (sr() - .5) * 2, pz = wz + (sr() - .5) * 2; if (sr() < .5) for (let k = 0; k < 3; k++) { const cx2 = px + (sr() - .5) * .6, cz2 = pz + (sr() - .5) * .6, ch = .15 + sr() * .3; GLX.obj('stat', 'cyl', cx2, ch / 2, cz2, 0, .1, ch, .1, col(0xe8e0c8), 0); GLX.obj('stat', 'sphere', cx2, ch + .07, cz2, 0, .07, .12, .07, col(0xffb03a), 2.4); } else { for (let k = 0; k < 5; k++) GLX.obj('stat', 'cyl', px + (sr() - .5) * .8, .05, pz + (sr() - .5) * .8, sr() * 6, .07, .07, .5 + sr() * .4, col(0xd0c8b0), 0); GLX.obj('stat', 'sphere', px, .16, pz, sr() * 6, .26, .24, .28, col(0xd8d0b8), 0); } }
      if (r > .07 && r < .23 && Z.def.theme !== 'forest' && Z.def.theme !== 'town') { // region props instead of forest ones
        const T = Z.def.theme, px = wx + (sr() - .5) * 1.6, pz = wz + (sr() - .5) * 1.6, ry = sr() * 6.28, stn = col(th.wc[0]);
        if (T === 'crypt') { if (r < .12) { const hh = .9 + sr() * .7; GLX.obj('stat', 'box', px, hh / 2, pz, ry, .9, hh, .22, shade(stn, 1.2), 0, 1, 11); GLX.obj('stat', 'cyl', px, hh, pz, ry, .9, .22, .9, shade(stn, 1.2), 0, 1, 11); GLX.obj('stat', 'box', px, .08, pz, ry, 1.3, .16, .7, shade(stn, .8), 0, 1, 11); GLX.obj('stat', 'box', px + Math.sin(ry) * .12, hh * .6, pz + Math.cos(ry) * .12, ry, .5, .08, .03, shade(stn, .6), 0, 1, 11); }
          else if (r < .15) { const n = 2 + (sr() * 3 | 0); for (let k = 0; k < n; k++) GLX.obj('stat', 'cyl', px, .3 + k * .6, pz, ry + k, 1 - k * .04, .6, 1 - k * .04, shade(stn, 1.1 + (k % 2) * .15), 0, 1, 11); GLX.obj('stat', 'cyl', px + 1.2, .3, pz + .5, 1.2, .9, 1.4, .9, shade(stn, 1), 0, 1, 11); }
          else if (r < .19) { for (let k = 0; k < 6; k++) GLX.obj('stat', 'cyl', px + (sr() - .5), .06, pz + (sr() - .5), sr() * 6, .08, .08, .7 + sr() * .4, col(0xd8d0b8), 0); GLX.obj('stat', 'sphere', px, .2, pz, ry, .34, .3, .36, col(0xd8d0b8), 0); GLX.obj('stat', 'sphere', px + .06, .2, pz + .14, ry, .08, .1, .06, col(0x1a1a1a), 0); }
          else if (r < .21) { GLX.obj('stat', 'box', px, .45, pz, ry, 2.4, .9, 1.1, shade(stn, 1.05), 0, 1, 11); GLX.obj('stat', 'box', px, .98, pz, ry + .12, 2.6, .18, 1.3, shade(stn, 1.3), 0, 1, 11); }
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
      else if (r < .23 && EV) Mx(sr() < .5 ? 'Flower_3_Group' : 'Flower_4_Group', wx + (sr() - .5) * 1.6, 0, wz + (sr() - .5) * 1.6, sr() * 6.28, .38 + sr() * .16);
      else if (r < .23) { const fc = col([0xd8c84a, 0xc86a8a, 0xe8e0d0][sr() * 3 | 0]); for (let k = 0; k < 4; k++) { const fx = wx + (sr() - .5) * 1.6, fz = wz + (sr() - .5) * 1.6; GLX.obj('stat', 'blade', fx, .22, fz, 0, .04, .44, .04, grassC[0], 0, 1, 2); GLX.obj('stat', 'sphere', fx, .46, fz, 0, .14, .1, .14, fc, .15, 1, 0); } }
    }
  }
  for (const L of Z.lamps) {
    const lx = Math.floor(L.x / CS / 6), lz = Math.floor(L.z / CS / 6); GLX.statChunk(lx + '_' + lz, (lx * 6 + 3) * CS, (lz * 6 + 3) * CS);
    if (L.big) { GLX.obj('stat', 'taper', L.x, .5, L.z, 0, 1, 1, 1, col(0x4a4a4e), 0, 1, 3); GLX.obj('stat', 'cyl', L.x, 1.02, L.z, 0, .8, .1, .8, col(0x2a2a2e), 0, 1, 4); GLX.obj('stat', 'cone', L.x, 1.4, L.z, 0, .5, .8, .5, col(0xff9a3a), 2.4); }
    else { for (let k = 0; k < 3; k++) { const mx = L.x + (sr() - .5) * .7, mz = L.z + (sr() - .5) * .7, mh = .2 + sr() * .3; GLX.obj('stat', 'cyl', mx, mh / 2, mz, 0, .08, mh, .08, col(0xd8d0c0)); GLX.obj('stat', 'sphere', mx, mh + .04, mz, 0, .3 + sr() * .2, .16, .3 + sr() * .2, col(th.lamp), 1.5); } }
  }
  if (Z.def.type === 'town') {
    GLX.statChunk('all', 0, 0, true); const wood = col(0x5a4028), cloth = col(0x7a2a22), canvas2 = col(0xb8a888), stn = col(0x6a6a6e); townDecor(Z);
    for (const o of Z.objs) {
      if (o.kind === 'vendor') { for (const sx of [-1.6, 1.6]) for (const sz of [-1.2, 1.2]) GLX.obj('stat', 'cyl', o.x + sx, 1.4, o.z + sz - 1.6, 0, .16, 2.8, .16, wood, 0, 1, 3); GLX.obj('stat', 'box', o.x, 2.9, o.z - 1.6, 0, 4, .12, 3.2, cloth); GLX.obj('stat', 'box', o.x, .5, o.z - .2, 0, 3.4, 1, .9, wood, 0, 1, 3); GLX.obj('stat', 'box', o.x - 1, 1.15, o.z - .2, .3, .5, .3, .5, canvas2); GLX.obj('stat', 'sphere', o.x + .9, 1.2, o.z - .2, 0, .4, .4, .4, col(0xc9a030), 0, 1, 4); GLX.obj('stat', 'box', o.x - 2.6, .5, o.z - 2, .4, 1, 1, 1, wood, 0, 1, 3); }
      else if (o.kind === 'stash') { GLX.obj('stat', 'box', o.x, .7, o.z, 0, 2.6, 1.4, 1.5, wood, 0, 1, 3); GLX.obj('stat', 'cyl', o.x, 1.4, o.z, 0, 2.6, .5, 1.5, wood, 0, 1, 3); for (const sx of [-1, 0, 1]) GLX.obj('stat', 'box', o.x + sx * 1.1, .9, o.z, 0, .18, 1.9, 1.56, col(0x8a6a2a), 0, 1, 4); GLX.obj('stat', 'box', o.x, .9, o.z + .78, 0, .4, .5, .08, col(0xc9a030), .1, 1, 4); }
      else if (o.kind === 'altar') { GLX.obj('stat', 'cyl', o.x, .15, o.z, 0, 3.4, .3, 3.4, stn, 0, 1, 3); GLX.obj('stat', 'taper', o.x, .9, o.z, 0, 1.6, 1.2, 1.6, stn, 0, 1, 3); GLX.obj('stat', 'cyl', o.x, 1.56, o.z, 0, 1.9, .14, 1.9, col(0x4a4a50), 0, 1, 4); GLX.obj('stat', 'cyl', o.x, 1.7, o.z, 0, 1.2, .2, 1.2, col(0xc9a030), .2, 1, 4); }
    }
    { // Emberwatch: a walled camp-town. Tall things stand on the far (north) side so nothing hides the people in front.
      const cx = Z.bossAt[0], cz = Z.bossAt[1], cob = col(0x56524c), cob2 = col(0x625c54), thatch = col(0x8a6a34), plaster = col(0xb8a888), red = col(0x7a2a22), blue = col(0x2a4a7a), iron = col(0x3a3c44);
      /* build 0075 (Lee, Nov 15: make the ground neat and tidy): the square is laid in three even rings of flagstones inside a pale kerb, instead of scattered blotches, and each path is a straight paved strip with its own kerbs running from the square to the stash, the trader, the altar and the gate */
      GLX.obj('stat', 'cyl', cx, .04, cz, 0, 20.4, .08, 20.4, shade(cob, .82), 0, 1, 3); { const kerb = col(0x8a857c);
        for (const [R, n] of [[3.3, 12], [6, 22], [8.7, 32]]) for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + R * .37; GLX.obj('stat', 'box', cx + Math.cos(a) * R, .085, cz + Math.sin(a) * R, 1.5708 - a, 6.2832 * R / n - .16, .05, 2.4, k % 2 ? cob2 : shade(cob2, .88), 0, 1, 3); }
        for (let k = 0; k < 56; k++) { const a = k / 56 * 6.2832; GLX.obj('stat', 'box', cx + Math.cos(a) * 10.25, .12, cz + Math.sin(a) * 10.25, -a, .42, .24, 1.08, k % 2 ? kerb : shade(kerb, .9), 0, 1, 3); }
        for (const o of Z.objs) { if (o.kind !== 'stash' && o.kind !== 'vendor' && o.kind !== 'altar' && o.kind !== 'tportal') continue; const dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz), r0 = 10.3, r1 = d - (o.kind === 'tportal' ? -1.5 : 1), m = (r0 + r1) / 2, L = r1 - r0; if (L < .6) continue; const ux = dx / d, uz = dz / d;
          GLX.obj('stat', 'box', cx + ux * m, .07, cz + uz * m, a, 2.4, .06, L, cob2, 0, 1, 3); for (const sd of [-1, 1]) GLX.obj('stat', 'box', cx + ux * m + uz * sd * 1.3, .1, cz + uz * m - ux * sd * 1.3, a, .2, .12, L, kerb, 0, 1, 3); } }
      for (let k = 0; k < 44; k++) { const a = k / 44 * 6.2832; if (Math.abs(a - 1.5708) < .22) continue; const px = cx + Math.cos(a) * 20.6, pz = cz + Math.sin(a) * 20.6; GLX.obj('stat', 'taper', px, 1.1, pz, a, .34, 2.2 + (k % 3) * .25, .34, wood, 0, 1, 3); GLX.obj('stat', 'box', px, 1.2, pz, -a, .12, .16, 3, shade(wood, .8), 0, 1, 3); }
      // ---- Emberwatch homes (build 0020): every building is different, and the town grows livelier as you help its people ----
      const gold = col(0xc9a030), steelC = col(0x8e97a8), bladeC = col(0xc8ced8);
      const done = (G.hero && G.hero.tqd) || [], has = id => !TOWN_QUESTS || done.includes(id), slate = col(0x3a4a5a), stoneW = col(0x7a746a), stoneD = col(0x5a5650), dark = shade(wood, .6), glass = col(0xffc870), flowerC = [0xe84a6a, 0xffd04a, 0xb070e0, 0xff8a3a, 0xf0f0f0];
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
      // build 0046: with the village pack loaded, the inn and both cottages are real buildings: stone and plaster walls, tiled roofs, lit windows
      const HS = 1.15, ROOF = { red: [.62, .4, .36], slate: [.42, .47, .55], brown: [.62, .5, .4] }, WALL = [.86, .84, .8];
      const lamp2 = (F, ry, lx, lz) => { const p = F(lx, lz); Mx('Lantern_Wall', p[0], 1.1, p[1], ry, 1.1); const q = F(lx, lz + 1.05); GLX.obj('stat', 'sphere', q[0], 1.95, q[1], 0, .16, .2, .16, glass, 1.6); };
      if (EV) { const hx = cx - 8.8, hz = cz - 14.6, ry = .3, F = W(hx, hz, ry), fz = 2 * HS + .1; solid(hx, hz, 3 * HS + .3, 2 * HS + .3, ry); Mx('inn', hx, 0, hz, ry, HS, WALL); Mx('inn_roof', hx, 0, hz, ry, HS, ROOF.red);
        for (const lx of [-1.6, 1.6]) { const p = F(lx * HS, -1 * HS); Z.smoke.push([p[0], (6.24 + .3 + 3.18) * HS, p[1]]); } lamp2(F, ry, -1.05, fz); lamp2(F, ry, 1.05, fz);
        Bx('box', F, ry, 3.2, 3.0, fz + .2, 1.2, .08, .08, iron); Bx('box', F, ry, 3.6, 2.55, fz + .2, .9, .7, .08, col(0x3a2a1a)); Bx('cyl', F, ry, 3.6, 2.55, fz + .26, .28, .36, .28, col(0xe0a030), 0, 1.5708); // sign: a frothy mug
        for (const sx of [-2.4, 2.4]) { const p = F(sx, fz + 1.3); Mx('Bench', p[0], 0, p[1], ry, 1.05); }
        for (const [bx, bz] of [[3.9, fz + .5], [4.5, fz + 1.2]]) { const p = F(bx, bz); Mx('Barrel', p[0], 0, p[1], ry + bx, 1.25); } }
      else { const hx = cx - 8.8, hz = cz - 14.6, ry = .3, F = W(hx, hz, ry), w = 7, d = 4.6; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
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
        if (EV) { let p = F(1.2, .6); Mx('Anvil', p[0], 0, p[1], ry, 1.6); p = F(2.3, -1.2); Mx('Barrel', p[0], 0, p[1], ry, 1.3); p = F(-.2, -1.5); Mx('Workbench', p[0], 0, p[1], ry, 1.1); p = F(2.4, .9); Mx('Bucket_Wooden_1', p[0], 0, p[1], ry, 1.3); }
        else { Bx('box', F, ry, 1.2, .45, .6, .6, .9, .5, stoneD, 3); Bx('box', F, ry, 1.2, 1.0, .6, 1.2, .3, .5, iron, 4); Bx('cone', F, ry, 1.95, 1.0, .6, .3, .5, .3, iron, 4, 0, -1.5708);
        Bx('cyl', F, ry, 2.3, .5, -1.2, .9, 1, .9, wood, 3); Bx('cyl', F, ry, 2.3, 1.0, -1.2, .8, .04, .8, col(0x1a2a3a), 4); }
        Bx('box', F, ry, -2.4, 1.4, d / 2 + .8, .1, 1.6, 1.8, wood, 3); for (let k = 0; k < (has('steel') ? 5 : 2); k++) Bx('box', F, ry, -2.34, 1.5, d / 2 + .2 + k * .32, .06, 1.6, .1, bladeC, 4);
        if (has('steel')) { Bx('box', F, ry, 0, 3.1, d / 2 + .25, 1.6, 1.0, .06, col(0xd8a040), 0, 0, 0, .1); Bx('box', F, ry, 0, 3.1, d / 2 + .28, .6, .6, .06, iron, 4); } }
      // 3. Bram's windmill: round stone tower, cone roof, sails that turn once the grain is home
      { const hx = cx - .4, hz = cz - 18.4; Z.mill = [hx, 7.2, hz + 2.05]; solid(hx, hz, 2.2, 2.2, 0); GLX.obj('stat', 'taper', hx, 3.2, hz, 0, 4.2, 6.4, 4.2, stoneW, 0, 1, 3); GLX.obj('stat', 'cyl', hx, 6.5, hz, 0, 3.4, .3, 3.4, dark, 0, 1, 3); GLX.obj('stat', 'cone', hx, 7.8, hz, 0, 3.6, 2.6, 3.6, thatch); GLX.obj('stat', 'box', hx, 1.0, hz + 1.95, 0, 1, 2, .2, dark); GLX.obj('stat', 'box', hx + .9, 4, hz + 1.7, 0, .6, .7, .1, glass, .8); GLX.obj('stat', 'cyl', hx, 7.2, hz + 2.0, 0, .5, .5, .5, dark, 0, 1, 3);
        for (let k = 0; k < (has('grain') ? 5 : 1); k++) GLX.obj('stat', 'sphere', hx + 2.4 + (k % 3) * .7, .4 + (k > 2 ? .55 : 0), hz + 1.6 + (k % 2) * .4, k, .8, .7, .7, col(0xd8c090)); }
      // 4. Stone cottage: grey walls, slate roof, round window, ivy
      if (EV) { const hx = cx - 15.6, hz = cz - 9.6, ry = .95, F = W(hx, hz, ry), w = 4 * HS; solid(hx, hz, w / 2 + .3, w / 2 + .3, ry); Mx('cottage_stone', hx, 0, hz, ry, HS, WALL); Mx('cottage_stone_roof', hx, 0, hz, ry, HS, ROOF.slate);
        { const p = F(-1.2 * HS, -1 * HS); Z.smoke.push([p[0], (3.12 + .3 + 3.18) * HS, p[1]]); } lamp2(F, ry, -.95, 2 * HS + .1);
        for (let k = 0; k < 6; k++) Bx('cyl', F, ry, -w / 2 - .6, .25 + Math.floor(k / 3) * .4, -1 + (k % 3) * .45, .4, 1.4, .4, col(0x7a5a3a), 3, 1.5708); }
      else { const hx = cx - 15.6, hz = cz - 9.6, ry = .95, F = W(hx, hz, ry), w = 4.6, d = 3.8; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
        Bx('box', F, ry, 0, 1.3, 0, w, 2.6, d, stoneD, 3); gable(F, ry, w, d, 2.6, 1.8, slate); chimney(F, ry, -1.4, -.4, 2.4, 5.4); door(F, ry, .8, d / 2 + .02, col(0x2a4a6a)); win(F, ry, -1.1, 1.5, d / 2 + .02, .9, .9, col(0x2a4a6a), true);
        Bx('cyl', F, ry, 0, 3.2, d / 2 + .1, .6, .6, .1, glass, 0, 1.5708, 0, .8); for (let k = 0; k < 7; k++) Bx('blob', F, ry, w / 2 - .1, .4 + k * .32, -d / 2 + .6 + (k % 3) * .5, .5, .5, .5, col(0x3a6a2a), 2);
        for (let k = 0; k < 6; k++) Bx('cyl', F, ry, -w / 2 - .5, .25 + Math.floor(k / 3) * .4, -1 + (k % 3) * .45, .4, 1.4, .4, col(0x7a5a3a), 3, 1.5708); }
      // 5. Timber-frame cottage: white plaster, dark beams, deep thatch
      if (EV) { const hx = cx + 15.6, hz = cz - 9.6, ry = -.95, F = W(hx, hz, ry), w = 4 * HS; solid(hx, hz, w / 2 + .3, w / 2 + .3, ry); Mx('cottage_timber', hx, 0, hz, ry, HS, WALL); Mx('cottage_timber_roof', hx, 0, hz, ry, HS, ROOF.brown);
        { const p = F(1.2 * HS, -1 * HS); Z.smoke.push([p[0], (3.12 + .3 + 3.18) * HS, p[1]]); } lamp2(F, ry, -.95, 2 * HS + .1);
        for (let k = 0; k < 3; k++) Bx('sphere', F, ry, -1.4 + k * .5, .3, w / 2 + .8, .5, .5, .5, col(0x6a4a2a)); }
      else { const hx = cx + 15.6, hz = cz - 9.6, ry = -.95, F = W(hx, hz, ry), w = 4.4, d = 3.8; solid(hx, hz, w / 2 + .2, d / 2 + .2, ry);
        Bx('box', F, ry, 0, 1.3, 0, w, 2.6, d, col(0xe0d4b8)); frame(F, ry, w, d, 2.6); GLX.part('stat', 'taper', IDM, hx, 3.4, hz, 0, ry + .785, 0, 0, 0, 0, w * 1.3, 1.9, d * 1.3, thatch, 0, 1, 3); chimney(F, ry, 1.2, -.6, 3, 5.2);
        door(F, ry, -.7, d / 2 + .02, col(0x7a3a2a)); win(F, ry, 1.1, 1.5, d / 2 + .02, .9, .8, col(0x7a3a2a), true); for (let k = 0; k < 3; k++) Bx('sphere', F, ry, -1.8 + k * .5, .3, d / 2 + .7, .5, .5, .5, col(0x6a4a2a)); }
      // 6. Old Hesta's herb hut: round cob walls, cone thatch, drying herbs, a bubbling pot
      { const hx = cx - 17.2, hz = cz + 4.8; solid(hx, hz, 2.3, 2.3, 0); Z.pot = [hx + 2.8, hz + .6]; GLX.obj('stat', 'cyl', hx, 1.2, hz, 0, 4.6, 2.4, 4.6, col(0xa89070), 0, 1, 3); GLX.obj('stat', 'cone', hx, 3.5, hz, 0, 5.6, 2.6, 5.6, thatch); GLX.obj('stat', 'box', hx + 2.25, 1.0, hz, 1.5708, 1, 2, .1, dark); GLX.obj('stat', 'box', hx + 1.6, 1.5, hz - 1.6, .8, .7, .6, .1, glass, .8);
        for (let k = 0; k < 6; k++) GLX.obj('stat', 'box', hx + 2.5, 2.1 - (k % 2) * .1, hz - 1.4 + k * .55, 0, .14, .5, .14, col(k % 2 ? 0x6a8a3a : 0x9a7a3a)); GLX.obj('stat', 'box', hx + 2.5, 2.4, hz, 0, .08, .08, 3.6, wood);
        if (EV) Mx('Cauldron', hx + 2.8, 0, hz + .6, .4, 1.25); else { GLX.obj('stat', 'sphere', hx + 2.8, .5, hz + .6, 0, 1, .8, 1, col(0x2a2a2e), 0, 1, 4); for (const a of [0, 2.1, 4.2]) GLX.obj('stat', 'box', hx + 2.8 + Math.cos(a) * .5, .2, hz + .6 + Math.sin(a) * .5, a, .1, .5, .1, dark); }
        const bloom = has('herbs') ? 14 : 5; for (let k = 0; k < bloom; k++) { const a = k * 2.4, r = 1 + (k % 3) * .6; GLX.obj('stat', 'sphere', hx + 4.2 + Math.cos(a) * r * .5, .25, hz + 2.2 + Math.sin(a) * r * .5, 0, .28, .28, .28, col(flowerC[k % 5])); GLX.obj('stat', 'cyl', hx + 4.2 + Math.cos(a) * r * .5, .12, hz + 2.2 + Math.sin(a) * r * .5, 0, .06, .24, .06, col(0x3a6a2a)); } }
      // 7. Guard post by the east wall: tent, banner, weapon rack
      { const tx = cx + 17.5, tz = cz + 5.5; GLX.obj('stat', 'cone', tx, 1.3, tz, 0, 3.4, 2.6, 3.4, canvas2); GLX.obj('stat', 'cyl', tx, 1.5, tz, 0, .1, 3.1, .1, wood, 0, 1, 3); GLX.obj('stat', 'cyl', tx - 2.4, 2, tz - 1.6, 0, .12, 4, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', tx - 2.0, 3.2, tz - 1.6, 0, .8, 1.4, .05, blue); GLX.obj('stat', 'box', tx - 2.0, 3.3, tz - 1.58, 0, .3, .3, .05, col(0xd8a040), .2);
        if (EV) { Mx('WeaponStand', tx - 2.3, 0, tz + 2.2, 0, 1.3); Mx('Dummy', tx + 2.4, 0, tz + 2.6, -.5, 1.3); } else for (let k = 0; k < 3; k++) GLX.obj('stat', 'cyl', tx - 2.6 + k * .3, 1.1, tz + 2.2, 0, .06, 2.2, .06, k === 1 ? steelC : wood, 0, 1, k === 1 ? 4 : 3); }
      // 8. Gardens by the gate: vegetables with a scarecrow, and flowers with beehives
      { const fence = (x0, z0, w, d) => { if (EV) { for (const [ax, az, L, rr] of [[x0, z0, w, 0], [x0, z0 + d, w, 0], [x0, z0, d, 1.5708], [x0 + w, z0, d, 1.5708]]) { const n = Math.max(1, Math.round(L / 2)), sl = L / n; for (let k = 0; k < n; k++) { const u = (k + .5) * sl; GLX.obj('stat', 'm:Prop_WoodenFence_Single', cx + ax + (rr ? 0 : u), 0, cz + az + (rr ? u : 0), rr, sl / 2.06, 1, 1, ENV_W, 0, 1, 0); } } return; } for (let k = 0; k <= w; k += 1) for (const zz of [z0, z0 + d]) GLX.obj('stat', 'box', cx + x0 + k, .35, cz + zz, 0, .1, .7, .1, wood, 0, 1, 3); for (let k = 0; k <= d; k += 1) for (const xx of [x0, x0 + w]) GLX.obj('stat', 'box', cx + xx, .35, cz + z0 + k, 0, .1, .7, .1, wood, 0, 1, 3); for (const zz of [z0, z0 + d]) GLX.obj('stat', 'box', cx + x0 + w / 2, .5, cz + zz, 0, w, .08, .06, wood, 0, 1, 3); for (const xx of [x0, x0 + w]) GLX.obj('stat', 'box', cx + xx, .5, cz + z0 + d / 2, 0, .06, .08, d, wood, 0, 1, 3); };
        fence(-14, 9, 5, 4); GLX.obj('stat', 'box', cx - 11.5, .06, cz + 11, 0, 4.6, .08, 3.6, col(0x4a3420), 0, 1, 3); for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 5; k++) GLX.obj('stat', r2 === 1 ? 'sphere' : 'blob', cx - 13.4 + k * .9, .25, cz + 9.8 + r2 * 1.2, k, r2 === 1 ? .5 : .45, r2 === 1 ? .4 : .4, r2 === 1 ? .5 : .45, col(r2 === 1 ? 0xd87a2a : 0x4a8a3a), 0, 1, r2 === 1 ? 0 : 2);
        GLX.obj('stat', 'cyl', cx - 10, 1.0, cz + 12.4, 0, .1, 2, .1, wood, 0, 1, 3); GLX.obj('stat', 'box', cx - 10, 1.6, cz + 12.4, 0, 1.4, .1, .1, wood, 0, 1, 3); GLX.obj('stat', 'sphere', cx - 10, 2.1, cz + 12.4, 0, .4, .45, .4, col(0xd8c090)); GLX.obj('stat', 'cone', cx - 10, 2.45, cz + 12.4, 0, .7, .3, .7, thatch); GLX.obj('stat', 'box', cx - 10, 1.4, cz + 12.4, 0, .7, .7, .3, col(0x8a3a3a));
        fence(9, 9, 5, 4); for (let k = 0; k < (has('herbs') ? 26 : 10); k++) { const fx = cx + 9.5 + (k * 0.618 % 1) * 4, fz = cz + 9.5 + ((k * 0.381 + .2) % 1) * 3; GLX.obj('stat', 'sphere', fx, .3, fz, 0, .26, .26, .26, col(flowerC[k % 5])); GLX.obj('stat', 'cyl', fx, .14, fz, 0, .05, .28, .05, col(0x3a6a2a)); }
        for (const bx of [13, 13.9]) { GLX.obj('stat', 'taper', cx + bx, .5, cz + 12.4, 0, .7, .8, .7, col(0xd8b048), 0, 1, 3); GLX.obj('stat', 'box', cx + bx, .95, cz + 12.4, 0, .8, .1, .8, wood, 0, 1, 3); } }
      // 9. Washing line, a cart of hay, a notice board by the gate
      { const p1 = [cx - 18.5, cz - 5.4], p2 = [cx - 17.3, cz - 2.4]; /* build 0075: it used to run through the trader's awning */ for (const q of [p1, p2]) GLX.obj('stat', 'cyl', q[0], 1.2, q[1], 0, .1, 2.4, .1, wood, 0, 1, 3); const a = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]), L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); GLX.obj('stat', 'box', (p1[0] + p2[0]) / 2, 2.25, (p1[1] + p2[1]) / 2, a, .03, .03, L, col(0xd8d0c0)); for (let k = 0; k < 4; k++) { const t2 = .2 + k * .2; GLX.obj('stat', 'box', p1[0] + (p2[0] - p1[0]) * t2, 1.85, p1[1] + (p2[1] - p1[1]) * t2, a + 1.5708, .7, .75, .04, col([0xc8d8f0, 0xe0b0a0, 0xf0e8d0, 0x9ab07a][k])); } }
      /* build 0084 (Lee, Nov 15: "The cart at the trader is going into the tent. Move it"): the hay cart stood in the Trader's tent and on the path to it. It now stands on the grass west of the stall, by the town wall, clear of the tent, the washing line and Old Hesta */ if (EV) { Mx('Prop_Wagon', cx - 18.5, 0, cz - 1.5, 3.1416, 1); } else { const kx = cx - 18.5, kz = cz - .4, a = 1.5708, ca = Math.cos(a), sa = Math.sin(a); GLX.obj('stat', 'box', kx, .7, kz, a, 2.2, .5, 1.3, wood, 0, 1, 3); for (const sd of [-1, 1]) GLX.part('stat', 'cyl', IDM, kx + ca * .9 * sd, .55, kz - sa * .9 * sd, 0, a, 1.5708, 0, 0, 0, 1.1, .12, 1.1, dark, 0, 1, 3); GLX.obj('stat', 'box', kx, 1.25, kz, a, 1.9, .6, 1.1, col(0xc8a850), 0, 1, 2); GLX.obj('stat', 'box', kx + ca * 1.5 + sa * .6, .55, kz - sa * 1.5 + ca * .6, a, 1.4, .1, .1, wood, 0, 1, 3); }
      { const nx = cx - 4.4, nz = cz + 13.4; for (const sd of [-1, 1]) GLX.obj('stat', 'cyl', nx + sd * .9, 1.1, nz, 0, .12, 2.2, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', nx, 1.6, nz, 0, 2, 1.2, .1, shade(wood, 1.2), 0, 1, 3); for (let k = 0; k < 4; k++) GLX.obj('stat', 'box', nx - .6 + (k % 2) * 1.1, 1.75 - Math.floor(k / 2) * .5, nz + .07, (k - 1.5) * .1, .5, .38, .02, col(0xf0e8d0)); GLX.obj('stat', 'box', nx, 2.3, nz, 0, 2.3, .16, .3, red, 0, 1, 3); solid(nx, nz, 1.1, .3, 0); }
      { const ro = Z.objs.find(o => o.kind === 'rift'); if (ro) { const rk = col(0x2a2038); GLX.obj('stat', 'cyl', ro.x, .15, ro.z, 0, 2.6, .3, 2.6, col(0x4a4a50), 0, 1, 3); GLX.obj('stat', 'taper', ro.x, 1.8, ro.z, .4, 1.1, 3.4, .8, rk, 0, 1, 3); for (let k = 0; k < 4; k++) GLX.obj('stat', 'box', ro.x + Math.cos(k * 1.57 + .4) * .48, 1.2 + k * .5, ro.z - Math.sin(k * 1.57 + .4) * .38, .4 + k * 1.57, .08, .3, .08, col(0xb070ff), 1.2); solid(ro.x, ro.z, .7, .7, 0); } } // the rift stone
      if (has('lily')) for (let k = 0; k < 10; k++) { const a = k * .628, lx = cx + 6.5 + Math.cos(a) * 2.9, lz = cz + 6 + Math.sin(a) * 2.9; GLX.obj('stat', 'cyl', lx, .2, lz, 0, .07, .4, .07, col(0x3a8a4a)); GLX.obj('stat', 'gem', lx, .5, lz, a, .26, .36, .2, col(0xbfe8ff), .9); } // chapter 2: lilies round the well
      if (has('feast')) for (const tz of [-4.6, -6.6]) { GLX.obj('stat', 'box', cx, .8, cz + tz, 0, 7, .14, 1.2, wood, 0, 1, 3); for (const lx of [-3, 0, 3]) GLX.obj('stat', 'box', cx + lx, .4, cz + tz, 0, .14, .8, 1, shade(wood, .8), 0, 1, 3); for (let k = 0; k < 7; k++) { const fx = cx - 3 + k, c2 = [0xb86a4a, 0xd8a040, 0xe84a4a, 0xf0e8d8, 0x7aa040][k % 5]; GLX.obj('stat', k % 2 ? 'sphere' : 'cyl', fx, .98, cz + tz, k, .34, .22, .34, col(c2)); } for (const sd of [-1, 1]) GLX.obj('stat', 'box', cx, .45, cz + tz + sd * 1.05, 0, 6.6, .1, .4, shade(wood, .9), 0, 1, 3); } // chapter 2: the feast tables
      if (has('deep')) { const sx = cx + 4.6, sz = cz + 13.2, cc = col(CLASS_COL[G.hero.cls] || 0xd8a040), sto = col(0x8a8680); GLX.obj('stat', 'box', sx, .6, sz, 0, 1.8, 1.2, 1.8, sto, 0, 1, 3); GLX.obj('stat', 'box', sx, 1.25, sz, 0, 2.1, .12, 2.1, shade(sto, .8), 0, 1, 3); GLX.obj('stat', 'taper', sx, 2.4, sz, 0, .9, 2.0, .7, sto, 0, 1, 3); GLX.obj('stat', 'sphere', sx, 3.75, sz, 0, .62, .7, .62, sto, 0, 1, 3); GLX.obj('stat', 'box', sx + .55, 2.9, sz, -.5, .14, 2.2, .14, sto, 0, 1, 3); GLX.obj('stat', 'box', sx, 2.2, sz + .38, 0, .5, 1.3, .06, cc, .2); solid(sx, sz, .95, .95, 0); } // chapter 2: a statue of you by the gate
      { const wx = cx + 6.5, wz = cz + 6; GLX.obj('stat', 'cyl', wx, .5, wz, 0, 2.2, 1, 2.2, cob2, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 1.02, wz, 0, 1.7, .04, 1.7, col(0x1a2a3a), 0, 1, 4); for (const sx of [-1, 1]) GLX.obj('stat', 'box', wx + sx * 1, 1.6, wz, 0, .16, 2.2, .16, wood, 0, 1, 3); GLX.obj('stat', 'box', wx, 2.7, wz, 0, 2.5, .14, .9, thatch, 0, 1, 3); GLX.obj('stat', 'cyl', wx, 2.3, wz, 0, .1, .1, 2, wood, 0, 1, 3); }
      for (const [bx, bz, n] of [[-6, 7, 3], [-15, 2, 2], [15, 2, 2], [4, -11, 2], [-4, -11, 3]]) for (let k = 0; k < n; k++) { const px = cx + bx + (k % 2) * 1.1, pz = cz + bz + (k > 1 ? 1.1 : 0); if (EV) { if (k % 2) Mx('Barrel', px, 0, pz, k, 1.25); else Mx('Crate_Wooden', px, 0, pz, k * .5, 1.1); } else if (k % 2) { GLX.obj('stat', 'cyl', px, .55, pz, 0, .8, 1.1, .8, wood, 0, 1, 3); for (const y of [.25, .85]) GLX.obj('stat', 'cyl', px, y, pz, 0, .84, .08, .84, iron, 0, 1, 4); } else { GLX.obj('stat', 'box', px, .45, pz, k * .5, .9, .9, .9, shade(wood, 1.1), 0, 1, 3); GLX.obj('stat', 'box', px, .45, pz, k * .5, .94, .1, .94, shade(wood, .7), 0, 1, 3); } }
      for (const [sx, sz] of [[-3.2, 3.4], [3.2, 3.4]]) if (EV) Mx('Bench', cx + sx, 0, cz + sz, sx > 0 ? -.6 : .6, .9); else { GLX.obj('stat', 'box', cx + sx, .45, cz + sz, sx > 0 ? -.6 : .6, 2.2, .14, .6, wood, 0, 1, 3); for (const e of [-.9, .9]) GLX.obj('stat', 'box', cx + sx + e * Math.cos(sx > 0 ? -.6 : .6), .22, cz + sz - e * Math.sin(sx > 0 ? -.6 : .6), 0, .14, .44, .5, shade(wood, .8), 0, 1, 3); }
      for (const o of Z.objs) { if (o.kind !== 'stash' && o.kind !== 'vendor' && o.kind !== 'altar') continue; /* build 0075 */ const fc = o.kind === 'altar' ? col(0xff7a2a) : o.kind === 'vendor' ? col(0xc9a030) : blue, px = o.x + (o.kind === 'stash' ? 3 : 0), pz = o.z - (o.kind === 'stash' ? 0 : 4.6); GLX.obj('stat', 'cyl', px, 2.4, pz, 0, .12, 4.8, .12, wood, 0, 1, 3); GLX.obj('stat', 'box', px + .7, 4.1, pz, 0, 1.3, 1, .06, fc, .15); GLX.obj('stat', 'cone', px, 4.9, pz, 0, .22, .3, .22, col(0xc9a030), 0, 1, 4); }
      for (const o of Z.objs) if (o.kind === 'altar') { GLX.obj('stat', 'cyl', o.x, .36, o.z, .3, 5.6, .14, 5.6, col(0x5a5a60), 0, 1, 3); for (let k = 0; k < 6; k++) { const a = k * 1.0472 + .5; GLX.obj('stat', 'taper', o.x + Math.cos(a) * 3.6, 1.8, o.z + Math.sin(a) * 3.6, a, .55, 3.2, .55, stn, 0, 1, 3); GLX.obj('stat', 'cyl', o.x + Math.cos(a) * 3.6, .3, o.z + Math.sin(a) * 3.6, a, .9, .4, .9, col(0x4a4a50), 0, 1, 3); } }
    }
  }
  GLX.statEnd();
}
// build 0074 (Lee, Nov 15: "Upgrades you feel"): monster life follows the level and the floor, not your gear. A typical kit kills an ordinary monster in about 3 hits; better gear kills faster at once.
function parHit(lvl) { lvl = clamp(lvl || 1, 1, 80); let i = 0; while (i < PAR_L.length - 2 && lvl > PAR_L[i + 1]) i++; const t = clamp((lvl - PAR_L[i]) / (PAR_L[i + 1] - PAR_L[i]), 0, 1); return 7.5 * Math.pow(1.11, lvl) * (1 + .04 * lvl) * (PAR_K[i] + (PAR_K[i + 1] - PAR_K[i]) * t); }
function floorK(f) { f = f || 1; return f <= 3 ? .9 : Math.min(1.2, .9 + (f - 3) * .3 / 9); } // floors 1-3 a little softer, 20% tougher than par by floor 12
function refHit(lvl) { const d = G.zone && G.zone.def; return 1.25 * parHit(lvl) * floorK(d ? d.depth : 1); } // 1.25: plain gear about 4 hits, magic about 3, rare or better 2
function tierNow() { const d = G.zone && G.zone.def; return d && d.type === 'zone' ? clamp(d.tier | 0, 0, TIERS.length - 1) : 0; }
function tierOf() { return TIERS[tierNow()]; }
function tierMaxOf(h) { if (!h) return 0; if (h.tierMax === undefined) h.tierMax = (h.maxClear || h.depthMax || 0) > 0 ? 1 : 0; /* heroes who already slew a guardian start with Hard open */ return clamp(h.tierMax | 0, 0, TIERS.length - 1); }
function tierPick(h) { return Math.min(h ? h.tier | 0 : 0, tierMaxOf(h)); }
function tierWin() { const h = G.hero, t = tierNow(); if (!h || t < tierMaxOf(h) || t >= TIERS.length - 1) return; h.tierMax = t + 1; saveGame(); const n = TIERS[t + 1].n; if (typeof setTimeout === 'function' && typeof UI !== 'undefined' && UI.zoneBanner) setTimeout(() => UI.zoneBanner(n + ' unlocked', 'Choose it at the town portal: tougher monsters, more gold and Legendaries'), 3200); hint(n + ' is unlocked. Pick it at the town portal for tougher monsters and better loot.'); }
// build 0035 (Real danger, Lee Nov 15): monsters hit harder floor by floor, so dodging and potions matter. Hits to kill, drops and XP are unchanged.
var DANGER_TOP = 4.5; // how much harder monsters hit from floor 4 on, compared with floor 1
function dangerK(f) { f = f || 1; const t = DANGER_TOP; return f <= 1 ? 1 : f === 2 ? 1 + (t - 1) * .35 : f === 3 ? 1 + (t - 1) * .7 : t * Math.min(1.3, 1 + (f - 4) * .04); }
function mkEnemy(md, x, z, lvl, elite, pack) {
  const a = ARCH[md.a], hit = refHit(lvl);
  const e = { id: ++G.eid, md, a, arch: md.a, x, z, rot: rnd(6.28), lvl, elite, pack, r: a.r * (elite ? 1.2 : 1), sc: a.sc * (elite === 1 ? 1.2 : elite === 2 ? 1.38 : 1), maxHp: Math.round(2.8 * hit * a.hp * (elite === 1 ? 2.2 : elite === 2 ? 3.5 : 1) * tierOf().hp), dmg: 5 * Math.pow(1.095, lvl) * a.dmg * (elite ? 1.3 : 1), spd: a.spd, st: 'chase', t: 0, cd: rnd(.2, 1), walk: rnd(6), awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, modT: 2, name: md.n, mods: [] };
  e.dmg *= dangerK(G.zone && G.zone.def ? G.zone.def.depth : 1) * tierOf().dmg; /* build 0035; build 0074 tier */
  const dep0 = G.zone && G.zone.def && !G.zone.def.rift ? G.zone.def.depth || 1 : 99; if (a === ARCH.caster && dep0 <= 3) e.dmg *= .7; /* build 0072 (Lee's playtest): ranged monsters on the first three floors hit 30% softer */
  if (elite) { const keys = Object.keys(EMODS).filter(k => !(dep0 === 1 && k === 'hasted')); if (dep0 === 1) e.dmg /= 1.3; /* build 0072: floor 1 elites are never Hasted and hit like ordinary monsters (they keep their life and loot) */ while (e.mods.length < elite) { const k = pick(keys); if (!e.mods.includes(k)) e.mods.push(k); } for (const k of e.mods) e[k] = true; if (e.hasted) e.spd *= 1.3; e.name = e.mods.map(k => EMODS[k].n).join(' ') + ' ' + md.n; }
  if (!elite && !md.boss && !tierNow() && P.stats && P.stats.wmin && G.hero) { /* build 0074: on Normal an ordinary monster never needs more than about 5 of your weakest hits */ const s = P.stats, bs = (!G.hero.eq.weapon ? SKILLS.punch : SKILLS[G.hero.bar[0]]) || SKILLS.punch, low = (s.wmin + s.addPhys + s.addFire + s.addCold + s.addLight) * (1 + (s.dmg + (s[bs.el] || 0) + (bs.el !== 'phys' ? s.ele : 0)) / 100) * (bs.m || 1); e.maxHp = Math.max(1, Math.min(e.maxHp, Math.floor(low * 4.8))); }
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
  if (Z.def.type === 'zone' && Math.random() < .33) for (let t = 0; t < 60; t++) { const k = (Math.random() * GW * GW) | 0; if (Z.cell[k] || !Z.dist || Z.dist[k] < 14) continue; const x = (k % GW + .5) * CS, z = ((k / GW | 0) + .5) * CS; if (blocked(x, z, .6)) continue; mkEnemy({ a: 'goblin', n: 'Treasure Goblin', c: 0x4a7a34, c2: 0xc89a3a, e: 0xffd84a }, x, z, lv, 0, -1); break; } /* build 0027 */
  const bd = bossFor(Z.def.theme, Z.def.depth, Z.def.rift), hit = refHit(lv + 1);
  const b = { id: ++G.eid, md: { a: 'boss', n: bd.n, c: bd.c, c2: bd.c2, e: bd.e }, a: { r: 1.7, sc: bd.sc || 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 }, arch: 'boss', boss: true, bd, x: Z.bossAt[0], z: Z.bossAt[1], rot: 0, lvl: lv + 1, elite: 3, pack: -1, r: 1.7, sc: bd.sc || 2.3, maxHp: Math.round(2.8 * hit * 40 * 1.6 * (bd.hpM || 1) * tierOf().hp), dmg: 5 * Math.pow(1.095, lv + 1) * 3 * tierOf().dmg, /* build 0062 (playtest): guardians last longer and hit much harder */ spd: 4, st: 'chase', t: 0, cd: 1, walk: 0, awake: false, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, pt: 2.5, pi: 0, name: bd.n, mods: [] };
  b.hp = b.maxHp; G.ents.push(b); G.boss = b; Z.ent0 = G.ents.filter(e => !e.boss).length; Z.repT = 30;
}
function addReplica(i) {
  if (G.ents.some(e => e.id === i.id)) return; const e = Object.assign({}, i, { a: i.boss ? { r: 1.7, sc: 2.3, rec: .9, wind: .8, reach: 3.6, xp: 40, spd: 4 } : ARCH[i.arch], tx: i.x, tz: i.z, trot: i.rot || 0, rot: i.rot || 0, st: 'chase', t: 0, cd: 1, modT: 2, walk: Math.random() * 6, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0 });
  if (!e.a || !e.md) return; for (const k of e.mods || []) e[k] = true; if (e.boss) { if (e.wb) { e.bd = WORLD_BOSS; e.a = { r: 2.3, sc: WORLD_BOSS.sc, rec: .9, wind: .8, reach: 4.4, xp: 40, spd: 4 }; G.wboss = e; } else { e.bd = bossFor(G.zone.def.theme, G.zone.def.depth, G.zone.def.rift); G.boss = e; } } G.ents.push(e);
}
function repEnemy(e, dt) {
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.burnT > 0) e.burnT -= dt; if (e.shock > 0) e.shock -= dt; const ox = e.x, oz = e.z, k = Math.min(1, dt * 12); if (e.sT1 && e.sT1 > e.sT0) { /* play back 100 ms behind the server and slide evenly between its last two updates */ const u = Math.min(1.2, Math.max(0, (performance.now() / 1000 - .1 - e.sT0) / (e.sT1 - e.sT0))), gx = e.sx0 + (e.sx1 - e.sx0) * u, gz = e.sz0 + (e.sz1 - e.sz0) * u, kk = Math.min(1, dt * 20); e.x += (gx - e.x) * kk; e.z += (gz - e.z) * kk; } else { e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; }
  let da = e.trot - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * k; e.walk += Math.hypot(e.x - ox, e.z - oz) * 1.6;
}
function enterZone(net) {
  G.inTown = false; G.away = null;
  const h = G.hero, lvl = net ? net.lvl : h.level, dpt = net ? net.d | 0 : (h.depth === undefined ? (h.depth = h.runs) : h.depth), zd = zoneFor(dpt); const def = { type: 'zone', theme: net && net.theme ? net.theme : zd.theme, lvl, seed: net ? net.seed : G.resumeAt && G.resumeAt.d === dpt + 1 ? G.resumeAt.seed : (Math.random() * 1e9) | 0, name: zd.name, depth: dpt + 1, tier: net ? clamp(net.tier | 0, 0, TIERS.length - 1) : tierPick(h) };
  { const isRift = net ? net.rift !== undefined : !!G.riftNext; G.riftNext = false; G.riftDone = 0; if (isRift) { if (!net) { def.lvl += 2; def.theme = pick(Object.keys(THEMES).filter(k => k !== 'town')); } def.rift = 1; def.name = 'Rift · ' + def.theme[0].toUpperCase() + def.theme.slice(1); G.riftT0 = G.time - (net && net.rift > 0 ? net.rift / 1000 : 0); if (net && net.rift === -1) G.riftDone = 1; } } // timed rift (build 0021)
  G.zone = genZone(def); const Z = G.zone; G.ents.length = 0; G.projs.length = 0; G.pp.length = 0; G.areas.length = 0; G.drops.length = 0; G.fx.length = 0; G.texts.length = 0; G.timers.length = 0; G.boss = null; G.wboss = null; G.gateCd = null; G.streak = 0;
  P.buffs = []; computeStats(); buildStatic(Z); if (net) { for (const i of net.ents) addReplica(i); } else spawnAll(Z); BOT.path = null; questZone(Z); stZone(Z); if (typeof GPS !== 'undefined') GPS.t = 0; /* quest text refreshes at once on a new floor */
  P.x = Z.start[0]; P.z = Z.start[1]; P.y = 0; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; P.dead = false; P.lastHit = -9; P.flaskCd = 0; P.buffs = []; P.cds = {}; computeStats(); P.hp = P.stats.maxLife; P.mana = CLASSES[h.cls].res.regen ? P.stats.maxMana : 0; P.flaskCd = 0; P.lastHit = -9;
  setEnv(Z); if (net && net.sync && net.pos) { P.x = net.pos[0]; P.z = net.pos[1]; }
  { const ra = G.resumeAt; G.resumeAt = null; if (!net && ra && ra.seed === def.seed && isFinite(ra.x)) { P.x = ra.x; P.z = ra.z; for (let i = G.ents.length - 1; i >= 0; i--) { const e = G.ents[i]; if (!e.boss && Math.hypot(e.x - P.x, e.z - P.z) < 12) G.ents.splice(i, 1); } } } /* build 0070: solo after a lost connection, same floor and spot */
  G.state = 'play'; if (typeof UI !== 'undefined') UI.zoneBanner(def.name, 'Floor ' + def.depth + ' · monster level ' + lvl + (def.tier ? ' · ' + TIERS[def.tier].n : '')); { const dw = h.dangerSeen || 0; if (def.depth >= 4 && dw < 2) { h.dangerSeen = 2; hint('The deep turns deadly from here. Step out of red circles, dodge (Space on PC) and keep a potion ready.'); } else if (def.depth >= 2 && dw < 1) { h.dangerSeen = 1; hint('Monsters hit harder on every floor. Watch for red circles on the ground: they mark a heavy blow.'); } } /* build 0035 */ saveGame();
}

// ---------- town ----------
function genTown() {
  const th = THEMES.town, c0 = GW / 2, Z = { def: { type: 'town', theme: 'town', lvl: G.hero.level, seed: 4242, name: 'Emberwatch' }, th, cell: new Uint8Array(GW * GW).fill(1), seen: new Uint8Array(GW * GW).fill(1), lamps: [], objs: [], packs: [], cleared: true };
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) if (Math.hypot(x + .5 - c0, y + .5 - c0) < 7.2) Z.cell[y * GW + x] = 0;
  const cx = c0 * CS, cz = c0 * CS; Z.start = [cx, cz + 9]; Z.bossAt = [cx, cz]; Z.dist = new Int16Array(GW * GW);
  Z.lamps.push({ x: cx, z: cz, big: 1 }, { x: cx - 11, z: cz - 8 }, { x: cx + 11, z: cz - 8 }, { x: cx - 8, z: cz + 10 }, { x: cx + 8, z: cz + 10 }, { x: cx - 16, z: cz + 1 }, { x: cx + 16, z: cz + 1 }, { x: cx - 4, z: cz - 15 }, { x: cx + 4, z: cz - 15 });
  Z.objs.push({ kind: 'stash', x: cx, z: cz - 13, name: 'Stash', used: false }, { kind: 'vendor', x: cx - 13, z: cz - 2, name: 'Mirel the Trader', used: false }, { kind: 'altar', x: cx + 13, z: cz - 2, name: 'Altar of Embers', used: false }, { kind: 'tportal', x: cx, z: cz + 14, name: 'Return to the floor', used: false }, { kind: 'planner', x: cx + 6.5, z: cz + 10.5, name: 'Town Planner', used: false });
  for (const id in FOLK) { const f = FOLK[id]; Z.objs.push({ kind: 'npc', id, x: cx + f.at[0], z: cz + f.at[1], name: f.n, used: false }); }
  Z.objs.push({ kind: 'rift', x: cx + 11.6, z: cz + 4.4, name: 'Rift Stone', used: false });
  return Z;
}
function setEnv(Z) { const e = GLX.env, th = Z.th, n = Math.hypot(.55, .66, .42); e.sun = [.55 / n, .66 / n, .42 / n]; e.sunC = th.sunC; e.sky = th.sky; e.gnd = th.gnd; e.fog = GLX.col(th.fog); e.lightR = th.lightR; if (th !== THEMES.forest && th !== THEMES.town && th !== THEMES.ice) { e.lightR *= 1.3; e.sky = e.sky.map(v => v * 1.45); e.gnd = e.gnd.map(v => v * 1.3);  } /* deeper regions were too dark to read */ e.wet = th.wet === undefined ? .4 : th.wet; e.mist = th.mist === undefined ? .35 : th.mist; e.gr = th.gr || [.45, .2, .05, 0]; e.scat = th.scat !== undefined ? th.scat : .012 + e.mist * .03; e.ge = GLX.col(th.lamp || 0xff7a2a); SFX.ambient(Object.keys(THEMES).find(k => THEMES[k] === th)); }
function enterTown() {
  if (G.inTown || P.dead || G.state !== 'play') return; for (const e of G.ents) if (e.alive && e.awake && !e.dummy && Math.hypot(e.x - P.x, e.z - P.z) < 16 && (Math.hypot(e.x - P.x, e.z - P.z) < 6 || los(e.x, e.z, P.x, P.z))) { hint('You cannot leave while enemies are near. Finish the fight or step away first.'); return; }
  goalDone('town'); P.fl = FLASK_MAX; P.flaskCd = 0; /* build 0026: only a real trip to town counts (and refills potions) */ if (P.meter) P.meter.peak = 0; /* Sprint 1: peak hit resets in town */
  G.away = { zone: G.zone, ents: G.ents, drops: G.drops, boss: G.boss, x: P.x, z: P.z, seed: G.zone.def.seed }; G.ents = []; G.drops = []; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; G.boss = null; G.wboss = null; G.streak = 0;
  G.zone = genTown(); G.inTown = true; buildStatic(G.zone); setEnv(G.zone); P.x = G.zone.start[0]; P.z = G.zone.start[1]; P.y = 0; P.rot = Math.PI; P.act = P.spin = P.dash = P.move = P.atk = P.inter = P.pick = null; BOT.path = null; P.hp = P.stats.maxLife; addDummy();
  const h = G.hero; if (!h.stock || Math.abs(h.kills - (h.stockK || 0)) >= 25 || h.stockL !== h.level) { h.stock = []; for (let i = 0; i < 10; i++) h.stock.push(makeItem(h.level, null, Math.random() < .12 ? 3 : Math.random() < .5 ? 2 : 1)); h.stockK = h.kills; h.stockL = h.level; }
  SFX.play('shrine'); UI.zoneBanner('Emberwatch', 'Stash · Trader · Altar'); saveGame();
}
// jump straight to a party member; from town it walks you out through the portal first
function peerHere(q) { return G.inTown ? !!q.town : !q.dead && !q.town; } // a party member you can see: in town with you, or alive on your floor (build 0075)
function teleportTo(id) {
  if (!G.online) return; { const q = NET.peers[id]; if (q && q.town) { G.tpTo = 0; hint(G.inTown ? q.name + ' is here in town with you.' : q.name + ' is in town. Tap Town to join them.'); return; } } if (G.inTown) { G.tpTo = id; leaveTown(); return; }
  const p = NET.peers[id]; if (!p) { hint('That player is not on your floor right now.'); return; } if (P.dead) return;
  ring(P.x, P.z, 0, 4, .5, 0x7ad0ff); let x = p.x, z = p.z; for (let k = 0; k < 8; k++) { const a = k * .785, tx = p.x + Math.sin(a) * 1.6, tz = p.z + Math.cos(a) * 1.6; if (!blocked(tx, tz, .5)) { x = tx; z = tz; break; } }
  P.x = x; P.z = z; P.act = null; P.dash = null; P.iframes = Math.max(P.iframes || 0, 1.5); G.tpTo = 0; ring(x, z, 0, 5, .6, 0x7ad0ff); burst(x, 1.2, z, 0x7ad0ff, 24, 6); SFX.play('shrine'); hint('Teleported to ' + p.name + '.');
}
// ---- build 0075 (Lee, Nov 15): the world boss ----
// One tap takes you to it. From town it walks you out through the portal first, like teleporting to a player.
function wbGo() {
  if (!G.online || P.dead) return; if (G.inTown) { G.tpWb = G.time + 8; leaveTown(); return; } G.tpWb = 0;
  const e = G.wboss; if (!e || !e.alive) { hint(G.zone && G.zone.def && G.zone.def.rift ? 'The world boss does not enter rifts. It waits on your next floor.' : 'The world boss is not on this floor yet. Try again in a moment.'); return; }
  const a0 = Math.atan2(P.x - e.x, P.z - e.z); let x = 0, z = 0, ok = false;
  for (const R of [10, 9, 11, 8, 13]) { for (let k = 0; k < 12 && !ok; k++) { const a = a0 + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * .5236, tx = e.x + Math.sin(a) * R, tz = e.z + Math.cos(a) * R; if (!blocked(tx, tz, .6) && los(tx, tz, e.x, e.z)) { x = tx; z = tz; ok = true; } } if (ok) break; }
  if (!ok) { hint('No safe footing next to the world boss right now. Follow the purple skull on your map.'); return; }
  ring(P.x, P.z, 0, 4, .5, 0xc070ff); P.x = x; P.z = z; P.act = null; P.dash = null; P.move = P.atk = null; P.iframes = Math.max(P.iframes || 0, 1.5); ring(x, z, 0, 5, .6, 0xc070ff); burst(x, 1.2, z, 0xc070ff, 24, 6); SFX.play('shrine'); hint('You stand before ' + e.name + '.');
}
// the guaranteed Mythic for everyone who landed a hit. With no place given (you were in town or in a rift when it fell) it goes straight to your bag
function wbReward(x, z) {
  G.wbHit = 0; const h = G.hero, it = makeItem(h.level, null, 4);
  if (x === undefined) { if (addItem(it)) { it.fd = 1; h.f4 = 1; jackpot(it); hint('The world boss fell. Your Mythic reward is in your bag: ' + it.name); if (G.online) NET.send({ t: 'found', item: it.name, r: 4 }); UI.invDirty = true; saveGame(); return; } x = P.x; z = P.z; }
  dropItem(x, z, it);
}
function wbEvent(m) {
  if (typeof UI === 'undefined' || !m) return; const nm = WORLD_BOSS.n;
  if (m.ev === 'soon') UI.chat('', nm + ' stirs. ' + (m.left | 0) + ' more kills, by anyone on the server, will wake it.', 'm');
  else if (m.ev === 'up') { G.wbHit = 0; UI.zoneBanner('World boss: ' + nm, 'It has risen on every floor. Land a hit to earn a Mythic'); UI.chat('', 'World boss! ' + nm + ' has risen. Tap World boss to go to it.', 'm'); SFX.play('boss'); }
  else if (m.ev === 'dead') { const by = Array.isArray(m.by) ? m.by.map(n => String(n).replace(/[<>&"'`]/g, '').slice(0, 16)).filter(Boolean) : [], more = Math.max(0, (m.c | 0) - by.length), who = by.length ? by.join(', ') + (more ? ' and ' + more + ' more' : '') : 'the heroes of OathByte';
    UI.zoneBanner('World boss slain', 'Brought down by ' + who); UI.chat('', nm + ' was slain by ' + who + '. The kill count starts again.', 'm'); if (G.wbHit) wbReward(); }
}
function leaveTown() {
  if (!G.inTown) return; const a = G.away; UI.closeTown();
  if (G.online) { NET.send({ t: 'sync' }); hint('Returning to your party…'); return; }
  if (!a) { enterZone(); return; }
  G.inTown = false; G.away = null; G.zone = a.zone; G.ents = a.ents; G.drops = a.drops; G.boss = a.boss; G.projs = []; G.pp = []; G.areas = []; G.fx = []; G.texts = []; G.timers = []; buildStatic(G.zone); setEnv(G.zone); stPlace(G.zone); P.x = a.x; P.z = a.z; P.move = P.atk = P.inter = P.pick = null; BOT.path = null; questZone(G.zone);
  SFX.play('shrine'); UI.zoneBanner(G.zone.def.name, 'Monster level ' + G.zone.def.lvl);
}
function toStash(i) { const h = G.hero, it = h.inv[i]; if (!it) return; if (!bagPut(G.stash, it)) { hint('The stash is full.'); return; } h.inv[i] = null; SFX.play('pickup'); saveGame(); }
function fromStash(j) { const it = G.stash[j]; if (!it) return; if (!addItem(it)) { hint('Inventory is full.'); return; } G.stash[j] = null; SFX.play('pickup'); saveGame(); }
function sellItem(i) { const h = G.hero, it = h.inv[i]; if (!it) return; h.gold += itemValue(it); h.inv[i] = null; SFX.play('gold'); saveGame(); }
function buyPrice(it) { const l = G.hero ? G.hero.level : 10; return Math.max(1, Math.round(itemValue(it) * 5 * (l >= 10 ? 1 : .4 + .06 * l))); } /* build 0072 (Lee's playtest): the Trader is cheaper while you are new, about half price at level 1, full price from level 10 */
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
function townDecor(Z) { const cx = GW / 2 * CS, cz = GW / 2 * CS, O = (g, x, y, z, ry, sx, sy, sz, c, em, m) => GLX.obj('stat', g, x, y, z, ry, sx, sy, sz, GLX.col(c), em || 0, 1, m || 0), wood = 0x5a4028, gold = 0xd8a838;
  { const x = cx + 6.5, z = cz + 10.5; for (const sd of [-1, 1]) O('box', x + sd * .9, .9, z, 0, .14, 1.8, .14, wood, 0, 3); O('box', x, 1.45, z, 0, 2.1, 1.1, .1, 0x6a4a2c, 0, 3); O('box', x, 2.05, z, 0, 2.3, .12, .2, gold, .3, 4); for (let k = 0; k < 4; k++) O('box', x - .65 + k * .43, 1.45 + (k & 1) * .18, z + .07, (k - 1.5) * .06, .32, .4, .02, 0xe8dcc0, .05); }
  const L = k => townLv(k);
  if (L('forge')) { const x = cx + 12.6, z = cz - 11.9; /* build 0075: stood inside the smithy wall */ O('box', x, .35, z, .3, .9, .7, .5, 0x3a3c44, 0, 4); O('box', x, .78, z, .3, 1.2, .16, .44, 0x4a4c54, 0, 4); O('box', x + .1, .9, z, .3, .3, .06, .14, 0xff8a2a, 2); if (L('forge') > 1) { O('cyl', x + .2, 2.4, z - 1.5, 0, .7, 4.8, .7, 0x5a5654, 0, 3); O('cyl', x + .2, 4.9, z - 1.5, 0, .9, .3, .9, 0xff6a2a, 1.4); } if (L('forge') > 2) { O('box', x - 1.5, 2, z + .5, 0, .1, 4, .1, wood, 0, 3); O('box', x - 1.5, 3.3, z + .52, 0, 1, 1.4, .04, 0x8a2a22, .1); O('sphere', x - 1.5, 3.3, z + .56, 0, .3, .3, .05, gold, .5, 4); } }
  if (L('garden')) for (let b = 0; b < L('garden'); b++) { const x = cx - 11 + b * 2.4, z = cz + 14.6; /* build 0075: the beds grew into Hesta's hut; they sit by the gate now */ O('box', x, .15, z, 0, 2, .3, 1.2, 0x4a3420, 0, 3); for (let k = 0; k < 7; k++) O('sphere', x - .8 + (k % 4) * .5 + (k > 3 ? .25 : 0), .48, z - .25 + (k > 3 ? .5 : 0), k, .26, .22, .26, [0xff7aa8, 0xffd84a, 0xb48cff, 0xff9a4a][k % 4], .25); if (L('garden') > 2 && b === 1) { for (const sd of [-1, 1]) O('box', x + sd * 1.1, 1.3, z, 0, .1, 2.6, .1, 0xe8e0d0, 0, 3); O('box', x, 2.6, z, 0, 2.4, .12, .14, 0xe8e0d0, 0, 3); } }
  if (L('guild')) { const x = cx + 7.7, z = cz + 14.5; /* build 0075: was wedged into the trader's stall and the stone cottage */ for (let k = 0; k < 2 + L('guild'); k++) O('box', x + (k % 3) * 1.05 - 1, .45 + (k > 2 ? .9 : 0), z + (k % 2) * .3, k * .3, .9, .9, .9, 0x6a4a2c, 0, 3); for (let k = 0; k < 2 * L('guild'); k++) O('cyl', x + 1.6 + (k % 3) * .45, .12 + (k / 3 | 0) * .2, z + 1, 0, .38, .14, .38, gold, .6, 4); if (L('guild') > 1) { O('box', x, 2.2, z + 1.2, 0, 3.4, .1, 1.8, 0x2a5a8a, .05); for (const sd of [-1, 1]) O('box', x + sd * 1.6, 1.1, z + 1.9, 0, .1, 2.2, .1, wood, 0, 3); } if (L('guild') > 2) { O('box', x, 3, z + 1.95, 0, 1.6, .7, .06, gold, .5, 4); } }
  if (L('tower')) { const x = cx + 15.6, z = cz + 10.6, /* build 0075: stood through the town wall */ hh = 3.5 + L('tower') * 2.2; for (const a of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) O('box', x + a[0] * .9, hh / 2, z + a[1] * .9, 0, .22, hh, .22, wood, 0, 3); O('box', x, hh, z, 0, 2.6, .25, 2.6, 0x6a4a2c, 0, 3); O('cone', x, hh + 1, z, .785, 2.6, 1.6, 2.6, 0x7a2a22, 0, 3); O('box', x, hh + 2.5, z, 0, .08, 1.6, .08, wood, 0, 3); O('box', x + .55, hh + 2.9, z, 0, 1, .6, .03, 0xd8a838, .3); if (L('tower') > 2) O('sphere', x, hh + .45, z, 0, .4, .4, .4, 0xffa040, 2.2); }
  if (L('yard')) { const x = cx + 17, z = cz - 6; for (let k = 0; k < 2 + L('yard'); k++) O('gem', x + (k % 3) * 1.1 - 1, .4, z + (k / 3 | 0) * 1, k, .8, .7, .8, [0x5a5c64, 0x7a6a5a, 0x4a4c54][k % 3], 0, 4); if (L('yard') > 1) { O('box', x - 1.8, 2.3, z, 0, .16, 4.6, .16, wood, 0, 3); O('box', x - .8, 4.5, z, 0, 2.4, .16, .16, wood, 0, 3); O('box', x + .3, 3.6, z, 0, .04, 1.8, .04, 0x2a2a2a, 0, 0); } if (L('yard') > 2) { O('cyl', x + 1.8, .7, z + 1.4, 0, 1.2, 1.4, 1.2, 0x4a4040, 0, 3); O('cyl', x + 1.8, 1.45, z + 1.4, 0, .8, .1, .8, 0xff6a2a, 2); } }
  if (L('plaza')) { const x = cx - 7.2, z = cz + 4.4, /* build 0075: stood in a stack of crates */ hc = 0xb8b0a0; O('box', x, .5, z, 0, 1.6, 1, 1.6, 0x8a857c, 0, 3); O('box', x, 1.05, z, 0, 1.8, .12, 1.8, 0xa8a090, 0, 3); O('taper', x, 1.9, z, 0, .7, 1.4, .5, 0xb8b0a0, 0, 4); O('sphere', x, 2.85, z, 0, .32, .34, .32, 0xb8b0a0, 0, 4); O('box', x + .55, 2.6, z, 0, .08, 1.9, .08, 0xb8b0a0, 0, 4); O('box', x, 1.12, z + .92, 0, 1, .2, .04, gold, .6, 4);
    if (L('plaza') > 1) for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, bx = cx + Math.cos(a) * 8.5, bz = cz + Math.sin(a) * 8.5; O('box', bx, 2, bz, 0, .1, 4, .1, wood, 0, 3); O('box', bx + .4, 3.3, bz, a, .7, 1.3, .03, [0x8a2a22, 0x2a5a8a, 0xd8a838][k % 3], .15); }
    if (L('plaza') > 2) for (let k = 0; k < 28; k++) { const a = k / 28 * 6.28, r = 11; O('sphere', cx + Math.cos(a) * r, 4 + Math.sin(k * 1.7) * .25, cz + Math.sin(a) * r, 0, .18, .22, .18, [0xffd84a, 0xff7aa8, 0x9ad0ff][k % 3], 2.2); } }
}
function townLv(k) { return (G.hero && G.hero.town && G.hero.town[k]) || 0; }
function townCost(k, lvl) { const c = TOWN_COST[lvl], m = k === 'plaza' ? 1.5 : 1; return { gold: Math.round(c[0] * m), shards: Math.round(c[1] * m) }; }
function townBuild(k) { if (k === 'tower') return false; /* build 0087: the Watchtower only helped AI teammates, which are gone */ const h = G.hero, lv = townLv(k); if (lv >= 3) return false; const c = townCost(k, lv); if (h.gold < c.gold || (h.shards || 0) < c.shards) return false; h.gold -= c.gold; h.shards -= c.shards; h.town = h.town || {}; h.town[k] = lv + 1; computeStats(); if (typeof ALLY_SK !== 'undefined') ALLY_SK.m = allyPower(); saveGame(); if (G.inTown) buildStatic(G.zone); SFX.play('level'); ring(P.x, P.z, 0, 8, .8, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7); UI.zoneBanner(TOWN_UP[k].n + (lv ? ' upgraded' : ' built') + '!', 'Level ' + (lv + 1) + ' of 3 · ' + TOWN_UP[k].d); return true; }
function goblinGone(e) { if (typeof UI === 'undefined') return; ring(e.x, e.z, 0, 4, .6, 0xb48cff); burst(e.x, 1.2, e.z, 0xb48cff, 30, 6); SFX.play('shrine'); hint('The Treasure Goblin escaped through a portal! Catch the next one faster.'); }
function jackpot(it) { if (typeof UI === 'undefined' || !it || it.rar < 3) return; G.slowT = .9; G.shake = Math.max(G.shake || 0, .35); UI.zoneBanner(it.rar >= 4 ? 'MYTHIC!' : 'LEGENDARY!', it.name || RAR[it.rar].n + ' ' + it.slot); SFX.play('drop4'); }
// ---- build 0057: spells that look like their element. Fire bolts are licking flame with embers and smoke, frost is a spinning ice shard
// with a mist trail, lightning crackles with live arcs, arcane spins motes around a violet core. Each element hits with its own burst ----
const FX_EL = { fire: 1, cold: 1, light: 1, arc: 1 };
function fxRoom(n) { return G.fx.length < (LOWQ ? 420 : 650) - (n || 0); }
function trailFx(p, el, dt, sc) { if (!FX_EL[el] || !fxRoom() || typeof document === 'undefined') return; const ch = dt * (LOWQ ? 22 : 45) * (sc || 1), bx = p.x - p.vx * .02, bz = p.z - p.vz * .02;
  if (el === 'fire') { if (Math.random() < ch) G.fx.push({ ember: 1, x: bx + rnd(-.2, .2), y: 1.25 + rnd(-.15, .15), z: bz + rnd(-.2, .2), vx: rnd(-.8, .8), vy: rnd(.6, 2), vz: rnd(-.8, .8), life: rnd(.35, .7), max: .7, size: rnd(.04, .08), c: GLX.col(Math.random() < .5 ? 0xffb040 : 0xff6a1a) }); if (Math.random() < ch * .25) G.fx.push({ smoke: 1, x: bx, y: 1.3, z: bz, vx: rnd(-.3, .3), vy: rnd(.3, .8), vz: rnd(-.3, .3), life: rnd(.5, .9), max: .9, size: rnd(.12, .2), c: GLX.col(0x3a2a22) }); }
  else if (el === 'cold') { if (Math.random() < ch * .8) G.fx.push({ x: bx + rnd(-.25, .25), y: 1.25 + rnd(-.2, .2), z: bz + rnd(-.25, .25), vx: rnd(-.4, .4), vy: rnd(-.5, .5), vz: rnd(-.4, .4), life: rnd(.3, .6), max: .6, size: rnd(.03, .06), c: GLX.col(Math.random() < .5 ? 0xffffff : 0xa8e4ff) }); if (Math.random() < ch * .3) G.fx.push({ dust: 1, smoke: 1, x: bx, y: 1.2, z: bz, vx: 0, vy: .2, vz: 0, life: rnd(.4, .7), max: .7, size: .2, c: GLX.col(0xc8eaff) }); }
  else if (el === 'light') { if (Math.random() < ch * .5) { const a = rnd(6.28), sp = rnd(3, 6); G.fx.push({ spk: 1, x: p.x, y: 1.25, z: p.z, vx: Math.cos(a) * sp, vy: rnd(-2, 3), vz: Math.sin(a) * sp, life: rnd(.1, .2), max: .2, c: GLX.col(Math.random() < .5 ? 0xffffff : 0xfff07a) }); } }
  else if (Math.random() < ch * .6) G.fx.push({ ember: 1, x: bx + rnd(-.3, .3), y: 1.25 + rnd(-.3, .3), z: bz + rnd(-.3, .3), vx: rnd(-.5, .5), vy: rnd(-.2, .6), vz: rnd(-.5, .5), life: rnd(.4, .8), max: .8, size: rnd(.04, .07), c: GLX.col(Math.random() < .6 ? 0xc890ff : 0xffffff) }); }
function elemHit(x, z, el, big) { if (!FX_EL[el] || typeof document === 'undefined' || !fxRoom(20)) return; const m = big ? 1.6 : 1;
  if (el === 'fire') { for (let i = 0; i < 12 * m; i++) { const a = rnd(6.28), sp = rnd(.5, 2.5) * m; G.fx.push({ ember: 1, x: x + Math.cos(a) * .3, y: rnd(.3, 1.3), z: z + Math.sin(a) * .3, vx: Math.cos(a) * sp, vy: rnd(1.5, 4), vz: Math.sin(a) * sp, life: rnd(.5, 1), max: 1, size: rnd(.05, .11), c: GLX.col([0xffd060, 0xff8a2a, 0xff4a10][i % 3]) }); } for (let i = 0; i < 4 * m; i++) G.fx.push({ smoke: 1, x: x + rnd(-.4, .4), y: .8, z: z + rnd(-.4, .4), vx: rnd(-.4, .4), vy: rnd(.8, 1.6), vz: rnd(-.4, .4), life: rnd(.8, 1.3), max: 1.3, size: rnd(.2, .32), c: GLX.col(0x2a2018) }); G.fx.push({ flame: 1, x, z, r: .9 * m, life: .5, max: .5, c: GLX.col(0xff7a2a) }); }
  else if (el === 'cold') { const n = big ? 9 : 5; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + rnd(-.3, .3), d = rnd(.15, .55) * m; G.fx.push({ shard: 1, x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, rx: rnd(.25, .6), ry: a, h: rnd(.5, 1.1) * m, w: rnd(.09, .16) * m, life: rnd(.9, 1.3), max: 1.3, c: GLX.col(0x8ad8ff) }); } G.fx.push({ scorch: 1, x, z, r: .6 * m, life: 1.4, max: 1.4, c: GLX.col(0x9ad8ff) }); for (let i = 0; i < 10 * m; i++) { const a = rnd(6.28), sp = rnd(2, 5); G.fx.push({ x, y: rnd(.5, 1.3), z, vx: Math.cos(a) * sp, vy: rnd(1, 4), vz: Math.sin(a) * sp, life: rnd(.3, .6), max: .6, size: rnd(.04, .08), c: GLX.col(0xe8f8ff) }); } }
  else if (el === 'light') { for (let i = 0; i < (big ? 6 : 3); i++) { const a = rnd(6.28), L = rnd(1.2, 2.4) * m; G.fx.push({ bolt: 1, x1: x, z1: z, x2: x + Math.cos(a) * L, z2: z + Math.sin(a) * L, life: rnd(.1, .2), max: .2, c: GLX.col(0xfff07a), lo: 1 }); } }
  else { G.fx.push({ ring: 1, x, z, r0: 1.4 * m, r1: .1, life: .3, max: .3, c: GLX.col(0xb070ff) }); for (let i = 0; i < 10 * m; i++) { const a = rnd(6.28), sp = rnd(1, 3); G.fx.push({ ember: 1, x: x + Math.cos(a) * 1.2, y: rnd(.6, 1.6), z: z + Math.sin(a) * 1.2, vx: -Math.cos(a) * sp, vy: rnd(-.5, 1), vz: -Math.sin(a) * sp, life: rnd(.4, .7), max: .7, size: rnd(.05, .09), c: GLX.col(i % 2 ? 0xc890ff : 0xffffff) }); } } }
const BOLT_P = [];
function boltSeg(A, B, w, c, em, al) { const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], L = Math.hypot(dx, dy, dz) || .01; GLX.part('glow', 'box', IDM, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, -Math.asin(clamp(dy / L, -1, 1)), Math.atan2(dx, dz), 0, 0, 0, 0, w, w, L, c, em, al); }
function drawSpell(x, y, z, rot, r, el, c, lit) { const t = G.time, s = r * 1.5, sx = Math.sin(rot), cz = Math.cos(rot), W = GLX.col(0xffffff);
  if (el === 'fire') { const fl = .85 + .3 * Math.sin(t * 41 + x * 3.1); GLX.obj('glow', 'sphere', x, y, z, 0, s * .5, s * .5, s * .5, GLX.col(0xfff0c0), 2.4, 1); GLX.obj('glow', 'sphere', x, y, z, rot, s * .8 * fl, s * .8 * fl, s * 1.1 * fl, c, 1.6, .9);
    for (let k = 1; k <= 10; k++) { const u = k / 10, q = s * (.95 - u * .6) * (.85 + .3 * Math.sin(t * 37 + k * 2.3)), wob = Math.sin(t * 29 + k * 1.9) * .06 * k; GLX.obj('glow', 'sphere', x - sx * k * .2 + cz * wob, y + u * .35 + Math.sin(t * 23 + k) * .03 * k, z - cz * k * .2 - sx * wob, rot, q, q, q * 1.6, GLX.col(k < 3 ? 0xffb050 : k < 6 ? 0xff6a1a : 0xb0280a), 1.4, .42 - u * .36); }
    GLX.halo(x, y, z, r * 3.6, c, .4); if (lit) GLX.light(x, y + .3, z, 7, c, 1.1 * fl, 1); }
  else if (el === 'cold') { GLX.part('glow', 'gem', IDM, x, y, z, 0, rot, t * 9, 0, 0, 0, s * .5, s * .5, s * 2.4, c, 1.2, .85); GLX.part('glow', 'gem', IDM, x, y, z, 0, rot, -t * 7, 0, 0, 0, s * .2, s * .2, s * 1.7, W, 1.8, .8);
    GLX.obj('glow', 'box', x - sx * .9, y, z - cz * .9, rot, .05, .05, 1.6, GLX.col(0xc8eaff), 1, .35); GLX.obj('glow', 'ring', x, y, z, t * 5, s * 1.5, 1, s * 1.5, c, 1, .22, -1); GLX.halo(x, y, z, r * 3.2, c, .35); if (lit) GLX.light(x, y + .3, z, 6, c, .8, 1); }
  else if (el === 'light') { const fl = .7 + .6 * Math.random(); GLX.obj('glow', 'sphere', x, y, z, 0, s * .55, s * .55, s * .55, W, 2.6, 1); GLX.obj('glow', 'sphere', x, y, z, 0, s * .75 * fl, s * .75 * fl, s * .75 * fl, c, 1.5, .6);
    for (let q = 0; q < 4; q++) { const a = Math.random() * 6.28, b = Math.random() * 1.6 - .8, L = s * (1.6 + Math.random() * 1.4), m = [x + Math.cos(a) * L * .5 + rnd(-.15, .15), y + b * L * .3, z + Math.sin(a) * L * .5 + rnd(-.15, .15)], e = [x + Math.cos(a + rnd(-.5, .5)) * L, y + b * L * .6, z + Math.sin(a + rnd(-.5, .5)) * L], o = [x, y, z]; boltSeg(o, m, .05, c, 1.8, .9); boltSeg(m, e, .035, W, 2, .8); }
    GLX.obj('glow', 'box', x - sx * .7, y, z - cz * .7, rot, .08, .08, 1.4, c, 1.5, .5); GLX.halo(x, y, z, r * 3.6 * fl, c, .4); if (lit) GLX.light(x, y + .3, z, 7, c, 1.2 * fl, 1); }
  else if (el === 'arc') { GLX.obj('glow', 'sphere', x, y, z, 0, s * .8, s * .8, s * .8, c, 1.4, .8); GLX.obj('glow', 'sphere', x, y, z, 0, s * .4, s * .45, s * .45, W, 2.2, 1);
    for (let q = 0; q < 3; q++) { const a = t * 11 + q * 2.094, rr = s * 1.5; GLX.obj('glow', 'gem', x + Math.cos(a) * rr * cz, y + Math.sin(a) * rr, z - Math.cos(a) * rr * sx, t * 9, .09, .09, .09, W, 2.4, 1); for (let k = 1; k <= 3; k++) { const b = a - k * .35; GLX.obj('glow', 'gem', x + Math.cos(b) * rr * cz - sx * k * .12, y + Math.sin(b) * rr, z - Math.cos(b) * rr * sx - cz * k * .12, 0, .07, .07, .07, c, 1.8, .8 - k * .2); } }
    GLX.obj('glow', 'ring', x, y, z, -t * 6, s * 2, 1, s * 2, c, 1, .4, -1); GLX.halo(x, y, z, r * 3.4, c, .4); if (lit) GLX.light(x, y + .3, z, 6, c, .9, 1); }
}
function burst(x, y, z, c, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(6.28), u = rnd(-.2, 1), s = rnd(.3, 1) * sp; G.fx.push({ x, y, z, vx: Math.cos(a) * s, vy: u * s, vz: Math.sin(a) * s, life: rnd(.25, .6), max: .6, size: rnd(.1, .24), c: GLX.col(c) }); } if (G.fx.length > 700) G.fx.splice(0, G.fx.length - 700); }
/* build 0064: hits land with direction. Sparks and the monster's ichor spray out the far side, heavy blows and crits leave a small splash on the floor, and crits flash a star */
function hitSpray(e, sk, crit, heavy) { if (typeof document === 'undefined' || !e.md) return; const lo = LOWQ ? .5 : 1, y = 1.1 * e.sc, el = sk.el || 'phys', C = GLX.col(crit ? 0xfff2b0 : EL_COL[el] || 0xe8e0d0);
  let dx = e.hdx, dz = e.hdz; if (dx === undefined) { const x = e.x - P.x, z = e.z - P.z, l = Math.hypot(x, z) || 1; dx = x / l; dz = z / l; } const base = Math.atan2(dx, dz);
  const ns = Math.round((crit ? 10 : heavy ? 7 : 4) * lo); for (let i = 0; i < ns; i++) { const a = base + rnd(-.65, .65), sp = rnd(7, crit ? 15 : 11); G.fx.push({ spk: 1, x: e.x + dx * .3 * e.sc, y: y + rnd(-.2, .3), z: e.z + dz * .3 * e.sc, vx: Math.sin(a) * sp, vy: rnd(1, 5), vz: Math.cos(a) * sp, life: rnd(.15, .3), max: .3, c: i % 3 ? C : GLX.col(0xffffff) }); }
  const ic = typeof hexMix === 'function' ? hexMix(e.md.c, 0x4a0606, .55) : 0x5a0c0c, IC = GLX.col(ic), nd = Math.round((crit ? 9 : heavy ? 6 : 3) * lo);
  for (let i = 0; i < nd; i++) { const a = base + rnd(-.5, .5), sp = rnd(3, crit ? 8 : 6); G.fx.push({ x: e.x + dx * .25, y: y + rnd(-.2, .2), z: e.z + dz * .25, vx: Math.sin(a) * sp, vy: rnd(1.5, 4.5), vz: Math.cos(a) * sp, life: rnd(.35, .6), max: .6, size: rnd(.07, .15), c: IC }); }
  if ((heavy || crit) && !e.dummy) { { const dd = rnd(.8, 1.8) * e.sc; G.fx.push({ scorch: 1, x: e.x + dx * dd, z: e.z + dz * dd, r: rnd(.35, .6) * e.sc * (crit ? 1.3 : 1), life: 3, max: 3, c: IC }); } }
  if (crit || (heavy && sk.type === 'melee')) G.fx.push({ xfl: 1, x: e.x - dx * .35 * e.sc, y, z: e.z - dz * .35 * e.sc, rot: base + rnd(-.4, .4), r: crit ? 2.6 : 1.5, life: crit ? .16 : .1, max: crit ? .16 : .1, c: C });
  if (el === 'fire') for (let i = 0; i < 3 * lo; i++) G.fx.push({ ember: 1, x: e.x + rnd(-.3, .3), y: y + rnd(-.3, .3), z: e.z + rnd(-.3, .3), vx: dx * rnd(.5, 2) + rnd(-.5, .5), vy: rnd(1, 2.6), vz: dz * rnd(.5, 2) + rnd(-.5, .5), life: rnd(.5, .9), max: .9, size: rnd(.05, .09), c: GLX.col(Math.random() < .5 ? 0xffb040 : 0xff6a1a) });
  else if (el === 'cold' && (heavy || crit)) for (let i = 0; i < 3; i++) { const a = base + rnd(-.8, .8), d2 = rnd(.4, .9) * e.sc; G.fx.push({ shard: 1, x: e.x + Math.sin(a) * d2, z: e.z + Math.cos(a) * d2, rx: rnd(.3, .6), ry: a, h: rnd(.4, .8), w: rnd(.07, .12), life: rnd(.6, .9), max: .9, c: GLX.col(0x9adfff) }); }
  if (G.fx.length > 900) G.fx.splice(0, G.fx.length - 900); }
/* build 0065: monsters die by their region. As the body sinks it breaks apart: crypt dead crumble to bone dust and leave bones, forest things burst into rot spores,
   lava monsters fall to glowing ash, ice monsters shatter, void monsters fold inward. A soul wisp drifts up and the remains lie a few seconds before they sink away */
function deathFx(e) { if (typeof document === 'undefined' || e.boss || e.dummy || e.escaped || !e.md || !G.zone) return; const th = G.zone.def.theme, lo = LOWQ ? .5 : 1, x = e.x, z = e.z, sc = e.sc || 1, big = e.elite ? 1.5 : 1, C = GLX.col, n = k => Math.max(1, Math.round(k * lo * big));
  const smoke = (c, k, sp) => { for (let i = 0; i < n(k); i++) G.fx.push({ smoke: 1, x: x + rnd(-.4, .4) * sc, y: rnd(.2, .8) * sc, z: z + rnd(-.4, .4) * sc, vx: rnd(-sp, sp), vy: rnd(.6, 2), vz: rnd(-sp, sp), life: rnd(.7, 1.2), max: 1.2, size: rnd(.25, .45) * sc, c: C(c) }); };
  const wisp = (c, k) => { for (let i = 0; i < n(k); i++) G.fx.push({ wisp: 1, x: x + rnd(-.3, .3), y: .8 * sc, z: z + rnd(-.3, .3), ph: rnd(6.28), life: rnd(1, 1.5), max: 1.5, c: C(c), s: rnd(.12, .2) * sc }); };
  const rem = (c, k, kind) => { const pcs = []; for (let i = 0; i < n(k); i++) { const a = rnd(6.28), d = rnd(.1, .7) * sc; pcs.push([Math.cos(a) * d, Math.sin(a) * d, rnd(6.28), rnd(.1, .2) * sc, rnd(.06, .12) * sc, rnd(.25, .5) * sc]); } G.fx.push({ rem: 1, kind, x, z, pcs, c: C(c), life: 5, max: 5 }); { let m = 0; for (let i = G.fx.length - 1; i >= 0; i--) if (G.fx[i].rem && ++m > 20) G.fx[i].life = Math.min(G.fx[i].life, 1); } };
  const md = e.md;
  if (th === 'crypt') { smoke(0xc8c0ac, 5, 1.2); burst(x, .5 * sc, z, md.c, n(8), 3); rem(0xd8d2bc, 6, 'bone'); wisp(0x9ad8ff, 2); }
  else if (th === 'lava') { smoke(0x2a2220, 4, 1); for (let i = 0; i < n(10); i++) G.fx.push({ ember: 1, x: x + rnd(-.5, .5) * sc, y: rnd(.2, 1) * sc, z: z + rnd(-.5, .5) * sc, vx: rnd(-1, 1), vy: rnd(1.5, 4), vz: rnd(-1, 1), life: rnd(.6, 1.2), max: 1.2, size: rnd(.05, .1), c: C(Math.random() < .5 ? 0xffb040 : 0xff5a1a) }); G.fx.push({ flash: 1, x, y: .8 * sc, z, r: 2 * sc, life: .18, max: .18, c: C(0xff8a3a) }); rem(0x1e1816, 5, 'ash'); }
  else if (th === 'ice') { for (let i = 0; i < n(7); i++) { const a = i / 7 * 6.28 + rnd(-.3, .3), d = rnd(.3, .9) * sc; G.fx.push({ shard: 1, x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, rx: rnd(.4, 1), ry: a, h: rnd(.4, .9) * sc, w: rnd(.08, .14) * sc, life: rnd(1, 1.6), max: 1.6, c: C(0xbfe8ff) }); } burst(x, .8 * sc, z, 0xe8f6ff, n(14), 6); ring(x, z, .2, 2.2 * sc, .4, 0xd8f2ff); rem(0xcfe8f8, 5, 'ice'); wisp(0xd8f2ff, 1); }
  else if (th === 'void') { ring(x, z, 2.6 * sc, .1, .35, 0xb070ff); G.fx.push({ flash: 1, x, y: .9 * sc, z, r: 1.8 * sc, life: .25, max: .25, c: C(0xc890ff) }); for (let i = 0; i < n(8); i++) { const a = rnd(6.28), d = rnd(1, 2) * sc; G.fx.push({ spk: 1, x: x + Math.cos(a) * d, y: rnd(.4, 1.4) * sc, z: z + Math.sin(a) * d, vx: -Math.cos(a) * d * 5, vy: rnd(-1, 1), vz: -Math.sin(a) * d * 5, life: .2, max: .2, c: C(i % 2 ? 0xb070ff : 0xffffff) }); } wisp(0xc890ff, 3); G.fx.push({ scorch: 1, x, z, r: .9 * sc, life: 3, max: 3, c: C(0x2a0a3a) }); }
  else { smoke(0x5a6a3a, 5, 1.4); for (let i = 0; i < n(8); i++) G.fx.push({ ember: 1, x: x + rnd(-.4, .4) * sc, y: rnd(.3, 1) * sc, z: z + rnd(-.4, .4) * sc, vx: rnd(-.6, .6), vy: rnd(.4, 1.4), vz: rnd(-.6, .6), life: rnd(.8, 1.4), max: 1.4, size: rnd(.04, .07), c: C(md.e || 0xc0ff40) }); rem(hexMix(md.c, 0x1a1a10, .4), 4, 'flesh'); wisp(0xd8ffb0, 1); }
  if (G.fx.length > 900) G.fx.splice(0, G.fx.length - 900); }
// spell impact (build 0018): white-hot core flash, expanding shockwave, ground scorch, flying sparks and a burst of light
function impact(x, z, r, c, heavy) { if (typeof document === 'undefined') return; const C = GLX.col(c); G.fx.push({ shock: 1, x, z, r, life: heavy ? .55 : .4, max: heavy ? .55 : .4, c: C, h: heavy ? 1 : 0 }); G.fx.push({ scorch: 1, x, z, r: r * .8, life: heavy ? 2.4 : 1.4, max: heavy ? 2.4 : 1.4, c: C });
  const n = heavy ? 18 : 9; for (let i = 0; i < n; i++) { const a = rnd(6.28), sp = rnd(6, heavy ? 15 : 10); G.fx.push({ spk: 1, x: x + Math.sin(a) * .3, y: rnd(.4, 1.4), z: z + Math.cos(a) * .3, vx: Math.sin(a) * sp, vy: rnd(2, heavy ? 9 : 6), vz: Math.cos(a) * sp, life: rnd(.3, .6), max: .6, c: i % 3 ? C : GLX.col(0xffffff) }); }
  if (heavy) { G.shake = Math.min(.6, G.shake + .22); for (let i = 0; i < 6; i++) G.fx.push({ x, y: .4, z, vx: rnd(-2, 2), vy: rnd(3, 6), vz: rnd(-2, 2), life: rnd(.6, 1), max: 1, size: rnd(.25, .4), c: GLX.col(0x5a4a3a), smoke: 1 }); }
  if (G.fx.length > 900) G.fx.splice(0, G.fx.length - 900); }
function ring(x, z, r0, r1, life, c) { G.fx.push({ ring: 1, x, z, r0, r1, life, max: life, c: GLX.col(c) }); }
function floatText(x, y, z, txt, col, life, size) { if (!G.set.nums && /^[-+✦\d]/.test(txt)) return; G.texts.push({ x: x + rnd(-.4, .4), y, z, txt, col, life: life || .9, max: life || .9, size: size || 15 }); if (G.texts.length > 60) G.texts.shift(); }
function addArea(o) { o.t = 0; G.areas.push(o); if (o.owner === 'e' && o.hvy && typeof document !== 'undefined' && !P.dead && inArea(o, P.x, P.z, 5)) { if (G.time - (G.warnT || -9) > .35) { G.warnT = G.time; SFX.play('warn'); } const h = G.hero; if (h && !h.teleHint) { h.teleHint = 1; hint(G.tj ? 'Red shapes on the ground mark a heavy blow. Step out before they fill, or tap the dodge button.' : 'Red shapes on the ground mark a heavy blow. Step out before they fill, or dodge with Space.'); } } return o; }
/* build 0048: heavy blows come in shapes (circle, cone, line, cross, rays). hvy sets the least a heavy blow takes, as a share of your life, so standing in one always hurts and stepping out always pays */
function inLine(x0, z0, ang, len, w, x, z, pad) { const s = Math.sin(ang), c = Math.cos(ang), dx = x - x0, dz = z - z0, f = dx * s + dz * c; return f >= -pad && f <= len + pad && Math.abs(dx * c - dz * s) <= w / 2 + pad; }
function areaLines(a) { if (a.sh === 'line') return [[a.x, a.z, a.ang]]; if (a.sh === 'cross') { const L = []; for (const q of [a.ang, a.ang + 1.5708]) L.push([a.x - Math.sin(q) * a.len / 2, a.z - Math.cos(q) * a.len / 2, q]); return L; } if (a.sh === 'rays') { const L = []; for (let i = 0; i < a.n; i++) L.push([a.x, a.z, a.ang + i / a.n * 6.2832]); return L; } return null; }
function angD(a, b) { let d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
function inArea(a, x, z, pad) { pad = pad || 0; const L = areaLines(a); if (L) { for (const l of L) if (inLine(l[0], l[1], l[2], a.len, a.w, x, z, pad)) return true; return false; }
  const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz); if (d > a.r + pad) return false; if (a.sh === 'cone') return d < .9 + pad || Math.abs(angD(Math.atan2(dx, dz), a.ang)) <= a.arc + pad / Math.max(1, d); return true; }
function areaOut(a, x, z) { /* the quickest way out, for the AI hero */ const L = areaLines(a); if (L) { for (const l of L) if (inLine(l[0], l[1], l[2], a.len, a.w, x, z, .8)) { const s = Math.sin(l[2]), c = Math.cos(l[2]), k = (x - l[0]) * c - (z - l[1]) * s >= 0 ? 1 : -1; return [c * k, -s * k]; } return [1, 0]; }
  const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz); if (a.sh === 'cone' && d > 1.2) { const t = a.ang + (angD(Math.atan2(dx, dz), a.ang) >= 0 ? 1.5708 : -1.5708); return [Math.sin(t), Math.cos(t)]; } return d > .1 ? [dx / d, dz / d] : [1, 0]; }
function heavyK(mul) { const dp = (G.zone && G.zone.def && G.zone.def.depth) || 1; return Math.min(.5, (.12 + Math.min(dp, 14) * .022) * (mul || 1)); }
function eTele(o) { let n = 0; for (const a of G.areas) if (a.hvy && !a.done) n++; return n >= 5 ? null : addArea(o); } // never more than five heavy blows marked at once
function areaLand(a) { const L = areaLines(a);
  if (L) { for (const l of L) for (let k = 0; k <= 4; k++) { const f = a.len * k / 4, x = l[0] + Math.sin(l[2]) * f, z = l[1] + Math.cos(l[2]) * f; burst(x, .4, z, a.c, 4, 6); } }
  else if (a.sh === 'cone') { for (let k = -2; k <= 2; k++) { const q = a.ang + a.arc * k / 2.5; for (const f of [.45, .85]) burst(a.x + Math.sin(q) * a.r * f, .4, a.z + Math.cos(q) * a.r * f, a.c, 3, 6); } }
  else { ring(a.x, a.z, a.r * .3, a.r, .3, a.c); burst(a.x, .5, a.z, a.c, 12, 7); } }

// ---------- combat ----------
function wake(e) { if (e.awake) return; if (e.boss) { e.awake = true; return; } /* the boss intro card in ui.js announces it */ for (const o of G.ents) if (o.pack === e.pack && !o.awake) { o.awake = true; o.cd = rnd(.2, .9); } }
// fighting side by side pays: +15% damage per ally within reach, up to +45% (Sprint 1)
function partyBonus() { if (!G.online || G.inTown) return 0; let n = 0; for (const id in NET.peers) { const q = NET.peers[id]; if (!q.dead && Math.hypot(q.x - P.x, q.z - P.z) < 22) n++; } return Math.min(3, n) * 15; }
// Sprint 1 resource rules, read live (not buffs): Warden's Fury guard, Brawler's Spirit speed
// build 0029: a quick dodge roll toward the mouse; untouchable for a moment, once a second
function dodge(tx, tz) { if (G.state !== 'play' || P.dead || P.dash || (P.dodgeCd || 0) > 0 || G.inTown && false) return false; let dx = (tx === undefined ? P.x + Math.sin(P.rot) : tx) - P.x, dz = (tz === undefined ? P.z + Math.cos(P.rot) : tz) - P.z; const d = Math.hypot(dx, dz); if (d < .3) { dx = Math.sin(P.rot); dz = Math.cos(P.rot); } else { dx /= d; dz /= d; }
  let ex = P.x, ez = P.z; for (let t = .5; t <= 5; t += .5) { const nx = P.x + dx * t, nz = P.z + dz * t; if (blocked(nx, nz, .55)) break; ex = nx; ez = nz; } if (Math.hypot(ex - P.x, ez - P.z) < .4) return false;
  P.act = P.move = P.atk = null; P.rot = Math.atan2(dx, dz); P.dash = { x0: P.x, z0: P.z, x1: ex, z1: ez, t: 0, dur: .22, sk: { flat: 1 } }; P.iframes = Math.max(P.iframes || 0, .35); P.dodgeCd = 1; for (let i = 0; i < 6; i++) G.fx.push({ smoke: 1, x: P.x - dx * i * .3 + rnd(-.3, .3), y: .3, z: P.z - dz * i * .3 + rnd(-.3, .3), vx: rnd(-.5, .5), vy: rnd(.3, .9), vz: rnd(-.5, .5), life: rnd(.4, .7), max: .7, size: rnd(.3, .5), c: GLX.col(0xa89a80) }); SFX.play('leap'); return true; }
/* build 0051: how hot the fight is, from 0 (calm) to 1 (a boss), for the fight music. It holds a few seconds after the last foe so the music doesn't cut in and out */
function fightHeat(dt) {
  let k = 0; if (G.state === 'play' && !G.inTown && !P.dead && G.ents) { let n = 0, el = 0; for (const e of G.ents) { if (!e.alive || !e.awake || e.dummy) continue; if (Math.hypot(e.x - P.x, e.z - P.z) > 17) continue; if (e.boss) { n = -1; break; } n++; if (e.elite) el = 1; } k = n < 0 ? 1 : n ? Math.min(.85, .38 + n * .06 + el * .22) : 0; }
  if (k > 0) { G.heatK = Math.max(k, (G.heatK || 0) * .97); G.heatT = 4.5; } else if ((G.heatT = (G.heatT || 0) - dt) > 0) k = (G.heatK || 0) * .8; else G.heatK = 0;
  return k;
}
/* build 0052: fire flickers like fire: three waves that drift in and out of step, and now and then a gust that dips it */
function fireFl(t, s) { const g = Math.sin(t * 1.9 + s * 3.1) * Math.sin(t * .73 + s); return 1 + Math.sin(t * 9.7 + s) * .055 + Math.sin(t * 15.3 + s * 1.7) * .04 + Math.sin(t * 23.1 + s * 2.3) * .025 - Math.max(0, g - .55) * .5; }
function furyDR() { return G.hero && G.hero.cls === 'warden' && P.mana >= 30 ? 15 : 0; }
function aspdK() { return G.hero && G.hero.cls === 'brawler' && P.mana > 60 ? 1.1 : 1; }
// Sprint 1 damage meter: every hit you land, for DPS over the last 10 seconds and the biggest single hit
// Sprint 1: the hero's expected basic-attack hit, the same sum mkEnemy and rollDmg use (average weapon roll instead of the low roll, no crit)
function expHit() { const s = P.stats; if (!s || !s.wmin || !G.hero) return 0; const bs = (!G.hero.eq.weapon ? SKILLS.punch : SKILLS[G.hero.bar[0]]) || SKILLS.punch; return ((s.wmin + s.wmax) / 2 + s.addPhys + s.addFire + s.addCold + s.addLight) * (1 + (s.dmg + (s[bs.el] || 0) + (bs.el !== 'phys' ? s.ele : 0)) / 100) * (bs.m || 1) * (1 + partyBonus() / 100); }
function meterHit(v) { const m = P.meter || (P.meter = { log: [], peak: 0 }); m.log.push([G.time, v]); if (v > m.peak) m.peak = v; while (m.log.length && m.log[0][0] < G.time - 10) m.log.shift(); }
function meterDps() { const m = P.meter; if (!m) return 0; let t = 0; for (const q of m.log) if (q[0] >= G.time - 10) t += q[1]; return Math.round(t / 10); }
function rollDmg(sk, mult) { const s = P.stats; const base = rnd(s.wmin, s.wmax) + s.addPhys + s.addFire + s.addCold + s.addLight; let inc = s.dmg + (s[sk.el] || 0) + (sk.el !== 'phys' ? s.ele : 0); if (s.lowLife && P.hp < s.maxLife * .5) inc += s.lowLife; let v = base * sk.m * (mult || 1) * (1 + inc / 100) * (1 + partyBonus() / 100); const crit = Math.random() * 100 < s.critT + (sk.crit || 0); if (crit) v *= s.critM; return { v, crit }; }
/* build 0034: a training dummy in town. It never fights back or dies; it shows your damage per second, total and biggest hit, and resets after 4 seconds without a hit */
function addDummy() { const cx = GW / 2 * CS, cz = GW / 2 * CS; let x = cx - 6.5, z = cz + 10.5; for (let k = 0; k < 40 && blocked(x, z, 1); k++) { x = cx - 6.5 + rnd(-4, 4); z = cz + 10.5 + rnd(-4, 4); }
  const key = Object.keys(ARCH)[0], h = G.hero; G.ents.push({ id: ++G.eid, md: { n: 'Training Dummy', c: 0xc8a868, c2: 0x6a4a2a, e: 0xffd070 }, a: ARCH[key], arch: key, x, z, rot: 0, lvl: h ? h.level : 1, elite: 0, pack: -1, r: .7, sc: 1, maxHp: 1e12, hp: 1e12, dmg: 0, spd: 0, st: 'idle', t: 0, cd: 0, walk: 0, awake: true, flash: 0, chill: 0, shock: 0, frozen: 0, burn: 0, burnT: 0, atk: 0, alive: true, deadT: 0, modT: 0, name: 'Training Dummy', mods: [], dummy: 1, wob: 0, tot: 0, big: 0, t0: 0, lastT: -99 }); }
function dummyHit(e, v) { if (G.time - e.lastT > 4) { e.t0 = G.time; e.tot = 0; e.big = 0; e.n = 0; } e.tot += v; e.big = Math.max(e.big, v); e.n++; e.lastT = G.time; e.wob = 1; e.hp = e.maxHp; }
function dummyDps(e) { if (!e.tot) return 0; const live = G.time - e.lastT <= 4, span = (live ? G.time : e.lastT) - e.t0; return e.tot / Math.max(1, span); }
function hitEnemy(e, sk, mult, noProc) { if (e && e.alive && e.arch === 'goblin' && typeof UI !== 'undefined' && Math.random() < .55) dropGold(e.x, e.z, (4 + (G.hero ? G.hero.level : 1) * 2) * rnd(.8, 1.3)); /* build 0027: coins fly out with every hit */
  if (!e.alive) return; e.byAlly = !!(sk && sk.type === 'ally'); if (sk.type !== 'ally') { const s0 = P.stats; let k = 1; const ex = (sk.exec || 0) + (s0.exec || 0), vc = (sk.vsCtl || 0) + (s0.vsCtl || 0), gp = sk.grp || 0; if (ex && e.hp < e.maxHp / 3) k *= 1 + ex / 100; if (vc && (e.frozen > 0 || e.chill > 0)) k *= 1 + vc / 100; if (gp) { let n = 0; for (const o of G.ents) if (o !== e && o.alive && !o.dummy && Math.hypot(o.x - e.x, o.z - e.z) < 4 && ++n >= 5) break; k *= 1 + gp * n / 100; } if (k !== 1) mult = (mult || 1) * k; } /* build 0074: talent cards */
  const s = P.stats, d = rollDmg(sk, mult); let v = d.v; if (e.armored) v *= .6; if (e.shock > 0) v *= 1.15; if (!e.boss && !e.elite && e.hp > e.maxHp * .95) v = Math.min(v, e.maxHp * .65); v = Math.max(1, Math.round(v)); if (e.wb) { v = Math.min(v, Math.max(1, Math.ceil(e.maxHp * WB_HIT))); if (!sk || sk.type !== 'ally') G.wbHit = 1; } /* build 0075: the world boss is the one long fight, and landing a hit yourself is what earns the Mythic */ // house rule: ordinary monsters always take at least 2 hits
  if (sk.type === 'ally' && e.boss) v = Math.max(1, Math.round(v * .4)); /* build 0062: teammates chip a guardian, the hero brings it down */ if (!e.boss && !e.elite && !e.dummy) { if (!noProc) e.nh = (e.nh || 0) + 1; if (e.nh < 2) v = Math.min(v, Math.max(1, Math.floor(e.hp - 1))); } /* build 0062 (playtest): nothing finishes an ordinary monster before its second hit */ if (sk.type === 'ally' && !e.dummy) { const cap = Math.floor(e.hp - e.maxHp * .12); if (cap < 1) { e.flash = .06; wake(e); return; } v = Math.min(v, cap); } // build 0054: teammates soften monsters up, the hero lands the kill
  const over = v > 3 * Math.max(1, e.hp); /* Sprint 1: overkill, more than three times the life it had left */ meterHit(v); if (e.dummy) dummyHit(e, v);
  e.hp -= v; e.flash = .13; wake(e); P.lastHit = G.time; if (sk.gen) P.mana = Math.min(s.maxMana, P.mana + sk.gen); if (sk.heal && sk.type !== 'ally') P.hp = Math.min(s.maxLife, P.hp + s.maxLife * sk.heal / 100); if (sk.ref) P.mana = Math.min(s.maxMana, P.mana + sk.ref);
  floatText(e.x, 1.6 * e.sc + .6, e.z, (d.crit ? '✦' : '') + v, d.crit ? '#ffe14a' : EL_CSS[sk.el], d.crit ? 1.1 : .8, d.crit ? 21 : 15);
  if (sk.freeze && !e.boss) e.frozen = sk.freeze;
  if (sk.el === 'fire' && sk.type !== 'ally') { e.burn = Math.max(e.burn, v * .15); e.burnT = 3; } else if (sk.el === 'cold') e.chill = 2.5; else if (sk.el === 'light') e.shock = 3;
  if (s.lifeOnHit) P.hp = Math.min(s.maxLife, P.hp + s.lifeOnHit); if (s.leech) P.hp = Math.min(s.maxLife, P.hp + v * s.leech / 100);
  { const heavy = sk.type === 'melee' || !!sk.land || sk.type === 'nova', dx = e.x - P.x, dz = e.z - P.z, l = Math.hypot(dx, dz) || 1, wt = e.boss ? .15 : e.arch === 'brute' || e.elite ? .45 : e.arch === 'swarm' ? 1.3 : 1, pw = (heavy ? 1 : .45) * (d.crit ? 1.5 : 1) * wt; // build 0048: hits have weight. Every hit makes the monster flinch and lean back, heavy hits and crits shove it, and a heavy blow breaks a wind-up
    e.hdx = dx / l; e.hdz = dz / l; e.hf = .22; e.hp0 = pw; e.lheavy = heavy || d.crit;
    if (!G.online && !e.dummy && !e.boss) { const kb = 7 * pw; e.kvx = (e.kvx || 0) + e.hdx * kb; e.kvz = (e.kvz || 0) + e.hdz * kb; }
    if (!G.online && !e.boss && !e.dummy && (heavy || d.crit) && (!e.elite || d.crit) && (e.st === 'wind' || e.st === 'hwind' || e.st === 'cwind') && e.arch !== 'bomber') { e.st = 'rec'; e.t = .45; e.atk = 0; for (const a of G.areas) if (a.src === e && !a.done && a.owner === 'e') { a.done = true; a.t = a.delay; } floatText(e.x, 2.2 * e.sc + .4, e.z, 'Staggered', '#ffd27a', .7, 13); } }
  burst(e.x, 1.1 * e.sc, e.z, d.crit ? 0xffe14a : EL_COL[sk.el], d.crit ? 12 : 6, d.crit ? 7 : 5); hitSpray(e, sk, d.crit, sk.type === 'melee' || !!sk.land || sk.type === 'nova');
  { const heavy = sk.type === 'melee' || !!sk.land || sk.type === 'nova'; G.fx.push({ flash: 1, x: e.x, y: 1.1 * e.sc, z: e.z, r: d.crit ? 3.2 : heavy ? 2.2 : 1.4, life: .12, max: .12, c: GLX.col(d.crit ? 0xfff2b0 : EL_COL[sk.el]) }); if (heavy && !G.auto) G.hitStop = Math.max(G.hitStop || 0, d.crit ? .085 : .04); if (d.crit) G.shake = Math.min(.5, G.shake + .12); }
  if (over) { burst(e.x, 1.1 * e.sc, e.z, e.md.c2, 30, 10); burst(e.x, .4, e.z, 0x7a1010, 18, 6); ring(e.x, e.z, 0, 3.4 * e.sc, .35, 0xffd0a0); G.fx.push({ scorch: 1, x: e.x, z: e.z, r: 1.6 * e.sc, life: 2, max: 2, c: GLX.col(0x5a0c0c) }); if (!G.auto) G.hitStop = Math.max(G.hitStop || 0, .14); G.shake = Math.min(.6, G.shake + .2); }
  if (G.time - G.hitSfx > .05) { G.hitSfx = G.time; SFX.play(d.crit ? 'crit' : 'hit'); }
  if (!noProc && s.procLight && Math.random() * 100 < s.procLight) addArea({ x: e.x, z: e.z, r: 2.6, delay: .15, owner: 'p', sk: { el: 'light', m: 1.5 }, c: 0xfff07a, proc: 1 });
  if (e.dummy) return;
  if (G.online) { const cl = !e.boss && s.cull && e.hp < e.maxHp * s.cull / 100; NET.send({ t: 'hit', id: e.id, v: cl ? e.maxHp * 2 : v, el: sk.el, fz: sk.freeze || 0 }); if (e.hp < 0) e.hp = 0; return; }
  if (e.hp <= 0 || (!e.boss && s.cull && e.hp < e.maxHp * s.cull / 100)) killEnemy(e);
}
function flingCorpse(e) { /* build 0048: kills go flying, away from the hero; heavy hits and crits throw them further. Bosses fall where they stand */ if (e.boss || e.dummy || typeof document === 'undefined') return; let dx = e.hdx, dz = e.hdz; if (dx === undefined) { const x = e.x - P.x, z = e.z - P.z, l = Math.hypot(x, z) || 1; dx = x / l; dz = z / l; }
  const w = e.arch === 'brute' || e.elite ? .55 : e.arch === 'swarm' ? 1.3 : 1, sp = (e.lheavy ? 9 : 5.5) * w * rnd(.85, 1.15); e.fly = { vx: dx * sp, vz: dz * sp, vy: (e.lheavy ? 5.5 : 3.5) * Math.min(1.2, w), y: 0, tilt: 0, tv: -(e.lheavy ? 9 : 6), side: rnd(-.6, .6) }; e.deadT = .95; e.dmax = .95; }
function flyStep(e, dt) { const f = e.fly; if (!f) return; if (!moveEnt(e, f.vx * dt, f.vz * dt, .3)) { f.vx *= -.25; f.vz *= -.25; } f.vy -= 22 * dt; f.y += f.vy * dt; if (f.y <= 0) { if (f.vy < -4 && !f.thud) { f.thud = 1; burst(e.x, .2, e.z, 0x8a7a60, 6, 3); } f.y = 0; f.vy = Math.abs(f.vy) * .25; f.vx *= .55; f.vz *= .55; if (f.vy < 1) f.vy = 0; } f.tilt = Math.max(-1.5, f.tilt + f.tv * dt); if (f.tilt <= -1.5) f.tv = 0; }
function xpPf(lvl) { const diff = G.hero.level - lvl; return diff > 4 ? Math.max(.1, 1 - (diff - 4) * .15) : 1; }
function xpFor(lvl, mult, elite) { return 22 * Math.pow(1.13, lvl) * mult * (elite === 1 ? 3 : elite === 2 ? 6 : 1) * xpPf(lvl); }
function killEnemy(e) {
  if (!e.alive) return; e.alive = false; e.deadT = .45; flingCorpse(e); const h = G.hero, s = P.stats; h.kills++; if (h.cls === 'arcanist') P.arcT = G.time + 2; /* Sprint 1: +40% Arcane Power regen for 2 s after a kill (refreshes, never stacks) */ if (h.goals && !h.goals.kill && !e.byAlly) { h.goals.k = (h.goals.k || 0) + 1; if (h.goals.k >= 5) goalDone('kill'); } if (e.boss && !e.wb) goalDone('boss'); stKill(e);
  let xp = xpFor(e.lvl, e.a.xp || 1, e.elite), pf = xpPf(e.lvl); if (e.boss) { xp = Math.max(xp, xpNeed(h.level) * .65 * pf); G.bossXp = Math.round(xp); } /* one announcement only: the Guardian slain banner shows the XP */ /* Lee, Nov 13: guardians give a lot of XP, about two thirds of a level */ if (G.set.nums !== false && h.level < MAX_LEVEL) floatText(e.x, 2.4 * e.sc, e.z, '+' + Math.max(1, Math.round(xp)) + ' xp', '#cfc4ff', 1, 12); gainXp(xp);
  G.streak++; G.streakT = 4; if (G.streak > G.bestStreak) G.bestStreak = G.streak; if (G.streak > (h.best || 0)) h.best = G.streak;
  { const MS = { 10: ['Rampage!', 0xffb03a], 25: ['Massacre!', 0xff6a3a], 50: ['Unstoppable!', 0xff3a6a], 100: ['Godlike!', 0xc070ff] }, m = MS[G.streak]; if (m) { const bonus = Math.round((8 + h.level * 4) * (G.streak / 10)); h.gold += bonus; UI.streakPop && UI.streakPop('x' + G.streak + ' ' + m[0], '+' + bonus + ' gold', m[1]); impact(P.x, P.z, 2.2, m[1], true); SFX.play('level'); } } // kill streak milestones with a small gold bonus
  if (!G.inTown && h.tq) { const q = tqCur(); if (q) { const g = q.goal; const fl = G.zone.def.depth || 1; if (g.k === 'kills') tqAdd('kills'); else if (g.k === 'elite' && e.elite) tqAdd('elite'); else if (g.k === 'arch' && e.arch === g.arch) tqAdd('arch'); else if (g.k === 'boss' && e.boss && fl >= (g.min || 1)) tqAdd('boss'); else if (g.k === 'collect' && fl >= (g.min || 1) && h.tq.n + G.drops.filter(d => d.q).length < g.n && Math.random() < (e.boss ? 1 : e.elite ? .7 : g.p)) G.drops.push({ q: g.item, qc: g.c, x: e.x + rnd(-.5, .5), z: e.z + rnd(-.5, .5), t: 0, y: 0 }); } } // townsfolk quests
  if (!e.wb) dropLoot(e); else if (G.wbHit) { dropLoot(e); wbReward(e.x, e.z); } burst(e.x, 1, e.z, e.md.c2, 8, 6); deathFx(e); SFX.play(e.elite || e.boss ? 'bigkill' : 'kill');
  if (!e.noLoot && (e.elite || Math.random() < .12)) { const sp = e.boss ? lootFan(e.x, e.z, 0, 1) : null; G.drops.push({ x: sp ? sp[0] : e.x, z: sp ? sp[1] : e.z, globe: 1, t: 0 }); }
  if (s.boomFire) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'fire', m: 1.2 }, c: 0xff7a2a, proc: 1 });
  if (s.boomCold) addArea({ x: e.x, z: e.z, r: 3.4, delay: .12, owner: 'p', sk: { el: 'cold', m: 1.0 }, c: 0x7ad0ff, proc: 1 });
  if (e.volatile && !G.online) addArea({ x: e.x, z: e.z, r: 3.2, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'fire', c: 0xff5a2a });
  if (e.molten && !G.online) addArea({ x: e.x, z: e.z, r: 2.6, delay: .7, owner: 'e', dmg: e.dmg * 1.3, el: 'fire', c: 0xff7a2a });
  if (e.wb) { G.wboss = null; G.shake = .9; ring(e.x, e.z, 0, 18, 1.2, 0xc070ff); ring(e.x, e.z, 0, 10, .8, 0xffffff); burst(e.x, 2.5, e.z, 0xc070ff, 80, 13); SFX.play('bossdie'); SFX.play('level'); saveGame(); }
  else if (e.boss) {
    if (G.zone.def.rift && !G.riftDone && !G.online) riftDone((G.time - G.riftT0) * 1000, G.zone.def.lvl);
    if (typeof GPS !== 'undefined') GPS.t = 0; G.zone.cleared = true; G.shake = .9; ring(e.x, e.z, 0, 16, 1.1, e.md.e); burst(e.x, 2, e.z, e.md.e, 60, 11); SFX.play('level'); h.runs++; h.maxClear = Math.max(h.maxClear || 0, G.zone.def.depth || 1); /* deepest floor you have completed, for the leaderboard */
    G.zone.objs.push({ kind: 'portal', x: e.x, z: e.z, name: 'Next floor', used: false }); h.depthMax = Math.max(h.depthMax || 0, G.zone.def.depth || 1); if (!G.zone.def.rift) UI.zoneBanner('Guardian slain', (G.bossXp ? '+' + G.bossXp.toLocaleString() + ' XP · ' : '') + 'a great gate opens to the next floor'); ring(e.x, e.z, 0, 16, 1.2, 0x7ad0ff); ring(e.x, e.z, 0, 9, .8, 0xb48cff); burst(e.x, 2, e.z, 0x7ad0ff, 60, 12); G.shake = .9; SFX.play('shrine'); saveGame(); tierWin(); if (!G.zone.def.rift) stBoss(G.zone.def.depth || 1);
  }
}
// ---- first steps ----
function goalDone(k) { const h = G.hero; if (!h || !h.goals || h.goals.all || h.goals[k]) return; h.goals[k] = 1; const g = GOALS.find(x => x[0] === k), now = Date.now(), wait = Math.max(0, (G._gqT || 0) - now); G._gqT = now + wait + 1600; const show = () => { SFX.play('shrine'); floatText(P.x, 3.2, P.z, '✓ ' + g[1], '#9effa8', 2, 16); }; if (wait > 0 && typeof setTimeout === 'function') setTimeout(show, wait); else show(); /* build 0062 (playtest): First Steps ticks come one at a time instead of piling up */
  if (GOALS.every(x => h.goals[x[0]])) { h.goals.all = 1; if (typeof UI !== 'undefined') UI.zoneBanner('First steps complete', 'The deep is yours to explore'); SFX.play('level'); } saveGame(); }
const blessed = () => { const h = G.hero; return !!h && !h.runs && h.level < 4; }; // newcomer's blessing: softer hits until the first guardian falls
function dmgPlayer(v, el, src, hvy) {
  if (P.dead || P.iframes > 0) return; const s = P.stats; if (blessed()) v *= .6; if (src && src.name) P.killer = src.name; else if (!src) P.killer = '';
  if (Math.random() * 100 < s.dodgeT) { floatText(P.x, 2.6, P.z, 'Dodge', '#9fe', .7); return; }
  if (el === 'phys') v *= 1 - Math.min(.8, s.armorT / (s.armorT + 60 + v * 6)); else v *= 1 - (s['r' + el] || 0) / 100; v *= 1 - Math.min(50, s.dr + furyDR()) / 100; if (hvy > 0) v = Math.max(v, s.maxLife * Math.min(.5, hvy) * (blessed() ? .6 : 1) * (1 - Math.min(50, s.dr + furyDR()) / 100)); v = Math.max(1, Math.round(v));
  P.hp -= v; P.hurt = .25; P.lastHit = G.time; P.mana = Math.min(s.maxMana, P.mana + 2); G.shake = Math.min(.7, G.shake + .12 + v / s.maxLife); floatText(P.x, 2.6, P.z, '-' + v, '#ff5a4a', .9, 17); SFX.play('hurt'); burst(P.x, 1.4, P.z, 0xffc070, 7, 5); { const hf = typeof document !== 'undefined' && document.getElementById('hurtFx'); if (hf && hf.animate) hf.animate([{ opacity: Math.min(.75, .3 + v / s.maxLife * 2) }, { opacity: 0 }], { duration: 450, easing: 'ease-out' }); }
  if (src && src.alive && s.thorns > 0) { src.flash = .1; if (G.online) NET.send({ t: 'hit', id: src.id, v: s.thorns, el: 'phys' }); else { src.hp = Math.max(!src.boss && !src.elite && (src.nh || 0) < 2 ? 1 : -1e9, src.hp - s.thorns); if (src.hp <= 0) killEnemy(src); } }
  if (P.hp <= 0) { if (s.cheat && P.cheatCd <= 0) { P.hp = s.maxLife; P.cheatCd = 60; ring(P.x, P.z, 0, 10, .8, 0xff8a2a); hint('Emberheart saves you from death!'); } else { P.hp = 0; P.dead = true; P.act = P.spin = P.dash = null; G.streak = 0; SFX.play('die'); UI.showDeath(); } }
}
function autoCast(...a) { P._auto = 1; try { return tryCast(...a); } finally { P._auto = 0; } }
function tryCast(slot, tx, tz) {
  const h = G.hero, s = P.stats; let id = h.bar[slot];
  if (!h.eq.weapon) { if (slot !== 0) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Unarmed: you can only punch until you equip a weapon.'); } return false; } id = 'punch'; }
  if (!id) return false; const sk = talSk(id);
  if (P.act || P.dash || (P.cds[id] || 0) > 0) return false; if (sk.type === 'spin' && P.spin) return false;
  if (P.mana < (sk.cost || 0)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Not enough ' + CLASSES[h.cls].res.n + '.'); } return false; }
  if (tx === undefined) { tx = IN.gx; tz = IN.gz; }
  P.mana -= sk.cost || 0; if (sk.cd) P.cds[id] = sk.cd * (1 - s.cdrT / 100);
  if (sk.buff && sk.buff.s) { P.buffs = P.buffs.filter(b => b.n !== sk.buff.n); P.buffs.push({ s: sk.buff.s, t: sk.buff.t, n: sk.buff.n }); computeStats(); } /* build 0074: a talent card's short boost */
  const sp = (1 + s.aspd / 100) * aspdK();
  if (sk.type === 'spin') { P.spin = { t: sk.dur, tk: 0, sk }; return true; }
  if (slot > 0 && !P._auto) goalDone('skill'); /* build 0062 (playtest): only a skill you cast yourself ticks First Steps, not autocast */
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
  if (sk.echo && !a.echoed) G.timers.push({ t: .3, fn: () => { if (!P.dead) fireSkill(Object.assign({}, a, { echoed: 1, sk: Object.assign({}, sk, { m: sk.m * sk.echo / 100, echo: 0 }) })); } }); /* build 0074: a talent card's second go */
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
// build 0072 (Lee's playtest): a first walk round Emberwatch, so nobody misses the Trader, the Stash or the Altar
const TOUR = { vendor: 'Trader', stash: 'Stash', altar: 'Altar' }, TOUR_ORDER = ['vendor', 'stash', 'altar'];
function tourNext() { const h = G.hero; if (!h) return null; return TOUR_ORDER.find(k => !(h.tour || {})[k]) || null; }
function questTarget() {
  const Z = G.zone; if (!Z) return null; const h = G.hero, cq = tqCur ? tqCur() : null;
  if (G.inTown) { const sc = stCur(), sn = sc && sc.k === 'talk' && Z.objs.find(o => o.kind === 'npc' && o.id === sc.by); if (sn) { const at = sn.st || sn; return { x: at.x, z: at.z, text: sc.goal }; } const tn = tourNext(), to = tn && Z.objs.find(o => o.kind === tn); if (to) return { x: to.x, z: to.z, text: 'Visit the ' + TOUR[tn] }; } /* build 0068: the story path; 0072: then the town walk */
  if (G.inTown) { /* build 0025: the path leads to whoever is waiting for you first */ const who = cq ? (h.tq.n >= cq.goal.n ? cq.by : null) : (tqNext() ? tqNext().by : null), npc = who && Z.objs.find(o => o.kind === 'npc' && o.id === who);
    if (npc) { const at = npc.st || npc; return { x: at.x, z: at.z, text: (cq ? 'Collect your reward from ' : 'Talk to ') + FOLK[who].n + (cq ? '' : ': they have a job for you') }; }
    const o = Z.objs.find(o => o.kind === 'tportal'); return { x: o.x, z: o.z, text: cq ? 'Take the portal back out to work on ' + cq.t : 'Take the portal back to ' + (G.away && G.away.zone ? G.away.zone.def.name : 'the floor') }; }
  if (cq && cq.goal.k === 'rescue' && h.tq.n < cq.goal.n) { const pip = Z.objs.find(o => o.kind === 'lost' && !o.used); if (pip) return { x: pip.x, z: pip.z, text: 'Find Pip: follow the path, he is hiding on this floor' }; }
  { const sc = stCur(), cap = sc && sc.k === 'rescue' && Z.objs.find(o => o.kind === 'captive' && !o.used); if (cap) return { x: cap.x, z: cap.z, text: 'Find ' + cap.name + ': follow the path' }; }
  const po = Z.objs.find(o => o.kind === 'portal' && !o.used); if (po) return { x: po.x, z: po.z, text: 'Take the portal deeper' };
  const b = G.boss; return { x: b ? b.x : Z.bossAt[0], z: b ? b.z : Z.bossAt[1], text: 'Find and slay ' + (b ? b.name : bossFor(Z.def.theme, Z.def.depth, Z.def.rift).n) };
}
function updGps(dt) {
  GPS.t -= dt; if (GPS.t > 0) return; GPS.t = .4; const q = questTarget(); GPS.goal = q; GPS.text = q ? q.text : ''; GPS.pts = []; if (!q || !G.set.gps) return;
  const f = botField(), gc = cellOf(q.x, q.z); if (f.prev[gc] < 0) return; const out = [[q.x, q.z]]; let k = gc; while (k !== f.s) { k = f.prev[k]; if (k !== f.s) out.push([(k % GW + .5) * CS, ((k / GW | 0) + .5) * CS]); } out.push([P.x, P.z]); GPS.pts = out.reverse();
}

// ---------- autoplay ----------
const BOT = { t: 0, path: null, rv: 0, dodge: 0, kite: 0 };
// ---- AI teammates (build 0034, Lee Nov 15): AI heroes fill your party so you never play alone; one steps aside for each real player who joins ----
const AI_MAX = 3; // you plus up to three AI heroes makes a party of four
const AI_ROSTER = { warden: { name: 'Bram', w: 0, el: 'phys', range: 2.4, c: 0xfff0c0, sp: 'slam' }, ranger: { name: 'Sera', w: 5, el: 'phys', range: 9, c: 0xfff0c0, sp: 'volley' }, elementalist: { name: 'Pyra', w: 3, el: 'fire', range: 8.5, c: 0xff7a2a, sp: 'meteor' }, arcanist: { name: 'Ilsa', w: 4, el: 'arc', range: 8.5, c: 0xb48cff, sp: 'orb' }, brawler: { name: 'Tor', w: 7, el: 'phys', range: 2.2, c: 0xffc070, sp: 'sweep' } };
const AI_ORDER = ['warden', 'ranger', 'elementalist', 'arcanist', 'brawler']; // a tank, an archer and a caster first
const ALLIES = []; // your own AI teammates (only the party host runs them online; the others see them through the host)
const ALLY = ALLIES; /* kept for older references */
const ALLY_SK = { n: 'Teammate', type: 'ally', el: 'phys', m: .23 };
function allyPower() { return .6 * (1 + .15 * townLv('tower')); } /* the whole AI team together hits for about 60% of you plus 15% (more with the Watchtower) */
function aiEach() { return allyPower() * 1.15 / AI_MAX; }
function allyGive() { return false; }
function allyTake() { }
function aiGear(cls, r) { // a fixed outfit per class, trimmed by how far you have come
  const R = AI_ROSTER[cls], plate = cls === 'warden', robe = cls === 'arcanist' || cls === 'elementalist'; let c = '';
  for (const sl of GSL) { const b = sl === 'weapon' ? R.w : sl === 'offhand' || sl === 'amulet' ? 0 : plate ? 0 : robe && (sl === 'helm' || sl === 'chest') ? 2 : 1; c += b + '' + r; }
  return gearDecode(c);
}
function aiTier() { const l = G.hero ? G.hero.level : 1; return l < 8 ? 1 : l < 20 ? 2 : 3; }
function aiPick(n) { const mine = G.hero ? G.hero.cls : 'warden', tank = mine !== 'warden' ? 'warden' : 'brawler', heal = mine !== 'arcanist' ? 'arcanist' : 'elementalist'; return [tank, heal, ...AI_ORDER.filter(c => c !== mine && c !== tank && c !== heal)].slice(0, n); } /* build 0054: a tank, a healer, then a damage dealer */
const AI_ROLE = ['tank', 'heal', 'dps'];
function aiHumans() { return G.online ? Object.keys(NET.names).filter(i => +i !== NET.id).length : 0; }
function aiHost() { if (!G.online) return true; const ids = Object.keys(NET.names).map(Number); return !ids.length || NET.id <= Math.min(...ids); } // the lowest id in the party runs the AI
function aiWant() { return 0; /* build 0087 (Lee, Nov 15: get rid of the AI teammates): none join any party any more; the old code below is kept switched off */ if (G.set.ally === false || G.inTown || P.dead || G.state !== 'play' || !aiHost()) return 0; return Math.max(0, AI_MAX - aiHumans()); }
function mkAlly(cls, i) { const a = { x: P.x - 1.5 + i, y: 0, z: P.z + 1.5 - i * .6, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls, on: true, cd: rnd(.2, 1), spT: 3 + i * 2.2, name: AI_ROSTER[cls].name, ai: 1, role: AI_ROLE[i] || 'dps', tauntT: 1 + i, healT: 2, gear: aiGear(cls, aiTier()), sk: { n: AI_ROSTER[cls].name, type: 'ally', el: AI_ROSTER[cls].el, m: aiEach() } }; return a; }
function aiSpecial(a, tg) { // each AI hero has one signature move, used every few seconds
  const R = AI_ROSTER[a.cls], m = aiEach() * 2.2;
  if (R.sp === 'volley') { const near = G.ents.filter(e => e.alive && e.awake && Math.hypot(e.x - a.x, e.z - a.z) < 11).slice(0, 3); for (const e of near) { G.fx.push({ bolt: 1, x1: a.x, z1: a.z, x2: e.x, z2: e.z, life: .14, max: .14, c: GLX.col(0xd8ff9a) }); hitEnemy(e, { n: R.name, type: 'ally', el: 'phys', m: m * .6 }, 1, true); } return; }
  const at = R.sp === 'sweep' || R.sp === 'slam' ? [a.x, a.z] : [tg.x, tg.z], rr = R.sp === 'meteor' ? 3 : R.sp === 'slam' ? 3 : 2.6, col = R.sp === 'meteor' ? 0xff7a2a : R.sp === 'orb' ? 0xb48cff : 0xffd0a0;
  if (R.sp === 'orb' || R.sp === 'meteor') G.fx.push({ bolt: 1, x1: a.x, z1: a.z, x2: at[0], z2: at[1], life: .18, max: .18, c: GLX.col(col) });
  addArea({ x: at[0], z: at[1], r: rr, delay: R.sp === 'meteor' ? .55 : .25, owner: 'p', sk: { n: R.name, type: 'ally', el: R.el, m }, c: col, proc: 1 });
}
// build 0054 (Lee Nov 15): teammates tank and heal, and leave the killing blow to you
function aiTaunt(A, dt) { A.tauntT -= dt; if (A.tauntT > 0 || G.online) return; let n = 0;
  for (const e of G.ents) { if (!e.alive || !e.awake || e.boss || e.dummy || e.arch === 'goblin') continue; if (Math.hypot(e.x - A.x, e.z - A.z) < 7 && Math.hypot(e.x - P.x, e.z - P.z) < 14) { e.tnt = { a: A, t: e.elite ? 3 : 4.5 }; n++; } }
  if (!n) { A.tauntT = .5; return; } A.tauntT = 5; A.swing = 1; A.act = { t: 0, d: .45, sk: { type: 'nova' } }; ring(A.x, A.z, 0, 7, .5, 0xffa040); burst(A.x, 1.6, A.z, 0xffa040, 14, 4); floatText(A.x, 2.8, A.z, 'Taunt', '#ffb060', .8, 13); SFX.play('taunt'); }
function tankHit(A, e) { A.hurt = .25; burst(A.x, 1.3, A.z, 0xc8c0b0, 5, 4); if (Math.random() < .35) floatText(A.x, 2.6, A.z, 'Blocked', '#d8d0c0', .6, 12); if (G.time - (G.hitSfx || 0) > .08) { G.hitSfx = G.time; SFX.play('block'); } }
function aiMend(A, dt) { A.healT -= dt; const s = P.stats, f = P.hp / s.maxLife; if (A.healT > 0 || P.dead || f > .7) return false; if (Math.hypot(A.x - P.x, A.z - P.z) > 11) return false;
  const big = f < .4, v = Math.round(s.maxLife * (big ? .22 : .14)); P.hp = Math.min(s.maxLife, P.hp + v); A.healT = big ? 6 : 4.5; A.rot = Math.atan2(P.x - A.x, P.z - A.z); A.swing = 1; A.act = { t: 0, d: .5, sk: { type: 'ally' } }; A.mv = 0;
  G.fx.push({ bolt: 1, x1: A.x, z1: A.z, x2: P.x, z2: P.z, life: .3, max: .3, c: GLX.col(0x9affb0) }); ring(P.x, P.z, 0, 2.4, .5, 0x7aff9a); burst(P.x, 1.4, P.z, 0x9affb0, 16, 4); floatText(P.x, 2.9, P.z, '+' + v, '#8aff9a', .9, 16); SFX.play('mend'); return true; }
// build 0072 (Lee's playtest): the tank goes after the monsters that shoot at you, one after another, and leaps to them
function aiTankPick(A) { let best = null, bs = 1e9; for (const e of G.ents) { if (!e.alive || !e.awake || e.dummy || e.boss || e.arch === 'goblin') continue; if (!(e.arch === 'caster' || (e.a && e.a.reach >= 6))) continue; const dp = Math.hypot(e.x - P.x, e.z - P.z); if (dp > 15) continue;
    const fresh = (e.tkT || 0) < G.time, sc = Math.hypot(e.x - A.x, e.z - A.z) + (fresh ? 0 : 30); if (sc < bs) { bs = sc; best = e; } }
  if (best && A.tkOn !== best) { A.tkOn = best; A.tkHits = 0; A.tkSince = G.time; } if (best && (A.tkHits >= 2 || G.time - A.tkSince > 3.5)) { best.tkT = G.time + 6; A.tkOn = null; if (!G.online) best.tnt = { a: A, t: 4.5 }; } return best; }
function aiBlink(A, x, z, r, i, leap) { const o0 = { x: A.x, z: A.z }; for (let k = 0; k < 12; k++) { const a = Math.atan2(A.x - x, A.z - z) + (k >> 1) * (k & 1 ? .55 : -.55), px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (!blocked(px, pz, .5)) { if (typeof burst === 'function') burst(A.x, 1, A.z, leap ? 0xffa040 : 0xc8d8ff, 8, 3); A.x = px; A.z = pz; A.rot = Math.atan2(x - px, z - pz); if (leap) { ring(px, pz, 0, 2.2, .35, 0xffa040); if (Math.random() < .5) floatText(px, 2.8, pz, 'Charge', '#ffb060', .7, 12); } else burst(px, 1, pz, 0xc8d8ff, 8, 3); A.stk = 0; return true; } } A.x = o0.x; A.z = o0.z; return false; }
function updAlly(dt) {
  const want = aiWant();
  if (ALLIES.length !== want) {
    const before = ALLIES.length, hum = aiHumans(), nm = G.online ? Object.keys(NET.names).filter(i => +i !== NET.id).map(i => NET.names[i]).pop() : '';
    if (want < before && want > 0 && before && G.aiSeen && hum) hint(ALLIES.slice(want).map(a => a.name).join(' and ') + ' stepped aside to make room for ' + (nm || 'a new player') + '.');
    else if (want === 0 && before && hum) hint(aiHost() ? 'Your AI teammates stepped aside: your party is full of real players.' : 'Your AI teammates stepped aside: the party leader brings theirs.');
    if (want > before && G.aiSeen && G.aiHum > hum) hint(aiPick(want).slice(before).map(c => AI_ROSTER[c].name).join(' and ') + ' rejoined your party.');
    if (!want) ALLIES.length = 0; else { const cl = aiPick(want); ALLIES.length = Math.min(ALLIES.length, want); for (let i = ALLIES.length; i < want; i++) ALLIES.push(mkAlly(cl[i], i)); }
    if (want && !G.aiSeen) { G.aiSeen = 1; hint(ALLIES.map(a => a.name).join(', ').replace(/, ([^,]*)$/, ' and $1') + ' joined your party. ' + ALLIES.map(a => a.role === 'tank' ? a.name + ' draws monsters off you' : a.role === 'heal' ? a.name + ' heals you' : '').filter(Boolean).join(' and ') + ', and the killing blows are yours. AI teammates step aside when real players join you.'); }
    if (want || !G.inTown) G.aiHum = hum;
  }
  for (let i = 0; i < ALLIES.length; i++) {
    const A = ALLIES[i], R = AI_ROSTER[A.cls], melee = R.range < 4, range = R.range;
    if (Math.hypot(A.x - P.x, A.z - P.z) > 18) aiBlink(A, P.x, P.z, 1.6, i); // they keep up with you across the floor (build 0072: sooner, at 18 instead of 26)
    A.sk.m = aiEach() * (A.role === 'heal' ? .55 : A.role === 'tank' ? .8 : 1); if (A.role === 'tank') aiTaunt(A, dt); else if (A.role === 'heal' && aiMend(A, dt)) continue;
    let tg = null, bd = 13; for (const e of G.ents) { if (!e.alive || !e.awake) continue; const d = Math.hypot(e.x - A.x, e.z - A.z); if (d < bd && Math.hypot(e.x - P.x, e.z - P.z) < 16) { bd = d; tg = e; } }
    if (A.role === 'tank') { const rt = aiTankPick(A); if (rt) { tg = rt; bd = Math.hypot(rt.x - A.x, rt.z - A.z); if (bd > 5 && (A.leapT || 0) <= G.time) { A.leapT = G.time + 2.2; aiBlink(A, rt.x, rt.z, rt.r + 1.1, i, 1); bd = Math.hypot(rt.x - A.x, rt.z - A.z); } } }
    A.cd -= dt; A.spT -= dt; if (A.swing > 0) A.swing -= dt * 3; let tx = null, tz = null;
    if (tg) { A.rot = Math.atan2(tg.x - A.x, tg.z - A.z); if (bd > range + tg.r) { tx = tg.x; tz = tg.z; } else if (A.spT <= 0) { A.spT = rnd(6, 8.5); A.swing = 1; A.act = { t: 0, d: .45, sk: { type: melee ? 'nova' : 'ally' } }; aiSpecial(A, tg); } else if (A.cd <= 0) { A.cd = rnd(1.05, 1.3); A.swing = 1; A.act = { t: 0, d: .35, sk: A.sk }; if (!melee) G.fx.push({ bolt: 1, x1: A.x, z1: A.z, x2: tg.x, z2: tg.z, life: .12, max: .12, c: GLX.col(R.c) }); hitEnemy(tg, A.sk, 1, true); if (A.tkOn === tg) A.tkHits = (A.tkHits || 0) + 1; } }
    else { // fall in around you: each teammate keeps its own spot
      const ang = P.rot + Math.PI + (i - (ALLIES.length - 1) / 2) * .9, fx = P.x + Math.sin(ang) * 2.6, fz = P.z + Math.cos(ang) * 2.6; if (Math.hypot(fx - A.x, fz - A.z) > 1.2) { tx = fx; tz = fz; } }
    if (A.act) { A.act.t += dt; if (A.act.t >= A.act.d) A.act = null; }
    if (tx !== null) { const dx = tx - A.x, dz = tz - A.z, d = Math.hypot(dx, dz) || 1, st = Math.min(d, P.stats.msT * 1.08 * dt), o = { x: A.x, z: A.z }; moveEnt(o, dx / d * st, dz / d * st, .5); if (Math.hypot(o.x - A.x, o.z - A.z) < st * .25) A.stk = (A.stk || 0) + dt; else A.stk = Math.max(0, (A.stk || 0) - dt * 2); A.x = o.x; A.z = o.z; if (A.stk > .6) { A.stk = 0; if (tg) aiBlink(A, tg.x, tg.z, tg.r + (melee ? 1.1 : Math.min(range - 1, 5)), i); else aiBlink(A, P.x, P.z, 1.6, i); } /* build 0072: a teammate caught on a wall or a tree steps through instead of standing there */ A.rot = tg ? A.rot : Math.atan2(dx, dz); A.walk += st * 1.6; A.mv = 1; } else A.mv = 0;
    for (let j = 0; j < i; j++) { const B = ALLIES[j], dx = A.x - B.x, dz = A.z - B.z, d = Math.hypot(dx, dz); if (d < .9 && d > .001) { const o = { x: A.x, z: A.z }; moveEnt(o, dx / d * (.9 - d) * .5, dz / d * (.9 - d) * .5, .5); A.x = o.x; A.z = o.z; } } // no stacking on one spot
  }
  // the party host's AI teammates, seen by everyone else in the party (positions ride on the host's updates)
  if (G.online) for (const id in NET.peers) { const q = NET.peers[id], src = []; /* build 0087: AI teammates sent by an older build are ignored */ q.aiH = q.aiH || []; q.aiH.length = Math.min(q.aiH.length, src.length);
    for (let i = 0; i < src.length; i++) { const s = src[i], cls = AI_ORDER[s[0]] || 'warden'; let o = q.aiH[i]; if (!o || o.cls !== cls) { o = q.aiH[i] = { x: s[1], y: 0, z: s[2], rot: s[3], walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls, ai: 1, name: AI_ROSTER[cls].name, gear: aiGear(cls, s[5] | 0 || 1) }; }
      const k = Math.min(1, dt * 10), ox = o.x, oz = o.z; o.x += (s[1] - o.x) * k; o.z += (s[2] - o.z) * k; o.rot = s[3]; const mvd = Math.hypot(o.x - ox, o.z - oz); o.walk += mvd * 1.6; o.mv = s[4] ? 1 : 0; if (s[6] && !o.act) { o.swing = 1; o.act = { t: 0, d: .35, sk: { type: 'ally' } }; } if (o.act) { o.act.t += dt; if (o.act.t >= o.act.d) o.act = null; } if (o.swing > 0) o.swing -= dt * 3; } }
}
function aiNet() { return ALLIES.map(a => [Math.max(0, AI_ORDER.indexOf(a.cls)), Math.round(a.x * 100) / 100, Math.round(a.z * 100) / 100, Math.round(a.rot * 100) / 100, a.mv ? 1 : 0, aiTier(), a.act ? 1 : 0]); }
function aiAll() { if (!ALLIES.length) return []; /* build 0087: no AI teammates, and none drawn for players on an older build */ const out = ALLIES.slice(); if (G.online && !G.inTown) for (const id in NET.peers) { const q = NET.peers[id]; if (q.aiH && (G.inTown ? q.town : !q.town)) out.push(...q.aiH); } return out; } // every AI teammate you can see
const NPCV = { x: 0, y: 0, z: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls: 'vendor', hair: 0x5a4030, beard: 1, gear: { chest: [2, 0], pants: [1, 0], boots: [1, 0], belt: [1, 0] } }; // build 0042: the merchant is a townsman, not a Ranger
function itemScore(it) { return it.dmg ? (it.dmg[0] + it.dmg[1]) / 2 * it.spd * (1 + it.aff.length * .06) : (it.armor || 0) + it.ilvl * (2 + it.aff.length * 2) + (it.power ? it.ilvl * 4 : 0); }
function botField() {
  const c = G.zone.cell, N = GW * GW, s = clamp(Math.floor(P.z / CS), 0, GW - 1) * GW + clamp(Math.floor(P.x / CS), 0, GW - 1), prev = new Int32Array(N).fill(-1), dist = new Int16Array(N).fill(-1), q = [s]; prev[s] = s; dist[s] = 0;
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % GW; for (const d of [-1, 1, -GW, GW]) { const n = k + d; if (n < 0 || n >= N) continue; if ((d === -1 && x === 0) || (d === 1 && x === GW - 1)) continue; if (!c[n] && prev[n] < 0) { prev[n] = k; dist[n] = dist[k] + 1; q.push(n); } } }
  return { s, prev, dist };
}
// ---- build 0071 (Lee's playtest): click-to-move finds its way around trees, walls, stalls and braziers ----
// A one-unit walk grid is made once per floor from the same collision the hero uses; a search runs when the target changes, and the route is pulled tight so the hero walks straight wherever it can.
const D8X = [1, -1, 0, 0, 1, 1, -1, -1], D8Z = [0, 0, 1, -1, 1, -1, 1, -1];
const NAV = { z: null, s: null, g: null, W: GW * CS, S: 1, key: -1, pts: null, t: 0, stuck: 0 }; /* S: grid steps per world unit (two in town, where stalls leave narrow gaps) */
function navGrid() { const Z = G.zone; if (NAV.z === Z && NAV.s === Z.solid && NAV.g) return NAV.g; const S = NAV.S = Z.solid && Z.solid.length ? 2 : 1, W = NAV.W = GW * CS * S, g = new Uint8Array(W * W); for (let i = 0; i < W * W; i++) g[i] = blocked((i % W + .5) / S, ((i / W | 0) + .5) / S, .56) ? 1 : 0; NAV.z = Z; NAV.s = Z.solid; NAV.g = g; NAV.key = -1; NAV.pts = null; return g; }
function navClear(x1, z1, x2, z2) { const d = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(d / .35); for (let i = 1; i <= n; i++) { const t = i / n; if (blocked(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, .64)) return false; } return true; }
function navFind(tx, tz) { const g = navGrid(), W = NAV.W, S = NAV.S, at = (x, z) => clamp(Math.floor(z * S), 0, W - 1) * W + clamp(Math.floor(x * S), 0, W - 1), wp = k => [(k % W + .5) / S, ((k / W | 0) + .5) / S];
  let gi = at(tx, tz); if (g[gi]) { let best = -1, bd = 1e9; const gx = gi % W, gz = gi / W | 0; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const x = gx + i, z = gz + j; if (x < 0 || z < 0 || x >= W || z >= W || g[z * W + x]) continue; const d = i * i + j * j; if (d < bd) { bd = d; best = z * W + x; } } if (best < 0) return null; gi = best; [tx, tz] = wp(gi); }
  let si = at(P.x, P.z); if (g[si]) { for (const d of [1, -1, W, -W, W + 1, W - 1, -W + 1, -W - 1]) if (si + d >= 0 && si + d < W * W && !g[si + d]) { si += d; break; } }
  const prev = new Int32Array(W * W).fill(-1), q = new Int32Array(W * W); let qh = 0, qt = 0; q[qt++] = si; prev[si] = si; let found = si === gi;
  while (qh < qt && !found) { const k = q[qh++], x = k % W, z = k / W | 0; for (let d = 0; d < 8; d++) { const i = D8X[d], j = D8Z[d], nx = x + i, nz = z + j; if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue; const n = nz * W + nx; if (prev[n] >= 0 || g[n]) continue; if (i && j && (g[z * W + nx] || g[nz * W + x])) continue; prev[n] = k; if (n === gi) { found = true; break; } q[qt++] = n; } }
  if (!found) return null; const raw = [[tx, tz]]; let k = prev[gi]; while (k !== si && k >= 0) { raw.push(wp(k)); k = prev[k]; } raw.reverse();
  const out = []; let cx = P.x, cz = P.z, i = 0; while (i < raw.length) { let j = raw.length - 1; while (j > i && !navClear(cx, cz, raw[j][0], raw[j][1])) j--; out.push(raw[j]); cx = raw[j][0]; cz = raw[j][1]; i = j + 1; } return out; }
// the next point to walk to on the way to (tx, tz); straight there when nothing is in the way
function navStep(tx, tz, dt) { if (!G.zone || !G.zone.cell) return [tx, tz]; navGrid(); NAV.t -= dt; const W = NAV.W, key = clamp(Math.floor(tz * NAV.S), 0, W - 1) * W + clamp(Math.floor(tx * NAV.S), 0, W - 1);
  const redo = !NAV.pts || NAV.stuck > .45 || (key !== NAV.key && NAV.t <= .35) || (NAV.t <= 0 && NAV.pts.length > 1); /* a moving target (mouse held) is re-routed a few times a second, not every frame */
  if (redo) { const st = NAV.stuck > .45; NAV.t = .5; NAV.stuck = 0; NAV.key = key; NAV.pts = !st && navClear(P.x, P.z, tx, tz) ? [[tx, tz]] : navFind(tx, tz) || [[tx, tz]]; if (st && NAV.pts.length) NAV.hold = .6; } NAV.hold = Math.max(0, (NAV.hold || 0) - dt);
  const pts = NAV.pts; while (pts.length > 1 && (Math.hypot(pts[0][0] - P.x, pts[0][1] - P.z) < .25 || (!NAV.hold && navClear(P.x, P.z, pts[1][0], pts[1][1])))) pts.shift(); if (pts.length === 1 && navClear(P.x, P.z, tx, tz)) { pts[0][0] = tx; pts[0][1] = tz; } return pts[0]; }
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
  for (const a of G.areas) if (a.owner === 'e' && !a.done && inArea(a, P.x, P.z, .8)) { const o = areaOut(a, P.x, P.z); P.atk = null; P.move = [P.x + o[0] * 4, P.z + o[1] * 4]; BOT.dodge = .2; if (a.hvy && a.delay - a.t < .45 && !(P.dodgeCd > 0)) dodge(P.x + o[0] * 4, P.z + o[1] * 4); return false; }
  if (BOT.dodge > 0) { BOT.dodge -= dt; return false; }
  let tgt = null, bd = 17, goal = null, act = null; for (const e of G.ents) { if (!e.alive || !e.awake || e.dummy) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tgt = e; } }
  if (tgt) {
    const clear = los(P.x, P.z, tgt.x, tgt.z), bs = talSk(h.bar[0]) || SKILLS.cleave;
    if (bs.range > 5 && bd < 4 && (BOT.kite || 0) <= 0 && tgt.arch !== 'caster' && !tgt.boss) BOT.kite = .7;
    if (BOT.kite > 0) { BOT.kite -= dt; if (BOT.kite > .3) { const ax = P.x - (tgt.x - P.x) / bd * 5, az = P.z - (tgt.z - P.z) / bd * 5; if (!blocked(ax, az, .6)) { P.atk = null; P.move = [ax, az]; return false; } } }
    for (let i = 1; i < (G.set.apSkill === false ? 1 : 4); i++) {
      const id = h.bar[i]; if (!id) continue; const sk = talSk(id); if ((P.cds[id] || 0) > 0 || P.mana < (sk.cost || 0) || (sk.type === 'spin' && P.spin)) continue;
      if (sk.type === 'dash') { if (!sk.land) { if (bd < 3.5 && P.hp < s.maxLife * .6 && tryCast(i, P.x * 2 - tgt.x, P.z * 2 - tgt.z)) return true; continue; } if (bd > 5 && bd < sk.range && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'buff') { if (bd < 8 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'rain') { if (bd < 12 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'proj' || sk.type === 'chain') { if (clear && bd < (sk.range || 14) * .8 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (sk.type === 'barrage') { if (bd < 7 && tryCast(i, tgt.x, tgt.z)) return true; continue; }
      if (bd < (sk.r || sk.range || 4) * .8 + tgt.r && tryCast(i, tgt.x, tgt.z)) return true;
    }
    const basic = talSk(h.bar[0]) || SKILLS.cleave; if (bd <= basic.range * .78 + tgt.r && (clear || basic.range < 5)) { P.move = null; return tryCast(0, tgt.x, tgt.z); }
    goal = [tgt.x, tgt.z];
  } else {
    let best = 26; const want = P.hp < s.maxLife * .7;
    for (const d of G.drops) { if (d.gold || (d.globe && !want) || (d.item && d.item.rar < 1 && h.level > 3)) continue; const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < best) { best = dd; goal = [d.x, d.z]; act = () => { pickup(d); botGear(); }; } }
    if (!goal) for (const o of G.zone.objs) { if (o.used || o.kind === 'portal') continue; const dd = Math.hypot(o.x - P.x, o.z - P.z); if (dd < 22 && dd < best) { best = dd; goal = [o.x, o.z]; act = () => interact(o); } }
  }
  if (BOT.t <= 0 || !BOT.path) {
    BOT.t = .35; const f = botField();
    if (!goal) { let bdist = 1e9, be = null; for (const e of G.ents) { if (!e.alive || e.dummy) continue; const dc = f.dist[cellOf(e.x, e.z)]; if (dc >= 0 && dc < bdist) { bdist = dc; be = e; } } if (be) goal = [be.x, be.z]; else { const po = G.zone.objs.find(o => o.kind === 'portal' && !o.used); if (po) { goal = [po.x, po.z]; act = () => { po.gone = true; interact(po); }; } } }
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
  if (!G.menuHold) P.hp = Math.min(s.maxLife, P.hp + s.lifeRegenT * dt); { const rs = CLASSES[h.cls].res; if (rs.regen) P.mana = Math.min(s.maxMana, P.mana + rs.regen * (h.cls === 'arcanist' && G.time < (P.arcT || 0) ? 1.4 : 1) * dt); else if (G.time - P.lastHit > 4) P.mana = Math.max(0, P.mana - rs.decay * dt); } if (P.fl === undefined) P.fl = FLASK_MAX; if (P.fl < FLASK_MAX) { P.flaskCd = P.flaskCd > 0 ? P.flaskCd - dt : FLASK_CD; if (P.flaskCd <= 0) { P.fl++; P.flaskCd = P.fl < FLASK_MAX ? FLASK_CD : 0; } } else P.flaskCd = 0;
  for (const k in P.cds) if (P.cds[k] > 0) P.cds[k] -= dt;
  if (P.iframes > 0) P.iframes -= dt; if (P.dodgeCd > 0) P.dodgeCd -= dt; if (P.hurt > 0) P.hurt -= dt; if (P.cheatCd > 0) P.cheatCd -= dt;
  if (P.buffs.length) { let ex = false; for (const b of P.buffs) { b.t -= dt; if (b.t <= 0) ex = true; } if (ex) { P.buffs = P.buffs.filter(b => b.t > 0); computeStats(); } }
  if (!P.dead && P.hp < s.maxLife * .3 && !G.inTown) { P.lowT = (P.lowT || 0) - dt; if (P.lowT <= 0) { P.lowT = 1.1; const hf = typeof document !== 'undefined' && document.getElementById('hurtFx'); if (hf && hf.animate) hf.animate([{ opacity: 0 }, { opacity: .45 }, { opacity: 0 }], { duration: 900, easing: 'ease-in-out' }); if (!G.lowHint) { G.lowHint = 1; hint('Low health! Drink a potion (1 on PC, the potion button on phone) or dodge away.'); } } } // build 0035: the screen edge pulses red when you are close to death
  if (P.flaskT > 0) P.flaskT -= dt; /* build 0072: the potion heals at once (see useFlask); this only keeps the red glow */
  if (G.streakT > 0) { G.streakT -= dt; if (G.streakT <= 0) G.streak = 0; }
  P.moving = false;
  if (P.dash) {
    const d = P.dash; d.t += dt; const k = Math.min(1, d.t / d.dur); P.x = d.x0 + (d.x1 - d.x0) * k; P.z = d.z0 + (d.z1 - d.z0) * k; P.y = d.sk.flat ? 0 : Math.sin(k * Math.PI) * 3.2;
    if (k >= 1) { P.y = 0; P.dash = null; if (d.sk.land) { const r = d.sk.land * (1 + s.area / 100); areaHit(P.x, P.z, r, d.sk); ring(P.x, P.z, .5, r, .35, 0xffc890); if (G.online) NET.send({ t: 'fx', k: 'r', x: P.x, z: P.z, r, c: 0xffc890 }); burst(P.x, .4, P.z, 0xc8b89a, 22, 9); G.shake = .5; SFX.play('slam'); } }
    return;
  }
  if (P.spin) { const sp = P.spin; sp.t -= dt; sp.tk -= dt; if (sp.tk <= 0) { sp.tk = sp.sk.tick / ((1 + s.aspd / 100) * aspdK()); areaHit(P.x, P.z, sp.sk.r * (1 + s.area / 100), sp.sk); SFX.play('whirl'); } if (sp.t <= 0) P.spin = null; }
  if (P.act) { const a = P.act; a.t += dt; P.swing = a.t / a.dur; if (!a.fired && a.t >= a.fireAt) { a.fired = true; fireSkill(a); } if (a.t >= a.dur) P.act = null; } /* build 0093 (Lee): heroes keep walking while an attack or skill plays; the legs run and the arms swing */
  if (G.auto && botStep(dt)) return;
  if (!P.act) void ((IN.rmb && tryCast(1)) || (IN.keys.q && tryCast(2)) || (IN.keys.w && tryCast(3))); /* build 0093: a skill no longer stops the hero where they stand */
  // thumb joystick + attack buttons: aim at the nearest foe by itself; a melee button held with the stick at rest walks you into reach
  { const K = IN.keys, kx = (K.arrowright ? 1 : 0) - (K.arrowleft ? 1 : 0), kz = (K.arrowdown ? 1 : 0) - (K.arrowup ? 1 : 0); if (kx || kz) { const l = Math.hypot(kx, kz); IN.joy.on = true; IN.joy.x = kx / l; IN.joy.z = kz / l; IN.joy.kb = true; } else if (IN.joy.kb) { IN.joy.kb = false; IN.joy.on = false; IN.joy.x = IN.joy.z = 0; } } // arrow keys steer like the thumb stick
  const jx = IN.joy.x, jz = IN.joy.z, jm = IN.joy.on ? Math.hypot(jx, jz) : 0; let chase = null;
  // auto-cast: skills switched to auto fire by themselves at the nearest foe, only while foes are near
  if (h.autoPot && !P.dead && P.stats && P.hp < P.stats.maxLife * .5 && (P.fl === undefined || P.fl > 0) && !(P.flaskT > 0)) useFlask();
  if (h.autoc && !P.act) for (let i = 1; i < 4; i++) { if (!h.autoc[i] || !h.bar[i]) continue; const sk = SKILLS[h.bar[i]], e = nearFoe(sk.type === 'melee' || sk.type === 'nova' || sk.type === 'spin' ? (sk.range || sk.r || 3) * .8 : 11); if (!e || (e.dummy && G.time - (P.manT || -99) > 1.5) /* build 0034: autocast only joins in while you are attacking the Training Dummy yourself */ || (P.cds[h.bar[i]] || 0) > 0 || P.mana < (sk.cost || 0)) continue; const esc = sk.type === 'dash' && !sk.land; if (esc) continue; if (autoCast(i, e.x, e.z)) break; }
  if ((IN.lmb && P.atk && P.atk.dummy) || IN.rmb || IN.tb[0] || IN.tb[1] || IN.tb[2] || IN.tb[3]) P.manT = G.time; /* the last moment you attacked by hand */
  for (let i = 0; i < 4; i++) if (IN.tb[i]) {
    const e = nearFoe(15), sk = SKILLS[i === 0 && !h.eq.weapon ? 'punch' : h.bar[i]];
    const melee = sk && sk.type === 'melee', dash = sk && sk.type === 'dash', steer = jm >= .18, far = dash ? sk.range * .85 : 6;
    if (e && melee) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > sk.range * .78 + e.r) { if (steer) continue; chase = e; break; } } // out of reach: the stick steers, or at rest the hero closes in
    if (!e && steer && sk && (melee || sk.basic)) continue; // nothing to hit while running: keep running
    const t = steer && (dash || !e) ? [P.x + jx / jm * far, P.z + jz / jm * far] : e && !(dash && !sk.land) ? [e.x, e.z] : [P.x + Math.sin(P.rot) * far, P.z + Math.cos(P.rot) * far];
    if (P.act || tryCast(i, t[0], t[1])) break; /* build 0093: cast and keep moving with the stick */
  }
  if ((IN.lmb || IN.lmbFresh) && IN.joy.kb && jm >= .18 && !G.hoverObj && !P.pickNow && !G.hoverPet) { IN.lmbFresh = false; if (!P.act) { const e = G.hover && G.hover.alive ? G.hover : null; tryCast(0, e ? e.x : IN.gx, e ? e.z : IN.gz); } } /* build 0095 (Lee: cast spells while moving): steering with the arrow keys, a left click attacks or casts at the cursor and the hero keeps walking */
  else if (IN.lmb || IN.lmbFresh) {
    if (IN.shift) { P.atk = P.move = P.inter = P.pick = null; IN.lmbFresh = false; tryCast(0); return; }
    if (IN.lmbFresh) { IN.lmbFresh = false; if (G.hoverPet && !P.pickNow) { petSell(); } else if (P.pickNow) { P.pick = P.pickNow; P.pickNow = null; P.atk = P.inter = P.move = null; } else if (G.hoverObj) { P.inter = G.hoverObj; P.gateGo = (G.hoverObj.kind === 'portal' || G.hoverObj.kind === 'pback') ? G.hoverObj : null; P.atk = P.move = P.pick = null; } else if (G.hover) { P.atk = G.hover; P.inter = P.move = P.pick = null; } else { P.atk = P.inter = P.pick = null; P.move = [IN.gx, IN.gz]; } }
    else if (!P.atk && !P.inter && !P.pick) { if (G.hover) P.atk = G.hover; else P.move = [IN.gx, IN.gz]; }
  }
  let tx, tz, spK = 1;
  if (P.atk && !P.atk.alive) { P.atk = null; }
  if (jm >= .18) { P.atk = P.inter = P.pick = P.move = null; tx = P.x + jx / jm * 4; tz = P.z + jz / jm * 4; spK = Math.min(1, .45 + jm * .7); }
  else if (chase) { P.atk = P.inter = P.pick = P.move = null; tx = chase.x; tz = chase.z; }
  else if (P.atk) { const e = P.atk, d = Math.hypot(e.x - P.x, e.z - P.z); if (d <= (talSk(G.hero.bar[0]) || SKILLS.cleave).range * .78 + e.r) { if (!P.act) { tryCast(0, e.x, e.z); if (!IN.lmb) P.atk = null; } return; } /* build 0093: a click on a foe mid-skill waits for the skill, then swings */ tx = e.x; tz = e.z; }
  else if (P.pick) { if (!G.drops.includes(P.pick)) P.pick = null; else { if (Math.hypot(P.pick.x - P.x, P.pick.z - P.z) < 2.3) { pickup(P.pick); P.pick = null; return; } tx = P.pick.x; tz = P.pick.z; } }
  else if (P.inter) { const o = P.inter; if (Math.hypot(o.x - P.x, o.z - P.z) < (P.gateGo === o ? 3.4 : 2.6)) { interact(o); P.inter = null; return; } tx = o.x; tz = o.z; }
  else if (P.move) { tx = P.move[0]; tz = P.move[1]; if (Math.hypot(tx - P.x, tz - P.z) < .3) { P.move = null; tx = undefined; } }
  if (tx !== undefined && jm < .18) { const w = navStep(tx, tz, dt); P.navTo = w; tx = w[0]; tz = w[1]; } else { NAV.key = -1; NAV.pts = null; P.navTo = null; }
  if (tx !== undefined) {
    const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz) || 1, sp = s.msT * (P.spin ? .8 : 1) * spK, st = Math.min(d, sp * dt);
    if (!P.spin && !P.act) { let da = Math.atan2(dx, dz) - P.rot; /* build 0093: mid-attack the hero keeps facing the target and walks on */ while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; P.rot += da * Math.min(1, dt * 18); }
    const ox = P.x, oz = P.z, mx = dx / d * st, mz = dz / d * st; if (P.navTo && !blocked(P.x + mx, P.z + mz, .55)) { P.x += mx; P.z += mz; } else moveEnt(P, mx, mz, .55); let moved = Math.hypot(P.x - ox, P.z - oz); /* build 0071: a clear diagonal step is taken whole, so the hero does not catch on corners */
    if (moved < st * .5 && !P.navTo) { const ccx = (Math.floor(P.x / CS) + .5) * CS, ccz = (Math.floor(P.z / CS) + .5) * CS; if (Math.abs(dx) > Math.abs(dz)) moveEnt(P, 0, Math.sign(ccz - P.z) * Math.min(st, Math.abs(ccz - P.z)), .55); else moveEnt(P, Math.sign(ccx - P.x) * Math.min(st, Math.abs(ccx - P.x)), 0, .55); moved = Math.hypot(P.x - ox, P.z - oz); }
    if (moved < st * .15) { NAV.stuck += dt; if (P.move && !IN.lmb && NAV.stuck > 1.2) { P.move = null; NAV.stuck = 0; } } else { NAV.stuck = Math.max(0, NAV.stuck - dt); P.moving = true; P.walk += moved * 1.5; const sn = Math.floor(P.walk / Math.PI); if (sn !== P.stepN) { P.stepN = sn; SFX.play('step'); } }
  }
}
// ---- skill choices ----
/* build 0074 (Lee, Nov 15): talent cards. Each picked card changes a skill (a copy of it, so the base data never changes) or adds a lasting bonus */
const TAL_MUL = { m: 1, r: 1, range: 1, spread: 1, ct: 1, as: 1, arc: 1, spd: 1, delay: 1, explode: 1 }, TAL_SET = { cost: 1, cd: 1, el: 1, buff: 1 }, TALC = { key: null, sk: {}, s: {} };
function talPicks(h) { if (!h) return []; const rows = talRows(h.cls), t = Array.isArray(h.tal) ? h.tal : [], out = []; for (let i = 0; i < rows.length; i++) { const k = t[i]; if ((k === 0 || k === 1 || k === 2) && h.level >= TAL_LV[i] && rows[i][k]) out.push(rows[i][k]); } return out; }
function talOpen(h) { if (!h) return 0; const t = Array.isArray(h.tal) ? h.tal : []; let n = 0; for (let i = 0; i < TAL_LV.length; i++) if (h.level >= TAL_LV[i] && !(t[i] === 0 || t[i] === 1 || t[i] === 2)) n++; return n; }
function talBuild() { const h = G.hero, key = h ? h.cls + ':' + h.level + ':' + (Array.isArray(h.tal) ? h.tal.join(',') : '') : ''; if (TALC.key === key) return TALC; TALC.key = key; TALC.sk = {}; TALC.s = {};
  for (const c of talPicks(h)) { if (c.s) for (const k in c.s) TALC.s[k] = (TALC.s[k] || 0) + c.s[k];
    if (c.fx) for (const id in c.fx) { const base = SKILLS[id]; if (!base) continue; const o = TALC.sk[id] || (TALC.sk[id] = Object.assign({}, base, { id })), f = c.fx[id];
      for (const k in f) { const v = f[k]; if (k[0] === '=') o[k.slice(1)] = v; else if (TAL_SET[k]) o[k] = v; else if (TAL_MUL[k]) { if (o[k] !== undefined) o[k] *= v; else if (k === 'as') o.as = v; } else o[k] = (o[k] || (k === 'cnt' ? 1 : 0)) + v; } } }
  return TALC; }
function talSk(id) { return id && G.hero ? talBuild().sk[id] || SKILLS[id] : SKILLS[id]; }
/* build 0084 (Lee, Nov 15: "switch in and out of talents", free for now): any card you have unlocked can be switched on, swapped or switched off whenever you are out of combat.
   Each row still holds at most one active card, so a swap can never stack two. talSwapCost is the one place a price would go later. */
function talCalm() { if (G.inTown || !G.zone || G.state !== 'play') return true; if (P.dead) return false; for (const e of G.ents) if (e.alive && e.awake && !e.dummy && Math.hypot(e.x - P.x, e.z - P.z) < 16 && (Math.hypot(e.x - P.x, e.z - P.z) < 6 || los(e.x, e.z, P.x, P.z))) return false; return true; }
function talSwapCost(row) { return 0; }
function talPick(row, k) { const h = G.hero; if (!h || !(row >= 0 && row < TAL_LV.length) || !(k === 0 || k === 1 || k === 2) || h.level < TAL_LV[row]) return 0; h.tal = Array.isArray(h.tal) ? h.tal.slice(0, TAL_LV.length) : []; while (h.tal.length < TAL_LV.length) h.tal.push(null); const had = h.tal[row], held = had === 0 || had === 1 || had === 2;
  if (held && !talCalm()) return -1; /* picking an empty row is always allowed; changing a held card waits until the fight is over */
  h.tal[row] = had === k ? null : k; /* tapping the active card switches it off */ computeStats(); if (typeof ALLY_SK !== 'undefined' && typeof allyPower === 'function') ALLY_SK.m = allyPower(); saveGame(); return had === k ? 2 : 1; }
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
  const h = G.hero, it = h.inv[i]; if (!it || !G.online) return false; let b = null, bd = 16; for (const id in NET.peers) { const q = NET.peers[id], d = Math.hypot(q.x - P.x, q.z - P.z); if (peerHere(q) && d < bd) { bd = d; b = q; } }
  if (!b) { hint('No party member close enough to give this to.'); return false; } if (it.cls && NET.cls && NET.cls[b.id] && NET.cls[b.id] !== it.cls) { hint('That is a ' + CLASSES[it.cls].n + ' item, and ' + b.name + ' is a ' + CLASSES[NET.cls[b.id]].n + '.'); return false; } NET.send({ t: 'give', to: b.id, item: it }); h.inv[i] = null; hint('Gave ' + it.name + ' to ' + b.name + '.'); saveGame(); return true;
}
const FLASK_MAX = 5, FLASK_CD = 15; // up to five potions saved; one refills every 15 seconds
function useFlask() { if (P.dead) return; if (P.fl === undefined) P.fl = FLASK_MAX; if (P.hp >= P.stats.maxLife) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('You are at full health. The potion is saved.'); } return; } if (P.fl <= 0) { if (G.time - (P.flHint || -9) > 2) { P.flHint = G.time; hint('No potions left. The next one is ready in ' + Math.ceil(P.flaskCd) + ' seconds.'); } return; } if (P.flaskT > 0) return; P.fl--; if (!(P.flaskCd > 0)) P.flaskCd = FLASK_CD; P.flaskT = .45; { const v = Math.round(Math.min(P.stats.maxLife - P.hp, P.stats.maxLife * .6 * (1 + .15 * townLv('garden')))); P.hp = Math.min(P.stats.maxLife, P.hp + v); floatText(P.x, 3, P.z, '+' + v, '#ff8a8a', 1, 18); } /* build 0072 (Lee's playtest): the same 60% heal, all at once, with the amount shown */ SFX.play('flask'); burst(P.x, 1.4, P.z, 0xff4a4a, 14, 4); }
function pickup(d) {
  const i = G.drops.indexOf(d); if (i < 0) return;
  if (d.globe) { P.hp = Math.min(P.stats.maxLife, P.hp + P.stats.maxLife * .25); floatText(d.x, 1.4, d.z, '+life', '#ff6a6a', .8, 14); SFX.play('flask'); G.drops.splice(i, 1); return; }
  if (d.gold) { G.hero.gold += d.gold; floatText(d.x, 1.2, d.z, '+' + d.gold + ' gold', '#ffd84a', .9, 13); SFX.play('gold'); G.drops.splice(i, 1); return; }
  if (d.item && d.item.cls && d.item.cls !== G.hero.cls && G.online && Object.keys(NET.peers).length) { if (G.time - (d.clsT || -9) > 2) { d.clsT = G.time; hint('That is a ' + CLASSES[d.item.cls].n + ' item: only a ' + CLASSES[d.item.cls].n + ' can pick it up in a party.'); } return; }
  if (d.q) { tqAdd('collect'); floatText(d.x, 1.4, d.z, d.q, '#8affc0', 1, 13); SFX.play('pickup'); burst(d.x, 1, d.z, d.qc || 0x8affc0, 10, 4); G.drops.splice(i, 1); return; }
  if (!addItem(d.item)) { if (G.time - P.oomT > 1.5) { P.oomT = G.time; hint('Inventory is full. Open it (I) and scrap or drop something.'); } return; }
  G.drops.splice(i, 1); SFX.play('pickup'); floatText(d.x, 1.4, d.z, d.item.name, RAR[d.item.rar].c, 1.1, 13); UI.invDirty = true;
  if (!G.hero.got1) { G.hero.got1 = 1; if (G.hero.level <= 2) hint('You picked up your first item. Press I to see it, and equip it if it is better.'); } /* build 0072 */
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
  const Z = G.zone, col = GLX.col, t = G.time, cx = Z.bossAt[0], cz = Z.bossAt[1], done = G.hero.tqd || [], has = id => !TOWN_QUESTS || done.includes(id), dt = Math.min(.1, t - (Z.lifeT === undefined ? t : Z.lifeT)); Z.lifeT = t;
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
    const mk = stMark(o.id) || tqMark(o.id), y = 3.15 + Math.sin(t * 3 + o.x) * .12; if (mk === '!') { const c = col(0xffd84a); GLX.obj('glow', 'box', o.x, y + .25, o.z, 0, .16, .55, .16, c, 2, 1); GLX.obj('glow', 'sphere', o.x, y - .22, o.z, 0, .18, .18, .18, c, 2, 1); GLX.halo(o.x, y, o.z, 1.6, c, .5); }
    else if (mk === '?') { const c = col(0x8affc0); GLX.obj('glow', 'gem', o.x, y + .1, o.z, t * 2, .34, .5, .34, c, 2, 1); GLX.halo(o.x, y, o.z, 1.8, c, .6); GLX.obj('glow', 'ring', o.x, .06, o.z, t, 2.6, 1, 2.6, c, 1, .5, -1); }
    else if (mk === '.') for (let k = -1; k <= 1; k++) GLX.obj('glow', 'sphere', o.x + k * .22, y, o.z, 0, .09, .09, .09, col(0xc8c0b0), 1, .7); }
}
function drawQuestBits() { // Pip, lost out in the world
  if (!G.zone || !G.zone.objs) return; const col = GLX.col, t = G.time;
  for (const o of G.zone.objs) { if (o.kind !== 'captive') continue; /* build 0069: a captive in a cage of ice, then walking home free */
    const k = o.st || (o.st = { cls: 'vil2', hair: 0x4a3a2a, beard: 1, x: o.x, z: o.z, y: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, gear: { chest: [2, 0], boots: [1, 0], belt: [1, 0] } });
    if (o.used) { const u = (t - o.runT) / 4; if (u > 1) continue; const a = Math.atan2(G.zone.start[0] - o.x, G.zone.start[1] - o.z); k.x = o.x + Math.sin(a) * u * 10; k.z = o.z + Math.cos(a) * u * 10; k.rot = a; k.mv = .8; k.walk = t * 8; drawHero(k, false); continue; }
    k.mv = 0; k.rot = Math.atan2(P.x - o.x, P.z - o.z); k.hurt = 0; drawHero(k, false); const ic = col(o.cc ? o.cc[0] : 0xbfe6ff), c = col(o.cc ? o.cc[1] : 0x9ad8ff);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832 + .3, r = .85 + (i % 2) * .15; GLX.obj('glow', 'gem', o.x + Math.sin(a) * r, .7 + (i % 3) * .35, o.z + Math.cos(a) * r, a, .22, 1.3 + (i % 2) * .5, .22, ic, .9, .55); }
    GLX.obj('glow', 'ring', o.x, .07, o.z, t * .4, 1.6, 1, 1.6, c, 1, .45, -1); const y = 2.7 + Math.sin(t * 3) * .12; GLX.obj('glow', 'box', o.x, y + .22, o.z, 0, .14, .48, .14, c, 2, 1); GLX.obj('glow', 'sphere', o.x, y - .2, o.z, 0, .16, .16, .16, c, 2, 1); GLX.halo(o.x, 1.2, o.z, 2.8, c, .4); GLX.light(o.x, 2, o.z, 7, c, .8, 6); }
  for (const o of G.zone.objs) { if (o.kind !== 'lost') continue; const k = o.st || (o.st = Object.assign({}, PIPK, { x: o.x, z: o.z, rot: 0, mv: 0 }));
    if (o.used) { const u = (t - o.runT) / 3; if (u > 1) continue; const a = Math.atan2(G.zone.start[0] - o.x, G.zone.start[1] - o.z); k.x = o.x + Math.sin(a) * u * 9; k.z = o.z + Math.cos(a) * u * 9; k.rot = a; k.mv = 1; k.walk = t * 9; drawHero(k, false); continue; }
    k.mv = 0; k.rot = Math.atan2(P.x - o.x, P.z - o.z); k.y = Math.abs(Math.sin(t * 6)) * .05; drawHero(k, false); const c = col(0xff9ad0), y = 2.4 + Math.sin(t * 3) * .12; GLX.obj('glow', 'box', o.x, y + .22, o.z, 0, .14, .48, .14, c, 2, 1); GLX.obj('glow', 'sphere', o.x, y - .2, o.z, 0, .16, .16, .16, c, 2, 1); GLX.halo(o.x, 1.2, o.z, 2.6, c, .45); GLX.light(o.x, 2, o.z, 6, c, .8, 6); }
}
// pet (build 0020): Ember, a little fox-sprite that trots after you and fetches gold
const PET = { x: 0, z: 0, y: 0, rot: 0, walk: 0, tgt: null, hop: 0, init: false };
// ---- build 0075 (Lee, Nov 15): your pet sells for you. Give it items from your bag, click it, and it runs to town, sells them and comes back with the gold ----
const PET_PACK = 8, PET_TRIP = 20; // items it can carry, and seconds the trip takes from a floor
function petGive(i) { const h = G.hero, it = h.inv[i]; if (!it) return false; if (G.set.pet === false) { hint('Your pet is turned off. Turn it on in Settings first.'); return false; } if (it.lock) { hint('That item is locked. Unlock it first.'); return false; } if (PET.away > 0) { hint('Your pet is away selling. It will be back in ' + Math.ceil(PET.away) + ' seconds.'); return false; } h.petBag = h.petBag || []; if (h.petBag.length >= PET_PACK) { hint('Your pet can carry ' + PET_PACK + ' items. Click it to send it to town first.'); return false; } h.petBag.push(it); h.inv[i] = null; SFX.play('pickup'); saveGame(); return true; }
function petTake() { const h = G.hero; if (!h.petBag) return; while (h.petBag.length) { if (!addItem(h.petBag[h.petBag.length - 1])) { hint('Your bag is full.'); break; } h.petBag.pop(); } saveGame(); }
function petWorth() { return ((G.hero && G.hero.petBag) || []).reduce((s, it) => s + itemValue(it), 0); }
function petWorse(it) { /* build 0088: the same test as the bag's arrows (ui.js verdict): a down arrow means the item would not make you stronger, or your hero can't use it. Build 0090: both use itemCmp */ try { if (!it || !G.hero || !P.stats) return false; if (!canUse(it)) return true; return itemCmp(it).v <= .004; } catch (e) { return false; } }
function petPicks(all) { const h = G.hero, room = PET_PACK - (all ? 0 : (h.petBag && h.petBag.length) || 0), out = []; if (room <= 0) return out; for (let i = 0; i < h.inv.length && out.length < room; i++) { const it = h.inv[i]; if (it && !it.lock && petWorse(it)) out.push(i); } return out; }
function petSell() { const h = G.hero; if (G.set.pet === false || P.dead) return false; if (PET.away > 0) { hint('Your pet is on its way. Back in ' + Math.ceil(PET.away) + ' seconds.'); return false; } h.petBag = h.petBag || [];
  /* build 0088: one click. The pet takes up to 8 down-arrow items from your bag (never locked, never up-arrow, and never what you wear, which is not in the bag) and sells them in town for the same gold as before */
  if (h.petSell === false) { /* build 0088 (Lee: a toggle to stop the auto-selling): with selling off, the pet carries the same down-arrow items to your stash instead, and brings back no gold */
    if (!G.stash) loadStash(); const pk = petPicks(true); let n = 0; for (const i of pk) { if (!bagPut(G.stash, h.inv[i])) break; h.inv[i] = null; n++; }
    if (!n) { hint(pk.length ? 'Your stash is full, so your pet has nowhere to put things. Make room, or switch Auto-sell on.' : 'Your pet only takes items with a down arrow, and you have none to send. Locked items always stay with you.'); return false; }
    PET.away = G.inTown ? 4 : PET_TRIP; PET.tgt = null; ring(PET.x, PET.z, 0, 2.5, .5, 0x8ac8ff); burst(PET.x, .8, PET.z, 0x8ac8ff, 18, 5); SFX.play('warp'); hint('Your pet runs to town to put ' + n + (n === 1 ? ' item' : ' items') + ' in your stash' + (n < pk.length ? ' (the stash is now full)' : '') + '.'); saveGame(); if (typeof UI !== 'undefined') UI.invDirty = true; return true; }
  for (const i of petPicks()) { h.petBag.push(h.inv[i]); h.inv[i] = null; }
  if (!h.petBag.length) { hint('Your pet only takes items with a down arrow, and you have none to send. Locked items always stay with you.'); return false; }
  const n = h.petBag.length; h.petGold = (h.petGold || 0) + petWorth(); h.petBag = []; PET.away = G.inTown ? 4 : PET_TRIP; PET.tgt = null; ring(PET.x, PET.z, 0, 2.5, .5, 0xffb050); burst(PET.x, .8, PET.z, 0xffb050, 18, 5); SFX.play('warp'); hint('Your pet runs to town with ' + n + (n === 1 ? ' item' : ' items') + ' to sell.'); saveGame(); if (typeof UI !== 'undefined') UI.invDirty = true; return true; }
function petBack() { const h = G.hero, g = h.petGold || 0; h.petGold = 0; PET.away = 0; PET.x = P.x - 1; PET.z = P.z - 1; PET.init = true; if (!g) return; h.gold += g; PET.hop = .5; ring(PET.x, PET.z, 0, 2.5, .5, 0xffd84a); burst(PET.x, .8, PET.z, 0xffd84a, 18, 5); floatText(P.x, 2.6, P.z, '+' + g.toLocaleString() + ' gold', '#ffd84a', 1.6, 16); SFX.play('gold'); hint('Your pet is back from town with ' + g.toLocaleString() + ' gold.'); saveGame(); if (typeof UI !== 'undefined') UI.invDirty = true; }
function updPet(dt) {
  if (PET.away > 0) { PET.away -= dt; if (PET.away <= 0) petBack(); return; } if (G.hero && G.hero.petGold) petBack(); /* gold from a trip that was still under way when you last left the game */
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
  if (G.set.pet === false || P.dead || !PET.init || PET.away > 0) return; const k0 = G.set.petKind || 'fox', pt = PETS.find(q => q[0] === k0), got = G.ach || (G.ach = achLoad()), kind = pt && (!pt[2] || got[pt[2]]) ? k0 : 'fox';
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
const TOWN_QUESTS = false; /* Lee, Nov 14: townsfolk quests removed; First Steps stays */
function tqCur() { const h = G.hero; if (!TOWN_QUESTS || !h || !h.tq) return null; return h.tq.id === 'bounty' ? BOUNTY : QUESTS.find(q => q.id === h.tq.id) || null; }
function tqNext() { if (!TOWN_QUESTS) return null; const d = (G.hero && G.hero.tqd) || []; return QUESTS.find(q => !d.includes(q.id)) || BOUNTY; }
function tqMark(id) { if (!TOWN_QUESTS) return ''; const h = G.hero, q = tqCur(); if (q) return q.by !== id ? '' : h.tq.n >= q.goal.n ? '?' : '.'; return tqNext().by === id ? '!' : ''; }
function tqStep(q) { const g = q.goal, h = G.hero, fl = G.inTown ? 0 : (G.zone.def.depth || 1), left = g.n - h.tq.n;
  if (h.tq.n >= g.n) return { t: G.inTown ? 'Done! Follow the gold path to ' + FOLK[q.by].n.split(' ')[0] + ' for your reward' : 'Done! Go to town (Town button) and see ' + FOLK[q.by].n.split(' ')[0] + ' for your reward', ok: 1 };
  if (G.inTown) return { t: g.k === 'rescue' ? 'Leave town: Pip is out on the next floor' : 'Take the portal out to the wilds to do this' };
  if (g.min && fl < g.min && (g.k === 'collect' || g.k === 'boss')) return { t: 'Not on this floor: go deeper to floor ' + g.min + ' (you are on ' + fl + ')', warn: 1 };
  return { t: g.k === 'collect' ? 'Kill monsters here: they drop ' + g.item + ' (' + left + ' to go)' : g.k === 'arch' ? 'Kill spell-casters: the robed ones that throw magic from afar' : g.k === 'elite' ? 'Kill champions: monsters with a name over their head' : g.k === 'boss' ? 'Slay this floor\'s guardian' : g.k === 'floor' ? 'Go deeper: slay the guardian, then take its portal (' + left + ' floor' + (left === 1 ? '' : 's') + ' to go)' : g.k === 'rescue' ? 'Find Pip: follow the gold path' : 'Kill any monsters (' + left + ' to go)' }; }
function tqHow(q) { const g = q.goal; return g.k === 'collect' ? 'Monsters ' + (g.min ? 'on floor ' + g.min + ' and deeper' : 'out in the world') + ' now drop ' + g.item + '. Collect ' + g.n + '.' : g.k === 'arch' ? 'Defeat ' + g.n + ' spell-casting monsters out in the world.' : g.k === 'floor' ? 'Reach floor ' + g.n + '. Take the portal after each guardian to go deeper.' : g.k === 'rescue' ? 'Leave town and search the floor for Pip. Look for the pink star on your map.' : g.k === 'elite' ? 'Defeat ' + g.n + ' champions: the monsters with names over their heads.' : g.k === 'boss' ? 'Defeat a floor guardian' + (g.min ? ' on floor ' + g.min + ' or deeper' : '') + '.' : 'Defeat ' + g.n + ' monsters out in the world.'; }
function tqReward(q) { const lv = G.hero.level; return { gold: Math.round((60 + 30 * lv) * q.gold), shards: 3 + Math.floor(lv / 3), rar: q.rar }; }
function tqAdd(kind, amt) { const h = G.hero, q = tqCur(); if (!q || q.goal.k !== kind || h.tq.n >= q.goal.n) return; h.tq.n = Math.min(q.goal.n, h.tq.n + (amt || 1));
  if (h.tq.n >= q.goal.n) { hint('Quest done: ' + q.t + '! Go back to ' + FOLK[q.by].n + ' in Emberwatch (press T) for your reward.'); SFX.play('shrine'); UI.zoneBanner && UI.zoneBanner('Quest complete: ' + q.t, 'Go to town and see ' + FOLK[q.by].n + ' for your reward'); if (typeof GPS !== 'undefined') GPS.t = 0; }
  else if (kind !== 'kills' || h.tq.n % 10 === 0) hint(q.goal.item + ': ' + h.tq.n + ' / ' + q.goal.n); saveGame(); }
function tqAccept() { const h = G.hero, q = tqNext(); if (!q) return; h.tq = { id: q.id, n: 0 }; saveGame(); SFX.play('pickup'); hint('New quest: ' + q.t + '. ' + tqHow(q)); UI.zoneBanner && UI.zoneBanner('New quest: ' + q.t, tqStep(q).t); if (typeof GPS !== 'undefined') GPS.t = 0; }
function tqClaim() { const h = G.hero, q = tqCur(); if (!q || h.tq.n < q.goal.n) return null; const r = tqReward(q); h.gold += r.gold; h.shards = (h.shards || 0) + r.shards; const it = makeItem(h.level, null, r.rar); if (!addItem(it)) dropItem(P.x, P.z, it);
  h.tqd = h.tqd || []; if (!q.repeat && !h.tqd.includes(q.id)) h.tqd.push(q.id); h.tq = null; saveGame(); UI.invDirty = true; SFX.play('level'); ring(P.x, P.z, 0, 8, .8, 0xffd84a); burst(P.x, 1.5, P.z, 0xffd84a, 30, 7); if (G.inTown) buildStatic(G.zone); return { r, it, q }; }
// ---- story campaign (build 0068, Lee Nov 15): one story per hero. Guardians carry Vaeloth's brand, townsfolk tell what it means, and each act opens with a title. Steps give no extra loot or XP ----
function stState() { const h = G.hero; if (!h || typeof STORY === 'undefined') return null; if (!h.story || h.story.v !== STORY_V) stInit(h); return h.story; } /* build 0075: the acts grew, so a hero from an older build is put back at the right place for the floors they have cleared */
function stAct() { const st = stState(); return st ? STORY[st.a] || null : null; }
function stCur() { const A = stAct(); return A ? A.steps[G.hero.story.s] || null : null; }
function stDepth(h) { return Math.max(h.depthMax || 0, h.maxClear || 0); }
function stInit(h) { h.story = { a: 0, s: 0, open: 0, v: STORY_V, n: 0 }; const dm = stDepth(h); let rec = []; /* heroes already past a guardian get the story so far instead */
  for (let ai = 0; ai < STORY.length; ai++) { const A = STORY[ai]; let last = -1; A.steps.forEach((x, i) => { if (x.k === 'boss' && x.d <= dm) last = i; }); if (last < 0) break; for (const x of A.steps.slice(0, last + 1)) if (x.recap && x.k === 'boss') rec.push(x.recap); h.story.a = ai; h.story.s = last + 1; h.story.open = 1; const N2 = STORY[ai + 1]; if (last + 1 < A.steps.length && !(N2 && N2.steps.some(x => x.k === 'boss' && x.d <= dm))) break; /* build 0075: a hero already into the next act is not sent back to finish this one's closing talk */ h.story.a = ai + 1; h.story.s = 0; h.story.open = 0; }
  rec = rec.slice(-5); if (rec.length) h.story.recap = rec; }
function stNext() { const st = stState(); if (!st) return; const A = STORY[st.a]; st.s++; st.n = 0; if (A && st.s >= A.steps.length) { st.a++; st.s = 0; st.open = 0; } }
function stPast(c, dm) { /* a boss step at or above your depth is done; a rescue is done once a later guardian of the act has fallen */ if (!c) return false; if (c.k === 'boss') return c.d <= dm; if (c.k !== 'rescue') return false; const st = stState(), A = STORY[st.a]; return A.steps.slice(st.s + 1).some(x => x.k === 'boss' && x.d <= dm); }
function stCatch() { const h = G.hero, st = stState(), out = []; let c; while ((c = stCur()) && stPast(c, stDepth(h))) { if (c.k === 'boss' && st.late === c.d && c.done) { for (const l of c.done) out.push(l); delete st.late; } /* you slew this guardian while a hunt was still open: its scene plays now */ else if (c.recap) out.push(['', c.recap]); stNext(); } return out; }
// build 0075: a hunt step counts kills (the whole party's) on its floor or deeper. Champions-only hunts count guardians too
function stKill(e) { if (typeof UI === 'undefined') return; const c = stCur(); if (!c || c.k !== 'hunt' || G.inTown || !G.zone || !G.zone.def || G.zone.def.rift || (G.zone.def.depth || 1) < c.d || e.noLoot || e.dummy || e.wb || (c.el && !e.elite)) return;
  const st = stState(); st.n = (st.n || 0) + 1; if (st.n < c.n) return; stNext(); saveGame(); SFX.play('shrine'); floatText(P.x, 3.2, P.z, '\u2713 ' + c.goal, '#9effa8', 2.2, 15); if (typeof setTimeout === 'function') setTimeout(() => stAfter([]), e.boss ? 3200 : 1400); }
function stGoalBanner() { const A = stAct(), c = stCur(); if (!UI.zoneBanner) return; if (!A) UI.zoneBanner('The story is complete', 'The Rifts are open at the Rift Stone in Emberwatch'); else if (c) UI.zoneBanner(A.n + ' · ' + A.t, c.goal); }
function stAfter(lines) { const st = stState(); lines = (lines || []).concat(st.open ? stCatch() : []); saveGame(); if (typeof GPS !== 'undefined') GPS.t = 0;
  const fin = () => { if (STORY[st.a] && !st.open) stOpen(); else stGoalBanner(); }; if (lines.length && UI.scene) UI.scene(lines, fin); else fin(); }
function stOpen() { const st = stState(), A = st && STORY[st.a]; if (!A || st.open) return; st.open = 1; const c = A.steps[st.s], lines = ((c && c.open) || []).concat(stCatch()); saveGame(); if (typeof setTimeout !== 'function') return; /* after the floor's own name has had its moment; heroes already past part of the act get those parts as a recap */
  setTimeout(() => { if (UI.zoneBanner) UI.zoneBanner(A.n + ' · ' + A.t, A.sub); SFX.play('shrine'); }, 2600); setTimeout(() => { if (lines.length && UI.scene) UI.scene(lines, stGoalBanner); else stGoalBanner(); }, 5600); }
function stZone(Z) { const h = G.hero; if (!h || !Z || !Z.def || Z.def.rift || typeof document === 'undefined' || typeof setTimeout !== 'function') return; const st = stState(); if (!st) return;
  if (st.recap && st.recap.length) { const r = st.recap; delete st.recap; saveGame(); setTimeout(() => UI.scene && UI.scene([['', 'The story so far.']].concat(r.map(t => ['', t])), stGoalBanner), 2200); return; }
  if (Z.def.type !== 'town' && !st.open && STORY[st.a]) stOpen(); stPlace(Z); }
function stPlace(Z) { /* build 0069: a captive waits far out on the floor, frozen in place, until you reach them */ const c = stCur(); if (!c || c.k !== 'rescue' || !Z || !Z.def || Z.def.type === 'town' || Z.def.rift || (Z.def.depth || 1) < c.d || !Z.cell || Z.objs.some(o => o.kind === 'captive')) return;
  let best = null; for (let i = 0; i < GW * GW; i++) { if (Z.cell[i]) continue; const dd = Z.dist ? Z.dist[i] : -1; if (dd < 10) continue; const sc = Math.abs(dd - 26) + Math.random() * 4; if (!best || sc < best[1]) best = [i, sc]; } if (!best) return;
  Z.objs.push({ kind: 'captive', x: (best[0] % GW + .5) * CS, z: ((best[0] / GW | 0) + .5) * CS, name: c.who, used: false, cc: c.c }); if (typeof GPS !== 'undefined') GPS.t = 0; if (typeof setTimeout === 'function') setTimeout(() => hint(c.who + ' is held somewhere on this floor. Follow the path, or look for the blue star on your map.'), 2400); }
function stRescue(o) { const c = stCur(); o.used = true; o.runT = G.time; SFX.play('shrine'); burst(o.x, 1.2, o.z, 0x9ad8ff, 30, 6); ring(o.x, o.z, 0, 5, .7, 0x9ad8ff); if (!c || c.k !== 'rescue') return; stNext(); saveGame(); if (UI.scene) UI.scene(c.lines, () => stAfter([])); else stAfter([]); }
function stBoss(depth) { let c = stCur(), pre = []; while (c && c.k === 'rescue' && stPast(c, depth)) { if (c.recap) pre.push(['', c.recap]); stNext(); c = stCur(); } if (c && c.k === 'hunt') { const st = stState(), A = stAct(); if (A && A.steps.slice(st.s).some(x => x.k === 'boss' && x.d === depth)) { st.late = depth; saveGame(); } return; } /* build 0075: the guardian fell before the hunt was done; its scene waits for the hunt */ if (!c || c.k !== 'boss' || depth < c.d) return; const lines = pre.concat(depth === c.d ? (c.done || []) : (c.recap ? [['', c.recap]] : [])); stNext(); saveGame(); if (typeof setTimeout === 'function') setTimeout(() => stAfter(lines), 2200); }
function stTalk(id) { const c = stCur(); if (!c || c.k !== 'talk' || c.by !== id || !UI.scene) return false; UI.scene(c.lines, () => { stNext(); stAfter([]); }); return true; }
function stMark(id) { const c = stCur(); return c && c.k === 'talk' && c.by === id ? '!' : ''; }
function stBrand(e) { const Z = G.zone; if (!e || !e.boss || !Z || !Z.def || Z.def.rift || Z.def.type === 'town' || typeof STORY === 'undefined') return false; const d = Z.def.depth || 1; return STORY.some(A => A.steps.some(x => x.k === 'boss' && x.d === d)); }
function drawBrand() { /* Vaeloth's brand under a guardian who serves him: an eye in a crown of fire, slowly turning */
  const b = G.boss; if (!b || !b.alive || !stBrand(b)) return; const col = GLX.col, t = G.time, c = col(0xff6a1a), c2 = col(0xffc04a), R = (b.r || 1.5) * 1.6 + 1.6, p = b.awake ? 1 : .6, x = b.x, z = b.z;
  GLX.obj('glow', 'ring', x, .08, z, t * .3, R, 1, R, c, 1.3, .5 * p, -1); GLX.obj('glow', 'ring', x, .085, z, -t * .45, R * .8, 1, R * .8, c2, 1.1, .3 * p, -1);
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.2832 + t * .3; GLX.obj('glow', 'box', x + Math.sin(a) * R * .9, .09, z + Math.cos(a) * R * .9, a, .07, .02, .5, c2, 1.3, .55 * p); }
  GLX.obj('glow', 'ring', x, .09, z, 0, R * .42, 1, R * .2, c2, 1.4, .6 * p, -1); GLX.obj('glow', 'disc', x, .095, z, 0, R * .1, 1, R * .1, c, 1.6, .75 * p, 1);
  for (let k = 0; k < 5; k++) { const ox = (k - 2) * R * .13; GLX.obj('glow', 'box', x + ox, .09, z - R * .26 - (k % 2 ? 0 : R * .08), 0, .05, .02, R * (k % 2 ? .1 : .17), c, 1.3, .6 * p); }
  GLX.light(x, 1.2, z, R * 2, c, .5 * p, 3);
  if (!LOWQ && Math.random() < .3) G.fx.push({ ember: 1, x: x + rnd(-R, R) * .8, y: .2, z: z + rnd(-R, R) * .8, vx: rnd(-.2, .2), vy: rnd(1.2, 2.4), vz: rnd(-.2, .2), life: rnd(.8, 1.4), max: 1.4, size: rnd(.04, .08), c: GLX.col(Math.random() < .5 ? 0xff6a1a : 0xffc04a) });
}
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
  if (o.kind === 'chest') { o.used = true; const lv = G.hero.level; dropItem(o.x, o.z, makeItem(lv, null, Math.max(1, rollRarity(1)))); /* build 0034: one item instead of two, and never a grey one */ dropGold(o.x, o.z, (10 + lv * 5) * rnd(.8, 1.5)); burst(o.x, 1, o.z, 0xffd84a, 20, 6); SFX.play('pickup'); }
  else if (o.kind === 'gchest') { o.used = true; const lv = G.hero.level; for (let i = 0; i < 2; i++) dropItem(o.x, o.z, makeItem(lv, null, Math.max(2, rollRarity(2)))); dropGold(o.x, o.z, (20 + lv * 9) * rnd(.9, 1.4)); burst(o.x, 1, o.z, 0xffd84a, 30, 7); SFX.play('drop2'); if (G.zone.objs.filter(q => q.kind === 'gchest' && !q.used).length === 0) UI.zoneBanner('Treasure Vault emptied!', 'Every chest was yours'); }
  else if (o.kind === 'well') { o.used = true; const lv = G.hero.level; for (let i = 0; i < 3; i++) dropItem(o.x, o.z, makeItem(lv, null, i === 0 && Math.random() < .15 ? 3 : Math.max(2, rollRarity(2)))); for (let i = 0; i < 6; i++) dropGold(o.x, o.z, (12 + lv * 6) * rnd(.8, 1.3)); for (let i = 0; i < 3; i++) ring(o.x, o.z, 0, 4 + i * 3, .6 + i * .2, 0xffd84a); burst(o.x, 2, o.z, 0xffd84a, 60, 9); burst(o.x, 2, o.z, 0x9ad0ff, 30, 7); SFX.play('drop4'); UI.zoneBanner('Your wish is granted!', 'The Wishing Well showers you with treasure'); }
  else if (o.kind === 'shrine') { o.used = true; P.buffs.push({ s: o.sh.s, t: 45, n: o.sh.n }); computeStats(); ring(o.x, o.z, 0, 8, .7, o.sh.c); SFX.play('shrine'); hint(o.sh.n + ' empowers you for 45 seconds.'); }
  else if (o.kind === 'planner') UI.openPlanner && UI.openPlanner();
  else if (o.kind === 'stash' || o.kind === 'vendor' || o.kind === 'altar') { const h = G.hero; if (h && !(h.tour || {})[o.kind]) { h.tour = Object.assign({}, h.tour, { [o.kind]: 1 }); saveGame(); } UI.openTown(o.kind); }
  else if (o.kind === 'tportal') { if (tierMaxOf(G.hero) > 0 && typeof UI !== 'undefined' && UI.openTier) UI.openTier(); else leaveTown(); } /* build 0074: pick a difficulty once one is unlocked */
  else if (o.kind === 'npc') UI.openFolk && UI.openFolk(o.id);
  else if (o.kind === 'captive') stRescue(o);
  else if (o.kind === 'lost') { o.used = true; o.runT = G.time; tqAdd('rescue'); SFX.play('shrine'); burst(o.x, 1.2, o.z, 0xff9ad0, 24, 5); hint('Pip: "You found me! I will run straight home to Mum!"'); }
  else if ((o.kind === 'portal' || o.kind === 'pback') && !o.gone && P.gateGo === o && P.inter === o) { P.gateGo = null; P.inter = null; o.gone = true; SFX.play('warp'); G.shake = Math.max(G.shake || 0, .25); interact(o); return; } /* build 0046: clicked or tapped, so go */
  else if ((o.kind === 'portal' || o.kind === 'pback') && !o.gone && typeof UI !== 'undefined' && UI.askGate) { UI.askGate(o); return; } /* click, E or the phone Use button: ask before leaving the floor, like walking in */
  else if (o.kind === 'portal') { if (G.online) NET.send({ t: 'next' }); else { if (!G.zone.def.rift) G.hero.depth = (G.hero.depth || 0) + 1; enterZone(); } }
  else if (o.kind === 'rift') UI.openRift && UI.openRift();
  else if (o.kind === 'pback') { if (G.online) { if (G.boss && G.boss.alive && Object.keys(NET.peers || {}).length) { o.gone = false; hint('Your party can head back once the guardian of this floor is slain'); } else NET.send({ t: 'prev' }); } else { G.hero.depth = Math.max(0, (G.hero.depth || 0) - 1); enterZone(); } }
}
function eShoot(e, ang, spd, dmgM, el) { G.projs.push({ x: e.x + Math.sin(ang) * e.r, z: e.z + Math.cos(ang) * e.r, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, life: 3, r: .45, dmg: e.dmg * (dmgM || 1), el: el || 'phys', src: e, c: GLX.col(e.md.e) }); }
function bossPattern(e) {
  const pl = e.bd.phases ? e.bd.phases[e.ph || 0] : e.bd.pat, pat = pl[e.pi++ % pl.length], el = G.zone.th.elem;
  if (pat === 'ring') { const n = 18; for (let i = 0; i < n; i++) eShoot(e, i / n * 6.2832 + e.pi, 9, .8, el); }
  else if (pat === 'slam') addArea({ x: P.x, z: P.z, r: 5, delay: 1.1, owner: 'e', dmg: e.dmg * 2, el: 'phys', c: 0xff4a2a, src: e, hvy: heavyK(1.3) });
  else if (pat === 'summon') { const md = G.zone.th.mon.find(m => m.a === 'swarm') || G.zone.th.mon[0]; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28, x = e.x + Math.cos(a) * 3.5, z = e.z + Math.sin(a) * 3.5; if (!blocked(x, z, .6)) { const m = mkEnemy(md, x, z, e.lvl - 1, 0, -2); m.awake = true; m.noLoot = true; ring(x, z, 0, 2, .4, e.md.e); } } }
  else if (pat === 'barrage') { for (let i = 0; i < 7; i++) addArea({ x: P.x + rnd(-6, 6), z: P.z + rnd(-6, 6), r: 2.6, delay: .9 + i * .14, owner: 'e', dmg: e.dmg * 1.4, el, c: 0xff7a2a, src: e, hvy: heavyK(.7) }); }
  else if (pat === 'nova') addArea({ x: e.x, z: e.z, r: 8.5, delay: 1.3, owner: 'e', dmg: e.dmg * 2.2, el, c: 0xff4a2a, src: e, hvy: heavyK(1.4) });
  else if (pat === 'charge') { e.st = 'charge'; e.t = .8; e.cdir = Math.atan2(P.x - e.x, P.z - e.z); e.chit = false; }
  else if (pat === 'spiral') e.spiral = 2;
}
function bossTele(e) { // build 0048: between its usual attacks a guardian marks one of three big shapes: a breath cone, a cross on you, or rays from itself
  const k = (e.ti = (e.ti || 0) + 1) % 3, an = Math.atan2(P.x - e.x, P.z - e.z), el = G.zone.th.elem;
  if (k === 1) addArea({ x: e.x, z: e.z, sh: 'cone', ang: an, arc: .6, r: 11 + e.r, delay: 1.2, owner: 'e', dmg: e.dmg * 2, el, c: 0xff4a2a, src: e, hvy: heavyK(1.4) });
  else if (k === 2) addArea({ x: P.x, z: P.z, sh: 'cross', ang: an + rnd(-.4, .4), len: 24, w: 2.6, delay: 1.25, owner: 'e', dmg: e.dmg * 1.8, el, c: 0xff5a2a, src: e, hvy: heavyK(1.2) });
  else addArea({ x: e.x, z: e.z, sh: 'rays', n: 6, ang: an, len: 17, w: 1.9, delay: 1.3, owner: 'e', dmg: e.dmg * 1.8, el, c: 0xff5a2a, src: e, hvy: heavyK(1.2) });
  e.st = 'hwind'; e.t = 1; }
// build 0089 (Lee: make the boss fights more interesting): each guardian's signature moves. Every one is marked on the ground first, from a
// second to two seconds ahead, in a shape you can step out of, and the ones in two waves leave a safe moment between them.
function bossSig(e, mv) {
  const an = Math.atan2(P.x - e.x, P.z - e.z), el = G.zone.th.elem, D = e.dmg, A = o => addArea(Object.assign({ owner: 'e', el, src: e }, o)), col = e.md && e.md.e || 0xff5a2a;
  if (mv === 'roots') { /* roots tear up the ground in a fan toward you, then again in the gaps: step sideways twice */
    for (const k of [-1, 0, 1]) A({ x: e.x, z: e.z, sh: 'line', ang: an + k * .5, len: 20, w: 2, delay: 1.1, dmg: D * 1.7, c: col, hvy: heavyK(1.1) });
    for (const k of [-.5, .5]) A({ x: e.x, z: e.z, sh: 'line', ang: an + k * .5, len: 20, w: 2, delay: 1.9, dmg: D * 1.7, c: col, hvy: heavyK(1.1) }); }
  else if (mv === 'cage') { /* a ring closes around you, then the middle: hold still until the ring lands, then get out */
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; A({ x: P.x + Math.sin(a) * 4.2, z: P.z + Math.cos(a) * 4.2, r: 1.9, delay: 1.2, dmg: D * 1.5, c: col, hvy: heavyK(.6) }); }
    A({ x: P.x, z: P.z, r: 2.8, delay: 2, dmg: D * 2, c: 0xff4a2a, hvy: heavyK(1.3) }); }
  else if (mv === 'trail') { /* it tears a path straight through you, landing step by step: move off the line */
    for (let i = 0; i < 6; i++) { const d = 2.5 + i * 3.2; A({ x: e.x + Math.sin(an) * d, z: e.z + Math.cos(an) * d, r: 2.6, delay: .95 + i * .2, dmg: D * 1.6, c: col, hvy: heavyK(.9) }); } }
  else if (mv === 'twincross') { /* a cross on you, then the same cross turned: leave on a diagonal, then not back the way you came */
    A({ x: P.x, z: P.z, sh: 'cross', ang: an, len: 24, w: 2.6, delay: 1.15, dmg: D * 1.6, c: col, hvy: heavyK(1.1) });
    A({ x: P.x, z: P.z, sh: 'cross', ang: an + .7854, len: 24, w: 2.6, delay: 1.9, dmg: D * 1.6, c: 0xff4a2a, hvy: heavyK(1.1) }); }
  else if (mv === 'twinrays') { /* rays burst from it, then again between them */
    A({ x: e.x, z: e.z, sh: 'rays', n: 7, ang: an, len: 18, w: 1.8, delay: 1.2, dmg: D * 1.6, c: col, hvy: heavyK(1.1) });
    A({ x: e.x, z: e.z, sh: 'rays', n: 7, ang: an + Math.PI / 7, len: 18, w: 1.8, delay: 1.95, dmg: D * 1.6, c: 0xff4a2a, hvy: heavyK(1.1) }); }
  else if (mv === 'twincone') { /* a breath at you, then sweeping to both sides: get behind it or far away */
    A({ x: e.x, z: e.z, sh: 'cone', ang: an, arc: .55, r: 11 + e.r, delay: 1.1, dmg: D * 1.8, c: col, hvy: heavyK(1.2) });
    for (const k of [-1, 1]) A({ x: e.x, z: e.z, sh: 'cone', ang: an + k * 1, arc: .55, r: 11 + e.r, delay: 1.75, dmg: D * 1.8, c: 0xff4a2a, hvy: heavyK(1.2) }); }
  else if (mv === 'fault') { /* the ground splits in a cross through it, then the far ends erupt */
    A({ x: e.x, z: e.z, sh: 'cross', ang: an, len: 34, w: 2.6, delay: 1.2, dmg: D * 1.7, c: col, hvy: heavyK(1.2) });
    for (let i = 0; i < 4; i++) { const a = an + i * 1.5708; A({ x: e.x + Math.sin(a) * 12, z: e.z + Math.cos(a) * 12, r: 3.4, delay: 1.9, dmg: D * 1.6, c: 0xff4a2a, hvy: heavyK(.9) }); } }
  else if (mv === 'halo') { /* a ring lands around it, then everything inside: stay outside the ring, or cross it once it has landed */
    for (let i = 0; i < 10; i++) { const a = an + i / 10 * 6.2832; A({ x: e.x + Math.sin(a) * 7, z: e.z + Math.cos(a) * 7, r: 2, delay: 1.1, dmg: D * 1.5, c: col, hvy: heavyK(.6) }); }
    A({ x: e.x, z: e.z, r: 5.6, delay: 1.9, dmg: D * 2.1, c: 0xff4a2a, hvy: heavyK(1.4) }); }
  e.st = 'hwind'; e.t = 1;
}
function updEnemy(e, dt) {
  if (e.dummy) { if (e.flash > 0) e.flash -= dt; e.wob = Math.max(0, (e.wob || 0) - dt * 1.6); if (e.burnT > 0) { e.burnT -= dt; dummyHit(e, e.burn * dt); } e.chill = e.shock = e.frozen = 0; e.awake = true; return; }
  if (e.flash > 0) e.flash -= dt; if (e.atk > 0) e.atk -= dt * 3; if (e.chill > 0) e.chill -= dt; if (e.shock > 0) e.shock -= dt;
  if (e.kvx || e.kvz) { if (!moveEnt(e, e.kvx * dt, e.kvz * dt, e.r * .8)) e.kvx = e.kvz = 0; const f = Math.max(0, 1 - dt * 9); e.kvx *= f; e.kvz *= f; if (Math.abs(e.kvx) + Math.abs(e.kvz) < .2) e.kvx = e.kvz = 0; } // build 0048: the shove slides out instead of snapping
  if (e.burnT > 0) { e.burnT -= dt; e.hp = Math.max(!e.boss && !e.elite && (e.nh || 0) < 2 ? 1 : -1e9, e.hp - e.burn * dt); if (e.hp <= 0) { killEnemy(e); return; } }
  if (e.tnt) { e.tnt.t -= dt; if (e.tnt.t <= 0 || !ALLIES.includes(e.tnt.a) || G.online) e.tnt = null; } // build 0054: a taunted monster turns on the tank
  const T = e.tnt ? e.tnt.a : P, dx = T.x - e.x, dz = T.z - e.z, d = Math.hypot(dx, dz) || .001;
  const hitT = (v, el) => T === P ? dmgPlayer(v, el, e) : tankHit(T, e);
  if (!e.awake) { if (Math.hypot(P.x - e.x, P.z - e.z) < (e.boss ? 17 : 14) && !P.dead && !(e.dozeT > G.time && !los(e.x, e.z, P.x, P.z))) wake(e); else return; }
  if (P.dead) return; if (e.frozen > 0) { e.frozen -= dt; return; }
  if (e.boss) { e.pt -= dt; e.tt = (e.tt === undefined ? 1.4 : e.tt) - dt; if (e.bd && e.bd.sig) e.sigT = (e.sigT === undefined ? 4.5 : e.sigT) - dt; } /* build 0089: a guardian's attack clocks keep running while it swings or recovers, so standing in its reach no longer stops its big moves */
  const slow = e.chill > 0 ? .6 : 1, sp = e.spd * slow, a = e.a; e.cd -= dt * slow; e.t -= dt * slow;
  if (e.arch === 'goblin') { e.escT = (e.escT || 0) + dt; if (e.escT > 30) { e.alive = false; e.deadT = .45; e.escaped = 1; if (typeof __emit === 'function') __emit(null, { t: 'gone', id: e.id }); else goblinGone(e); return; }
    const st = sp * dt; if (d < 20) { if (!moveEnt(e, -dx / d * st, -dz / d * st, e.r * .8)) { const sd = (e.id & 1) ? 1 : -1; moveEnt(e, -dz / d * st * sd, dx / d * st * sd, e.r * .8); } e.walk += st * 1.8; let da = Math.atan2(-dx, -dz) - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * Math.min(1, dt * 10); } return; }
  if (e.blink) { e.bT = (e.bT === undefined ? 3 : e.bT) - dt; if (e.bT <= 0 && d > 4 && d < 15) { e.bT = 5; for (let t = 0; t < 6; t++) { const an = Math.random() * 6.28, nx = P.x + Math.cos(an) * 2.6, nz = P.z + Math.sin(an) * 2.6; if (!blocked(nx, nz, e.r)) { if (typeof __emit !== 'function') { burst(e.x, 1.2, e.z, 0xb48cff, 16, 5); burst(nx, 1.2, nz, 0xb48cff, 16, 5); } e.x = nx; e.z = nz; break; } } } }
  if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .02 * dt);
  if (e.storm) { e.modT -= dt; if (e.modT <= 0) { e.modT = 3.2; addArea({ x: P.x, z: P.z, r: 2.4, delay: .9, owner: 'e', dmg: e.dmg * 1.2, el: 'light', c: 0xfff07a, src: e }); } }
  const face = () => { let da = Math.atan2(dx, dz) - e.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; e.rot += da * Math.min(1, dt * 10); };
  const go = (dir, k) => { const st = sp * dt * (k || 1); if (!moveEnt(e, dx / d * st * dir, dz / d * st * dir, e.r * .8)) { const sd = (e.id & 1) ? 1 : -1; moveEnt(e, -dz / d * st * sd, dx / d * st * sd, e.r * .8); } e.walk += st * 1.6; };
  if (!e.boss && !G.online) { e.skT = (e.skT || 0) + dt; if (e.skT > 1.2) { const mv = e.skX === undefined ? 1 : Math.hypot(e.x - e.skX, e.z - e.skZ); e.skN = mv < .3 && d > 3.5 ? (e.skN || 0) + 1 : 0; e.skX = e.x; e.skZ = e.z; e.skT = 0; if (e.skN >= 3 && !los(e.x, e.z, P.x, P.z)) { e.awake = false; e.skN = 0; e.tnt = null; e.dozeT = G.time + 8; return; } } } /* build 0062 (playtest): a monster stuck behind a wall for a few seconds with no way to you gives up and dozes off */
  if (e.st === 'charge') { const st = 24 * dt; if (!moveEnt(e, Math.sin(e.cdir) * st, Math.cos(e.cdir) * st, e.r)) e.t = 0; e.rot = e.cdir; e.walk += st; if (!e.chit && d < e.r + 1.2) { e.chit = true; hitT(e.dmg * 1.8, 'phys'); } if (e.t <= 0) { e.st = 'rec'; e.t = .6; } return; }
  if (e.cd2 > 0) e.cd2 -= dt;
  if (e.st === 'hwind') { face(); if (e.t <= 0) { e.atk = 1; e.st = 'rec'; e.t = a.rec; } return; } // build 0035: a champion's heavy blow lands where the red circle was
  if (e.st === 'cwind') { if (e.t <= 0) { e.st = 'charge'; e.t = .5; e.chit = false; } return; } // rush telegraphed: it has locked its line
  if (e.st === 'wind') { face(); if (e.t <= 0) { e.atk = 1; if (e.arch === 'caster' && e.md.v === 'lob') addArea({ x: e.lx, z: e.lz, r: 2.3, delay: .75, owner: 'e', dmg: e.dmg * 1.1, el: G.zone.th.elem, c: e.md.e, src: e }); else if (e.arch === 'caster') eShoot(e, Math.atan2(dx, dz), 12, 1, G.zone.th.elem); else if (e.arch === 'bomber') { addArea({ x: e.x, z: e.z, r: 3.3, delay: .05, owner: 'e', dmg: e.dmg, el: 'fire', c: 0xff7a2a }); e.noXp = true; killEnemy(e); return; } else if (e.arch !== 'brute' && d <= a.reach + e.r + .9) hitT(e.dmg, 'phys'); e.st = 'rec'; e.t = a.rec / (e.hasted ? 1.3 : 1); } return; }
  if (e.st === 'rec') { if (e.t <= 0) e.st = 'chase'; return; }
  face();
  if (e.boss) {
    const q = Math.ceil(e.hp / e.maxHp * 4); if (e.q && q < e.q) for (let i = 0; i < 2; i++) G.drops.push({ x: e.x + rnd(-4, 4), z: e.z + rnd(-4, 4), globe: 1, t: 0 }); e.q = q;
    if (e.spiral > 0) { e.spiral -= dt; e.spT = (e.spT || 0) - dt; if (e.spT <= 0) { e.spT = .09; e.spA = (e.spA || 0) + .5; eShoot(e, e.spA, 10, .7, G.zone.th.elem); eShoot(e, e.spA + Math.PI, 10, .7, G.zone.th.elem); } return; }
    if (e.bd.phases) { const ph = e.hp > e.maxHp * .66 ? 0 : e.hp > e.maxHp * .33 ? 1 : 2; if (ph > (e.ph || 0)) { e.ph = ph; e.pi = 0; e.pt = .6; e.spiral = 0; } } /* build 0074: Vaeloth changes his whole fight at two thirds and one third of his life */
    const sg = e.bd.sig; if (sg && !e.p2 && e.hp < e.maxHp * .5) { e.p2 = 1; e.pt = Math.min(e.pt, .8); e.sigT = 1.2; e.spiral = 0; ring(e.x, e.z, 0, 9, .7, 0xff4a2a); burst(e.x, 2, e.z, 0xff4a2a, 30, 8); } /* build 0089: enraged at half life */
    const fast = e.p2 || e.hp < e.maxHp * .4;
    if (sg) { if (e.sigT <= 0 && d < 20) { e.sigT = e.p2 ? 6.5 : 9; e.pt = Math.max(e.pt, 2.2); e.tt = Math.max(e.tt, 2.6); /* nothing else lands while its two waves play out */ bossSig(e, e.p2 ? sg[(e.si = (e.si || 0) + 1) % 2] : sg[0]); return; } }
    if (e.pt <= 0) { e.pt = (fast ? 2.3 : 3.3) * (e.ph === 2 ? .8 : 1); bossPattern(e); return; }
    if (e.tt <= 0 && d < 16) { e.tt = fast ? 4.6 : 6; bossTele(e); return; }
  }
  if (e.arch === 'caster') { if (d > 11) go(1); else if (d < 6) go(-1, .8); else { const sd = Math.sin(G.time * .5 + e.id) > 0 ? 1 : -1, st = sp * dt * .55; moveEnt(e, dz / d * st * sd, -dx / d * st * sd, e.r * .8); e.walk += st * 1.6; } // keeps moving sideways so it is harder to line up
    if (!e.elite && e.md.v !== 'lob') { e.sgT = (e.sgT === undefined ? rnd(2, 5) : e.sgT) - dt; if (e.sgT <= 0 && d < 13) { const an = Math.atan2(dx, dz), o = eTele({ x: e.x, z: e.z, sh: 'line', ang: an, len: 15, w: 1.5, delay: 1.15, owner: 'e', dmg: e.dmg * 1.5, el: G.zone.th.elem, c: e.md.e, src: e, hvy: heavyK(.9) }); if (o) { e.sgT = rnd(8, 11); e.st = 'hwind'; e.t = o.delay; e.rot = an; return; } e.sgT = .5; } } // build 0048: casters also charge a beam along a marked line
    if (e.cd <= 0 && d < 14) { e.cd = 2.4; e.st = 'wind'; e.t = a.wind; e.lx = T.x; e.lz = T.z; } return; }
  if (e.md.v === 'charge' && !e.boss && d > 4.5 && d < 10 && !(e.cd2 > 0)) { e.cd2 = 5.5; e.st = 'cwind'; e.t = .7; e.cdir = Math.atan2(dx, dz); e.rot = e.cdir; for (const k of [3, 6, 9]) addArea({ x: e.x + Math.sin(e.cdir) * k, z: e.z + Math.cos(e.cdir) * k, r: 1.1, delay: .7, owner: 'e', vis: true, dmg: 0, el: 'phys', c: 0xff4a2a }); return; }
  if (e.elite && d < 7 && e.arch !== 'bomber' && e.arch !== 'goblin') { e.hsT = (e.hsT === undefined ? rnd(2, 4) : e.hsT) - dt; if (e.hsT <= 0) { e.hsT = rnd(5, 7); e.st = 'hwind'; e.t = .95; addArea({ x: T.x, z: T.z, r: 2.8, delay: .95, owner: 'e', dmg: e.dmg * 2.2, el: 'phys', c: 0xff4a2a, src: e, hvy: heavyK(1.25) }); return; } } // build 0035: champions wind up a heavy blow; step out of the red circle or dodge
  if (!e.elite && (e.arch === 'grunt' && e.md.v !== 'charge' || e.arch === 'brute')) { e.sgT = (e.sgT === undefined ? rnd(1, 3.5) : e.sgT) - dt; if (e.sgT <= 0) { const an = Math.atan2(dx, dz); let o = null; // build 0048: every grunt and brute has a marked heavy blow
      if (e.arch === 'grunt' && d < 3.6) o = eTele({ x: e.x, z: e.z, sh: 'cone', ang: an, arc: .8, r: 3.8 + e.r * .5, delay: .85, owner: 'e', dmg: e.dmg * 1.6, el: 'phys', c: 0xff4a2a, src: e, hvy: heavyK(1) });
      else if (e.arch === 'brute' && d > 2.5 && d < 10) o = eTele({ x: e.x, z: e.z, sh: 'line', ang: an, len: 11, w: 2.4, delay: 1, owner: 'e', dmg: e.dmg * 1.8, el: 'phys', c: 0xff5a2a, src: e, hvy: heavyK(1.15) });
      if (o) { e.sgT = rnd(6, 9); e.st = 'hwind'; e.t = o.delay; e.rot = an; return; } e.sgT = .5; } }
  const reach = a.reach + e.r * .5;
  if (d > reach) { if (d > 3.2 && !e.boss && e.arch !== 'brute') { if (e.fl === undefined) e.fl = ((e.id * 7919 % 100) / 100 - .5) * 6; const fx = T.x - dz / d * e.fl - e.x, fz = T.z + dx / d * e.fl - e.z, fd = Math.hypot(fx, fz) || 1, st = sp * dt; moveEnt(e, fx / fd * st, fz / fd * st, e.r * .8); e.walk += st * 1.6; } else go(1); } // the pack fans out to surround instead of queueing up
  else if (e.cd <= 0) {
    e.cd = .3; e.st = 'wind'; e.t = a.wind / (e.hasted ? 1.3 : 1);
    if (e.arch === 'brute') addArea({ x: e.x + dx / d * 2, z: e.z + dz / d * 2, r: 3, delay: e.t, owner: 'e', dmg: e.dmg, el: 'phys', c: 0xff4a2a, src: e });
    else if (e.boss) addArea({ x: e.x + dx / d * 2.5, z: e.z + dz / d * 2.5, r: 4, delay: e.t, owner: 'e', dmg: e.dmg * 1.3, el: 'phys', c: 0xff4a2a, src: e });
  }
}
// build 0048: cones and lines drawn on the ground. A dim outline shows the whole shape, a brighter fill grows from the attacker until it lands
function teleLine(x0, z0, ang, len, w, c, k, fl, cw) { const sn = Math.sin(ang), cs = Math.cos(ang), px = cs * w / 2, pz = -sn * w / 2, m = len / 2;
  GLX.obj('glow', 'box', x0 + sn * m, .07, z0 + cs * m, ang, w, .02, len, c, 1, .14 + fl * .2, 0);
  if (k > 0) GLX.obj('glow', 'box', x0 + sn * len * k / 2, .08, z0 + cs * len * k / 2, ang, w, .02, len * k, c, 1, .32, 0);
  for (const sd of [1, -1]) GLX.obj('glow', 'box', x0 + sn * m + px * sd, .09, z0 + cs * m + pz * sd, ang, .12, .02, len, c, 1 + fl, .9, 0);
  GLX.obj('glow', 'box', x0 + sn * len, .09, z0 + cs * len, ang, w, .02, .12, c, 1 + fl, .9, 0); GLX.obj('glow', 'box', x0 + sn * len * k, .1, z0 + cs * len * k, ang, w, .02, .16, cw, 1.4, .8, 0); }
function drawTele(a, c, k, fl) { const cw = GLX.col(0xffd0a0), L = areaLines(a);
  if (L) { for (const l of L) teleLine(l[0], l[1], l[2], a.len, a.w, c, k, fl, cw); return; }
  const n = Math.max(1, Math.round(2 * a.arc / .1745)), st = 2 * a.arc / n, d = a.r * 2; // a cone is a fan of 10 degree slices
  for (let i = 0; i < n; i++) { const q = a.ang - a.arc + st * (i + .5); const f = Math.tan(st / 2) / Math.tan(.0873); GLX.obj('glow', 'sect', a.x, .07, a.z, q, d * f, 1, d, c, 1, .14 + fl * .2, 0); if (k > 0) GLX.obj('glow', 'sect', a.x, .08, a.z, q, d * k * f, 1, d * k, c, 1, .32, 0);
    const m = a.r * Math.cos(st / 2), ch = 2 * a.r * Math.sin(st / 2); GLX.obj('glow', 'box', a.x + Math.sin(q) * m, .09, a.z + Math.cos(q) * m, q, ch, .02, .12, c, 1 + fl, .9, 0); GLX.obj('glow', 'box', a.x + Math.sin(q) * m * k, .1, a.z + Math.cos(q) * m * k, q, ch * k, .02, .16, cw, 1.4, .8, 0); }
  for (const sd of [-1, 1]) { const q = a.ang + a.arc * sd; GLX.obj('glow', 'box', a.x + Math.sin(q) * a.r / 2, .09, a.z + Math.cos(q) * a.r / 2, q, .12, .02, a.r, c, 1 + fl, .9, 0); } }
function update(dt) {
  if (typeof UI !== 'undefined' && UI.panelOpen && UI.panelOpen()) { if (!G.online) return; G.menuHold = true; P.iframes = Math.max(P.iframes || 0, .4); P.move = P.atk = null; } else G.menuHold = false; // menus pause the game; online, where the world cannot stop, they shield you instead
  if (G.cine) { const c = G.cine; c.t += dt; if (c.t >= c.dur) G.cine = null; else if (!G.online) dt *= c.kind === 'intro' ? .3 : .15 + .85 * Math.pow(c.t / c.dur, 2); } /* build 0053: boss moments slow the world (solo only, so online play stays in step) */
  if (G.boss && G.boss.alive && G.boss.awake && !G.inTown && !G.cine) { const bk = G.zone && G.zone.def ? G.zone.def.seed + ':' + (G.zone.def.depth || 0) : ''; if (G.cineKey !== bk) { G.cineKey = bk; const b = G.boss; /* build 0075: no intro camera or slow motion; the name card, the ring and the shake stay */ P.iframes = Math.max(P.iframes || 0, 4); /* build 0072 (Lee's playtest): nothing can hurt you for a moment when a guardian wakes */ if (stBrand(b) && UI.zoneBanner) UI.zoneBanner(b.name, b.bd && b.bd.phases ? 'The Prophet himself, at the Heart of Cinders' : 'Bound to ' + STORY_VILLAIN); ring(b.x, b.z, .5, 9, .9, (b.md && b.md.e) || 0xff5a2a); burst(b.x, 1.5, b.z, (b.md && b.md.c2) || 0x6a4a2a, 24, 8); G.shake = Math.min(.7, (G.shake || 0) + .4); } }
  if (G.hitStop > 0) { G.hitStop -= dt; dt *= .12; } // a heavy blow lands: the world holds its breath for a few frames
  if (G.auto && G.hero && G.hero.picks) { const i = pendingPick(G.hero); if (i >= 0) pickSkill(i, skillTiers(G.hero.cls)[i][Math.random() * 2 | 0]); }
  SFX.ambTick(dt); SFX.fight(fightHeat(dt), dt); updAlly(dt); G.time += dt; if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
  P.mv += ((P.moving ? 1 : 0) - P.mv) * Math.min(1, dt * 12);
  updPlayer(dt); if (G.online) NET.tick(dt); updGps(dt); updPet(dt); if (!G.online && !G.inTown) repop(dt, [P]); if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) if ((o.kind === 'lost' || o.kind === 'captive') && !o.used && Math.hypot(o.x - P.x, o.z - P.z) < 2.4) interact(o); G.achT = (G.achT || 0) - dt; if (G.achT <= 0) { G.achT = 1; achCheck(); }
  if (G.auto && P.dead) { BOT.rv += dt; if (BOT.rv > 2.5) { BOT.rv = 0; UI.revive(); } }
  // enemies
  const act = [];
  for (const e of G.ents) { if (!e.alive) { e.deadT -= dt; if (e.fly) flyStep(e, dt); if (!e.dfx && e.deadT < .22) { e.dfx = 1; deathFx(e); } continue; } if (G.online && !e.dummy) repEnemy(e, dt); else updEnemy(e, dt); /* the Training Dummy lives only on your own screen, so it never takes the online path */ if (e.alive && e.awake && !e.dummy) act.push(e); }
  if (!G.online) for (let i = 0; i < act.length; i++) { const a = act[i]; for (let j = i + 1; j < act.length; j++) { const b = act[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d < m && d > .001) { const p = (m - d) * .5, nx = dx / d * p, nz = dz / d * p; if (!a.boss) moveEnt(a, -nx, -nz, a.r * .8); if (!b.boss) moveEnt(b, nx, nz, b.r * .8); } }
    const dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz), m = a.r + .5; if (d < m && d > .001 && !a.boss && !P.dash) moveEnt(a, dx / d * (m - d), dz / d * (m - d), a.r * .8); }
  if (G.ents.length && G.ents.some(e => !e.alive && e.deadT <= 0)) G.ents = G.ents.filter(e => e.alive || e.deadT > 0);
  if (G.boss && !G.boss.alive) { const b = G.boss; G.cine = { kind: 'death', t: 0, dur: 2.4, x: b.x, z: b.z }; G.hitStop = 0; G.shake = .7; G.fx.push({ flash: 1, x: b.x, y: 1.5 * (b.sc || 1), z: b.z, r: 9, life: .5, max: .5, c: GLX.col(0xfff0d0) }); ring(b.x, b.z, .5, 14, 1.2, 0xffd8a0); ring(b.x, b.z, .5, 8, .8, (b.md && b.md.e) || 0xff5a2a); SFX.play('bossdie'); G.boss = null; } /* build 0053: the final blow lands in slow motion */
  // projectiles (enemy)
  for (let i = G.projs.length - 1; i >= 0; i--) { const p = G.projs[i]; p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt; trailFx(p, p.el, dt, .6); let dead = p.life <= 0 || cellAt(p.x, p.z); if (!dead && !p.peer && !P.dead && Math.hypot(p.x - P.x, p.z - P.z) < p.r + .6 && P.y < 1.5) { if (!p.vis) dmgPlayer(p.dmg, p.el, null); dead = true; } if (dead) { burst(p.x, 1.2, p.z, 0xffffff, 3, 3); elemHit(p.x, p.z, p.el, false); G.projs.splice(i, 1); } }
  for (let i = G.timers.length - 1; i >= 0; i--) { const t = G.timers[i]; t.t -= dt; if (t.t <= 0) { G.timers.splice(i, 1); t.fn(); } }
  for (let i = G.pp.length - 1; i >= 0; i--) {
    const p = G.pp[i], n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / .45)), h = dt / n; let dead = false; p.life -= dt; if (!p.arrow) trailFx(p, p.sk.el, dt);
    for (let k = 0; k <= n && !dead; k++) {   // sub-steps so fast shots cannot skip past a close enemy or a wall corner
      if (k) { p.x += p.vx * h; p.z += p.vz * h; } if (cellAt(p.x, p.z)) { dead = true; break; }
      for (const e of G.ents) { if (!e.alive || p.hit.has(e) || Math.hypot(e.x - p.x, e.z - p.z) > p.r + e.r) continue; if (p.sk.explode) { dead = true; break; } p.hit.add(e); hitEnemy(e, p.sk); if (p.pierce-- <= 0) { dead = true; break; } }
    }
    if (p.life <= 0) dead = true;
    if (dead) { if (p.sk.explode) { const r = p.sk.explode * (1 + P.stats.area / 100); areaHit(p.x, p.z, r, p.sk); ring(p.x, p.z, .4, r, .35, EL_COL[p.sk.el]); impact(p.x, p.z, r * .7, EL_COL[p.sk.el], true); SFX.play('slam'); } else if (!p.arrow) impact(p.x, p.z, .7, EL_COL[p.sk.el], false); if (!p.arrow) elemHit(p.x, p.z, p.sk.el, !!p.sk.explode); burst(p.x, 1.2, p.z, EL_COL[p.sk.el], 5, 4); G.pp.splice(i, 1); }
  }
  // areas
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const a = G.areas[i]; a.t += dt; if (a.hvy && !a.done && !a.was && a.t < a.delay * .8 && !P.dead && inArea(a, P.x, P.z, 0)) a.was = 1;
    if (!a.done && a.t >= a.delay) { a.done = true; if (a.owner === 'p') { for (const e of G.ents) if (e.alive && Math.hypot(e.x - a.x, e.z - a.z) <= a.r + e.r) hitEnemy(e, a.sk, a.mult, a.proc); } else { const inn = !P.dead && inArea(a, P.x, P.z, .3) && P.y < 1.5; if (!a.vis && inn) dmgPlayer(a.dmg, a.el, a.src, a.hvy); else if (a.hvy && a.was && !inn && !P.dead) { floatText(P.x, 2.8, P.z, 'Evaded', '#9fe', .8, 15); SFX.play('evade'); } } areaLand(a); if (a.owner === 'p' && !a.proc) impact(a.x, a.z, a.r * .8, a.c, a.r >= 2.5); if (a.owner === 'e') G.shake = Math.min(.5, G.shake + .08); }
    if (a.t >= a.delay + .05) G.areas.splice(i, 1);
  }
  // drops
  if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) if ((o.kind === 'chest' || o.kind === 'shrine' || o.kind === 'gchest' || o.kind === 'well') && !o.used && Math.hypot(o.x - P.x, o.z - P.z) < (o.kind === 'shrine' || o.kind === 'well' ? 2.2 : 1.6)) interact(o); // walk over chests and shrines to open or touch them
  if (G.zone && !G.inTown && !P.dead) for (const o of G.zone.objs) { if (o.kind !== 'portal' && o.kind !== 'pback') continue; const dd = Math.hypot(o.x - P.x, o.z - P.z), R = o.kind === 'portal' ? 1.9 : 1.4; if (dd < 13 && G.time - (o.humT || -9) > 3.4) { o.humT = G.time; SFX.play('hum'); } if (dd < R && P.gateGo === o && P.inter === o && !o.gone) { interact(o); return; } if (o.cdT > 0) { if (o.gone || dd > (o.cdR || R + 1.6)) { o.cdT = 0; if (G.gateCd === o) G.gateCd = null; } else { o.cdT -= dt; if (o.cdT <= 0) { o.cdT = 0; G.gateCd = null; o.gone = true; SFX.play('warp'); interact(o); return; } } } /* build 0075: the gate counts down instead of asking */ if (dd > R + 1.5) o.arm = true; else if (dd < R && o.arm && !o.gone) { o.arm = false; if (typeof UI !== 'undefined' && UI.askGate) UI.askGate(o); else { o.gone = true; interact(o); } return; } } // step into a gate to travel
  for (const d of G.drops.slice()) { d.t += dt; if (d.item && !G.hero.got1 && G.hero.level <= 2 && !G.inTown && !P.dead && d.t > .4) { /* build 0072 (Lee's playtest): the very first item is hard to miss: it says so, and it comes to you */ const dd = Math.hypot(d.x - P.x, d.z - P.z); if (!G.firstHint && dd < 20) { G.firstHint = 1; hint('Loot! Walk over the glowing item to pick it up.'); floatText(d.x, 1.8, d.z, 'Loot!', '#ffe08a', 1.6, 18); } if (dd < 10 && dd > .3) { const st = Math.min(dd, 9 * dt); if (!blocked(d.x + (P.x - d.x) / dd * st, d.z + (P.z - d.z) / dd * st, .2)) { d.x += (P.x - d.x) / dd * st; d.z += (P.z - d.z) / dd * st; } } }
    if (d.item && d.t > .5 && G.set.autoLoot !== false && !P.dead && d.item.rar >= G.hero.filter && Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && G.time - (d.tryT || -9) > 2.5) { d.tryT = G.time; pickup(d); continue; } // walk over loot to collect it
    if (d.globe) { if (Math.hypot(d.x - P.x, d.z - P.z) < 1.8 && P.hp < P.stats.maxLife) pickup(d); } else if ((d.gold || d.q) && d.t > .3) { const dd = Math.hypot(d.x - P.x, d.z - P.z); if (dd < 4.5) { d.x += (P.x - d.x) / dd * 14 * dt; d.z += (P.z - d.z) / dd * 14 * dt; if (dd < .9) pickup(d); } } }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.life -= dt; if (f.life <= 0) { G.fx.splice(i, 1); continue; } if (!f.ring && !f.slash && !f.bolt && !f.flash && !f.pillar && !f.shock && !f.scorch && !f.shard && !f.flame && !f.xfl && !f.rem && !f.wisp) { if (f.ember) { f.vx *= .95; f.vz *= .95; f.vy += 15.2 * dt; } else if (f.smoke) { f.vx *= .96; f.vz *= .96; f.vy += 13 * dt; } f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 14 * dt; if (f.y < .05) { f.y = .05; f.vy *= -.3; if (f.chunk) { f.vx *= .8; f.vz *= .8; f.spin *= .7; } } } }
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
  /* build 0046: the floor's portal is easy to click or tap anywhere on its arch or glow */
  for (const o of Z.objs) { if (o.kind !== 'portal' && o.kind !== 'pback') continue; const c = GLX.toScreen(o.x, 2.6, o.z), e = GLX.toScreen(o.x + 3.2, 2.6, o.z); if (!c || !e) continue; const r = Math.max(50, Math.hypot(e[0] - c[0], e[1] - c[1])) * (IN.touch ? 1.15 : 1), d = Math.hypot((c[0] - IN.sx) * .9, (c[1] - IN.sy) * .62);
    if (d < r && (!G.hover || best > 22 * k)) { G.hover = null; G.hoverObj = o; } }
  G.hoverPet = false; if (!G.hover && !G.hoverObj && PET.init && !(PET.away > 0) && G.set.pet !== false && !P.dead) { const sp = GLX.toScreen(PET.x, .5, PET.z); if (sp && Math.hypot(sp[0] - IN.sx, sp[1] - IN.sy) < 30 * k) G.hoverPet = true; } /* build 0075: the pet can be clicked */
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
// ---- build 0039: real hero models (free CC0 Quaternius characters), baked by tools/model/build.mjs into public/models ----
// build 0042: every hero, AI teammate, other player and townsperson is on a real model. All of them share one animation file,
// each class has its own outfit, and weapons, shields, hats and helmets are held by the model's own hand and head bones.
// If a model has not loaded (or a graphics card cannot skin on the GPU), the code-built character is drawn instead.
const MLIFT = [1.55, 1.55, 1.5], MLIFT_SKIN = [1.15, 1.12, 1.1], MODELS_ON = !(typeof location !== 'undefined' && /[?&]models=0/.test(location.search)), MODELS_BADGE = typeof location !== 'undefined' && /[?&]models=1/.test(location.search), BMm = new Float32Array(16), HAL = new Float32Array(16), HAR = new Float32Array(16), UPMASK = {};
const MODEL_OF = { warden: 'warden', ranger: 'ranger', arcanist: 'arcanist', elementalist: 'elementalist', brawler: 'brawler', vil1: 'folkm', vil4: 'folkm', vil5: 'folkm', kid: 'folkm', vendor: 'folkm', vil2: 'folkf', vil3: 'folkf', vil6: 'folkf' }, HAIR_ALT = { vil4: 1, vil5: 1, vil3: 1, vendor: 1 }, MSC = 1.32;
const MBK = new Float32Array(16), MT1 = new Float32Array(16), MT2 = new Float32Array(16), MHB = new Float32Array(16), MAT = new Float32Array(16), DYE = new Map();
function m4mul(o, a, b) { for (let c = 0; c < 4; c++) { const x = b[c * 4], y = b[c * 4 + 1], z = b[c * 4 + 2], w = b[c * 4 + 3]; for (let r = 0; r < 4; r++) MT2[c * 4 + r] = a[r] * x + a[4 + r] * y + a[8 + r] * z + a[12 + r] * w; } o.set(MT2); return o; }
// the same placement GLX.part uses (pivot, rotation Y then X then Z), and its inverse, as 4x4 matrices
function m4rig(o, px, py, pz, rx, ry, rz, ox, oy, oz) { const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx, m10 = cx * sz, m11 = cx * cz, m12 = -sx, m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
  o[0] = m00; o[1] = m10; o[2] = m20; o[3] = 0; o[4] = m01; o[5] = m11; o[6] = m21; o[7] = 0; o[8] = m02; o[9] = m12; o[10] = m22; o[11] = 0; o[12] = px + m00 * ox + m01 * oy + m02 * oz; o[13] = py + m10 * ox + m11 * oy + m12 * oz; o[14] = pz + m20 * ox + m21 * oy + m22 * oz; o[15] = 1; return o; }
function m4inv(o, m) { const t0 = m[12], t1 = m[13], t2 = m[14]; o[0] = m[0]; o[1] = m[4]; o[2] = m[8]; o[3] = 0; o[4] = m[1]; o[5] = m[5]; o[6] = m[9]; o[7] = 0; o[8] = m[2]; o[9] = m[6]; o[10] = m[10]; o[11] = 0;
  o[12] = -(m[0] * t0 + m[1] * t1 + m[2] * t2); o[13] = -(m[4] * t0 + m[5] * t1 + m[6] * t2); o[14] = -(m[8] * t0 + m[9] * t1 + m[10] * t2); o[15] = 1; return o; }
// dye a model group to an exact colour (on average), keeping the texture's light and dark
function mdye(gr, hex, k, lift) { const key = gr.avg + '|' + hex + '|' + k + '|' + lift; let c = DYE.get(key); if (!c) { const T = GLX.col(hex), a = gr.avg || [.1, .1, .1]; c = [0, 1, 2].map(i => lift * ((1 - k) + k * T[i] / Math.max(.004, a[i]))); DYE.set(key, c); } return c; }
function heroModel(o, cls, rot, tw, lu, dy, mv, AW, wt, wglow, em) {
  const nm = o.mdl || MODEL_OF[cls]; if (!MODELS_ON || !nm || !GLX.model || G.realModels === false) return null;
  const M = GLX.model(nm, 'models/' + nm + '.cdm?v=' + BUILD); if (!M || !M.anims || !M.anims.idle) return null;
  const A = M.anims, t = G.time, s = (o.sc || 1.08) * MSC, /* build 0041: as tall as the code-built heroes */ up = UPMASK[nm] || (UPMASK[nm] = CDM.mask(M, ['spine_02'], 0)), hero = !!CLASS_COL[cls];
  const bm = o._bm || (o._bm = new Float32Array(up.length)), act = !o.dead && !o.dash && o.act && AW > .01 ? AW : 0;
  const full = act && mv < .15 && wt !== 'bow' ? 1 : 0; for (let b = 0; b < up.length; b++) bm[b] = 1 - act * (full || up[b]); /* build 0066: standing still, the swing takes the legs too */
  const lay = [];
  if (o.dead) { if (o.fallT0 === undefined) o.fallT0 = t; lay.push(['die', (t - o.fallT0) * 1.3, false, 1]); }
  else if (o.dash) { if (o._rT0 === undefined) o._rT0 = t; const D = typeof o.dash === 'object' ? o.dash : null, dsk = D && D.sk, f = D && D.dur ? clamp(D.t / D.dur, 0, 1) : -1;
    /* build 0066: a Leap is a real jump (take-off, hang, and a heavy landing after), a Charge is a flat-out sprint, and only the dodge is a roll */
    if (dsk && !dsk.flat && !dsk.blink && f >= 0 && A.jstart) { o._jl = t; if (f < .3) lay.push(['jstart', A.jstart.dur * (.5 + f / .3 * .5), false, 1]); else lay.push(['jloop', (f - .3) * 1.2, true, 1]); }
    else if (dsk && dsk.flat && dsk.n && A.sprint) lay.push(['sprint', (t - o._rT0) * 1.5, true, 1]);
    else lay.push(['roll', .25 + (t - o._rT0) * 2.6, false, 1]); }
  else { o._rT0 = undefined; const m = Math.min(1, mv * 1.6), ph = (o.walk || 0) / 6.2832, gait = hero || mv > .85 ? 'run' : 'walk';
    const melee = hero && wt !== 'bow' && wt !== 'staff' && wt !== 'wand' && wt !== 'fist' && wt !== 'none'; if (o.act) o._aT = t;
    /* build 0066: sword and axe heroes hold a guard stance for a few seconds after they fight, instead of dropping straight back to a relaxed idle */
    const idl = o.talk ? 'talk' : melee && A.cstance && t - (o._aT || -99) < 4 ? 'cstance' : 'idle';
    if (m < 1) lay.push([idl, t + o.x * .37, true, 1 - m, bm]); if (m > 0) lay.push([gait, ph * A[gait].dur, true, m, bm]);
    if (o._jl !== undefined && A.jland) { const u = t - o._jl; if (u < .5) lay.push(['jland', .25 + u * 1.6, false, Math.min(1, (.5 - u) * 4), null]); else o._jl = undefined; } /* the knees take the landing */
    if (o.hurt > 0 && !act) { if (o.hurt > .35 && !o._hv) o._hv = A.hit2 && Math.random() < .5 ? 'hit2' : 'hit'; const hv = o._hv || 'hit'; lay.push([hv, (.4 - Math.min(.4, o.hurt)) * (hv === 'hit2' ? 1.3 : 1.6), false, Math.min(1, o.hurt * 4), up]); } else o._hv = 0;
    if (act) { const k = clamp(o.swing || 0, 0, 1), ranged = wt === 'bow' || wt === 'staff' || wt === 'wand', fist = wt === 'fist' || wt === 'none', an = ranged ? 'cast' : fist ? ((o._pk = o._pk || (Math.random() < .5 ? 1 : 2)) === 1 ? 'punch' : 'jab') : 'attack'; if (k < .05) o._pk = 0;
      const still = mv < .15, msk = still && !ranged ? null : up; /* standing still, the whole body swings: feet plant and the hips turn into the blow */
      if ((wt === 'staff' || wt === 'wand') && A.spenter && k < .38) lay.push(['spenter', k / .38 * A.spenter.dur, false, act, still ? null : up]); /* spells gather power before they fly */
      else if (wt === 'staff' || wt === 'wand') lay.push(['cast', (k - .38) / .62 * A.cast.dur, false, act, still ? null : up]);
      else lay.push([an, k * A[an].dur, false, act, msk]); } }
  GLX.base(BMm, o.x + Math.sin(rot) * lu, o.y + dy - M.head.minY * s, o.z + Math.cos(rot) * lu, rot + tw, s);
  const folk = !hero, alt = HAIR_ALT[cls] ? 1 : 0, L = LOOK[cls] || LOOK.vil1, hairC = o.hair || 0x4a3626;
  const look = (gi, gr) => { const k = gr.kind, mt = gr.mat; if (k === 'beard' && !o.beard) return null; if (k === 'hair' && alt && M.head.groups.some(g => g.kind === 'hairb')) return null; if (k === 'hairb' && !alt) return null;
    if (folk) { if (k === 'cloth') return [mdye(gr, L.cl, .9, 1), em, mt]; if (k === 'leather') return [mdye(gr, L.d, .45, 1.3), em, mt]; }
    if ((k === 'hair' || k === 'hairb' || k === 'beard') && (folk || o.hair)) return [mdye(gr, hairC, .85, 1), em, mt];
    return [mt === 8 ? MLIFT_SKIN : MLIFT, em, mt] /* build 0041: lifted so the outfit reads from the game camera */; };
  if (!GLX.drawModel(M, BMm, lay, look)) return null;
  const col = GLX.col;
  // a bone's frame in the world, sized to the code-built hero's units, so the old weapon, shield and hat shapes fit the hand or head
  const frame = (name, out) => { const h = GLX.attach(M, name, MAT); if (!h) return null; m4mul(out, BMm, h); for (let i = 0; i < 12; i++) out[i] /= MSC; return out; };
  // arm frames: maps the old arm (shoulder pivot, swing angles, hand 0.66 down the arm) onto the model's hand: old x -> -y, y -> x for the right hand
  const FIXR = new Float32Array([0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), FIXL = new Float32Array([0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const R = {
    M, bow: wt === 'bow',
    // swap the shared hero matrix BM for one where the old code's shapes land in the model's hand (side 1 right, -1 left), head or back
    arm(sd, arx, ary, oy) { if (!frame(sd > 0 ? 'hand_r' : 'hand_l', MHB)) return false; m4mul(MHB, MHB, sd > 0 ? FIXR : FIXL); m4inv(MT1, m4rig(MT1, .47 * sd, 1.62, 0, arx, ary, 0, 0, oy === undefined ? -.66 : oy, 0)); MBK.set(BM); m4mul(BM, MHB, MT1); return true; },
    head() { if (!frame('Head', MHB)) return false; m4rig(MT1, 0, -2.055, 0, 0, 0, 0, 0, 0, 0); MBK.set(BM); m4mul(BM, MHB, MT1); return true; },
    back() { if (!frame('spine_03', MHB)) return false; m4rig(MT1, 0, -1.5, 0, 0, 0, 0, 0, 0, 0); MBK.set(BM); m4mul(BM, MHB, MT1); return true; },
    done() { BM.set(MBK); },
    handW(sd) { return frame(sd > 0 ? 'hand_r' : 'hand_l', MHB) ? [MHB[12], MHB[13], MHB[14]] : [o.x, o.y + 1.2, o.z]; },
    weapon() { // a longbow in the left hand, limbs curving back toward the archer, string tip to tip, an arrow nocked while drawing
    if (wt !== 'bow' || o.dead) return; const h = GLX.attach(M, 'hand_l', HAL); if (!h) return; const gx = h[12] + .01, gy = h[13], gz = h[14] + .02, bc = wglow || col(0x5a4028), be = wglow ? .6 : 0;
    const seg = (a, b, w, c, mt, e) => { const dyy = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dyy, dz), ax = Math.atan2(dz, dyy); GLX.part('dyn', 'rbox', BMm, gx, gy + (a[0] + b[0]) / 2, gz + (a[1] + b[1]) / 2, ax, 0, 0, 0, 0, 0, w, L, w * 1.2, c, (e || 0) + em, 1, mt || 0); };
    const P = [[0, 0], [.3, -.05], [.56, -.15], [.66, -.22]]; for (const sd of [1, -1]) for (let i = 0; i < 3; i++) seg([P[i][0] * sd, P[i][1]], [P[i + 1][0] * sd, P[i + 1][1]], i === 2 ? .022 : .032, bc, 3, be);
    GLX.part('dyn', 'rbox', BMm, gx, gy, gz, 0, 0, 0, 0, 0, 0, .04, .14, .05, col(0x4a3524), em, 1, 7);
    const drawn = o.act && AW > .3 && (o.swing || 0) < .42; seg([.66, -.22], drawn ? [0, -.42] : [-.66, -.22], .006, col(0xe8e0d0), 0); if (drawn) seg([0, -.42], [-.66, -.22], .006, col(0xe8e0d0), 0);
    if (drawn) { GLX.part('dyn', 'rbox', BMm, gx, gy, gz - .1, 0, 0, 0, 0, 0, 0, .012, .012, .72, col(0xb89a6a), em); GLX.part('dyn', 'cone', BMm, gx, gy, gz + .27, 1.5708, 0, 0, 0, 0, 0, .025, .06, .025, col(0xc8ced8), em, 1, 4); }
  } };
  return R;
}
function drawHero(o, self) {
  const col = GLX.col, cls = o.cls || G.hero.cls, L = LOOK[cls] || LOOK.warden, g = o.gear || DEFGEAR, cloth = col(L.cl), leatherC = col(0x6a4a30), dkLeather = col(0x4a3524), steelC = col(0x8e97a8), skin = col(0xc99a78), blade = col(0xc8ced8), gold = col(0xb08a3a), wood = col(0x5a4028), under = shade(cloth, .55);
  { /* build 0036: real materials. Each hero colour carries what it is made of, so the renderer can draw cloth, leather, skin and hair as themselves */ cloth.mt = under.mt = 6; leatherC.mt = dkLeather.mt = 7; skin.mt = 8; col(o.hair || (cls === 'brawler' ? 0x2a2018 : cls === 'elementalist' ? 0x8a3a18 : cls === 'arcanist' ? 0x9c98ac : 0x4a3626)).mt = 9; }
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
  if (o.dead) { if (o.fallT0 === undefined) o.fallT0 = G.time; const fk = Math.min(1, (G.time - o.fallT0) * 2.6), fa = 1.45 * fk * fk; const c = Math.cos(fa), sn = Math.sin(fa); for (let i = 0; i < 3; i++) { const u = BM[4 + i], f = BM[8 + i]; BM[4 + i] = u * c - f * sn; BM[8 + i] = u * sn + f * c; } BM[13] += .12 * fk; } else o.fallT0 = undefined; const p = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => GLX.part('dyn', gm2, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, e === undefined ? em : e + em, 1, m || c.mt || 0);
  { const st = Math.sin(w) > 0; if (mv > .5 && o.lstep !== undefined && st !== o.lstep && !o.dash && G.state === 'play') { const sd = st ? 1 : -1; for (let i = 0; i < 3; i++) G.fx.push({ dust: 1, x: o.x + Math.cos(rot) * .16 * sd + (Math.random() - .5) * .3, y: .12, z: o.z - Math.sin(rot) * .16 * sd + (Math.random() - .5) * .3, vx: (Math.random() - .5) * .8, vy: .5 + Math.random() * .5, vz: (Math.random() - .5) * .8, life: .55, max: .55, c: GLX.col(G.zone && G.zone.th && G.zone.th.dust || 0xa89878) }); } o.lstep = st; }
  const lg = Math.sin(w) * .8 * mv, air = o.dash ? -1 : 0, ranged = wt === 'bow' || wt === 'staff';
  // build 0038: glowing runes on rare and better gear, and a soft glow around heroes who wear legendaries
  const RUNES = [[[0, 0, .014, .11], [.022, .03, .036, .012], [.022, -.005, .036, .012]], [[-.02, 0, .012, .11], [.02, 0, .012, .11], [0, .01, .05, .012]], [[0, 0, .012, .11], [0, .05, .05, .012], [0, -.05, .05, .012]], [[0, 0, .012, .11], [.018, .028, .012, .05], [-.018, -.028, .012, .05]]];
  const runeE = r => (r >= 3 ? 1.3 : .75) * (.78 + .22 * Math.sin(G.time * 2.4 + o.x * 1.3));
  const rune = (k, px, py, pz, rx, ry, ox, oy, oz, flat, c, e) => { for (const [dx, dy, ww, hh] of RUNES[k & 3]) flat ? p('rbox', px, py, pz, rx, ry, 0, ox + dx, oy, oz + dy, ww, .014, hh, c, 0, e) : p('rbox', px, py, pz, rx, ry, 0, ox + dx, oy + dy, oz, ww, hh, .028, c, 0, e); };
  if (!o.dead) { let lgN = 0, top = 3; for (const k in g) { const it = g[k]; if (Array.isArray(it) && it[1] >= 3) { lgN++; top = Math.max(top, it[1]); } } if (lgN) { const lc = col(TRIMC[top]), pu = .8 + .2 * Math.sin(G.time * 1.7 + o.x); GLX.halo(o.x, (o.y || 0) + 1.3, o.z, 1.5 + .12 * Math.min(lgN, 5), lc, (.05 + .025 * Math.min(lgN, 4)) * pu); for (let k = 0; k < Math.min(3, lgN); k++) { const ph = (G.time * .45 + k / 3 + o.x * .1) % 1; GLX.obj('glow', 'sphere', o.x + Math.sin(k * 2.4 + G.time * .7) * .45, (o.y || 0) + .5 + ph * 2.1, o.z + Math.cos(k * 1.9 + G.time * .6) * .45, 0, .045, .045, .045, lc, 2, (1 - ph) * .8); } } }
  let MDL = null; try { MDL = heroModel(o, cls, rot, tw, lu, AP ? AP.dy * AW : 0, mv, AW, wt, wglow, em); } catch (e) { G.realModels = false; if (GLX.modelInfo) { const mi = GLX.modelInfo(); mi.state = 'off'; mi.why = 'hero code: ' + String(e && e.message || e).slice(0, 120); } console.warn('real models switched off', e); } if (!MDL) {
  // legs or robe
  if (L.robe) { p('taper', 0, .62, 0, 0, 0, 0, 0, 0, 0, .86, 1.2, .8, ac, am); p('cap', 0, .08, 0, 0, 0, 0, 0, 0, 0, .9, .1, .84, trim, 4, te); p('rbox', 0, .62, .37, .12, 0, 0, 0, 0, 0, .2, 1.0, .04, trim, 0, te); for (const sd of [1, -1]) p('sphere', .16 * sd, .08, .12 + sd * lg * .25, 0, 0, 0, 0, 0, 0, .2, .14, .38, bm ? bm[0] : skin, bm ? bm[1] : 0); }
  else for (const sd of [1, -1]) {
    const r = sd * lg + air * (sd > 0 ? 1 : .5), shc = bm ? bm[0] : pm[0], shm = bm ? bm[1] : pm[1]; p('thigh', .16 * sd, .98, 0, r, 0, 0, 0, -.26, 0, .31, .56, .33, pm[0], pm[1]); /* build 0037: sculpted thigh */ p('sphere', .16 * sd, .98, 0, r, 0, 0, 0, -.5, .03, .22, .22, .24, pm[0], pm[1]); p('calf', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.7, .0, .25, .48, .28, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.6, -.06, .2, .26, .2, shc, shm); p('sphere', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.93, .1, .2, .13, .4, bm ? bm[0] : dkLeather, bm ? bm[1] : 0); p('sphere', .16 * sd, .98, 0, r, 0, 0, 0, -.5, .1, .14, .14, .08, shade(pm[0], .8), pm[1]); p('cap', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.74, .0, .27, .05, .29, shade(shc, .75), shm); p('rbox', .16 * sd, .98, 0, r * 1.25, 0, 0, 0, -.97, .3, .16, .06, .1, shade(bm ? bm[0] : dkLeather, .7), bm ? bm[1] : 0);
    if (bm) p('cap', .17 * sd, .95, 0, r * 1.25, 0, 0, 0, -.5, .02, .25, .07, .27, tr(g.boots)[0], 4, tr(g.boots)[1]);
    if (g.pants && g.pants[0] !== 0) p('rbox', .16 * sd, .98, 0, r, 0, 0, sd * .145, -.3, 0, .018, .44, .1, trim, 0, te * .3); if (g.pants) { p('sphere', .17 * sd, .95, 0, r * 1.1, 0, 0, 0, -.46, .1, .2, .18, .2, pm[0], pm[1]); if (g.pants[0] === 0) p('rbox', .2 * sd, 1.0, .02, .06 + sd * lg * .4, 0, -sd * .12, 0, -.2, .14, .24, .36, .06, steelC, 4); else p('rbox', .16 * sd, .98, -.02, .16 + mv * .25, 0, 0, 0, -.3, -.2, .16, .5, .04, cloth); }
  }
  }
  const hp = (gm2, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, m, e) => p(gm2, px * .84, 1.82 + (py - 1.8) * .84, pz * .84, rx, ry, rz, ox * .84, oy * .84, oz * .84, sx * .84, sy * .84, sz * .84, c, m, e);
  let lean = .06, rx = -lg * .7, ry = 0, lrx = lg * .6 - .2, lry = 0, drw = -1;
  if (AP && AW > .01) { const m = (a, b) => a + (b - a) * AW; rx = m(rx, AP.rx); ry = m(ry, AP.ry); lrx = m(lrx, AP.lrx); lry = m(lry, AP.lry); lean = m(lean, AP.lean); if (o.act) drw = AP.drw; }
  if (false) { const k = o.swing, e = k < .42 ? k / .42 : 1; lean = .28 * Math.sin(k * Math.PI); if (wt === 'bow') { drw = k < .42 ? k / .42 : 0; const pull = k < .42 ? drw : 1; rx = -1.57; ry = -1.0 - pull * .45; lrx = -1.57; lry = .36; lean = .03; } else if (ranged) { rx = -1.55; lrx = -1.5; lean = .05; } else if (o.act.sk.type === 'nova') rx = -3 + e * 2.6; else if (wt === 'fist' || wt === 'none') { rx = -1.5 + Math.sin(k * 6.28) * .5; lrx = -1.5 - Math.sin(k * 6.28) * .5; } else { rx = -1.5; ry = 1.3 - e * 2.6; } }
  if (spin) { rx = -1.5; ry = .3; lrx = -1.5; } if (o.dash) rx = -2.8;
  lean += Math.min(1, mv) * .12; if (o.hurt > 0) { lean -= Math.min(.3, o.hurt) * 1.3; rx -= o.hurt * 2; lrx -= o.hurt * 2; }
  if (o.dead) { rx = lrx = -2.6; }
  if (!MDL) {
  // torso, belt
  p('torso', 0, 1.36, 0, lean, 0, 0, 0, .07, 0, .84, .74, .52, ac, am); /* build 0037: one sculpted torso: chest, ribs, waist and shoulder slope */ p('cap', 0, 1.76, 0, lean, 0, 0, 0, 0, 0, .3, .07, .28, g.chest ? trim : shade(ac, .8), g.chest ? 4 : 0, g.chest ? te * .5 : 0); p('sphere', 0, 1.06, 0, lean, 0, 0, 0, 0, 0, .6, .34, .42, g.pants && !L.robe ? pm[0] : ac, g.pants && !L.robe ? pm[1] : am); if (!L.robe) p('cap', 0, .98, 0, lean, 0, 0, 0, -.12, 0, .6, .32, .44, g.pants ? pm[0] : under, g.pants ? pm[1] : 0);
  /* build 0038: plate chests come with a chainmail skirt and steel tassets that swing with the legs; leather chests get leather flaps */
  if (g.chest && !L.robe) { if (plate) { p('skirt', 0, .87, 0, lean * .4, 0, 0, 0, 0, 0, .72, .34, .56, steelC, 10); }
    for (const sd of [1, -1]) { const sw = .1 + sd * lg * .35 + air * .2; if (plate) { p('rbox', .17 * sd, 1.04, .25, sw + .12, 0, -sd * .14, 0, -.17, .02, .22, .34, .045, steelC, 4); p('rbox', .17 * sd, 1.04, .25, sw + .12, 0, -sd * .14, 0, -.33, .03, .23, .03, .05, trim, 4, te); } else { p('rbox', .17 * sd, 1.04, .23, sw + .1, 0, -sd * .12, 0, -.15, .02, .2, .28, .035, g.chest[0] === 2 ? under : dkLeather); p('rbox', .17 * sd, 1.04, .23, sw + .1, 0, -sd * .12, 0, -.29, .03, .2, .02, .04, trim, 0, te * .5); } } }
  if (g.chest && g.chest[1] >= 2) for (const sd of [1, -1]) plate ? rune(sd > 0 ? 1 : 3, 0, 1.5, .14, lean, 0, .12 * sd, .03, .13, false, trim, runeE(g.chest[1])) : rune(sd > 0 ? 1 : 3, 0, 1.36, 0, lean, 0, .17 * sd, .25, .21, false, trim, runeE(g.chest[1]));
  if (plate) { p('sphere', 0, 1.5, .14, lean, 0, 0, 0, 0, 0, .5, .44, .3, ac, 4); p('cap', 0, 1.74, 0, lean, 0, 0, 0, 0, 0, .34, .1, .34, ac, 4); p('rbox', 0, 1.18, .24, lean, 0, 0, 0, 0, 0, .34, .2, .05, shade(ac, .6), 4); }
  else if (g.chest) { p('rbox', 0, 1.3, .22, lean, 0, 0, 0, 0, 0, .14, .5, .06, trim, 0, te); if (L.robe) p('taper', 0, 1.62, 0, lean, 0, 0, 0, 0, 0, .98, .26, .7, shade(ac, 1.2)); }
  if (g.chest) p('rbox', 0, 1.46, .26, lean, 0, 0, 0, 0, 0, .5, .05, .04, trim, 4, te);
  if (g.chest && g.chest[1] >= 2) { const cw = Math.sin((o.walk || 0) * .9) * .06 + (o.mv || (o.moving) ? .28 : .05); p('rbox', 0, 1.66, -.2, lean * .4 + cw, 0, 0, 0, -.5, -.03, .62, 1.0, .035, shade(trim, .55), 0, te * .3); p('rbox', 0, 1.66, -.2, lean * .4 + cw, 0, 0, 0, -.99, -.035, .64, .06, .04, trim, 4, te); } // rare and better chests come with a cape
  if (g.belt) { const bt = tr(g.belt); p('rbox', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .56, .16, .4, g.belt[0] === 0 ? dkLeather : cloth); p('rbox', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .18, .16, .06, bt[0], 4, bt[1]); } else { p('rbox', 0, 1.0, 0, lean, 0, 0, 0, 0, 0, .52, .08, .4, dkLeather); p('rbox', 0, 1.0, .2, lean, 0, 0, 0, 0, 0, .1, .09, .03, gold, 4); }
  if (!L.robe) for (const sd of [1, -1]) { p('rbox', .25 * sd, .96, .1, lean, 0, sd * .3, 0, 0, 0, .12, .14, .08, leatherC); p('rbox', .25 * sd, 1.02, .12, lean, 0, sd * .3, 0, 0, 0, .13, .04, .09, shade(leatherC, .8)); }
  if (cls === 'ranger' || cls === 'warden') p('rbox', 0, 1.36, .23, lean, 0, 0, cls === 'ranger' ? .62 : -.62, 0, 0, .09, .82, .03, cls === 'ranger' ? dkLeather : shade(dkLeather, .9)); // shoulder strap across the chest
  { /* build 0033: outfit patterns. The chest material sets the base (plate seams and rivets, leather stitching, cloth bands) and each hero adds a motif of their own */
    const pc = CLASS_COL[cls] ? col(CLASS_COL[cls]) : trim, brass = col(0x9a7a3a), dk = shade(ac, .55), cmK = g.chest ? g.chest[0] : -1;
    if (cmK === 0) { for (const y of [1.22, 1.4]) p('cap', 0, y, 0, lean, 0, 0, 0, 0, 0, .75, .022, .47, dk, 4); for (const sd of [1, -1]) for (const y of [1.25, 1.43]) p('sphere', .3 * sd, y, .17, lean, 0, 0, 0, 0, 0, .035, .035, .035, brass, 4); }
    else if (cmK === 1 || (!g.chest && !L.robe)) { for (const sd of [1, -1]) { p('rbox', .13 * sd, 1.34, .232, lean, 0, 0, 0, 0, 0, .014, .5, .02, dk); for (let k = 0; k < 4; k++) p('sphere', .13 * sd, 1.16 + k * .12, .24, lean, 0, 0, 0, 0, 0, .022, .022, .022, brass, 4); } }
    else if (!L.robe) for (const y of [1.18, 1.52]) p('cap', 0, y, 0, lean, 0, 0, 0, 0, 0, .78, .03, .48, shade(pc, .8));
    if (cls === 'warden') { for (const sd of [1, -1]) p('rbox', .05 * sd, 1.2, .278, lean, 0, 0, sd * .75, 0, 0, .028, .17, .02, gold, 4); p('sphere', 0, 1.33, .276, lean, 0, 0, 0, 0, 0, .05, .05, .02, gold, 4); }
    else if (cls === 'ranger') for (let k = 0; k < 4; k++) for (const sd of [1, -1]) p('rbox', 0, 1.5 - k * .08, .238, lean, 0, 0, sd * .8, 0, 0, .012, .085, .02, col(0xc8a878));
    else if (cls === 'arcanist') { for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; p('rbox', Math.sin(a) * .41, .3, Math.cos(a) * .38, 0, a, 0, 0, 0, 0, .05, .05, .02, pc, 0, .9); } for (const y of [.55, .8]) p('cap', 0, y, 0, 0, 0, 0, 0, 0, 0, y > .6 ? .72 : .78, .02, y > .6 ? .64 : .7, shade(pc, .7), 0, .3); }
    else if (cls === 'elementalist') { for (let k = 0; k < 3; k++) p('rbox', 0, 1.2 + k * .13, .25, lean, 0, 0, .785, 0, 0, .06, .06, .02, col(k === 1 ? 0xffb050 : 0xe0602a), 0, .6); for (let k = 0; k < 3; k++) p('rbox', 0, .9 - k * .22, .37 + k * .02, .12, 0, 0, .785, 0, 0, .07, .07, .02, col(0xe0702a), 0, .5); }
    else if (cls === 'brawler') for (const sd of [1, -1]) for (let k = 0; k < 3; k++) p('rbox', .2 * sd, 1.5 - k * .1, .215, lean, 0, 0, sd * (.5 + k * .15), 0, 0, .14, .022, .02, shade(skin, .45));
  }
  if (g.amulet) { const at = tr(g.amulet); p('gem', 0, 1.6, .3, lean, G.time, 0, 0, 0, 0, .1, .14, .08, at[0], 0, 1.2); }
  // head (drawn a little smaller than the body so the proportions read as human)
  // (hp is defined above the body so the class looks further down can use it)
  p('cap', 0, 1.8, 0, lean, 0, 0, 0, 0, 0, .15, .16, .15, skin); hp('head', 0, 2.0, 0, lean, 0, 0, 0, 0, 0, .36, .45, .44, skin); /* build 0037: one sculpted head with jaw, chin and cheekbones */
  const hb = g.helm ? g.helm[0] : -1, ht = tr(g.helm);
  if (hb === 0) { hp('sphere', 0, 2.04, -.07, lean, 0, 0, 0, 0, 0, .43, .42, .36, steelC, 4); hp('sphere', 0, 2.12, -.03, lean, 0, 0, 0, 0, 0, .45, .3, .46, steelC, 4); hp('rbox', 0, 2.13, .2, lean, 0, 0, 0, 0, 0, .3, .05, .05, ht[0], 4, ht[1]); hp('cone', 0, 2.34, -.08, lean - .5, 0, 0, 0, .1, 0, .1, .5, .16, cloth); for (const sd of [1, -1]) { hp('rbox', .17 * sd, 1.92, .12, lean, 0, 0, 0, 0, 0, .06, .22, .16, steelC, 4); if (g.helm[1] >= 1) hp('cone', .2 * sd, 2.22, -.04, lean, 0, -sd * .8, 0, .12, 0, .09, .2 + g.helm[1] * .08, .09, ht[0], 4, ht[1]); } }
  else if (hb === 1) { /* build 0038: a draped cowl that falls onto the shoulders, with a deep shadowed opening, a hem and a clasp */ hp('hood', 0, 2.0, 0, lean, 0, 0, 0, 0, 0, 1, 1, 1, cloth); hp('cap', 0, 1.62, .02, lean, 0, 0, 0, 0, 0, .98, .03, .76, ht[0], 4, ht[1]); hp('gem', 0, 1.73, .25, lean, 0, 0, 0, 0, 0, .07, .08, .05, ht[0], 0, ht[1] + .4); }
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
  if (sm) { const st = tr(g.shoulders), big = g.shoulders[0] === 0; for (const sd of [1, -1]) { p('sphere', .47 * sd, 1.7, 0, 0, 0, 0, 0, 0, 0, big ? .44 : .34, big ? .36 : .26, big ? .44 : .36, sm[0], sm[1]); p('cap', .47 * sd, 1.64, 0, 0, 0, 0, 0, 0, 0, big ? .48 : .38, .05, big ? .48 : .38, st[0], 4, st[1]); if (big && g.shoulders[1] >= 1) p('cone', .56 * sd, 1.84, 0, 0, 0, -sd * .9, 0, .12, 0, .16, .2 + g.shoulders[1] * .08, .16, sm[0], 4);
      /* build 0038: layered plates (lames) step down the upper arm, each with a trimmed edge; leather pads get one stitched layer */
      if (big) { p('cap', .55 * sd, 1.56, 0, 0, 0, -sd * .42, 0, 0, 0, .4, .13, .42, sm[0], 4); p('cap', .55 * sd, 1.555, 0, 0, 0, -sd * .42, 0, -.005, 0, .42, .02, .44, st[0], 4, st[1]); p('cap', .6 * sd, 1.45, 0, 0, 0, -sd * .6, 0, 0, 0, .33, .11, .35, shade(sm[0], .92), 4); p('cap', .6 * sd, 1.445, 0, 0, 0, -sd * .6, 0, -.005, 0, .35, .02, .37, st[0], 4, st[1]); for (const z of [-.13, .13]) p('sphere', .63 * sd, 1.62, z, 0, 0, 0, 0, 0, 0, .04, .04, .04, gold, 4); }
      else { p('cap', .53 * sd, 1.55, 0, 0, 0, -sd * .4, 0, 0, 0, .32, .1, .34, shade(sm[0], .85), sm[1]); p('cap', .53 * sd, 1.545, 0, 0, 0, -sd * .4, 0, -.005, 0, .34, .015, .36, col(0xd8c8a0), 0); }
      if (g.shoulders[1] >= 2) rune(sd > 0 ? 0 : 2, .675 * sd, 1.68, 0, 0, sd * 1.5708, 0, 0, 0, false, st[0], runeE(g.shoulders[1])); } }
  else for (const sd of [1, -1]) p('sphere', .45 * sd, 1.66, 0, 0, 0, sd * .2, 0, 0, 0, .24, .2, .26, shade(ac, .95), am);
  // arms: sleeve, bracer, hand
  for (const sd of [1, -1]) {
    const arx = sd > 0 ? rx : lrx, ary = sd > 0 ? ry : lry, px = .47 * sd;
    const slv = shade(ac, g.chest ? .8 : .92); p('uarm', px, 1.62, 0, arx, ary, 0, 0, -.19, 0, .23, .42, .23, slv, am); p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .17, .17, .17, slv, am);
    p('farm', px, 1.62, 0, arx, ary, 0, 0, -.51, 0, brm ? .22 : .18, .32, brm ? .22 : .18, brm ? brm[0] : skin, brm ? brm[1] : 0); if (brm) p('cap', px, 1.62, 0, arx, ary, 0, 0, -.36, 0, .22, .05, .22, tr(g.bracers)[0], 4, tr(g.bracers)[1]);
    const fist = wt === 'fist'; p('sphere', px, 1.62, 0, arx, ary, 0, 0, -.68, 0, fist ? .25 : .15, fist ? .25 : .2, fist ? .25 : .13, fist ? dkLeather : gm ? gm[0] : skin, gm ? gm[1] : 0); if (!fist) p('sphere', px, 1.62, 0, arx, ary, 0, -sd * .07, -.66, .04, .06, .12, .06, gm ? gm[0] : skin, gm ? gm[1] : 0);
    if (!fist) { const hc = gm ? gm[0] : skin, hm = gm ? gm[1] : 0; for (let k = 0; k < 4; k++) { const fx = (k - 1.5) * .036; p('rbox', px, 1.62, 0, arx, ary, 0, fx, -.79 + Math.abs(k - 1.5) * .014, .025, .029, .11 - Math.abs(k - 1.5) * .018, .033, hc, hm); p('sphere', px, 1.62, 0, arx, ary, 0, fx, -.735, .045, .026, .02, .02, shade(hc, .85), hm); } } /* build 0033: four fingers with knuckles (the thumb is the small sphere above) */
    if (cls === 'brawler') for (const y of [-.47, -.53, -.59]) p('cap', px, 1.62, 0, arx, ary, 0, 0, y, 0, .2, .03, .2, col(0xe8e0cc));
    if (fist) for (let k = 0; k < 3; k++) p('cone', px, 1.62, 0, arx + 1.5708, ary, 0, (k - 1) * .08, .1, .68, .06, .14, .06, wglow || steelC, 4, wglow ? .8 : 0);
  }
  } // end of the code-built body (build 0039: skipped when a real model is drawn)
  // off-hand
  const MOH = MDL && g.offhand ? (cls === 'warden' ? MDL.arm(-1, lg * .6 - .5, 0) && 2 : (cls === 'ranger' || cls === 'elementalist' || cls === 'brawler') ? MDL.back() && 2 : 1) : 0;
  if (g.offhand && (!MDL || MOH)) { const ot = tr(g.offhand);
    if (cls === 'warden') { GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .17, .2, .8, .06, .8, leatherC, em, 1, 7); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .2, .2, .86, .03, .86, steelC, em, 1, 4); GLX.part('dyn', 'cyl', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .21, .2, .62, .02, .62, cloth, em, 1, 6); GLX.part('dyn', 'sphere', BM, -.47, 1.62, 0, lg * .6 - .5, 0, 1.5708, -.5, .24, .2, .26, .12, .26, ot[0], em + ot[1], 1, 4); }
    else if (cls === 'ranger') { p('rbox', .1, 1.5, -.3, lean + .3, 0, .4, 0, 0, 0, .2, .7, .16, leatherC); for (let k = 0; k < 3; k++) p('rbox', .22 + k * .05, 1.95, -.36, lean + .3, 0, .4, 0, 0, 0, .03, .3, .03, k === 1 ? ot[0] : wood); }
    else if (cls === 'elementalist') { p('rbox', -.34, 1.0, .1, lean, .3, 0, 0, 0, 0, .12, .34, .28, dkLeather); p('rbox', -.41, 1.0, .1, lean, .3, 0, 0, 0, 0, .02, .16, .12, ot[0], 4, ot[1]); }
    else if (cls === 'brawler') { for (let k = 0; k < 7; k++) { const a = -1.2 + k * .4; p('sphere', Math.sin(a) * .26, 1.72 - Math.cos(a) * .1, .2 + Math.cos(a) * .06, lean, 0, 0, 0, 0, 0, .09, .09, .09, ot[0], 0, ot[1]); } }
    else { const a = G.time * 1.3, oc2 = col(L.orb || TRIMC[g.offhand[1]]); GLX.obj('glow', 'sphere', o.x + Math.cos(a) * 1.1, o.y + 2.2 + Math.sin(a * 2) * .15, o.z + Math.sin(a) * 1.1, 0, .34, .34, .34, oc2, 1.4, 1); GLX.halo(o.x + Math.cos(a) * 1.1, o.y + 2.2, o.z + Math.sin(a) * 1.1, 1.4, oc2, .5); }
  }
  if (MOH === 2) MDL.done();
  // weapon
  const MSW = MDL && !MDL.bow && wt !== 'fist' && wt !== 'none' && !o.dead ? MDL.arm(1, rx, ry) : false; /* build 0042: the old weapon shapes, carried by the model's right hand */
  if (MDL && (MDL.bow || o.dead || wt === 'fist' || wt === 'none')) { try { MDL.weapon(); } catch (e) { } if (wt === 'fist' && !o.dead) for (const sd of [1, -1]) if (MDL.arm(sd, 0, 0)) { for (let k = 0; k < 3; k++) p('cone', .47 * sd, 1.62, 0, 1.5708, 0, 0, (k - 1) * .08, .1, .68, .06, .14, .06, wglow || steelC, 4, wglow ? .8 : 0); p('sphere', .47 * sd, 1.62, 0, 0, 0, 0, 0, -.68, 0, .2, .2, .2, dkLeather, 7); MDL.done(); } }
  else if (MDL && !MSW) { }
  else if (wt === 'sword') { /* build 0024: a broadsword that reads from the game camera */ if (wr >= 2) for (let k = 0; k < 3; k++) for (const f of [1, -1]) rune(k + (f > 0 ? 0 : 1), .47, 1.62, 0, rx, ry, 0, -.66 + .03 * f, .5 + k * .32, true, wglow, runeE(wr)); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .9, .21, .05, 1.5, blade, 4, .22); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .84, .06, .07, 1.22, shade(blade, .62), 4); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.72, .13, .05, .2, blade, 4, .22); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.86, .06, .045, .14, col(0xeef2f8), 4, .45); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .12, .58, .09, .11, gold, 4); p('sphere', .47, 1.62, 0, rx, ry, 0, .29, -.66, .12, .08, .08, .08, gold, 4); p('sphere', .47, 1.62, 0, rx, ry, 0, -.29, -.66, .12, .08, .08, .08, gold, 4); p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, -.04, .66, .07, .3, .07, dkLeather); if (wglow) p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, .9, .23, .03, 1.52, wglow, 0, .55); }
  else if (wt === 'axe' || wt === 'maul') { p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, .5, .66, .08, 1.9, .08, wood, 3); if (wt === 'axe') { p('rbox', .47, 1.62, 0, rx, ry, 0, .2, -.66, 1.3, .44, .05, .44, blade, 4, .2); if (wr >= 2) for (const f of [1, -1]) rune(f > 0 ? 0 : 2, .47, 1.62, 0, rx, ry, .2, -.66 + .03 * f, 1.3, true, wglow, runeE(wr)); p('rbox', .47, 1.62, 0, rx, ry, 0, .44, -.66, 1.3, .06, .04, .6, wglow || col(0xeef2f8), 4, wglow ? .8 : .4); } else { p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .62, .36, .42, steelC, 4); p('rbox', .47, 1.62, 0, rx, ry, 0, 0, -.66, 1.36, .66, .12, .46, wglow || gold, 4, wglow ? .8 : 0); } }
  else if (wt === 'staff') {
    const len = wb === 4 ? 1.0 : 2.1, tip = wb === 4 ? .86 : 1.4; p('cap', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, wb === 4 ? .36 : .25, .64, .07, len, .07, wood, 3); const oc = wglow || col(L.orb || 0x9ad0ff), act = o.act ? 1.6 : 1; p('gem', .47, 1.62, 0, rx + 1.5708, ry, 0, 0, tip, .64, .26 * act, .32 * act, .26 * act, oc, 0, 2.2);
    const cr = Math.cos(rot), sr2 = Math.sin(rot), a1 = rx + 1.5708, oy = Math.cos(a1) * tip - Math.sin(a1) * .64, oz = Math.sin(a1) * tip + Math.cos(a1) * .64, wx = o.x + cr * .5 + sr2 * oz, wz = o.z - sr2 * .5 + cr * oz, wy = o.y + 1.75 + oy, WP = MSW ? m4mul(MT1, BM, m4rig(MT1, .47, 1.62, 0, a1, ry, 0, 0, tip, .64)) : null; if (WP) GLX.halo(WP[12], WP[13], WP[14], 1.5 * act, oc, .6); else GLX.halo(wx, wy, wz, 1.5 * act, oc, .6); if (self) GLX.light(wx, wy, wz, 6, oc, .7, 3);
  } else if (wt === 'bow') {
    const bc = wglow || wood, be = wglow ? .6 : 0, strC = col(0xe8e0d0);
    if (drw < 0) { p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -.2, .7, .05, .7, .06, bc, 3, be); p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -1.0, .64, .05, .7, .06, bc, 3, be); p('rbox', -.47, 1.62, 0, lrx, 0, 0, 0, -.62, .5, .015, 1.5, .015, strC); }
    else {   // aiming: bow upright in the left hand, string drawn back to the cheek, arrow nocked until release
      const X = -.2, Y = 1.62, Z = .78, az = Z - .14 - drw * .55, tz = Z - .2;
      p('rbox', X, Y, Z, 0, 0, 0, 0, 0, 0, .07, .3, .08, col(0x4a3524)); for (const sd of [1, -1]) { p('rbox', X, Y + sd * .38, Z - .01, -sd * .08, 0, 0, 0, 0, 0, .05, .5, .06, bc, 3, be); p('rbox', X, Y + sd * .8, Z - .09, -sd * .38, 0, 0, 0, 0, 0, .045, .42, .05, bc, 3, be); const dz = tz - az, len = Math.hypot(.98, dz); p('rbox', X, Y + sd * .49, az + dz / 2, sd * Math.atan2(dz, .98), 0, 0, 0, 0, 0, .014, len, .014, strC); }
      if (drw > 0) { p('rbox', X, Y, az + .6, 0, 0, 0, 0, 0, 0, .025, .025, 1.2, col(0xb89a6a)); p('cone', X, Y, az + 1.24, 1.5708, 0, 0, 0, 0, 0, .07, .14, .07, col(0xc8ced8), 4); for (const a of [0, 1.5708]) p('rbox', X, Y, az + .06, 0, 0, a, 0, 0, 0, .1, .012, .16, col(0xd8d0c0)); }
    }
  }
  if (MSW) MDL.done();
  if (L.robe) for (let k = 0; k < 3; k++) { const a = G.time * 1.6 + k * 2.09; GLX.obj('glow', 'gem', o.x + Math.cos(a) * .95, o.y + 1.5 + Math.sin(a * 1.7) * .25, o.z + Math.sin(a) * .95, a, .12, .2, .12, col(L.orb), 1.5, .9); }
  if (cls === 'brawler') for (const sd of [1, -1]) p('rbox', .2 * sd, 1.0, -.2, lean + .3 + mv * .4 + sw2, 0, 0, 0, -.34, 0, .12, .6, .03, cloth);
  if (L.cape && !MDL) { p('rbox', 0, 1.66, -.28, lean + .12 + mv * .3 + sw2, 0, 0, 0, -.36, 0, .78, .74, .05, cloth); p('rbox', 0, 1.66, -.28, lean + .22 + mv * .5 + sw2 * 2, 0, 0, 0, -1.0, -.06, .84, .62, .04, shade(cloth, .8)); p('rbox', 0, 1.7, -.26, lean, 0, 0, 0, 0, 0, .7, .08, .1, trim, 4, te); }

  // ---- class signature look (build 0016): silhouette, class colour, moving cloth, aura, rarity glow ----
  { const CC = col(CLASS_COL[cls] || 0xd8a040), t = G.time, sway = Math.sin(t * 2.6 + o.x) * .08 + Math.min(1, mv) * .35, cr = Math.cos(rot), sr = Math.sin(rot);
    const hand = MDL ? sd => MDL.handW(sd) : (sd, arx) => { const lx = .47 * sd * 1.08, ly = (1.62 - .68 * Math.cos(arx)) * 1.08, lz = -.68 * Math.sin(arx) * 1.08; return [o.x + cr * lx + sr * lz, o.y + ly, o.z - sr * lx + cr * lz]; };
    const HERO = !!CLASS_COL[cls]; if (HERO && !MDL) p('rbox', 0, 1.12, .25, lean, 0, 0, 0, -.18, 0, .2, .56, .04, shade(CC, .3)); // tabard in the class colour (plain material: the rock/bark one bends thin parts)
    if (HERO && !MDL) p('rbox', 0, 1.12, .27, lean, 0, 0, 0, .06, 0, .08, .08, .03, shade(CC, .75), 4);
    if (MDL) { // build 0042: class headgear and back pieces on the real model, carried by its head and spine
      const hc = cloth;
      if (cls === 'warden') { if (MDL.head()) { p('sphere', 0, 2.08, -.01, 0, 0, 0, 0, 0, 0, .37, .35, .39, steelC, 4); p('cap', 0, 1.99, 0, 0, 0, 0, 0, 0, 0, .42, .04, .44, shade(steelC, .8), 4); p('rbox', 0, 2.0, .19, 0, 0, 0, 0, 0, 0, .04, .15, .03, steelC, 4); p('rbox', 0, 2.27, -.02, 0, 0, 0, 0, 0, 0, .04, .1, .36, CC, 0, .1); for (const sd of [1, -1]) p('cone', .15 * sd, 2.2, -.02, 0, 0, -sd * 1.1, 0, .1, 0, .05, .26, .05, col(0xe8dcc0), 3); MDL.done(); }
        if (!g.offhand && MDL.back()) { p('rbox', 0, 1.35, -.3, 0, 0, 0, 0, 0, 0, .62, .8, .06, steelC, 4); p('rbox', 0, 1.35, -.34, 0, 0, 0, 0, 0, 0, .46, .64, .03, CC, 0, .1); MDL.done(); } }
      else if (cls === 'ranger') { if (!g.offhand && MDL.back()) { p('rbox', .1, 1.5, -.26, .3, 0, .4, 0, 0, 0, .16, .56, .13, leatherC); for (let k = 0; k < 3; k++) p('rbox', .2 + k * .04, 1.86, -.31, .3, 0, .4, 0, 0, 0, .025, .24, .025, k === 1 ? CC : wood); MDL.done(); } }
      else if (cls === 'arcanist') { if (!g.helm && MDL.head()) { p('cap', 0, 2.14, 0, 0, 0, 0, 0, 0, 0, .52, .04, .52, hc); p('cone', 0, 2.16, -.02, -.15 - sway * .3, 0, 0, 0, .3, 0, .26, .62, .26, hc); p('cap', 0, 2.17, 0, 0, 0, 0, 0, 0, 0, .3, .05, .3, CC, 0, .6); MDL.done(); }
        if (!g.offhand) { const a = t * 1.3, x = o.x + Math.cos(a) * .9, z = o.z + Math.sin(a) * .9, y = o.y + 2.1 + Math.sin(a * 2) * .15; GLX.obj('glow', 'sphere', x, y, z, 0, .18, .18, .18, CC, 1.2, .9); GLX.halo(x, y, z, .55, CC, .22); } }
      else if (cls === 'brawler') { if (MDL.head()) { p('cap', 0, 2.1, 0, 0, 0, 0, 0, 0, 0, .37, .05, .39, CC); p('rbox', 0, 2.08, -.2, .4 + sway * .5, 0, 0, 0, -.12, 0, .06, .24, .02, CC); MDL.done(); }
        if (MDL.back()) { p('cap', 0, 1.0, .02, 0, 0, 0, 0, 0, 0, .56, .08, .4, CC, 0, .05); p('rbox', .2, .96, .16, .1 + sway, 0, -.2, 0, -.26, 0, .1, .42, .03, CC); MDL.done(); } }
      else if (cls === 'elementalist') { for (let k = 0; k < 5; k++) { const a = t * .9 + k * 1.2566, x = o.x + Math.cos(a) * .42, z = o.z + Math.sin(a) * .42, y = o.y + 2.45 + Math.sin(t * 2 + k) * .06; GLX.obj('glow', 'gem', x, y, z, a, .08, .14, .08, k % 2 ? CC : col(0xffd06a), 1.6, .95); }
        for (const sd of [1, -1]) { const h = hand(sd); GLX.obj('glow', 'sphere', h[0], h[1], h[2], 0, .12, .12, .12, CC, 1.6, .7); GLX.halo(h[0], h[1], h[2], .5, CC, .28); } }
    } else if (cls === 'warden') {
      for (const sd of [1, -1]) { p('sphere', .5 * sd, 1.76, 0, 0, 0, -sd * .25, 0, 0, 0, .42, .24, .42, shade(steelC, .7), 4); p('cap', .5 * sd, 1.7, 0, 0, 0, -sd * .25, 0, 0, 0, .45, .04, .45, shade(CC, .7), 4); hp('cone', .2 * sd, 2.28, -.02, lean, 0, -sd * 1.1, 0, .14, 0, .07, .34, .07, col(0xe8dcc0), 3); }
      if (!g.offhand) { p('rbox', 0, 1.35, -.34, lean * .5, 0, 0, 0, 0, 0, .78, 1.0, .07, steelC, 4); p('rbox', 0, 1.35, -.38, lean * .5, 0, 0, 0, 0, 0, .58, .8, .03, CC, 0, .1); }
    } else if (cls === 'ranger' && !MDL) {
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
    if (L.robe && !MDL) for (const sd of [1, -1]) p('rbox', .22 * sd, .5, -.28, sway * .6 + Math.sin(t * 3.1 + sd) * .05, 0, 0, 0, -.35, 0, .26, .7, .03, shade(ac, .85), am); // robe tails
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
  if (self) { const th = G.zone.th, t = G.time, tk = 1.1 * (th.torchI || 1) * fireFl(t, 0); /* build 0052: the torch flickers; in crypts and the void it is the light that throws shadows */
    if (th.torchSh && !G.inTown && GLX.env.shadows !== false) { const c = col(th.torch), E = GLX.env; E.pt = [o.x + Math.sin(t * 9.3) * .08, 5.2, o.z + 1.2 + Math.cos(t * 11.1) * .08, 2.55]; E.ptc = [c[0] * tk, c[1] * tk, c[2] * tk]; E.ptr = 17; }
    else GLX.light(o.x, 3, o.z, 15, col(th.torch), tk, 10); }
  if (spin) { for (let i = 0; i < 3; i++) { const a = G.time * 20 + i * 2.09; GLX.obj('glow', 'box', o.x + Math.sin(a) * 2.2, 1.2, o.z + Math.cos(a) * 2.2, a + 1.57, .16, .1, 3, col(0xfff0d0), 1, .7); } GLX.obj('glow', 'ring', o.x, .1, o.z, 0, o.spin.sk.r * 2, 1, o.spin.sk.r * 2, col(0xfff0d0), 1, .25, -1); }
  if (o.buffs && o.buffs.length) GLX.obj('glow', 'ring', o.x, .08, o.z, G.time, 2.4, 1, 2.4, col(0xffd84a), 1, .5, -1);
  if (o.flaskT > 0) GLX.halo(o.x, 1.4, o.z, 3.5, col(0xff3a3a), .5);
}
function tiltBase(o, ry, s, t) { /* build 0048: lean the whole body back by t radians around its own side axis */ const c = Math.cos(ry), sn = Math.sin(ry), ct = Math.cos(t), st = Math.sin(t); o[4] = st * sn * s; o[5] = ct * s; o[6] = st * c * s; o[8] = ct * sn * s; o[9] = -st * s; o[10] = ct * c * s; }
// ---- build 0055: monsters on real models. Risen dead (grunts), hulking risen (brutes) and hooded cultists (casters) are the free CC0
// Quaternius base body and outfits, dyed per floor theme with glowing eyes, on the shared animation file. Far away, or if a model
// has not loaded, the code-built monster is drawn instead ----
const MON_MDL = { grunt: 'risen', brute: 'risen', caster: 'cultist' }, MON_FAR = 30, MHAND = new Float32Array(16);
function hexMix(a, b, t) { const c = k => Math.round(((a >> k) & 255) * (1 - t) + ((b >> k) & 255) * t); return (c(16) << 16) | (c(8) << 8) | c(0); }
function monModel(e, sc, y, tilt, ox, oz, em, wind, at) {
  const nm = MON_MDL[e.arch]; if (!nm || e.boss || e.dummy || !MODELS_ON || !GLX.model || G.realModels === false || G.monModels === false) return false;
  if (Math.hypot(e.x - P.x, e.z - P.z) > MON_FAR || (G._mN = (G._mN || 0) + 1) > 24) return false; // at most 24 model monsters a frame keeps big packs smooth on phones
  const M = GLX.model(nm, 'models/' + nm + '.cdm?v=' + BUILD); if (!M || !M.anims || !M.anims.idle) return false;
  if (!e.alive) { sc = e.sc; tilt = 0; y = (e.fly ? e.fly.y : 0) - Math.max(0, 1 - e.deadT / .3) * .9; } // the death animation does the falling; at the very end the body sinks away
  const A = M.anims, t = G.time, md = e.md, cast = e.arch === 'caster', brute = e.arch === 'brute', s = sc * MSC * (brute ? .95 : cast ? 1.02 : .98), up = UPMASK[nm] || (UPMASK[nm] = CDM.mask(M, ['spine_02'], 0)), lay = [];
  const moved = Math.abs((e.walk || 0) - (e._mw === undefined ? e.walk : e._mw)); e._mw = e.walk; e._mv = (e._mv || 0) + ((moved > .001 ? 1 : 0) - (e._mv || 0)) * .2; const mv = e.alive ? clamp(e._mv, 0, 1) : 0;
  if (!e.alive) { if (e._dT0 === undefined) e._dT0 = t; lay.push(['die', Math.min(A.die.dur * .92, (t - e._dT0) * 2.6), false, 1]); }
  else { e._dT0 = undefined; const gait = brute || cast ? 'walk' : 'crouch', ph = (e.walk || 0) / 6.2832 * (gait === 'crouch' ? .7 : 1.1), wnd = e.st === 'wind' || e.st === 'hwind' || e.st === 'cwind', act = Math.max(wnd ? 1 : 0, at > 0 ? 1 : 0), bm = e._bm || (e._bm = new Float32Array(up.length));
    for (let b = 0; b < up.length; b++) bm[b] = 1 - act * up[b];
    if (mv < 1) lay.push([cast ? 'spidle' : brute ? 'idle' : 'crouchi', t + e.id * .37, true, 1 - mv, bm]); /* the risen stalk hunched over */ if (mv > 0) lay.push([gait, ph * A[gait].dur, true, mv, bm]);
    if (e.hf > 0 && !act) lay.push(['hit', (.22 - e.hf) * 2.4, false, Math.min(1, e.hf * 6), up]);
    if (act) { const an = cast ? 'cast' : brute ? 'punch' : (e.id & 1 ? 'attack' : 'punch'), D = A[an].dur, strike = cast ? .45 : .38, k = wnd ? strike * clamp(wind, 0, 1) : strike + (1 - strike) * clamp(1 - at, 0, 1); lay.push([an, k * D, false, 1, up]); } }
  GLX.base(BMm, e.x + ox, y - M.head.minY * s, e.z + oz, e.rot, s); if (tilt) tiltBase(BMm, e.rot, s, tilt);
  const ec = GLX.col(md.e), skinC = hexMix(md.c, brute ? 0x464e52 : 0x5a6260, brute ? .82 : .74), clothC = cast ? hexMix(md.c2, 0x2a161a, .6) : hexMix(md.c2, 0x2a2420, .4);
  const look = (gi, gr) => { const k = gr.kind;
    if (k === 'plain') return [[ec[0] * 3, ec[1] * 3, ec[2] * 3], 2.6, 0]; // the eyes burn
    if (k === 'skin') return [mdye(gr, skinC, .95, .72), em, 8];
    if (k === 'hair') return cast ? [mdye(gr, 0x1a1414, .8, 1), em, 9] : null;
    if (k === 'cloth') return [mdye(gr, clothC, .9, .8), em, 6];
    if (k === 'leather') return [mdye(gr, 0x2a201a, .7, 1), em, 7];
    if (k === 'metal') return [mdye(gr, 0x5a5650, .6, 1.1), em, 4];
    return [MLIFT, em, gr.mat]; };
  if (!GLX.drawModel(M, BMm, lay, look)) return false;
  // casters cup a ball of the floor's own magic in their hand while they wind up
  const hand = GLX.attach(M, 'hand_r', MAT); if (hand && e.alive) { m4mul(MHAND, BMm, hand); const hx = MHAND[12], hy = MHAND[13], hz = MHAND[14];
    if (cast) { const r = .16 + wind * .3; GLX.obj('glow', 'sphere', hx, hy, hz, 0, r, r, r, ec, 1 + wind * .8, 1); GLX.halo(hx, hy, hz, .8 + wind * 1.4, ec, .28 + wind * .2); }
  }
  return true;
}
// ---- build 0058: guardians on real models. The armoured champions (Warden of Bones, the Ashen Tyrant) wear the knight's plate, dyed
// to their floor, with a horned helm and a greatsword; the shrouded ones (Hollow Choir, Pale Matriarch, Null) are hooded robes that
// float above a tattered shroud. Other guardian shapes stay code-built ----
const BOSS_MDL = { knight: 'warden', wraith: 'cultist' }, MBH = new Float32Array(16);
function lumHex(h) { return ((h >> 16) & 255) * .3 + ((h >> 8) & 255) * .5 + (h & 255) * .2; }
function bossModel(e, sc, y, tilt, ox, oz, em, wind, at) {
  const S = e.bd && e.bd.shape, nm = BOSS_MDL[S]; if (!nm || !MODELS_ON || !GLX.model || G.realModels === false || G.monModels === false) return false;
  const M = GLX.model(nm, 'models/' + nm + '.cdm?v=' + BUILD); if (!M || !M.anims || !M.anims.idle) return false;
  const col = GLX.col, A = M.anims, t = G.time, md = e.md, kn = S === 'knight', bob = kn ? 0 : Math.sin(t * 1.8) * .18 * sc / 2.3, s = sc * MSC * (kn ? 1.5 : 1.45), up = UPMASK[nm] || (UPMASK[nm] = CDM.mask(M, ['spine_02'], 0)), lay = [];
  if (!e.alive) { sc = e.sc; tilt = 0; y = -Math.max(0, 1 - e.deadT / .45) * 1.2; }
  const moved = Math.abs((e.walk || 0) - (e._mw === undefined ? e.walk : e._mw)); e._mw = e.walk; e._mv = (e._mv || 0) + ((moved > .001 ? 1 : 0) - (e._mv || 0)) * .2; const mv = e.alive ? clamp(e._mv, 0, 1) : 0;
  if (!e.alive) { if (e._dT0 === undefined) e._dT0 = t; lay.push(['die', Math.min(A.die.dur * .92, (t - e._dT0) * 1.6), false, 1]); }
  else { e._dT0 = undefined; const act = Math.max(clamp(wind * 1.4, 0, 1), at > 0 ? 1 : 0), bm = e._bm || (e._bm = new Float32Array(up.length)); for (let b = 0; b < up.length; b++) bm[b] = 1 - act * up[b];
    if (mv < 1 || !kn) lay.push(['idle', t * .8 + e.id * .37, true, kn ? 1 - mv : 1, bm]); if (!kn) lay.push(['spidle', t * .8 + e.id * .37, true, 1, up]); /* the wraith's legs stay still under the shroud */ if (kn && mv > 0) lay.push(['walk', (e.walk || 0) / 6.2832 * .9 * A.walk.dur, true, mv, bm]);
    if (e.hf > 0 && !act) lay.push(['hit', (.22 - e.hf) * 2.4, false, Math.min(1, e.hf * 6) * .6, up]);
    if (act) { const an = kn ? 'attack' : 'cast', D = A[an].dur, strike = kn ? .38 : .45, k = at > 0 ? strike + (1 - strike) * clamp(1 - at, 0, 1) : strike * clamp(wind * 1.2, 0, 1); lay.push([an, k * D, false, 1, up]); } }
  const fy = kn ? 0 : (.35 * sc / 2.3 + bob); GLX.base(BMm, e.x + ox, y + fy - M.head.minY * s, e.z + oz, e.rot, s); if (tilt) tiltBase(BMm, e.rot, s, tilt * .5);
  const ec = col(md.e), dk = lumHex(md.c) < lumHex(md.c2), plate = kn ? hexMix(dk ? md.c : md.c2, 0x3a3a3e, .35) : 0, trim = kn ? (dk ? md.c2 : md.c) : 0, robe = kn ? 0 : hexMix(md.c2, 0x101014, .55), hot = em + (e.alive ? 0 : 0);
  const look = (gi, gr) => { const k = gr.kind;
    if (k === 'plain') return [[ec[0] * 3.5, ec[1] * 3.5, ec[2] * 3.5], 3, 0];
    if (k === 'hair' || k === 'beard' || k === 'hairb') return null;
    if (k === 'skin') return kn ? [mdye(gr, 0x2a2826, .9, .7), hot, 8] : [mdye(gr, 0x0c0a10, .9, .6), hot, 8];
    if (k === 'metal') return [mdye(gr, plate, .55, 1.15), hot, 4];
    if (k === 'leather') return [mdye(gr, kn ? hexMix(trim, 0x2a1e16, .6) : 0x1a1418, .7, 1), hot, 7];
    if (k === 'cloth') return [mdye(gr, kn ? hexMix(trim, 0x241818, .55) : robe, .9, kn ? .85 : 1), hot + (kn ? 0 : .12), 6];
    return [MLIFT, hot, gr.mat]; };
  if (!GLX.drawModel(M, BMm, lay, look)) return false;
  if (!e.alive && e.deadT < .2) return true;
  const fr = (n, o) => { const h = GLX.attach(M, n, MAT); if (!h) return null; return m4mul(o, BMm, h); };
  if (kn) { const steel = col(hexMix(plate, 0xc8ced8, .55)), hb = fr('Head', MBH); if (hb) { const hc = col(hexMix(trim, 0xe8e0c8, .5)); GLX.part('dyn', 'sphere', hb, 0, .1, .03, 0, 0, 0, 0, 0, 0, .26, .31, .3, col(plate), em, 1, 4); GLX.part('dyn', 'rbox', hb, 0, .02, .1, 0, 0, 0, 0, 0, 0, .24, .2, .19, col(plate), em, 1, 4); GLX.part('dyn', 'rbox', hb, 0, .11, .2, 0, 0, 0, 0, 0, 0, .22, .035, .02, col(0x08080a), 0); GLX.part('dyn', 'rbox', hb, 0, .2, .03, 0, 0, 0, 0, 0, 0, .04, .1, .34, hc, em, 1, 4); for (const sd of [1, -1]) { GLX.part('dyn', 'cone', hb, .13 * sd, .2, 0, 0, 0, -sd * 1.05, 0, .12, 0, .05, .26, .05, hc, em, 1, 3); GLX.part('dyn', 'cone', hb, .3 * sd, .3, 0, 0, 0, -sd * .25, 0, .1, 0, .036, .22, .036, hc, em, 1, 3); }
      GLX.part('glow', 'sphere', hb, .06, .11, .215, 0, 0, 0, 0, 0, 0, .03, .016, .01, ec, 3, 1); GLX.part('glow', 'sphere', hb, -.06, .11, .215, 0, 0, 0, 0, 0, 0, .03, .016, .01, ec, 3, 1); }
    const h = fr('hand_r', MBH); if (h) { const gold = col(hexMix(trim, 0xb08a3a, .6)); /* a greatsword: the hand's z axis runs along the blade */ GLX.part('dyn', 'rbox', h, 0, 0, -.02, 0, 0, 0, 0, 0, 0, .045, .045, .3, col(0x2a1e16), em, 1, 7); GLX.part('dyn', 'sphere', h, 0, 0, -.19, 0, 0, 0, 0, 0, 0, .07, .07, .07, gold, em, 1, 4); GLX.part('dyn', 'rbox', h, 0, 0, .14, 0, 0, 0, 0, 0, 0, .06, .36, .05, gold, em, 1, 4); GLX.part('dyn', 'rbox', h, 0, 0, .78, 0, 0, 0, 0, 0, 0, .025, .11, 1.25, steel, em + (at > .2 ? .5 : 0), 1, 4); GLX.part('dyn', 'cone', h, 0, 0, 1.45, 1.5708, 0, 0, 0, 0, 0, .025, .1, .11, steel, em, 1, 4); GLX.part('glow', 'rbox', h, 0, 0, .78, 0, 0, 0, 0, 0, 0, .03, .025, 1.15, ec, 1.2, .6); }
    if (e.alive) GLX.light(e.x, 2.4, e.z, 7, ec, .7, 3); }
  else { const c2 = col(robe), base = e.alive ? 1 : Math.max(0, e.deadT / .45), pv = fr('Head', MBH), hy = pv ? pv[13] * .5 : 3.2 * sc / 2.3, R = .62 * sc / 2.3; /* a tattered shroud hangs from the hips to the ground and hides the legs */
    GLX.obj('dyn', 'cone', e.x, hy * .62, e.z, t * .3, R * 2.5, hy * 1.24, R * 1.9, shade(c2, .7), em, 1, 6); GLX.obj('dyn', 'cyl', e.x, hy * .42, e.z, t * .3, R * 2.05, hy * .84, R * 1.7, shade(c2, .74), em, 1, 6); GLX.obj('dyn', 'cone', e.x, hy * .2, e.z, t * .3, R * 3.2, hy * .4, R * 3, shade(c2, .8), em, 1, 6); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, sw2 = Math.sin(t * 3 + k * 1.3) * .18, L = hy * (.55 + (k % 3) * .12); GLX.part('dyn', 'rbox', IDM, e.x + Math.cos(a) * R * 2.05, L * .5 * base - .05, e.z + Math.sin(a) * R * 1.75, sw2 - .12, -a + 1.5708, 0, 0, 0, 0, .38 * sc / 2.3, L * base, .04, shade(c2, .7 + (k % 3) * .12), em, 1, 6); } GLX.obj('glow', 'disc', e.x, .06, e.z, 0, 2.6 * sc / 2.3, 1, 2.6 * sc / 2.3, ec, .8, .25 * base, 0);
    if (e.alive) { for (let k = 0; k < 5; k++) { const a = t * 1.3 + k * 1.257, r2 = 1.9 * sc / 2.3; GLX.obj('glow', 'sphere', e.x + Math.cos(a) * r2, (1.6 + Math.sin(t * 2 + k) * .4) * sc / 2.3, e.z + Math.sin(a) * r2, 0, .14, .14, .14, ec, 2.4, .9); GLX.halo(e.x + Math.cos(a) * r2, (1.6 + Math.sin(t * 2 + k) * .4) * sc / 2.3, e.z + Math.sin(a) * r2, .8, ec, .35); }
      const h = fr('hand_r', MBH); if (h && wind > .05) { const r = .12 + wind * .25; GLX.obj('glow', 'sphere', h[12], h[13], h[14], 0, r, r, r, ec, 1.4 + wind, 1); GLX.halo(h[12], h[13], h[14], 1 + wind * 2, ec, .4); } GLX.light(e.x, 2.2, e.z, 8, ec, .8, 3); } }
  return true;
}
function drawEnemy(e) {
  if (e.dummy) { const col = GLX.col, wood = col(0x5a4028), straw = col(0xc8a868), sack = col(0xb89a72), rope = col(0x8a6a3a), red = col(0xb03a2a), wht = col(0xe8e0cc), fl = e.flash > 0 ? .6 : 0, w = (e.wob || 0), tx = Math.sin(G.time * 22) * w * .22, tz = Math.cos(G.time * 17) * w * .12;
    GLX.base(BM, e.x, 0, e.z, Math.PI, 1); const q = (g, ox, oy, oz, sx, sy, sz, c, m, em) => GLX.part('dyn', g, BM, 0, .2, 0, tx, 0, tz, ox, oy, oz, sx, sy, sz, c, (em || 0) + fl * .5, 1, m || 0);
    GLX.part('dyn', 'cyl', BM, 0, 0, 0, 0, 0, 0, 0, .1, 0, 1.1, .2, 1.1, col(0x4a3a2a), 0, 1, 3); q('cyl', 0, .9, 0, .14, 1.9, .14, wood, 3); q('rbox', 0, 1.75, 0, 1.6, .12, .12, wood, 3);
    q('taper', 0, 1.25, 0, .7, .95, .5, straw); q('sphere', 0, 1.62, 0, .74, .42, .52, straw); for (const y of [.95, 1.3, 1.6]) q('cap', 0, y, 0, .74 - (y < 1 ? .08 : 0), .03, .54, rope);
    q('sphere', 0, 2.22, 0, .44, .5, .42, sack); q('cap', 0, 2.0, 0, .3, .05, .3, rope); for (const sd of [1, -1]) { q('rbox', .1 * sd, 2.28, .2, .08, .02, .02, col(0x2a2018)); q('rbox', .1 * sd, 2.28, .2, .02, .08, .02, col(0x2a2018)); }
    for (const sd of [1, -1]) { q('sphere', .82 * sd, 1.75, 0, .2, .2, .2, straw); for (let k = 0; k < 3; k++) q('cone', (.92 + k * .02) * sd, 1.7 - k * .05, (k - 1) * .05, .05, .16, .05, straw); }
    q('cap', 0, 1.4, .27, .44, .02, .44, wht); q('cap', 0, 1.4, .285, .3, .02, .3, red); q('cap', 0, 1.4, .3, .15, .02, .15, wht); q('cap', 0, 1.4, .31, .06, .02, .06, red, 0, .3);
    return; }
  const col = GLX.col, md = e.md, c = col(md.c), c2 = col(md.c2), ec = col(md.e); let sc = e.sc, y = 0;
  let tilt = 0, ox = 0, oz = 0; if (!e.alive) { if (e.fly) { const k = Math.min(1, Math.max(0, e.deadT / .3)); sc *= .35 + .65 * k; y = e.fly.y - (1 - k) * .6; tilt = e.fly.tilt; } else { const k = Math.max(0, e.deadT / .45); sc *= .3 + .7 * k; y = -(1 - k) * .8; } }
  const fdt = Math.min(.1, G.time - (e.wkT === undefined ? G.time : e.wkT)); e.wkT = G.time; e.wk = (e.wk || 0) + ((e.st === 'wind' ? 1 : 0) - (e.wk || 0)) * Math.min(1, fdt * 9); /* wind-ups blend in and out instead of snapping */ const em = e.flash > 0 ? 1.4 : 0, w = e.walk, sw = Math.sin(w), at = Math.max(0, e.atk), wind = e.wk;
  if (e.alive && e.hf > 0) { e.hf -= fdt; const k = Math.max(0, e.hf / .22), q = Math.sin(k * Math.PI) * Math.min(1.4, e.hp0 || 1); tilt = -.32 * q; ox = (e.hdx || 0) * .28 * q; oz = (e.hdz || 0) * .28 * q; } // the flinch: a quick lean back and a small step away from the blow
  GLX.base(BM, e.x + ox, y, e.z + oz, e.rot, sc); if (tilt) tiltBase(BM, e.rot, sc, tilt); const p = (g, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, mat, ee) => GLX.part('dyn', g, BM, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, cc, ee === undefined ? em : ee, 1, mat || 0);
  const eyes = (ex, ey, ez, r) => { p('sphere', ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); p('sphere', -ex, ey, ez, 0, 0, 0, 0, 0, 0, r, r, r, ec, 0, 3); };
  if (monModel(e, sc, y, tilt, ox, oz, em, wind, at) || (e.boss && bossModel(e, sc, y, tilt, ox, oz, em, wind, at))) { /* build 0055: drawn on a real model */ }
  else if (e.arch === 'goblin') { const gd = col(0xd8a838), sk2 = col(0x5a8a3a), t = G.time, hop = Math.abs(Math.sin(w * 1.4)) * .14;
    if (e.awake && e.alive && !e.ann && typeof UI !== 'undefined') { e.ann = 1; UI.zoneBanner('Treasure Goblin!', 'Catch it before it escapes: 30 seconds'); SFX.play('drop3'); }
    for (const sd of [1, -1]) p('cap', .16 * sd, .4 + hop, 0, sd * sw * .9, 0, 0, 0, -.2, 0, .14, .36, .14, sk2);
    p('sphere', 0, .82 + hop, .05, .5, 0, 0, 0, 0, 0, .5, .5, .45, c, 0); p('sphere', 0, 1.18 + hop, .38, .2, 0, 0, 0, 0, 0, .34, .3, .32, sk2, 0); for (const sd of [1, -1]) p('cone', .3 * sd, 1.28 + hop, .34, 0, 0, sd * 1.2, 0, 0, 0, .08, .34, .08, sk2); eyes(.1, 1.24 + hop, .62, .05); p('sphere', 0, 1.12 + hop, .66, 0, 0, 0, 0, 0, 0, .1, .08, .12, sk2);
    p('sphere', 0, 1.2 + hop, -.32, .1, 0, 0, 0, 0, 0, .62, .66, .58, c2, 0, .25); p('cap', 0, 1.62 + hop, -.32, 0, 0, 0, 0, 0, 0, .2, .14, .2, col(0x6a4a24)); for (let k = 0; k < 4; k++) { const an = k * 1.57 + t * 2; GLX.obj('glow', 'gem', e.x + Math.cos(an) * .7 * sc, (1.3 + Math.sin(t * 3 + k) * .3) * sc, e.z + Math.sin(an) * .7 * sc, t * 4, .07, .12, .07, gd, 2, .9); } GLX.halo(e.x, 1.1 * sc, e.z, 2.2, gd, .4); if (e.alert && e.alive) { const pu = .6 + .4 * Math.sin(t * 6); GLX.obj('glow', 'ring', e.x, .07, e.z, t * 2, 2.6, 1, 2.6, gd, 1, .7 * pu, -1); GLX.obj('glow', 'box', e.x, 3.2, e.z, .78, .12, 6.4, .12, gd, 1, .3 * pu); GLX.halo(e.x, 1.4, e.z, 4.5, gd, .35 * pu); } }
  else if (e.arch === 'grunt') {
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
  const it = d.item, col = GLX.col; let L = null; try { L = d.look || (d.look = itemLook(it)); } catch (e) { }
  /* 0030: dropped items wear their real materials (the same metal, wood, leather, cloth and gem as their icon); rarity stays in the beam and ring */
  const hx = h => parseInt(h.slice(1), 16), mk = L && L.kind, mc = L ? col(hx(L.mat[1])) : null, rc = L ? col(hx(L.acc)) : col(0x8a7a5a), gm = L ? col(hx(L.gem[1])) : col(RC[it.rar]),
    steel = mk === 'metal' ? mc : col(0xaab2c0), wood = mk === 'wood' ? mc : col(0x6a4a2a), leather = mk === 'leather' ? mc : col(0x5c4230), gold = mk === 'jewel' ? mc : col(0xc9a030), cloth = mk === 'cloth' ? mc : col(0x6a5a8a), em = 0;
  { const ry = G.time * .7 + d.x * 3, tb = d.tb || 0; if (!tb) GLX.base(BM, d.rx === undefined ? d.x : d.rx, .1 + hop, d.rz === undefined ? d.z : d.rz, ry, 1.25); else { /* build 0063: tumbling end over end while it flies */ const s = 1.25, ca = Math.cos(ry) * s, sa = Math.sin(ry) * s, cb = Math.cos(tb), sb = Math.sin(tb);
    BM[0] = ca; BM[1] = 0; BM[2] = -sa; BM[3] = 0; BM[4] = sa * sb; BM[5] = cb * s; BM[6] = ca * sb; BM[7] = 0; BM[8] = sa * cb; BM[9] = -sb * s; BM[10] = ca * cb; BM[11] = 0; BM[12] = d.rx; BM[13] = .35 + hop; BM[14] = d.rz; BM[15] = 1; } }
  const p = (g, px, py, pz, rx, ry, rz, sx, sy, sz, c, mat, e) => GLX.part('dyn', g, BM, px, py, pz, rx, ry, rz, 0, 0, 0, sx, sy, sz, c, e === undefined ? em : e, 1, mat || 0), H = 1.5708;
  const sl = it.slot, wt = it.wt, b = it.base || '';
  if (sl === 'weapon') {
    if (wt === 'sword') { p('box', 0, .06, .28, 0, 0, 0, .12, .04, 1.15, steel, 4); p('box', 0, .06, -.32, 0, 0, 0, .42, .07, .08, rc, 4); p('cyl', 0, .06, -.5, H, 0, 0, .08, .3, .08, leather); p('sphere', 0, .06, -.68, 0, 0, 0, .13, .13, .13, gm, 0, .8); }
    else if (wt === 'axe') { p('cyl', 0, .07, 0, H, 0, 0, .08, 1.3, .08, wood, 3); p('box', .2, .07, .42, 0, 0, 0, .42, .05, .4, steel, 4); p('box', .42, .07, .42, 0, 0, 0, .06, .04, .56, rc, 4); }
    else if (wt === 'maul') { p('cyl', 0, .1, -.1, H, 0, 0, .09, 1.3, .09, wood, 3); p('box', 0, .16, .5, 0, 0, 0, .56, .32, .36, steel, 4); p('box', 0, .16, .5, 0, 0, 0, .6, .1, .4, rc, 4); }
    else if (wt === 'bow') { p('box', .1, .06, .36, 0, .32, 0, .06, .06, .78, wood, 3); p('box', .1, .06, -.36, 0, -.32, 0, .06, .06, .78, wood, 3); p('box', -.02, .06, 0, 0, 0, 0, .015, .015, 1.4, col(0xe8e0d0)); p('box', .21, .06, 0, 0, 0, 0, .09, .08, .26, rc, 4); }
    else if (wt === 'fist') { for (const sd of [1, -1]) { p('box', .2 * sd, .1, 0, 0, 0, 0, .26, .18, .34, leather); p('box', .2 * sd, .14, .16, 0, 0, 0, .28, .08, .08, steel, 4); for (let k = 0; k < 3; k++) p('cone', .2 * sd + (k - 1) * .08, .16, .24, H, 0, 0, .06, .14, .06, rc, 4); } }
    else { p('cyl', 0, .07, 0, H, 0, 0, .07, b === 'Wand' ? .8 : 1.7, .07, wood, 3); const z = b === 'Wand' ? .46 : .92; p('gem', 0, .12, z, 0, G.time * 2, 0, .26, .3, .26, gm, 0, 1.6); p('cyl', 0, .07, z - .16, H, 0, 0, .12, .1, .12, gold, 4); }
  } else if (sl === 'offhand') {
    if (b === 'Shield') { p('cyl', 0, .1, 0, 0, 0, 0, .9, .1, .9, wood, 3); p('cyl', 0, .14, 0, 0, 0, 0, .96, .04, .96, steel, 4); p('sphere', 0, .18, 0, 0, 0, 0, .3, .16, .3, rc, 4); }
    else if (b === 'Quiver') { p('cyl', 0, .14, 0, H, 0, 0, .26, .8, .26, leather); for (let k = 0; k < 3; k++) p('box', (k - 1) * .07, .16, .56, 0, 0, 0, .03, .03, .4, k === 1 ? rc : wood); }
    else if (b === 'Orb') { p('sphere', 0, .32, 0, 0, 0, 0, .5, .5, .5, gm, 0, 1.2); p('cyl', 0, .06, 0, 0, 0, 0, .4, .1, .4, gold, 4); }
    else if (b === 'Tome') { p('box', 0, .1, 0, 0, 0, 0, .56, .16, .74, leather); p('box', 0, .1, 0, 0, 0, 0, .5, .12, .78, col(0xe8e0c8)); p('box', 0, .19, 0, 0, 0, 0, .2, .02, .2, rc, 4); }
    else { p('gem', 0, .3, 0, 0, G.time, 0, .4, .56, .4, gm, 0, 1.2); p('ring', 0, .04, 0, 0, 0, 0, .7, 1, .7, gold, 4); }
  } else if (sl === 'shoulders') { for (const sd of [1, -1]) { p('sphere', .24 * sd, .16, 0, 0, 0, 0, .44, .3, .5, b === 'Pauldrons' ? steel : leather, b === 'Pauldrons' ? 4 : 0); p('box', .24 * sd, .08, 0, 0, 0, 0, .46, .06, .52, rc, 4); } }
  else if (sl === 'bracers') { for (const sd of [1, -1]) { p('cyl', .18 * sd, .12, 0, H, 0, 0, .24, .5, .2, b === 'Vambraces' ? steel : leather, b === 'Vambraces' ? 4 : 0); p('cyl', .18 * sd, .12, .22, H, 0, 0, .27, .07, .23, rc, 4); } }
  else if (sl === 'belt') { p('cyl', 0, .08, 0, 0, 0, 0, .8, .14, .56, b === 'War Belt' ? leather : cloth); p('box', 0, .1, .28, 0, 0, 0, .22, .18, .06, rc, 4); }
  else if (sl === 'pants') { const m = b === 'Plate Tassets' ? steel : leather, mt = b === 'Plate Tassets' ? 4 : 0; p('box', 0, .1, -.3, 0, 0, 0, .54, .14, .2, m, mt); for (const sd of [1, -1]) p('box', .14 * sd, .1, .12, 0, sd * .08, 0, .24, .13, .7, m, mt); p('box', 0, .12, -.3, 0, 0, 0, .58, .06, .1, rc, 4); }
  else if (sl === 'helm') {
    const m = b === 'Iron Helm' ? steel : b === 'Circlet' ? gold : leather, mt = b === 'Leather Hood' ? 0 : 4;
    if (b === 'Circlet') { p('cyl', 0, .14, 0, 0, 0, 0, .5, .12, .5, gold, 4); p('gem', 0, .2, .26, 0, 0, 0, .14, .16, .1, gm, 0, 1.4); }
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
    p('ring', 0, .04, -.05, 0, 0, 0, .62, 1, .7, gold, 4); p('ring', 0, .05, -.05, 0, 0, 0, .56, 1, .64, gold, 4); p('gem', 0, .1, .32, 0, G.time * 2, 0, .2, .24, .2, gm, 0, 1.6); p('cyl', 0, .05, .32, 0, 0, 0, .26, .05, .26, gold, 4);
  } else { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; p('sphere', Math.cos(a) * .17, .07, Math.sin(a) * .17, 0, 0, 0, .09, .1, .09, gold, 4); } p('gem', 0, .16, .19, 0, G.time * 2, 0, .15, .18, .15, gm, 0, 1.6); }
}
const BEAM = [0, 3.2, 6.5, 12, 18], RC = [0xc9c9c9, 0x5a8cff, 0xffd84a, 0xff8a2a, 0xb060ff];
/* build 0063: loot is tossed out of the monster in an arc, tumbles, bounces once and lands with a flash in its rarity colour */
const TOSS = .5;
function lootToss(d, r) {
  const t = d.t || 0, f = Math.min(1, t / TOSS), sx = d.ox === undefined ? d.x : d.ox, sz = d.oz === undefined ? d.z : d.oz;
  d.rx = sx + (d.x - sx) * f; d.rz = sz + (d.z - sz) * f;
  if (f < 1) { d.hop = .6 + Math.sin(f * Math.PI) * (2 + r * .35) * (1 - f * .4) - f * .6; d.tb = (f * 6.2832 * (1.2 + Math.abs(d.spin || .5))) * Math.sign(d.spin || 1); return; }
  const u = t - TOSS; d.hop = u < .5 ? Math.abs(Math.sin(u / .5 * Math.PI)) * .45 * (1 - u / .5) : 0; d.tb = 0;
  if (d.landT === undefined) { d.landT = G.time; if (d.t < 2 && Math.hypot(d.x - P.x, d.z - P.z) < 32) { const cc = RC[r]; ring(d.x, d.z, .2, 1.4 + r * .7, .35 + r * .08, cc); burst(d.x, .3, d.z, cc, 6 + r * 6, 2 + r * .8); if (r >= 3) { ring(d.x, d.z, .4, 4 + r, .7, cc); burst(d.x, 1.2, d.z, 0xfff0c0, 24, 6); G.shake = Math.max(G.shake || 0, .2); } } }
}
function drawBeam(d, r, c, lt) {
  const x = d.x, z = d.z, h = BEAM[r], p = .8 + Math.sin(G.time * 4 + x) * .2, w = .14 + r * .05, rise = Math.min(1, lt / .35), H = h * rise, col = GLX.col, wc = col(0xfff4e0);
  if (H > .05) { /* a soft outer column, a bright thin core, and a top that fades out */
    GLX.obj('glow', 'cyl', x, H * .25, z, 0, w * 2.6, H * .5, w * 2.6, c, 1, .16 * p);
    GLX.obj('glow', 'cyl', x, H * .5, z, 0, w * 1.25, H, w * 1.25, c, 1.2, .62 * p);
    GLX.obj('glow', 'cyl', x, H * .4, z, 0, w * .3, H * .8, w * .3, wc, 1.3, .45 * p); }
  if (lt < .6) { const k = lt / .6; GLX.obj('glow', 'ring', x, .08, z, 0, .4 + k * (3 + r), 1, .4 + k * (3 + r), c, 1.4, .8 * (1 - k), -1); GLX.halo(x, .6, z, 3 + r * 1.5, c, .9 * (1 - k)); } /* landing flash */
  GLX.halo(x, .4, z, 1.2 + r * .6, c, .4 * p);
  GLX.obj('glow', 'ring', x, .06, z, G.time, 1.2 + r * .4, 1, 1.2 + r * .4, c, 1, .7, -1);
  GLX.obj('glow', 'disc', x, .05, z, 0, 1 + r * .35, 1, 1 + r * .35, c, 1, .07 + r * .015, 1); /* a pool of coloured light under it */
  if (r >= 2) { GLX.light(x, 1.5, z, 4 + r * 1.5, c, .55 + r * .15, r); /* motes drift up the beam */ const n = r * 2; for (let k = 0; k < n; k++) { const ph = (G.time * (.35 + k * .04) + k / n + x * .13) % 1, a = k * 2.4 + G.time * .8, rr = .25 + (k % 3) * .14; GLX.obj('glow', 'sphere', x + Math.cos(a) * rr, .3 + ph * h * .8, z + Math.sin(a) * rr, 0, .07, .07, .07, k % 2 ? wc : c, 1.6, .9 * Math.sin(ph * Math.PI)); } }
  if (r >= 3) { /* legendary and mythic: a slow turning rune circle and a crown of light */ const R0 = 1.6 + r * .4, t = G.time; GLX.obj('glow', 'ring', x, .07, z, -t * .5, R0, 1, R0, c, 1.2, .55 * p, -1); GLX.obj('glow', 'ring', x, .075, z, t * .7, R0 * .78, 1, R0 * .78, wc, 1.1, .35 * p, -1);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832 - t * .5; GLX.obj('glow', 'box', x + Math.cos(a) * R0 * .89, .07, z + Math.sin(a) * R0 * .89, -a, .5, .02, .08, c, 1.2, .5 * p); }
    GLX.halo(x, H * .96, z, 1.2 + r * .3, c, .35 * p); }
}
function drawWorld() {
  const col = GLX.col, Z = G.zone;
  const sh = G.set.shake ? G.shake * G.shake * 1.5 : 0, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
  GLX.env.player = [P.x, 0, P.z]; GLX.env.t = G.time; GLX.env.pt = null; const zf = innerWidth < innerHeight ? 1.42 : 1; /* portrait phones see a little more around the hero */ let cx = P.x, cz = P.z, zm = 1; /* build 0075 (Lee, Nov 15): the camera stays on your hero; it no longer swings to a guardian when it wakes or falls */
  GLX.setCamera([cx + sx, 25 * G.zoom * zf * zm + sz, cz + 18 * G.zoom * zf * zm], [cx + sx, 1, cz + sz], .66);
  for (const a of aiAll()) drawHero(a, false); drawPet(); if (G.inTown) drawTownLife(); else drawQuestBits();
  if (!G.inTown && G.zone.torches) { const tc = GLX.col(0xffa040), tw = GLX.col(0xffe0a0); for (const t of G.zone.torches) { if (Math.abs(t[0] - P.x) > 26 || Math.abs(t[2] - P.z) > 26) continue; const fl = .85 * fireFl(G.time, t[0] + t[2] * 1.7); if (Math.abs(t[0] - P.x) < 18 && Math.abs(t[2] - P.z) < 18) GLX.light(t[0], t[1] + .3, t[2] + .9, 10, tc, 1.5 * fl); /* build 0052: wall torches light the stone around them */ GLX.obj('glow', 'cone', t[0], t[1] + .12 * fl, t[2], 0, .2 * fl, .42 * fl, .2 * fl, tc, 1.6, 1); GLX.obj('glow', 'cone', t[0], t[1] + .08, t[2], 0, .1, .26 * fl, .1, tw, 2.2, 1); GLX.halo(t[0], t[1] + .1, t[2], 1.6 * fl, tc, .5); GLX.halo(t[0], .06, t[2] + .9, 3.4 * fl, tc, .14); } }
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
  drawBrand(); drawHero(P, true); if (G.online) for (const id in NET.peers) { const q = NET.peers[id]; if (peerHere(q)) drawHero(q, false); }
  G._mN = 0; for (const e of G.ents) { if (Math.abs(e.x - P.x) > 34 || Math.abs(e.z - P.z) > 34) continue; drawEnemy(e); }
  for (const L of Z.lamps) { const d = Math.hypot(L.x - P.x, L.z - P.z); if (d > 32) continue; const c = col(L.big ? 0xff9a3a : Z.th.lamp), fl = fireFl(G.time, L.x + L.z); GLX.light(L.x, L.big ? 2.2 : 1.2, L.z, L.big ? 13 : 7, c, (L.big ? 1.3 : .8) * fl); GLX.halo(L.x, L.big ? 1.6 : .5, L.z, L.big ? 3.2 : 1.8, c, .4 * fl); }
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
    if (o.kind === 'gchest') { const gd = col(0xd8a838), dk = col(0x5a3416), t = G.time, ly = o.used ? 1.02 : .8; GLX.obj('dyn', 'box', o.x, .36, o.z, .3, 1.1, .72, .76, dk, hov, 1, 3); GLX.obj('dyn', 'box', o.x, .36, o.z, .3, 1.14, .14, .8, gd, hov + .15, 1, 4); GLX.obj('dyn', 'box', o.x, ly, o.z - (o.used ? .28 : 0), .3, 1.16, .26, .8, gd, hov + .2, 1, 4); GLX.obj('dyn', 'sphere', o.x + .05, .58, o.z + .4, .3, .12, .14, .06, col(0xff4a4a), .8);
      if (!o.used) { GLX.halo(o.x, 1, o.z, 2.6, gd, .45 + Math.sin(t * 3 + o.x) * .12); GLX.obj('glow', 'cyl', o.x, 4, o.z, t, .5, 8, .5, gd, 1, .12); for (let k = 0; k < 3; k++) { const ph = (t * .6 + k / 3 + o.x) % 1; GLX.obj('glow', 'gem', o.x + Math.cos(k * 2.1 + t) * .5, .8 + ph * 2.5, o.z + Math.sin(k * 2.1 + t) * .5, t * 3, .07, .12, .07, gd, 2, 1 - ph); } } continue; }
    if (o.kind === 'well') { const st = col(0x6a6660), st2 = col(0x8a857c), wd = col(0x5a3a22), t = G.time, wc = o.used ? col(0x2a4a5a) : col(0xffd25a); GLX.obj('dyn', 'cyl', o.x, .45, o.z, 0, 2.6, .9, 2.6, st, hov, 1, 3); GLX.obj('dyn', 'cyl', o.x, .93, o.z, 0, 2.8, .14, 2.8, st2, hov, 1, 3); GLX.obj('glow', 'cyl', o.x, .82, o.z, t, 2.1, .04, 2.1, wc, o.used ? .3 : 1.6, o.used ? .5 : .9);
      for (const sd of [1, -1]) GLX.obj('dyn', 'box', o.x + sd * 1.2, 1.9, o.z, 0, .18, 2.2, .18, wd, hov, 1, 3); GLX.obj('dyn', 'taper', o.x, 3.25, o.z, .785, 2.4, .9, 1.6, col(0x6a2a1a), hov, 1, 3); GLX.obj('dyn', 'cyl', o.x, 2.6, o.z, 1.5708, .14, 2.3, .14, wd, hov, 1, 3);
      if (!o.used) { GLX.halo(o.x, 1.4, o.z, 4.2, wc, .5 + Math.sin(t * 2.4) * .12); GLX.light(o.x, 1.6, o.z, 9, wc, 1.1, 3); for (let k = 0; k < 8; k++) { const ph = (t * .45 + k / 8) % 1, an = k * .785 + t * .7; GLX.obj('glow', 'gem', o.x + Math.cos(an) * .8 * (1 - ph * .3), 1 + ph * 3.2, o.z + Math.sin(an) * .8 * (1 - ph * .3), t * 4 + k, .08, .14, .08, k & 1 ? col(0x9ad0ff) : wc, 2, 1 - ph); } } continue; }
    if (o.kind === 'chest') { const wd = col(0x6a4426), wd2 = col(0x4e3018), ir = col(0x3a3c44), gd = col(0xc9a030), ry = .4, cs = Math.cos(ry), sn = Math.sin(ry), at = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
      GLX.obj('dyn', 'box', o.x, .42, o.z, ry, 1.5, .84, .95, wd, hov, 1, 3); for (const lx of [-.5, 0, .5]) { const q = at(lx, 0); GLX.obj('dyn', 'box', q[0], .42, q[1], ry, .03, .86, .97, wd2, hov, 1, 3); }
      const ly = o.used ? 1.2 : .98; GLX.obj('dyn', 'box', o.x, ly, o.z - (o.used ? .35 : 0), ry, 1.56, .3, 1, wd, hov, 1, 3); GLX.obj('dyn', 'box', o.x, ly + .17, o.z - (o.used ? .35 : 0), ry, 1.4, .08, .84, wd2, hov, 1, 3);
      for (const lx of [-.6, .6]) { const q = at(lx, 0); GLX.obj('dyn', 'box', q[0], .5, q[1], ry, .12, 1.02, 1.0, ir, hov, 1, 4); } { const q = at(0, .5); GLX.obj('dyn', 'box', q[0], .78, q[1], ry, .26, .3, .08, gd, hov + .1, 1, 4); } for (const lx of [-.72, .72]) for (const lz of [-.44, .44]) { const q = at(lx, lz); GLX.obj('dyn', 'box', q[0], .1, q[1], ry, .12, .2, .12, ir, hov, 1, 4); }
      if (!o.used) GLX.halo(o.x, 1.2, o.z, 2.4, col(0xffd84a), .35 + Math.sin(G.time * 3) * .1); else GLX.obj('glow', 'box', o.x, .86, o.z, ry, 1.2, .04, .7, col(0xffd84a), 1, .25); }
    else if (o.kind === 'shrine') { const st = col(0x5a5c60), c = col(o.sh.c), t = G.time; GLX.obj('dyn', 'cyl', o.x, .12, o.z, 0, 3, .24, 3, st, hov, 1, 3); GLX.obj('dyn', 'cyl', o.x, .34, o.z, .4, 2.2, .22, 2.2, col(0x6a6c70), hov, 1, 3); GLX.obj('dyn', 'taper', o.x, 1.7, o.z, .78, 1.1, 2.6, 1.1, st, hov, 1, 3); GLX.obj('dyn', 'taper', o.x, 3.2, o.z, .78, .7, .5, .7, col(0x44464c), hov, 1, 3);
      for (let k = 0; k < 4; k++) { const a = k * 1.5708 + .78; GLX.obj('dyn', 'taper', o.x + Math.cos(a) * 1.25, .75, o.z + Math.sin(a) * 1.25, a, .3, 1, .3, st, hov, 1, 3); }
      if (!o.used) { for (const y of [1.1, 1.8, 2.5]) GLX.obj('glow', 'ring', o.x, y, o.z, t * .5 + y, 1.5 - y * .22, 1, 1.5 - y * .22, c, 1.2, .7, -1); GLX.obj('dyn', 'gem', o.x, 4 + Math.sin(t * 2) * .2, o.z, t, .8, 1.2, .8, c, 2.4); GLX.obj('glow', 'cyl', o.x, 7, o.z, t, .5, 9, .5, c, 1, .18); GLX.obj('glow', 'ring', o.x, .3, o.z, -t, 5.6, 1, 5.6, c, 1, .5 + Math.sin(t * 3) * .2, -1); GLX.halo(o.x, 4, o.z, 4.5, c, .7); GLX.light(o.x, 3, o.z, 13, c, 1.3); } }
    else if (o.kind === 'pback') { /* build 0063: the way back up is a low waystone circle with a column of pale light, small enough not to hide your hero */
      const t = G.time, X = o.x, Z0 = o.z, cA = [.45, .78, 1], cC = [.8, .95, 1], st = col(0x5d5a5f), st2 = col(0x46434a), pulse = .5 + Math.sin(t * 2.2) * .5;
      GLX.obj('dyn', 'cyl', X, .08, Z0, 0, 2.5, .16, 2.5, st2, hov * .3, 1, 3); GLX.obj('dyn', 'cyl', X, .22, Z0, .4, 1.9, .14, 1.9, st, hov * .3, 1, 3);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832 + .26; GLX.obj('dyn', 'box', X + Math.cos(a) * 2.15, .55, Z0 + Math.sin(a) * 2.15, -a, .34, .7 + (k % 2) * .25, .3, st, hov * .4, 1, 3); GLX.obj('glow', 'box', X + Math.cos(a) * 2.3, .6 + (k % 2) * .12, Z0 + Math.sin(a) * 2.3, -a, .03, .26, .14, cA, 1.4 + hov * 2, .45 + .35 * Math.sin(t * 2.6 + k)); }
      GLX.obj('glow', 'ring', X, .31, Z0, t * .3, 1.75, 1, 1.75, cA, 1 + hov, .6 + pulse * .2, -1); GLX.obj('glow', 'disc', X, .3, Z0, 0, 1.6, 1, 1.6, cA, 1, .2 + pulse * .08, 1);
      GLX.obj('glow', 'cyl', X, 1.6, Z0, 0, .9, 2.6, .9, cA, 1, .1 + pulse * .05); GLX.obj('glow', 'cyl', X, 1.4, Z0, 0, .35, 2.2, .35, cC, 1.3, .2);
      for (let k = 0; k < 8; k++) { const ph = (t * .4 + k / 8) % 1, an = k * 2.4 + t; GLX.obj('glow', 'sphere', X + Math.cos(an) * .6, .4 + ph * 2.8, Z0 + Math.sin(an) * .6, 0, .07, .07, .07, cC, 2.2, (1 - ph) * .9); }
      const by = 2.4 + Math.sin(t * 2) * .15; for (const sd of [-1, 1]) GLX.part('glow', 'box', IDM, X + sd * .24, by, Z0, 0, 0, sd * .75, 0, 0, 0, .62, .14, .1, cC, 1.8, .85, 0); /* a floating up chevron */
      GLX.halo(X, 1.2, Z0, 3.4, cA, .45 + hov * .3); GLX.light(X, 1.5, Z0, 7, cA, .7, 1);
      if (hov > 0) GLX.obj('glow', 'ring', X, .32, Z0, t, 2.7 + pulse * .2, 1, 2.7 + pulse * .2, cC, 1.6, .7, -1); }
    else if (o.kind === 'portal') { // build 0046: an Ashen Gothic stone arch round a swirling ember and void gate
      const t = G.time, dn = o.kind === 'portal', H = hov > 0, lo = LOWQ, X = o.x, Z0 = o.z,
        cA = dn ? [1, .46, .12] : [.45, .78, 1], cB = dn ? [.56, .22, 1] : [.16, .32, 1], cC = dn ? [1, .82, .45] : [.8, .95, 1],
        st = col(0x5d5a5f), st2 = col(0x46434a), st3 = col(0x6c686c), pulse = .5 + Math.sin(t * 2.2) * .5, mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k],
        P2 = (g, x, y, z, rz, sx, sy, sz, c, em, al, set, rx) => GLX.part(set || 'dyn', g, IDM, X + x, y, Z0 + z, rx || 0, 0, rz || 0, 0, 0, 0, sx, sy, sz, c, em, al === undefined ? 1 : al, set === 'glow' ? (g === 'disc' ? 1 : 0) : 3);
      // stone dais in two tiers, with a glowing ring cut into it
      GLX.obj('dyn', 'cyl', X, .1, Z0, 0, 6.6, .2, 6.6, st2, hov * .3, 1, 3); GLX.obj('dyn', 'cyl', X, .3, Z0, .3, 5.4, .2, 5.4, st, hov * .3, 1, 3);
      GLX.obj('glow', 'ring', X, .42, Z0, t * .2, 5.2, 1, 5.2, cA, .9 + hov, .55 + pulse * .2, -1); GLX.obj('glow', 'ring', X, .43, Z0, -t * .3, 3.6, 1, 3.6, cB, .8, .35, -1);
      // two pillars: plinth, shaft, capital, and three runes that brighten when you point at the gate
      for (const sd of [-1, 1]) { const px = sd * 2.45;
        P2('box', px, .7, 0, 0, 1, .6, 1, st2, hov * .4); P2('box', px, 2.0, 0, 0, .66, 2.2, .66, st, hov * .4); P2('box', px, 3.25, 0, 0, .92, .32, .92, st3, hov * .4);
        for (let k = 0; k < 3; k++) P2('box', px, 1.25 + k * .62, .34, 0, .16, .3, .02, cA, 1.4 + hov * 2, .5 + .35 * Math.sin(t * 2.6 + k * 1.3 + sd), 'glow'); }
      // the pointed arch: stones laid along two arcs that meet at a keystone
      const y0 = 3.42, aa = 2.45, cx0 = 1.2, rr = Math.hypot(aa + cx0, 0), th0 = Math.acos(-cx0 / rr), NS = lo ? 4 : 5;
      for (const sd of [-1, 1]) for (let k = 0; k < NS; k++) { const p0 = Math.PI - (Math.PI - th0) * k / NS, p1 = Math.PI - (Math.PI - th0) * (k + 1) / NS, pm = (p0 + p1) / 2,
          x = sd * (cx0 + rr * Math.cos(pm)) * -1, y = y0 + rr * Math.sin(pm), ln = rr * (p0 - p1) * 1.06, rz = sd < 0 ? pm - 1.5708 : 1.5708 - pm;
        P2('box', x, y, 0, rz, ln, .58, .78, k % 2 ? st : st3, hov * .4); }
      const ya = y0 + rr * Math.sin(th0); P2('box', 0, ya + .1, 0, 0, .56, .86, .9, st3, hov * .5); P2('box', 0, ya + .1, .46, 0, .16, .32, .02, cC, 2 + hov * 2, .6 + pulse * .4, 'glow');
      // the gate: a deep void behind layers of ember glow, a three-armed spiral and sparks drawn inward
      const gy = 3.3, gw = 3.9, gh = 5.5; GLX.part('dyn', 'disc', IDM, X, gy, Z0 - .02, 1.5708, 0, 0, 0, 0, 0, gw * 1.02, 1, gh * 1.02, dn ? [.07, .02, .1] : [.02, .04, .1], .3, 1, 0);
      for (let k = 0; k < 3; k++) { const sc = 1 - k * .24 + Math.sin(t * 1.7 + k) * .03; P2('disc', 0, gy, .05 + k * .04, 0, gw * sc, 1, gh * sc, k === 2 ? cC : mix(cB, cA, k / 2), 1, .22 + k * .1 + hov * .08, 'glow', 1.5708); }
      const arms = 3, segs = lo ? 4 : 7; for (let m = 0; m < arms; m++) for (let k = 0; k < segs; k++) { const f = (k + .5) / segs, r = .2 + f * 1.7, an = m * 2.094 + t * 1.5 * (dn ? 1 : -1) + f * 2.4,
          x = Math.cos(an) * r, y = gy + Math.sin(an) * r * 1.38; P2('box', x, y, .16, an + 1.5708, .45 + f * .55, .07 + f * .06, .02, mix(cC, f < .5 ? cA : cB, f), 1.3, .55 * (1 - f * .6), 'glow'); }
      for (let k = 0; k < (lo ? 6 : 12); k++) { const ph = (t * .45 + k / 12) % 1, r = 1.9 * (1 - ph), an = k * 2.4 + t * 1.2 + ph * 3.2;
        GLX.obj('glow', 'sphere', X + Math.cos(an) * r, gy + Math.sin(an) * r * 1.38, Z0 + .22, 0, .1, .1, .1, mix(cB, cC, ph), 2.6, ph); }
      // embers rising off the dais
      for (let k = 0; k < (lo ? 5 : 10); k++) { const ph = (t * .3 + k * .137) % 1, an = k * 1.9 + t * .2, r = 2 + Math.sin(k * 3.1) * .7;
        GLX.obj('glow', 'sphere', X + Math.cos(an) * r, .5 + ph * 4.5, Z0 + Math.sin(an) * r * .6, 0, .07, .07, .07, cA, 2.4, (1 - ph) * .9); }
      if (H) GLX.obj('glow', 'ring', X, .5, Z0, t, 6.8 + pulse * .4, 1, 6.8 + pulse * .4, cC, 1.6, .7, -1); // pointed at: a bright ring says it can be clicked or tapped
      GLX.halo(X, gy, Z0 + .4, 7 + hov * 2, cB, .2 + hov * .1); GLX.light(X, 2.6, Z0 + 1, 15, mix(cA, cB, .35), 1.15 + hov * .6, 5);
    }
  }
  for (const d of G.drops) {
    if (Math.hypot(d.x - P.x, d.z - P.z) > 32) continue; const hop = Math.max(0, Math.sin(Math.min(1, d.t * 2.5) * Math.PI)) * 1.6;
    if (d.globe) { const gc = col(0xff2a2a); GLX.obj('dyn', 'sphere', d.x, .6 + Math.sin(G.time * 3 + d.x) * .12, d.z, 0, .7, .7, .7, gc, 1.6); GLX.halo(d.x, .6, d.z, 2.2, gc, .5); GLX.light(d.x, 1, d.z, 4, gc, .6); continue; }
    if (d.gold) { const gc = col(0xffc83a), n = Math.min(7, 3 + Math.floor(Math.log10(d.gold + 1) * 1.5)); /* build 0063: a little heap of coins that catches the light */ for (let k = 0; k < n; k++) { const a = k * 2.4 + d.x, rr = k ? .12 + (k % 3) * .1 : 0, yy = .06 + (k < 3 ? .1 * (3 - k) / 3 : 0) + hop; GLX.obj('dyn', 'cyl', d.x + Math.cos(a) * rr, yy, d.z + Math.sin(a) * rr, a, .28, .06, .28, gc, .5, 1, 4); } const gl = Math.max(0, Math.sin(G.time * 2.3 + d.x * 5)); GLX.halo(d.x, .3 + hop, d.z, .9 + gl * .5, col(0xffe08a), .25 + gl * .35); continue; }
    if (d.q) { const qc = col(d.qc || 0x8affc0), bob = Math.sin(G.time * 3 + d.x) * .08; if (/Lily/.test(d.q)) { GLX.obj('dyn', 'cyl', d.x, .25 + hop, d.z, 0, .08, .5, .08, col(0x3a8a4a), .2); for (let k = 0; k < 5; k++) GLX.obj('dyn', 'gem', d.x + Math.cos(k * 1.26) * .2, .6 + hop, d.z + Math.sin(k * 1.26) * .2, k * 1.26, .16, .3, .1, qc, 1.4); } else if (/Ham/.test(d.q)) { GLX.obj('dyn', 'sphere', d.x, .35 + hop + bob, d.z, d.x, .7, .45, .45, col(0xb86a4a), .2); GLX.obj('dyn', 'cyl', d.x + .4, .38 + hop + bob, d.z, 1.57, .12, .3, .12, col(0xf0e8d8)); } else if (/Glowcap/.test(d.q)) { GLX.obj('dyn', 'cyl', d.x, .25 + hop, d.z, 0, .14, .5, .14, col(0xe8e0d0), .3); GLX.obj('dyn', 'sphere', d.x, .55 + hop, d.z, 0, .6, .3, .6, qc, 1.2); } else { GLX.obj('dyn', 'sphere', d.x, .4 + hop + bob, d.z, d.x, .7, .75, .6, col(0xc8a868)); GLX.obj('dyn', 'cyl', d.x, .82 + hop + bob, d.z, 0, .2, .14, .2, col(0x8a6a3a)); }
      GLX.obj('glow', 'box', d.x, 1.6, d.z, .78, .16, 3.2, .16, qc, 1, .4); GLX.halo(d.x, .5, d.z, 2, qc, .45); continue; }
    const r = d.item.rar, c = col(RC[r]); lootToss(d, r);
    drawItemModel(d, d.hop); d.tb = 0;
    if (r > 0 && d.landT !== undefined) drawBeam(d, r, c, G.time - d.landT);
  }
  let pl = 0;
  let busy = G.fx.length * .5 + G.pp.length * 3; for (const a of G.areas) if (a.owner !== 'e') busy += 6; G._gd += ((busy > 60 ? Math.max(.4, 1 - (busy - 60) / 170) : 1) - (G._gd || 1)) * .15 || 0; if (!(G._gd > 0)) G._gd = 1; const GD = G._gd; GLX.glowK && GLX.glowK(GD); /* build 0062 (playtest): when spells pile up their glow dims, while the red danger shapes stay full and get brighter */
  for (const p of G.pp) {
    if (p.arrow) { GLX.obj('dyn', 'box', p.x, 1.25, p.z, p.rot, .05, .05, 1.2, col(0xd8c8a0), .3); GLX.obj('dyn', 'cone', p.x + Math.sin(p.rot) * .65, 1.25, p.z + Math.cos(p.rot) * .65, p.rot, .1, .1, .22, col(0xc8ced8), .2, 1, 4); GLX.halo(p.x, 1.25, p.z, 1.1, p.c, .35); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * 1.8, 1.25, p.z - Math.cos(p.rot) * 1.8, p.rot, .03, .03, 2.4, p.c, 1, .18); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .9, 1.25, p.z - Math.cos(p.rot) * .9, p.rot, .05, .05, 1.6, p.c, 1, .35); }
    else if (FX_EL[p.sk.el]) drawSpell(p.x, 1.25, p.z, p.rot, p.r, p.sk.el, p.c, pl++ < 3);
    else { const s = p.r * 1.5, sx = Math.sin(p.rot), cz2 = Math.cos(p.rot); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, s, s, s, p.c, 2.2, 1); GLX.obj('glow', 'sphere', p.x, 1.25, p.z, 0, s * .5, s * .5, s * .5, col(0xffffff), 2, .9); GLX.halo(p.x, 1.25, p.z, p.r * 7, p.c, .7); for (let k = 1; k <= 5; k++) { const q = s * (1 - k * .15), wob = Math.sin(G.time * 30 + k * 1.7) * .08 * k; GLX.obj('glow', 'sphere', p.x - sx * k * .42 + cz2 * wob, 1.25 + Math.cos(G.time * 26 + k) * .05 * k, p.z - cz2 * k * .42 - sx * wob, 0, q, q, q, p.c, 1.4, .6 - k * .1); } GLX.obj('glow', 'ring', p.x, 1.25, p.z, G.time * 8, s * 1.9, 1, s * 1.9, p.c, 1, .35, -1); GLX.obj('glow', 'box', p.x - Math.sin(p.rot) * .8, 1.25, p.z - Math.cos(p.rot) * .8, p.rot, p.r * .5, p.r * .5, 1.6, p.c, 1, .4); if (pl++ < 3) GLX.light(p.x, 1.5, p.z, 6, p.c, .8, 1); }
  }
  GLX.glowK && GLX.glowK(1);
  for (const p of G.projs) { const rt = Math.atan2(p.vx, p.vz); if (FX_EL[p.el]) { drawSpell(p.x, 1.2, p.z, rt, p.r * .85, p.el, p.c, pl++ < 4); continue; } GLX.obj('glow', 'sphere', p.x, 1.2, p.z, 0, p.r * 1.6, p.r * 1.6, p.r * 1.6, p.c, 1.6, 1); GLX.obj('glow', 'sphere', p.x, 1.2, p.z, 0, p.r * .7, p.r * .7, p.r * .7, col(0xffffff), 2, .8); for (let k = 1; k <= 3; k++) { const q = p.r * (1.4 - k * .3); GLX.obj('glow', 'sphere', p.x - Math.sin(rt) * k * .4, 1.2, p.z - Math.cos(rt) * k * .4, 0, q, q, q, p.c, 1.3, .55 - k * .13); } GLX.halo(p.x, 1.2, p.z, p.r * 5, p.c, .6); } // build 0057: enemy shots get a hot core and a trail too
  for (const a of G.areas) {
    GLX.glowK && GLX.glowK(a.owner === 'e' ? 1 + (1 - GD) * .8 : GD);
    const c = col(a.c), k = clamp(a.t / a.delay, 0, 1), d = a.r * 2, fl = a.hvy && !a.done && k > .72 ? .55 + .45 * Math.sin(G.time * 38) : 0; // build 0048: heavy blows flash just before they land
    if (a.sh) { drawTele(a, c, k, fl); continue; }
    GLX.obj('glow', 'ring', a.x, .09, a.z, 0, d, 1, d, c, 1 + fl, a.owner === 'e' ? .9 : .5, -1); GLX.obj('glow', 'disc', a.x, .08, a.z, 0, d * k, 1, d * k, c, 1, a.owner === 'e' ? .35 : .2, 0);
    if (a.hvy && !a.done) { GLX.obj('glow', 'disc', a.x, .07, a.z, 0, d, 1, d, c, 1, .12 + fl * .2, 0); GLX.obj('glow', 'ring', a.x, .1, a.z, 0, d * k * 1.02, 1, d * k * 1.02, col(0xffd0a0), 1.4, .7, -1); }
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
  GLX.glowK && GLX.glowK(GD);
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.pillar) { const e = Math.min(1, (1 - k) * 6), w = (1.3 + (1 - k) * .4) * e; f.x = P.x; f.z = P.z; GLX.obj('glow', 'cyl', f.x, 9, f.z, G.time, w, 18, w, f.c, 1.5, k * .55); GLX.obj('glow', 'cyl', f.x, 9, f.z, -G.time, w * .4, 18, w * .4, col(0xffffff), 2, k * .7); GLX.halo(f.x, 1.2, f.z, 5 * e, f.c, k * .6); for (let i = 0; i < 10; i++) { const ph = ((1 - k) * 1.6 + i / 10) % 1, a = i * .63 + G.time * 2; GLX.obj('glow', 'gem', f.x + Math.cos(a) * w * .9, ph * 10, f.z + Math.sin(a) * w * .9, a, .1, .2, .1, f.c, 2, k); } GLX.light(f.x, 3, f.z, 12, f.c, 1.6 * k, 9); }
    else if (f.shock) { const e = 1 - Math.pow(k, 2.2), r = f.r * (.3 + e * 1.1) * 2; GLX.obj('glow', 'ring', f.x, .14, f.z, 0, r, 1, r, f.c, 1.4, k * 1.1, -1); GLX.obj('glow', 'ring', f.x, .18, f.z, G.time, r * .86, 1, r * .86, col(0xffffff), 1.6, k * .7, -1); GLX.obj('glow', 'disc', f.x, .1, f.z, 0, r * .9, 1, r * .9, f.c, 1, k * k * .45, 0);
      const fl = Math.max(0, 1 - (1 - k) * 4); if (fl > 0) { GLX.obj('glow', 'sphere', f.x, 1.1, f.z, 0, f.r * .9 * (1.4 - fl * .4), f.r * .7, f.r * .9 * (1.4 - fl * .4), col(0xffffff), 2.4, fl * .85); GLX.halo(f.x, 1.2, f.z, f.r * 2.8, f.c, fl); }
      if (f.h) GLX.obj('glow', 'cyl', f.x, 2.5, f.z, G.time * 2, f.r * .5 * k, 5, f.r * .5 * k, f.c, 1.6, k * .4); GLX.light(f.x, 1.5, f.z, f.r * 3 + 4, f.c, (f.h ? 2.6 : 1.6) * k, 9); }
    else if (f.ember) { const q = f.size * (.6 + .6 * k) * (.8 + .4 * Math.sin(G.time * 30 + f.x * 9)); GLX.obj('glow', 'gem', f.x, f.y, f.z, f.life * 7, q, q * 1.7, q, f.c, 2.2, Math.min(1, k * 1.6)); }
    else if (f.shard) { const g = Math.min(1, (1 - k) * 9), al = Math.min(1, k * 2.5), sh = f.h * g; GLX.part('glow', 'cone', IDM, f.x, 0, f.z, f.rx, f.ry, 0, 0, sh * .5, 0, f.w, sh, f.w, f.c, 1.2, al * .85); GLX.part('glow', 'cone', IDM, f.x, 0, f.z, f.rx, f.ry, 0, 0, sh * .4, 0, f.w * .4, sh * .8, f.w * .4, col(0xffffff), 1.8, al * .7); }
    else if (f.flame) { const e = 1 - k; for (let i = 0; i < 6; i++) { const a = i * 1.047 + f.x, d = f.r * (.25 + e * .6), q = f.r * .4 * k; GLX.obj('glow', 'sphere', f.x + Math.cos(a) * d, .3 + e * 1.4 + (i % 2) * .2, f.z + Math.sin(a) * d, a, q, q * 2, q, col(i % 2 ? 0xff9a3a : 0xff5a1a), 1.4, k * .4); } GLX.halo(f.x, .8, f.z, f.r * 2.4, f.c, k * .5); GLX.light(f.x, 1.2, f.z, f.r * 4 + 3, f.c, 1.1 * k, 5); }
    else if (f.scorch) { const d = f.r * 2; GLX.obj('glow', 'disc', f.x, .07, f.z, f.x, d, 1, d, f.c, .6, Math.min(1, k * 1.5) * .22, 0); }
    else if (f.spk) { const sp = Math.hypot(f.vx, f.vy, f.vz) || 1, L = Math.min(1.1, sp * .06); GLX.part('glow', 'box', IDM, f.x, f.y, f.z, -Math.asin(clamp(f.vy / sp, -1, 1)), Math.atan2(f.vx, f.vz), 0, 0, 0, 0, .06, .06, L, f.c, 2, k); }
    else if (f.smoke) { const s3 = f.size * (2.5 - k * 1.5); GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, s3, s3, s3, f.c, .1, k * .18); }
    else if (f.dust) { const s2 = .18 + (1 - k) * .35; GLX.obj('glow', 'sphere', f.x, f.y, f.z, 0, s2, s2 * .7, s2, f.c, .2, k * .28); }
    else if (f.rem) { const sink = Math.min(1, f.life / 1.4), al = Math.min(1, f.life / .6), y0 = -(1 - sink) * .25; /* remains lie a few seconds, then sink away */
      if (f.kind === 'ash') { GLX.obj('glow', 'disc', f.x, .06, f.z, f.x, 1.5, 1, 1.5, f.c, .3, .5 * al, 0); const gk = Math.max(0, (f.life - 2) / 3); if (gk > 0) { GLX.obj('glow', 'disc', f.x, .07, f.z, f.x, 1.1, 1, 1.1, col(0xff5a1a), 1.4, .35 * gk, 1); GLX.halo(f.x, .3, f.z, 1.6, col(0xff7a2a), .3 * gk); } }
      else if (f.kind === 'ice') GLX.obj('glow', 'disc', f.x, .06, f.z, f.x, 1.6, 1, 1.6, col(0xd8f2ff), 1, .22 * al, 1);
      for (const q of f.pcs) GLX.obj('dyn', f.kind === 'ice' ? 'gem' : 'box', f.x + q[0], q[4] * .5 + y0 + (f.kind === 'ice' ? .1 : 0), f.z + q[1], q[2], f.kind === 'bone' ? q[3] * .6 : q[3], q[4], f.kind === 'bone' ? q[5] : q[3] * 1.4, f.c, f.kind === 'ice' ? .5 : 0, 1, f.kind === 'ice' ? 0 : 3); }
    else if (f.wisp) { const e = 1 - k, y = f.y + e * 3.2, sw = Math.sin(G.time * 4 + f.ph) * .35 * e, a = Math.min(1, k * 2) * Math.min(1, e * 6); GLX.obj('glow', 'sphere', f.x + sw, y, f.z + Math.cos(G.time * 3 + f.ph) * .2 * e, 0, f.s * .7, f.s * 1.2, f.s * .7, f.c, 1.8, .55 * a); GLX.obj('glow', 'box', f.x + sw * .7, y - .3, f.z, 0, f.s * .3, .45, f.s * .3, f.c, 1.2, .25 * a); GLX.halo(f.x + sw, y, f.z, f.s * 3, f.c, .22 * a); }
    else if (f.xfl) { const e = 1 - k, L = f.r * (.5 + e * .8), W = .07 + k * .05; GLX.obj('glow', 'box', f.x, f.y, f.z, f.rot + .785, W, W, L, f.c, 2.2, k); GLX.obj('glow', 'box', f.x, f.y, f.z, f.rot - .785, W, W, L * .7, f.c, 2.2, k * .9); GLX.obj('glow', 'box', f.x, f.y, f.z, f.rot + .785, W * .4, W * .4, L * 1.2, col(0xffffff), 2.4, k * .8); GLX.halo(f.x, f.y, f.z, f.r * .9, f.c, k * .6); }
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
  GLX.glowK && GLX.glowK(1);
  if (GPS.pts.length > 1 && G.set.gps) { const c = col(0xffd84a), c2g = col(0xffa040); let acc = (G.time * 3) % 1.6, tot = 0; for (let i = 1; i < GPS.pts.length && tot < 34; i++) { const a = GPS.pts[i - 1], b = GPS.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ry = Math.atan2(b[0] - a[0], b[1] - a[1]); while (acc < L && tot + acc < 34) { const t = acc / L, k = 1 - (tot + acc) / 34; if (tot + acc > 1.6) { const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, al = Math.min(1, .35 + .85 * k); for (const sd of [1, -1]) { const fx = Math.sin(ry), fz = Math.cos(ry), sx = fz, sz = -fx; GLX.obj('glow', 'box', x - fx * .16 + sx * sd * .21, .07, z - fz * .16 + sz * sd * .21, ry - sd * .62, .15, .03, .62, c2g, 1.6, al); } } acc += 1.3; } acc -= L; tot += L; } } /* build 0075 (Lee, Nov 15): the path arrows are bigger and brighter */
  if (GPS.goal && G.set.gps) { const q = GPS.goal, onBoss = G.boss && G.boss.alive && G.boss.awake && Math.hypot(q.x - G.boss.x, q.z - G.boss.z) < 2; if (!onBoss && Math.hypot(q.x - P.x, q.z - P.z) > 2.5) { const c = col(0xffd84a), t = G.time, pu = .5 + .5 * Math.sin(t * 4), R = 2 + pu * .6; GLX.obj('glow', 'ring', q.x, .09, q.z, t * .6, R, 1, R, c, 1.6, .85, -1); GLX.obj('glow', 'cyl', q.x, 6, q.z, 0, .14 + pu * .05, 12, .14 + pu * .05, c, 2, .42); GLX.halo(q.x, 1.4, q.z, 3.4, c, .3 + pu * .15); } } /* a gold beam and ring mark where the quest leads: the townsfolk to report to, the captive, the gate */
  if (P.move && !P.atk) GLX.obj('glow', 'ring', P.move[0], .06, P.move[1], 0, .8, 1, .8, col(0xffffff), 1, .25, -1);
  if (G.tj && !G.auto && !P.dead) { const e = nearFoe(15); if (e && e !== G.hover) GLX.obj('glow', 'ring', e.x, .06, e.z, G.time * 1.5, e.r * 2.5, 1, e.r * 2.5, col(0xffb03a), 1, .55, -1); }
  if (G.hover && G.hover.alive) GLX.obj('glow', 'ring', G.hover.x, .06, G.hover.z, 0, G.hover.r * 2.6, 1, G.hover.r * 2.6, col(0xff5a4a), 1, .7, -1);
}
