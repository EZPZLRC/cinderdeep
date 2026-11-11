'use strict';
const UI = (() => {
  const $ = id => document.getElementById(id);
  const glc = $('gl'), ov = $('ov'), ctx = ov.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d'), tip = $('tip');
  let slow = .016, slowN = 0, banT = 0, invOpen = false, last = 0, skEls = [], frameN = 0;
  const U = { invDirty: true };
  U.zoneBanner = (a, b) => { $('ban1').textContent = a; $('ban2').textContent = b || ''; $('banner').classList.add('on'); banT = 3.4; };
  U.showDeath = () => { $('death').classList.remove('hide'); };

  // ---- tooltips ----
  function wdps(it) { return (it.dmg[0] + it.dmg[1]) / 2 * it.spd; }
  const score = itemScore;
  function eqFor(it) { const h = G.hero; if (it.slot === 'ring') return h.eq.ring1 && h.eq.ring2 ? (score(h.eq.ring1) <= score(h.eq.ring2) ? h.eq.ring1 : h.eq.ring2) : null; return h.eq[it.slot] || null; }
  function tipHtml(it, cmp, equipped) {
    let h = `<div class="tn" style="color:${RAR[it.rar].c}">${it.name}</div><div class="ts">${RAR[it.rar].n} ${it.rar > 1 ? it.base : SLOT_NAME[it.slot]} · Item level ${it.ilvl}</div>`;
    if (it.dmg) h += `<div class="tb">${it.dmg[0]}–${it.dmg[1]} damage · ${it.spd.toFixed(2)} attacks/s</div>`;
    if (it.armor) h += `<div class="tb">${it.armor} armor</div>`;
    for (const a of it.aff) h += `<div class="ta">${statText(a.k, a.v)}</div>`;
    if (it.power) h += `<div class="tp">${POWERS[it.power].d}</div>`;
    if (cmp && cmp !== it) {
      if (it.dmg && cmp.dmg) { const d = Math.round((wdps(it) / wdps(cmp) - 1) * 100); h += `<div class="tc ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${d}% weapon damage vs equipped</div>`; }
      else if (it.armor !== undefined && cmp.armor !== undefined) { const d = it.armor - cmp.armor; h += `<div class="tc ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${d} armor vs equipped</div>`; }
    }
    h += `<div class="th">${equipped ? 'Click to unequip' : 'Click to equip · Right-click to scrap (' + itemValue(it) + ' gold)' + (G.online ? ' · Shift-click to give to the nearest player' : '')}</div>`; return h;
  }
  function showTip(html, x, y) { tip.innerHTML = html; tip.classList.remove('hide'); const r = tip.getBoundingClientRect(); let tx = x - r.width - 14, ty = y + 12; if (tx < 6) tx = x + 16; if (ty + r.height > innerHeight - 6) ty = innerHeight - r.height - 6; tip.style.left = tx + 'px'; tip.style.top = Math.max(6, ty) + 'px'; }
  function hideTip() { if (!tip.classList.contains('pin')) tip.classList.add('hide'); }
  function unpin() { tip.classList.remove('pin'); tip.classList.add('hide'); tip.style.transform = ''; }
  function sheet(it, key, equipped) {
    tip.innerHTML = tipHtml(it, equipped ? null : eqFor(it), equipped).replace(/<div class="th">.*?<\/div>/, '') + `<div class="acts">${equipped ? '<button data-a="un">Unequip</button>' : '<button data-a="eq">Equip</button><button data-a="sc">Scrap · ' + itemValue(it) + 'g</button>' + (G.online ? '<button data-a="gv">Give to nearest</button>' : '')}<button data-a="x">Close</button></div>`;
    tip.dataset.k = key; tip.classList.remove('hide'); tip.classList.add('pin'); tip.style.left = '50%'; tip.style.top = '50%'; tip.style.transform = 'translate(-50%,-50%)';
  }
  tip.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (!a) return; const k = tip.dataset.k; if (a === 'eq') equipFromInv(+k); else if (a === 'sc') scrapItem(+k); else if (a === 'un') unequip(k); else if (a === 'gv') giveItem(+k); unpin(); renderInv(); });

  // ---- inventory ----
  function cellHtml(it, attr, up) { if (!it) return `<div class="cell empty" ${attr}></div>`; return `<div class="cell${up ? ' up' : ''}" ${attr} style="border-color:${RAR[it.rar].c};color:${RAR[it.rar].c}">${SLOT_ICON[it.slot]}<span class="lv">${it.ilvl}</span></div>`; }
  function renderInv() {
    const h = G.hero, s = P.stats; U.invDirty = false;
    $('eq').innerHTML = SLOTS.map(sl => h.eq[sl] ? cellHtml(h.eq[sl], `data-e="${sl}"`) : `<div class="cell empty" title="${SLOT_NAME[sl]}">${SLOT_ICON[sl.replace(/\d/, '')]}</div>`).join('');
    $('grid').innerHTML = h.inv.map((it, i) => { let up = false; if (it) { const e = eqFor(it); up = !e || score(it) > score(e); } return cellHtml(it, `data-i="${i}"`, up); }).join('');
    $('bagN').textContent = '(' + h.inv.filter(x => x).length + '/40)';
    const L = (a, b) => `<div>${a}: <b>${b}</b></div>`;
    $('stats').innerHTML = L('Level', h.level) + L('Damage per second', s.dps) + L('Weapon', s.wmin + '–' + s.wmax) + L('Life', s.maxLife) + L('Armor', s.armorT) + L('Critical chance', s.critT.toFixed(1) + '%') + L('Critical damage', Math.round(s.critM * 100) + '%')
      + L('Attack speed', '+' + Math.round(s.aspd) + '%') + L('Move speed', '+' + Math.round(s.ms) + '%') + L('Fire / Cold / Lightning res', Math.round(s.rfire) + ' / ' + Math.round(s.rcold) + ' / ' + Math.round(s.rlight) + '%')
      + L('Dodge', Math.round(s.dodgeT) + '%') + L('Magic find', '+' + Math.round(s.mf) + '%') + L('Gold find', '+' + Math.round(s.gf) + '%') + L('Kills', h.kills) + L('Best streak', h.best || 0) + L('Guardians slain', h.runs);
  }
  function toggleInv(v) { invOpen = v === undefined ? !invOpen : v; $('inv').classList.toggle('hide', !invOpen); hideTip(); if (invOpen) renderInv(); }
  $('inv').addEventListener('click', e => { const c = e.target.closest('.cell'); if (!c) return; if (lastTouch) { const h = G.hero; if (c.dataset.i !== undefined && h.inv[+c.dataset.i]) sheet(h.inv[+c.dataset.i], c.dataset.i, false); else if (c.dataset.e) sheet(h.eq[c.dataset.e], c.dataset.e, true); return; } if (c.dataset.i !== undefined) { if (e.shiftKey && G.online) giveItem(+c.dataset.i); else equipFromInv(+c.dataset.i); } else if (c.dataset.e) unequip(c.dataset.e); hideTip(); renderInv(); });
  $('inv').addEventListener('contextmenu', e => { e.preventDefault(); const c = e.target.closest('.cell'); if (c && c.dataset.i !== undefined) { scrapItem(+c.dataset.i); hideTip(); renderInv(); } });
  $('inv').addEventListener('mousemove', e => { if (lastTouch) return; const c = e.target.closest('.cell'); if (!c) return hideTip(); const h = G.hero; if (c.dataset.i !== undefined) { const it = h.inv[+c.dataset.i]; if (it) showTip(tipHtml(it, eqFor(it), false), e.clientX, e.clientY); else hideTip(); } else if (c.dataset.e) showTip(tipHtml(h.eq[c.dataset.e], null, true), e.clientX, e.clientY); else hideTip(); });
  $('inv').addEventListener('mouseleave', hideTip);
  $('scr0').onclick = () => { scrapAll(0); renderInv(); }; $('scr1').onclick = () => { scrapAll(1); renderInv(); };

  // ---- hud ----
  function buildBar() {
    const bar = $('bar'), cls = CLASSES[G.hero.cls]; bar.innerHTML = ''; skEls = []; $('gFury').firstElementChild.style.background = cls.res.c;
    for (let i = 0; i < 5; i++) {
      const sk = i < 4 ? (SKILLS[G.hero.bar[i]] || { i: '＋', n: 'Empty slot', d: 'Open Skills to choose a skill for this slot.' }) : { i: '✚', n: 'Health Potion', d: 'Restores 60% of your life. 30 second cooldown.' }; const d = document.createElement('div'); d.className = 'sk'; d.style.pointerEvents = 'auto';
      d.innerHTML = `<span class="key">${i < 4 ? SLOT_KEY[i] : '1'}</span><span class="ic"${i === 4 ? ' style="color:#ff5a5a"' : ''}>${sk.i}</span><div class="cd"></div><div class="cdt"></div>${sk.cost ? `<span class="cost">${sk.cost}</span>` : ''}`;
      const dn = e => { e.preventDefault(); SFX.unlock(); if (i < 4) IN.tb[i] = true; else useFlask(); }, upb = () => { if (i < 4) IN.tb[i] = false; };
      d.addEventListener('pointerdown', dn); d.addEventListener('pointerup', upb); d.addEventListener('pointerleave', upb); d.addEventListener('pointercancel', upb); d.addEventListener('contextmenu', e => { e.preventDefault(); if (i < 4) toggleSkl(true, i); });
      d.addEventListener('mousemove', e => !lastTouch && showTip(`<div class="tn">${sk.n}</div><div class="ts">${sk.d}</div>${sk.cost ? `<div class="tp">Costs ${sk.cost} ${cls.res.n}</div>` : ''}${sk.gen ? `<div class="tp">Generates ${sk.gen} ${cls.res.n} per enemy hit</div>` : ''}${sk.cd ? `<div class="ts">Cooldown ${sk.cd}s</div>` : ''}`, e.clientX, e.clientY - 140));
      d.addEventListener('mouseleave', hideTip); bar.appendChild(d); skEls.push(d);
    }
  }
  // ---- skills panel ----
  let sklOpen = false, sklSlot = 1;
  function renderSkl() {
    const h = G.hero; let html = '<h3>Skills</h3><div class="tabs">' + [0, 1, 2, 3].map(i => `<button data-s="${i}" class="${i === sklSlot ? 'on' : ''}">${SLOT_KEY[i]}<br><span>${h.bar[i] ? SKILLS[h.bar[i]].i : '＋'}</span></button>`).join('') + '</div><div class="list">';
    const RN = CLASSES[h.cls].res.n; for (const id of CLASSES[h.cls].skills) {
      const sk = SKILLS[id]; if (!!sk.basic !== (sklSlot === 0)) continue; const locked = h.level < sk.lv, on = h.bar[sklSlot] === id, else_ = !on && h.bar.includes(id);
      html += `<div class="srow${on ? ' on' : ''}${locked ? ' lock' : ''}" data-k="${id}"><div class="si">${sk.i}</div><div><b>${sk.n}</b> <span class="sm">${locked ? 'Unlocks at level ' + sk.lv : (sk.cost ? sk.cost + ' ' + RN : sk.gen ? 'Builds ' + RN : 'Free') + (sk.cd ? ' · ' + sk.cd + 's cooldown' : '') + (on ? ' · equipped here' : else_ ? ' · on ' + SLOT_KEY[h.bar.indexOf(id)] : '')}</span><div class="sd">${sk.d}</div></div></div>`;
    }
    $('skl').innerHTML = html + '</div><div class="sm" style="margin-top:8px">Pick a slot, then pick a skill. You can swap at any time, even mid-fight.</div>';
  }
  function toggleSkl(v, slot) { sklOpen = v === undefined ? !sklOpen : v; if (slot !== undefined) sklSlot = slot; $('skl').classList.toggle('hide', !sklOpen); if (sklOpen) renderSkl(); }
  $('skl').addEventListener('click', e => { const t = e.target.closest('[data-s]'); if (t) { sklSlot = +t.dataset.s; renderSkl(); return; } const r = e.target.closest('.srow'); if (r && setSkill(sklSlot, r.dataset.k)) { buildBar(); renderSkl(); } });
  U.buildBar = () => { buildBar(); if (sklOpen) renderSkl(); };
  function hud(dt) {
    const h = G.hero, s = P.stats, cls = CLASSES[h.cls];
    $('gLife').firstElementChild.style.height = clamp(P.hp / s.maxLife * 100, 0, 100) + '%'; $('gLife').lastElementChild.textContent = Math.ceil(P.hp) + ' / ' + s.maxLife;
    $('gFury').firstElementChild.style.height = clamp(P.mana / s.maxMana * 100, 0, 100) + '%'; $('gFury').lastElementChild.textContent = Math.floor(P.mana) + ' ' + cls.res.n;
    for (let i = 0; i < 5; i++) {
      const el = skEls[i]; if (!el) continue; let cd = 0, max = 1, lock = false, dim = false;
      if (i < 4) { const id = h.bar[i], sk = id && SKILLS[id]; if (sk) { cd = P.cds[id] || 0; max = sk.cd || 1; dim = P.mana < (sk.cost || 0); } else lock = true; } else { cd = P.flaskCd || 0; max = 30; }
      el.classList.toggle('lock', lock); el.classList.toggle('dim', dim); el.children[2].style.height = cd > 0 ? clamp(cd / max * 100, 0, 100) + '%' : '0'; el.children[3].textContent = cd > 0 ? Math.ceil(cd) : '';
    }
    $('xp').firstElementChild.style.width = (h.level >= MAX_LEVEL ? 100 : h.xp / xpNeed(h.level) * 100) + '%';
    $('tName').textContent = cls.n + ' · Level ' + h.level + (G.online ? ' · Online: ' + NET.room + ' (' + (NET.count || 1) + ')' : '');
    $('bAuto').textContent = 'Auto-play: ' + (G.auto ? 'ON' : 'off'); $('bAuto').classList.toggle('on', G.auto); $('bSpd').textContent = 'Speed ' + (G.online ? 1 : G.speed) + '×'; $('bSpd').classList.toggle('hide', G.online); $('tChat').classList.toggle('hide', !G.online); $('tGold').textContent = h.gold.toLocaleString() + ' gold'; $('tZone').textContent = G.zone.def.name + ' · monster level ' + G.zone.def.lvl + (h.filter ? ' · hiding ' + (h.filter === 1 ? 'Common' : 'Common + Magic') + ' loot' : '');
    const b = G.boss; $('bossbar').classList.toggle('hide', !(b && b.awake && b.alive)); if (b && b.awake) { $('bossName').textContent = b.name; $('bossFill').style.width = clamp(b.hp / b.maxHp * 100, 0, 100) + '%'; }
    $('streak').classList.toggle('hide', G.streak < 3); if (G.streak >= 3) { $('st1').textContent = G.streak; $('st3').textContent = '+' + Math.min(G.streak, 50) * 2 + '% drop luck'; $('streak').style.opacity = clamp(G.streakT / 1.2, .25, 1); }
    if (banT > 0) { banT -= dt; if (banT <= 0) $('banner').classList.remove('on'); }
    const hs = G.hints.map(x => x.t).join('\n'); if (hs !== hud.last) { hud.last = hs; $('hints').innerHTML = ''; for (const x of G.hints) { const d = document.createElement('div'); d.textContent = x.t; $('hints').appendChild(d); } }
    if (invOpen && U.invDirty) renderInv();
  }

  // ---- overlay ----
  function drawOv() {
    const d = window.devicePixelRatio || 1, w = ov.clientWidth, h = ov.clientHeight; if (ov.width !== Math.floor(w * d) || ov.height !== Math.floor(h * d)) { ov.width = Math.floor(w * d); ov.height = Math.floor(h * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h); G.labels.length = 0; if (G.state !== 'play') return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const txt = (s, x, y, c, f) => { ctx.font = f; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = c; ctx.fillText(s, x, y); };
    for (const e of G.ents) {
      if (!e.alive || !e.awake || e.boss) continue; const show = e.hp < e.maxHp || e.elite || G.hover === e; if (!show) continue;
      const sp = GLX.toScreen(e.x, e.sc * 2.1 + .5, e.z); if (!sp) continue; const bw = e.elite ? 60 : 38;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(sp[0] - bw / 2 - 1, sp[1] - 3, bw + 2, 6); ctx.fillStyle = e.elite === 2 ? '#ffd84a' : e.elite === 1 ? '#6a9cff' : '#e0482a'; ctx.fillRect(sp[0] - bw / 2, sp[1] - 2, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
      if (e.elite || G.hover === e) txt(e.name, sp[0], sp[1] - 12, e.elite === 2 ? '#ffd84a' : e.elite === 1 ? '#8fb4ff' : '#e8e2d4', '600 12px system-ui,sans-serif');
    }
    const ls = [];
    for (const dr of G.drops) { if (!dr.item || dr.item.rar < G.hero.filter || Math.hypot(dr.x - P.x, dr.z - P.z) > 30) continue; const sp = GLX.toScreen(dr.x, 1, dr.z); if (sp) ls.push({ d: dr, x: sp[0], y: sp[1] - 16 }); }
    ls.sort((a, b) => b.y - a.y); ctx.font = '600 12.5px system-ui,sans-serif';
    for (const l of ls) {
      const it = l.d.item, tw = ctx.measureText(it.name).width + 14; const r = { x: l.x - tw / 2, y: l.y - 10, w: tw, h: 20, d: l.d };
      for (let k = 0; k < 10; k++) { if (G.labels.some(o => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y)) r.y -= 22; else break; }
      const hov = IN.sx >= r.x && IN.sx <= r.x + r.w && IN.sy >= r.y && IN.sy <= r.y + r.h;
      ctx.fillStyle = hov ? 'rgba(60,50,30,.95)' : 'rgba(0,0,0,.78)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = RAR[it.rar].c; ctx.lineWidth = it.rar >= 2 ? 1.5 : .75; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
      ctx.fillStyle = RAR[it.rar].c; ctx.fillText(it.name, r.x + r.w / 2, r.y + 10.5); G.labels.push(r);
    }
    for (const t of G.texts) { const sp = GLX.toScreen(t.x, t.y, t.z); if (!sp) continue; ctx.globalAlpha = clamp(t.life / t.max * 2, 0, 1); txt(t.txt, sp[0], sp[1], t.col, '700 ' + t.size + 'px system-ui,sans-serif'); }
    ctx.globalAlpha = 1;
    if (G.online) for (const id in NET.peers) { const q = NET.peers[id]; if (q.dead) continue; const sp = GLX.toScreen(q.x, 2.9, q.z); if (!sp) continue; txt(q.name + ' · ' + (q.lvl || 1), sp[0], sp[1] - 8, '#9fd0ff', '600 12px system-ui,sans-serif'); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(sp[0] - 23, sp[1] + 1, 46, 5); ctx.fillStyle = '#4ad06a'; ctx.fillRect(sp[0] - 22, sp[1] + 2, 44 * clamp((q.hp || 0) / 100, 0, 1), 3); }
    if (G.hoverObj) { const o = G.hoverObj, sp = GLX.toScreen(o.x, 3.4, o.z); if (sp) txt(o.name, sp[0], sp[1], '#ffe9a8', '600 13px system-ui,sans-serif'); }
    if (++frameN % 3 === 0) drawMini();
  }
  function drawMini() {
    const Z = G.zone, S = 170, k = 4.2, pcx = P.x / CS, pcz = P.z / CS; mctx.clearRect(0, 0, S, S);
    const X = cx => S / 2 + (cx - pcx) * k, Y = cz => S / 2 + (cz - pcz) * k; mctx.fillStyle = 'rgba(190,200,170,.5)';
    const x0 = Math.max(0, Math.floor(pcx - 21)), x1 = Math.min(GW - 1, Math.ceil(pcx + 21)), y0 = Math.max(0, Math.floor(pcz - 21)), y1 = Math.min(GW - 1, Math.ceil(pcz + 21));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Z.seen[y * GW + x] && !Z.cell[y * GW + x]) mctx.fillRect(X(x), Y(y), k + .5, k + .5);
    const dot = (wx, wz, c, r) => { const x = X(wx / CS), y = Y(wz / CS); if (x < 0 || y < 0 || x > S || y > S) return; mctx.fillStyle = c; mctx.beginPath(); mctx.arc(x, y, r, 0, 6.3); mctx.fill(); };
    for (const o of Z.objs) { if (o.used || !Z.seen[Math.floor(o.z / CS) * GW + Math.floor(o.x / CS)]) continue; dot(o.x, o.z, o.kind === 'chest' ? '#ffd84a' : o.kind === 'shrine' ? '#7affc0' : '#7ad0ff', o.kind === 'portal' ? 5 : 3); }
    for (const e of G.ents) if (e.alive && e.awake) dot(e.x, e.z, e.boss ? '#ff3a2a' : e.elite ? '#ffb03a' : '#e0482a', e.boss ? 5 : e.elite ? 3 : 1.8);
    for (const d of G.drops) if (d.item && d.item.rar >= 2) dot(d.x, d.z, RAR[d.item.rar].c, 2.5);
    if (G.boss && !G.boss.awake) { const bx = clamp(X(Z.bossAt[0] / CS), 8, S - 8), by = clamp(Y(Z.bossAt[1] / CS), 8, S - 8); mctx.fillStyle = '#ff3a2a'; mctx.font = '700 14px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('☠', bx, by); }
    if (G.online) for (const id in NET.peers) dot(NET.peers[id].x, NET.peers[id].z, '#5ab0ff', 3);
    mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(S / 2, S / 2, 3, 0, 6.3); mctx.fill();
  }

  // ---- input ----
  let mvId = null, lastTouch = false, pinch = null; const tch = new Map();
  const pdist = () => { const a = [...tch.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; };
  window.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; if (!e.target.closest || !e.target.closest('#tip')) unpin(); }, true);
  const pos = e => { const r = glc.getBoundingClientRect(); IN.sx = e.clientX - r.left; IN.sy = e.clientY - r.top; };
  glc.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') { if (tch.has(e.pointerId)) tch.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && tch.size >= 2) { G.zoom = clamp(pinch.z * pinch.d / pdist(), .4, 1.6); return; } if (e.pointerId !== mvId) return; }
    pos(e);
  });
  glc.addEventListener('pointerdown', e => {
    const touch = e.pointerType === 'touch'; SFX.unlock(); if (G.state !== 'play') return; e.preventDefault();
    if (touch) { tch.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { glc.setPointerCapture(e.pointerId); } catch (_) { } if (tch.size === 2) { pinch = { d: pdist(), z: G.zoom }; IN.lmb = false; IN.lmbFresh = false; P.move = P.atk = null; mvId = null; return; } if (tch.size > 2 || mvId !== null) return; mvId = e.pointerId; }
    IN.touch = touch; pos(e);
    if (touch || e.button === 0) {
      if (G.camReady) { const g = GLX.groundAt(IN.sx, IN.sy); if (isFinite(g[0]) && isFinite(g[1])) { IN.gx = g[0]; IN.gz = g[1]; } computeHover(); }
      IN.lmb = true; IN.lmbFresh = true; P.pickNow = null; const pad = touch ? 10 : 0;
      for (const l of G.labels) if (IN.sx >= l.x - pad && IN.sx <= l.x + l.w + pad && IN.sy >= l.y - pad && IN.sy <= l.y + l.h + pad) { P.pickNow = l.d; break; }
    } else if (e.button === 2) IN.rmb = true;
  });
  const up = e => { if (e.pointerType === 'touch') { tch.delete(e.pointerId); if (tch.size < 2) pinch = null; if (e.pointerId === mvId) { mvId = null; IN.lmb = false; IN.sx = IN.sy = -9999; } return; } if (e.button === 0) IN.lmb = false; else if (e.button === 2) IN.rmb = false; };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  glc.addEventListener('contextmenu', e => e.preventDefault());
  glc.addEventListener('wheel', e => { e.preventDefault(); G.zoom = clamp(G.zoom + Math.sign(e.deltaY) * .08, .4, 1.6); }, { passive: false });
  window.addEventListener('blur', () => { IN.lmb = IN.rmb = IN.shift = false; IN.keys = {}; IN.tb = [false, false, false, false]; mvId = null; });
  $('tBag').onclick = () => { toggleSkl(false); toggleInv(); }; $('tSkl').onclick = () => { toggleInv(false); toggleSkl(); }; $('tLoot').onclick = () => pickupNear();
  window.addEventListener('error', e => { const d = $('err'); d.textContent = 'Something went wrong: ' + (e.message || 'unknown error'); d.classList.remove('hide'); });
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT')) { if (e.target.id === 'chat') { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) NET.send({ t: 'chat', m: v }); e.target.value = ''; e.target.classList.add('hide'); e.target.blur(); } else if (e.key === 'Escape') { e.target.classList.add('hide'); e.target.blur(); } } return; }
    IN.shift = e.shiftKey; if (G.state !== 'play' || e.ctrlKey || e.metaKey) return; const k = e.key.toLowerCase(); IN.keys[k] = true;
    if (e.repeat) return;
    if (k === '1') useFlask(); else if (k === 'i' || k === 'c' || k === 'b') toggleInv(); else if (k === 's' || k === 'k') toggleSkl(); else if (k === ' ' || k === 'f') { e.preventDefault(); pickupNear(); }
    else if (k === 'z') { G.hero.filter = (G.hero.filter + 1) % 3; hint(['Showing all loot.', 'Hiding Common loot.', 'Hiding Common and Magic loot.'][G.hero.filter]); }
    else if (k === 'm') hint(SFX.toggle() ? 'Sound off.' : 'Sound on.'); else if (k === 'a') toggleAuto(); else if (k === 'x') cycleSpeed(); else if (k === 'enter' && G.online) { e.preventDefault(); openChat(); } else if (k === 'escape') { toggleInv(false); toggleSkl(false); }
  });
  window.addEventListener('keyup', e => { IN.shift = e.shiftKey; IN.keys[e.key.toLowerCase()] = false; });
  function toggleAuto() { G.auto = !G.auto; BOT.path = null; P.move = P.atk = null; hint(G.auto ? 'Auto-play on. The hero now plays by itself; you can still step in.' : 'Auto-play off.'); }
  function cycleSpeed() { if (G.online) return; G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : G.speed === 4 ? 8 : 1; }
  function openChat() { const c = $('chat'); c.classList.remove('hide'); c.focus(); }
  $('bAuto').onclick = toggleAuto; $('bSpd').onclick = cycleSpeed; $('tChat').onclick = openChat;

  // ---- flow ----
  function start(hero, net) {
    G.hero = hero; SFX.unlock(); P.hp = 1e9; U.invDirty = true;
    if (net) { $('menuMsg').textContent = 'Connecting to the server…'; NET.connect(net.name, net.room); return; }
    $('menu').classList.add('hide'); $('game').classList.remove('hide'); buildBar(); enterZone();
  }
  U.netZone = () => { $('menu').classList.add('hide'); $('game').classList.remove('hide'); $('death').classList.add('hide'); buildBar(); };
  U.netFail = msg => { $('menu').classList.remove('hide'); $('menuMsg').textContent = msg; };
  NET.probe().then(ok => { if (ok) $('online').classList.remove('hide'); });
  $('btnOnline').onclick = () => { const name = $('oName').value.trim() || CLASSES[selCls].n, room = $('oRoom').value.trim(); try { localStorage.setItem('cinderdeep_name', name); } catch (e) { } start(loadGame(selCls) || newHero(selCls), { name, room }); };
  try { $('oName').value = localStorage.getItem('cinderdeep_name') || ''; } catch (e) { }
  let selCls = 'warden', resetArmed = false; try { const c = localStorage.getItem('cinderdeep_class'); if (CLASSES[c]) selCls = c; } catch (e) { }
  function renderClasses() {
    $('classes').innerHTML = CLASS_IDS.map(id => { const c = CLASSES[id], sv = loadGame(id); return `<div class="ccard${id === selCls ? ' on' : ''}" data-c="${id}"><div class="ct">${c.tag}</div><div class="cn">${c.n}</div><div class="cd2">${c.d}</div><div class="cl">${sv ? 'Level ' + sv.level : 'New hero'}</div></div>`; }).join('');
    const sv = loadGame(selCls); $('btnNew').textContent = sv ? 'Continue · Level ' + sv.level : 'Start as ' + CLASSES[selCls].n; $('btnReset').classList.toggle('hide', !sv); resetArmed = false; $('btnReset').textContent = 'Reset this hero';
  }
  $('classes').onclick = e => { const c = e.target.closest('.ccard'); if (c) { selCls = c.dataset.c; try { localStorage.setItem('cinderdeep_class', selCls); } catch (_) { } renderClasses(); } };
  $('btnNew').onclick = () => start(loadGame(selCls) || newHero(selCls));
  $('btnReset').onclick = () => { if (!resetArmed) { resetArmed = true; $('btnReset').textContent = 'Click again to erase this hero'; return; } try { localStorage.removeItem(SAVE_KEY + '_' + selCls); if (selCls === 'warden') localStorage.removeItem(SAVE_KEY); } catch (_) { } renderClasses(); };
  renderClasses();
  U.revive = () => $('revive').onclick();
  $('revive').onclick = () => {
    const Z = G.zone; P.dead = false; P.x = Z.start[0]; P.z = Z.start[1]; P.hp = P.stats.maxLife; P.mana = 0; P.iframes = 2; P.move = P.atk = P.inter = P.pick = null; G.areas.length = 0; G.projs.length = 0;
    if (G.boss && !G.online) { G.boss.hp = G.boss.maxHp; G.boss.awake = false; G.boss.st = 'chase'; G.boss.x = Z.bossAt[0]; G.boss.z = Z.bossAt[1]; }
    $('death').classList.add('hide');
  };
  function frame(t) {
    requestAnimationFrame(frame); const raw = (t - last) / 1000 || 0, dt = Math.min(.05, raw); last = t;
    if (G.state === 'play' && raw < 3) { slow = slow * .93 + raw * .07; if (++slowN > 45 && slow > .045 && GLX.env.q > 0) { GLX.env.q--; slowN = 0; slow = .02; } }
    if (G.state === 'play') {
      if (G.camReady && IN.sx > -9000) { const g = GLX.groundAt(IN.sx, IN.sy); if (isFinite(g[0]) && isFinite(g[1])) { IN.gx = g[0]; IN.gz = g[1]; } }
      const steps = G.online ? 1 : G.speed; for (let i = 0; i < steps && G.state === 'play'; i++) update(dt);
      GLX.begin(); drawWorld(); G.camReady = true; GLX.render(); hud(dt);
    }
    drawOv();
  }
  if (!GLX.init(glc)) { $('menuMsg').textContent = 'This game needs WebGL2, which this browser or device does not provide. Try a current desktop Chrome, Edge or Firefox.'; $('btnNew').classList.add('hide'); $('classes').classList.add('hide'); }
  else requestAnimationFrame(frame);
  setInterval(() => { if (G.state === 'play' && !P.dead) saveGame(); }, 20000);
  return U;
})();
