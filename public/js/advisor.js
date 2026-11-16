/* Advisor (Lee, Nov 16: "an AI into the game that studys what your doing and advises what your next best move is"; picked the built-in advisor).
   Rule-based and free: it reads the hero, gear, bag, talents, potions, the story goal and the floor, watches a few habits (deaths on a floor,
   low life without drinking), and suggests the next best move in a small card. It only reads the game and calls the same actions the bag,
   skills and potion buttons already use. It never changes drops, loot, rarity, XP, damage or any other balance. */
const ADV = (() => {
  const $ = id => document.getElementById(id), esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = 'oathbyte_adv';
  let opt = { auto: true }; try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); if (o && typeof o === 'object') opt = Object.assign(opt, o); } catch (_) { }
  const saveOpt = () => { try { localStorage.setItem(LS, JSON.stringify(opt)); } catch (_) { } };
  /* what it has noticed this session: deaths per floor, and moments at low life with a potion ready that went unused */
  const W = { deaths: {}, wasDead: false, lowT: 0, lowMiss: 0, flWas: -1, floor: '', hero: null };
  let tips = [], idx = 0, open = false, autoT = 0, lastAuto = -1e9, seen = new Set(), shownKey = '';
  const pct = x => Math.round((Math.exp(x) - 1) * 100);
  const nm = it => '<b style="color:' + ((typeof RAR !== 'undefined' && RAR[it.rar]) ? RAR[it.rar].c : '#fff') + '">' + esc(it.name) + '</b>';
  const calm = () => { try { return typeof talCalm === 'function' ? talCalm() : true; } catch (_) { return true; } };
  const floorKey = () => { const d = G.zone && G.zone.def; return d ? (d.rift ? 'rift' : (d.depth || 1) + ':' + (d.tier || 0)) : ''; };

  /* a gain line from a gear comparison: only the parts that move by at least 1% */
  function gainTxt(c) { const p = []; const d = pct(c.d), t = pct(c.t), u = pct(c.u); if (d >= 200) p.push(Math.round(Math.exp(c.d)) + ' times the damage'); else if (d) p.push((d > 0 ? '+' : '') + d + '% damage'); if (t) p.push((t > 0 ? '+' : '') + t + '% toughness'); if (u) p.push((u > 0 ? '+' : '') + u + '% loot finding'); return p.join(', ') || 'a small gain overall'; }

  /* the best piece in the bag, judged on every stat together (the same comparison the bag arrows use) */
  function bestGear(h) { let best = null; h.inv.forEach((it, i) => { if (!it || !it.slot || !canUse(it)) return; let c; try { c = itemCmp(it); } catch (_) { return; } if (c.v > .02 && (!best || c.v > best.c.v)) best = { it, i, c }; }); return best; }

  /* ---- talent recommendations (Lee, Nov 16: "recommend which talent to pick based on which would be the best overall for this person build/character").
     Every card in a row is tried on this hero, together with the cards already taken in the other rows, and scored as overall strength:
     - damage: the stat math the bag uses (gear, crit, speed, elements), plus, for a card that changes a skill, how much better that skill gets
       weighted by how much of this hero's damage that skill does (so a card for your main attack beats one for a skill you barely use)
     - toughness: the same stat math, plus healing, freezing and damage-reduction effects
     - staying alive counts a little more once the hero has been dying.
     It only reads the game and recommends; the player still picks any card. Nothing about balance changes. */
  const REC = { key: '', rows: [] };
  const known = (h, id) => { try { return knows(h, id); } catch (_) { return true; } };
  function skRate(o) { /* how often a skill goes off, roughly, per second */
    if (o.cd) return 1 / Math.max(.6, o.cd); if (o.basic) return 1.2 * (o.as || 1);
    return 1 / ((o.cost || 15) / 14 + (o.ct || .35) * 1.5); }
  function skHit(o, s) { /* damage from one use, roughly: more hits, bigger area, chains, echoes, finishing blows */
    if (!o || !o.m) return 0; const cnt = o.cnt || 1;
    let v = o.m * Math.pow(cnt, .75) * (o.waves ? 1 + (o.waves - 1) * .7 : 1) * (o.jumps ? Math.pow(1 + o.jumps, .6) : 1) * (1 + Math.min(4, o.pierce || 0) * .2);
    v *= Math.pow(o.r || 1, .9) * Math.pow(o.range || 1, o.type === 'melee' ? .6 : .15) * Math.pow(o.arc || 1, .6) * Math.pow(Math.max(1, o.spread || 1), .15) * Math.pow(o.explode || 1, .6) * Math.pow(o.spd || 1, .1);
    v *= (1 + (o.exec || 0) / 100 * .25) * (1 + (o.grp || 0) / 100 * 1.8) * (1 + (o.echo || 0) / 100) * (1 + (o.crit || 0) / 100 * (((s && s.critM) || 1.5) - 1));
    return v; }
  const skDps = (o, s) => skHit(o, s) * skRate(o);
  function talScore(h, t, row) { /* the hero's strength with talents t: [damage, toughness, other], all as logs so they add up */
    h.tal = t; const tb = talBuild(), s = calcStats(h.eq, 1), v = gearValue(s), bar = (h.bar || []).filter(Boolean), out = { d: Math.log(Math.max(1, v.dps)), t: Math.log(Math.max(1, v.tough)), u: Math.log(v.util), sk: {}, ctl: 0 };
    let tot = 0; const per = {};
    bar.forEach((id, i) => { if (!known(h, id)) return; const o = tb.sk[id] || SKILLS[id]; if (!o || !o.m) return; const el = 1 + ((s[o.el] || 0) + (o.el && o.el !== 'phys' ? s.ele || 0 : 0)) / 100; let x = skDps(o, s) * el * (i > 0 && h.autoc && !h.autoc[i] ? .7 : 1); per[id] = x; tot += x; });
    if (tot > 0) { out.d += Math.log(tot); for (const id in per) out.sk[id] = per[id] / tot; }
    /* effects that are not damage: healing, freezing, damage taken down for a while, resource back */
    for (const c of talPicks(h)) { if (!c.fx) continue; for (const id in c.fx) { const f = c.fx[id], o = tb.sk[id] || SKILLS[id]; if (!o || !known(h, id) || !bar.includes(id)) continue; const share = out.sk[id] || 0, rate = skRate(o);
      const tg = /nova|rain|spin|barrage/.test(o.type) ? 4 : o.type === 'chain' ? 3 : o.type === 'melee' ? ((o.arc || 1) > 1.5 ? 3 : 1.5) : (o.cnt || 1) > 1 || o.explode ? 2.5 : 1.5;
      if (f.heal) out.t += Math.log(1 + f.heal * rate * tg * .03); /* % of life back per second */
      if (f.freeze) out.t += Math.log(1 + .5 * Math.min(.5, f.freeze * rate)); /* share of the time monsters stand frozen */
      if (f.cost && o.cd && SKILLS[id] && SKILLS[id].cost > f.cost) out.d += Math.log(1 + (SKILLS[id].cost - f.cost) / SKILLS[id].cost * .12);
      if (f.buff && f.buff.s) { const up = Math.min(.6, (f.buff.t || 3) * Math.min(1, rate)); if (f.buff.s.dr) out.t += -Math.log(1 - f.buff.s.dr / 100 * up); if (f.buff.s.ms) out.u += f.buff.s.ms / 100 * .15 * up; }
      if (f.gen) out.d += Math.log(1 + Math.min(.6, f.gen / Math.max(3, (SKILLS[id] || {}).gen || 5)) * .25 * (1 - share));
      if (f.ref) out.d += Math.log(1 + Math.min(.6, f.ref * 2.5 / Math.max(10, o.cost || 20)) * .6 * share); } }
    /* how much of the time monsters are frozen or chilled, for cards like Shatter */
    for (const id in out.sk) { const o = tb.sk[id] || SKILLS[id]; if (o && (o.freeze || o.el === 'cold')) out.ctl += out.sk[id] * (o.freeze ? .9 : .6); }
    out.ctl = Math.min(.6, .04 + out.ctl); const vc = tb.s.vsCtl || 0; if (vc) out.d += Math.log(1 + vc / 100 * out.ctl);
    return out; }
  function talRecs(h) {
    if (!h) return []; const deaths = Object.values(W.deaths).reduce((a, b) => a + b, 0);
    const key = [h.cls, h.level, (h.tal || []).join(','), (typeof P !== 'undefined' && P.gc) || '', (h.bar || []).join(','), (h.autoc || []).join(''), Math.min(4, deaths), JSON.stringify(h.pg || {})].join('|');
    if (REC.key === key) return REC.rows;
    const rows = talRows(h.cls), orig = h.tal, base = Array.isArray(h.tal) ? h.tal.slice(0, TAL_LV.length) : []; while (base.length < TAL_LV.length) base.push(null);
    const tw = 1 + Math.min(.5, deaths * .15), out = [];
    try {
      for (let r = 0; r < rows.length; r++) {
        if (h.level < TAL_LV[r] || !rows[r].length) { out.push(null); continue; }
        const t0 = base.slice(); t0[r] = null; const b = talScore(h, t0, r), sc = [];
        rows[r].forEach((c, j) => { const t1 = base.slice(); t1[r] = j; const a = talScore(h, t1, r), d = a.d - b.d, t = a.t - b.t, u = a.u - b.u; sc.push({ j, d, t, u, v: d + t * tw + u, a, b }); });
        const ord = sc.slice().sort((x, y) => y.v - x.v), top = ord[0];
        if (!top || top.v < .004) { out.push(null); continue; }
        out.push({ k: top.j, v: top.v, sc: sc.map(x => x.v), why: recWhy(h, rows[r][top.j], top, ord[1], deaths) });
      }
    } finally { h.tal = orig; try { talBuild(); } catch (_) { } }
    REC.key = key; REC.rows = out; return out; }
  /* one plain line on why */
  function recWhy(h, c, x, next, deaths) {
    const P0 = pct(x.v), lead = P0 >= 1 ? 'About ' + P0 + '% stronger overall' : 'A small edge overall';
    const ids = c.fx ? Object.keys(c.fx).filter(id => SKILLS[id]) : [], main = ids.sort((a, b) => (x.b.sk[b] || 0) - (x.b.sk[a] || 0))[0], share = main ? Math.round((x.b.sk[main] || 0) * 100) : 0;
    let tail = '';
    if (x.t * 1.0 > x.d && x.t > x.u) tail = deaths >= 2 ? 'you have been dying, and this keeps you alive best' : 'it keeps you alive best of the three';
    else if (c.s && c.s.vsCtl) tail = 'your freezing and chilling skills set it up';
    else if (main && ids.some(id => c.fx[id].gen || c.fx[id].ref)) tail = 'more ' + ((CLASSES[h.cls].res || {}).n || 'power') + ' for your other skills';
    else if (main && share >= 45) tail = (SKILLS[main].n) + ' does most of your damage';
    else if (main && share > 0) tail = 'it boosts ' + SKILLS[main].n + ', about ' + share + '% of your damage';
    else if (c.s && (c.s.crit || c.s.critDmg)) tail = 'it fits the crit on your gear and talents';
    else if (c.s) tail = 'it fits your gear best';
    if (next && x.v - next.v < .01) tail = (tail ? tail + '; ' : '') + 'a close call';
    return lead + (tail ? ': ' + tail + '.' : '.'); }

  /* talents: an empty row first; then a stat-only row where another card adds more for this hero's gear, or a card that changes a skill you have taken off your bar */
  function talentTip(h) {
    let open0 = 0; try { open0 = talOpen(h); } catch (_) { }
    if (open0 > 0) { let rec = null; try { const R = talRecs(h), rows = talRows(h.cls), t = Array.isArray(h.tal) ? h.tal : []; for (let r = 0; r < rows.length; r++) if (h.level >= TAL_LV[r] && !(t[r] === 0 || t[r] === 1 || t[r] === 2) && R[r]) { rec = { n: rows[r][R[r].k].n, lv: TAL_LV[r] }; break; } } catch (_) { }
      return { k: 'tal-open:' + h.level, pri: 80, t: open0 > 1 ? 'Pick your ' + open0 + ' talent cards' : 'Pick your new talent card', d: 'You unlocked ' + (open0 > 1 ? open0 + ' talent rows' : 'a talent row') + ' and have not chosen yet.' + (rec ? ' Look for the Recommended mark, the best fit for your hero: at level ' + rec.lv + ' it is ' + rec.n + '.' : ' A card is free power.'), a: ['Open talents', () => UI.toggleSkl(true)] }; }
    try { const R = talRecs(h), rows = talRows(h.cls), t = Array.isArray(h.tal) ? h.tal : []; for (let r = 0; r < rows.length; r++) { const k = t[r], x = R[r]; if (!x || !(k === 0 || k === 1 || k === 2) || k === x.k) continue; const gain = x.v - x.sc[k]; if (gain > .03) return { k: 'tal-rec:' + r + ':' + x.k, pri: 55, t: 'Swap ' + rows[r][k].n + ' for ' + rows[r][x.k].n, d: 'For your hero right now, ' + rows[r][x.k].n + ' makes you about ' + pct(gain) + '% stronger overall. Swaps are free when no enemy is near.', a: ['Open talents', () => UI.toggleSkl(true)] }; } } catch (_) { }
    const rows = talRows(h.cls), orig = h.tal, t = Array.isArray(h.tal) ? h.tal.slice() : [], bar = new Set((h.bar || []).filter(Boolean));
    let out = null;
    try {
      for (let r = 0; r < rows.length; r++) {
        const k = t[r]; if (!(k === 0 || k === 1 || k === 2) || h.level < TAL_LV[r] || !rows[r][k]) continue; const cur = rows[r][k];
        if (cur.fx && !Object.keys(cur.fx).some(id => bar.has(id))) { const alt = rows[r].findIndex((c, j) => j !== k && (!c.fx || Object.keys(c.fx).some(id => bar.has(id)))); if (alt >= 0) { out = { k: 'tal-bar:' + r + ':' + k, pri: 55, t: 'Swap ' + cur.n + ' for ' + rows[r][alt].n, d: cur.n + ' only changes ' + Object.keys(cur.fx).map(id => (SKILLS[id] || {}).n || id).join(', ') + ', which is not on your skill bar. ' + rows[r][alt].n + ': ' + rows[r][alt].d, a: ['Open talents', () => UI.toggleSkl(true)] }; break; } }
      }
    } finally { h.tal = orig; try { talBuild(); } catch (_) { } }
    return out;
  }

  function think() {
    const h = G.hero, s = P.stats, out = []; if (!h || !s || !s.maxLife) return out; const town = !!G.inTown, fl = P.fl === undefined ? FLASK_MAX : P.fl, hp = P.hp / s.maxLife;
    /* life first: it is the only thing that can't wait */
    if (!town && !P.dead && hp < .35) {
      if (fl > 0 && !(P.flaskT > 0)) out.push({ k: 'pot', pri: 100, urgent: 1, t: 'Drink a potion now', d: 'You are at ' + Math.round(hp * 100) + '% life with ' + fl + ' potion' + (fl > 1 ? 's' : '') + ' left. Press 1' + (IN && IN.touch ? ' or tap the potion' : '') + '.', a: ['Drink', () => useFlask()] });
      else if (fl <= 0) out.push({ k: 'nopot', pri: 95, urgent: 1, t: 'Back off for a moment', d: 'You are low on life and out of potions. The next one is ready in ' + Math.max(1, Math.ceil(P.flaskCd || FLASK_CD)) + ' seconds; dodge roll away and let it refill.' });
    }
    if (W.lowMiss >= 2 && !h.autoPot) out.push({ k: 'autopot', pri: 70, t: 'Turn on auto-potion', d: 'Twice now your life dropped very low with a potion ready that you did not drink. Auto-potion drinks for you below half life.', a: ['Turn it on', () => { h.autoPot = true; saveGame(); hint('Auto-potion ON. You drink by yourself when your life drops below half.'); W.lowMiss = 0; }] });
    /* gear: unarmed, then the best upgrade in the bag */
    const g = bestGear(h);
    if (!h.eq.weapon && g && g.it.slot === 'weapon') out.push({ k: 'arm:' + g.it.name, pri: 90, t: 'Equip a weapon', d: 'You are fighting with your fists. ' + nm(g.it) + ' is in your bag.', html: 1, a: ['Equip it', () => equipNow(g.i)] });
    else if (g) out.push({ k: 'gear:' + g.it.name + ':' + g.it.ilvl, pri: g.c.v > .1 ? 85 : 65, t: 'Equip ' + g.it.name, d: nm(g.it) + (h.eq[g.it.slot === 'ring' ? 'ring1' : g.it.slot] ? ' beats your ' + (SLOT_NAME[g.it.slot] || g.it.slot).toLowerCase() + ' on all stats together: ' : ' fills your empty ' + (SLOT_NAME[g.it.slot] || g.it.slot).toLowerCase() + ' slot: ') + gainTxt(g.c) + '.', html: 1, a: ['Equip it', () => equipNow(g.i)] });
    /* talents and paragon */
    const tt = talentTip(h); if (tt) out.push(tt);
    try { const pf = paragonFree(); if (pf > 0) out.push({ k: 'para:' + (h.plvl || 0), pri: 60, t: 'Spend ' + pf + ' paragon point' + (pf > 1 ? 's' : ''), d: 'Paragon points are waiting in your bag panel. Each one adds a little damage, life or armor for good.', a: ['Open bag', openBag] }); } catch (_) { }
    /* the floor has been beating you */
    const fk = floorKey(), dn = W.deaths[fk] || 0; if (!town && dn >= 2) out.push({ k: 'deaths:' + fk + ':' + dn, pri: 75, t: 'This floor has beaten you ' + dn + ' times', d: (g ? 'Equip ' + nm(g.it) + ' first. ' : '') + 'If it keeps happening, go back a floor to gear up, or forge your weapon at the Altar' + ((G.zone.def.tier || 0) > 0 ? ', or pick an easier difficulty at the town portal' : '') + '.', html: 1, a: g ? ['Equip it', () => equipNow(g.i)] : ['Go to town', goTown] });
    /* forging */
    if ((h.ember || 0) >= EMBER_UP) { const w = SLOTS.map(sl => h.eq[sl]).filter(it => it && (it.up || 0) < MAX_UP).sort((a, b) => (b.dmg ? 1 : 0) - (a.dmg ? 1 : 0))[0]; if (w) out.push({ k: 'ember:' + Math.floor(h.ember / EMBER_UP), pri: 58, t: 'Free forging at the Altar', d: 'You have ' + h.ember + ' Ember, enough for a free +1. ' + nm(w) + ' would be a good pick' + (town ? '. The Altar is in the town square.' : ' next time you are in town.'), html: 1 }); }
    else { const w = h.eq.weapon; if (w && (w.up || 0) < MAX_UP) { const c = upCost(w); if ((h.shards || 0) >= c.shards && h.gold >= c.gold && h.gold >= c.gold * 3) out.push({ k: 'forge:' + (w.up || 0) + ':' + w.name, pri: 45, t: 'Forge your weapon to +' + ((w.up || 0) + 1), d: 'You have the shards and gold for it (' + c.shards + ' shards, ' + c.gold + ' gold) and plenty left over. Every forging adds about 8% to it.' + (town ? '' : ' The Altar is in town.') }); } }
    /* bag nearly full */
    try { const fr = bagFree(); if (fr <= 4 && !town) out.push({ k: 'bag:' + (fr <= 1 ? 0 : 1), pri: fr <= 1 ? 72 : 52, t: fr <= 1 ? 'Your bag is full' : 'Your bag is nearly full', d: 'New loot will be left on the ground. Send your pet: it takes the items that are worse than what you wear and sells them.', a: ['Send pet', () => petSell()] }); } catch (_) { }
    /* the story and the floor: always there, so there is always a next move */
    try { const q = questTarget(); if (q && q.text) out.push({ k: 'quest:' + q.text, pri: 30, t: q.text, d: town ? 'That is your next step in the story.' : 'That is your next step on this floor. Follow the path on the ground' + (G.set && G.set.gps === false ? ' (turn it on with G)' : '') + '.' }); } catch (_) { }
    return out.sort((a, b) => b.pri - a.pri);
  }
  function openBag() { const el = $('inv'); if (el && el.classList.contains('hide') && $('bInv')) $('bInv').click(); }
  function goTown() { if ($('bTown')) $('bTown').click(); }
  function equipNow(i) { if (equipFromInv(i)) { UI.invDirty = true; hint('Equipped. The advisor will tell you if anything else beats it.'); } }

  /* watching habits, twice a second */
  function watch(dt) {
    const h = G.hero; if (W.hero !== h) { W.hero = h; W.deaths = {}; W.lowMiss = 0; seen = new Set(); }
    const fk = floorKey(); if (P.dead && !W.wasDead && fk) W.deaths[fk] = (W.deaths[fk] || 0) + 1; W.wasDead = !!P.dead;
    const s = P.stats, fl = P.fl === undefined ? FLASK_MAX : P.fl; if (s && s.maxLife && !G.inTown && !P.dead) {
      if (P.hp / s.maxLife < .25 && fl > 0) { W.lowT += dt; if (W.lowT > 1.5 && W.lowT - dt <= 1.5) W.lowMiss++; } else W.lowT = 0;
    }
  }

  const set = (el, h) => { if (el._h !== h) { el._h = h; el.innerHTML = h; } }; /* only touch the card when what it says changes */
  function render() {
    const el = $('adv'); if (!el) return; const tp = tips[idx] || null;
    if (!tp) { shownKey = ''; set(el, '<div class="advH"><span class="advI giv-adv"></span><b>Advisor</b><button class="advX" data-ad="x" aria-label="Close">×</button></div><div class="advT">Nothing to change right now.</div><div class="advD">Your gear, talents and potions all look good. Keep going.</div>'); return; }
    shownKey = tp.k; seen.add(tp.k);
    set(el, `<div class="advH"><span class="advI giv-adv"></span><b>Next best move</b>${tips.length > 1 ? `<span class="advN">${idx + 1} of ${tips.length}</span>` : ''}<button class="advX" data-ad="x" aria-label="Close">×</button></div>
      <div class="advT">${esc(tp.t)}</div><div class="advD">${tp.html ? tp.d : esc(tp.d)}</div>
      <div class="advB">${tp.a ? `<button class="advGo" data-ad="go">${esc(tp.a[0])}</button>` : ''}${tips.length > 1 ? '<button data-ad="nx">Next tip</button>' : ''}</div>
      <label class="advO"><input type="checkbox" data-ad="auto"${opt.auto ? ' checked' : ''}> Pop up on its own</label>`);
    el.classList.toggle('urg', !!tp.urgent);
  }
  function show(v, auto) { const el = $('adv'), b = $('bAdv'); if (!el) return; open = v; el.classList.toggle('hide', !v); el.classList.toggle('auto', !!(v && auto)); if (b) b.classList.toggle('open', v); autoT = v && auto ? 9 : 0; if (v) render(); }
  function refreshBadge() { const b = $('bAdv'); if (!b) return; const top = tips[0], fresh = !!(top && top.pri >= 50 && !seen.has(top.k)); b.classList.toggle('new', fresh); }

  let last = 0;
  function tick() {
    const now = performance.now(), dt = Math.min(1, (now - last) / 1000 || 0); last = now;
    if (typeof G === 'undefined' || G.state !== 'play' || !G.hero || !P.stats) { if (open) show(false); return; }
    watch(dt); const prev = tips[idx] && tips[idx].k; tips = think();
    if (open && UI.panelOpen && UI.panelOpen() && (autoT > 0 || document.body.classList.contains('tj') || matchMedia('(pointer:coarse)').matches)) { show(false); refreshBadge(); return; } /* a panel opened: the card would sit on top of it */
    if (open) { const j = tips.findIndex(t => t.k === prev); idx = j >= 0 ? j : 0; if (!$('adv').matches(':hover') || !tips[idx]) render(); if (autoT > 0 && !$('adv').matches(':hover')) { autoT -= dt; if (autoT <= 0) show(false); } }
    else { idx = 0; const top = tips[0], panel = UI.panelOpen && UI.panelOpen(), gap = G.time - lastAuto;
      if (opt.auto && top && !seen.has(top.k) && !panel && ((top.urgent && gap > 40) || (top.pri >= 60 && gap > 45 && calm()))) { lastAuto = G.time; show(true, true); } }
    refreshBadge();
  }

  function init() {
    const b = $('bAdv'), el = $('adv'); if (!b || !el) return;
    b.onclick = () => { if (open && !el.classList.contains('auto')) show(false); else { tips = think(); idx = 0; show(true); } };
    el.addEventListener('click', e => { const t = e.target.closest('[data-ad]'); if (!t) return; const a = t.dataset.ad; e.stopPropagation();
      if (a === 'x') { const tp = tips[idx]; if (tp) seen.add(tp.k); show(false); }
      else if (a === 'nx') { idx = (idx + 1) % Math.max(1, tips.length); el.classList.remove('auto'); autoT = 0; render(); }
      else if (a === 'go') { const tp = tips[idx]; if (tp && tp.a) { tp.a[1](); seen.add(tp.k); tips = think(); idx = 0; show(false); } } });
    el.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.ad === 'auto') { opt.auto = t.checked; saveOpt(); } });
    for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend', 'wheel']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    setInterval(() => { try { tick(); } catch (e) { if (!ADV.err) { ADV.err = 1; console.warn('advisor', e); } } }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { think, talRecs, show: v => { tips = think(); idx = 0; show(v !== false); }, W, opt };
})();
