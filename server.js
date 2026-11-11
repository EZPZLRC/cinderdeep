'use strict';
// Cinderdeep dedicated server. No dependencies: plain Node 18+.
// Serves the game from ./public and runs one shared world per party over WebSockets at /ws.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const PORT = process.env.PORT || 3000, PUB = process.env.PUBLIC_DIR || path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const simSrc = ['js/data.js', 'js/game.js'].map(f => new vm.Script(fs.readFileSync(path.join(PUB, f), 'utf8'), { filename: f }));
simSrc.push(new vm.Script(fs.readFileSync(path.join(__dirname, 'sim', 'simsrv.js'), 'utf8'), { filename: 'simsrv.js' }));
const rooms = new Map(); let nextId = 1;

function makeRoom(code) {
  const room = { code, players: new Map(), emptyAt: 0 };
  const noop = () => { };
  const ctx = vm.createContext({ console, Math, UI: { zoneBanner: noop, showDeath: noop, buildBar: noop, invDirty: false }, GLX: { col: () => [0, 0, 0] }, NET: { send: noop }, __emit: (pid, msg) => { if (pid == null) cast(room, msg); else { const p = room.players.get(pid); if (p) p.conn.send(msg); } } });
  for (const s of simSrc) s.runInContext(ctx);
  room.ctx = ctx; rooms.set(code, room); return room;
}
function cast(room, msg, except) { const s = JSON.stringify(msg); for (const p of room.players.values()) if (p.id !== except) p.conn.sendRaw(s); }
function roster(room) { return { t: 'players', list: [...room.players.values()].map(p => ({ id: p.id, name: p.name, cls: p.cls })) }; }
function leave(p) {
  const room = p.room; if (!room) return; p.room = null; room.players.delete(p.id); delete room.ctx.SP[p.id];
  cast(room, { t: 'leave', id: p.id, name: p.name }); cast(room, roster(room)); if (!room.players.size) room.emptyAt = Date.now();
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n); }
function onMessage(p, m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'join') {
    if (p.room) return; p.name = clean(m.name, 16) || 'Warden'; const code = (clean(m.room, 12) || 'public').toLowerCase(); p.lvl = Math.max(1, Math.min(60, m.lvl | 0)); p.cls = clean(m.cls, 14) || 'warden';
    let room = rooms.get(code), fresh = false; if (!room) { if (rooms.size >= 50) { p.conn.send({ t: 'error', m: 'Server is full.' }); return; } room = makeRoom(code); fresh = true; }
    if (room.players.size >= 8) { p.conn.send({ t: 'error', m: 'That party is full (8 players).' }); return; }
    p.room = room; room.players.set(p.id, p); room.emptyAt = 0; p.st = null;
    p.conn.send({ t: 'hello', id: p.id, room: code });
    p.conn.send(fresh ? room.ctx.srvNewZone(p.lvl, 1) : room.ctx.srvState());
    room.ctx.SP[p.id] = { id: p.id, x: -999, z: -999, dead: true, lvl: p.lvl };
    cast(room, { t: 'join', id: p.id, name: p.name }, p.id); cast(room, roster(room)); return;
  }
  const room = p.room; if (!room) return;
  switch (m.t) {
    case 'p': { const x = +m.x, z = +m.z; if (!isFinite(x) || !isFinite(z)) return; const sp = room.ctx.SP[p.id]; sp.x = x; sp.z = z; sp.dead = !!m.dead; sp.lvl = p.lvl = Math.max(1, Math.min(60, m.lvl | 0)); p.st = [p.id, x, z, +m.r || 0, m.mv ? 1 : 0, m.a | 0, Math.max(0, Math.min(100, m.hp | 0)), p.lvl, m.dead ? 1 : 0, clean(m.g, 24)]; break; }
    case 'hit': room.ctx.srvHit(p.id, m); break;
    case 'fx': cast(room, { t: 'fx', k: clean(m.k, 2), x: +m.x || 0, z: +m.z || 0, rot: +m.rot || 0, r: Math.min(80, +m.r || 0), arc: +m.arc || 0, c: m.c | 0 }, p.id); break;
    case 'chat': { const s = clean(m.m, 140); if (s) cast(room, { t: 'chat', n: p.name, m: s }); break; }
    case 'sync': p.conn.send(Object.assign(room.ctx.srvState(), { sync: 1 })); break;
    case 'next': if (room.ctx.srvCleared()) { let lv = 1; for (const q of room.players.values()) lv = Math.max(lv, q.lvl); cast(room, room.ctx.srvNewZone(lv, room.players.size)); } break;
    case 'give': { const q = room.players.get(m.to | 0); if (q && m.item && typeof m.item === 'object' && JSON.stringify(m.item).length < 2000) q.conn.send({ t: 'give', from: p.id, n: p.name, item: m.item, back: !!m.back }); break; }
  }
}
// ---- game loop ----
let last = Date.now(), tickN = 0;
setInterval(() => {
  const now = Date.now(), dt = Math.min(.1, (now - last) / 1000); last = now; tickN++;
  for (const [code, room] of rooms) {
    if (!room.players.size) { if (now - room.emptyAt > 60000) rooms.delete(code); continue; }
    try { room.ctx.srvTick(dt); if (tickN % 2 === 0) cast(room, { t: 's', e: room.ctx.srvSnap(), p: [...room.players.values()].filter(p => p.st).map(p => p.st) }); }
    catch (err) { console.error('room', code, err); }
  }
}, 50);

// ---- http + websocket ----
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/cinderdeep-server') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ cinderdeep: 1, players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0) })); return; }
  if (u === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (u === '/') u = '/index.html'; const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); });
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
      if (op === 1 || op === 0) { this.frag.push(data); if (fin) { const s = Buffer.concat(this.frag).toString('utf8'); this.frag = []; let m = null; try { m = JSON.parse(s); } catch (e) { } if (m && this.onmsg) this.onmsg(m); } }
    }
  }
}
const conns = new Set();
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key']; if (req.url.split('?')[0] !== '/ws' || !key) { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n'); sock.setNoDelay(true);
  const conn = new Conn(sock), p = { id: nextId++, conn, room: null, name: '', lvl: 1, st: null }; conns.add(conn);
  conn.onmsg = m => { try { onMessage(p, m); } catch (e) { console.error('msg', e); } };
  conn.onclose = () => { conns.delete(conn); leave(p); };
  sock.on('data', d => conn.feed(d)); sock.on('close', () => conn.close()); sock.on('error', () => conn.close());
});
setInterval(() => { for (const c of conns) { if (!c.alive) { c.close(); continue; } c.alive = false; c.ctl(9); } }, 25000);
server.listen(PORT, () => console.log('Cinderdeep server listening on port ' + PORT));
