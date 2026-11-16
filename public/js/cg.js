'use strict';
// CrazyGames (branch oathbyte-crazygames, Lee: "Start with CrazyGames"). This file only wakes up when the game is opened from
// CrazyGames' own servers (any *.crazygames.com address). On oathbyte.onrender.com, localhost and file:// it does nothing and loads
// nothing, so the normal site is unchanged. Add ?cg=1 to any address to try the CrazyGames path by hand (the SDK then runs in its
// local test mode). The game's own files sit on CrazyGames; online play still goes to the OathByte server on Render.
const CG = (() => {
  const L = typeof location !== 'undefined' ? location : { hostname: '', search: '', protocol: '' };
  const onCG = /(^|\.)crazygames\.com$/i.test(L.hostname || '');
  const C = { on: onCG || /[?&]cg=1(&|$)/.test(L.search || ''), sdk: null, ready: false, muted: false, noChat: false,
    // chat is off on CrazyGames for now: its rules ask for a word filter on chat, and OathByte has none yet. Flip CHAT to true once it does.
    CHAT: false, playing: false,
    // where the game server lives: on CrazyGames the page is not served by it, so every call goes to its full address
    server: onCG ? 'https://oathbyte.onrender.com/' : '', onSettings: null, onInvite: null, onInstant: null, onJoinRoom: null, instant: false };
  C.url = p => C.server + p;
  C.ws = () => C.server ? C.server.replace(/^http/, 'ws') + 'ws' : (L.protocol === 'https:' ? 'wss://' : 'ws://') + L.host + '/ws';
  // on CrazyGames the status check gives up after 6 s, so Play is never greyed out for the whole minute a sleeping server takes to wake
  // (CrazyGames wants players in the game within 20 s). The title screen keeps checking and switches to online play when it answers.
  C.opt = () => { const o = { cache: 'no-store' }; if (C.on && typeof AbortController !== 'undefined') { const ac = new AbortController(); setTimeout(() => ac.abort(), 6000); o.signal = ac.signal; } return o; };
  // build 0118: on the normal site these do nothing (build 0117 called CG.room on every Play and broke Play Now there)
  C.room = () => { }; C.inviteLink = () => ''; C.gameplay = () => { }; C.happy = () => { };
  if (!C.on) return C;
  C.noChat = !C.CHAT;
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.classList.add('cg');
  const sdk = () => C.ready ? C.sdk : null, safe = f => { try { const s = sdk(); if (s) f(s); } catch (e) { } };
  C.gameplay = on => { if (on === C.playing) return; C.playing = on; safe(s => on ? s.game.gameplayStart() : s.game.gameplayStop()); };
  C.happy = () => safe(s => s.game.happytime());
  C.room = (code, joinable) => safe(s => { if (code) s.game.updateRoom({ roomId: code, isJoinable: !!joinable, inviteParams: joinable ? { room: code } : undefined }); else s.game.leftRoom(); });
  C.inviteLink = code => { let u = ''; safe(s => { u = s.game.inviteLink({ room: code }); }); return u; };
  function readSettings(st) { if (!st) return; C.muted = !!st.muteAudio; C.noChat = !C.CHAT || !!st.disableChat; if (C.onSettings) try { C.onSettings(); } catch (e) { } }
  const tag = document.createElement('script'); tag.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'; tag.async = true;
  tag.onload = async () => { try { const s = window.CrazyGames && window.CrazyGames.SDK; if (!s) return; await s.init(); if (s.environment === 'disabled') return; C.sdk = s; C.ready = true;
    readSettings(s.game.settings); s.game.addSettingsChangeListener(readSettings);
    let rm = ''; try { rm = s.game.getInviteParam('room') || (s.game.inviteParams && s.game.inviteParams.room) || ''; } catch (e) { }
    rm = String(rm).replace(/[^\w-]/g, '').slice(0, 12); if (rm && C.onInvite) C.onInvite(rm);
    // build 0117: a friend already in the game who joins from CrazyGames' friends list or an invite drops into that party without a reload
    try { s.game.addJoinRoomListener(p => { const r = String(p && p.room || '').replace(/[^\w-]/g, '').slice(0, 12); if (r && C.onJoinRoom) C.onJoinRoom(r); }); } catch (e) { }
    // build 0117: Instant Multiplayer. When CrazyGames starts the game from its multiplayer buttons, the player goes straight into a new
    // private party that friends can join at once (no invite param means they are the party leader, not a guest)
    if (!rm && s.game.isInstantMultiplayer) { C.instant = true; if (C.onInstant) C.onInstant(); }
    if (C.playing) s.game.gameplayStart(); } catch (e) { console.warn('CrazyGames SDK', e); } };
  document.head.appendChild(tag);
  // gameplay starts when a hero is in the world and stops on the title screen, so CrazyGames knows when not to show ads
  setInterval(() => { const m = document.getElementById('menu'); C.gameplay(typeof G !== 'undefined' && G.state === 'play' && !(m && !m.classList.contains('hide'))); }, 500);
  return C;
})();
