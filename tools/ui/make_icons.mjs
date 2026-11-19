// Build public/js/icons.js from the game-icons.net set (CC BY 3.0, by Lorc, Delapouite and contributors).
// Usage: node tools/ui/make_icons.mjs <icons.json from the @iconify-json/game-icons package> <picks.json> public/js/icons.js
// picks.json maps a skill id (or "_name" for interface icons) to a game-icons name.
import fs from 'fs';
const [, , src, picksFile, out] = process.argv;
const ic = JSON.parse(fs.readFileSync(src, 'utf8')).icons, picks = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
const D = {};
for (const n of new Set(Object.values(picks))) { if (!ic[n]) throw new Error('no icon ' + n); D[n] = [...ic[n].body.matchAll(/ d="([^"]+)"/g)].map(m => m[1]).join(''); }
const SK = {}, UI = {}; for (const [k, v] of Object.entries(picks)) (k[0] === '_' ? UI : SK)[k.replace(/^_/, '')] = v;
const js = `/* build 0047: high-res interface and skill icons. Shapes from game-icons.net by Lorc, Delapouite and contributors, CC BY 3.0 (https://game-icons.net). Made by tools/ui/make_icons.mjs */
const ICONS = (() => {
  const D = ${JSON.stringify(D)};
  const SK = ${JSON.stringify(SK)}, UI = ${JSON.stringify(UI)};
  /* build 0155: hand-drawn gold coin and shard crystal for the currency counters (even-odd fill cuts the coin rim and the crystal facet) */
  const EO = {"oath-coin":"M36 256a220 220 0 1 0 440 0a220 220 0 1 0-440 0zM76 256a180 180 0 1 0 360 0a180 180 0 1 0-360 0zM98 256a158 158 0 1 0 316 0a158 158 0 1 0-316 0zM256 166l58 90l-58 90l-58-90z","oath-shard":"M256 20L352 140L316 470L196 470L160 140zM256 64L270 150L256 420L242 150zM120 230L170 300L150 470L96 470L78 300zM392 262L436 320L420 470L372 470L352 320z"};
  Object.assign(D, EO);
  const url = n => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path' + (EO[n] ? ' fill-rule="evenodd"' : '') + ' d="' + D[n] + '"/></svg>') + '")';
  let css = ''; for (const n in D) css += '.gi-' + n + '{-webkit-mask-image:' + url(n) + ';mask-image:' + url(n) + '}';
  for (const k in UI) css += '.giv-' + k + '{--gi:' + url(UI[k]) + '}';
  try { const st = document.createElement('style'); st.id = 'giCss'; st.textContent = css; document.head.appendChild(st); } catch (e) { }
  const EL = { fire: 'fire', cold: 'cold', light: 'light', arc: 'arc', phys: 'phys' };
  const span = (n, cls) => '<span class="gw ' + cls + '"><span class="gi gi-' + n + '"></span></span>';
  return {
    skill(id) { const n = SK[id]; if (!n) return ''; const sk = typeof SKILLS !== 'undefined' && SKILLS[id]; return span(n, 'el-' + ((sk && EL[sk.el]) || 'util')); },
    ui(k, tone) { const n = UI[k]; return n ? span(n, 'el-' + (tone || 'util')) : ''; },
    icon(n, tone) { return D[n] ? span(n, 'el-' + (tone || 'util')) : ''; },
    gold() { return '<span class="cur">' + span('oath-coin', 'el-gold') + '</span>'; },
    shards() { return '<span class="cur">' + span('oath-shard', 'el-cold') + '</span>'; },
    has: id => !!SK[id]
  };
})();
`;
fs.writeFileSync(out, js); console.log('wrote', out, js.length, 'bytes,', Object.keys(D).length, 'icons');
