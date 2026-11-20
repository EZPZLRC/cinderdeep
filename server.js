'use strict';
const STARTED = Date.now(); // build 0073 (Lee): the build label says how long ago this build went live
// A fresh deploy starts the server within minutes of the push, so its start time is when the build went live. If the server only
// started much later (it slept and woke up), fall back to the push time plus a typical deploy, so the label never resets to "just now".
const BUILT_AT = +((/const BUILT_AT = (\d+)/.exec(require('fs').readFileSync(require('path').join(__dirname, 'public', 'js', 'data.js'), 'utf8')) || [])[1] || 0);
const LIVE_AT = BUILT_AT && STARTED - BUILT_AT > 20 * 60000 ? BUILT_AT + 4 * 60000 : STARTED;
// OathByte dedicated server. No dependencies: plain Node 18+.
// Serves the game from ./public and runs one shared world per party over WebSockets at /ws.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const PORT = process.env.PORT || 3000, PUB = process.env.PUBLIC_DIR || path.join(__dirname, 'public');
const zlib = require('zlib'); const MIME = { '.cdm': 'application/octet-stream', '.cde': 'application/octet-stream', '.cdl': 'application/octet-stream', '.jpg': 'image/jpeg', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }; // OathByte UI: logo layers are WebP, the favicon is SVG
const simSrc = ['js/data.js', 'js/game.js'].map(f => new vm.Script(fs.readFileSync(path.join(PUB, f), 'utf8'), { filename: f }));
simSrc.push(new vm.Script(fs.readFileSync(path.join(__dirname, 'sim', 'simsrv.js'), 'utf8'), { filename: 'simsrv.js' }));
const BUILD = (/const BUILD = '([^']+)'/.exec(fs.readFileSync(path.join(PUB, 'js/data.js'), 'utf8')) || [])[1] || '?';
const rooms = new Map(); let nextId = 1;
// ---- build 0075 (Lee, Nov 15): the world boss. One kill count shared by everyone on the server; when it is full the boss rises on every party's floor ----
const WB_NEED = Math.max(1, +process.env.WB_NEED || +((/const WB_NEED = (\d+)/.exec(fs.readFileSync(path.join(PUB, 'js/data.js'), 'utf8')) || [])[1]) || 1000);
const WB_FILE = path.join(process.env.LB_DIR || require('os').tmpdir(), 'oathbyte-worldboss.json');
const WB = { k: 0, n: 0, on: null }; // k: kills counted so far, n: world bosses slain, on: the living boss { f: share of life left, k: life scale, hit: names of everyone who hit it }
try { const j = JSON.parse(fs.readFileSync(WB_FILE, 'utf8')); WB.k = Math.max(0, Math.min(WB_NEED, j.k | 0)); WB.n = Math.max(0, j.n | 0); } catch (e) { }
let wbDirty = false; setInterval(() => { if (!wbDirty) return; wbDirty = false; fs.writeFile(WB_FILE, JSON.stringify({ k: WB.on ? WB_NEED : WB.k, n: WB.n }), () => { }); }, 15000);
function everyone(msg) { const raw = JSON.stringify(msg); for (const r of rooms.values()) for (const q of r.players.values()) q.conn.sendRaw(raw); }
function wbInfo() { return [WB.on ? WB_NEED : WB.k, WB_NEED, WB.on ? 1 : 0, WB.n]; }
function wbKill() { if (WB.on) return; WB.k++; wbDirty = true; if (WB.k >= WB_NEED) wbStart(); else if (WB.k === Math.round(WB_NEED * .9)) everyone({ t: 'wb', ev: 'soon', left: WB_NEED - WB.k }); }
// build 0089 (Lee: the world boss should scale with the players on the server): its life is 1x for one player online and grows by half
// for each extra player (2 online 1.5x, 3 online 2x, up to 10x), and its hits grow by a tenth for each extra player (up to 1.5x). Both follow
// the count while it lives, so it toughens as players join and eases as they leave, and the share of life already knocked off stays knocked off.
function wbK(n) { return Math.min(10, 1 + .5 * Math.max(0, n - 1)); }
function wbDk(n) { return Math.min(1.5, 1 + .1 * Math.max(0, n - 1)); }
function wbStart() { const online = onlineCount(); WB.k = WB_NEED; WB.on = { f: 1, k: wbK(online), dk: wbDk(online), hit: new Set() }; wbDirty = true; everyone({ t: 'wb', ev: 'up', n: WB.n }); console.log('[WORLD BOSS] risen, ' + online + ' online'); }
function wbHit(room, df, pid) { const A = WB.on; if (!A || !(df > 0)) return; A.f -= Math.min(df, .05); const p = room.players.get(pid); if (p && p.name) A.hit.add(p.name); if (A.f <= 0) wbDead(); }
function wbDead() { const A = WB.on; if (!A) return; WB.on = null; WB.k = 0; WB.n++; wbDirty = true; for (const r of rooms.values()) { try { r.ctx.srvWbEnd(); } catch (e) { console.error('wb end', e); } } const by = [...A.hit]; everyone({ t: 'wb', ev: 'dead', n: WB.n - 1, by: by.slice(0, 6), c: by.length }); console.log('[WORLD BOSS] slain by ' + by.join(', ')); }
// ---- Founder Pack (Lee, Nov 15): supporters type the code from the Ko-fi shop in Settings. The server checks it, so the gold name,
// badge, cape and ember glow that other players see can't be faked. Only the code's fingerprint lives here, never the code. FOUNDER_CODES
// (comma separated, set on the host) adds or replaces codes without a new build. Looks only: nothing here touches loot, drops or XP.
const FOUNDER_HASH = ['29f1a0d39a7f6cb6a3d0cf15e6e607d3af33e3f90c3152d227674b28e44d043f'];
function founderNorm(k) { return String(k == null ? '' : k).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40); }
function founderOk(k) { const n = founderNorm(k); if (n.length < 8) return false; const env = String(process.env.FOUNDER_CODES || '').split(',').map(founderNorm).filter(Boolean); if (env.includes(n)) return true; return FOUNDER_HASH.includes(crypto.createHash('sha256').update('oathbyte-founder:' + n).digest('hex')); }
const fdTries = new Map(); /* wrong codes count against the address: 8 misses a minute and it waits, so nobody can guess codes by brute force */
function fdCheck(ip, k) { const now = Date.now(), t = (fdTries.get(ip) || []).filter(x => now - x < 60000); if (t.length >= 8) { fdTries.set(ip, t); return false; } const ok = founderOk(k); if (!ok) { t.push(now); fdTries.set(ip, t); if (fdTries.size > 5000) fdTries.clear(); } return ok; }
const fdSeen = new Set(); /* name|class keys of founders seen online, for the players-online list */
const PARTY_MAX = 10; // players per party, for both party codes and blank-code matching (build 0022)

function makeRoom(code) {
  const room = { code, players: new Map(), emptyAt: 0 };
  const noop = () => { };
  const ctx = vm.createContext({ console, Math, UI: { zoneBanner: noop, showDeath: noop, buildBar: noop, invDirty: false }, GLX: { col: () => [0, 0, 0] }, NET: { send: noop }, __kill: wbKill, __wb: (df, pid) => wbHit(room, df, pid), __emit: (pid, msg) => { if (msg && msg.t === 'riftDone') lbRift(room, msg); if (pid == null) cast(room, msg); else { const p = room.players.get(pid); if (p) p.conn.send(msg); } } });
  for (const s of simSrc) s.runInContext(ctx);
  { const dm = /^dly(\d{6})/.exec(code); if (dm) { room.daily = dm[1]; let hsh = 2166136261; for (const ch of dm[1]) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619) >>> 0; ctx.DAILY = hsh; } } // daily challenge: every party that day gets the same floors
  room.ctx = ctx; rooms.set(code, room); return room;
}
function cast(room, msg, except) { const s = JSON.stringify(msg); for (const p of room.players.values()) if (p.id !== except) p.conn.sendRaw(s); }
function roster(room) { return { t: 'players', list: [...room.players.values()].map(p => ({ id: p.id, name: p.name, cls: p.cls, f: p.fd ? 1 : 0 })) }; }
function leave(p) {
  const room = p.room; if (!room) return; p.room = null; room.players.delete(p.id); delete room.ctx.SP[p.id];
  cast(room, { t: 'leave', id: p.id, name: p.name }); cast(room, roster(room)); if (!room.players.size) { room.emptyAt = Date.now(); room.last = { name: p.name, cls: p.cls, lvl: p.lvl }; /* who left last, so only that same hero can pick this floor back up (build 0034) */ } else rescale(room);
}
// monster life follows the party size as people come and go, not only when a floor is made (build 0022)
function rescale(room, except) { const r = room.ctx.srvScale(room.players.size); if (r) cast(room, { t: 'scale', r }, except); }
// build 0034: up to three AI teammates ride on the party host's position update: [class, x, z, rot, moving, gear tier, attacking]
function cleanAi(a) { if (!Array.isArray(a)) return []; const out = []; for (const t of a.slice(0, 3)) { if (!Array.isArray(t)) continue; const n = t.slice(0, 7).map(v => +v || 0); if (!n.every(isFinite)) continue; out.push([Math.max(0, Math.min(4, n[0] | 0)), Math.round(n[1] * 100) / 100, Math.round(n[2] * 100) / 100, Math.round(n[3] * 100) / 100, n[4] ? 1 : 0, Math.max(1, Math.min(4, n[5] | 0)), n[6] ? 1 : 0]); } return out; }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
// build 0074 (security): every connection gets a message budget. A normal client sends well under it; a flood is dropped, and a big one closes the connection.
function budget(p) { const now = Date.now(); if (p.bT === undefined) { p.bT = now; p.b = 240; } p.b = Math.min(240, p.b + (now - p.bT) * .15); p.bT = now; p.b--; if (p.b < -400) { p.conn.close(); return false; } return p.b >= 0; }
function onMessage(p, m) {
  if (!m || typeof m.t !== 'string') return; if (!budget(p)) return;
  if (m.t === 'join') {
    if (p.room) return; p.name = clean(m.name, 16) || 'Warden';
    // build 0075 (party sync): a dropped connection that comes back used to leave its old self standing on the floor for up to a minute. Monsters kept chasing that ghost and the party looked out of step. The same browser coming back now replaces its old connection at once
    p.sid = clean(m.sid, 32); if (p.sid) for (const r of rooms.values()) for (const q of [...r.players.values()]) if (q !== p && q.sid === p.sid) q.conn.close(); let code = (clean(m.room, 12) || 'public').toLowerCase(); p.lvl = Math.max(1, Math.min(60, m.lvl | 0)); p.cls = clean(m.cls, 14) || 'warden'; p.fd = m.fk ? fdCheck(p.ip, m.fk) : false; /* Founder Pack */
    // the kill count lives in memory, and a new build restarts the server: a returning player hands back the count they last saw, so an update does not wipe everyone's progress toward the boss
    if (Array.isArray(m.wb) && !WB.on) { const k = Math.max(0, Math.min(WB_NEED, m.wb[0] | 0)), n = Math.max(0, Math.min(999999, m.wb[1] | 0)); if (n > WB.n || (n === WB.n && k > WB.k)) { WB.n = n; WB.k = k; wbDirty = true; } }
    // auto-party (build 0020): a blank party code puts you with other players of a similar level, up to 6 per party
    if (code === 'auto' || /^dly\d{6}au$/.test(code)) { const base = code === 'auto' ? 'pub' : code.slice(0, 9) + 'p'; let pick = null, k = 1;
      for (const [c, r] of rooms) { if (c.indexOf(base) !== 0 || r.players.size >= PARTY_MAX || !r.players.size) continue; let lv = 1; for (const q of r.players.values()) lv = Math.max(lv, q.lvl); if (Math.abs(lv - p.lvl) <= 6 && (!pick || r.players.size > pick[1].players.size)) pick = [c, r]; }
      if (pick) code = pick[0]; else { while (rooms.has(base + k) && rooms.get(base + k).players.size) k++; code = base + k; } }
    let room = rooms.get(code), fresh = false;
    // build 0034 fix (Lee, Nov 14): an empty party stays on the server for a minute so a dropped connection can pick its floor back up.
    // It used to be handed to whoever joined next, so a brand-new hero could land on the high-level floor of the hero played just before.
    // Now only the same hero (same name, class and level) gets the old floor back; anyone else starts a new party from the first floor at their own level.
    if (room && !room.players.size) { const L = room.last; if (!(L && L.name === p.name && L.cls === p.cls && Math.abs(L.lvl - p.lvl) <= 1)) { rooms.delete(code); room = null; } }
    if (!room) { if (rooms.size >= 50) { p.conn.send({ t: 'error', m: 'Server is full.' }); return; } room = makeRoom(code); fresh = true; }
    if (room.players.size >= PARTY_MAX) { p.conn.send({ t: 'error', m: 'That party is full (' + PARTY_MAX + ' players).' }); return; }
    p.room = room; room.players.set(p.id, p); room.emptyAt = 0; p.st = null;
    p.conn.send({ t: 'hello', id: p.id, room: code, fd: m.fk ? (p.fd ? 1 : 0) : undefined });
    if (fresh) room.ctx.srvTier(m.tier | 0); /* build 0074: a new party plays at the difficulty its first hero picked */
    if (fresh) p.conn.send(((m.dep | 0) > 1 || (m.sd > 0 && (m.dep | 0) >= 1)) && typeof room.ctx.srvResume === 'function' ? room.ctx.srvResume(p.lvl, 1, m.dep | 0, +m.sd || 0, +m.px, +m.pz, !!m.clr, +m.zl || 0, +m.bh || 0) : room.ctx.srvNewZone(p.lvl, 1)); else { rescale(room, p.id); p.conn.send(room.ctx.srvState()); }
    room.ctx.SP[p.id] = { id: p.id, x: -999, z: -999, dead: true, lvl: p.lvl };
    cast(room, { t: 'join', id: p.id, name: p.name }, p.id); cast(room, roster(room)); if (!WB.on && WB.k >= WB_NEED) wbStart(); return;
  }
  const room = p.room; if (!room) return;
  switch (m.t) {
    case 'p': { const x = +m.x, z = +m.z; if (!isFinite(x) || !isFinite(z)) return; if (p.fd && p.name) fdSeen.add(p.name + '|' + p.cls); const sp = room.ctx.SP[p.id]; sp.x = x; sp.z = z; sp.dead = !!m.dead; { const want = Math.max(1, Math.min(60, m.lvl | 0)), now = Date.now(); if (want > p.lvl) { if (now - (p.lvlT || 0) > 10000) { p.lvlT = now; p.lvlUp = 0; } const room0 = Math.max(0, 3 - (p.lvlUp || 0)), step = Math.min(want - p.lvl, room0); p.lvlUp = (p.lvlUp || 0) + step; p.lvl += step; } else p.lvl = want; sp.lvl = p.lvl; } /* build 0074: a level can only climb a few steps at a time, so a hero cannot jump to 60 mid-game */ p.lastP = Date.now(); p.st = [p.id, x, z, +m.r || 0, m.mv ? 1 : 0, m.a | 0, Math.max(0, Math.min(100, m.hp | 0)), p.lvl, m.dead ? 1 : 0, clean(m.g, 24), cleanAi(m.ai), m.tw ? 1 : 0, p.fd ? 1 : 0]; p.hc = !!m.hc; if (m.dead && p.hc) p.hcDead = true; lbNote(p, m.pl, m.dp, room, m.fc); break; }
    case 'hit': room.ctx.srvHit(p.id, m); break;
    case 'fx': cast(room, { t: 'fx', k: clean(m.k, 2), x: +m.x || 0, z: +m.z || 0, rot: +m.rot || 0, r: Math.min(80, +m.r || 0), arc: +m.arc || 0, c: m.c | 0 }, p.id); break;
    case 'found': { const s = clean(m.item, 60), now = Date.now(); if (!s || (m.r !== 3 && m.r !== 4) || now - (p.lastFound || 0) < 4000) break; p.lastFound = now; const raw = JSON.stringify({ t: 'found', n: p.name, item: s, r: m.r }); for (const r of rooms.values()) for (const q of r.players.values()) q.conn.sendRaw(raw); break; }
    case 'chat': { const s = clean(m.m, 140), now = Date.now(); if (!s || now - (p.lastChat || 0) < 700) break; p.lastChat = now; const bd = typeof m.b === 'string' && m.b.length <= 2 && /^[\u2600-\u27BF\u2580-\u25FF\u2654-\u265F]$/.test(m.b) ? m.b : undefined; if (m.g) { const raw = JSON.stringify({ t: 'chat', n: p.name, m: s, g: 1, b: bd, f: p.fd ? 1 : undefined }); for (const r of rooms.values()) for (const q of r.players.values()) q.conn.sendRaw(raw); } else cast(room, { t: 'chat', n: p.name, m: s, b: bd, f: p.fd ? 1 : undefined }); break; }
    case 'founder': { const ok = fdCheck(p.ip, m.k); p.conn.send({ t: 'founder', ok: ok ? 1 : 0 }); if (ok && !p.fd) { p.fd = true; cast(room, roster(room)); } break; } /* Founder Pack: redeemed mid-game, no reconnect needed */
    case 'tier': { const v = room.ctx.srvTier(m.v | 0); cast(room, { t: 'note', m: p.name + ' set the difficulty to ' + room.ctx.srvTierName(v) + ' from the next floor.' }); break; } /* build 0074 */
    case 'sync': p.conn.send(Object.assign(room.ctx.srvState(), { sync: 1 })); break;
    case 'prev': if (room.ctx.srvCleared() || room.players.size === 1) { let lv = 1; for (const q of room.players.values()) lv = Math.max(lv, q.lvl); cast(room, room.ctx.srvNewZone(lv, room.players.size, 'prev')); } break;
    case 'feedback': { const s = clean(m.m, 600), now = Date.now(); if (!s || now - (p.lastFb || 0) < 20000) break; p.lastFb = now; console.log('[FEEDBACK] ' + new Date().toISOString() + ' build ' + BUILD + ' from ' + p.name + ' (level ' + p.lvl + ' ' + p.cls + '): ' + s); p.conn.send({ t: 'chat', n: '', m: 'Thank you. Your feedback was sent.', s: 1 }); break; }
    case 'rift': { const now = Date.now(); if (now - (room.riftT || 0) < 8000) break;
      // a rift moves the whole party, so it only opens when nobody else is out fighting on the floor (build 0022)
      { const busy = [...room.players.values()].filter(q => q.id !== p.id && room.ctx.SP[q.id] && !room.ctx.SP[q.id].dead).map(q => q.name); if (busy.length) { p.conn.send({ t: 'note', m: (busy.length === 1 ? busy[0] + ' is' : busy.length + ' party members are') + ' still fighting on the floor. The rift opens when everyone is back in town.' }); break; } }
      room.riftT = now; let lv = 1; for (const q of room.players.values()) lv = Math.max(lv, q.lvl); cast(room, room.ctx.srvNewZone(lv, room.players.size, 'rift')); break; } // open a timed rift for the whole party
    case 'map': { const now = Date.now(); if (now - (room.mapT || 0) < 4000) { p.conn.send({ t: 'note', m: 'A map is already opening.' }); break; } /* build 0119 (Lee, Nov 16): an Atlas map. Like the old rift, the whole party goes in, so it opens only when everyone else is in town */
      const mp = room.ctx.mapNorm(m.map); if (!mp) break;
      { const busy = [...room.players.values()].filter(q => q.id !== p.id && room.ctx.SP[q.id] && !room.ctx.SP[q.id].dead).map(q => q.name); if (busy.length) { p.conn.send({ t: 'mapNo', m: (busy.length === 1 ? busy[0] + ' is' : busy.length + ' party members are') + ' still fighting on the floor. The map opens when everyone is back in town.' }); break; } }
      room.mapT = now; let lv = 1; for (const q of room.players.values()) lv = Math.max(lv, q.lvl); cast(room, room.ctx.srvNewZone(lv, room.players.size, { map: mp, by: p.id })); if (room.players.size > 1) cast(room, { t: 'note', m: p.name + ' opened a map. The party goes in together.' }); break; }
    case 'next': if (room.ctx.srvCleared()) { let lv = 1; for (const q of room.players.values()) lv = Math.max(lv, q.lvl); cast(room, room.ctx.srvNewZone(lv, room.players.size, true)); } break;
    case 'give': { const q = room.players.get(m.to | 0), now = Date.now(); if (!q || !m.item || typeof m.item !== 'object' || JSON.stringify(m.item).length >= 2000) break; if (now - (p.giveT || 0) < 400 || !room.ctx.itemLegit(m.item, p.lvl + 5)) { if (!m.back) p.conn.send({ t: 'give', from: p.id, n: 'The server', item: m.item, back: true }); break; } p.giveT = now; q.conn.send({ t: 'give', from: p.id, n: p.name, item: m.item, back: !!m.back }); break; } /* build 0074: only an item that could really drop at the giver's level can be given */
  }
}
// build 0072 (Lee's playtest): a steady players-online count. A hero who drops and comes back (a reconnect, a
// new floor, a server wake) is still counted for 45 seconds, so the number no longer jumps around.
const seenAt = new Map();
function onlineCount() { const now = Date.now(); for (const r of rooms.values()) for (const p of r.players.values()) seenAt.set((p.name || '') + '|' + (p.cls || '') + '|' + (p.name ? '' : p.id), now); let n = 0; for (const [k, t] of seenAt) { if (now - t > 45000) seenAt.delete(k); else n++; } return n; }
/* build 0092 (Lee): the hero names behind the player count, for its hover list on the title screen. Names and hero class only, never room codes */
function onlineNames() { onlineCount(); const out = [], seen = new Set(); for (const k of seenAt.keys()) { const [n, c] = k.split('|'); const nm = String(n || '').slice(0, 24); if (!nm || seen.has(nm + c)) continue; seen.add(nm + c); out.push({ n: nm, c: String(c || '').slice(0, 16), f: fdSeen.has(n + '|' + c) ? 1 : undefined }); if (out.length >= 40) break; } return out.sort((a, b) => a.n.localeCompare(b.n)); }
// ---- game loop ----
let last = Date.now(), tickN = 0;
setInterval(() => {
  const now = Date.now(), dt = Math.min(.1, (now - last) / 1000); last = now; tickN++; const online = onlineCount();
  for (const [code, room] of rooms) {
    if (!room.players.size) { if (now - room.emptyAt > 60000) rooms.delete(code); continue; }
    // build 0075 (party sync): a player whose game has gone quiet (phone locked, tab in the background) stops counting as a target, so monsters do not stand around a frozen hero
    for (const q of room.players.values()) { if (q.st && q.lastP && now - q.lastP > 4000 && !q.st[8]) { q.st[8] = 1; const sp = room.ctx.SP[q.id]; if (sp) sp.dead = true; } }
    try { if (WB.on) { WB.on.k = wbK(online); WB.on.dk = wbDk(online); room.ctx.srvWbSync(Math.max(0, WB.on.f), WB.on.k, WB.on.dk); } room.ctx.srvTick(dt); if (tickN % 2 === 0) cast(room, { t: 's', o: online, w: wbInfo(), e: room.ctx.srvSnap(), p: [...room.players.values()].filter(p => p.st).map(p => p.st) }); }
    catch (err) { console.error('room', code, err); }
  }
}, 50);


// ---- leaderboard: highest level and deepest floor this build (it starts fresh with every build, like the heroes) ----
const SEASON = (/const SEASON = '([^']+)'/.exec(fs.readFileSync(path.join(PUB, 'js/data.js'), 'utf8')) || [])[1] || BUILD; /* heroes carry over between builds, so the leaderboard follows the season, not the build */
const LB_DIR = process.env.LB_DIR || require('os').tmpdir(), LB_FILE = path.join(LB_DIR, 'oathbyte-lb-' + SEASON + '.json');
const LB_OLD = path.join(LB_DIR, 'cinderdeep-lb-' + SEASON + '.json'); /* build 0102: the board file took the new name. If only the old file is there, its scores load and are written under the new name (the old file is left alone) */
let LB = { lvl: [], deep: [] }; for (const f of [LB_FILE, LB_OLD]) { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (Array.isArray(j.lvl) && Array.isArray(j.deep)) { LB = j; if (f === LB_OLD) fs.writeFile(LB_FILE, JSON.stringify(LB), () => { }); break; } } catch (e) { } }
let lbDirty = false; setInterval(() => { if (!lbDirty) return; lbDirty = false; fs.writeFile(LB_FILE, JSON.stringify(LB), () => { }); }, 15000);
function lbPut(list, e, score) { const k = e.n + '|' + e.c, i = list.findIndex(q => q.n + '|' + q.c === k); if (i >= 0) { if (list[i].s >= score) { if (e.x && !list[i].x) { list[i].x = 1; lbDirty = true; } if (e.f && !list[i].f) { list[i].f = 1; lbDirty = true; } return; } list.splice(i, 1); } else if (list.length >= 10 && list[list.length - 1].s >= score) return; list.push(Object.assign({}, e, { s: score })); list.sort((a, b) => b.s - a.s); list.length = Math.min(list.length, 10); lbDirty = true; }
function lbRift(room, msg) { LB.rift = LB.rift || []; for (const q of room.players.values()) { if (!q.name) continue; lbPut(LB.rift, { n: q.name, c: q.cls, l: q.lvl | 0, d: msg.tier, ms: msg.ms }, 1e9 - msg.ms); } } // fastest rift clears
function lbToday() { const d = new Date(); return String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0'); }
function lbNote(p, pl, dp, room, fc) {
  if (!p.name) return; const fl = room && room.ctx.srvFloor ? room.ctx.srvFloor() | 0 : 0; if (room && room.ctx.srvCleared && room.ctx.srvCleared() && !(room.ctx.srvIsRift && room.ctx.srvIsRift()) && !(room.ctx.srvIsMap && room.ctx.srvIsMap())) p.best = Math.max(p.best || 0, fl); /* build 0074: the boards only count floors this server saw you clear */
  const lvl = p.lvl | 0, par = Math.max(0, Math.min(99999, pl | 0)), d = Math.max(1, Math.min(9999, dp | 0, fl || 9999)), cl = Math.max(0, Math.min(9999, fc | 0, p.best || 0)), e = { n: p.name, c: p.cls, l: lvl, p: par, d: cl, h: p.hc ? 1 : 0, x: p.hcDead ? 1 : 0, f: p.fd ? 1 : 0 }; /* the floors board counts floors completed (Lee, Nov 13) */
  lbPut(LB.lvl, e, lvl * 100000 + (lvl >= 60 ? par : 0)); if (cl > 0) lbPut(LB.deep, e, cl);
  if (room && room.daily) { const td = lbToday(); if (room.daily === td) { if (LB.dlyDate !== td) { LB.dlyDate = td; LB.dly = []; } if (d > 1) lbPut(LB.dly, Object.assign({}, e, { d: d - 1 }), d - 1); } }
}
// build 0074: moving to the OathByte address. Once MOVE_TO is set, the old address answers its front page with a tiny page that reads this
// browser's heroes and sends the player on with the heroes in the link (after the #, so no server sees them). Empty: nothing changes.
const MOVE_TO = 'https://oathbyte.onrender.com', MOVE_FROM = 'cinderdeep.onrender.com'; /* the old host's address is fixed by the host, so it stays here to keep sending old links on */
const MOVE_PAGE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OathByte has moved</title><body style="background:#121014;color:#e8dcc8;font:16px sans-serif;padding:24px">'
  + '<p>OathByte has a new home at <a style="color:#e0a040" id="go" href="' + MOVE_TO + '/">' + MOVE_TO.replace('https://', '') + '</a>. Taking you there with your heroes…</p>'
  + '<script>(function(){var o={},n=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^(cinderdeep|oathbyte)_/.test(k)){o[k]=localStorage.getItem(k);n++;}}}catch(e){}'
  + 'var u=' + JSON.stringify(MOVE_TO) + '+location.pathname+location.search;if(n){try{u+="#xfer="+btoa(unescape(encodeURIComponent(JSON.stringify(o))));}catch(e){}}document.getElementById("go").href=u;location.replace(u);})();</script>';
// ---- http + websocket ----
let INDEX_TXT = '';
// CrazyGames (branch oathbyte-crazygames): there the game's files come from CrazyGames' own servers, so the title screen asks this server
// for the player count, parties and leaderboard from another address. Only CrazyGames addresses are let in; nothing else changes.
const CG_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)*crazygames\.com|capacitor:\/\/([a-z0-9-]+\.)*crazygames\.com)$/i;
const FC = new Map(); /* build 0158: per file, its change time, content fingerprint and gzipped copy */
const server = http.createServer((req, res) => {
  /* build 0158 (fuzz test: one request for a web address that does not decode, such as /% , or one with a zero byte in it, such as /%00 , threw outside any catch and stopped the whole server,
     dropping every player; scanners on the internet send such addresses all the time): both now get a plain 400 reply */
  let u; try { u = decodeURIComponent(String(req.url || '/').split('?')[0]); } catch (e) { u = null; } if (u === null || u.indexOf(String.fromCharCode(0)) >= 0) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad request'); return; }
  { const o = String(req.headers.origin || ''); if (o && CG_ORIGIN.test(o) && (u === '/oathbyte-server' || u === '/parties' || u === '/leaderboard')) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET'); res.setHeader('Access-Control-Max-Age', '86400'); res.writeHead(204); res.end(); return; } } }
  if (u === '/oathbyte-server' || u === '/cinderdeep-server') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ oathbyte: 1, cinderdeep: u === '/cinderdeep-server' ? 1 : undefined /* build 0101: the old path stays for pages loaded before the rename */, build: BUILD, players: onlineCount(), names: onlineNames(), upAgo: Date.now() - LIVE_AT, worldBoss: { kills: WB.on ? WB_NEED : WB.k, need: WB_NEED, up: !!WB.on, slain: WB.n } })); /* build 0073: how long this build has been live, by the server's own clock */ return; }
  if (u === '/parties') { const list = []; for (const [code, r] of rooms) { if (!r.players.size || /^(solo|pv)/.test(code)) continue; /* build 0117: pv = private CrazyGames Instant Multiplayer party, friends join by invite */ const pl = [...r.players.values()].map(q => ({ n: q.name, c: q.cls, l: q.lvl | 0 })); list.push({ code, players: pl, floor: r.ctx.srvFloor ? r.ctx.srvFloor() : 1, daily: !!r.daily }); } list.sort((a, b) => b.players.length - a.players.length); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ parties: list.slice(0, 40), max: PARTY_MAX })); return; } // party browser (build 0021)
  if (u === '/leaderboard') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ build: BUILD, lvl: LB.lvl, deep: LB.deep, rift: LB.rift || [], daily: LB.dlyDate === lbToday() ? LB.dly || [] : [], today: lbToday() })); return; }
  if (u === '/founder' && req.method === 'POST') { let body = ''; req.on('data', d => { body += d; if (body.length > 400) req.destroy(); }); req.on('end', () => { let k = ''; try { k = JSON.parse(body).k; } catch (e) { } const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), ok = fdCheck(ip, k); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ ok: ok ? 1 : 0 })); }); return; } /* Founder Pack: check a code from Settings */
  if (u === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (MOVE_TO && String(req.headers.host || '').split(':')[0] === MOVE_FROM && (u === '/' || u === '/index.html')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(MOVE_PAGE); return; } /* build 0074 */
  // build 0078 (Lee, Nov 15: playable links): an invite link gets its own preview card in chat apps, naming who sent it and the floor their party is on
  if (u === '/' && /[?&]from=/.test(req.url)) { const q = new URLSearchParams(req.url.split('?')[1] || ''), who = String(q.get('from') || '').replace(/[^\w -]/g, '').trim().slice(0, 16), code = String(q.get('room') || '').toLowerCase().replace(/[^\w-]/g, '').slice(0, 12), rm = rooms.get(code); if (who) { if (!INDEX_TXT) try { INDEX_TXT = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8'); } catch (e) { }
    if (INDEX_TXT) { const fl = rm && rm.players.size && rm.ctx.srvFloor ? rm.ctx.srvFloor() : 0, t = who + ' invited you to OathByte', d = (fl > 1 ? 'Tap to join their party on floor ' + fl + '.' : 'Tap to join their party.') + ' A free action RPG you play in your browser or on your phone, no download.';
      const html = INDEX_TXT.replace('<title>OathByte</title>', '<title>' + t + '</title>').replace('<meta property="og:title" content="OathByte">', '<meta property="og:title" content="' + t + '">').replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + d + '">');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); return; } } }
  if (u === '/') u = '/index.html'; const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.writeHead(403); res.end(); return; }
  // build 0039: model files and scripts go out gzipped when the browser accepts it (the hero models are about a third smaller)
  const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /\.(cdm|cde|cdl|js|html|css|json)$/.test(f);
  /* build 0158: every file goes out with a fingerprint of its contents (ETag). A browser that already has the file sends the fingerprint back and gets a short "not changed" reply (304)
     instead of the whole file again. Before this, files had no fingerprint and no date, so every visit downloaded the scripts, the 2 MB world file, the models and each music track from scratch.
     The fingerprint is of the contents, so a new build only re-sends the files that really changed. The kept copy is checked against the file's change time, so an edited file is never served stale. */
  fs.stat(f, (er, st) => { if (er || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    let c = FC.get(f); if (c && c.m !== st.mtimeMs) c = null; const inm = String(req.headers['if-none-match'] || ''), h = { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }; if (gz) { h['Content-Encoding'] = 'gzip'; h.Vary = 'Accept-Encoding'; }
    const send = data => { h.ETag = c.e + (gz ? '-g"' : '"'); if (inm && inm === h.ETag) { delete h['Content-Encoding']; res.writeHead(304, h); res.end(); return; } if (gz && !c.z) c.z = zlib.gzipSync(data, { level: 9 }); res.writeHead(200, h); res.end(gz ? c.z : data); };
    if (c && (inm === c.e + (gz ? '-g"' : '"') || (gz && c.z))) { send(null); return; }
    fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } if (!c) { c = { m: st.mtimeMs, e: '"' + crypto.createHash('sha1').update(data).digest('base64').slice(0, 22), z: null }; FC.set(f, c); } send(data); }); });
});
class Conn {
  constructor(sock) { this.sock = sock; this.buf = Buffer.alloc(0); this.frag = []; this.open = true; this.alive = true; }
  sendRaw(str) { if (!this.open) return; const d = Buffer.from(str), n = d.length; let h; if (n < 126) h = Buffer.from([0x81, n]); else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); } else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(n, 6); } try { this.sock.write(Buffer.concat([h, d])); } catch (e) { } }
  send(o) { this.sendRaw(JSON.stringify(o)); }
  ctl(op, d) { if (!this.open) return; try { this.sock.write(Buffer.concat([Buffer.from([0x80 | op, d ? d.length : 0]), d || Buffer.alloc(0)])); } catch (e) { } }
  close() { if (!this.open) return; this.open = false; try { this.sock.destroy(); } catch (e) { } if (this.onclose) this.onclose(); }
  feed(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const b = this.buf; if (b.length < 2) return; const fin = b[0] & 0x80, op = b[0] & 15, masked = b[1] & 0x80; let len = b[1] & 127, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; } else if (len === 127) { if (b.length < 10) return; if (b.readUInt32BE(2)) return this.close(); len = b.readUInt32BE(6); off = 10; }
      if (len > 65536 || !masked) return this.close(); if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), data = Buffer.from(b.subarray(off + 4, off + 4 + len)); for (let i = 0; i < len; i++) data[i] ^= mask[i & 3]; this.buf = b.subarray(off + 4 + len);
      if (op === 8) return this.close(); if (op === 9) { this.ctl(10, data.subarray(0, 125)); continue; } if (op === 10) { this.alive = true; continue; }
      if (op === 1 || op === 0) { this.fragN = (this.fragN || 0) + data.length; if (this.fragN > 65536) return this.close(); this.frag.push(data); if (fin) this.fragN = 0; if (fin) { const s = Buffer.concat(this.frag).toString('utf8'); this.frag = []; let m = null; try { m = JSON.parse(s); } catch (e) { } if (m && this.onmsg) this.onmsg(m); } }
    }
  }
}
const conns = new Set();
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key']; if (req.url.split('?')[0] !== '/ws' || !key) { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n'); sock.setNoDelay(true);
  const conn = new Conn(sock), p = { id: nextId++, conn, room: null, name: '', lvl: 1, st: null, ip: String(req.headers['x-forwarded-for'] || sock.remoteAddress || '').split(',')[0].trim() }; conns.add(conn);
  conn.onmsg = m => { try { onMessage(p, m); } catch (e) { console.error('msg', e); } };
  conn.onclose = () => { conns.delete(conn); leave(p); };
  sock.on('data', d => conn.feed(d)); sock.on('close', () => conn.close()); sock.on('error', () => conn.close());
});
setInterval(() => { for (const c of conns) { if (!c.alive) { c.close(); continue; } c.alive = false; c.ctl(9); } }, 12000); /* build 0075: a dead connection is noticed in about 20 seconds instead of about 50 */
// build 0070: when the host restarts the server for an update, tell everyone first so they reconnect at once to the new one, on the same floor and spot
let closing = false; function shutdown() { if (closing) return; closing = true; const bye = JSON.stringify({ t: 'bye' }); for (const c of conns) c.sendRaw(bye); setTimeout(() => { for (const c of conns) c.close(); process.exit(0); }, 800); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
/* build 0158: a last net. An error nobody caught is written to the log and the server keeps running, so one bad request or one bad room can never again disconnect everybody */
process.on('uncaughtException', e => { try { console.error('uncaught', e && e.stack || e); } catch (_) { } });
server.listen(PORT, () => console.log('OathByte server build ' + BUILD + ' listening on port ' + PORT));
// Keep the free host awake (Lee approved a 10-minute ping, Nov 12). GitHub's scheduled ping only ran a few times a day,
// so the server also calls its own public address every 10 minutes. Render sets RENDER_EXTERNAL_URL; locally SELF_PING_URL can be used.
const SELF_URL = process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL;
function selfPing() { if (!SELF_URL) return; try { const u = new URL('/oathbyte-server', SELF_URL), mod = u.protocol === 'https:' ? require('https') : http; const rq = mod.get(u, { timeout: 30000 }, r => { r.resume(); lastPing = { at: Date.now(), code: r.statusCode }; }); rq.on('timeout', () => rq.destroy()); rq.on('error', () => { }); } catch (e) { } }
let lastPing = null; if (SELF_URL) { setTimeout(selfPing, 60000); setInterval(selfPing, (+process.env.SELF_PING_MS || 10 * 60 * 1000)); }
