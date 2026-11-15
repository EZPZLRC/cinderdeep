'use strict';
// build 0074: the game moved to its OathByte address. The old address hands this browser's heroes over in the link (the part after #,
// which never reaches any server). Here they are saved, but only if this browser has no heroes at this address yet, so nothing is overwritten.
(function () { try { var h = location.hash; if (h.indexOf('#xfer=') !== 0) return; history.replaceState(null, '', location.pathname + location.search);
  for (var i = 0; i < localStorage.length; i++) if (String(localStorage.key(i)).indexOf('cinderdeep_save_v1') === 0) return;
  var o = JSON.parse(decodeURIComponent(escape(atob(h.slice(6))))), n = 0; for (var k in o) if (k.indexOf('cinderdeep_') === 0 && typeof o[k] === 'string') { localStorage.setItem(k, o[k]); n++; }
  if (n) window.MOVED_HEROES = n; } catch (e) { } })();
