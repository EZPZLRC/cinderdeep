'use strict';
// Online play: talks to the Cinderdeep dedicated server when the game is served by it.
const NET = (() => {
  let ws = null, acc = 0; const N = { on: false, id: 0, peers: {}, names: {}, cls: {}, room: '' }, r2 = v => Math.round(v * 100) / 100;
  const STN = ['chase', 'wind', 'rec', 'charge'], WT = ['sword', 'axe', 'maul', 'staff', 'bow', 'fist'], ISL = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet', 'ring'];
  const txt = (v, n) => String(v == null ? '' : v).replace(/[<>&"'`]/g, '').slice(0, n);
  function cleanItem(i) {
    if (!i || typeof i !== 'object' || !ISL.includes(i.slot) || !Array.isArray(i.aff)) return null;
    const o = { id: itemId++, slot: i.slot, rar: clamp(i.rar | 0, 0, 4), ilvl: clamp(i.ilvl | 0, 1, 99), aff: [], name: txt(i.name, 64) || 'Item', base: txt(i.base, 24) };
    for (const a of i.aff.slice(0, 6)) if (a && STATS[a.k] && isFinite(+a.v)) o.aff.push({ k: a.k, v: +a.v });
    if (i.slot === 'weapon') { if (!Array.isArray(i.dmg) || !isFinite(+i.dmg[0]) || !isFinite(+i.dmg[1])) return null; o.dmg = [Math.max(1, +i.dmg[0]), Math.max(1, +i.dmg[1])]; o.spd = clamp(+i.spd || 1, .5, 2.5); o.wt = WT.includes(i.wt) ? i.wt : 'sword'; }
    else if (isFinite(+i.armor) && i.armor > 0) o.armor = +i.armor;
    if (i.fd) o.fd = 1; if (i.up > 0 && i.up <= 5) o.up = i.up | 0; if (i.sd > 0 && i.sd < 2147483647) o.sd = i.sd | 0; if (i.slot === 'offhand' && CLASSES[i.oc]) o.oc = i.oc; if (i.power && POWERS[i.power]) o.power = i.power; return o;
  }
  const find = id => G.ents.find(e => e.id === id);
  function handle(m) {
    if (m.t === 's' && m.o !== undefined) N.online = m.o;
    if (G.inTown && (m.t === 's' || m.t === 'spawn' || m.t === 'die' || m.t === 'dmg' || m.t === 'area' || m.t === 'proj' || m.t === 'fx')) return;
    if (G.inTown && m.t === 'zone' && !m.sync) { hint('Your party has moved deeper. Take the portal to rejoin them.'); return; }
    switch (m.t) {
      case 'hello': N.id = m.id; N.room = m.room; N.on = true; G.online = true; G.speed = 1; break;
      case 'error': UI.netFail(m.m); break;
      case 'zone': if (N.retry > 0) { if (N.back && N.back.seed === m.seed) { m.sync = 1; m.pos = [N.back.x, N.back.z]; } N.retry = 0; N.back = null; UI.reconnecting(0); if (G.inTown) { G.away = null; } } if (m.sync && G.away && G.away.seed === m.seed) m.pos = [G.away.x, G.away.z]; enterZone(m); if (m.cleared && m.bossAt) { G.zone.cleared = true; G.zone.objs.push({ kind: 'portal', x: m.bossAt[0], z: m.bossAt[1], name: 'Next floor', used: false }); } UI.netZone(); break;
      case 's': {
        for (const a of m.e) { const e = find(a[0]); if (!e || !e.alive) continue; e.tx = a[1]; e.tz = a[2]; e.trot = a[3]; e.hp = a[4] > e.hp + e.maxHp * .04 ? a[4] : Math.min(e.hp, a[4]); e.st = STN[a[5]] || 'chase'; if (!e.awake) { e.awake = true; if (e.boss) { SFX.play('boss'); UI.zoneBanner(e.name, 'Guardian of the Hollow'); } } }
        const seen = {};
        for (const a of m.p) {
          if (!a || a[0] === N.id) continue; seen[a[0]] = 1; let p = N.peers[a[0]];
          if (!p) p = N.peers[a[0]] = { id: a[0], x: a[1], z: a[2], y: 0, rot: a[3], walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, a: 0, name: N.names[a[0]] || 'Hero', cls: N.cls[a[0]] || 'warden' };
          p.tx = a[1]; p.tz = a[2]; p.trot = a[3]; p.tmv = a[4]; if (Math.hypot(p.tx - p.x, p.tz - p.z) > 18) { p.x = p.tx; p.z = p.tz; } p.hp = a[6]; p.lvl = a[7]; p.dead = !!a[8]; if (a[9] !== p.gc) { p.gc = a[9]; p.gear = gearDecode(a[9]); }
          if (a[5] !== p.a) { p.a = a[5]; p.swing = 0; p.act = a[5] === 1 ? { sk: { type: 'melee' } } : a[5] === 2 ? { sk: { type: 'nova' } } : null; p.spin = a[5] === 3 ? { sk: SKILLS.whirl } : null; if (!CLASSES[p.cls]) p.cls = 'warden'; p.dash = a[5] === 4; }
        }
        for (const id in N.peers) if (!seen[id]) delete N.peers[id];
        break;
      }
      case 'spawn': for (const i of m.ents) { addReplica(i); const e = find(i.id); if (e) ring(e.x, e.z, 0, 2, .4, e.md.e); } break;
      case 'die': { const e = find(m.id); if (e && e.alive) { e.hp = 0; killEnemy(e); } break; }
      case 'dmg': dmgPlayer(+m.v || 0, m.el === 'fire' || m.el === 'cold' || m.el === 'light' ? m.el : 'phys', m.src ? find(m.src) : null); break;
      case 'area': addArea({ x: +m.x, z: +m.z, r: +m.r, delay: +m.delay, owner: 'e', vis: 1, dmg: 0, el: 'phys', c: m.c | 0 }); break;
      case 'proj': G.projs.push({ x: +m.x, z: +m.z, vx: +m.vx, vz: +m.vz, life: 3, r: .45, dmg: 0, el: 'phys', vis: 1, c: GLX.col(m.c | 0) }); break;
      case 'fx': if (m.k === 'p') G.projs.push({ x: +m.x, z: +m.z, vx: Math.sin(+m.rot) * +m.r, vz: Math.cos(+m.rot) * +m.r, life: clamp(+m.arc || .5, .1, 2), r: .4, dmg: 0, el: 'phys', vis: 1, peer: 1, c: GLX.col(m.c | 0) }); else if (m.k === 's') G.fx.push({ slash: 1, x: +m.x, z: +m.z, rot: +m.rot, r: +m.r, arc: +m.arc, life: .16, max: .16, c: GLX.col(0xfff0d0) }); else ring(+m.x, +m.z, .5, +m.r, .35, m.c || 0xffc890); break;
      case 'chat': UI.chat(txt(m.n, 16), txt(m.m, 140), m.g ? 'g' : 'p'); break;
      case 'found': UI.chat('', txt(m.n, 16) + ' found a ' + (m.r === 4 ? 'Mythic' : 'Legendary') + ' item: ' + txt(m.item, 60), m.r === 4 ? 'm' : 'l'); if (m.r === 4) SFX.play('drop1'); break;
      case 'join': if (m.name !== N.me) UI.chat('', txt(m.name, 16) + ' joined the party.', 's'); break;
      case 'leave': delete N.peers[m.id]; if (m.name !== N.me) UI.chat('', txt(m.name, 16) + ' left the party.', 's'); break;
      case 'players': N.names = {}; N.cls = {}; for (const p of m.list) { N.names[p.id] = txt(p.name, 16); N.cls[p.id] = CLASSES[p.cls] ? p.cls : 'warden'; if (N.peers[p.id]) { N.peers[p.id].name = N.names[p.id]; N.peers[p.id].cls = N.cls[p.id]; } } N.count = m.list.length; break;
      case 'give': { const it = cleanItem(m.item); if (!it) break; if (addItem(it)) { hint(txt(m.n, 16) + (m.back ? ' could not carry it, so it came back: ' : ' gave you ') + it.name + '.'); UI.invDirty = true; saveGame(); } else if (!m.back) N.send({ t: 'give', to: m.from, item: m.item, back: true }); break; }
    }
  }
  N.status = async () => { try { if (!/^https?:$/.test(location.protocol)) return null; const r = await fetch('cinderdeep-server', { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); return j && j.cinderdeep ? j : null; } catch (e) { return null; } };
  N.probe = async () => { try { if (!/^https?:$/.test(location.protocol)) return false; const r = await fetch('cinderdeep-server', { cache: 'no-store' }); if (!r.ok) return false; const j = await r.json(); return !!(j && j.cinderdeep); } catch (e) { return false; } };
  N.close = () => { if (ws) { N.quit = true; N.on = false; G.online = false; N.peers = {}; try { ws.close(); } catch (e) { } ws = null; } };
  N.send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  N.connect = (name, room) => { N.me = name;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { UI.netFail('Could not reach the server.'); return; }
    ws.onopen = () => N.send({ t: 'join', name, room, lvl: G.hero.level, cls: G.hero.cls });
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } handle(m); };
    ws.onclose = () => { if (N.quit) { N.quit = false; return; } const was = N.on || N.retry > 0; N.on = false; N.peers = {}; ws = null; if (was && G.state === 'play') { if (!(N.retry > 0)) { N.retry = 0; N.back = G.inTown ? null : { seed: G.zone.def.seed, x: P.x, z: P.z }; } N.retry++; if (N.retry > 12) { N.retry = 0; G.online = false; UI.lost('The connection to the server was lost. Press Play online to rejoin.'); return; } P.iframes = Math.max(P.iframes || 0, 6); UI.reconnecting(N.retry); setTimeout(() => { if (G.state === 'play' && N.retry > 0) N.connect(N.me, N.room); }, N.retry === 1 ? 800 : 3000); } else if (was) { N.retry = 0; G.online = false; } else if (!was) UI.netFail('Could not reach the server. Try again in a minute; a sleeping server takes about a minute to wake.'); };
  };
  N.tick = dt => {
    for (const id in N.peers) {
      const p = N.peers[id], k = Math.min(1, dt * 10), ox = p.x, oz = p.z; p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; let da = p.trot - p.rot; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832; p.rot += da * k;
      p.walk += Math.hypot(p.x - ox, p.z - oz) * 1.5; p.mv += ((p.tmv ? 1 : 0) - p.mv) * Math.min(1, dt * 12); p.y = p.dash ? 1.6 : 0; if (p.act) { p.swing += dt / .4; if (p.swing >= 1) p.swing = 0; }
    }
    acc += dt; if (acc >= .1) { acc = 0; N.send({ t: 'p', x: r2(P.x), z: r2(P.z), r: r2(P.rot), mv: P.moving ? 1 : 0, a: P.spin ? 3 : P.dash ? 4 : P.act ? (P.act.sk.type === 'nova' ? 2 : 1) : 0, hp: Math.round(clamp(P.hp / P.stats.maxLife, 0, 1) * 100), lvl: G.hero.level, dead: P.dead || G.inTown ? 1 : 0, g: P.gc || '' }); }
  };
  return N;
})();
