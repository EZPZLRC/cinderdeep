'use strict';
const UI = (() => {
  const $ = id => document.getElementById(id);
  const glc = $('gl'), ov = $('ov'), ctx = ov.getContext('2d'), mini = $('mini'), mctx = mini.getContext('2d'), tip = $('tip');
  let slow = .016, slowN = 0, banT = 0, invOpen = false, invTab = 'hero', salvArm = false, last = 0, skEls = [], frameN = 0;
  const U = { invDirty: true };
  U.zoneBanner = (a, b) => { $('ban1').textContent = a; $('ban2').textContent = b || ''; $('banner').classList.add('on'); banT = 3.4; };
  const DTIPS = ['Health globes drop from slain monsters. Walk over them to heal.', 'You carry up to five potions and one refills every 15 seconds. Drink early, not at the last moment.', 'Red rings on the ground are about to explode. Step out of them.', 'Big monsters hit hard but slowly. Strike, then step back.', 'A shrine blesses you for 45 seconds. Fight the hard pack right after.', 'Town has a trader and an altar. Better gear makes every floor easier.'];
  U.showDeath = () => { $('deathBy').textContent = (P.killer ? 'Slain by ' + P.killer : 'You were overwhelmed') + ' on floor ' + (G.zone.def.depth || 1) + ' · level ' + G.hero.level + ' · ' + G.hero.kills + ' monsters felled so far'; $('deathTip').textContent = DTIPS[Math.random() * DTIPS.length | 0]; const hc = !!G.hero.hc; $('death').classList.toggle('hc', hc); $('death').querySelector('h1').textContent = hc ? 'Your hardcore hero has fallen' : 'You have fallen'; $('revive').classList.toggle('hide', hc); if (hc) { try { localStorage.removeItem(SAVE_KEY + '_' + G.hero.cls); } catch (e) { } G.hero.dead = 1; $('deathTip').textContent = 'Hardcore means one life. ' + G.hero.name + ' rests here on floor ' + (G.zone.def.depth || 1) + '. Their place on the leaderboard keeps a skull.'; } $('death').classList.remove('hide'); };

  // ---- item icons ----
  const IC = {
    sword: '<path d="M12 1l2.2 3.5V15H9.8V4.5z"/><rect x="6.5" y="15" width="11" height="2.2"/><rect x="11" y="17" width="2" height="5"/>',
    axe: '<rect x="11" y="2" width="2" height="20"/><path d="M13 3.5c5.5 0 7.5 3 7.5 5.5S18.5 14.5 13 14.5z"/>',
    maul: '<rect x="11" y="8" width="2" height="14"/><rect x="5" y="2" width="14" height="7.5" rx="1"/>',
    staff: '<rect x="11.2" y="7" width="1.6" height="15"/><path d="M12 1l3 3.5-3 3.5-3-3.5z"/>',
    wand: '<rect x="11.3" y="9" width="1.4" height="12"/><circle cx="12" cy="6" r="3"/>',
    bow: '<path d="M8 1.5c10 4.5 10 16.5 0 21" fill="none" stroke-width="2.2"/><path d="M8 1.5v21" fill="none" stroke-width=".9"/>',
    fist: '<path d="M6 10h12v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><rect x="6" y="6" width="2.7" height="5" rx="1.2"/><rect x="9.1" y="5" width="2.7" height="6" rx="1.2"/><rect x="12.2" y="5" width="2.7" height="6" rx="1.2"/><rect x="15.3" y="6" width="2.7" height="5" rx="1.2"/>',
    helm: '<path d="M4 15a8 8 0 0 1 16 0v5h-5v-6h-6v6H4z"/><rect x="11" y="3" width="2" height="6"/>',
    chest: '<path d="M5 4l4-2 3 2.5L15 2l4 2 2.5 5.5-3 2V22h-13V11.5l-3-2z"/>',
    shoulders: '<path d="M1.5 15a6.5 6.5 0 0 1 9.5-5.7V16H1.5zM22.5 15a6.5 6.5 0 0 0-9.5-5.7V16h9.5z"/>',
    gloves: '<path d="M7 22v-8l-2-4V6h2v4h1V3h2.2v6h1V2.5h2.2V9h1V4h2.2v9.5L15 17v5z"/>',
    bracers: '<path d="M7 2h10l-1.2 20H8.2z"/><path d="M8 8h8M8.5 15h7" stroke="#000" stroke-opacity=".45" stroke-width="1.4" fill="none"/>',
    belt: '<rect x="1.5" y="9" width="21" height="6" rx="1"/><rect x="9" y="7" width="6" height="10" fill="none" stroke-width="2"/>',
    pants: '<path d="M6 2h12l1.5 20h-5.5L12 9l-2 13H4.5z"/>',
    boots: '<path d="M8 2h6.5v11.5l6 4V22H8z"/>',
    amulet: '<path d="M5 2c0 9.5 14 9.5 14 0" fill="none" stroke-width="1.6"/><path d="M12 10l4.2 5.5L12 22l-4.2-6.5z"/>',
    ring: '<circle cx="12" cy="14.5" r="6" fill="none" stroke-width="2.6"/><path d="M12 2.5l3.2 3.2-3.2 3.2-3.2-3.2z"/>',
    o_Shield: '<path d="M4 3h16v8c0 6-4 9-8 11-4-2-8-5-8-11z"/>',
    o_Quiver: '<path d="M8 8h8l-1 14H9z"/><path d="M9.5 8L8.5 2M12 8V1M14.5 8l1-6" fill="none" stroke-width="1.5"/>',
    o_Orb: '<circle cx="12" cy="10.5" r="7"/><path d="M7 22h10l-2-3.5H9z"/>',
    o_Tome: '<path d="M5 3h14v18H5z"/><path d="M8.5 8h7M8.5 12h7" stroke="#000" stroke-opacity=".5" stroke-width="1.5" fill="none"/>',
    o_Charm: '<path d="M12 2l6 8-6 12-6-12z"/>'
  };
  // Every item draws its own picture: shape, material, trim and gem all come from the item's seed.
  function iconSvg(it) {
    const L = itemLook(it), M = L.mat[1], A = L.acc === M ? '#3a3440' : L.acc, G = L.gem[1], v = L.v, n = (x, k) => Math.min(k - 1, x * k | 0), W = '#6a4a2c', HI = 'fill="#fff" fill-opacity=".28" stroke="none"', DK = 'fill="#000" fill-opacity=".3" stroke="none"', LN = `fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".9"`;
    const P = (d, c, x) => `<path d="${d}" fill="${c}" ${x || ''}/>`, R = (x, y, w, h, c, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 0}" fill="${c}"/>`, C = (x, y, r, c, e) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${e || ''}/>`, gem = (x, y, r, k) => [C(x, y, r, G), P(`M${x} ${y - r * 1.3}l${r} ${r * 1.3}-${r} ${r * 1.3}-${r}-${r * 1.3}z`, G), R(x - r, y - r, r * 2, r * 2, G, .3), P(`M${x - r} ${y - r * .3}h${r * 2}l-${r} ${r * 1.5}z`, G)][k % 4] + C(x - r * .3, y - r * .3, r * .3, '#fff', 'fill-opacity=".6" stroke="none"');
    let s = '', tilt = 0; const k = it.slot === 'weapon' ? (it.base === 'Wand' ? 'wand' : it.wt) : it.slot === 'offhand' ? 'o_' + it.base : it.slot, a = n(v[0], 4), b = n(v[1], 3), c = n(v[2], 4), d = n(v[3], 2);
    if (k === 'sword') { tilt = 38; s = P(['M12 .5l2 3.2V15h-4V3.7z', 'M12 .5l3 4.2V15H9V4.7z', 'M10 15V6.5c0-3 2-5 4.6-6C13.6 3 14 5 14 8v7z', 'M12 .5c2.5 2 1 4 2.2 6s-.6 3.5.2 5V15H9.6v-3.5c.8-1.5-1-3 .2-5S9.5 2.5 12 .5z'][a], M) + P('M12 3.5V14', 'none', 'stroke="#fff" stroke-opacity=".4" stroke-width=".8"') + [R(6.5, 15, 11, 2, A, .6), P('M6 14.6q6 3.6 12 0v2q-6 3.4-12 0z', A), P('M5 17.6l3.2-3h7.6l3.2 3-3.2-.6H8.2z', A)][b] + R(11, 17, 2, 4.2, W) + gem(12, 22, 1.5, c); }
    else if (k === 'axe') { tilt = 30; const h1 = ['M13 3c5.5 0 7.5 3 7.5 5.8S18.5 14.5 13 14.5z', 'M13 4h4c3.2 1 4.2 4 3.6 9.5-2-2.8-4-3.4-7.6-3.4z', 'M13 5l6.5-3c1.6 3.6 1.6 9.4 0 13L13 12z', 'M13 3.5c3 .5 7 0 8 2-1 .5-1.5 2-1.5 3.3s.5 2.8 1.5 3.2c-1 2-5 1.500-8 2z'][a]; s = R(11, 1.5, 2, 21, d ? W : A, .6) + P(h1, M) + P(h1, '#fff', 'fill-opacity=".18" stroke="none" transform="translate(1.2 0) scale(.92 1)"') + (b === 1 ? P('M11 4c-4 0-6 2.200-6 4.800s2 4.700 6 4.700z', M) : b === 2 ? P('M11 6l-4 2.800 4 2.700z', M) : '') + gem(12, 8.8, 1.3, c) + R(10.6, 19, 2.8, 1.2, A); }
    else if (k === 'maul') { tilt = 30; s = R(11, 7, 2, 15.5, d ? W : A, .6) + [R(5, 1.5, 14, 8, M, 1.2) + R(5, 1.5, 14, 2.6, '#fff', 1) .replace('fill="#fff"', HI), C(12, 6, 5.2, M) + P('M12 .2l1.300 2h-2.600zM6 2l2.400.600L7 4.600zM18 2l-2.400.600L17 4.600zM5.800 9.500l2.200-.800.300 2.300zM18.200 9.500l-2.200-.800-.300 2.300z', A), P('M5 2.500h9l5.500 3.500-5.500 3.500H5z', M) + R(5, 2.5, 2.4, 7, A), P('M4.500 3l3-1.500h9l3 1.500v6l-3 1.500h-9l-3-1.500z', M) + P('M7.500 1.500v9M16.500 1.500v9', 'none', LN)][a] + gem(12, 6, 1.5, c) + R(10.6, 18.5, 2.8, 1.2, A) + (b ? R(10.6, 12, 2.8, 1.2, A) : ''); }
    else if (k === 'staff' || k === 'wand') { tilt = 28; const y0 = k === 'wand' ? 9 : 7; s = R(11.2, y0, 1.6, 22.5 - y0, M, .7) + P(`M11.6 ${y0 + 1}v12`, 'none', 'stroke="#fff" stroke-opacity=".3" stroke-width=".5"') + [P('M8.500 7.500c-1.500-3 0-5.500 3.500-6.500 3.500 1 5 3.500 3.500 6.500l-1.600-.500c.800-1.800.200-3.300-1.900-4-2.100.700-2.700 2.200-1.900 4z', A) + gem(12, 5.2, 2, c), C(12, 4.6, 3.6, G) + C(10.9, 3.5, 1.1, '#fff', 'fill-opacity=".55" stroke="none"') + P('M8 7.500q4 3 8 0l-.800 1.800q-3.200 1.700-6.400 0z', A), P('M12 1a5 5 0 1 0 4.500 7.200A4 4 0 1 1 12 1z', A) + gem(13, 5.4, 1.4, c), P('M12 9L8.500 5l1-4 1.300 3.500L12 .5l1.200 4L14.500 1l1 4z', A) + gem(12, 6.6, 1.3, c)][a] + (b ? R(10.7, 13 + b * 2, 2.6, 1.1, A) : '') + (k === 'wand' ? R(10.7, 19.5, 2.6, 2.5, W, .6) : ''); }
    else if (k === 'bow') { tilt = -18; const p = ['M8 1.500c10 4.500 10 16.500 0 21', 'M6 3c1.500-2.500 3-.500 4.500 1.500 6 5 6 10 0 15-1.500 2-3 4-4.500 1.500', 'M9 1c7 2 8.500 7 6.500 11 2 4 .500 9-6.500 11', 'M7 1.500c5 1 10 5 10 10.500S12 21.500 7 22.500'][a]; s = P(p, 'none', `stroke="#000" stroke-opacity=".55" stroke-width="3.2" stroke-linecap="round"`) + P(p, 'none', `stroke="${M}" stroke-width="2.2" stroke-linecap="round"`) + P(a === 1 ? 'M6 3v18' : a === 2 ? 'M9 1v22' : a === 3 ? 'M7 1.500v21' : 'M8 1.500v21', 'none', 'stroke="#e8e2d4" stroke-width=".7"') + R(a === 3 ? 15.4 : 14, 10, 2.6, 4, A, .8) + (b ? gem(a === 3 ? 16.7 : 15.3, 12, .9, c) : '') + (b === 2 ? P('M3 12h13', 'none', `stroke="${W}" stroke-width="1"`) + P('M16 12l-2.500-1.500v3z', '#c8ced8') + P('M3 12l1.500-1.500M3 12l1.500 1.500', 'none', `stroke="${G}" stroke-width="1"`) : ''); }
    else if (k === 'fist') { s = P('M6 10h12v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z', M) + [0, 1, 2, 3].map(i => R(6 + i * 3.1, i % 3 ? 5 : 6, 2.7, 6, a === 1 ? A : M, 1.2)).join('') + [R(6, 13.5, 12, 1.6, A), P('M7.300 5.500L8 1.500l.700 4zM10.400 4.500l.700-4 .700 4zM13.500 4.500l.700-4 .700 4zM16.600 5.500l.700-4 .700 4z', '#d8dee8'), P('M7 6L6 .5l2.500 5zM11 5L10.500 0l2 5zM15 5l1-5 1 5z', '#d8dee8') + R(6, 13.5, 12, 1.6, A), C(9, 15.5, 1.2, A) + C(15, 15.5, 1.2, A)][c] + gem(12, 15.8, b ? 1.4 : 0, a); }
    else if (k === 'helm') {
      if (it.base === 'Leather Hood') s = P('M12 2c5 0 8 4 8 10v9h-4.500c1-6-.500-10.500-3.500-10.500S7.500 15 8.500 21H4v-9c0-6 3-10 8-10z', M) + P('M12 2c5 0 8 4 8 10h-2c0-4.500-2.500-7.500-6-7.500z', '#fff', 'fill-opacity=".2" stroke="none"') + [P('M4 18.500h4.200M15.800 18.500H20', 'none', `stroke="${A}" stroke-width="1.4"`), gem(12, 4.4, 1.3, c), P('M12 2l1.500 5h-3z', A), ''][a];
      else if (it.base === 'Circlet') s = P('M3 11q9-5 18 0v3.500q-9-5-18 0z', M) + P('M3 11q9-5 18 0', 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width=".7"') + gem(12, 9.6, 2.2, c) + (a > 1 ? gem(6.5, 11, 1, c + 1) + gem(17.5, 11, 1, c + 1) : '') + (a % 2 ? P('M12 6.500l1-4.500-1 1.500-1-1.500z', A) : '');
      else s = [P('M5 2.500c-2.500 1.500-3 4.500-1 7.500l1.500-1c-1-2-.800-4 .500-5.500zM19 2.500c2.500 1.500 3 4.500 1 7.500l-1.500-1c1-2 .800-4-.500-5.500z', '#ddd4bc'), P('M12 .5c4 1 6 4 6.500 7h-13c.500-3 2.500-6 6.500-7z', G), R(11, 1.5, 2, 7, A), ''][a] + P('M4 15a8 8 0 0 1 16 0v5.500h-5V14H9v6.500H4z', M) + P('M6 13a6.300 6.300 0 0 1 6-5', 'none', 'stroke="#fff" stroke-opacity=".45" stroke-width="1"') + [R(4, 12.4, 16, 1.6, A), P('M9 14h6', 'none', LN) + R(11.2, 8, 1.6, 6, A), P('M4 15h5M15 15h5', 'none', `stroke="${A}" stroke-width="1.3"`)][b] + (d ? gem(12, 10.2, 1.1, c) : '');
    }
    else if (k === 'chest') {
      const robe = it.base === 'Silk Robe', body = robe ? 'M8 2l4 2.200L16 2l4.500 4-2.300 3.200L19.500 22h-15L5.800 9.200 3.500 6z' : 'M5 4l4-2 3 2.500L15 2l4 2 2.500 5.500-3 2V22h-13V11.500l-3-2z';
      s = P(body, M) + P(robe ? 'M12 4.200V22' : 'M12 4.500V22', 'none', LN) + (it.base === 'Chainmail' ? P('M6.500 13h11M6.500 16h11M6.500 19h11M8 10h8', 'none', 'stroke="#000" stroke-opacity=".3" stroke-width=".8" stroke-dasharray="1.200 .800"') : it.base === 'Leather Jerkin' ? P('M10.500 8l3 2M10.500 11l3 2M10.500 14l3 2', 'none', `stroke="${A}" stroke-width=".9"`) : '') + [R(5.5, 15, 13, 1.8, A), P('M9 2l3 5 3-5', 'none', `stroke="${A}" stroke-width="1.5"`), P('M5.500 20h13v2h-13z', A), P('M5 4l4-2 1 4.500-4 2.500zM19 4l-4-2-1 4.500 4 2.500z', A)][a] + (b ? gem(12, robe ? 9 : 8.5, 1.4, c) : '') + P('M6.500 6l2-1.500', 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="1"');
    }
    else if (k === 'shoulders') { const one = 'M1.500 15a6.500 6.500 0 0 1 9.500-5.700V16H1.500z'; s = [1, -1].map(m => `<g transform="${m < 0 ? 'translate(24 0) scale(-1 1)' : ''}">` + P(one, M) + P('M2.800 13.500a5.200 5.200 0 0 1 5-4', 'none', 'stroke="#fff" stroke-opacity=".45" stroke-width=".9"') + [P('M1.500 14.200H11V16H1.500z', A), P('M4 9.500l1-5 1.500 4.500zM7.500 8.800l.800-4 1.200 4.200z', '#d8dee8'), P('M3 15V11M6 15V9.500M9 15V9.300', 'none', LN), C(6.3, 12.6, 1.5, A)][a] + (b ? gem(6.3, 12.6, 1, c) : '') + (it.base === 'Leather Mantle' ? P('M1.500 16l1.500 4 1.600-4 1.600 4 1.600-4 1.600 4L11 16z', M) : '') + '</g>').join(''); }
    else if (k === 'gloves') { s = P('M7 22v-8l-2-4V6h2v4h1V3h2.200v6h1V2.500h2.200V9h1V4h2.200v9.500L15 17v5z', M) + [R(7, 18, 8, 2, A), P('M7 22h8v-1.500H7zM7 18.500h8', A, `stroke="${A}" stroke-width="1"`), P('M8.300 11.500h7', 'none', `stroke="${A}" stroke-width="1.500"`), ''][a] + (it.base === 'Gauntlets' ? P('M8 9.200h2.200M11.200 8.700h2.200M14.400 9.200h2.200M8 6.500h2.200M11.200 6h2.200M14.400 6.800h2.200', 'none', LN) : P('M9.500 13.500v3M12.500 13.500v3', 'none', LN)) + (b ? gem(11.3, 14, 1.2, c) : ''); }
    else if (k === 'bracers') { s = P('M7 2h10l-1.200 20H8.200z', M) + P('M8.300 3.500l.700 17', 'none', 'stroke="#fff" stroke-opacity=".4" stroke-width="1"') + [P('M7.300 6h9.400M8 16h8', 'none', `stroke="${A}" stroke-width="1.600"`), P('M7 2h10l-.200 3H7.200zM8 19h8l-.200 3H8.200z', A), P('M10 5l4 3.500-4 3.500 4 3.500-4 3.500', 'none', `stroke="${A}" stroke-width="1.100"`), P('M12 4v16', 'none', `stroke="${A}" stroke-width="1.400" stroke-dasharray="1.500 1.500"`)][a] + (b ? gem(12, 11, 1.5, c) : ''); }
    else if (k === 'belt') { s = R(1.5, 9, 21, 6, M, 1) + P('M2 10.300h20', 'none', 'stroke="#fff" stroke-opacity=".35" stroke-width=".8"') + (d ? P('M4 12h1M17.500 12h1M20 12h1M6.500 12h1', 'none', `stroke="${A}" stroke-width="1.600" stroke-linecap="round"`) : '') + [R(8.6, 7, 6.8, 10, A, .6) + R(10.2, 8.6, 3.6, 6.8, M, .3), C(12, 12, 4.6, A) + C(12, 12, 2.6, M), P('M12 6l5.500 6-5.500 6-5.500-6z', A), R(7.5, 7.5, 9, 9, A, 2.5)][a] + gem(12, 12, 1.6, c) + (it.base === 'Sash' ? P('M15 15l1 6.500 2.500-1.500L17 15z', M) : ''); }
    else if (k === 'pants') { s = P('M6 2h12l1.500 20h-5.500L12 9l-2 13H4.500z', M) + R(6, 2, 12, 2.2, A) + [P('M6.200 14h4.600M13.200 14h4.600', 'none', `stroke="${A}" stroke-width="1.500"`), P('M6.800 10l-1 11M17.200 10l1 11', 'none', LN), P('M5.500 16.500h5l-.500 3h-4.800zM13.500 16.500h5l.300 3h-4.800z', A), P('M8 6v15M16 6v15', 'none', `stroke="${A}" stroke-width=".9" stroke-dasharray="1.200 1.200"`)][a] + (b ? gem(12, 3.1, .9, c) : '') + P('M7.500 5l-.800 8', 'none', 'stroke="#fff" stroke-opacity=".4" stroke-width="1"'); }
    else if (k === 'boots') { s = P('M8 2h6.500v11.500l6 4V22H8z', M) + P('M8 20.500h12.500V22H8z', '#000', 'fill-opacity=".5" stroke="none"') + [P('M8 2h6.500v2.800H8z', A), P('M8 6h6.500M8 9.500h6.500', 'none', `stroke="${A}" stroke-width="1.300"`), P('M7 2h8.500l-1 3.500H8z', A), P('M10 4.500l3 1.700-3 1.700 3 1.700-3 1.700', 'none', `stroke="${A}" stroke-width=".9"`)][a] + (it.base === 'Greaves' ? P('M14.500 13.500l5 3.300', 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="1"') + P('M9.500 3.500v9', 'none', 'stroke="#fff" stroke-opacity=".4" stroke-width="1"') : '') + (b ? gem(11.2, 14.6, 1.1, c) : ''); }
    else if (k === 'amulet') { s = P(['M5 2c0 9.500 14 9.500 14 0', 'M4 1.500L12 11l8-9.500', 'M6 1.500c-2 6 2 9 6 9.500 4-.500 8-3.500 6-9.500'][b], 'none', `stroke="${M}" stroke-width="1.500" stroke-linecap="round" stroke-dasharray="${d ? '0' : '1.800 .900'}"`) + [P('M12 9.500l4.500 6L12 22.500l-4.500-7z', M), C(12, 16, 5.5, M), P('M12 9.500c5 5.500 5.500 8 3.500 10.800-1.800 2.300-5.200 2.300-7 0C6.500 17.500 7 15 12 9.500z', M), P('M12 9.500l1.800 4.200 4.700.500-3.500 3 1 4.600-4-2.400-4 2.400 1-4.600-3.500-3 4.700-.500z', M)][a] + gem(12, a === 3 ? 16 : 16.3, a === 0 ? 2 : 2.6, c); }
    else if (k === 'ring') { const t = [2, 2.8, 3.6][b]; s = C(12, 14.5, 6, 'none', `stroke="#000" stroke-opacity=".5" stroke-width="${t + 1}"`) + C(12, 14.5, 6, 'none', `stroke="${M}" stroke-width="${t}"`) + P('M7.200 12a5.500 5.500 0 0 1 3-2.800', 'none', 'stroke="#fff" stroke-opacity=".6" stroke-width=".9"') + (d ? P('M8 19.300l1-1.600M16 19.300l-1-1.600M12 21.200v-1.800', 'none', LN) : '') + [gem(12, 6.5, 3, c), gem(12, 6.8, 2.2, c) + C(8.3, 8.6, 1.1, A) + C(15.7, 8.6, 1.1, A), R(8.6, 4.4, 6.8, 5, A, 1) + gem(12, 6.9, 1.7, c), gem(10, 7, 2, c) + gem(14, 7, 2, c + 1)][a]; }
    else if (k === 'o_Shield') { const sh = ['M4 3h16v8c0 6-4 9-8 11-4-2-8-5-8-11z', 'M12 2a10 10 0 1 0 .01 0z', 'M12 1.500l8 3.500c0 8-3 13.500-8 17.500C7 18.500 4 13 4 5z', 'M5 2.500h14v17l-7 2.500-7-2.500z'][a]; s = P(sh, M) + P(sh, 'none', `stroke="${A}" stroke-width="1.500" transform="translate(1.200 1.200) scale(.9)"`) + [P('M12 5v13M7 10.500h10', 'none', `stroke="${A}" stroke-width="2"`), P('M7 8l5 5 5-5M7 13l5 5 5-5', 'none', `stroke="${A}" stroke-width="1.700"`), C(12, 11.5, 3.6, A), P('M6.500 6l11 11', 'none', `stroke="${A}" stroke-width="2.600"`)][c] + (b ? gem(12, 11.5, 1.6, a) : '') + P('M7 5.500l3-1', 'none', 'stroke="#fff" stroke-opacity=".5" stroke-width="1"'); }
    else if (k === 'o_Quiver') { tilt = 14; s = [9.5, 12, 14.5].map((x, i) => P(`M${x} 9V2`, 'none', `stroke="${W}" stroke-width="1"`) + P(`M${x - 1.1} ${4.5 - (i % 2)}l1.100-3 1.100 3z`, i === 1 || a > 1 ? G : '#e8e2d4')).join('') + P('M8 8h8l-1 14H9z', M) + R(7.6, 8, 8.8, 1.8, A, .5) + [R(8.6, 14, 6.8, 1.4, A), P('M10 12l4 2-4 2 4 2', 'none', `stroke="${A}" stroke-width=".9"`), P('M12 11v9', 'none', `stroke="${A}" stroke-width="1.200" stroke-dasharray="1.200 1.200"`), gem(12, 15, 1.5, c)][a] + P('M16 9c3 3 3 8 0 12', 'none', `stroke="${W}" stroke-width="1"`); }
    else if (k === 'o_Orb') { s = [P('M7 22h10l-2-3.500H9z', A), P('M6 22h12v-1.500l-4-1-1-2.500h-2l-1 2.500-4 1z', A), P('M5 13c0 5 3 6.500 7 6.500s7-1.500 7-6.500l-2 1c-.500 3-2.500 3.800-5 3.800S7.500 17 7 14zM10 19.500h4V22h-4z', A)][b] + C(12, 10.5, 7, G) + C(12, 10.5, 7, M, 'fill-opacity=".35"') + [P('M8 10.500q4-5 8 0-4 5-8 0z', '#fff', 'fill-opacity=".35" stroke="none"'), P('M12 5l1.500 4 4 1.500-4 1.500-1.500 4-1.500-4-4-1.500 4-1.500z', '#fff', 'fill-opacity=".4" stroke="none"'), P('M7.500 13c2-6 6-6 9-5-3 0-6 1-9 5z', '#fff', 'fill-opacity=".35" stroke="none"'), C(12, 10.5, 3, '#000', 'fill-opacity=".35" stroke="none"')][a] + C(9.5, 7.5, 1.6, '#fff', 'fill-opacity=".65" stroke="none"'); }
    else if (k === 'o_Tome') { tilt = -8; s = P('M5 3h14v18H5z', M) + R(5, 3, 2.4, 18, '#000') .replace('fill="#000"', DK) + P('M19 4.500h1.200v15H19z', '#e8e2d4') + [P('M5 3h3.500L5 6.500zM19 3h-3.500L19 6.500zM5 21h3.500L5 17.500zM19 21h-3.500L19 17.500z', A), R(9, 5.5, 8, 13, 'none') .replace('fill="none"', `fill="none" stroke="${A}" stroke-width="1"`), P('M8.500 7h8M8.500 17h8', 'none', `stroke="${A}" stroke-width="1.300"`), R(15.5, 10, 4.5, 3.6, A, .6)][a] + [gem(13, 12, 2.2, c), P('M13 8.500l1 2.500 2.600.300-2 1.800.600 2.600-2.200-1.400-2.200 1.400.600-2.600-2-1.800 2.600-.300z', G), C(13, 12, 2.8, 'none', `stroke="${G}" stroke-width="1.200"`) + C(13, 12, .9, G)][b]; }
    else if (k === 'o_Charm') { s = P('M12 1v3', 'none', `stroke="${A}" stroke-width="1.400"`) + C(12, 3.4, 1.6, 'none', `stroke="${A}" stroke-width="1.100"`) + [P('M12 4.500l6 7-6 11-6-11z', M), P('M12 5c5 0 7 4 7 7.500S16 22 12 22s-7-6-7-9.500S7 5 12 5z', M), P('M12 5l2.200 5 5.300.600-4 3.600 1.200 5.300L12 16.800l-4.700 2.700 1.200-5.300-4-3.600 5.300-.600z', M), P('M7 6h10v8c0 4-2.500 6.500-5 8-2.500-1.500-5-4-5-8z', M)][a] + gem(12, 12.5, 2.6, c) + (b ? P('M12 16.500v4', 'none', `stroke="${A}" stroke-width="1"`) : ''); }
    else s = IC.ring;
    return `<svg viewBox="-1 -1 26 26" stroke="#000" stroke-opacity=".6" stroke-width=".55" stroke-linejoin="round"><g transform="rotate(${tilt} 12 12)">${s}</g></svg>`;
  }
  function slotSvg(sl) { const k = sl === 'weapon' ? 'sword' : sl === 'offhand' ? 'o_' + OFFHAND[G.hero.cls].n : sl.replace(/\d/, ''); return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0">' + (IC[k] || IC.ring) + '</svg>'; }
  function allyBest() { // one click: the Sellsword takes the best weapon and armour from your bag, leaving your own upgrades alone
    const h = G.hero, sc = it => it ? it.rar * 10 + (it.up || 0) + it.ilvl * .01 : -1; let n = 0, names = [];
    for (const sl of ['weapon', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots']) { let bi = -1, bs = sc((h.allyEq || {})[sl]); h.inv.forEach((it, i) => { if (it && it.slot === sl && !(verdict(it) > 0) && sc(it) > bs) { bs = sc(it); bi = i; } }); if (bi >= 0) { const nm = h.inv[bi].name; if (allyGive(bi)) { n++; names.push(nm); } } }
    hint(n ? 'The Sellsword put on ' + n + ' piece' + (n > 1 ? 's' : '') + '. Its hits are now worth ' + Math.round(allyPower() * 100) + '% of yours.' : 'Nothing in your bag beats what the Sellsword already wears.'); refresh(); }
  function verdict(it) { try { if (!G.hero || !canUse(it) || !P.stats) return 0; const eq = Object.assign({}, G.hero.eq); eq[eqSlotFor(it)] = it; const a = P.stats, b = calcStats(eq), v = (b.dps - a.dps) / Math.max(1, a.dps) + (b.tough - a.tough) / Math.max(1, a.tough); return v > .004 ? 1 : v < -.004 ? -1 : 0; } catch (e) { return 0; } }
  function itemEl(it, attr, cls, style) { const v = /data-i=/.test(attr || '') ? verdict(it) : 0; return `<div class="it r${it.rar} ${cls || ''}" ${attr} style="${style || ''}">${iconSvg(it)}<span class="lv">${it.ilvl}</span>${v ? `<span class="ar ${v > 0 ? 'up' : 'dn'}">${v > 0 ? '▲' : '▼'}</span>` : ''}</div>`; }
  function gridHtml(inv, key, mark) {
    let h = ''; for (let i = 0; i < inv.length; i++) h += `<div class="bc" data-${key}c="${i}" style="grid-column:${i % 10 + 1};grid-row:${(i / 10 | 0) + 1}"></div>`;
    inv.forEach((it, i) => { if (it) h += itemEl(it, `data-${key}="${i}"`, (mark && mark(it, i) ? 'up ' : '') + (itemH(it) === 2 ? 'tall' : ''), `grid-column:${i % 10 + 1};grid-row:${(i / 10 | 0) + 1} / span ${itemH(it)}`); }); return h;
  }

  // ---- tooltips ----
  let townMode = null, altarSel = null, altarLine = null;
  function wdps(it) { return (it.dmg[0] + it.dmg[1]) / 2 * it.spd; }
  const score = itemScore;
  function eqSlotFor(it) { const h = G.hero; if (it.slot !== 'ring') return it.slot; return 'ring1'; return !h.eq.ring1 ? 'ring1' : !h.eq.ring2 ? 'ring2' : (score(h.eq.ring1) <= score(h.eq.ring2) ? 'ring1' : 'ring2'); }
  function eqFor(it) { return G.hero.eq[eqSlotFor(it)] || null; }
  function tipHtml(it, mode) {
    const pc = (a, b) => b ? Math.round((a / b - 1) * 100) : 0, sg = v => (v > 0 ? '+' : '') + v;
    let h = `<div class="tn" style="color:${RAR[it.rar].c}">${it.name}</div><div class="ts">${RAR[it.rar].n} ${it.rar > 1 || it.slot === 'offhand' ? it.base : SLOT_NAME[it.slot]} · Item level ${it.ilvl}</div>${it.cls && CLASSES[it.cls] ? `<div class="ts" style="color:#${(CLASS_COL[it.cls] || 0xd8a040).toString(16).padStart(6, '0')}">${CLASSES[it.cls].n} item${G.hero && G.hero.cls !== it.cls ? ' · only a ' + CLASSES[it.cls].n + ' can pick this up in a party' : ''}</div>` : ''}`;
    const L = itemLook(it);
    if (it.dmg) h += `<div class="tb">${it.dmg[0]}–${it.dmg[1]} damage · ${Math.round(it.spd * 100)}% attack speed</div>`;
    if (it.armor) h += `<div class="tb">${it.armor} armor</div>`;
    it.aff.forEach((a, i) => { h += `<div class="ta">${statText(a.k, a.v)}${it.ench === i ? ' <span class="ts">(altered)</span>' : ''}</div>`; });
    if (it.power) h += `<div class="tp">${POWERS[it.power].d}</div>`;
    h += `<div class="tl">${L.mat[0]}, set with ${L.gem[0]}. ${L.lore} ${L.note}</div>`;
    if (!canUse(it)) h += `<div class="tc dn">Your ${CLASSES[G.hero.cls].n} cannot use this</div>`;
    else if (mode !== 'eq') { const eq = Object.assign({}, G.hero.eq); eq[eqSlotFor(it)] = it; const a = P.stats, b = calcStats(eq), d = pc(b.dps, a.dps), t = pc(b.tough, a.tough); h += `<div class="tv ${d + t > 0 ? 'up' : d + t < 0 ? 'dn' : ''}">${d + t > 0 ? '▲ Upgrade' : d + t < 0 ? '▼ Weaker than what you wear' : '＝ About the same'}</div><div class="tc">If equipped: <span class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : ''} ${sg(d)}% Damage</span> · <span class="${t > 0 ? 'up' : t < 0 ? 'dn' : ''}">${t > 0 ? '▲' : t < 0 ? '▼' : ''} ${sg(t)}% Toughness</span></div>`; }
    const tips = { eq: townMode === 'altar' ? 'Click to place on the altar' : 'Click to unequip', stash: 'Click to take', shop: 'Click to buy for ' + (mode === 'shop' ? buyPrice(it) : 0) + ' gold', bag: townMode === 'stash' ? 'Click to put in the stash' : townMode === 'vendor' ? 'Click to sell for ' + itemValue(it) + ' gold' : townMode === 'altar' ? 'Click to place on the altar' : 'Click to equip · Drag to move, drop or scrap (' + itemShards(it) + ' shards)' + (G.online ? ' · Shift-click to give' : '') };
    return h + `<div class="th">${tips[mode] || ''}</div>`;
  }
  function showTip(html, x, y) { if (tip.classList.contains('pin')) return; tip.innerHTML = html; tip.classList.remove('hide'); const r = tip.getBoundingClientRect(); let tx = x - r.width - 14, ty = y + 12; if (tx < 6) tx = x + 16; if (ty + r.height > innerHeight - 6) ty = innerHeight - r.height - 6; tip.style.left = tx + 'px'; tip.style.top = Math.max(6, ty) + 'px'; }
  function hideTip() { if (!tip.classList.contains('pin')) tip.classList.add('hide'); }
  function unpin() { tip.classList.remove('pin'); tip.classList.add('hide'); tip.style.transform = ''; }
  function sheet(it, key, mode) {
    const b = (a, t) => `<button data-a="${a}">${t}</button>`; let acts = '';
    if (mode === 'eq') acts = (townMode === 'altar' ? b('al', 'Place on altar') : '') + b('un', 'Unequip'); else if (mode === 'stash') acts = b('tk', 'Take'); else if (mode === 'shop') acts = b('buy', 'Buy · ' + buyPrice(it) + 'g');
    else acts = (townMode === 'stash' ? b('st', 'Stash') : townMode === 'vendor' ? b('sell', 'Sell · ' + itemValue(it) + 'g') : townMode === 'altar' ? b('al', 'Place on altar') : '') + b('eq', 'Equip') + (it.slot !== 'ring' && it.slot !== 'amulet' && it.slot !== 'offhand' ? b('ag', 'Give to Sellsword') : '') + b('sc', 'Scrap · ' + itemShards(it)) + b('dr', 'Drop') + (G.online ? b('gv', 'Give to nearest') : '');
    tip.innerHTML = tipHtml(it, mode).replace(/<div class="th">.*?<\/div>/, '') + `<div class="acts">${acts}${b('x', 'Close')}</div>`;
    tip.dataset.k = key; tip.classList.remove('hide'); tip.classList.add('pin'); tip.style.left = '50%'; tip.style.top = '50%'; tip.style.transform = 'translate(-50%,-50%)';
  }
  tip.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return; const k = tip.dataset.k;
    if (a === 'e1' || a === 'e2') equipFromInv(+k, a === 'e1' ? 'ring1' : 'ring2'); else if (a === 'eq') equipFromInv(+k); else if (a === 'ag') allyGive(+k); else if (a === 'sc') scrapItem(+k); else if (a === 'un') unequip(k); else if (a === 'gv') giveItem(+k); else if (a === 'dr') dropFromInv(+k); else if (a === 'st') toStash(+k); else if (a === 'tk') fromStash(+k); else if (a === 'sell') sellItem(+k); else if (a === 'buy') buyItem(+k); else if (a === 'al') { altarSel = isNaN(+k) ? k : +k; altarLine = null; }
    unpin(); refresh();
  });

  // ---- inventory ----
  const DOLL = { shoulders: [1, 1, 2], helm: [2, 1, 2], amulet: [3, 2, 1], gloves: [1, 3, 2], chest: [2, 3, 2], bracers: [3, 3, 2], ring1: [1, 5, 1], belt: [2, 5, 1], weapon: [1, 6, 2], pants: [2, 6, 2], offhand: [3, 6, 2], boots: [2, 8, 2] };
  const fmt = n => Math.round(n).toLocaleString();
  function renderInv() {
    const h = G.hero, s = P.stats; U.invDirty = false; let d = '';
    for (const sl in DOLL) { const p = DOLL[sl], it = h.eq[sl], st = `grid-column:${p[0]};grid-row:${p[1]} / span ${p[2]}`; d += it ? itemEl(it, `data-slot="${sl}"`, 'ds', st) : `<div class="ds empty" data-slot="${sl}" style="${st}" title="${SLOT_NAME[sl]}">${slotSvg(sl)}</div>`; }
    const L = (a, b) => `<div>${a} <b>${b}</b></div>`;
    $('inv').classList.toggle('ally', invTab === 'ally'); $('inv').innerHTML = `<div class="ph"><h3>Inventory</h3><button class="xb" data-x="inv" aria-label="Close">×</button></div><div class="tabs"><button data-tab="hero" class="${invTab === 'hero' ? 'on' : ''}">Hero</button><button data-tab="ally" class="${invTab === 'ally' ? 'on' : ''}">Sellsword</button></div>
      <div class="itop"><div id="stats"><div class="hl"><span>Damage</span><b>${fmt(s.dps)}</b></div><div class="hl"><span>Toughness</span><b>${fmt(s.tough)}</b></div><div class="hl"><span>Recovery</span><b>${s.recov}</b></div>
        ${L('Life', s.maxLife) + L('Armor', s.armorT) + L('Crit chance', Math.round(s.critT) + '%') + L('Crit damage', Math.round(s.critM * 100) + '%') + L('Attack speed', '+' + Math.round(s.aspd) + '%') + L('Move speed', '+' + Math.round(s.ms) + '%') + L('Resist F/C/L', Math.round(s.rfire) + '/' + Math.round(s.rcold) + '/' + Math.round(s.rlight)) + L('Dodge', Math.round(s.dodgeT) + '%') + L('Magic find', '+' + Math.round(s.mf) + '%') + L('Kills', h.kills) + L('Best streak', h.best || 0) + L('Guardians', h.runs)}</div>
        <div id="doll">${d}</div></div>${invTab === 'ally' ? `<div class="pgbox"><div class="hl"><span>Sellsword</span><b>hits for ${Math.round(allyPower() * 100)}% of yours</b></div><div class="allywrap"><div id="adoll">${Object.keys(DOLL).filter(sl => sl !== 'ring1' && sl !== 'amulet' && sl !== 'offhand').map(sl => { const p = DOLL[sl], it = (h.allyEq || {})[sl], st = `grid-column:${p[0]};grid-row:${p[1]} / span ${p[2]}`; return it ? itemEl(it, `data-at="${sl}" title="${it.name}: click to take back"`, 'ds', st) : `<div class="ds empty" style="${st}" title="${SLOT_NAME[sl]}: give the Sellsword one">${slotSvg(sl)}</div>`; }).join('')}</div><div class="sm allyhelp">The Sellsword wears weapons and armor you give it. Each piece makes it hit harder.<br><br>To give gear: click an item in your bag below, then <b>Give to Sellsword</b>.<br>To take it back: click the piece on the Sellsword.<br><br><button data-b="abest" title="Puts the best weapon and armour from your bag on the Sellsword. Upgrades for your own hero stay in your bag.">⚔ Equip best gear</button></div></div></div>` : ''}${h.level >= MAX_LEVEL ? `<div class="pgbox"><div class="hl"><span>Paragon ${h.plvl || 0}</span><b>${paragonFree()} to spend</b></div>${Object.keys(PARAGON).map(k => `<button data-pg="${k}" ${paragonFree() < 1 || (PARAGON[k][2] && ((h.pg || {})[k] || 0) >= PARAGON[k][2]) ? 'disabled' : ''}>${PARAGON[k][0]} <b>${(h.pg || {})[k] || 0}</b><span>${PARAGON[k][1]}</span></button>`).join('')}</div>` : ''}
      <div id="grid">${gridHtml(h.inv, 'i', it => { if (!canUse(it)) return false; const e = eqFor(it); return !e || score(it) > score(e); })}</div>
      <div class="ifoot"><span class="gold">${h.gold.toLocaleString()} gold</span><span class="shards">${(h.shards || 0).toLocaleString()} shards</span><span id="scrapBox">Drag here to scrap</span></div>
      <div class="ifoot sbar"><button data-b="sort">Sort</button><span class="slab">Salvage:</span><button data-b="s0" title="Salvage every Common item in your bag">Common</button><button data-b="s1" title="Salvage every Common and Magic item in your bag">Common + Magic</button><button data-b="sall" class="${salvArm ? 'warn' : ''}" title="Salvages everything in your bag except Legendary and Mythic items">${salvArm ? 'Sure? Tap again' : 'All'}</button></div>`;
  }
  function toggleInv(v) { invOpen = v === undefined ? !invOpen : v; $('inv').classList.toggle('hide', !invOpen); hideTip(); if (invOpen) renderInv(); else if (townMode) closeTown(); }
  function refresh() { if (invOpen) renderInv(); if (townMode) renderTown(); }
  function bagClick(i, e) {
    const it = G.hero.inv[i]; if (!it) return; if (lastTouch) { sheet(it, i, 'bag'); return; }
    if (e.shiftKey && G.online) giveItem(i); else if (townMode === 'stash') toStash(i); else if (townMode === 'vendor') sellItem(i); else if (townMode === 'altar') { altarSel = i; altarLine = null; } else { sheet(it, i, 'bag'); return; } // a plain click shows the item and its comparison first; right-click or double-click equips
    hideTip(); refresh();
  }
  let noClick = false, drag = null;
  $('inv').addEventListener('click', e => {
    if (noClick) return; const x = e.target.closest('[data-x]'); if (x) { toggleInv(false); return; } const b = e.target.closest('[data-b]'); if (b) { if (b.dataset.b === 'abest') { allyBest(); return; } if (b.dataset.b === 'sort') sortBag(G.hero.inv); else if (b.dataset.b === 'sall') { if (!salvArm) { salvArm = true; setTimeout(() => { salvArm = false; if (invOpen) refresh(); }, 3000); } else { salvArm = false; const n = G.hero.inv.filter(x => x && x.rar <= 2).length; scrapAll(2); if (!n) hint('Nothing to salvage. Legendary and Mythic items are always kept.'); } } else scrapAll(b.dataset.b === 's1' ? 1 : 0); refresh(); return; }
    const tb = e.target.closest('[data-tab]'); if (tb) { invTab = tb.dataset.tab; refresh(); return; }
    const atb = e.target.closest('[data-at]'); if (atb) { allyTake(atb.dataset.at); refresh(); return; }
    const pgb = e.target.closest('[data-pg]'); if (pgb) { spendParagon(pgb.dataset.pg); refresh(); return; }
    const c = e.target.closest('[data-i]'); if (c) { bagClick(+c.dataset.i, e); return; }
    const sl = e.target.closest('.it[data-slot]'); if (sl) { if (lastTouch) sheet(G.hero.eq[sl.dataset.slot], sl.dataset.slot, 'eq'); else { if (townMode === 'altar') { altarSel = sl.dataset.slot; altarLine = null; } else unequip(sl.dataset.slot); hideTip(); refresh(); } }
  });
  $('inv').addEventListener('dblclick', e => { const c = e.target.closest('[data-i]'); if (c && !townMode && G.hero.inv[+c.dataset.i]) { equipFromInv(+c.dataset.i); hideTip(); refresh(); } });
  $('inv').addEventListener('contextmenu', e => { e.preventDefault(); const c = e.target.closest('[data-i]'); if (c) { equipFromInv(+c.dataset.i); hideTip(); refresh(); } });
  $('inv').addEventListener('mousemove', e => { if (lastTouch || (drag && drag.on)) return; const c = e.target.closest('.it'); if (!c) return hideTip(); const h = G.hero; if (c.dataset.i !== undefined) { const it = h.inv[+c.dataset.i]; if (it) showTip(tipHtml(it, 'bag'), e.clientX, e.clientY); } else if (c.dataset.slot && h.eq[c.dataset.slot]) showTip(tipHtml(h.eq[c.dataset.slot], 'eq'), e.clientX, e.clientY); });
  $('inv').addEventListener('mouseleave', hideTip);
  $('inv').addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; const el = e.target.closest('.it[data-i]'); if (el) drag = { i: +el.dataset.i, x: e.clientX, y: e.clientY, on: false, g: null }; });
  window.addEventListener('pointermove', e => {
    if (!drag) return; if (!drag.on) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return; const it = G.hero.inv[drag.i]; if (!it) { drag = null; return; } drag.on = true; hideTip(); const g = document.createElement('div'); g.className = 'ghost it r' + it.rar; g.innerHTML = iconSvg(it); document.body.appendChild(g); drag.g = g; }
    drag.g.style.left = e.clientX - 20 + 'px'; drag.g.style.top = e.clientY - 20 + 'px';
  });
  window.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null; if (!d.on) return; d.g.remove(); noClick = true; setTimeout(() => { noClick = false; }, 0);
    const t = document.elementFromPoint(e.clientX, e.clientY), cl = q => t && t.closest(q); let m;
    if ((m = cl('[data-ic]'))) moveItem(d.i, +m.dataset.ic); else if ((m = cl('.it[data-i]'))) moveItem(d.i, +m.dataset.i); else if ((m = cl('[data-slot]'))) equipFromInv(d.i, m.dataset.slot);
    else if (cl('#scrapBox')) scrapItem(d.i); else if (cl('#town')) { if (townMode === 'stash') toStash(d.i); else if (townMode === 'vendor') sellItem(d.i); else if (townMode === 'altar') { altarSel = d.i; altarLine = null; } }
    else if (!cl('#inv') && !cl('#skl')) dropFromInv(d.i);
    refresh();
  });

  // ---- town: stash, trader, altar ----
  function renderTown() {
    const h = G.hero, T = $('town'), head = t => `<div class="ph"><h3>${t}</h3><button class="xb" data-x="town" aria-label="Close">×</button></div>`;
    if (townMode === 'stash') T.innerHTML = head('Stash') + `<div class="sm">Shared by all your heroes on this device. Click an item to move it. <button data-ss="1" style="padding:4px 10px;font-size:12px;margin-left:6px">Sort</button></div><div id="sgrid">${gridHtml(G.stash, 's')}</div>`;
    else if (townMode === 'vendor') T.innerHTML = head('Mirel the Trader') + `<div class="sm">Click an item to buy it. Click items in your bag to sell them. You have <b style="color:#ffd84a">${h.gold.toLocaleString()} gold</b>.</div><div id="shop">${(h.stock || []).map((it, k) => it ? `<div class="srow2" data-v="${k}">${itemEl(it, '', itemH(it) === 2 ? 'tall' : '')}<div><b style="color:${RAR[it.rar].c}">${it.name}</b><div class="sm">${SLOT_NAME[it.slot]} · level ${it.ilvl}</div><div class="${h.gold >= buyPrice(it) ? 'gold' : 'dn'}">${buyPrice(it).toLocaleString()} gold</div></div></div>` : '').join('') || '<div class="sm">Sold out. New stock arrives after you have been out fighting.</div>'}</div>`;
    else if (townMode === 'altar') {
      const it = altarSel !== null ? (typeof altarSel === 'string' ? h.eq[altarSel] : h.inv[altarSel]) : null; let b = head('Altar of Embers') + `<div class="sm">Lay an item on the altar and the embers forge it stronger, up to <b>+${MAX_UP}</b>. It never fails. You have <b style="color:#9ad0ff">${h.shards || 0} shards</b> and <b style="color:#ffd84a">${h.gold.toLocaleString()} gold</b>.</div>`;
      if (!it) b += '<div class="abox sm">Click an item in your bag, or one your hero is wearing, to place it on the altar.</div>';
      else {
        const c = upCost(it), n = it.up || 0, p = upPreview(it), pips = '◆'.repeat(n) + '◇'.repeat(MAX_UP - n);
        b += `<div class="abox"><div class="srow2">${itemEl(it, '', itemH(it) === 2 ? 'tall' : '')}<div><b style="color:${RAR[it.rar].c}">${it.name}</b><div class="sm">${SLOT_NAME[it.slot]} · level ${it.ilvl}${typeof altarSel === 'string' ? ' · equipped' : ''}</div><div class="pips">${pips}</div></div></div>`;
        if (n >= MAX_UP) b += '<div class="sm" style="margin-top:8px;color:#ffd84a">This item is fully forged.</div>';
        else { b += '<div class="odds"><b>The next forging gives</b>' + (it.dmg ? `<div>Damage ${it.dmg[0]}–${it.dmg[1]} <span class="up">→ ${p.dmg[0]}–${p.dmg[1]}</span></div>` : '') + (it.armor ? `<div>Armor ${it.armor} <span class="up">→ ${p.armor}</span></div>` : '') + it.aff.map((a, k) => `<div>${statText(a.k, a.v)} <span class="up">→ ${statText(a.k, p.aff[k].v)}</span></div>`).join('') + `</div><button class="big" data-rr="1" ${(h.shards || 0) >= c.shards && h.gold >= c.gold ? '' : 'disabled'}>Forge to +${n + 1} · ${c.shards} shards + ${c.gold.toLocaleString()} gold</button>`; }
        b += '</div>';
      }
      T.innerHTML = b;
    }
  }
  function closeTown() { townMode = null; altarSel = altarLine = null; $('town').classList.add('hide'); hideTip(); if (invOpen) renderInv(); }
  U.closeTown = closeTown;
  U.openTown = kind => { townMode = kind; altarSel = altarLine = null; if (sklOpen) toggleSkl(false); $('town').classList.remove('hide'); invOpen = true; $('inv').classList.remove('hide'); refresh(); };
  $('town').addEventListener('click', e => {
    if (e.target.closest('[data-x]')) { closeTown(); return; } let m;
    if (e.target.closest('[data-ss]')) sortBag(G.stash);
    else if ((m = e.target.closest('[data-s]'))) { if (lastTouch) sheet(G.stash[+m.dataset.s], m.dataset.s, 'stash'); else fromStash(+m.dataset.s); }
    else if ((m = e.target.closest('[data-v]'))) { if (lastTouch) sheet(G.hero.stock[+m.dataset.v], m.dataset.v, 'shop'); else buyItem(+m.dataset.v); }
    else if ((m = e.target.closest('[data-l]'))) altarLine = +m.dataset.l;
    else if (e.target.closest('[data-rr]')) { if (altarSel !== null) altarUpgrade(altarSel); }
    else return; hideTip(); refresh();
  });
  $('town').addEventListener('mousemove', e => { if (lastTouch) return; let m; if ((m = e.target.closest('[data-s]')) && G.stash[+m.dataset.s]) showTip(tipHtml(G.stash[+m.dataset.s], 'stash'), e.clientX, e.clientY); else if ((m = e.target.closest('[data-v]')) && G.hero.stock[+m.dataset.v]) showTip(tipHtml(G.hero.stock[+m.dataset.v], 'shop'), e.clientX, e.clientY); else hideTip(); });
  $('town').addEventListener('mouseleave', hideTip);

  // ---- hud ----
  const USE_LABEL = { chest: 'Open', shrine: 'Touch', stash: 'Stash', vendor: 'Trade', altar: 'Altar', tportal: 'Leave', portal: 'Enter', npc: 'Talk', lost: 'Help', rift: 'Rift' };
  function buildBar() {
    const bar = $('bar'), cls = CLASSES[G.hero.cls]; bar.innerHTML = ''; skEls = []; $('gFury').firstElementChild.style.background = cls.res.c;
    for (let i = 0; i < 5; i++) {
      const sk = i < 4 ? (SKILLS[i === 0 && !G.hero.eq.weapon ? 'punch' : G.hero.bar[i]] || { i: '＋', n: 'Empty slot', d: 'Open Skills to choose a skill for this slot.' }) : { i: '✚', n: 'Health Potion', d: 'Restores 60% of your life. Holds up to ' + FLASK_MAX + '; one refills every ' + FLASK_CD + ' seconds.' }; const d = document.createElement('div'); d.className = 'sk'; d.style.pointerEvents = 'auto';
      d.innerHTML = `<span class="key">${i < 4 ? SLOT_KEY[i] : '1'}</span><span class="ic"${i === 4 ? ' style="color:#ff5a5a"' : ''}>${sk.i}</span><div class="cd"></div><div class="cdt"></div>${sk.cost ? `<span class="cost">${sk.cost}</span>` : ''}`;
      const dn = e => { e.preventDefault(); if (e.button === 2) return; SFX.unlock(); if (i < 4) IN.tb[i] = true; else useFlask(); }, upb = () => { if (i < 4) IN.tb[i] = false; };
      if (i > 0 && i < 4) { const tog = () => { const h = G.hero; if (!h.bar[i]) return; h.autoc = h.autoc || [0, 0, 0, 0]; h.autoc[i] = h.autoc[i] ? 0 : 1; d.classList.toggle('auto', !!h.autoc[i]); hint(SKILLS[h.bar[i]].n + (h.autoc[i] ? ': auto-cast ON. It fires by itself when enemies are near.' : ': auto-cast off.')); saveGame(); }; d.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); if (!lastTouch && !G.tj) tog(); }); /* phones: holding a skill keeps casting; the A badge switches autocast */ if (G.hero.autoc && G.hero.autoc[i] && G.hero.bar[i]) d.classList.add('auto'); const ab = document.createElement('span'); ab.className = 'ab'; ab.textContent = 'A'; ab.title = 'Autocast'; ab.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.unlock(); tog(); }); ab.addEventListener('pointerup', e => e.stopPropagation()); d.appendChild(ab); } // phones: a small A on each skill button switches autocast
      if (i === 4) { const tog = () => { const h = G.hero; h.autoPot = !h.autoPot; d.classList.toggle('auto', !!h.autoPot); hint(h.autoPot ? 'Auto-potion ON. You drink by yourself when your life drops below half.' : 'Auto-potion off.'); saveGame(); }; d.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); if (!lastTouch && !G.tj) tog(); }); if (G.hero.autoPot) d.classList.add('auto'); const ab = document.createElement('span'); ab.className = 'ab'; ab.textContent = 'A'; ab.title = 'Auto-potion'; ab.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.unlock(); tog(); }); ab.addEventListener('pointerup', e => e.stopPropagation()); d.appendChild(ab); }
      d.addEventListener('pointerdown', dn); d.addEventListener('pointerup', upb); d.addEventListener('pointerleave', upb); d.addEventListener('pointercancel', upb); d.addEventListener('contextmenu', e => { e.preventDefault(); if (i === 0 && !G.tj && !IN.touch && !lastTouch) toggleSkl(true, i); }); /* phones: holding attack never opens the skills panel */
      d.addEventListener('mousemove', e => !lastTouch && showTip(`<div class="tn">${sk.n}</div><div class="ts">${sk.d}</div>${sk.cost ? `<div class="tp">Costs ${sk.cost} ${cls.res.n}</div>` : ''}${sk.gen ? `<div class="tp">Generates ${sk.gen} ${cls.res.n} per enemy hit</div>` : ''}${sk.cd ? `<div class="ts">Cooldown ${sk.cd}s</div>` : ''}${i > 0 && i < 4 && G.hero.bar[i] ? `<div class="tv ${G.hero.autoc && G.hero.autoc[i] ? 'up' : ''}">${G.tj ? 'Tap the A to autocast' : 'Right click to autocast'}${G.hero.autoc && G.hero.autoc[i] ? ' (ON)' : ''}</div>` : i === 4 ? `<div class="tv ${G.hero.autoPot ? 'up' : ''}">${G.tj ? 'Tap the A for auto-potion' : 'Right click for auto-potion'}${G.hero.autoPot ? ' (ON)' : ''}: drinks by itself below half life</div>` : ''}`, e.clientX, e.clientY - 150));
      d.addEventListener('mouseleave', hideTip); bar.appendChild(d); skEls.push(d);
    }
    { const d = document.createElement('div'); d.className = 'sk use'; d.id = 'bUse'; d.style.pointerEvents = 'auto'; d.innerHTML = '<span class="ic">Loot</span>'; d.addEventListener('pointerdown', e => { e.preventDefault(); SFX.unlock(); useNear(); }); bar.appendChild(d); }
  }
  // ---- skills panel ----
  let sklOpen = false, sklSlot = 1;
  function renderSkl() { // read-only: your four skills, what they do, and an autocast switch. Nothing to pick.
    const h = G.hero, RN = CLASSES[h.cls].res.n, kit = KIT[h.cls] || [];
    let html = '<div class="ph"><h3>Your skills</h3><button class="xb" data-x="skl" aria-label="Close">×</button></div><div class="list">';
    const row = (id, key, lv, slot) => { const sk = SKILLS[id], open = h.level >= lv, auto = slot > 0 && h.autoc && h.autoc[slot]; return `<div class="srow${open ? '' : ' lock'}"><div class="si">${open ? sk.i : '🔒'}</div><div style="flex:1"><b>${sk.n}</b> <span class="sm">${key}${open ? '' : ' · unlocks at level ' + lv}${sk.cost ? ' · ' + sk.cost + ' ' + RN : sk.gen ? ' · builds ' + RN : ''}${sk.cd ? ' · ' + sk.cd + 's cooldown' : ''}</span><div class="sd">${sk.d}</div></div>${slot > 0 && open ? `<button data-ac="${slot}" class="${auto ? 'on' : ''}">${auto ? 'Auto: ON' : 'Auto: off'}</button>` : ''}</div>`; };
    html += row(h.bar[0] || CLASSES[h.cls].skills[0], SLOT_KEY[0], 1, 0); kit.forEach((id, k) => { html += row(id, SLOT_KEY[k + 1], KIT_LV[k], k + 1); });
    $('skl').innerHTML = html + '</div><div class="sm" style="margin-top:8px">Your class gives you these four skills. New ones unlock at level 3 and level 6 and go on your bar by themselves. Switch Auto on and a skill fires by itself whenever enemies are near.</div>';
  }
  function toggleSkl(v, slot) { sklOpen = v === undefined ? !sklOpen : v; if (sklOpen && townMode) closeTown(); if (slot !== undefined) sklSlot = slot; $('skl').classList.toggle('hide', !sklOpen); if (sklOpen) renderSkl(); }
  $('skl').addEventListener('click', e => { if (e.target.closest('[data-x]')) { toggleSkl(false); return; } const ac = e.target.closest('[data-ac]'); if (ac) { const s = +ac.dataset.ac, h = G.hero; h.autoc = h.autoc || [0, 0, 0, 0]; h.autoc[s] = h.autoc[s] ? 0 : 1; buildBar(); renderSkl(); saveGame(); return; } const t = e.target.closest('[data-s]'); if (t) { sklSlot = +t.dataset.s; renderSkl(); return; } const tr = e.target.closest('.srow.tier'); if (tr) { const i = +tr.dataset.t; if (G.hero.level >= TIER_LV[i]) openPick(i); return; } const r = e.target.closest('.srow'); if (r && setSkill(sklSlot, r.dataset.k)) { buildBar(); renderSkl(); } });
  // ---- the skill choice: two cards, pick one ----
  function openPick(i) {
    const h = G.hero; if (i === undefined) i = pendingPick(h); if (i < 0) { $('pick').classList.add('hide'); return; } const t = skillTiers(h.cls)[i], RN = CLASSES[h.cls].res.n, cur = h.picks[i];
    $('pick').innerHTML = `<div class="box"><div class="ph"><h3>${cur ? 'Change your level ' + TIER_LV[i] + ' skill' : 'Level ' + TIER_LV[i] + ' · choose a skill'}</h3><button class="xb" data-x="1" aria-label="Decide later">×</button></div><div class="pk2">` + t.map(id => { const sk = SKILLS[id]; return `<button class="pcard${cur === id ? ' on' : ''}" data-p="${id}" data-i="${i}"><div class="pi">${sk.i}</div><b>${sk.n}</b><span class="sm">${(sk.cost ? sk.cost + ' ' + RN : sk.gen ? 'Builds ' + RN : 'Free') + (sk.cd ? ' · ' + sk.cd + 's cooldown' : '')}</span><div class="sd">${sk.d}</div><div class="pgo">${cur === id ? 'Current choice' : 'Choose'}</div></button>`; }).join('') + `</div><div class="sm" style="margin-top:10px;text-align:center">You use one at a time. Switch between them whenever you like from the Skills panel.</div></div>`;
    $('pick').classList.remove('hide');
  }
  U.openPick = openPick; U.panelOpen = () => invOpen || sklOpen || !$('gateAsk').classList.contains('hide') || !$('pick').classList.contains('hide') || !$('set').classList.contains('hide') || !$('lb').classList.contains('hide') || !$('folk').classList.contains('hide') || !$('parties').classList.contains('hide');
  $('pick').addEventListener('click', e => { if (e.target.closest('[data-x]')) { $('pick').classList.add('hide'); return; } const c = e.target.closest('[data-p]'); if (!c) return; if (pickSkill(+c.dataset.i, c.dataset.p)) { if (sklOpen) renderSkl(); openPick(); } });
  if (seasonCheck()) { $('menuMsg').textContent = 'Build ' + BUILD + ' is a fresh start: every hero begins again at level 1.'; }
  // ---- leaving a floor asks first ----
  function askGate(o) { const nx = o.kind === 'portal'; $('gateAsk').innerHTML = `<div class="box"><h3>${nx ? 'Descend to the next floor?' : 'Go back up a floor?'}</h3><div class="sm">${G.online && Object.keys(NET.peers).length ? 'Your whole party travels together.' : 'Loot left on the ground here will be lost.'}</div><div class="row"><button class="big" data-g="go">Go</button><button data-g="no">Not yet</button></div></div>`; $('gateAsk').classList.remove('hide'); $('gateAsk').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; $('gateAsk').classList.add('hide'); if (b.dataset.g === 'go') { o.gone = true; interact(o); } else o.arm = false; }; }
  U.askGate = askGate;
  // ---- talking to the townsfolk (build 0020) ----
  const CHAT = { bram: ['The wind is good for milling today.', 'Flour on my boots, flour in my beard. A miller\'s life!'], hesta: ['Mind the nettles by the gate, dear.', 'Chamomile for sleep, nettle for strength. Remember that.'], lysa: ['Hot stew by the fire, any time you like.', 'The Sleeping Ember has never been this busy!'], doran: ['Iron is only as good as the hands that work it.', 'Bring me good steel and I will make it sing.'], roek: ['Keep your blade sharp out there.', 'The walls hold because people like you go out there.'] };
  function openFolk(id) {
    const f = FOLK[id], h = G.hero, cur = tqCur(), nx = tqNext(), el = $('folk'), esc2 = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let title = '', body = '', btn = '<button data-f="x">Goodbye</button>', rw = null;
    if (cur && cur.by === id) { if (h.tq.n >= cur.goal.n) { title = cur.t + ' · complete'; body = cur.thanks; rw = tqReward(cur); btn = '<button class="big" data-f="claim">Claim reward</button>'; } else { title = cur.t; body = tqHow(cur) + ' <b>' + h.tq.n + ' / ' + cur.goal.n + '</b> so far.'; btn = '<button data-f="x">I am on it</button><button data-f="drop" class="warn" title="Give up this quest. You can take it again later.">Give up</button>'; } }
    else if (!cur && nx.by === id) { title = nx.t + (nx.repeat ? ' · bounty' : ''); body = nx.ask; rw = tqReward(nx); btn = '<button class="big" data-f="ok">Accept</button><button data-f="x">Not now</button>'; }
    else { const lines = CHAT[id] || ['Good day.']; body = lines[Math.floor(Math.random() * lines.length)]; const who = cur ? FOLK[cur.by] : FOLK[nx.by]; if (who && who !== f) body += cur ? ' Did you finish what ' + who.n.split(' ')[0] + ' asked?' : ' By the way, ' + who.n + ' was looking for you.'; }
    if (id === 'doran') btn += '<button data-f="forge" title="Turn your shards and gold into a brand new item">⚒ Forge an item</button>';
    el.innerHTML = `<div class="box"><div class="fh"><div class="fn">${esc2(f.n)}</div>${title ? `<div class="ft">${esc2(title)}</div>` : ''}</div><p>${body}</p>${rw ? `<div class="fr">Reward: <b>${rw.gold.toLocaleString()} gold</b> · <b>${rw.shards} shards</b> · <b style="color:${RAR[rw.rar].c}">a ${RAR[rw.rar].n} item</b></div>` : ''}<div class="row">${btn}</div></div>`;
    el.classList.remove('hide'); SFX.play('pickup');
    el.onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; const k = b.dataset.f; if (k === 'ok') { tqAccept(); el.classList.add('hide'); } else if (k === 'claim') { const r = tqClaim(); el.classList.add('hide'); if (r) { U.streakPop('Reward!', '+' + r.r.gold + ' gold · ' + r.it.name, 0xffd84a); refresh(); } } else if (k === 'forge') { openForge(); } else if (k === 'drop') { G.hero.tq = null; saveGame(); el.classList.add('hide'); hint('Quest dropped. Talk to ' + f.n + ' to take it again.'); } else el.classList.add('hide'); };
  }
  U.openFolk = openFolk;
  // the rift stone (build 0021): a timed floor for the whole party, with a fastest-clear leaderboard
  U.openRift = () => { const h = G.hero, el = $('folk'), best = h.riftBest || {}, tier = h.level + 2, pb = best[tier], fmt = ms => { const s2 = Math.round(ms / 1000); return Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); };
    el.innerHTML = `<div class="box"><div class="fh"><div class="fn">The Rift Stone</div><div class="ft">Monster level ${tier}</div></div><p>Open a rift and race the clock: a fresh floor from a random region, two levels tougher than you. Slay its guardian as fast as you can${G.online && Object.keys(NET.peers).length ? '. <b>Your whole party goes in together.</b>' : '.'} Your time goes on the leaderboard.</p>${pb ? `<div class="fr">Your best at this level: <b>${fmt(pb)}</b></div>` : ''}<div class="row"><button class="big" data-r="go">Open the rift</button><button data-r="x">Not now</button></div></div>`;
    el.classList.remove('hide'); el.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; el.classList.add('hide'); if (b.dataset.r !== 'go') return; if (G.online) NET.send({ t: 'rift' }); else { G.riftNext = true; closeTown(); enterZone(); } hint('Into the rift! The clock is running.'); }; };
  // Doran's forge (build 0021): spend shards and gold to forge a new item for the slot you pick, Rare or Legendary
  let forgeSlot = 'weapon'; const FORGE_SLOTS = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet', 'ring'];
  const forgeCost = (rar, lv) => rar >= 3 ? { shards: 90 + lv * 4, gold: 150 * lv + 400 } : { shards: 24 + lv, gold: 40 * lv + 100 };
  function openForge() {
    const h = G.hero, el = $('folk'), opt = r => { const c = forgeCost(r, h.level), ok = (h.shards || 0) >= c.shards && h.gold >= c.gold; return `<button class="${r >= 3 ? 'big' : ''}" data-fg="${r}" ${ok ? '' : 'disabled'}>Forge ${RAR[r].n} · ${c.shards} shards + ${c.gold.toLocaleString()} gold</button>`; };
    el.innerHTML = `<div class="box"><div class="fh"><div class="fn">Doran's Forge</div><div class="ft">You have ${(h.shards || 0).toLocaleString()} shards · ${h.gold.toLocaleString()} gold</div></div><p>Pick what to forge. It comes out at your level, with fresh stats. Salvage loot you do not need to get shards.</p><div class="row" style="margin-bottom:10px">${FORGE_SLOTS.map(sl => `<button data-fs="${sl}" class="${sl === forgeSlot ? 'on' : ''}" style="padding:5px 9px;font-size:12px">${SLOT_NAME[sl]}</button>`).join('')}</div><div class="row">${opt(2)}${opt(3)}<button data-f="x">Done</button></div></div>`;
    el.classList.remove('hide');
    el.onclick = e => { const b = e.target.closest('[data-fs],[data-fg],[data-f]'); if (!b) return; if (b.dataset.fs) { forgeSlot = b.dataset.fs; openForge(); return; } if (b.dataset.f === 'x') { el.classList.add('hide'); return; }
      const r = +b.dataset.fg, c = forgeCost(r, h.level); if ((h.shards || 0) < c.shards || h.gold < c.gold) return; h.shards -= c.shards; h.gold -= c.gold; const it = makeItem(h.level, forgeSlot, r); if (!addItem(it)) dropItem(P.x, P.z, it); saveGame(); SFX.play('slam'); burst(P.x, 1.6, P.z, 0xffa040, 26, 6); U.streakPop('Forged!', it.name, r >= 3 ? 0xffb03a : 0xffd84a); refresh(); openForge(); };
  }

  U.achToast = a => { const el = document.createElement('div'); el.className = 'achT'; el.innerHTML = `<span class="ai">${a[1]}</span><div><b>${a[2]}</b><span>${a[3]}</span></div>`; document.body.appendChild(el); SFX.play('level'); setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4300); };
  U.streakPop = (t1, t2, c) => { const el = $('spop'); $('sp1').textContent = t1; $('sp2').textContent = t2; el.style.setProperty('--sc', '#' + c.toString(16).padStart(6, '0')); el.classList.remove('hide', 'go'); void el.offsetWidth; el.classList.add('go'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hide'), 1900); };
  $('pickBtn').onclick = () => openPick();
  // iPhone Safari ignores the no-zoom setting, so stop double-tap and pinch zoom on the page by hand (the game's own pinch zoom still works)
  { const ok = e => e.target && e.target.closest && e.target.closest('input,textarea,select'); let lastT = 0;
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false }); document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    document.addEventListener('dblclick', e => { if (!ok(e)) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastT < 320 && !ok(e) && e.cancelable && e.changedTouches.length === 1) e.preventDefault(); lastT = n; }, { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 && !ok(e) && e.cancelable && (e.scale === undefined || e.scale !== 1)) e.preventDefault(); }, { passive: false }); }
  // ---- invite / share: one tap sends a link that drops a friend straight into your party ----
  async function invite(inGame) {
    const web = /^https?:$/.test(location.protocol), base = web ? location.origin + location.pathname : 'https://cinderdeep.onrender.com/', room = inGame && G.online && NET.room ? NET.room : '', url = base + (room ? '?room=' + encodeURIComponent(room) : ''), text = room ? 'Join my party in Cinderdeep, a free action RPG you play in the browser:' : 'Play Cinderdeep with me, a free action RPG in your browser:';
    if (navigator.share) { try { await navigator.share({ title: 'Cinderdeep', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    let ok = false; try { await navigator.clipboard.writeText(text + ' ' + url); ok = true; } catch (e) { }
    const msg = ok ? (room ? 'Invite link copied. Paste it to a friend and they land in your party.' : 'Link copied. Paste it anywhere to share the game.') : 'Share this link: ' + url; if (G.state === 'play') hint(msg); else $('menuMsg').textContent = msg;
  }
  $('bLeave').onclick = () => { if (!G.online) return; const nm = NET.me || 'Hero'; NET.close(); G.state = 'play'; hint('You left the party and are now on your own.'); NET.connect(nm, 'solo' + Math.random().toString(36).slice(2, 8)); };
  if (TIP_URL) { $('mTip').classList.remove('hide'); $('mTip').onclick = () => window.open(TIP_URL, '_blank', 'noopener'); } if (FEEDBACK_URL) { $('mFeed').classList.remove('hide'); $('mFeed').onclick = () => { location.href = FEEDBACK_URL; }; }
  $('bInvite').onclick = () => invite(true); $('mInvite').onclick = () => invite(false);
  U.iconSvg = it => iconSvg(it);
  U.buildBar = () => { buildBar(); if (sklOpen) renderSkl(); };
  function hud(dt) {
    const h = G.hero, s = P.stats, cls = CLASSES[h.cls];
    $('gLife').firstElementChild.style.height = clamp(P.hp / s.maxLife * 100, 0, 100) + '%'; $('gLife').lastElementChild.textContent = Math.ceil(P.hp) + ' / ' + s.maxLife;
    $('gFury').firstElementChild.style.height = clamp(P.mana / s.maxMana * 100, 0, 100) + '%'; $('gFury').lastElementChild.textContent = Math.floor(P.mana) + ' ' + cls.res.n;
    for (let i = 0; i < 5; i++) {
      const el = skEls[i]; if (!el) continue; let cd = 0, max = 1, lock = false, dim = false;
      if (i < 4) { const id = h.bar[i], sk = id && SKILLS[id]; if (sk) { cd = P.cds[id] || 0; max = sk.cd || 1; dim = P.mana < (sk.cost || 0); } else lock = true; } else { const fl = P.fl === undefined ? 5 : P.fl; cd = fl < 5 ? P.flaskCd || 0 : 0; max = 15; dim = fl <= 0; if (el.dataset.fl !== '' + fl) { el.dataset.fl = fl; let c = el.querySelector('.cost'); if (!c) { c = document.createElement('span'); c.className = 'cost'; el.appendChild(c); } c.textContent = '×' + fl; } }
      el.classList.toggle('lock', lock); el.classList.toggle('dim', dim); el.children[2].style.height = cd > 0 ? clamp(cd / max * 100, 0, 100) + '%' : '0'; el.children[3].textContent = cd > 0 ? Math.ceil(cd) + (i === 4 ? 's' : '') : '';
    }
    { const par = h.level >= MAX_LEVEL, need = par ? paragonNeed(h.plvl || 0) : xpNeed(h.level), have = Math.floor(par ? h.pxp || 0 : h.xp); if (G.xpPopT > 0) G.xpPopT -= dt; else G.xpPop = 0; const t = (par ? 'Paragon ' : 'XP ') + have.toLocaleString() + ' / ' + need.toLocaleString() + (G.xpPop > 0 ? '  +' + Math.round(G.xpPop) : ''); if ($('xpT').textContent !== t) $('xpT').textContent = t; }
    { const par = h.level >= MAX_LEVEL, bar = $('xp').firstElementChild; bar.style.width = clamp(par ? (h.pxp || 0) / paragonNeed(h.plvl || 0) * 100 : h.xp / xpNeed(h.level) * 100, 0, 100) + '%'; bar.style.background = par ? 'linear-gradient(90deg,#2a8ad0,#9ae0ff)' : ''; }
    if (G.tj) { const ue = $('bUse'); if (ue) { const o0 = nearObj(), o = o0 && o0.kind !== 'chest' && o0.kind !== 'shrine' ? o0 : null, t = o ? USE_LABEL[o.kind] || 'Use' : ''; ue.style.display = o ? '' : 'none'; if (o && ue.dataset.t !== t) { ue.dataset.t = t; ue.firstElementChild.textContent = t; } ue.classList.toggle('hot', !!o); } } /* phones: no Loot button any more (loot, chests and shrines work by walking over them); a Talk, Trade or Enter button shows only beside something to use */
    { // tutorial spotlight (build 0020): the button or target for your next first step glows, with a pointer that says what to do
      const gl = h.goals, nx = gl && !gl.all ? GOALS.find(g => !gl[g[0]]) : null, T = G.tj || IN.touch, vis = el => !!el && (el.offsetWidth > 0 || el.offsetHeight > 0) && getComputedStyle(el).display !== 'none'; let tgt = null, txt = '';
      if (nx && !P.dead && G.state === 'play') { const k = nx[0];
        if (k === 'kill' && T && !G.inTown) { tgt = skEls[0]; txt = 'Hold to attack'; }
        else if (k === 'skill' && !G.inTown) { tgt = skEls[1]; txt = T ? 'Your skill (auto)' : 'Your skill: auto, or right-click'; }
        else if (k === 'equip') { if (invOpen) { const cells = [...document.querySelectorAll('#inv [data-i]')], up = cells.find(c => { const ar = c.querySelector('.ar'); return ar && ar.textContent === '▲'; }) || cells.find(c => h.inv[+c.dataset.i]); if (up) { tgt = up; txt = T ? 'Tap it, then Equip' : 'Right-click to equip'; } }
          else if (h.inv.some(Boolean)) { tgt = [$('bInv'), $('tBag')].find(vis); txt = T ? 'Tap Bag' : 'Open your bag (I)'; } }
        else if (k === 'town' && !G.inTown) { tgt = [$('bTown'), $('tTown')].find(vis); txt = T ? 'Tap Town' : 'Go to town (T)'; } }
      if (U.tutEl && U.tutEl !== tgt) U.tutEl.classList.remove('tutHi'); U.tutEl = tgt || null; const tp = $('tutTip');
      if (tgt && vis(tgt)) { tgt.classList.add('tutHi'); const r = tgt.getBoundingClientRect(); if (tp.textContent !== txt) tp.textContent = txt; tp.classList.remove('hide'); const tw = tp.offsetWidth || 120; let x = r.left + r.width / 2 - tw / 2, y = r.top - 44; if (y < 8) y = r.bottom + 12; x = clamp(x, 6, innerWidth - tw - 6); tp.style.transform = `translate(${x | 0}px,${y | 0}px)`; tp.classList.toggle('below', y > r.top); }
      else tp.classList.add('hide'); }
    { const gl = h.goals, gb = $('goals'), show = !!gl && !gl.all && !G.inTown; gb.classList.toggle('hide', !show); if (show) { const key = GOALS.map(g => gl[g[0]] ? 1 : 0).join('') + (gl.k || 0) + (blessed() ? 'b' : ''); if (gb.dataset.k !== key) { gb.dataset.k = key; const nx = GOALS.find(g => !gl[g[0]]), T = G.tj || IN.touch;
      const RN = cls.res.n, HOW = { kill: T ? 'Steer with the left stick toward the glowing arrow, then hold the big round attack button.' : 'Walk to the monster under the glowing arrow: left-click the ground to move, then left-click the monster to attack. Hold the button to keep ' + (LOOK[h.cls] && LOOK[h.cls].w === 'bow' ? 'shooting.' : LOOK[h.cls] && LOOK[h.cls].w === 'staff' ? 'casting.' : 'swinging.'), skill: (T ? 'Your skills fire by themselves near monsters (the A means autocast). You can also tap the glowing skill button.' : 'Your skills fire by themselves near monsters (autocast). You can also right-click a monster or press Q.') + ' Skills cost ' + RN + '; basic attacks build it back up.', equip: T ? 'Walk over loot to pick it up. Tap Bag, tap the glowing item, then tap Equip.' : 'Walk over loot to pick it up. Press I to open your bag, then right-click the glowing item to wear it.', town: T ? 'Tap the glowing Town button. In town you can sell loot, stash items and talk to the townsfolk for quests.' : 'Press T, or click Town, to visit Emberwatch: stash, trader, altar, and townsfolk with quests.', boss: 'Follow the yellow path on the ground to the guardian (the skull on your map) and defeat it.' };
      gb.innerHTML = '<span>First steps</span>' + GOALS.map(g => `<div class="${gl[g[0]] ? 'ok' : g === nx ? 'now' : ''}">${gl[g[0]] ? '✓' : '○'} ${g[1]}${g[0] === 'kill' && !gl.kill ? ' (' + (gl.k || 0) + '/5)' : ''}</div>`).join('') + (nx ? `<div class="how">${HOW[nx[0]]}</div>` : '') + (blessed() ? '<div class="bl">Newcomer\'s blessing: you take less damage until the guardian falls.</div>' : ''); } } }
    $('bInvite').classList.toggle('hide', !G.online); $('bLeave').classList.toggle('hide', !G.online || (NET.count || 1) < 2);
    $('pickBtn').classList.toggle('hide', pendingPick(h) < 0 || !$('pick').classList.contains('hide'));
    { const pb = partyBonus(), el = $('onl'); if (el.dataset.pb !== '' + pb) { el.dataset.pb = pb; el.title = pb ? 'Party bonus +' + pb + '% damage' : ''; } $('pbonus').textContent = pb ? 'Party bonus +' + pb + '% damage' : ALLY.on ? 'Sellsword at your side' : ''; }
    drawPortrait(h.cls);
    $('tName').textContent = innerWidth < 760 ? cls.n + ' · Lv ' + h.level : cls.n + ' · Level ' + h.level + (h.level >= MAX_LEVEL ? ' · Paragon ' + (h.plvl || 0) : '') + (G.online ? (/^solo/.test(NET.room || '') && (NET.count || 1) < 2 ? ' · Solo' : ' · Party ' + NET.room + ' (' + (NET.count || 1) + ')') : '');
    { const ids = G.online ? Object.keys(NET.names).filter(i => +i !== NET.id) : [], key = ids.map(i => i + NET.names[i] + (NET.peers[i] ? 1 : 0)).join('|'), pb = $('party'); pb.classList.toggle('hide', !ids.length);
      if (pb.dataset.k !== key) { pb.dataset.k = key; pb.innerHTML = '<div class="pth">Tap to teleport</div>'; for (const i of ids) { const b = document.createElement('button'); b.textContent = '➜ ' + NET.names[i]; if (!NET.peers[i]) b.className = 'far'; b.onclick = () => teleportTo(+i); pb.appendChild(b); } }
      if (G.tpTo && !G.inTown && NET.peers[G.tpTo]) teleportTo(G.tpTo); }
    $('onl').classList.toggle('hide', !G.online); if (G.online) $('onl').textContent = (NET.online || 1) + ' online'; $('chatlog').classList.toggle('hide', !G.online);
    $('bAuto').textContent = 'Auto-play: ' + (G.auto ? 'ON' : 'off'); $('bAuto').classList.toggle('on', G.auto); $('bSpd').textContent = 'Speed ' + (G.online ? 1 : G.speed) + '×'; $('bSpd').classList.toggle('hide', G.online); $('tChat').classList.toggle('hide', !G.online); $('tGold').textContent = h.gold.toLocaleString() + ' gold · ' + (h.shards || 0).toLocaleString() + ' shards';
    $('bTown').textContent = G.inTown ? 'Leave town' : 'Town'; if ($('quest').textContent !== GPS.text) $('quest').textContent = GPS.text; { const q = tqCur(), tqe = $('tq'); let tt = ''; if (q) tt = h.tq.n >= q.goal.n ? '✔ ' + q.t + ': return to ' + FOLK[q.by].n.split(' ')[0] + ' in town' : q.t + ': ' + h.tq.n + ' / ' + q.goal.n + (q.goal.k === 'collect' ? ' ' + q.goal.item : ''); else if (G.inTown) { const nx = tqNext(); tt = '! ' + FOLK[nx.by].n + ' has a job for you'; } if (tqe.textContent !== tt) tqe.textContent = tt; tqe.classList.toggle('hide', !tt); $('questBox').classList.toggle('hide', !GPS.text && !tt && !(G.zone && G.zone.def.rift && !G.inTown)); $('quest').classList.toggle('hide', !GPS.text); } if (townMode) { const o = G.zone.objs.find(o => o.kind === townMode); if (!G.inTown || !o || Math.hypot(o.x - P.x, o.z - P.z) > 9) closeTown(); } $('tZone').textContent = G.zone.def.name + (G.inTown ? ' · safe' : ' · monster level ' + G.zone.def.lvl) + (h.filter ? ' · hiding ' + (h.filter === 1 ? 'Common' : 'Common + Magic') + ' loot' : '');
    { const b = G.boss; const bk = G.zone && G.zone.def ? G.zone.def.seed + ':' + (G.zone.def.depth || 0) : ''; if (b && b.awake && b.alive && !b.introShown && G.bossIntroKey !== bk) { b.introShown = true; G.bossIntroKey = bk; /* once per floor, even after a trip to town */ const el = $('bossIntro'); $('biName').textContent = b.name; $('biSub').textContent = 'Guardian of ' + (G.zone && G.zone.def && G.zone.def.name || 'the deep'); el.style.setProperty('--bc', '#' + ((b.md && b.md.e) || 0xff5a2a).toString(16).padStart(6, '0')); el.classList.remove('hide', 'go'); void el.offsetWidth; el.classList.add('go'); G.shake = Math.min(.7, (G.shake || 0) + .5); SFX.play('boss'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hide'), 3000); } } // boss intro card
    { const rt = $('riftT'), on = !!(G.zone && G.zone.def.rift && !G.inTown); rt.classList.toggle('hide', !on); if (on) { const s2 = G.riftDone ? -1 : Math.floor(G.time - G.riftT0), txt = G.riftDone ? 'Rift cleared!' : 'Rift · ' + Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); if (rt.textContent !== txt) rt.textContent = txt; } }
    const b = G.boss; $('bossbar').classList.toggle('hide', !(b && b.awake && b.alive)); document.body.classList.toggle('bossOn', !!(b && b.awake && b.alive)); if (b && b.awake) { $('bossName').textContent = b.name; $('bossFill').style.width = clamp(b.hp / b.maxHp * 100, 0, 100) + '%'; }
    $('streak').classList.toggle('hide', G.streak < 3); if (G.streak >= 3) { $('st1').textContent = G.streak; $('st3').textContent = '+' + Math.min(G.streak, 50) * 2 + '% drop luck'; $('streak').style.opacity = clamp(G.streakT / 1.2, .25, 1); }
    if (banT > 0) { banT -= dt; if (banT <= 0) $('banner').classList.remove('on'); }
    const hs = G.hints.map(x => x.t).join('\n'); if (hs !== hud.last) { hud.last = hs; $('hints').innerHTML = ''; for (const x of G.hints) { const d = document.createElement('div'); d.textContent = x.t; $('hints').appendChild(d); } }
    if (invOpen && U.invDirty && !(drag && drag.on)) renderInv();
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
    for (const t of G.texts) { const sp = GLX.toScreen(t.x, t.y, t.z); if (!sp) continue; ctx.globalAlpha = clamp(t.life / t.max * 2, 0, 1); txt(t.txt, sp[0], sp[1], t.col, '700 ' + Math.round(t.size * (1 + .5 * clamp((t.life / t.max - .78) / .22, 0, 1))) + 'px system-ui,sans-serif'); }
    ctx.globalAlpha = 1;
    if (G.online && !G.inTown) for (const id in NET.peers) { const q = NET.peers[id]; if (q.dead) continue; const sp = GLX.toScreen(q.x, 2.9, q.z); if (!sp) continue; txt(q.name + ' · ' + (q.lvl || 1), sp[0], sp[1] - 8, '#9fd0ff', '600 12px system-ui,sans-serif'); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(sp[0] - 23, sp[1] + 1, 46, 5); ctx.fillStyle = '#4ad06a'; ctx.fillRect(sp[0] - 22, sp[1] + 2, 44 * clamp((q.hp || 0) / 100, 0, 1), 3); }
    if (G.online && !G.inTown) for (const id in NET.peers) {
      const q = NET.peers[id]; if (q.dead) continue; const sp = GLX.toScreen(q.x, 1.4, q.z); if (sp && sp[0] > 30 && sp[1] > 30 && sp[0] < w - 30 && sp[1] < h - 140) continue;
      const dx = q.x - P.x, dz = q.z - P.z, a = Math.atan2(dz, dx), rxe = w / 2 - 70, rye = h / 2 - 120, ex = w / 2 + Math.cos(a) * rxe, ey = h / 2 - 30 + Math.sin(a) * rye;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, -13); ctx.lineTo(-3, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
      txt(q.name + ' · ' + Math.round(Math.hypot(dx, dz)) + ' m', ex - Math.cos(a) * 34, ey - Math.sin(a) * 26, '#ffe9a8', '600 12px system-ui,sans-serif');
    }
    if (G.hoverObj) { const o = G.hoverObj, sp = GLX.toScreen(o.x, 3.4, o.z); if (sp) txt(o.name, sp[0], sp[1], '#ffe9a8', '600 13px system-ui,sans-serif'); }
    if (!G.inTown && G.zone) for (const o of G.zone.objs) { if (o.kind !== 'portal' && o.kind !== 'pback') continue; const sp = GLX.toScreen(o.x, 4.2, o.z); if (!sp) continue; txt(o.kind === 'portal' ? '▼ Next floor' : '▲ Previous floor', sp[0], sp[1], o.kind === 'portal' ? '#bfe6ff' : '#ffd9a0', '700 14px system-ui,sans-serif'); txt('Step in', sp[0], sp[1] + 16, '#9effa8', '600 11px system-ui,sans-serif'); }
    if (G.inTown && G.zone) for (const o of G.zone.objs) { if (o === G.hoverObj) continue; const sp = GLX.toScreen(o.x, 3.6, o.z); if (!sp) continue; const L = { stash: 'Stash', vendor: 'Trader', altar: 'Altar', tportal: 'Back to the fight' }[o.kind]; if (!L) continue; const near = Math.hypot(o.x - P.x, o.z - P.z) < 3.6; txt(L, sp[0], sp[1], near ? '#fff' : '#ffe9a8', '700 14px system-ui,sans-serif'); if (near) txt(G.tj ? 'Tap the ' + ({ stash: 'Stash', vendor: 'Trade', altar: 'Altar', tportal: 'Leave' }[o.kind]) + ' button' : 'Click to use', sp[0], sp[1] + 17, '#9effa8', '600 12px system-ui,sans-serif'); }
    if (++frameN % 3 === 0) drawMini();
  }
  function drawMini() {
    const Z = G.zone, S = 170, k = 4.2, pcx = P.x / CS, pcz = P.z / CS; mctx.clearRect(0, 0, S, S);
    const X = cx => S / 2 + (cx - pcx) * k, Y = cz => S / 2 + (cz - pcz) * k, wall = (x, y) => x < 0 || y < 0 || x >= GW || y >= GW || Z.cell[y * GW + x] === 1;
    const x0 = Math.max(0, Math.floor(pcx - 21)), x1 = Math.min(GW - 1, Math.ceil(pcx + 21)), y0 = Math.max(0, Math.floor(pcz - 21)), y1 = Math.min(GW - 1, Math.ceil(pcz + 21));
    mctx.fillStyle = 'rgba(150,160,130,.38)'; mctx.strokeStyle = '#f0e2b8'; mctx.lineWidth = 1.8; mctx.lineCap = 'square'; mctx.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!Z.seen[y * GW + x] || Z.cell[y * GW + x]) continue; const a = X(x), b = Y(y); mctx.fillRect(a, b, k + .5, k + .5);
      if (wall(x - 1, y)) { mctx.moveTo(a, b); mctx.lineTo(a, b + k); } if (wall(x + 1, y)) { mctx.moveTo(a + k, b); mctx.lineTo(a + k, b + k); } if (wall(x, y - 1)) { mctx.moveTo(a, b); mctx.lineTo(a + k, b); } if (wall(x, y + 1)) { mctx.moveTo(a, b + k); mctx.lineTo(a + k, b + k); }
    }
    mctx.stroke();
    const dot = (wx, wz, c, r) => { const x = X(wx / CS), y = Y(wz / CS); if (x < 0 || y < 0 || x > S || y > S) return; mctx.fillStyle = c; mctx.beginPath(); mctx.arc(x, y, r, 0, 6.3); mctx.fill(); };
    for (const o of Z.objs) { if (o.used || !Z.seen[Math.floor(o.z / CS) * GW + Math.floor(o.x / CS)]) continue; dot(o.x, o.z, o.kind === 'chest' || o.kind === 'stash' || o.kind === 'vendor' ? '#ffd84a' : o.kind === 'shrine' ? '#7affc0' : o.kind === 'altar' ? '#ff8a2a' : '#7ad0ff', o.kind === 'portal' || o.kind === 'tportal' || o.kind === 'shrine' || o.kind === 'altar' ? 5.5 : o.kind === 'pback' ? 4 : 3.2); }
    for (const o of Z.objs) { if (o.kind === 'lost' && !o.used) { const px = clamp(X(o.x / CS), 8, S - 8), py = clamp(Y(o.z / CS), 8, S - 8); mctx.fillStyle = '#ff9ad0'; mctx.font = '700 14px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('★', px, py); } else if (o.kind === 'npc') { const mk = tqMark(o.id); dot(o.x, o.z, mk === '!' ? '#ffd84a' : mk === '?' ? '#8affc0' : '#c8c0b0', mk ? 4 : 2.6); } }
    for (const d of G.drops) if (d.q) dot(d.x, d.z, '#8affc0', 3);
    for (const e of G.ents) if (e.alive && e.awake) dot(e.x, e.z, e.boss ? '#ff3a2a' : e.elite ? '#ffb03a' : '#e0482a', e.boss ? 5 : e.elite ? 3 : 1.8);
    for (const d of G.drops) if (d.item && d.item.rar >= 2) dot(d.x, d.z, RAR[d.item.rar].c, 2.5);
    if (G.boss && !G.boss.awake) { const bx = clamp(X(Z.bossAt[0] / CS), 8, S - 8), by = clamp(Y(Z.bossAt[1] / CS), 8, S - 8); mctx.fillStyle = '#ff3a2a'; mctx.font = '700 14px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('☠', bx, by); }
    if (GPS.pts.length > 1 && G.set.gps) { mctx.strokeStyle = '#ffd84a'; mctx.lineWidth = 1.6; mctx.setLineDash([3, 3]); mctx.beginPath(); GPS.pts.forEach((q, i) => { const x = X(q[0] / CS), y = Y(q[1] / CS); if (i) mctx.lineTo(x, y); else mctx.moveTo(x, y); }); mctx.stroke(); mctx.setLineDash([]); }
    if (GPS.goal) { const gx = X(GPS.goal.x / CS), gy = Y(GPS.goal.z / CS); if (gx > 4 && gy > 4 && gx < S - 4 && gy < S - 4) { mctx.fillStyle = '#ffd84a'; mctx.font = '700 13px system-ui'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('★', gx, gy); } }
    if (G.online && !G.inTown) for (const id in NET.peers) {
      const q = NET.peers[id]; if (q.dead) continue; const x = X(q.x / CS), y = Y(q.z / CS);
      if (x > 6 && y > 6 && x < S - 6 && y < S - 6) { mctx.fillStyle = '#5ab0ff'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.2; mctx.beginPath(); mctx.arc(x, y, 4, 0, 6.3); mctx.fill(); mctx.stroke(); }
      else { const a = Math.atan2(y - S / 2, x - S / 2), ex = S / 2 + Math.cos(a) * (S / 2 - 10), ey = S / 2 + Math.sin(a) * (S / 2 - 10); mctx.save(); mctx.translate(ex, ey); mctx.rotate(a); mctx.fillStyle = '#ffd84a'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.beginPath(); mctx.moveTo(8, 0); mctx.lineTo(-5, -6); mctx.lineTo(-2, 0); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore(); }
    }
    const px = S / 2, py = S / 2, r = P.rot; mctx.fillStyle = '#fff'; mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.beginPath(); mctx.moveTo(px + Math.sin(r) * 6, py + Math.cos(r) * 6); mctx.lineTo(px + Math.sin(r + 2.5) * 5, py + Math.cos(r + 2.5) * 5); mctx.lineTo(px + Math.sin(r - 2.5) * 5, py + Math.cos(r - 2.5) * 5); mctx.closePath(); mctx.fill(); mctx.stroke();
  }

  // ---- input ----
  let mvId = null, lastTouch = false, pinch = null; const tch = new Map();
  // thumb joystick: a touch that starts in the lower-left of the screen steers the hero; a quick tap there still counts as a tap
  let joyId = null, joy0 = null, joyHintT = 0; const JR = 50, joyEl = $('joy'), joyK = $('joyK');
  const inJoy = (x, y) => { const w = innerWidth, h = innerHeight; return w < h ? x < w * .5 && y > h * .5 : x < w * .42 && y > h * .3; };
  const joyPlace = () => { joyEl.style.left = (joy0.x - 62) + 'px'; joyEl.style.top = (joy0.y - 62) + 'px'; joyEl.style.bottom = 'auto'; };
  function joyEnd() { joyId = null; joy0 = null; IN.joy.on = false; IN.joy.x = IN.joy.z = 0; joyEl.classList.remove('on'); joyEl.style.left = joyEl.style.top = joyEl.style.bottom = ''; joyK.style.transform = ''; }
  function joyStart(e) { joyId = e.pointerId; joy0 = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: e.timeStamp, far: 0 }; try { glc.setPointerCapture(e.pointerId); } catch (_) { } IN.joy.on = true; IN.joy.x = IN.joy.z = 0; IN.lmb = false; joyEl.classList.add('on'); joyPlace(); }
  function joyMove(e) {
    let dx = e.clientX - joy0.x, dy = e.clientY - joy0.y, d = Math.hypot(dx, dy); joy0.far = Math.max(joy0.far, Math.hypot(e.clientX - joy0.x0, e.clientY - joy0.y0));
    if (d > JR) { const k = (d - JR) / d; joy0.x += dx * k; joy0.y += dy * k; dx = e.clientX - joy0.x; dy = e.clientY - joy0.y; joyPlace(); }
    IN.joy.x = dx / JR; IN.joy.z = dy / JR; joyK.style.transform = `translate(${dx}px,${dy}px)`;
    if (G.auto && d > JR * .5 && performance.now() - joyHintT > 3500) { joyHintT = performance.now(); hint('Auto-play is on. Tap Auto-play to take control.'); }
  }
  function tapAt(cx, cy) { const r = glc.getBoundingClientRect(); IN.touch = true; IN.sx = cx - r.left; IN.sy = cy - r.top; if (G.camReady) { const g = GLX.groundAt(IN.sx, IN.sy); if (isFinite(g[0]) && isFinite(g[1])) { IN.gx = g[0]; IN.gz = g[1]; } computeHover(); } IN.lmbFresh = true; P.pickNow = null; IN.sx = IN.sy = -9999; }
  const pdist = () => { const a = [...tch.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; };
  window.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; if (!e.target.closest || !e.target.closest('#tip')) unpin(); }, true);
  const pos = e => { const r = glc.getBoundingClientRect(); IN.sx = e.clientX - r.left; IN.sy = e.clientY - r.top; };
  glc.addEventListener('pointermove', e => {
    if (e.pointerId === joyId) { joyMove(e); return; }
    if (e.pointerType === 'touch') { if (tch.has(e.pointerId)) tch.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && tch.size >= 2) { G.zoom = clamp(pinch.z * pinch.d / pdist(), .4, 1.6); return; } if (e.pointerId !== mvId) return; }
    pos(e);
  });
  glc.addEventListener('pointerdown', e => {
    const touch = e.pointerType === 'touch'; SFX.unlock(); if (G.state !== 'play') return; e.preventDefault();
    if (touch && G.tj && joyId === null && inJoy(e.clientX, e.clientY)) { const r = glc.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let lab = false; for (const l of G.labels) if (x >= l.x - 10 && x <= l.x + l.w + 10 && y >= l.y - 10 && y <= l.y + l.h + 10) { lab = true; break; } if (!lab) { joyStart(e); return; } }
    if (touch) { tch.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { glc.setPointerCapture(e.pointerId); } catch (_) { } if (tch.size === 2) { pinch = { d: pdist(), z: G.zoom }; IN.lmb = false; IN.lmbFresh = false; P.move = P.atk = null; mvId = null; return; } if (tch.size > 2 || mvId !== null) return; mvId = e.pointerId; }
    IN.touch = touch; pos(e);
    if (touch || e.button === 0) {
      if (G.camReady) { const g = GLX.groundAt(IN.sx, IN.sy); if (isFinite(g[0]) && isFinite(g[1])) { IN.gx = g[0]; IN.gz = g[1]; } computeHover(); }
      IN.lmb = true; IN.lmbFresh = true; P.pickNow = null; const pad = touch ? 10 : 0;
      for (const l of G.labels) if (IN.sx >= l.x - pad && IN.sx <= l.x + l.w + pad && IN.sy >= l.y - pad && IN.sy <= l.y + l.h + pad) { P.pickNow = l.d; break; }
    } else if (e.button === 2) IN.rmb = true;
  });
  const up = e => { if (e.pointerId === joyId && joyId !== null) { const tap = e.type === 'pointerup' && joy0.far < 9 && e.timeStamp - joy0.t < 260, x = joy0.x0, y = joy0.y0; joyEnd(); if (tap && G.state === 'play') tapAt(x, y); return; } if (e.pointerType === 'touch') { tch.delete(e.pointerId); if (tch.size < 2) pinch = null; if (e.pointerId === mvId) { mvId = null; IN.lmb = false; IN.sx = IN.sy = -9999; } return; } if (e.button === 0) IN.lmb = false; else if (e.button === 2) IN.rmb = false; };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  glc.addEventListener('contextmenu', e => e.preventDefault());
  glc.addEventListener('wheel', e => { e.preventDefault(); G.zoom = clamp(G.zoom + Math.sign(e.deltaY) * .08, .4, 1.6); }, { passive: false });
  window.addEventListener('blur', () => { IN.lmb = IN.rmb = IN.shift = false; IN.keys = {}; IN.tb = [false, false, false, false]; mvId = null; joyEnd(); });
  $('tBag').onclick = () => { toggleSkl(false); toggleInv(); }; loadStash(); $('tSkl').onclick = () => { toggleInv(false); toggleSkl(); }; $('tLoot').onclick = () => pickupNear();
  window.addEventListener('error', e => { const d = $('err'); d.textContent = 'Something went wrong: ' + (e.message || 'unknown error') + ' (tap to close)'; d.classList.remove('hide'); d.style.pointerEvents = 'auto'; d.onclick = () => d.classList.add('hide'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.add('hide'), 9000); });
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT')) { if (e.target.id === 'chat') { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) NET.send({ t: 'chat', m: v, g: chatGlobal ? 1 : 0, b: achBadge() }); e.target.value = ''; closeChat(); } else if (e.key === 'Escape') closeChat(); else if (e.key === 'Tab') { e.preventDefault(); setCh(!chatGlobal); } } return; }
    IN.shift = e.shiftKey; if (G.state !== 'play' || e.ctrlKey || e.metaKey) return; const k = String(e.key || '').toLowerCase(); if (!k) return; IN.keys[k] = true;
    if (e.repeat) return;
    if (k === '1') useFlask(); else if (k === 'i' || k === 'c' || k === 'b') toggleInv(); else if (k === 's' || k === 'k') toggleSkl(); else if (k === ' ' || k === 'f' || k === 'e') { e.preventDefault(); useNear(); }
    else if (k === 'z') { G.hero.filter = (G.hero.filter + 1) % 4; hint(['Showing all loot.', 'Skipping Common loot.', 'Skipping Common and Magic loot.', 'Only Legendary and Mythic loot.'][G.hero.filter]); }
    else if (k === 'm') { G.set.vol = G.set.vol > 0 ? 0 : 70; applySet(); hint(G.set.vol ? 'Sound on.' : 'Sound off.'); } else if (k === 'o') toggleSet(); else if (k === 'g') { G.set.gps = !G.set.gps; GPS.t = 0; applySet(); hint(G.set.gps ? 'Quest path on.' : 'Quest path off.'); } else if (k === '\u0000') toggleAuto(); else if (k === '\u0001') cycleSpeed(); else if (k === 'enter' && G.online) { e.preventDefault(); openChat(); } else if (k === 't') { if (G.inTown) leaveTown(); else enterTown(); } else if (k === 'escape') { if (tip.classList.contains('pin')) unpin(); else if (!$('folk').classList.contains('hide')) $('folk').classList.add('hide'); else if (!$('lb').classList.contains('hide')) $('lb').classList.add('hide'); else if (!$('set').classList.contains('hide')) toggleSet(false); else if (townMode) closeTown(); else if (invOpen) toggleInv(false); else toggleSkl(false); }
  });
  window.addEventListener('keyup', e => { IN.shift = e.shiftKey; IN.keys[String(e.key || '').toLowerCase()] = false; }); /* some browsers send key events with no key (autofill, password managers): never crash on those */
  function toggleAuto() { G.auto = !G.auto; BOT.path = null; P.move = P.atk = null; hint(G.auto ? 'Auto-play on. The hero now plays by itself; you can still step in.' : 'Auto-play off.'); }
  function cycleSpeed() { if (G.online) return; G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : G.speed === 4 ? 8 : 1; }
  let chatGlobal = true; const chatLines = [];
  function setCh(g) { chatGlobal = g; $('chatCh').textContent = g ? 'Global' : 'Party'; $('chatCh').className = g ? 'gl' : 'pt'; $('chat').placeholder = (g ? 'Message everyone online' : 'Message your party') + ' · Enter to send'; }
  function openChat() { $('chatRow').classList.remove('hide'); $('chat').focus(); }
  function closeChat() { $('chatRow').classList.add('hide'); $('chat').blur(); }
  U.chat = (name, msg, kind) => {
    if (msg !== undefined) { const ln = [name, msg, kind]; chatLines.push(ln); if (chatLines.length > 40) chatLines.shift(); if (kind === 'l' || kind === 'm') setTimeout(() => { const i = chatLines.indexOf(ln); if (i >= 0) { chatLines.splice(i, 1); U.chat(); } }, 5000); } const box = $('chatlog'); box.innerHTML = '';
    for (const l of chatLines.slice(-8)) { const d = document.createElement('div'), t = document.createElement('span'); t.className = l[2] === 'g' ? 'gl' : l[2] === 'p' ? 'pt' : 'sy'; if (l[2] === 'm' || l[2] === 'l') { d.className = l[2] === 'm' ? 'cmy' : 'clg'; t.textContent = '★ '; d.appendChild(t); d.appendChild(document.createTextNode(l[1])); box.appendChild(d); continue; } t.textContent = l[2] === 'g' ? '[Global] ' : l[2] === 'p' ? '[Party] ' : ''; d.appendChild(t); if (l[0]) { const n = document.createElement('b'); n.textContent = l[0] + ': '; d.appendChild(n); } d.appendChild(document.createTextNode(l[1])); box.appendChild(d); }
  };
  $('chatCh').onclick = () => { setCh(!chatGlobal); $('chat').focus(); }; setCh(true);
  // ---- settings ----
  function loadSet() { try { const o = JSON.parse(localStorage.getItem('cinderdeep_settings')); if (o && typeof o === 'object') Object.assign(G.set, o); } catch (e) { } applySet(); }
  function applySet() { const st = G.set; SFX.vol(clamp(st.vol, 0, 100) / 100); SFX.music(clamp(st.mus === undefined ? 40 : st.mus, 0, 100) / 100); if (st.gfx !== 'auto') GLX.env.q = clamp(+st.gfx | 0, 0, 2); $('mini').classList.toggle('hide', !st.map); GLX.env.shadows = st.shadows !== false; if (GLX.env.scale !== (+st.scale || 100) / 100) { GLX.env.scale = (+st.scale || 100) / 100; try { GLX.resize(); } catch (_) { } } $('chatlog').style.display = st.chat === false ? 'none' : ''; $('fps').classList.toggle('hide', !st.fps); G.tj = !!st.joy && !!window.matchMedia && matchMedia('(pointer:coarse)').matches; document.body.classList.toggle('tj', G.tj); if (!G.tj) { IN.joy.on = false; IN.joy.x = IN.joy.z = 0; } try { localStorage.setItem('cinderdeep_settings', JSON.stringify(st)); } catch (e) { } }
  function renderSet() {
    const st = G.set, sel = (id, cur, opts) => `<select data-set="${id}">${opts.map(o => `<option value="${o[0]}"${String(cur) === String(o[0]) ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`, chk = (id, on) => `<input type="checkbox" data-set="${id}"${on ? ' checked' : ''}>`;
    $('set').innerHTML = `<div class="ph"><h3>Settings</h3><button class="xb" data-x="set" aria-label="Close">×</button></div>
      <label>Sound volume <span id="volN">${st.vol}%</span><input type="range" min="0" max="100" step="5" value="${st.vol}" data-set="vol"></label>
      <label>Music volume <span id="musN">${st.mus === undefined ? 40 : st.mus}%</span><input type="range" min="0" max="100" step="5" value="${st.mus === undefined ? 40 : st.mus}" data-set="mus"></label>
      <label>Graphics quality ${sel('gfx', st.gfx, [['auto', 'Automatic'], [2, 'High'], [1, 'Medium'], [0, 'Low (fastest)']])}</label>
      <label>Loot filter ${sel('filter', G.hero ? G.hero.filter : 0, [[0, 'Show and collect all loot'], [1, 'Skip Common'], [2, 'Skip Common and Magic'], [3, 'Only Legendary and Mythic']])}</label><label>${chk('autoLoot', st.autoLoot !== false)} Collect loot by walking over it</label><label>${chk('pet', st.pet !== false)} Pet fetches gold and loot</label><label>Pet ${(() => { const got = G.ach || (G.ach = achLoad()); return `<select data-set="petKind">${PETS.map(pt => { const ok = !pt[2] || got[pt[2]], a = ACH.find(x => x[0] === pt[2]); return `<option value="${pt[0]}"${(st.petKind || 'fox') === pt[0] ? ' selected' : ''}${ok ? '' : ' disabled'}>${pt[1]}${ok ? '' : ' (earn ' + a[2] + ')'}</option>`; }).join('')}</select>`; })()}</label><label>${chk('weather', st.weather !== false)} Weather: rain, ash and snow</label>
      <label>${chk('gps', st.gps)} Quest path on the ground (GPS)</label><label>${chk('shake', st.shake)} Screen shake</label><label>${chk('nums', st.nums)} Damage numbers</label><label>${chk('map', st.map)} Minimap</label><label>${chk('chat', st.chat !== false)} Show chat</label><label>${chk('shadows', st.shadows !== false)} Shadows (off is faster)</label><label>Render sharpness ${sel('scale', st.scale || 100, [[100, 'Full'], [75, 'Lighter (75%)'], [50, 'Fastest (50%)']])}</label><label>${chk('fps', !!st.fps)} Show frames per second</label><label>${chk('ally', st.ally !== false)} Sellsword companion when you are alone</label><div class="sm" style="margin-top:10px">Tell the maker what you think:</div><textarea id="fbText" maxlength="600" placeholder="What did you like? What got in your way?" style="width:100%;height:54px;background:#0c0a07;color:#d8ccb0;border:1px solid #5a4a2e;border-radius:3px;font-size:12px;user-select:text;-webkit-user-select:text"></textarea><button data-io="fb">Send feedback</button><div class="sm" style="margin-top:10px">Your heroes are saved in this browser on this device. Back them up, or move them to another device:</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><button data-io="out">Back up my heroes</button><button data-io="in">Restore from backup</button>${location.protocol !== 'file:' ? '<button data-io="inv">Copy party invite link</button>' : ''}</div><textarea id="saveIO" placeholder="Backup text appears here. To restore, paste a backup here and press Restore."></textarea><label class="touchOnly">${chk('joy', st.joy)} Thumb joystick and attack buttons</label>${document.documentElement.requestFullscreen ? '<label class="touchOnly"><button data-fs="1">Full screen on / off</button></label>' : ''}
      <div class="sm">Automatic lowers the picture quality by itself if the game runs slowly. Settings are saved on this device.</div><div class="sm" style="margin-top:6px">Cinderdeep build ${BUILD}</div>`;
  }
  function toggleSet(v) { const el = $('set'), open = v === undefined ? el.classList.contains('hide') : v; el.classList.toggle('hide', !open); if (open) renderSet(); }
  $('set').addEventListener('click', e => { const io = e.target.dataset && e.target.dataset.io;
    if (io === 'out') { if (G.hero && G.state === 'play') saveGame(); const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('cinderdeep_') === 0) o[k] = localStorage.getItem(k); } const s = 'CD1:' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); $('saveIO').value = s; $('saveIO').select(); try { navigator.clipboard.writeText(s); hint('Backup copied. Paste it somewhere safe.'); } catch (_) { hint('Backup ready. Copy the text from the box.'); } return; }
    if (io === 'in') { try { const s = $('saveIO').value.trim(); if (s.indexOf('CD1:') !== 0) throw 0; const o = JSON.parse(decodeURIComponent(escape(atob(s.slice(4))))); let n = 0; for (const k in o) if (k.indexOf('cinderdeep_') === 0 && typeof o[k] === 'string') { localStorage.setItem(k, o[k]); n++; } if (!n) throw 0; toggleSet(false); if (G.state === 'play') { const cur = loadGame(G.hero.cls); if (cur) G.hero = cur; hint('Heroes restored. Returning to the menu.'); toMenu(); } else { $('menuMsg').textContent = 'Heroes restored.'; renderClasses(); } } catch (_) { hint('That does not look like a Cinderdeep backup.'); } return; }
    if (io === 'fb') { const s = $('fbText').value.trim(); if (!s) { hint('Write a line or two first.'); return; } const h = G.hero, info = h ? '\n\n— ' + CLASSES[h.cls].n + ', level ' + h.level + ', build ' + BUILD : '\n\n— build ' + BUILD; location.href = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent('Cinderdeep feedback') + '&body=' + encodeURIComponent(s + info); if (G.online) NET.send({ t: 'feedback', m: s }); $('fbText').value = ''; hint('Your email app opens with the feedback ready. Press send there.'); return; }
    if (io === 'inv') { const u = location.origin + location.pathname + '?room=' + encodeURIComponent(NET.room || $('oRoom').value || 'public'); $('saveIO').value = u; $('saveIO').select(); try { navigator.clipboard.writeText(u); } catch (_) { } hint('Invite link copied. Anyone who opens it lands in your party.'); return; }
    if (e.target.closest('[data-x]')) toggleSet(false); else if (e.target.dataset && e.target.dataset.fs) { try { if (document.fullscreenElement) document.exitFullscreen(); else { const pr = document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (pr && pr.catch) pr.catch(() => { }); } } catch (_) { } } });
  $('set').addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.set; if (!k) return; const st = G.set;
    if (k === 'mus') { st.mus = +e.target.value; $('musN').textContent = st.mus + '%'; applySet(); SFX.unlock(); return; }
    if (k === 'vol') { st.vol = +e.target.value; $('volN').textContent = st.vol + '%'; applySet(); SFX.unlock(); SFX.play('pickup'); return; }
    if (k === 'gfx') { st.gfx = e.target.value === 'auto' ? 'auto' : +e.target.value; if (st.gfx === 'auto') GLX.env.q = 2; } else if (k === 'filter') { if (G.hero) G.hero.filter = +e.target.value; } else if (k === 'petKind') st.petKind = e.target.value; else if (k === 'scale') st.scale = +e.target.value || 100; else st[k] = e.target.checked;
    applySet();
  });
  $('build').textContent = 'Build ' + BUILD; document.title = 'Cinderdeep · build ' + BUILD;
  $('bSet').onclick = () => toggleSet(); $('mSet').onclick = () => toggleSet(); loadSet();
  // leaderboard: highest level and deepest floor on the server for this build
  function badgeRow() { const got = G.ach || (G.ach = achLoad()), n = ACH.filter(a => got[a[0]]).length; return `<h3 style="margin-top:14px">YOUR BADGES · ${n} / ${ACH.length}</h3><div class="badges">` + ACH.map(a => `<span class="bdg${got[a[0]] ? ' on' : ''}" title="${a[2]}: ${a[3]}">${a[1]}<i>${a[2]}</i></span>`).join('') + '</div>'; }
  function openLb() {
    const el = $('lb'); if (!el.classList.contains('hide')) { el.classList.add('hide'); return; } el.classList.remove('hide'); el.innerHTML = '<h2>LEADERBOARD</h2><div class="sub">Loading…</div>';
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), me = (() => { try { return (localStorage.getItem('cinderdeep_name') || '').toLowerCase(); } catch (e) { return ''; } })();
    const row = (e, i, v) => `<li class="${String(e.n || '').toLowerCase() === me ? 'me' : ''}"><span class="r">${i + 1}</span><span class="dot" style="background:#${(CLASS_COL[e.c] || 0x888888).toString(16).padStart(6, '0')}"></span><span class="nm">${e.h ? '<span title="Hardcore' + (e.x ? ', fallen' : '') + '" style="color:' + (e.x ? '#8a8a8a' : '#ff6a5a') + '">☠</span> ' : ''}${esc(e.n)} <small style="color:#8a7a5a">${esc(CLASSES[e.c] ? CLASSES[e.c].n : '')}</small></span><span class="v">${v}</span></li>`;
    fetch('leaderboard', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      if (el.classList.contains('hide')) return; if (!j) { el.innerHTML = '<h2>LEADERBOARD</h2><div class="sub">The leaderboard needs the game server. Play online to get on it.</div><button class="x" id="lbX">Close</button>'; $('lbX').onclick = openLb; return; }
      const none = '<li><span class="nm" style="color:#8a7a5a">Nobody yet. Be the first!</span></li>';
      el.innerHTML = `<h2>LEADERBOARD</h2><div class="sub">Build ${esc(j.build)} · everyone started fresh this build</div><div class="cols"><div><h3>HIGHEST LEVEL</h3><ol>${j.lvl.map((e, i) => row(e, i, 'Lv ' + e.l + (e.l >= MAX_LEVEL && e.p ? ' · P' + e.p : ''))).join('') || none}</ol></div><div><h3>FLOORS CLEARED</h3><ol>${j.deep.map((e, i) => row(e, i, e.d + (e.d === 1 ? ' floor' : ' floors'))).join('') || none}</ol></div><div><h3>FASTEST RIFT</h3><ol>${(j.rift || []).map((e, i) => row(e, i, (s2 => Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'))(Math.round(e.ms / 1000)) + ' · ml ' + e.d)).join('') || none}</ol></div><div><h3>TODAY'S DAILY</h3><ol>${(j.daily || []).map((e, i) => row(e, i, e.d + (e.d === 1 ? ' floor' : ' floors'))).join('') || none}</ol></div></div>${badgeRow()}<button class="x" id="lbX">Close</button>`; $('lbX').onclick = openLb;
    });
  }
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => SFX.unlock(), { once: true, passive: true });
  $('mLb').onclick = openLb; $('bLb').onclick = openLb;
  // party browser (build 0021): see every party playing right now and join one with a tap, no code to type
  function openParties() {
    const el = $('parties'); if (!el.classList.contains('hide')) { el.classList.add('hide'); return; } el.classList.remove('hide'); el.innerHTML = '<h2>PARTIES</h2><div class="sub">Looking for players…</div>';
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), my = G.online && NET.room;
    fetch('parties', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      if (el.classList.contains('hide')) return; if (!j) { el.innerHTML = '<h2>PARTIES</h2><div class="sub">The party list needs the game server. Play online to join others.</div><div class="row"><button data-p="x">Close</button></div>'; return; }
      const rows = j.parties.map(pt => { const lead = pt.players[0] || { n: '?' }, mine = pt.code === my, full = pt.players.length >= 8, lv = pt.players.map(q => q.l); return `<div class="pr${mine ? ' me' : ''}"><div class="pm"><b>${esc(lead.n)}'s party</b>${pt.daily ? ' <span style="color:#ffd84a;font-size:11px">☀ daily</span>' : ''}<div class="who">${pt.players.map(q => `<span class="dot" style="background:#${(CLASS_COL[q.c] || 0x888888).toString(16).padStart(6, '0')}"></span>${esc(q.n)} <small>Lv ${q.l}</small>`).join('')}</div></div><div class="pf">Floor ${pt.floor}<br><small style="color:#a89a80">${pt.players.length}/8 · Lv ${Math.min(...lv)}–${Math.max(...lv)}</small></div>${mine ? '<button disabled>You are here</button>' : full ? '<button disabled>Full</button>' : `<button class="big" data-j="${esc(pt.code)}">Join</button>`}</div>`; }).join('');
      el.innerHTML = `<h2>PARTIES</h2><div class="sub">${j.parties.length ? 'Tap Join to play with them. Everyone keeps their own hero and loot.' : 'Nobody else is playing right now. Start a game and others can join you here.'}</div>${rows}<div class="row"><button data-p="r">Refresh</button><button data-p="x">Close</button></div>`;
    });
  }
  $('parties').onclick = e => { const b = e.target.closest('[data-j],[data-p]'); if (!b) return; if (b.dataset.p === 'x') { $('parties').classList.add('hide'); return; } if (b.dataset.p === 'r') { $('parties').classList.add('hide'); openParties(); return; }
    const code = b.dataset.j; $('parties').classList.add('hide');
    if (G.state === 'play' && G.online) { const nm = NET.me || 'Hero'; NET.close(); G.state = 'play'; hint('Joining the party…'); NET.connect(nm, code); }
    else { $('oRoom').value = code; $('btnNew').click(); } };
  $('mParty').onclick = openParties; $('bParty').onclick = openParties;
  { const xt = $('xpT'), xb = $('xp'); if (xt && xb && xt.parentNode !== xb) xb.appendChild(xt); } // the XP numbers sit on the XP bar itself
  function toMenu() { $('pick').classList.add('hide'); if (G.state !== 'play') return; menuBuilt = false; saveGame(); NET.close(); G.state = 'menu'; G.auto = false; G.speed = 1; G.inTown = false; G.away = null; closeTown(); toggleInv(false); toggleSkl(false); toggleSet(false); closeChat(); $('chatlog').classList.add('hide'); $('onl').classList.add('hide'); unpin(); $('game').classList.add('hide'); $('death').classList.add('hide'); $('menu').classList.remove('hide'); $('menuMsg').textContent = 'Pick a hero, carve through the Blighted Hollow, slay its guardian, and take the portal deeper.'; renderClasses(); }
  $('bMenu').onclick = toMenu; $('deathMenu').onclick = toMenu; $('bTown').onclick = $('tTown').onclick = () => { if (G.inTown) leaveTown(); else enterTown(); }; $('chatX').onclick = closeChat;
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });   // so Space, Enter and letter keys never re-press the last button
  $('bInv').onclick = () => { toggleSkl(false); toggleInv(); }; $('bSkl').onclick = () => { toggleInv(false); toggleSkl(); };
  $('bAuto').onclick = toggleAuto; $('bSpd').onclick = cycleSpeed; $('tChat').onclick = openChat;

  // ---- flow ----
  function start(hero, net) {
    G.hero = hero; SFX.unlock(); P.hp = 1e9; U.invDirty = true; menuBuilt = false;
    if (net) { $('menuMsg').textContent = 'Connecting to the server…'; NET.connect(net.name, net.room); return; }
    $('menu').classList.add('hide'); $('game').classList.remove('hide'); buildBar(); enterZone();
    setTimeout(() => { if (G.state !== 'menu' && G.hero && pendingPick(G.hero) >= 0) openPick(); }, 700);
  }
  U.netZone = () => { closeTown(); $('menu').classList.add('hide'); $('game').classList.remove('hide'); $('death').classList.add('hide'); buildBar(); };
  U.netFail = msg => { $('menu').classList.remove('hide'); $('menuMsg').textContent = msg; };
  U.lost = msg => { $('recon').classList.add('hide'); toMenu(); $('menuMsg').textContent = msg; };
  U.reconnecting = n => { $('recon').classList.toggle('hide', !n); if (n) $('recon').textContent = 'Connection lost. Reconnecting… (try ' + n + ' of 12). You are protected while this shows.'; else hint('Reconnected.'); };
  const pollOnline = () => { if ($('menu').classList.contains('hide')) return; NET.status().then(j => { const first = !serverChecked; serverChecked = true; if (!j) { $('menuOn').textContent = /^https?:$/.test(location.protocol) ? 'Server offline' : 'Offline preview'; $('menuOn').className = 'off'; if (first) renderClasses(); return; } if (!hasServer || first) { hasServer = true; renderClasses(); } $('online').classList.remove('hide'); $('mInvite').classList.remove('hide'); $('menuOn').innerHTML = '<i></i>' + j.players + (j.players === 1 ? ' player online' : ' players online'); $('menuOn').className = 'live'; $('onlineN').textContent = j.players + (j.players === 1 ? ' player' : ' players') + ' online now'; }); };
  pollOnline(); setInterval(pollOnline, 15000);
  try { $('oName').value = localStorage.getItem('cinderdeep_name') || ''; } catch (e) { }
  try { const rm = new URLSearchParams(location.search).get('room'); if (rm) $('oRoom').value = rm.replace(/[^\w-]/g, '').slice(0, 16); } catch (e) { }
  const menuGear = {}, menuHero = {}; let menuBuilt = false;

  // hero portrait in the top-left corner: a small painted bust in the class colours
  let portKey = '';
  function drawPortrait(cls) {
    const cv = $('port'); if (!cv) return; const hurt = P.dead ? 2 : P.hurt > 0 ? 1 : 0, key = cls + hurt; if (key === portKey) return; portKey = key;
    const x = cv.getContext('2d'), S = cv.width, hex = n => '#' + n.toString(16).padStart(6, '0'), cc = hex(CLASS_COL[cls] || 0xd8a040), L = LOOK[cls] || LOOK.warden;
    x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 3, 0, 7); x.clip();
    let gr = x.createRadialGradient(S / 2, S * .38, 2, S / 2, S / 2, S * .6); gr.addColorStop(0, cc); gr.addColorStop(1, '#0a0806'); x.fillStyle = gr; x.fillRect(0, 0, S, S);
    const cx = S / 2, hy = S * .44, hr = S * .17;
    x.fillStyle = hex(L.a); x.beginPath(); x.ellipse(cx, S * 1.02, S * .44, S * .34, 0, 0, 7); x.fill(); // shoulders
    x.fillStyle = cc; x.fillRect(cx - S * .08, S * .74, S * .16, S * .3); // tabard
    if (cls === 'warden') { x.fillStyle = '#8e97a8'; for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(cx + sd * S * .32, S * .78, S * .16, S * .1, 0, 0, 7); x.fill(); } }
    x.fillStyle = '#c99a78'; x.fillRect(cx - S * .06, hy + hr * .6, S * .12, S * .14); x.beginPath(); x.ellipse(cx, hy, hr * .9, hr * 1.1, 0, 0, 7); x.fill(); // neck, face
    const hair = cls === 'brawler' ? '#2a2018' : cls === 'elementalist' ? '#8a3a18' : cls === 'arcanist' ? '#9c98ac' : '#4a3626';
    if (cls === 'warden') { x.fillStyle = '#8e97a8'; x.beginPath(); x.arc(cx, hy - hr * .1, hr * 1.05, Math.PI, 0); x.fill(); x.fillRect(cx - hr * 1.05, hy - hr * .1, hr * .3, hr * 1.1); x.fillRect(cx + hr * .75, hy - hr * .1, hr * .3, hr * 1.1); x.fillStyle = '#e8dcc0'; for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(cx + sd * hr * .7, hy - hr * .7); x.quadraticCurveTo(cx + sd * hr * 1.7, hy - hr * 1.2, cx + sd * hr * 1.4, hy - hr * 2); x.lineTo(cx + sd * hr * .9, hy - hr * .95); x.fill(); } x.fillStyle = hair; x.fillRect(cx - hr * .6, hy + hr * .55, hr * 1.2, hr * .4); }
    else if (cls === 'ranger') { x.fillStyle = hex(L.cl); x.beginPath(); x.moveTo(cx - hr * 1.4, hy + hr * 1.3); x.quadraticCurveTo(cx - hr * 1.5, hy - hr * 1.9, cx, hy - hr * 1.5); x.quadraticCurveTo(cx + hr * 1.5, hy - hr * 1.9, cx + hr * 1.4, hy + hr * 1.3); x.lineTo(cx + hr * .85, hy + hr * .9); x.quadraticCurveTo(cx + hr * .9, hy - hr * 1.1, cx, hy - hr * .95); x.quadraticCurveTo(cx - hr * .9, hy - hr * 1.1, cx - hr * .85, hy + hr * .9); x.fill(); }
    else if (cls === 'arcanist') { x.fillStyle = hair; x.beginPath(); x.moveTo(cx - hr * .5, hy + hr * .6); x.lineTo(cx, hy + hr * 2); x.lineTo(cx + hr * .5, hy + hr * .6); x.fill(); x.fillStyle = hex(L.cl); x.beginPath(); x.ellipse(cx, hy - hr * .75, hr * 1.7, hr * .3, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - hr * .9, hy - hr * .8); x.lineTo(cx + hr * .4, hy - hr * 2.9); x.lineTo(cx + hr * .9, hy - hr * .8); x.fill(); x.fillStyle = cc; x.fillRect(cx - hr * .9, hy - hr * 1.05, hr * 1.8, hr * .22); }
    else if (cls === 'brawler') { x.fillStyle = hair; x.beginPath(); x.arc(cx, hy - hr * .2, hr * .95, Math.PI * 1.05, -Math.PI * .05); x.fill(); x.beginPath(); x.arc(cx, hy - hr * 1.35, hr * .4, 0, 7); x.fill(); x.fillStyle = cc; x.fillRect(cx - hr * .95, hy - hr * .55, hr * 1.9, hr * .22); }
    else { x.fillStyle = hex(L.cl); x.beginPath(); x.arc(cx, hy - hr * .1, hr * 1.25, Math.PI, 0); x.fill(); x.fillRect(cx - hr * 1.25, hy - hr * .1, hr * .38, hr * 1.4); x.fillRect(cx + hr * .87, hy - hr * .1, hr * .38, hr * 1.4); for (let k = 0; k < 5; k++) { const a = Math.PI + k / 4 * Math.PI; x.fillStyle = k % 2 ? cc : '#ffd06a'; x.beginPath(); x.arc(cx + Math.cos(a) * hr * 1.5, hy - hr * 1.2 + Math.sin(a) * hr * .4, hr * .16, 0, 7); x.fill(); } }
    const ey = hy - hr * .05, eyeC = cls === 'arcanist' ? '#b080ff' : cls === 'elementalist' ? '#ff9a3a' : cls === 'ranger' ? '#3a7a3a' : '#3a5a8a';
    for (const sd of [-1, 1]) { x.fillStyle = '#f2eee2'; x.beginPath(); x.ellipse(cx + sd * hr * .38, ey, hr * .2, hr * .13, 0, 0, 7); x.fill(); x.fillStyle = eyeC; x.beginPath(); x.arc(cx + sd * hr * .38, ey, hr * .1, 0, 7); x.fill(); x.fillStyle = '#2a1a12'; x.fillRect(cx + sd * hr * .38 - hr * .22, ey - hr * .3, hr * .44, hr * .08); }
    x.fillStyle = '#6a322c'; x.fillRect(cx - hr * .22, hy + hr * .5, hr * .44, hr * .07);
    if (hurt) { x.fillStyle = hurt === 2 ? 'rgba(20,0,0,.6)' : 'rgba(200,20,10,.35)'; x.fillRect(0, 0, S, S); }
    x.restore(); x.lineWidth = 3; x.strokeStyle = cc; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 7); x.stroke(); x.lineWidth = 1; x.strokeStyle = '#1a140c'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, 7); x.stroke();
  }
  function menuScene(t) {
    if (!menuBuilt) { GLX.statBegin(); GLX.obj('stat', 'box', 0, -.5, 0, 0, 240, 1, 240, GLX.col(0x3c4a2a), 0, 1, .4); GLX.statEnd(); menuBuilt = true; setEnv({ th: THEMES.town }); GLX.env.lightR = 80; }
    const narrow = innerWidth < innerHeight, sp = narrow ? 1.25 : 2.3, col = GLX.col; G.time = t; GLX.env.player = [0, 0, 0]; GLX.env.t = t; GLX.begin();
    GLX.setCamera([0, narrow ? 2 : 1.9, narrow ? 24 : 16], [0, narrow ? -2.1 : .35, 0], .5);
    CLASS_IDS.forEach((id, i) => {
      const o = menuHero[id] || (menuHero[id] = { x: 0, y: 0, z: 0, rot: 0, walk: 0, mv: 0, hurt: 0, act: null, swing: 0, spin: null, dash: false, buffs: null, flaskT: 0, cls: id }), on = id === selCls;
      o.x = (i - 2) * sp; o.z += ((on ? (narrow ? .7 : 1.6) : 0) - o.z) * .1; if (on) { o.spinA = (o.spinA || 0) + .006; const ph = t % 5; o.rot = Math.sin(o.spinA * 3) * 1.1; if (ph < .7) { o.act = o.act || { sk: { type: 'melee' } }; o.swing = ph / .7; } else o.act = null; } else { o.act = null; o.rot = (2 - i) * .12; } o.gear = menuGear[id] || DEFGEAR; drawHero(o, false);
      if (on) { const cc = col(CLASS_COL[id]); GLX.obj('glow', 'ring', o.x, .06, o.z, t, 2.4, 1, 2.4, cc, 1, .8, -1); GLX.obj('glow', 'disc', o.x, .07, o.z, 0, 3.4, 1, 3.4, col(0xfff0d0), .6, .16, 1); GLX.light(o.x, 1.5, o.z - 1.5, 5, cc, .7, 8); }
    });
    SFX.musTick(); GLX.light(0, 5, 6, 26, col(0xffc890), .75, 9); GLX.light(-7, 3, -2, 12, col(0x6a8cff), .5, 2); GLX.light(7, 3, -2, 12, col(0xff7a2a), .5, 2); GLX.render();
  }
  let selCls = 'warden', resetArmed = false, hasServer = false, serverChecked = false; try { const c = localStorage.getItem('cinderdeep_class'); if (CLASSES[c]) selCls = c; } catch (e) { }
  function renderClasses() {
    $('classes').innerHTML = CLASS_IDS.map(id => { const c = CLASSES[id], sv = loadGame(id); return `<div class="ccard${id === selCls ? ' on' : ''}" data-c="${id}" style="--cc:#${(CLASS_COL[id] || 0xd8b060).toString(16).padStart(6, '0')}"><div class="ct">${c.tag}</div><div class="cn">${c.n}</div><div class="cd2">${c.d}</div><div class="cl">${sv ? 'Level ' + sv.level : 'New hero'}</div></div>`; }).join('');
    for (const id of CLASS_IDS) { const v = loadGame(id); menuGear[id] = gearDecode(v ? gearCode(v.eq) : gearCode({ weapon: { base: CLASSES[id].w, rar: 0 } })); }
    const sv = loadGame(selCls), web = /^https?:$/.test(location.protocol), pre = hasServer ? 'Play online · ' : serverChecked || !web ? 'Offline preview · ' : '';
    $('btnNew').textContent = web && !serverChecked ? 'Waking the server…' : pre + (sv ? 'Continue level ' + sv.level : 'Start as ' + CLASSES[selCls].n); $('btnNew').disabled = web && !serverChecked; { const hw = $('hcWrap'); if (hw) hw.classList.toggle('hide', !!sv); if (sv && sv.hc) $('btnNew').textContent += ' · Hardcore'; }
    if (!hasServer && (serverChecked || !web)) $('menuMsg').textContent = 'This is an offline preview copy. Cinderdeep itself is online only, at your game server address.'; $('btnReset').classList.toggle('hide', !sv); resetArmed = false; $('btnReset').textContent = 'Reset this hero';
  }
  // start screen: patch notes card and drifting embers
  { const nw = $('news'); if (nw && typeof NEWS !== 'undefined') { nw.innerHTML = '<h4>New in build ' + BUILD + '<span class="cv"></span></h4><ul>' + NEWS.map(t => '<li>' + t + '</li>').join('') + '</ul>'; nw.title = 'Show or hide what is new'; nw.onclick = () => nw.classList.toggle('mini'); setTimeout(() => nw.classList.add('mini'), 12000); } } /* the patch notes fold into a small tab after a while so the heroes show */
  { const cv = $('embers'), cx = cv && cv.getContext('2d'), E = []; let W = 0, H = 0, last = 0;
    const spr = document.createElement('canvas'); spr.width = spr.height = 32; { const g2 = spr.getContext('2d'), gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(.25, 'rgba(255,140,40,.6)'); gr.addColorStop(1, 'rgba(255,80,10,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32); }
    const fit = () => { const r = Math.min(1.5, devicePixelRatio || 1); W = cv.width = innerWidth * r; H = cv.height = innerHeight * r; }; if (cx) { fit(); addEventListener('resize', fit); }
    const spawn = y => ({ x: Math.random() * W, y: y === undefined ? H + 10 : y, vy: -(18 + Math.random() * 45), vx: (Math.random() - .5) * 12, r: 1 + Math.random() * 2.6, ph: Math.random() * 6.28, life: 1, hue: 18 + Math.random() * 26 });
    const loop = t => { requestAnimationFrame(loop); if (!cx || $('menu').classList.contains('hide')) return; const dt = Math.min(.05, (t - last) / 1000 || .016); last = t; const k = W / innerWidth;
      while (E.length < 45) E.push(spawn(E.length < 30 ? Math.random() * H : undefined)); cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter';
      for (let i = E.length - 1; i >= 0; i--) { const e = E[i]; e.ph += dt * 1.5; e.x += (e.vx + Math.sin(e.ph) * 14) * dt * k; e.y += e.vy * dt * k; if (e.y < H * .25) e.life -= dt * .9; if (e.life <= 0 || e.y < -10) { E.splice(i, 1); continue; }
        const a = Math.max(0, e.life) * (.55 + .45 * Math.sin(e.ph * 3)), rr = e.r * k * 4; cx.globalAlpha = a; cx.drawImage(spr, e.x - rr, e.y - rr, rr * 2, rr * 2); } cx.globalAlpha = 1;
      cx.globalCompositeOperation = 'source-over'; };
    requestAnimationFrame(loop); }
  $('classes').onclick = e => { const c = e.target.closest('.ccard'); if (c) { selCls = c.dataset.c; try { localStorage.setItem('cinderdeep_class', selCls); } catch (_) { } renderClasses(); } };
  $('btnNew').onclick = () => { let hero = loadGame(selCls); if (!hero) { hero = newHero(selCls); if ($('hcChk') && $('hcChk').checked) hero.hc = 1; } if (!hasServer) { start(hero); return; } const name = $('oName').value.trim() || CLASSES[selCls].n, room = $('soloChk').checked ? 'solo' + Math.random().toString(36).slice(2, 8) : $('oRoom').value.trim() || 'auto' /* blank: the server puts you with other players of a similar level */; try { localStorage.setItem('cinderdeep_name', name); } catch (_) { } start(hero, { name, room }); };
  { const dd = $('mDaily'); if (dd) dd.onclick = () => { if (!hasServer) { $('menuMsg').textContent = 'The daily challenge needs the game server. Play online to join it.'; return; } let hero = loadGame(selCls); if (!hero) { hero = newHero(selCls); if ($('hcChk') && $('hcChk').checked) hero.hc = 1; } const d = new Date(), td = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0'), code = ($('soloChk').checked ? Math.random().toString(36).slice(2, 5) : $('oRoom').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'au').slice(0, 3), name = $('oName').value.trim() || CLASSES[selCls].n; try { localStorage.setItem('cinderdeep_name', name); } catch (_) { } start(hero, { name, room: 'dly' + td + code }); setTimeout(() => hint('Daily challenge: every player gets these same floors today. Go as deep as you can!'), 2500); }; } // daily challenge: same floors for everyone today; type a party code to run it together
  $('btnReset').onclick = () => { if (!resetArmed) { resetArmed = true; $('btnReset').textContent = 'Click again to erase this hero'; return; } try { localStorage.removeItem(SAVE_KEY + '_' + selCls); if (selCls === 'warden') localStorage.removeItem(SAVE_KEY); } catch (_) { } renderClasses(); };
  renderClasses();
  U.revive = () => $('revive').onclick();
  $('revive').onclick = () => {
    const Z = G.zone; P.dead = false; P.x = Z.start[0]; P.z = Z.start[1]; P.hp = P.stats.maxLife; P.mana = 0; P.iframes = 2; P.move = P.atk = P.inter = P.pick = null; G.areas.length = 0; G.projs.length = 0;
    if (G.boss && !G.online) { G.boss.hp = G.boss.maxHp; G.boss.awake = false; G.boss.st = 'chase'; G.boss.x = Z.bossAt[0]; G.boss.z = Z.bossAt[1]; }
    P.buffs = P.buffs.filter(b => b.n !== 'Second wind'); P.buffs.push({ s: { dmg: 20, ms: 10 }, t: 30, n: 'Second wind' }); computeStats(); ring(P.x, P.z, 0, 8, .7, 0xffd84a); hint('Second wind: you hit harder and move faster for 30 seconds.');
    $('death').classList.add('hide');
  };
  function frame(t) {
    requestAnimationFrame(frame); const raw = (t - last) / 1000 || 0, dt = Math.min(.05, raw); last = t;
    if (G.set.fps && frameN % 20 === 0) $('fps').textContent = Math.round(1 / Math.max(.001, slow)) + ' fps';
    if (G.state === 'play' && raw < 3) { slow = slow * .93 + raw * .07; if (++slowN > 45 && slow > .045 && GLX.env.q > 0 && G.set.gfx === 'auto') { GLX.env.q--; slowN = 0; slow = .02; } }
    if (G.state === 'play') {
      if (G.camReady && IN.sx > -9000) { const g = GLX.groundAt(IN.sx, IN.sy); if (isFinite(g[0]) && isFinite(g[1])) { IN.gx = g[0]; IN.gz = g[1]; } }
      const steps = G.online ? 1 : G.speed; for (let i = 0; i < steps && G.state === 'play'; i++) update(dt);
      GLX.begin(); drawWorld(); G.camReady = true; GLX.render(); hud(dt);
    } else if (!$('menu').classList.contains('hide')) menuScene(t / 1000);
    drawOv();
  }
  if (!GLX.init(glc)) { $('menuMsg').textContent = 'This game needs WebGL2, which this browser or device does not provide. Try a current desktop Chrome, Edge or Firefox.'; $('btnNew').classList.add('hide'); $('classes').classList.add('hide'); }
  else requestAnimationFrame(frame);
  setInterval(() => { if (G.state === 'play' && !P.dead) saveGame(); }, 20000);
  return U;
})();
