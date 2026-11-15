'use strict';
// build 0102: this browser's saves, settings and Founder look used hidden names from the game's first name. They now use oathbyte_ names.
// obKey maps an old name to its new one (and keeps a new one as it is). The old prefix below is the one place it still appears, so old saves can be found.
window.obKey = function (k) { k = String(k); if (k.indexOf('oathbyte_') === 0) return k; var OLD = 'cinderdeep_'; return k.indexOf(OLD) === 0 ? 'oathbyte_' + k.slice(OLD.length) : ''; };
// Copy every old name across once, never over a new one, and remove the old copy only after the new one reads back the same. Nothing is lost.
(function () { try { var old = [];
  for (var i = 0; i < localStorage.length; i++) { var k = String(localStorage.key(i)); if (obKey(k) && obKey(k) !== k) old.push(k); }
  old.forEach(function (k) { var nk = obKey(k), v = localStorage.getItem(k); if (localStorage.getItem(nk) === null) localStorage.setItem(nk, v); if (localStorage.getItem(nk) !== null) localStorage.removeItem(k); });
} catch (e) { } })();
// build 0074: the old address hands this browser's heroes over in the link (the part after #, which never reaches any server).
// Here they are saved, but only if this browser has no heroes at this address yet, so nothing is overwritten.
(function () { try { var h = location.hash; if (h.indexOf('#xfer=') !== 0) return; history.replaceState(null, '', location.pathname + location.search);
  for (var i = 0; i < localStorage.length; i++) if (String(localStorage.key(i)).indexOf('oathbyte_save_v1') === 0) return;
  var o = JSON.parse(decodeURIComponent(escape(atob(h.slice(6))))), n = 0; for (var k in o) { var nk = obKey(k); if (nk && typeof o[k] === 'string') { localStorage.setItem(nk, o[k]); n++; } }
  if (n) window.MOVED_HEROES = n; } catch (e) { } })();
