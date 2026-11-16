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
  function gainTxt(c) { const p = []; const d = pct(c.d), t = pct(c.t), u = pct(c.u); if (d) p.push((d > 0 ? '+' : '') + d + '% damage'); if (t) p.push((t > 0 ? '+' : '') + t + '% toughness'); if (u) p.push((u > 0 ? '+' : '') + u + '% loot finding'); return p.join(', ') || 'a small gain overall'; }

  /* the best piece in the bag, judged on every stat together (the same comparison the bag arrows use) */
  function bestGear(h) { let best = null; h.inv.forEach((it, i) => { if (!it || !it.slot || !canUse(it)) return; let c; try { c = itemCmp(it); } catch (_) { return; } if (c.v > .02 && (!best || c.v > best.c.v)) best = { it, i, c }; }); return best; }

  /* talents: an empty row first; then a stat-only row where another card adds more for this hero's gear, or a card that changes a skill you have taken off your bar */
  function talentTip(h) {
    let open0 = 0; try { open0 = talOpen(h); } catch (_) { }
    if (open0 > 0) return { k: 'tal-open:' + h.level, pri: 80, t: open0 > 1 ? 'Pick your ' + open0 + ' talent cards' : 'Pick your new talent card', d: 'You unlocked ' + (open0 > 1 ? open0 + ' talent rows' : 'a talent row') + ' and have not chosen yet. A card is free power.', a: ['Open talents', () => UI.toggleSkl(true)] };
    const rows = talRows(h.cls), orig = h.tal, t = Array.isArray(h.tal) ? h.tal.slice() : [], bar = new Set((h.bar || []).filter(Boolean));
    const val = () => { const v = gearValue(calcStats(h.eq, 1)); return Math.log(Math.max(1, v.dps)) + Math.log(Math.max(1, v.tough)) + Math.log(v.util); };
    let out = null;
    try {
      for (let r = 0; r < rows.length; r++) {
        const k = t[r]; if (!(k === 0 || k === 1 || k === 2) || h.level < TAL_LV[r] || !rows[r][k]) continue; const cur = rows[r][k];
        if (cur.fx && !Object.keys(cur.fx).some(id => bar.has(id))) { const alt = rows[r].findIndex((c, j) => j !== k && (!c.fx || Object.keys(c.fx).some(id => bar.has(id)))); if (alt >= 0) { out = { k: 'tal-bar:' + r + ':' + k, pri: 55, t: 'Swap ' + cur.n + ' for ' + rows[r][alt].n, d: cur.n + ' only changes ' + Object.keys(cur.fx).map(id => (SKILLS[id] || {}).n || id).join(', ') + ', which is not on your skill bar. ' + rows[r][alt].n + ': ' + rows[r][alt].d, a: ['Open talents', () => UI.toggleSkl(true)] }; break; } }
        if (rows[r].every(c => c.s && !c.fx)) { /* stat cards: try each one on this hero, then put the talents back exactly as they were */
          h.tal = t.slice(); const base = val(); let bk = k, bv = base; for (let j = 0; j < rows[r].length; j++) { if (j === k) continue; h.tal = t.slice(); h.tal[r] = j; const v = val(); if (v > bv) { bv = v; bk = j; } } h.tal = t.slice();
          if (bk !== k && bv - base > .03) { out = { k: 'tal-stat:' + r + ':' + bk + ':' + Math.round((bv - base) * 100), pri: 50, t: 'Swap ' + cur.n + ' for ' + rows[r][bk].n, d: 'With the gear you wear now, ' + rows[r][bk].n + ' makes you about ' + pct(bv - base) + '% stronger overall. Swaps are free when no enemy is near.', a: ['Open talents', () => UI.toggleSkl(true)] }; break; }
        }
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
  return { think, show: v => { tips = think(); idx = 0; show(v !== false); }, W, opt };
})();
