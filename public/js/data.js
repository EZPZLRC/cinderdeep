'use strict';
const BUILD = '0095'; const BUILT_AT = 1794773170090; /* when this build was pushed, so the label stays right after a server restart */
// Fresh start: every hero and the stash are wiped whenever this number changes. It follows the build, so each new build is a new season.
const SEASON = '0028'; /* Lee, Nov 14: heroes now carry over between builds. Only change this to start a brand-new season on purpose */
const SLOTS = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet', 'ring1'];
const DROP_SLOTS = ['weapon', 'weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet', 'ring', 'ring'];
const AFF_ALIAS = { shoulders: 'chest', pants: 'chest', belt: 'helm', bracers: 'gloves', offhand: 'amulet' };
const OFFHAND = { warden: { n: 'Shield', a: 14 }, ranger: { n: 'Quiver' }, arcanist: { n: 'Orb' }, brawler: { n: 'Charm' }, elementalist: { n: 'Tome' } };
const BAG_W = 10, BAG_H = 6, BAG_N = 60;
const SLOT_NAME = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', gloves: 'Gloves', boots: 'Boots', amulet: 'Amulet', ring: 'Ring', ring1: 'Ring', ring2: 'Ring', offhand: 'Off-hand', shoulders: 'Shoulders', bracers: 'Bracers', belt: 'Belt', pants: 'Pants' };
const SLOT_ICON = { weapon: '⚔', helm: '⛑', chest: '♜', gloves: '✋', boots: '♞', amulet: '◈', ring: '◯' };
const RAR = [{ n: 'Common', c: '#c9c9c9' }, { n: 'Magic', c: '#7396ff' }, { n: 'Rare', c: '#ffd84a' }, { n: 'Legendary', c: '#ff8a2a' }, { n: 'Mythic', c: '#c070ff' }];
const EL_COL = { phys: 0xe8e0d0, fire: 0xff7a2a, cold: 0x7ad0ff, light: 0xfff07a, arc: 0xb070ff };
const EL_CSS = { phys: '#f0e6d2', fire: '#ff9a4a', cold: '#8fd8ff', light: '#fff48a', arc: '#cf9aff' };
const EL_NAME = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning' };

const STATS = {
  life: '+# Maximum Life', lifePct: '+#% Maximum Life', mana: '+# Maximum Mana', manaPct: '+#% Maximum Mana', lifeRegen: '+# Life Regenerated per second', manaRegen: '+# Mana Regenerated per second',
  dmg: '+#% Damage', phys: '+#% Physical Damage', fire: '+#% Fire Damage', cold: '+#% Cold Damage', light: '+#% Lightning Damage', arc: '+#% Arcane Damage', ele: '+#% Elemental Damage',
  addPhys: 'Adds # Physical Damage', addFire: 'Adds # Fire Damage', addCold: 'Adds # Cold Damage', addLight: 'Adds # Lightning Damage',
  aspd: '+#% Attack and Cast Speed', crit: '+#% Critical Strike Chance', critDmg: '+#% Critical Strike Damage',
  armor: '+# Armor', armorPct: '+#% Armor', resFire: '+#% Fire Resistance', resCold: '+#% Cold Resistance', resLight: '+#% Lightning Resistance', resAll: '+#% All Resistances',
  dodge: '+#% Dodge Chance', ms: '+#% Movement Speed', cdr: '+#% Cooldown Reduction', area: '+#% Area of Effect', lifeOnHit: '+# Life on Hit', leech: '#% of Damage Leeched as Life',
  mf: '+#% Magic Find', gf: '+#% Gold Find', thorns: '# Thorns Damage', xp: '+#% Experience Gained', dr: '#% Damage Reduction',
  projExtra: '+# Projectiles', echo: '#% chance for skills to Echo', procLight: '#% chance to call Lightning on hit', boomFire: 'Slain enemies explode in flames', boomCold: 'Slain enemies burst into frost',
  cull: 'Culls enemies below #% life', cheat: 'Cheat death once every 60 seconds', lowLife: '+#% Damage while below half life'
};
function statText(k, v) { const t = STATS[k] || k; return t.replace('#', Math.max(1, Math.round(v))); }

// key, min, max, scaling (f = flat, grows fast; p = percent, grows slowly; n = none), slots
const AFFIX = [
  ['life', 12, 20, 'f', 'helm chest gloves boots amulet ring'], ['lifeRegen', .5, 1, 'f', 'helm chest amulet'], 
  ['dmg', 5, 9, 'p', 'weapon amulet ring gloves'], ['phys', 8, 14, 'p', 'weapon gloves ring'], ['fire', 8, 14, 'p', 'weapon amulet ring'], ['cold', 8, 14, 'p', 'weapon amulet ring'], ['light', 8, 14, 'p', 'weapon amulet ring'], ['arc', 8, 14, 'p', 'weapon amulet ring'],
  ['addPhys', 1.5, 3, 'f', 'weapon ring gloves'], ['addFire', 2, 4, 'f', 'weapon ring amulet gloves'], ['addCold', 2, 4, 'f', 'weapon ring amulet gloves'], ['addLight', 2, 4, 'f', 'weapon ring amulet gloves'],
  ['aspd', 3, 6, 'p', 'weapon gloves ring'], ['crit', 1.5, 3, 'p', 'weapon gloves amulet ring'], ['critDmg', 8, 15, 'p', 'weapon amulet ring gloves'],
  ['armor', 8, 14, 'f', 'helm chest gloves boots'], ['resFire', 6, 11, 'p', 'helm chest gloves boots amulet ring'], ['resCold', 6, 11, 'p', 'helm chest gloves boots amulet ring'], ['resLight', 6, 11, 'p', 'helm chest gloves boots amulet ring'],
  ['resAll', 3, 5, 'p', 'chest amulet ring'], ['dodge', 2, 4, 'p', 'boots gloves chest'], ['ms', 4, 7, 'p', 'boots amulet'], ['cdr', 2, 4, 'p', 'helm amulet weapon'], ['area', 4, 8, 'p', 'weapon amulet'],
  ['lifeOnHit', .8, 1.6, 'f', 'weapon ring gloves'], ['leech', 1, 1, 'n', 'weapon ring'], ['mf', 5, 10, 'p', 'helm boots amulet ring'], ['gf', 8, 15, 'p', 'helm boots amulet ring gloves'],
  ['thorns', 3, 6, 'f', 'chest helm'], ['xp', 2, 4, 'n', 'helm amulet ring']
];
const WEAPONS = [{ n: 'Sword', d: [5, 9], s: 1.45, t: 'sword' }, { n: 'War Axe', d: [7, 11], s: 1.25, t: 'axe' }, { n: 'Maul', d: [10, 15], s: 1.0, t: 'maul' }, { n: 'Staff', d: [8, 13], s: 1.1, t: 'staff' }, { n: 'Wand', d: [4, 8], s: 1.65, t: 'staff' }, { n: 'Longbow', d: [6, 11], s: 1.3, t: 'bow' }, { n: 'Shortbow', d: [4, 8], s: 1.6, t: 'bow' }, { n: 'Cestus', d: [4, 7], s: 1.7, t: 'fist' }, { n: 'Spiked Knuckles', d: [5, 9], s: 1.5, t: 'fist' }];
const ARMOR = {
  helm: [{ n: 'Iron Helm', a: 9 }, { n: 'Leather Hood', a: 6 }, { n: 'Circlet', a: 4 }], chest: [{ n: 'Chainmail', a: 18 }, { n: 'Leather Jerkin', a: 12 }, { n: 'Silk Robe', a: 8 }],
  gloves: [{ n: 'Gauntlets', a: 7 }, { n: 'Leather Gloves', a: 5 }], boots: [{ n: 'Greaves', a: 7 }, { n: 'Leather Boots', a: 5 }],
  shoulders: [{ n: 'Pauldrons', a: 8 }, { n: 'Leather Mantle', a: 5 }], bracers: [{ n: 'Vambraces', a: 5 }, { n: 'Leather Bracers', a: 4 }], belt: [{ n: 'War Belt', a: 5 }, { n: 'Sash', a: 3 }], pants: [{ n: 'Plate Tassets', a: 12 }, { n: 'Leather Leggings', a: 8 }]
};
const JEWEL = { amulet: ['Amulet', 'Pendant', 'Talisman'], ring: ['Ring', 'Band', 'Signet'] };
const MAGPRE = ['Sturdy', 'Keen', 'Glinting', 'Warded', 'Fierce', 'Humming', 'Etched', 'Tempered', 'Gilded', 'Runed', 'Vigilant', 'Savage', 'Patient', 'Wicked', 'Hallowed', 'Restless', 'Stalwart', 'Cunning', 'Baleful', 'Radiant', 'Sullen', 'Thirsting', 'Unbroken', 'Whispering'];
const RN1 = ['Grim', 'Storm', 'Dusk', 'Ember', 'Bone', 'Wraith', 'Hollow', 'Dread', 'Ash', 'Rune', 'Blight', 'Iron', 'Soul', 'Thorn', 'Frost', 'Void', 'Moon', 'Raven', 'Cinder', 'Gloom', 'Oath', 'Wolf', 'Sorrow', 'Star', 'Blood', 'Night', 'Pyre', 'Mire', 'Stone', 'Wyrm', 'Hex', 'Dawn'];
const RN2 = ['Ward', 'Fang', 'Song', 'Grasp', 'Veil', 'Brand', 'Mark', 'Howl', 'Bite', 'Crest', 'Reach', 'Shard', 'Vow', 'Bane', 'Knell', 'Spire', 'Call', 'Thirst', 'Edge', 'Whisper', 'Fall', 'Keeper', 'Wake', 'Render', 'Bloom', 'Toll', 'Gaze', 'Heart', 'Roar', 'Shade', 'Weaver', 'Rest'];
// every item is one of a kind: a seed decides its name, its picture and its history
const I_WEAR = ['Worn', 'Battered', 'Plain', 'Old', 'Notched', 'Scuffed', 'Trusty', 'Dented', 'Mended', 'Weathered', 'Rough', 'Salvaged', 'Faded', 'Chipped', 'Simple', 'Sound'];
const I_OF = ['the Fox', 'the Bear', 'the Owl', 'Embers', 'the Deep', 'Vigor', 'the Gale', 'Thorns', 'the Vigil', 'Ruin', 'the Hunt', 'Dusk', 'the Tide', 'Echoes', 'the Pyre', 'Winter', 'the Wolf', 'Grace', 'the Mire', 'Fury', 'the Stag', 'Omens', 'the Crow', 'Hunger', 'the Root', 'Patience', 'the Storm', 'Silence', 'the Forge', 'Stars', 'the Wake', 'Ash'];
const I_EPI = ['the Last Oath', 'Kingsbane', 'the Unquiet', 'Heart of the Hollow', 'the Long Night', 'Widowmaker', 'the First Flame', 'Gravecall', 'the Pale Promise', 'Stormfather', 'the Hungering', 'Dawnbreaker', 'the Silent Toll', 'Wyrmrest', 'the Red Hour', 'Oathkeeper', 'the Sundered', 'Nightfall', 'the Quiet End', 'Ashbringer', 'the Wandering', 'Rootmother\'s Gift', 'the Drowned', 'Starfall', 'the Unbowed', 'Cinderheart', 'the Thirteenth', 'Mournsong', 'the Bitter Vow', 'Deepcaller', 'the Forsworn', 'Lightless'];
const I_MAT = {
  metal: [['Iron', '#9aa0a8'], ['Steel', '#c3cad6'], ['Blacksteel', '#59606e'], ['Bronze', '#c08a4a'], ['Copper', '#cf7a50'], ['Brass', '#cdb055'], ['Silvered steel', '#dfe6ee'], ['Bluesteel', '#7f9cc8'], ['Bloodiron', '#a85248'], ['Verdigris bronze', '#6fa58e'], ['Obsidian', '#4a4458'], ['Moonsilver', '#c9d6f2'], ['Ashen iron', '#857f78'], ['Gilded steel', '#dcc070']],
  wood: [['Ash wood', '#b9976a'], ['Yew', '#a8703c'], ['Blackthorn', '#5a4636'], ['Bone', '#ddd4bc'], ['Ironwood', '#77685a'], ['Redwood', '#9c5038'], ['Pale birch', '#d2c4a2'], ['Bogwood', '#4f5a44'], ['Horn', '#c0a276'], ['Driftwood', '#a39a8a'], ['Ebony', '#463c44'], ['Elder oak', '#8a6a40']],
  leather: [['Tanned leather', '#a5713f'], ['Black leather', '#4f4640'], ['Boiled leather', '#7c4f30'], ['Wolfhide', '#8f887c'], ['Doeskin', '#cba878'], ['Scaled hide', '#5f8064'], ['Red leather', '#9a4636'], ['Ashen hide', '#aaa294'], ['Boarhide', '#6e5a48'], ['Oiled leather', '#5f4028']],
  cloth: [['Linen', '#d5cab2'], ['Wool', '#8c8f9c'], ['Silk', '#b494d6'], ['Velvet', '#8a3a56'], ['Homespun', '#a58e68'], ['Dyed cotton', '#4f86b4'], ['Mourning cloth', '#4c4856'], ['Sun-bleached cloth', '#e6dfc8'], ['Moss-dyed wool', '#6c8a50'], ['Saffron silk', '#dca83c']],
  jewel: [['Gold', '#e2bc50'], ['Silver', '#d2d8e2'], ['Rose gold', '#e2a084'], ['Electrum', '#d6d28c'], ['Blackened silver', '#727684'], ['Bronze', '#c08a4a'], ['Bone', '#ddd4bc'], ['Jade', '#78b890'], ['Platinum', '#e6eaf0'], ['Copper', '#cf7a50']]
};
const I_ACC = ['#e2bc50', '#d2d8e2', '#c08a4a', '#8c8f9c', '#5a4636', '#cf7a50', '#e6eaf0', '#4a4458'];
const I_GEM = [['garnet', '#e0483e'], ['sapphire', '#4a8cf0'], ['emerald', '#3ecf7a'], ['amethyst', '#b06af0'], ['topaz', '#f2c63a'], ['opal', '#bfeee6'], ['onyx', '#3c3a48'], ['amber', '#f09a2a'], ['moonstone', '#dfe8ff'], ['bloodstone', '#9a2238'], ['jade', '#74c08a'], ['pearl', '#f4efe2']];
const I_PLACE = ['Vharn', 'the Ashen Coast', 'Old Maren', 'the Sunken Abbey', 'Karrowmere', 'the Glass Wastes', 'Thornwick', 'Highcairn', 'the Salt Road', 'Durn Hollow', 'the Ember Reach', 'Low Saffel', 'the Drowned Quarter', 'Wintermarch', 'the Black Orchard', 'Ostrel', 'the Howling Stair', 'Greywater', 'the Bell Tombs', 'Cael Ruun', 'the Mirelands', 'Stagfall', 'the Lantern Hills', 'Nethermoor'];
const I_MAKER = ['the Ashen Guild', 'a nameless hermit', 'Brannoch the Younger', 'the Sisters of the Coil', 'a deserter of the Ninth', 'Old Wessa', 'the Lantern Monks', 'a blind smith', 'the Hollow Court', 'Ilde Farrow', 'the river folk', 'a condemned artisan', 'the Cinder Wardens', 'Master Orlec', 'a grave robber', 'the Tallow Company', 'Sera of the Marsh', 'the last of the Stag Lords', 'an apprentice in secret', 'the Pale Choir'];
const I_VERB = { metal: ['Forged', 'Hammered out', 'Cast', 'Tempered'], wood: ['Carved', 'Shaped', 'Cut', 'Whittled'], leather: ['Stitched', 'Cured', 'Cut and sewn', 'Tooled'], cloth: ['Woven', 'Sewn', 'Spun', 'Embroidered'], jewel: ['Cast', 'Wrought', 'Set', 'Engraved'] };
const I_NOTE = ['Still warm to the touch.', 'It hums faintly near water.', 'One edge is older than the rest.', 'A name has been scratched out.', 'It smells of woodsmoke.', 'Someone loved this once.', 'It has seen at least three owners.', 'The maker\'s mark is upside down.', 'Rain never seems to cling to it.', 'It is heavier than it looks.', 'It is lighter than it looks.', 'A tally of notches runs along it.', 'It was buried and dug up again.', 'A thread of silver runs through it.', 'It rings softly when struck.', 'Moths will not touch it.', 'It was won at dice.', 'The fit is strangely perfect.', 'There is old wax in the seams.', 'It was mended by a careful hand.', 'A prayer is etched where no one looks.', 'It was made in a hurry.', 'It was made over a whole winter.', 'The balance is a little off, on purpose.'];
const POWERS = {
  volley: { n: 'Splitshard', d: 'Projectile skills fire 2 additional projectiles.', s: { projExtra: 2 }, slots: ['weapon', 'gloves', 'ring'] },
  echo: { n: 'Twice-Told Oath', d: '25% chance for skills to cast a second time.', s: { echo: 25 }, slots: ['amulet', 'weapon', 'helm'] },
  storm: { n: 'Stormcaller\'s Due', d: 'Hits have a 20% chance to call a lightning strike.', s: { procLight: 20 }, slots: ['weapon', 'ring', 'gloves'] },
  blood: { n: 'Crimson Covenant', d: 'Leech 3% of damage as life. +30% damage below half life.', s: { leech: 3, lowLife: 30 }, slots: ['weapon', 'amulet', 'chest'] },
  pyre: { n: 'Pyrewake', d: 'Slain enemies explode in flames.', s: { boomFire: 1, fire: 20 }, slots: ['weapon', 'gloves', 'helm'] },
  rime: { n: 'Rimeheart', d: 'Slain enemies burst into freezing shards.', s: { boomCold: 1, cold: 20 }, slots: ['amulet', 'chest', 'ring'] },
  jugg: { n: 'Bulwark of Ages', d: '+40% armor and 12% damage reduction.', s: { armorPct: 40, dr: 12 }, slots: ['chest', 'helm', 'boots'] },
  wind: { n: 'Galeheel', d: '+22% movement speed and +15% cooldown reduction.', s: { ms: 22, cdr: 15 }, slots: ['boots', 'amulet'] },
  flood: { n: 'Worldbreaker', d: '+45% area of effect.', s: { area: 45 }, slots: ['weapon', 'amulet', 'gloves'] },
  cull: { n: 'Headsman\'s Verdict', d: 'Culls enemies below 12% life. +40% critical damage.', s: { cull: 12, critDmg: 40 }, slots: ['weapon', 'gloves', 'ring'] },
  luck: { n: 'Prospector\'s Folly', d: '+70% magic find and +100% gold find.', s: { mf: 70, gf: 100 }, slots: ['helm', 'boots', 'ring', 'amulet'] },
  phoenix: { n: 'Emberheart', d: 'Cheat death once every 60 seconds, restoring full life.', s: { cheat: 1, lifePct: 12 }, slots: ['chest', 'amulet', 'helm'] }
};

const SLOT_LV = [1, 1, 2, 4, 7, 12], SLOT_KEY = ['LMB', 'RMB', 'Q', 'W', 'E', 'R'];
const SKILLS = {
  cleave: { n: 'Cleave', lv: 1, i: '⚔', type: 'melee', el: 'phys', m: 1.0, range: 3.4, arc: 2.0, basic: 1, gen: 5, d: 'Sweep your weapon in a wide arc, striking every enemy in front of you.' },
  bash: { n: 'Bash', i: '⚒', type: 'melee', el: 'phys', m: 1.6, range: 3.3, arc: .9, basic: 1, gen: 9, lv: 2, d: 'A heavy blow on one target in front of you. Builds Fury quickly.' },
  stomp: { n: 'Frost Stomp', i: '❄', type: 'nova', el: 'cold', m: 1.2, cost: 10, cd: 8, r: 6, freeze: 2, ct: .3, lv: 8, d: 'Stomp the ground with frost, damaging nearby enemies and freezing them for 2 seconds.' },
  charge: { n: 'Furious Charge', i: '➤', type: 'dash', el: 'phys', m: 2.2, cd: 10, range: 14, land: 3.2, gen: 10, flat: 1, lv: 10, d: 'Rush forward in a straight line and smash into enemies where you stop.' },
  slam: { n: 'Ground Slam', lv: 1, i: '✹', type: 'nova', el: 'phys', m: 1.9, cost: 20, r: 5.2, ct: .45, d: 'Smash the ground, damaging all enemies around you.' },
  leap: { n: 'Leap', lv: 3, i: '⤴', type: 'dash', el: 'phys', m: 1.7, cd: 5, range: 12, land: 3.8, gen: 5, d: 'Leap to the target location and crash down on enemies there.' },
  warcry: { n: 'War Cry', lv: 6, i: '♛', type: 'buff', cd: 16, dur: 7, s: { dmg: 35, aspd: 20, ms: 15 }, gen: 0, d: 'Bellow a war cry: +35% damage, +20% attack speed and +15% movement speed for 7 seconds.' },
  whirl: { n: 'Whirlwind', lv: 5, i: '✪', type: 'spin', el: 'phys', m: .7, cost: 25, cd: 6, dur: 3, r: 3.8, tick: .2, d: 'Spin for 3 seconds, striking everything nearby. You can move while spinning.' },
  quake: { n: 'Earthshatter', lv: 12, i: '☄', type: 'rain', el: 'fire', m: 2.2, cd: 16, cost: 55, cnt: 9, spread: 7.5, r: 3.4, delay: .5, stagger: .1, d: 'Tear open the earth: nine molten eruptions burst around the target.' },
  firebolt: { n: 'Firebolt', i: '✦', type: 'proj', el: 'fire', m: 1.05, basic: 1, spd: 26, pr: .5, range: 16, d: 'Hurl a bolt of fire that ignites enemies.' },
  chain: { n: 'Chain Lightning', i: '⚡', type: 'chain', el: 'light', m: 1.35, cost: 12, jumps: 5, range: 15, ct: .38, d: 'A bolt of lightning that arcs between up to 6 enemies, shocking them.' },
  blink: { n: 'Blink', i: '✧', type: 'dash', blink: 1, cd: 4, range: 12, cost: 6, d: 'Teleport instantly to the target location.' },
  frost: { n: 'Frost Nova', i: '❄', type: 'nova', el: 'cold', m: 1.5, cost: 16, cd: 5, r: 6.8, freeze: 1.6, ct: .3, d: 'A ring of frost that damages and freezes nearby enemies.' },
  meteor: { n: 'Meteor', i: '☄', type: 'rain', el: 'fire', m: 4.4, cost: 26, cd: 6, cnt: 1, spread: 0, r: 4.8, delay: .8, fall: 1, d: 'Call down a meteor at the target location for massive fire damage.' },
  inferno: { n: 'Firestorm', i: '♨', type: 'rain', el: 'fire', m: 1.8, cost: 40, cd: 30, cnt: 24, spread: 10, r: 3, delay: .35, stagger: .11, fall: 1, d: 'Rain two dozen fireballs across a huge area.' },
  shot: { n: 'Quick Shot', i: '➶', type: 'proj', el: 'phys', m: 1.0, basic: 1, spd: 34, pr: .4, pierce: 1, range: 17, d: 'Loose an arrow that pierces one enemy.' },
  multi: { n: 'Multishot', i: '⋔', type: 'proj', el: 'phys', m: .85, cost: 10, cnt: 5, spread: .6, spd: 32, pr: .4, ct: .32, d: 'Fire a fan of five arrows.' },
  roll: { n: 'Evade', i: '↯', type: 'dash', cd: 3.5, range: 8.5, cost: 4, d: 'Dash a short distance, avoiding all damage.' },
  arrows: { n: 'Rain of Arrows', i: '⇊', type: 'rain', el: 'phys', m: .9, cost: 20, cd: 6, cnt: 14, spread: 4.6, r: 1.9, delay: .35, stagger: .07, d: 'Blanket an area with fourteen falling arrows.' },
  pierce: { n: 'Storm Bolt', i: '⚡', type: 'proj', el: 'light', m: 2.7, cost: 16, cd: 3, spd: 40, pierce: 99, pr: .9, ct: .4, d: 'A charged bolt that pierces every enemy in its path.' },
  volley: { n: 'Shadow Volley', i: '✺', type: 'barrage', el: 'cold', m: 1.15, cost: 35, cd: 26, cnt: 20, waves: 3, spd: 26, pr: .45, d: 'Three rings of freezing arrows burst outward from you.' }
};
Object.assign(SKILLS, {
  // Ranger
  shot: { n: 'Quick Shot', lv: 1, i: '➶', type: 'proj', el: 'phys', m: 1.0, basic: 1, gen: 5, spd: 36, pr: .4, pierce: 1, range: 16, arrow: 1, d: 'Loose a fast arrow that pierces one enemy.' },
  power: { n: 'Power Shot', lv: 2, i: '➹', type: 'proj', el: 'phys', m: 1.75, as: .62, basic: 1, gen: 10, spd: 42, pr: .5, pierce: 2, range: 17, arrow: 1, d: 'A slow, heavy shot that punches through several enemies.' },
  multi: { n: 'Multishot', lv: 1, i: '⋔', type: 'proj', el: 'phys', m: .85, cost: 24, cnt: 5, spread: .7, spd: 34, pr: .4, range: 15, ct: .32, arrow: 1, d: 'Fire a fan of five arrows.' },
  roll: { n: 'Vault', lv: 3, i: '↯', type: 'dash', el: 'phys', m: 0, cd: 4, range: 9.5, flat: 1, d: 'Tumble a short distance, avoiding all damage.' },
  arrows: { n: 'Rain of Arrows', lv: 5, i: '⇊', type: 'rain', el: 'phys', m: 0.62, cost: 25, cd: 7, cnt: 14, spread: 4.6, r: 1.9, delay: .35, stagger: .07, d: 'Blanket an area with fourteen falling arrows.' },
  mark: { n: "Hunter's Mark", lv: 6, i: '◎', type: 'buff', cd: 18, dur: 8, s: { crit: 20, critDmg: 40, aspd: 15 }, d: '+20% critical chance, +40% critical damage and +15% attack speed for 8 seconds.' },
  trap: { n: 'Frost Trap', lv: 8, i: '❄', type: 'nova', el: 'cold', m: 1.2, cost: 10, cd: 9, r: 5.5, freeze: 3, ct: .25, d: 'Spring a trap at your feet that freezes nearby enemies for 3 seconds.' },
  pierce: { n: 'Storm Bolt', lv: 10, i: '⚡', type: 'proj', el: 'light', m: 2.2, cost: 22, cd: 4, spd: 44, pierce: 99, pr: .9, range: 18, ct: .4, d: 'A charged bolt that pierces every enemy in its path.' },
  volley: { n: 'Shadow Volley', lv: 12, i: '✺', type: 'barrage', el: 'cold', m: 0.70, cost: 55, cd: 24, cnt: 18, waves: 3, spd: 26, pr: .45, range: 13, d: 'Three rings of freezing arrows burst outward from you.' },
  // Arcanist
  abolt: { n: 'Arcane Bolt', lv: 1, i: '✦', type: 'proj', el: 'arc', m: 1.0, basic: 1, gen: 4, spd: 28, pr: .5, range: 15, d: 'Hurl a bolt of raw arcane energy.' },
  shards: { n: 'Prism Shards', lv: 2, i: '⁂', type: 'proj', el: 'arc', m: .5, basic: 1, cnt: 3, spread: .4, spd: 30, pr: .4, range: 13, d: 'Three shards in a tight fan. Strong against packs.' },
  orb: { n: 'Arcane Orb', lv: 1, i: '◉', type: 'proj', el: 'arc', m: 2.4, cost: 30, spd: 13, pr: .9, range: 15, explode: 3.8, ct: .4, d: 'A slow orb that detonates on the first enemy it touches.' },
  tele: { n: 'Teleport', lv: 3, i: '✧', type: 'dash', blink: 1, el: 'arc', m: 0, cd: 4, range: 13, cost: 10, d: 'Teleport instantly to the target location.' },
  anova: { n: 'Arcane Nova', lv: 5, i: '✹', type: 'nova', el: 'arc', m: 1.7, cost: 28, r: 6.5, ct: .3, d: 'A burst of arcane force around you.' },
  prism: { n: 'Prismatic Ward', lv: 6, i: '⬡', type: 'buff', cd: 18, dur: 8, s: { dr: 25, resAll: 20, area: 20 }, d: '25% damage reduction, +20% all resistances and +20% area for 8 seconds.' },
  ray: { n: 'Disintegrate', lv: 8, i: '⟶', type: 'proj', el: 'arc', m: 2.3, cost: 22, cd: 2, spd: 60, pierce: 99, pr: .7, range: 20, ct: .3, d: 'A searing beam that pierces everything in a line.' },
  torrent: { n: 'Arcane Torrent', lv: 10, i: '✺', type: 'barrage', el: 'arc', m: 0.60, cost: 35, cd: 11, cnt: 14, waves: 2, spd: 24, pr: .45, range: 12, d: 'Two rings of arcane missiles burst outward from you.' },
  hole: { n: 'Singularity', lv: 12, i: '●', type: 'rain', el: 'arc', m: 5, cost: 50, cd: 16, cnt: 1, spread: 0, r: 6, delay: 1, freeze: 2, d: 'Tear a hole in space at the target. After a moment it collapses for massive damage.' },
  // Brawler
  punch: { n: 'Punch', lv: 1, i: '✊', type: 'melee', el: 'phys', m: 1, as: 1, range: 2.6, arc: 1.3, basic: 1, gen: 4, d: 'Bare fists. What you fall back on with no weapon in hand.' },
  jab: { n: 'Jab', lv: 1, i: '✊', type: 'melee', el: 'phys', m: 1.05, as: 1.4, range: 2.9, arc: 1.3, basic: 1, gen: 6, d: 'Lightning-fast punches. Builds Spirit.' },
  hook: { n: 'Heavy Hook', lv: 2, i: '⚒', type: 'melee', el: 'phys', m: 1.5, as: .9, range: 3.1, arc: 1.0, basic: 1, gen: 12, d: 'A slower, crushing blow that builds Spirit quickly.' },
  sweep: { n: 'Sweeping Kick', lv: 1, i: '✹', type: 'nova', el: 'phys', m: 1.6, cost: 18, r: 4.6, ct: .3, d: 'Spin low and kick every enemy around you.' },
  dstrike: { n: 'Dashing Strike', lv: 3, i: '➤', type: 'dash', el: 'phys', m: 1.6, cd: 3, range: 12, land: 2.8, gen: 8, flat: 1, d: 'Dash in a line and strike where you stop.' },
  cyclone: { n: 'Cyclone Kick', lv: 5, i: '✪', type: 'spin', el: 'phys', m: .6, cost: 25, cd: 5, dur: 2, r: 3.4, tick: .15, d: 'A whirling flurry of kicks for 2 seconds. You can move while spinning.' },
  iron: { n: 'Iron Skin', lv: 6, i: '⬢', type: 'buff', cd: 14, dur: 6, s: { dr: 30, armorPct: 40, lifeRegen: 6 }, d: '30% damage reduction, +40% armor and faster healing for 6 seconds.' },
  palm: { n: 'Burning Palm', lv: 8, i: '✋', type: 'melee', el: 'fire', m: 2.6, cost: 20, cd: 4, range: 3.4, arc: 1.5, d: 'A flaming palm strike that sets enemies alight.' },
  wave: { n: 'Wave of Force', lv: 10, i: '≋', type: 'proj', el: 'phys', m: 2.2, cost: 30, cd: 6, spd: 22, pierce: 99, pr: 1.4, range: 10, ct: .35, d: 'A wide shockwave that rolls through everything in front of you.' },
  seven: { n: 'Seven-Sided Strike', lv: 12, i: '✵', type: 'rain', el: 'phys', m: 2.6, cost: 45, cd: 13, cnt: 7, spread: 3.5, r: 2.4, delay: .15, stagger: .12, d: 'Seven blinding strikes land around the target.' },
  // Elementalist
  firebolt: { n: 'Firebolt', lv: 1, i: '✦', type: 'proj', el: 'fire', m: 1.05, basic: 1, gen: 4, spd: 27, pr: .5, range: 15, d: 'Hurl a bolt of fire that sets enemies alight.' },
  spark: { n: 'Shock Pulse', lv: 2, i: '⚡', type: 'proj', el: 'light', m: .5, basic: 1, cnt: 3, spread: .5, spd: 24, pr: .4, range: 10, d: 'Three crackling sparks at short range.' },
  frost: { n: 'Frost Nova', lv: 1, i: '❄', type: 'nova', el: 'cold', m: 1.4, cost: 22, cd: 5, r: 6.5, freeze: 1.8, ct: .3, d: 'A ring of frost that damages and freezes nearby enemies.' },
  fdash: { n: 'Flame Dash', lv: 3, i: '➤', type: 'dash', el: 'fire', m: 1.2, cd: 4, range: 11, land: 3, cost: 8, flat: 1, d: 'Streak forward in a burst of flame, burning enemies where you stop.' },
  chain: { n: 'Chain Lightning', lv: 5, i: '⚡', type: 'chain', el: 'light', m: 1.35, cost: 18, jumps: 5, range: 15, ct: .35, d: 'Lightning that arcs between up to six enemies.' },
  mshield: { n: 'Molten Shield', lv: 6, i: '♨', type: 'buff', cd: 12, dur: 8, s: { dr: 25, fire: 30, thorns: 12 }, d: '25% damage reduction, +30% fire damage and burning thorns for 8 seconds.' },
  meteor: { n: 'Meteor', lv: 8, i: '☄', type: 'rain', el: 'fire', m: 4.4, cost: 40, cd: 5, cnt: 1, spread: 0, r: 4.8, delay: .8, fall: 1, d: 'Call down a meteor for massive fire damage.' },
  blizz: { n: 'Blizzard', lv: 10, i: '❅', type: 'rain', el: 'cold', m: 0.75, cost: 35, cd: 8, cnt: 16, spread: 6, r: 2.4, delay: .3, stagger: .12, d: 'Sixteen shards of ice hammer an area, chilling everything.' },
  inferno: { n: 'Firestorm', lv: 12, i: '♨', type: 'rain', el: 'fire', m: 1.4, cost: 60, cd: 26, cnt: 22, spread: 10, r: 3, delay: .35, stagger: .11, fall: 1, d: 'Rain two dozen fireballs across a huge area.' }
});
const CLASSES = {
  warden: { n: 'Warden', tag: 'Melee', d: 'Sword and shield. Wades into the horde and builds Fury with every swing.', life: 130, lifeLv: 17, armor: 4, ms: 8.6, regen: 1.6, res: { n: 'Fury', max: 100, decay: 9, c: 'radial-gradient(circle at 35% 30%,#ffd070,#e07a14 55%,#7a3204)' }, wts: ['sword', 'axe', 'maul'], w: 'Sword', skills: ['cleave', 'bash', 'slam', 'leap', 'whirl', 'warcry', 'stomp', 'charge', 'quake'] },
  ranger: { n: 'Ranger', tag: 'Bow', d: 'A swift archer who kites and shreds enemies from range.', life: 100, lifeLv: 13, armor: 2.5, ms: 9.4, regen: 1.1, res: { n: 'Focus', max: 100, regen: 5, c: 'radial-gradient(circle at 35% 30%,#b8ff9a,#3aa02a 55%,#12480e)' }, wts: ['bow'], w: 'Longbow', skills: ['shot', 'power', 'multi', 'roll', 'arrows', 'mark', 'trap', 'pierce', 'volley'] },
  arcanist: { n: 'Arcanist', tag: 'Arcane', d: 'Bends raw arcane power: orbs, beams and teleports. Power refills fast.', life: 85, lifeLv: 11, armor: 1.5, ms: 8.6, regen: .8, res: { n: 'Arcane Power', max: 100, regen: 7, c: 'radial-gradient(circle at 35% 30%,#e0b8ff,#8a3ae0 55%,#34106a)' }, wts: ['staff'], w: 'Wand', skills: ['abolt', 'shards', 'orb', 'tele', 'anova', 'prism', 'ray', 'torrent', 'hole'] },
  brawler: { n: 'Brawler', tag: 'Physical', d: 'Bare-knuckle martial artist. Very fast strikes, dashes and kicks; builds Spirit.', life: 115, lifeLv: 15, armor: 3, ms: 9.6, regen: 1.8, res: { n: 'Spirit', max: 100, decay: 4, c: 'radial-gradient(circle at 35% 30%,#fff4b0,#d0b020 55%,#6a5606)' }, wts: ['fist'], w: 'Cestus', skills: ['jab', 'hook', 'sweep', 'dstrike', 'cyclone', 'iron', 'palm', 'wave', 'seven'] },
  elementalist: { n: 'Elementalist', tag: 'Spell caster', d: 'Commands fire, frost and lightning. Fragile, but erases whole packs.', life: 100, lifeLv: 13, armor: 2.2, ms: 9.2, regen: 1.2, res: { n: 'Mana', max: 120, regen: 6, c: 'radial-gradient(circle at 35% 30%,#9ac8ff,#2a5ae0 55%,#0c1e6a)' }, wts: ['staff'], w: 'Staff', skills: ['firebolt', 'spark', 'frost', 'fdash', 'chain', 'mshield', 'meteor', 'blizz', 'inferno'] }
};
// Owner settings: paste your Ko-fi page link and a feedback address here and the buttons appear in the menu.
const TIP_URL = 'https://ko-fi.com/ezpzlrc', FEEDBACK_EMAIL = 'lee.campbell1@gmail.com', FEEDBACK_URL = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent('OathByte feedback');
const MAX_UP = 5;
// Sprint 1: monster life for a party of n heroes; climbs to about 1.7x at four or more (a full group). The server still uses partyK (TODO server side).
function partyHpK(n) { return 1 + .7 * Math.min(3, Math.max(0, (n | 0) - 1)) / 3; }
// The world changes as you go down: a new region every two floors.
function zoneFor(depth) { if ((depth | 0) === 9 && typeof HEART !== 'undefined') return HEART; /* build 0074: floor 10 is the Heart of Cinders, where the story ends */ return ZONES[Math.floor(Math.max(0, depth | 0) / 2) % ZONES.length]; }
// First steps: a short checklist that teaches the game by doing.
const GOALS = [['kill', 'Defeat 5 monsters'], ['skill', 'Use a skill'], ['equip', 'Equip an item you found'], ['town', 'Visit town'], ['boss', 'Slay the guardian of this floor']];
// Skill choices: at each of these levels the hero must pick one skill out of two. Picks can be swapped for free in town.
const TIER_LV = [1, 3, 6, 10];
// Simple skills: every class has a fixed kit of three damage skills on top of its basic attack. They unlock by themselves at levels 1, 3 and 6.
const KIT = { warden: ['slam', 'stomp', 'quake'], ranger: ['multi', 'arrows', 'volley'], arcanist: ['orb', 'anova', 'torrent'], brawler: ['sweep', 'palm', 'wave'], elementalist: ['frost', 'chain', 'meteor'] }, KIT_LV = [1, 3, 6];
function skillTiers(cls) { return []; }
function skillTiersOld(cls) { const s = CLASSES[cls].skills.filter(id => !SKILLS[id].basic).sort((a, b) => SKILLS[a].lv - SKILLS[b].lv), out = []; for (let i = 0; i + 1 < s.length && out.length < TIER_LV.length; i += 2) out.push([s[i], s[i + 1]]); return out; }
const CLASS_IDS = Object.keys(CLASSES);
const NEWS = ['Build 0095: boss fights get their own music. When a guardian or the world boss wakes near you, a faster, heavier battle theme with drums, brass and a low choir fades in, speeds up again when the boss is enraged, and fades back when the fight is over. Also, steering with the arrow keys, a left click now attacks or casts at the cursor while you keep walking.', 'Build 0094: the title screen logo comes alive. When the sword lands, forge heat sweeps across the letters with a spray of sparks, then the logo floats gently with a soft glow, drifting embers and a glint on the crossguard.', 'Build 0093: walk and attack at the same time. Every hero keeps moving at full speed through attacks and skills instead of stopping for each swing, and keeps facing the target while the legs run. Shift-click still attacks in place.', 'Build 0092: see who is playing. Hover the players online count on the title screen, or tap it on a phone, to see the names of the heroes online right now.', 'Build 0091: livelier hero picks on the title screen. The heroes pop in one by one, bob and glint while they wait, and the one you pick lifts, flashes its colour and sends out a ring. Screenshots now open larger when you click or tap them.', 'Build 0090: fairer item arrows. Every stat on an item now counts when it is compared with what you wear: magic find, gold find, experience, life regen, life on hit and thorns used to count for nothing, which hurt Mythics most. Elemental damage counts for every skill on your bar, and skill buffs no longer change the arrows. The tooltip also shows Finding. The sound button is gone from the game screen: switch sound in Settings, or press M.', 'Build 0089: boss fights are more interesting. Every guardian has two signature moves of its own, marked on the ground about a second before they land so you can dodge them. At half life a guardian enrages: it adds its second move and attacks faster. Bosses now use their big moves up close too. The Deepfire Colossus gets tougher with each player online: half again more life and a tenth more damage per extra player. Loot and XP are unchanged.', 'Build 0088: one click on your pet sends up to 8 unlocked down-arrow items to town. With Auto-sell on it sells them for gold as before; switch Auto-sell off (next to Send pet in your bag) and it puts them in your stash instead.', 'Build 0087: AI teammates are gone. No AI heroes join your party any more, and the Watchtower, which only made them stronger, is off the Town Planner.', 'Build 0086: no more flash of the old graphics when the game starts. The world and hero models now load on the title screen, and Play waits a moment for them if needed.', 'Build 0085: you can now switch talents. Tap a card to switch it on, tap it again to switch it off, or tap another card in the row to swap. Switching is free any time no enemies are near.', 'Build 0084: the hay cart in Emberwatch no longer stands inside the Trader\'s tent. It sits on the grass beside the stall.', 'Build 0083: fixed the title screen staying on top after you press Play, which left the game stuck on "Connecting to the server".', 'Build 0082: on phones all five heroes fit in one row on the title screen, with each name inside its portrait.', 'Build 0081: the title screen is centered, with the logo, your name, the Play button and the heroes in one column.', 'Build 0080: the players-online count on the title screen is no longer hidden under the sound button.', 'Build 0079: a new title screen with full key art, hero portraits, screenshots and quick links.', 'Build 0078: playable links. Tap Share or Invite and send the link: your friend taps Join and drops in right beside you, even deep in a floor. The link shows who sent it in chat apps.', 'Build 0077: the name is now spelled OathByte, with a capital B.', 'Build 0076: a new look. The Sworn Blade title logo, a steel and crimson theme, new frames and buttons, and new icons. The sound button now sits beside the minimap instead of over its corner.', 'Build 0075: the world boss. Every kill by every player fills one shared count; when it is full the Deepfire Colossus rises for everyone, and landing a hit on it earns a Mythic.', 'Longer story acts, a bolder quest path with a gold beam where it leads, epic new music, and your pet can run items to town and sell them.', 'Parties stay in step: you see each other in town, and the gate counts down instead of asking.', 'OathByte: the game has a new name. Monster life now follows the floor, not your gear, so every upgrade shows at once: plain gear takes about 4 hits, rare gear about 2. Slay a guardian to unlock Hard, then Torment 1 to 4, picked at the town portal: tougher monsters, more gold and better Legendary odds, same XP. And talent cards: every 5 levels pick one of three cards that change a skill or your hero, swap them free in town', 'Story Act III, The Unmaking: through the Voidscar to the Heart of Cinders on floor 10, where Vaeloth fights in three phases. Teammates hunt down monsters that shoot at you, potions heal at once and show how much, the Trader is cheaper while you are new, your first item comes to you, and the right-hand panels no longer overlap. A speaker button in the top-right corner (or the M key) mutes all sound and remembers it, the build label says how long ago the game was updated, and the server now refuses impossible hits, forged gifts and message floods', 'Safer first floors and boss intros, a safe respawn away from the boss, Enter to rise again, town services named on the map with a first walk round Emberwatch, a remembered Solo tick, party kills that always pay XP, and a steady players-online count', 'Click to move now walks around trees, walls and stalls, and the road to each guardian is wider', 'Reconnects no longer hang: you come back on the same floor, same spot, or play solo', 'Story Act II, The Burning: hunt his two generals and free Maren from the ice', 'Build 0068: the story begins. Act I, The Blight: the dead are rising from the Blighted Hollow, and every guardian carries the same burning mark. Follow it with Old Hesta and Captain Roek to Vaeloth, the Cinder Prophet. Heroes already deep in get the story so far.', 'Build 0067: the portrait in the top left is now your real hero, drawn up close by the game itself in the same armor, colors and face you see in play.', 'Build 0066: heroes move with weight. Leap is a real jump with a heavy landing, Furious Charge is a flat-out sprint, sword and axe heroes hold a guard stance after a fight, spells gather power before they fly, and a swing from standing drives the whole body.', 'Build 0065: monsters die by their region. As a body sinks it breaks apart: the crypt dead crumble to bone dust and leave scattered bones, forest creatures burst into rot spores, lava monsters fall to glowing ash, ice monsters shatter into shards, and void monsters fold inward in a violet flash. A faint soul wisp drifts up, and the remains lie on the floor for a few seconds before they sink away.', 'Build 0064: hits land harder. Sparks and the monster\'s ichor now spray out the far side of every blow, heavy hits and crits leave a small splash on the floor, crits and heavy swings flash a bright star, fire hits throw off embers and heavy cold hits crack ice shards out of the ground.', 'Build 0063: loot looks the part. Items now fly out of a monster in an arc, tumble, bounce and land with a flash in their rarity colour. Loot beams are brighter with a white-hot core, rare and better items have motes drifting up the beam, and legendary and mythic drops get a turning rune circle. Gold lands as a little heap of coins that glints. The gate back to the previous floor is now a low waystone circle just above where you arrive, so it never hides your hero.', 'Build 0062: playtest fixes. Guardians last longer and hit much harder, and teammates can no longer carry the fight. Green upgrade arrows are right on trade-off items. Trees fade when they stand between you and your hero. Big spell flashes dim so enemy danger shapes stay visible. A server update now keeps you on your floor. First Steps only ticks for your own kills and skills, and its popups take turns. No more one-hit kills from burn or thorns. No false bag full with two-slot items. Monsters stuck behind walls doze off and stop blocking the trip to town. The gate back to the previous floor now stands where you arrive, and the town portal names the floor you came from.', 'Build 0061: frozen regions get real ice. The blue tubes on the walls are now clusters of faceted ice crystal shards, the walls are frosted stone with rime creeping up from the floor, and the snow on top is softer so the fight stands out.', 'Build 0060: the deep regions get their own stone. Lava walls are scorched black basalt with magma glowing in the joints and cracks near the floor, and void walls are polished obsidian slabs laced with faint violet veins. Both have heavy cap stones, plinths and jagged crowns.', 'Build 0059: fixes the game failing to start on build 0058.', 'Build 0058: guardians on real models. The Warden of Bones and the Ashen Tyrant are towering knights in plate with horned helms and greatswords, and the shrouded guardians are hooded casters hovering over a tattered shroud.', 'Build 0057: spells look like their element. Fire bolts are licking flame that sheds embers and smoke, frost is a spinning ice shard that leaves ice spikes where it lands, lightning crackles with live arcs, and arcane magic spins sparks around a violet core. Monster shots get a hot core and a trail too', 'Build 0056: crypt walls rebuilt in real stone. Coursed blocks with sunken mortar, bevelled edges, cracks, grime and damp moss, with dark rough cap stones on top so the fight stands out', 'Build 0055: monsters on real models. Hunched risen dead, hulking brutes and hooded cultists with glowing eyes, each with real walk, attack, hit and death animations', 'Build 0054: teammates with jobs. Your tank taunts nearby monsters so they swing at it instead of you, your healer mends you when you drop below 70% life with a bigger heal below 40%, and teammates now wear monsters down without stealing the kill, so the killing blows are yours', 'Build 0053: boss moments. When a boss wakes, the camera swings to it with cinema bars and the world slows while its name slams in. The boss bar has a frame, quarter marks, a percent and a pale trail that shows each chunk of damage. The final blow lands in slow motion with a flash and a deep boom', 'Build 0052: lighting. In crypts and the void your torch now throws real shadows that spread out from you, wall torches light the stone around them, all fire flickers like real flame, and lamps, torches and spells glow in the mist around them', 'Build 0051: real sound. Recorded hits, crits, kills, coins and footsteps, a deep boom for elites and bosses, and fight music that fades in when a fight starts and grows louder as it gets bigger', 'Hits have weight: every hit makes a monster flinch and lean back, heavy blows and crits shove it across the ground, a heavy blow or crit breaks a monster\'s wind-up and wipes its marked attack (Staggered!), and kills go flying away from you and tumble to the ground. Bosses stand their ground. Kills, drops and XP are unchanged.', 'Fixed: the error banner at the top of the screen that the new ground markers caused in build 0048.', 'Real threats: monsters now mark their heavy blows on the ground before they land. Grunts swing in a cone, brutes send a shockwave down a line, casters charge a beam, and guardians breathe in a wide cone, slam a cross onto you or fire rays all around. The shape fills up, flashes, then hits hard, so step out or dodge. Phones get a dodge button next to the skills. Kills, drops and XP are unchanged.', 'Sharper buttons and icons: every skill, potion and menu button now has a crisp, high-res painted icon on forged iron and ember frames, and they stay sharp on any screen. Badges now live only in their own Badges window, which phones can open too.', 'The town is rebuilt from real models: a two-storey inn, stone and timber cottages with lit windows and smoking chimneys, a smithy, fences, wagons, barrels and benches. Forest floors grow real trees, bushes, ferns, rocks and mushrooms. The portal at the end of each floor is now a stone Gothic arch around a swirling ember gate that hums when you are near; click or tap it to go straight to the next floor. Salvage all now takes Legendary and Mythic items too, and a new Lock button keeps any item you want safe from it.', 'Loot is scarcer, so every drop matters more: fewer grey and blue items, a legendary about every 2 to 3 floors', 'Fixed: a brand-new hero always starts on floor 1 with level 1 monsters', 'New in town: a Training Dummy that shows your damage per second', 'Badges button: click a badge to see what you did to earn it', 'Green arrow = better overall, red = not better, in your bag and at the Trader', 'Treasure Goblins glow on the minimap, with a gold arrow pointing to them', 'Guardian loot lands away from the gate, so nothing gets left behind', 'Music changes with each area and keeps evolving; the bottom bar has a 3D look and the XP bar fills smoothly', 'New floors: grass, bare earth, cracked flagstones and ash now blend softly into each other with no repeating pattern, crypts are paved in worn stone, and glowing cracks run through the ash in the deep regions.', 'Real models are on for everyone: every hero, teammate, townsperson and the merchant now uses the new 3D models. If your device can\'t load them, the classic look is drawn instead.', 'Real models for everyone in the test: all five heroes, your teammates, the townsfolk and the merchant now share one look and one set of animations.', 'New Ranger test: he now stands as tall as the other heroes and his outfit is brighter, so he reads clearly from the game camera.', 'Getting the new Ranger ready for everyone: the test version now says on screen whether his model loaded on your device, and why not if it didn\'t.', 'Real heroes, starting with the Ranger: the Ranger is now a fully animated 3D character (free CC0 art by Quaternius) with a hooded outfit, a real face, leather boots and bracers, and proper run, draw, loose, dodge-roll and fall animations; the other four heroes follow in the next builds', 'Gear shapes: plate shoulders have layered plates down the arm, plate chests add a chainmail skirt and steel tassets that swing as you walk, cloth helms are now deep hoods draped over the shoulders, rare and better gear carries glowing runes, and heroes wearing legendaries give off a soft glow', 'Smoother heroes: one sculpted chest and waist, shaped arms and legs with real muscle, and a head with jaw, chin and cheekbones replace the old stacked blocks', 'Invite a friend: the Invite button on the top bar sends a link with your name on it, and your friend lands straight in your party when they press Play', 'Badges on the leaderboard now say what you did to earn them: hover on PC, tap on phone', 'Real materials on every hero: cloth shows its weave and folds, leather its grain and worn patches, steel is brushed, scratched and reflects the room, and skin and hair catch light softly (Medium and High graphics)', 'Bigger items in your bag and the shops, with an Item size setting (Normal, Large or Extra large) in Settings', 'Real danger: monsters hit harder on every floor you go down, champions wind up heavy blows marked by red circles on the ground, and your screen pulses red when your life runs low. Kills, drops and XP are unchanged', 'AI teammates: up to three AI heroes join your party so you never play alone, and one steps aside for each real player who joins you (turn them off in Settings)', 'Every hero has their own theme music on the selection screen, and heroes now have fingers and patterned outfits', 'Upgrade arrows now count unique effects, weighed for the skills on your bar', 'Items look real now: brushed metal, wood grain, leather, cloth and cut gems, on the ground too', 'Your hero now carries over to new builds: no more resets', 'Space is now a dodge roll on PC (E or F to use and pick up)', 'Grow Emberwatch: spend gold and shards at the Town Planner in the plaza on six projects, each with three levels and a lasting bonus'];
// achievements (build 0020): badges that show next to your name in chat. They reset with each build, like heroes.
const ACH = [
  ['blood', '⚔', 'First Blood', 'Defeat your first monster', h => h.kills >= 1],
  ['slayer', '♜', 'Guardian Slayer', 'Defeat a floor guardian', h => h.runs >= 1],
  ['f5', '▼', 'Delver', 'Reach floor 5', h => (h.depth || 0) + 1 >= 5],
  ['f10', '◆', 'Deep Diver', 'Reach floor 10', h => (h.depth || 0) + 1 >= 10],
  ['f20', '✦', 'Abyss Walker', 'Reach floor 20', h => (h.depth || 0) + 1 >= 20],
  ['l10', '★', 'Seasoned', 'Reach level 10', h => h.level >= 10],
  ['l30', '✪', 'Veteran', 'Reach level 30', h => h.level >= 30],
  ['leg', '♛', 'Golden Find', 'Find a Legendary item', h => !!h.f3],
  ['myth', '❖', 'Mythic Find', 'Find a Mythic item', h => !!h.f4],
  ['streak', '☄', 'Unstoppable', 'Reach a 50 kill streak', h => (h.best || 0) >= 50],
];
// townsfolk of Emberwatch and their quests (build 0020): talk to them in town, go out into the world, come home for a reward
const FOLK = {
  bram: { n: 'Bram the Miller', look: 'vil1', at: [-2.8, -15.4], hair: 0x8a8070, beard: 1 },
  hesta: { n: 'Old Hesta', look: 'vil2', at: [-14.2, 3.4], hair: 0xd8d4cc },
  lysa: { n: 'Lysa the Innkeeper', look: 'vil3', at: [-8.0, -10.6], hair: 0xa8502a },
  doran: { n: 'Doran the Smith', look: 'vil4', at: [9.0, -11.8], hair: 0x1a1410, beard: 1 },
  roek: { n: 'Captain Roek', look: 'vil5', at: [-2.6, 12.0], hair: 0x3a2a1a, guard: 1 },
};
const QUESTS = [
  { id: 'grain', by: 'bram', t: 'The Stolen Grain', ask: 'Raiders from the Hollow smashed my mill cart and ran off with the grain. Monsters out there carry the sacks now. Bring me 6 Sacks of Grain and the mill turns again.', goal: { k: 'collect', n: 6, item: 'Sack of Grain', c: 0xe0c070, p: .22 }, thanks: 'My grain! Listen to that, the sails are turning again. Emberwatch eats tonight, thanks to you.', gold: 1, rar: 2 },
  { id: 'herbs', by: 'hesta', t: 'Glowcaps for the Fever', ask: 'A fever is spreading through the town, dear. Glowcaps sprout where monsters fall in the wilds. Gather 5 for my brew, would you?', goal: { k: 'collect', n: 5, item: 'Glowcap', c: 0x8affc0, p: .18 }, thanks: 'Lovely, still glowing. The fever will break by morning. Look, my garden is blooming again too.', gold: 1.2, rar: 2 },
  { id: 'pip', by: 'lysa', t: 'Lost in the Wilds', ask: 'My boy Pip chased a fox through the gate and never came back! He is out on the next floor somewhere. Please find him and send him home.', goal: { k: 'rescue', n: 1, item: 'Pip' }, thanks: 'Pip! Oh, you silly boy. Thank you, hero. Your meals at the inn are on the house, forever.', gold: 1.5, rar: 3 },
  { id: 'steel', by: 'doran', t: 'Champion Steel', ask: 'The champions out there, the ones with names over their heads, carry the finest iron. Beat 4 of them and bring me their steel. I will forge you something proper.', goal: { k: 'elite', n: 4, item: 'Champion steel' }, thanks: 'Now that is steel. Hear the forge roar? Take this, fresh from the anvil.', gold: 1.8, rar: 3 },
  { id: 'siege', by: 'roek', t: 'Break the Siege', ask: 'A guardian down in the deep keeps sending raiders at our walls. Slay a floor guardian and Emberwatch can finally sleep.', goal: { k: 'boss', n: 1, item: 'Guardian slain' }, thanks: 'The raids have stopped! Tonight we hang the lanterns and celebrate, and you are the guest of honour.', gold: 2.5, rar: 3 },
  // chapter 2 (build 0021): jobs from deeper down; the town keeps growing
  { id: 'lily', by: 'bram', ch: 2, t: 'Frost Lilies for the Fields', ask: 'The soil is tired, hero. Frost Lilies, the kind that only grow from floor 4 down, would wake it up. Bring me 6 and the fields will bloom all year.', goal: { k: 'collect', n: 6, item: 'Frost Lily', c: 0xbfe8ff, p: .2, min: 4 }, thanks: 'Look at them glow! Planted round the well, they will keep the frost off the whole square.', gold: 3, rar: 3 },
  { id: 'brew', by: 'hesta', ch: 2, t: 'The Witch\'s Brew', ask: 'Those spell-casting monsters out there are brewing something foul, dear. Put down 12 of the casters before their magic reaches our wells.', goal: { k: 'arch', arch: 'caster', n: 12, item: 'Casters defeated' }, thanks: 'Their magic is broken. I have a little of my own for you, too.', gold: 3.2, rar: 3 },
  { id: 'feast', by: 'lysa', ch: 2, t: 'A Feast for Emberwatch', ask: 'We are throwing a feast for the town, and the larder is empty! Monsters out there carry good meat. Bring me 10 Hams.', goal: { k: 'collect', n: 10, item: 'Ham', c: 0xe08a6a, p: .22 }, thanks: 'A feast fit for a king! Come and sit at the long tables whenever you like.', gold: 3.4, rar: 3 },
  { id: 'magma', by: 'doran', ch: 2, t: 'Heart of the Mountain', ask: 'The guardians deep down carry hearts of living fire. Slay a guardian on floor 5 or deeper and I will have fire for a hundred years of forging.', goal: { k: 'boss', n: 1, min: 5, item: 'Deep guardian slain' }, thanks: 'Feel that heat! The forge has never burned so hot. Here, the first thing it made is yours.', gold: 4, rar: 3 },
  { id: 'deep', by: 'roek', ch: 2, t: 'Into the Deep', ask: 'No one from Emberwatch has ever seen floor 10. Get there, and the town will raise a statue in your honour.', goal: { k: 'floor', n: 10, item: 'Deepest floor' }, thanks: 'Floor 10! They are already carving your statue by the gate. Emberwatch will never forget you.', gold: 5, rar: 3 },
];
// build 0068: the story campaign (Lee, Nov 15). Vaeloth, the Cinder Prophet, was once the priest of Emberwatch. He tore open the Voidscar to wake a dead fire god sleeping under the world, and every guardian serves him.
// Each act is a list of steps: k 'boss' is the guardian of floor d, k 'talk' is a townsfolk in Emberwatch. open: lines when the step starts, done: lines when a guardian falls, lines: what a townsfolk says, recap: one line for heroes who were already past it.
// build 0075 (Lee, Nov 15: the acts need to be longer): each act now covers four floors and about twice as many steps, and every guardian step sits on the floor that guardian is really on.
// New step kind: k 'hunt' asks for n kills on floor d or deeper (el: 1 counts champions and guardians only). Hunts count the whole party's kills and never block the way forward.
const STORY_V = 2; // bump when steps are added or moved: heroes are put back at the right place for the floors they have cleared, with the story so far
const STORY = [
  { n: "Act I", t: "The Blight", sub: "The dead will not stay buried", steps: [
    { id: "a1h1", k: "hunt", d: 1, n: 25, goal: "Cut down 25 of the risen dead in the Blighted Hollow",
      open: [["Captain Roek", "Hero! The dead are crawling out of the Blighted Hollow faster than we can burn them. Something down there is waking them."], ["Captain Roek", "Thin them out first. Then find the great tree at the heart of the Hollow. It has turned, and I want to know what turned it."]],
      recap: "You cut a path through the risen dead of the Blighted Hollow." },
    { id: "a1s1", k: "boss", d: 1, goal: "Slay the Rootmother, guardian of the Blighted Hollow",
      done: [["", "As the Rootmother falls, a sigil burns out of her heartwood: an eye inside a crown of fire."], ["", "Someone carved it there. Someone wanted her to wake. Old Hesta in Emberwatch knows the old signs."]],
      recap: "The Rootmother of the Blighted Hollow fell, and a sigil burned out of her heart: an eye inside a crown of fire." },
    { id: "a1s2", k: "talk", by: "hesta", goal: "Show the burning sigil to Old Hesta in Emberwatch",
      lines: [["Old Hesta", "Let me see that, dear. Oh. Oh, no. I have not seen this mark in ten years."], ["Old Hesta", "It belonged to Vaeloth, our old priest at the ember chapel. One night he went down into the catacombs with a lantern and a book, and he never came back."], ["Old Hesta", "If his mark is on the dead, then he is not dead himself. And the cut is fresh. Somebody was in the Hollow this week. Ask Bram: his mill looks right down on it."]],
      recap: "Old Hesta knew the mark. It belonged to Vaeloth, the town priest who went down into the catacombs ten years ago and never came back." },
    { id: "a1t2", k: "talk", by: "bram", goal: "Ask Bram the Miller who has been in the Hollow",
      lines: [["Bram the Miller", "In the Hollow? Only a fool goes in there now. A fool, and my apprentice."], ["Bram the Miller", "Tobin took the cart out two days ago to cut timber on the far side. The cart came back on its own. The horse was white with fear."], ["Bram the Miller", "He is a good lad. If he is alive he is deep in, past the great tree. Find him, hero. I will owe you more than flour."]],
      recap: "Bram the Miller's apprentice, Tobin, had gone missing deep in the Hollow." },
    { id: "a1r1", k: "rescue", d: 2, who: "Tobin", c: [0xc8e070, 0x9adf5a], goal: "Find Tobin, lost in the deep Hollow",
      lines: [["Tobin", "Is it gone? The man in the grey robe. Tell me he is gone."], ["Tobin", "He walked right through the dead and they bowed to him. He put his hand on the old beast, Thornhide, and it burned. The same eye. Then the roots took me."], ["Tobin", "He said the Hollow was only the first door. I can make it home from here. Do not let that beast leave these woods."]],
      recap: "You freed Tobin. He had seen a man in a grey robe brand the beast Old Thornhide with the burning eye." },
    { id: "a1h2", k: "hunt", d: 2, n: 3, el: 1, goal: "Slay 3 champions of the Blight in the deep Hollow",
      recap: "You slew the champions that guarded the deep Hollow." },
    { id: "a1s3", k: "boss", d: 2, goal: "Bring down Old Thornhide, the branded beast",
      done: [["", "Old Thornhide crashes down. The brand on its flank is still smoking: an eye inside a crown of fire."], ["", "Beneath the roots where it slept, old stone steps lead down. The Sunken Catacombs. Where Vaeloth went."]],
      recap: "Old Thornhide fell, and under its lair you found the way down to the Sunken Catacombs." },
    { id: "a1h3", k: "hunt", d: 3, n: 40, goal: "Lay 40 of the restless dead to rest in the Sunken Catacombs",
      recap: "You laid the restless dead of the upper catacombs to rest." },
    { id: "a1s4", k: "boss", d: 3, goal: "Slay the Warden of Bones, keeper of the tombs",
      done: [["Warden of Bones", "You are too late. The Cinder Prophet has gone down to wake the Heart."], ["", "The Warden falls apart. In its hand is a seal of blackened silver, stamped with the burning eye."], ["", "This was made by a smith. Doran would know his own work."]],
      recap: "The Warden of Bones named its master the Cinder Prophet, and carried a silver seal with the burning eye." },
    { id: "a1t3", k: "talk", by: "doran", goal: "Bring the silver seal to Doran the Smith in Emberwatch",
      lines: [["Doran the Smith", "Where did you get this? No. Do not tell me. I know this silver. I poured it."], ["Doran the Smith", "Chapel silver. Vaeloth asked me for a seal the winter before he went down. A gift for the choir, he said, to mark their hymn books."], ["Doran the Smith", "Thirty singers went down with him that night. If the seal is on the dead, then so are they. Go easy on them if you can, hero. And if you cannot, go quick."]],
      recap: "Doran the Smith made that seal for Vaeloth's chapel choir. Thirty singers followed him down." },
    { id: "a1s5", k: "boss", d: 4, goal: "Silence the Hollow Choir in the deep tombs",
      done: [["The Hollow Choir", "He sings beneath us. The Prophet. The Prophet wakes."], ["", "The choir falls silent. Among the hymn books lies a charred letter, sealed with the burning eye."], ["The letter", "Hold the tombs. My generals hold the fire and the ice. The Heart wakes soon. V."], ["", "Captain Roek needs to see this."]],
      recap: "The Hollow Choir fell silent, and left a letter signed V: his generals hold the fire and the ice, and the Heart wakes soon." },
    { id: "a1s6", k: "talk", by: "roek", goal: "Bring the Prophet's letter to Captain Roek in Emberwatch",
      lines: [["Captain Roek", "Vaeloth. The priest who blessed my sword the day I took my oath."], ["Captain Roek", "The Cinder Prophet, he calls himself now. Generals in the fire and the ice, and a Heart he means to wake under the world."], ["Captain Roek", "Then we go after his generals. Rest while you can, hero. The Burning comes next."]],
      recap: "Captain Roek read the letter. Vaeloth calls himself the Cinder Prophet now." }
  ] },
  // build 0069: Act II. k 'rescue' puts a captive on floor d or deeper; walking up to them frees them
  { n: "Act II", t: "The Burning", sub: "His generals hold the fire and the ice", steps: [
    { id: "a2h1", k: "hunt", d: 5, n: 40, goal: "Burn a road through the Cinder Wastes: defeat 40 of the Prophet's creatures",
      open: [["Captain Roek", "Two generals, the letter says. One holds the fire, out in the Cinder Wastes. We start there."], ["Captain Roek", "The Wastes are crawling with his creatures. Burn a road through to the Ashen Tyrant, and do not stop."]],
      recap: "You burned a road through the Cinder Wastes." },
    { id: "a2s2", k: "boss", d: 5, goal: "Slay the Ashen Tyrant, Vaeloth's general of fire",
      done: [["The Ashen Tyrant", "Kill me, then. It changes nothing. The Matriarch already has your little scholar."], ["The Ashen Tyrant", "He knows the way down to the Prophet. By now she has frozen it out of him."], ["", "The Tyrant crumbles to ash. A scholar from Emberwatch? Someone at the inn will know."]],
      recap: "The Ashen Tyrant, his general of fire, fell. He boasted that the Matriarch had taken a scholar from Emberwatch." },
    { id: "a2s3", k: "talk", by: "lysa", goal: "Ask Lysa at the inn about the missing scholar",
      lines: [["Lysa the Innkeeper", "Maren! It has to be Maren. He rents my back room and reads all night by the fire."], ["Lysa the Innkeeper", "He was the acolyte at the old ember chapel, before Vaeloth went down. Three nights ago he went out for frostwort and never came home."], ["Lysa the Innkeeper", "Frostveil Pass, up past the far end of the Wastes. But the Tyrant's captains still hold that road. Please, hero. Bring him back."]],
      recap: "Lysa said the scholar was Maren, the old chapel acolyte, taken near Frostveil Pass." },
    { id: "a2h2", k: "hunt", d: 6, n: 4, el: 1, goal: "Break the Tyrant's captains: slay 4 champions in the deep Wastes",
      recap: "You broke the Tyrant's captains on the road to the pass." },
    { id: "a2s1", k: "boss", d: 6, goal: "Slay Magmaw, the beast that guards the road to the ice",
      done: [["", "Magmaw collapses into cooling stone. In the middle of the rubble one ember still beats, slow, like a heart."], ["", "Beyond it the road climbs into snow. Nobody walks into Frostveil unready. Doran will know what to do with living fire."]],
      recap: "Magmaw fell at the edge of the Cinder Wastes, and left behind an ember that beats like a heart." },
    { id: "a2t2", k: "talk", by: "doran", goal: "Carry Magmaw's ember to Doran the Smith",
      lines: [["Doran the Smith", "By the anvil. It is still alive. Hold it there. No, closer to the forge."], ["Doran the Smith", "The Matriarch's cold is not weather, hero. It is a spell, and it eats fire. Ordinary steel goes brittle as glass up there."], ["Doran the Smith", "There. I have quenched your gear in the ember. It will hold in the pass. Now go and get that boy before she is finished with him."]],
      recap: "Doran the Smith tempered your gear in Magmaw's ember, to hold against the Matriarch's cold." },
    { id: "a2s4", k: "rescue", d: 7, who: "Maren", goal: "Find Maren, frozen in the ice of Frostveil Pass",
      lines: [["Maren", "You came. I thought no one would."], ["Maren", "I served Vaeloth for nine years. I know where he went: down through the Voidscar, where the sky is torn open. He waits at the Heart."], ["Maren", "But the Pale Matriarch holds the pass. While she lives, no one gets through. I can find my own way home. Go."]],
      recap: "You freed Maren from the ice. Vaeloth waits at the Heart beyond the Voidscar, but the Pale Matriarch holds the pass." },
    { id: "a2s5", k: "boss", d: 7, goal: "Slay the Pale Matriarch, Vaeloth's general of ice",
      done: [["The Pale Matriarch", "My Prophet. Forgive me. The cold was not enough."], ["", "The ice cracks open across the pass. But from the low road comes a howl that shakes the snow off the cliffs."], ["", "She kept a hound. Rimefang still hunts the way down, and its pack with it."]],
      recap: "The Pale Matriarch, his general of ice, fell. Her hound Rimefang still held the low road." },
    { id: "a2h3", k: "hunt", d: 8, n: 50, goal: "Clear the low road: defeat 50 monsters in deep Frostveil",
      recap: "You cleared the Matriarch's pack from the low road." },
    { id: "a2s7", k: "boss", d: 8, goal: "Slay Rimefang, the Matriarch's hound",
      done: [["", "Rimefang falls, and the howling stops. For the first time the pass is quiet."], ["", "Far below, the torn sky of the Voidscar glows like a wound."], ["", "Both of his generals are gone, and the way down is open. Captain Roek should hear it."]],
      recap: "Rimefang fell, and the way down to the Voidscar opened." },
    { id: "a2s6", k: "talk", by: "roek", goal: "Tell Captain Roek that both generals are dead",
      lines: [["Captain Roek", "Both of them. And Maren home, safe by Lysa's fire. You have done more than this town can ever pay you for."], ["Captain Roek", "Maren says Vaeloth waits at the Heart, past the Voidscar. Nobody has come back from there."], ["Captain Roek", "So be the first. The Unmaking is coming, hero, and you are all we have."]],
      recap: "Captain Roek sent you on toward the Voidscar." }
  ] },
  // build 0074: Act III. Through the Voidscar to the Heart of Cinders on floor 10, where Vaeloth fights in three phases
  { n: "Act III", t: "The Unmaking", sub: "Into the Voidscar, to the Heart", steps: [
    { id: "a3s2", k: "boss", d: 9, goal: "Slay Null, the Unmade, who guards the Voidscar",
      open: [["Maren", "Below Frostveil the ice runs down into the Voidscar, where the sky tore open. With the hound dead, only one thing still stands on that road."], ["Maren", "Null, he named it. The Unmade. It guards the tear itself. Get past it, and you are on his doorstep."]], /* build 0074: Rimefang now closes Act II, so Act III opens in the Voidscar */
      done: [["Null, the Unmade", "Go down, then. Go down to him. The Heart is already beating."], ["", "Null folds into nothing. Where it stood lies a shard of black glass, warm, and beating like a pulse."], ["", "Doran the Smith knows hot metal better than anyone in Emberwatch. Take the shard to him."]],
      recap: "Null, the Unmade, fell in the Voidscar and left a beating shard of black glass." },
    { id: "a3s3", k: "talk", by: "doran", goal: "Bring the beating shard to Doran the Smith",
      lines: [["Doran the Smith", "Put it on the anvil. Easy. Feel that? It beats like a heart, and it is cold as a grave."], ["Doran the Smith", "This is a piece of the thing he means to wake. I have bound it into an ember ward for you. It will keep the Heart's fire off you long enough to reach him."], ["Doran the Smith", "Under the Voidscar there is a stair of black glass. At the bottom is the Heart of Cinders, and Vaeloth. Go and end it."]],
      recap: "Doran bound the shard into an ember ward and showed you the stair down to the Heart of Cinders." },
    { id: "a3s4", k: "boss", d: 10, goal: "Go down to the Heart of Cinders and stop Vaeloth",
      done: [["Vaeloth", "Ten years I listened to it beat. Ten years. It was going to make the world clean."], ["Vaeloth", "Tell Hesta... tell her I was only ever trying to light the dark."], ["", "The Prophet falls, and the Heart under the floor slows, and stops. The fire in the stone goes grey."], ["", "Emberwatch is safe. Captain Roek is waiting for you."]],
      recap: "You stopped Vaeloth at the Heart of Cinders, and the dead god's heart went still." },
    { id: "a3s5", k: "talk", by: "roek", goal: "Bring the news to Captain Roek",
      lines: [["Captain Roek", "It is over, then. The fire under the world is out, and the dead lie still in the Hollow."], ["Captain Roek", "But the Voidscar is still open. The Rift Stone in the square has been humming all night, and it is showing us places that should not exist."], ["Captain Roek", "Go and see how deep it goes, hero. Emberwatch will be here when you come back. It always will be, now."]],
      recap: "Captain Roek thanked you and pointed you to the Rift Stone in the square." }
  ] }
];
const STORY_VILLAIN = "Vaeloth, the Cinder Prophet";
const BOUNTY = { id: 'bounty', by: 'roek', t: 'Thin the Hordes', ask: 'The roads are still crawling. Defeat 30 monsters out there and I pay a bounty, every time.', goal: { k: 'kills', n: 30, item: 'Monsters defeated' }, thanks: 'Good hunting. Here is your bounty, as promised.', gold: 1, rar: 2, repeat: 1 };
// pets (build 0021): Ember the fox to start; more looks unlock with badges
const PETS = [['fox', 'Ember the fox', null], ['owl', 'Frost owl', 'f10'], ['drake', 'Ember drake', 'slayer'], ['cat', 'Shadow cat', 'streak'], ['gold', 'Golden fox', 'myth']];
const CLASS_COL = { warden: 0xd8a040, ranger: 0x4aa850, arcanist: 0x9a5aff, brawler: 0xe0503a, elementalist: 0xff7a2a };
const LOOK = {
  vil1: { a: 0x8a6a48, am: 0, d: 0x4a3a2a, cl: 0xc8b088, w: 'none' }, vil2: { a: 0x5a6a3a, am: 0, d: 0x3a3026, cl: 0x6a7a4a, robe: 1, w: 'none' }, vil3: { a: 0x8a3a3a, am: 0, d: 0x3a2a26, cl: 0xa84a3a, robe: 1, w: 'none' }, vil4: { a: 0x4a3a30, am: 0, d: 0x2a2018, cl: 0x5a4a3a, w: 'none' }, vil5: { a: 0x3a4a6a, am: 0, d: 0x2a3040, cl: 0x4a5a8a, w: 'none' }, vil6: { a: 0x6a5a7a, am: 0, d: 0x3a3040, cl: 0x8a7aa0, robe: 1, w: 'none' }, kid: { a: 0x6a8a4a, am: 0, d: 0x3a4a2a, cl: 0x7aa05a, w: 'none' }, vendor: { a: 0x6a5030, am: 0, d: 0x3a2a1a, cl: 0x7a4a2a, w: 'none' },
  warden: { a: 0x8e97a8, am: 4, d: 0x3c4250, cl: 0x6e2420, head: 'helm', pauld: 1, shield: 1, cape: 1, w: 'sword' },
  ranger: { a: 0x4f5c38, am: 0, d: 0x3d3326, cl: 0x2c4a2a, head: 'hood', cape: 1, w: 'bow' },
  arcanist: { a: 0x4a3a80, am: 0, d: 0x2c2448, cl: 0x7a52c8, head: 'hat', robe: 1, w: 'staff', orb: 0xb070ff },
  brawler: { a: 0xa87c5c, am: 0, d: 0xa87c5c, cl: 0xb03a22, head: 'band', w: 'fist' },
  elementalist: { a: 0x8a2c1e, am: 0, d: 0x4c1c14, cl: 0xd8782c, head: 'hood', robe: 1, w: 'staff', orb: 0xff7a2a }
};
const ARCH = {
  grunt: { hp: 1, dmg: 1, spd: 4.3, r: .6, sc: 1, rec: .7, wind: .45, xp: 1, reach: 1.7, w: 4 },
  swarm: { hp: .75, dmg: .55, spd: 6.4, r: .45, sc: .7, rec: .5, wind: .3, xp: .5, reach: 1.4, w: 3 },
  goblin: { hp: 2.6, dmg: 0, spd: 6.4, r: .5, sc: .95, rec: 1, wind: 1, xp: 3, reach: 0, w: 0 },
  caster: { hp: .7, dmg: .9, spd: 3.7, r: .6, sc: 1, rec: 1.3, wind: .55, xp: 1.2, reach: 11, w: 2 },
  brute: { hp: 1.4, dmg: 1.9, spd: 3.2, r: 1, sc: 1.55, rec: 1.1, wind: .95, xp: 2.5, reach: 2.8, w: 1 },
  bomber: { hp: .78, dmg: 2.1, spd: 6.2, r: .5, sc: .8, rec: 0, wind: .7, xp: .8, reach: 1.9, w: 1 }
};
// build 0028: the town grows with your gold and shards. Each project has 3 levels and a bonus that stays with this hero.
const TOWN_UP = {
  forge: { n: "Doran's Forge", d: 'Forging new items costs 15% less per level', ic: '⚒' },
  garden: { n: "Healer's Garden", d: 'Potions heal 15% more per level', ic: '❀' },
  guild: { n: 'Merchant Guild', d: '15% more gold from every pile per level', ic: '◈' },
  tower: { n: 'Watchtower', d: 'Your AI teammates hit 15% harder per level', ic: '♜' },
  yard: { n: 'Salvage Yard', d: '25% more shards when you salvage, per level', ic: '⚙' },
  plaza: { n: "Hero's Plaza", d: 'A statue in your honour, banners and lanterns: the whole town celebrates you', ic: '★' }
};
const TOWN_COST = [[4000, 40], [15000, 150], [45000, 450]];
const EMODS = {
  hasted: { n: 'Hasted', d: 'Moves and attacks faster' }, armored: { n: 'Armored', d: 'Takes 40% less damage' }, volatile: { n: 'Volatile', d: 'Explodes on death' },
  storm: { n: 'Stormbound', d: 'Calls lightning down on you' }, molten: { n: 'Molten', d: 'Leaves burning ground' }, regen: { n: 'Regenerating', d: 'Heals over time' }, blink: { n: 'Blinking', d: 'Teleports to your side' }
};
const THEMES = {
  town: { gr: [.3, .15, 0, 0], amb: 'fly', wet: 0.45, mist: 0.2, ground: 0x4e5632, gdet: .4, wall: 'tree', wc: [0x4a382a, 0x24402a, 0x2f4f2c], sunC: [1.2, 1.0, .74], sky: [.16, .2, .26], gnd: [.07, .08, .06], fog: 0x0a1012, torch: 0xffb070, lightR: 46, lamp: 0xffa040 },
  forest: { gr: [.45, .18, .06, 0], wx: 'rain', amb: 'fly', wet: 0.8, mist: 0.5, ground: 0x485a30, gdet: .4, wall: 'tree', wc: [0x4a382a, 0x24402a, 0x2f4f2c], sunC: [1.15, .98, .72], sky: [.13, .18, .24], gnd: [.06, .07, .05], fog: 0x080e10, torch: 0xffb070, lightR: 34, lamp: 0x7dff6a, elem: 'phys',
    mon: [{ a: 'grunt', n: 'Rotting Husk', c: 0x6b7a4a, c2: 0x3a4226, e: 0xd0ff60 }, { a: 'swarm', n: 'Blight Crawler', c: 0x4a3a2a, c2: 0x7a9a3a, e: 0xc0ff40 }, { a: 'caster', n: 'Spore Seer', c: 0x3a5a3a, c2: 0x9adf5a, e: 0xa0ff70 }, { a: 'brute', n: 'Mossback', c: 0x4a5a3a, c2: 0x2a3a22, e: 0xffe060 }] },
  crypt: { torchSh: 1, gr: [.3, 1.1, .2, 0], amb: 'dust', wet: 0.6, mist: 0.6, ground: 0x3a3c46, gdet: .22, wall: 'block', wc: [0x4a4d5a, 0x3a3d48, 0x5a5d6a], sunC: [.32, .36, .5], sky: [.12, .13, .2], gnd: [.05, .05, .07], fog: 0x05060a, torch: 0xffb070, lightR: 25, lamp: 0x6aa8ff, elem: 'cold',
    mon: [{ a: 'grunt', n: 'Bonewalker', c: 0xd8d2bc, c2: 0x6a6658, e: 0x7ad0ff }, { a: 'swarm', n: 'Crypt Rat', c: 0x5a5048, c2: 0x3a3430, e: 0xff5050 }, { a: 'caster', n: 'Grave Chanter', c: 0x3a3a5a, c2: 0x8a9aff, e: 0x9ab0ff }, { a: 'brute', n: 'Tomb Guardian', c: 0x7a7a86, c2: 0x4a4a56, e: 0x70c0ff }, { a: 'bomber', n: 'Corpse Bloat', c: 0x8a9a6a, c2: 0x5a6a3a, e: 0xc0ff60 }] },
  lava: { gr: [.25, .4, .7, 1], wx: 'ash', amb: 'ember', wet: 0, mist: 0.3, ground: 0x3a2620, gdet: .45, wall: 'rock', wc: [0x2a2020, 0x3a2a26, 0xff5a1a], sunC: [.6, .34, .2], sky: [.22, .1, .07], gnd: [.1, .04, .03], fog: 0x0c0403, torch: 0xff9050, lightR: 27, lamp: 0xff5a1a, elem: 'fire',
    mon: [{ a: 'grunt', n: 'Cinder Thrall', c: 0x5a3028, c2: 0x2a1a18, e: 0xff7a2a }, { a: 'swarm', n: 'Ember Imp', c: 0xa03a20, c2: 0x5a2010, e: 0xffc040 }, { a: 'caster', n: 'Flame Herald', c: 0x4a2020, c2: 0xff7a2a, e: 0xffa040 }, { a: 'brute', n: 'Magma Hulk', c: 0x3a2a2a, c2: 0xff5a1a, e: 0xff8a2a }, { a: 'bomber', n: 'Living Bomb', c: 0xc04a1a, c2: 0x6a2a10, e: 0xffe060 }] },
  ice: { gr: [.1, .45, 0, 0], wx: 'snow', torchI: .55, amb: 'snow', wet: .06, mist: .1, ground: 0x3a4656, gdet: .2, wall: 'crystal', wc: [0x5a86a6, 0x7a9cb4, 0x3a6488], sunC: [.4, .47, .6], sky: [.12, .16, .23], gnd: [.045, .06, .085], fog: 0x0a1018, torch: 0xffd0a0, lightR: 29, lamp: 0x8ae0ff, elem: 'cold',
    mon: [{ a: 'grunt', n: 'Frostbitten', c: 0x7a9ab0, c2: 0x3a5a70, e: 0xc0f0ff }, { a: 'swarm', n: 'Ice Skitter', c: 0xa0d0e0, c2: 0x5a8aa0, e: 0xffffff }, { a: 'caster', n: 'Rime Witch', c: 0x4a6a9a, c2: 0xc0f0ff, e: 0xa0e0ff }, { a: 'brute', n: 'Glacial Yeti', c: 0xd0e0e8, c2: 0x8aa0b0, e: 0x60c0ff }] },
  void: { torchSh: 1, gr: [.2, .45, .45, .6], wx: 'motes', amb: 'dust', wet: 0.4, mist: 0.35, ground: 0x241c30, gdet: .4, wall: 'pillar', wc: [0x1c1426, 0x3a2a56, 0xb060ff], sunC: [.4, .28, .6], sky: [.14, .09, .22], gnd: [.05, .03, .08], fog: 0x07040c, torch: 0xd0a0ff, lightR: 26, lamp: 0xb060ff, elem: 'light',
    mon: [{ a: 'grunt', n: 'Voidspawn', c: 0x3a2a56, c2: 0x1c1426, e: 0xd080ff }, { a: 'swarm', n: 'Null Mite', c: 0x5a3a8a, c2: 0x2a1a46, e: 0xff80ff }, { a: 'caster', n: 'Rift Oracle', c: 0x2a1a46, c2: 0xb060ff, e: 0xfff07a }, { a: 'brute', n: 'Abyssal Maw', c: 0x2a2036, c2: 0x7a3ac0, e: 0xff60d0 }, { a: 'bomber', n: 'Unstable Wisp', c: 0x9a5aff, c2: 0x5a2ac0, e: 0xffffff }] }
};
// Two guardians per region: which one you meet depends on the floor.
// build 0089 (Lee: make the boss fights more interesting): sig is each guardian's two signature moves (see bossSig in game.js). The first is
// in its fight from the start; at half life it is enraged, adds the second and attacks faster. Loot, XP and boss life are unchanged.
const BOSSES = {
  forest: [{ n: 'The Rootmother', sig: ['roots', 'cage'], shape: 'tree', c: 0x3a5a2a, c2: 0x6a4a2a, e: 0xc0ff40, pat: ['slam', 'summon', 'ring', 'barrage'] }, { n: 'Old Thornhide', sig: ['trail', 'twincone'], shape: 'beast', c: 0x5a4a2a, c2: 0x2a3a1a, e: 0xffb03a, sc: 2.6, pat: ['charge', 'slam', 'charge', 'barrage'] }],
  crypt: [{ n: 'Warden of Bones', sig: ['twincross', 'cage'], shape: 'knight', c: 0xe0d8c0, c2: 0x4a4a6a, e: 0x7ad0ff, pat: ['charge', 'ring', 'summon', 'nova'] }, { n: 'The Hollow Choir', sig: ['twinrays', 'halo'], shape: 'wraith', c: 0x6a6a8a, c2: 0x2a2a3a, e: 0xb0ffd0, sc: 2, pat: ['spiral', 'summon', 'nova', 'spiral', 'ring'] }],
  lava: [{ n: 'The Ashen Tyrant', sig: ['trail', 'twincross'], shape: 'knight', c: 0x3a2020, c2: 0xff5a1a, e: 0xffc040, pat: ['barrage', 'charge', 'spiral', 'slam'] }, { n: 'Magmaw', sig: ['fault', 'cage'], shape: 'golem', c: 0x5a2a10, c2: 0x1a1210, e: 0xff3a1a, sc: 2.7, pat: ['slam', 'ring', 'slam', 'summon', 'barrage'] }],
  ice: [{ n: 'The Pale Matriarch', sig: ['twinrays', 'cage'], shape: 'wraith', c: 0xc0e0f0, c2: 0x5a90c0, e: 0xffffff, pat: ['spiral', 'nova', 'summon', 'barrage', 'ring'] }, { n: 'Rimefang', sig: ['twincone', 'trail'], shape: 'beast', c: 0x8ab0d0, c2: 0xe0f0ff, e: 0x7ad0ff, sc: 2.5, pat: ['charge', 'nova', 'charge', 'ring'] }],
  void: [{ n: 'Null, the Unmade', sig: ['twincross', 'halo'], shape: 'wraith', c: 0x2a1a46, c2: 0xb060ff, e: 0xff80ff, pat: ['spiral', 'charge', 'barrage', 'nova', 'summon', 'ring'] }, { n: 'The Gaping Star', sig: ['halo', 'twinrays'], shape: 'orb', c: 0x101028, c2: 0xffd84a, e: 0xfff0a0, sc: 2.2, pat: ['ring', 'spiral', 'nova', 'barrage', 'spiral'] }]
};
// build 0074: Act III. Vaeloth, the Cinder Prophet, waits on floor 10 and fights in three phases
const VAELOTH = { n: 'Vaeloth, the Cinder Prophet', shape: 'wraith', c: 0x2a1410, c2: 0xff6a1a, e: 0xffb040, sc: 2.7, hpM: 1.5, pat: ['barrage', 'spiral', 'nova', 'ring'],
  phases: [['barrage', 'spiral', 'nova', 'ring'], ['summon', 'charge', 'barrage', 'slam', 'summon', 'ring'], ['spiral', 'nova', 'barrage', 'charge', 'ring', 'spiral', 'slam']],
  phaseLines: [null, ['The Ember Host', 'Vaeloth calls his faithful out of the fire'], ['The Heart Wakes', 'The Heart beats under the floor. Vaeloth burns brighter and faster']] };
const HEART = { name: 'The Heart of Cinders', theme: 'void', lvl: 30, d: 'Under the Voidscar, where a dead god sleeps and Vaeloth waits.' };
// build 0075 (Lee, Nov 15): the world boss. Every kill by every player on the server fills one shared count.
// When it reaches WB_NEED the boss rises on every party's floor, with one life the whole server wears down together.
// Everyone who lands a hit on it gets a guaranteed Mythic when it falls. No other drop rate or XP number moves.
const WB_NEED = 1000; // kills, server-wide, to raise the world boss. Change this one number to make it rarer or more common
const WB_LIFE = 3; // its life, in floor guardians (then scaled up for how many players are online)
const WB_HIT = .02; // no single hit takes more than this share of its life: it is the one fight meant to last
const WORLD_BOSS = { n: 'The Deepfire Colossus', sig: ['fault', 'twincross'], shape: 'knight', c: 0x2a1c30, c2: 0x7a3ac0, e: 0xc070ff, sc: 3.3, pat: ['slam', 'ring', 'barrage', 'nova', 'spiral', 'charge', 'summon'] };
function bossFor(theme, depth, rift) { if ((depth | 0) === 10 && !rift) return VAELOTH; const l = BOSSES[theme] || BOSSES.forest; return l[Math.max(0, (depth | 0) - 1) % l.length]; }
const ZONES = [
  { name: 'Blighted Hollow', theme: 'forest', lvl: 1, d: 'A rotting wood where the dead refuse to lie still.' },
  { name: 'Sunken Catacombs', theme: 'crypt', lvl: 6, d: 'Flooded tombs patrolled by restless bone.' },
  { name: 'Cinder Wastes', theme: 'lava', lvl: 12, d: 'A scorched plain split by rivers of fire.' },
  { name: 'Frostveil Pass', theme: 'ice', lvl: 18, d: 'A frozen ravine haunted by the Pale Matriarch.' },
  { name: 'The Voidscar', theme: 'void', lvl: 25, d: 'Where the world was torn open. Beyond it lie the Rifts.' }
];
const RIFT_MODS = [
  { id: 'fort', n: 'Fortified', d: 'Monsters have 45% more life', f: d => d.hpM *= 1.45 }, { id: 'savage', n: 'Savage', d: 'Monsters deal 30% more damage', f: d => d.dmM *= 1.3 },
  { id: 'haste', n: 'Frenzied', d: 'Monsters move 20% faster', f: d => d.spM *= 1.2 }, { id: 'teem', n: 'Teeming', d: 'More monster packs', f: d => d.teem = 1 },
  { id: 'elite', n: 'Champions', d: 'Many more elite packs', f: d => d.eliteM = 2.2 }, { id: 'vol', n: 'Volatile', d: 'Monsters explode on death', f: d => d.vol = 1 }
];
const SHRINES = [{ n: 'Shrine of Fury', s: { dmg: 50, aspd: 15 }, c: 0xff5a3a }, { n: 'Shrine of Winds', s: { ms: 30, cdr: 25 }, c: 0x7affc0 }, { n: 'Shrine of Fortune', s: { mf: 100, gf: 100, xp: 30 }, c: 0xffd84a }, { n: 'Shrine of Stone', s: { dr: 30, resAll: 25 }, c: 0x9ab0ff }];

// ---- passive tree ----
const TREE = (() => {
  const B = [
    { n: 'Might', c: '#ff7a5a', a: [{ dmg: 6 }, { phys: 10 }], not: ['Brutality', { dmg: 18, area: 10 }], key: ['Berserker', { dmg: 35, critDmg: 30 }] },
    { n: 'Precision', c: '#ffd84a', a: [{ crit: 2 }, { critDmg: 12 }], not: ['Deadeye', { crit: 5, critDmg: 25 }], key: ['Executioner', { crit: 8, critDmg: 50 }] },
    { n: 'Swiftness', c: '#7affc0', a: [{ aspd: 4 }, { ms: 3 }], not: ['Fleetfoot', { aspd: 10, dodge: 6 }], key: ['Tempest', { aspd: 15, cdr: 15 }] },
    { n: 'Arcana', c: '#b08aff', a: [{ ele: 8 }, { manaPct: 8, manaRegen: 1 }], not: ['Attunement', { ele: 20, area: 10 }], key: ['Archmage', { ele: 35, cdr: 10 }] },
    { n: 'Guard', c: '#8ab0ff', a: [{ armorPct: 10 }, { resAll: 4 }], not: ['Bastion', { resAll: 10, armorPct: 20 }], key: ['Unbreakable', { dr: 10, armorPct: 30 }] },
    { n: 'Vitality', c: '#ff5a7a', a: [{ lifePct: 5 }, { lifeRegen: 2, lifePct: 2 }], not: ['Vigor', { lifePct: 15, lifeOnHit: 3 }], key: ['Juggernaut', { lifePct: 30, leech: 1 }] }
  ];
  const BR = [{ mf: 6, gf: 10 }, { xp: 4 }, { lifePct: 3, dmg: 3 }, { dodge: 3 }, { cdr: 3 }, { resAll: 3, lifePct: 2 }, { area: 5 }, { manaPct: 6, dmg: 2 }, { ms: 3 }, { critDmg: 8 }, { armorPct: 6, dmg: 2 }, { leech: .3 }];
  const nodes = [{ id: 0, x: 0, y: 0, s: {}, t: 'start', n: 'Origin', c: '#fff', adj: [] }];
  const link = (a, b) => { nodes[a].adj.push(b); nodes[b].adj.push(a); };
  for (let b = 0; b < 6; b++) for (let r = 1; r <= 6; r++) {
    const ang = b * Math.PI / 3 - Math.PI / 2, id = 1 + b * 6 + (r - 1), R = r * .15;
    let s, t = 'small', n = B[b].n;
    if (r === 3) { t = 'notable'; n = B[b].not[0]; s = B[b].not[1]; } else if (r === 6) { t = 'key'; n = B[b].key[0]; s = B[b].key[1]; } else s = B[b].a[r % 2];
    nodes.push({ id, x: Math.cos(ang) * R, y: Math.sin(ang) * R, s, t, n, c: B[b].c, adj: [] });
  }
  for (let b = 0; b < 6; b++) for (let r = 1; r <= 6; r++) link(1 + b * 6 + r - 1, r === 1 ? 0 : 1 + b * 6 + r - 2);
  for (let b = 0; b < 6; b++) for (let j = 0; j < 2; j++) {
    const r = j ? 4 : 2, ang = (b + .5) * Math.PI / 3 - Math.PI / 2, id = 37 + b * 2 + j, R = r * .15 * .93;
    nodes.push({ id, x: Math.cos(ang) * R, y: Math.sin(ang) * R, s: BR[b * 2 + j], t: 'small', n: 'Crossing', c: '#c9c9c9', adj: [] });
    link(id, 1 + b * 6 + r - 1); link(id, 1 + ((b + 1) % 6) * 6 + r - 1);
  }
  return { nodes };
})();
// Kills needed per level: about 45 at level 1, 330 at level 10, 2,300 at level 30, 6,400 at level 59 (elites and bosses count for more).
function xpNeed(l) { return Math.round(22 * Math.pow(1.13, l) * (30 + l * 14 + l * l * 1.6) * Math.min(1, .3 + l * .05)); } // Lee, Nov 13: level faster early on (35% of the old need at level 1, back to full by level 14)
function paragonNeed(p) { return Math.round(xpNeed(MAX_LEVEL - 1) * (1 + p * .05)); }
const PARAGON = { dmg: ['Damage', '+1% damage', 0], life: ['Life', '+1% maximum life', 0], armor: ['Armor', '+2% armor', 0], crit: ['Critical damage', '+2% critical damage', 0], mf: ['Magic find', '+1% magic find', 0], ms: ['Move speed', '+1% movement speed', 25] };
const MAX_LEVEL = 60;
// More kinds of foe in every region: a charger that telegraphs a rush, a hurler that lobs pools you must step out of, and a bomber.
{ const EX = { forest: ['Thornback Boar', 'Bile Spitter', 'Sporeling'], crypt: ['Bone Lancer', 'Grave Hurler', 'Corpse Candle'], lava: ['Cinder Ram', 'Magma Spitter', 'Ember Mite'], ice: ['Rime Stag', 'Frost Hurler', 'Shardling'], void: ['Rift Hound', 'Null Caller', 'Unstable Mote'] };
  for (const k in EX) { const th = THEMES[k]; if (!th || !th.mon) continue; const g = th.mon.find(m => m.a === 'grunt') || th.mon[0], c = th.mon.find(m => m.a === 'caster') || th.mon[0];
    th.mon.push({ a: 'grunt', v: 'charge', n: EX[k][0], c: g.c2, c2: g.c, e: g.e }, { a: 'caster', v: 'lob', n: EX[k][1], c: c.c2, c2: c.c, e: c.e }); if (!th.mon.some(m => m.a === 'bomber')) th.mon.push({ a: 'bomber', n: EX[k][2], c: g.c, c2: c.c2, e: 0xff9a3a }); } }
// ---- talent cards (build 0074, Lee, Nov 15): every 5 levels a row of three cards opens and you pick one. Picks swap for free in town.
// A card changes one or two of your skills (fx, by skill) or gives a lasting bonus (s). In fx, numbers multiply m, r, range, spread, ct, as, arc, spd, delay and explode;
// they replace cost, cd, el and buff; anything else adds (cnt, pierce, jumps, waves, gen, freeze, heal, crit, exec, grp, echo, ref). A key starting with = is set outright.
// heal: % of life per monster hit · ref: resource back per monster hit · exec: % harder on monsters below a third of their life · grp: % harder per other monster near the target (up to 5) · echo: the skill goes off again for that % · buff: a short boost when you cast
// vsCtl (in s): % harder on frozen or chilled monsters.
const TAL_LV = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const TAL_SHARED = {
  4: [{ n: 'Stoneskin', d: '+20% armor and +8% to all resistances.', s: { armorPct: 20, resAll: 8 } }, { n: 'Hardy', d: '+15% maximum life.', s: { lifePct: 15 } }, { n: 'Sidestep', d: '+8% chance to dodge and +8% movement speed.', s: { dodge: 8, ms: 8 } }],
  8: [{ n: 'Ruthless', d: '+6% critical chance.', s: { crit: 6 } }, { n: 'Heavy Hand', d: '+30% critical damage.', s: { critDmg: 30 } }, { n: 'Relentless', d: '+10% attack and cast speed.', s: { aspd: 10 } }],
  10: [{ n: 'Quickened', d: 'Skills recharge 12% faster.', s: { cdr: 12 } }, { n: 'Bloodthirst', d: '1% of the damage you deal heals you.', s: { leech: 1 } }, { n: 'Wide Reach', d: 'Your skills cover 15% more ground.', s: { area: 15 } }]
};
const TALENTS = {
  warden: [
    [{ n: 'Bloodletting', d: 'Cleave heals 1% of your life for each monster it hits.', fx: { cleave: { heal: 1 } } }, { n: 'Wide Arc', d: 'Cleave swings 40% wider and reaches 15% further.', fx: { cleave: { arc: 1.4, range: 1.15 } } }, { n: 'Heavy Blade', d: 'Cleave hits 35% harder but swings 15% slower.', fx: { cleave: { m: 1.35, as: .85 } } }],
    [{ n: 'Earthbreaker', d: 'Ground Slam hits 30% harder.', fx: { slam: { m: 1.3 } } }, { n: 'Shockwave', d: 'Ground Slam reaches 35% further.', fx: { slam: { r: 1.35 } } }, { n: 'Fury Engine', d: 'Ground Slam gives back 4 Fury for each monster it hits.', fx: { slam: { ref: 4 } } }],
    [{ n: 'Deep Freeze', d: 'Frost Stomp freezes for 1 second longer.', fx: { stomp: { freeze: 1 } } }, { n: 'Glacier', d: 'Frost Stomp recharges in 5 seconds instead of 8.', fx: { stomp: { cd: 5 } } }, { n: 'Shatter', d: 'Frozen and chilled monsters take 20% more damage from all your skills.', s: { vsCtl: 20 } }],
    [{ n: 'Magma Core', d: 'Earthshatter erupts 4 more times.', fx: { quake: { cnt: 4 } } }, { n: 'Rupture', d: 'Earthshatter recharges in 11 seconds instead of 16.', fx: { quake: { cd: 11 } } }, { n: 'Molten Fury', d: 'Earthshatter hits 30% harder.', fx: { quake: { m: 1.3 } } }],
    [{ n: 'Executioner', d: 'Cleave hits monsters below a third of their life 60% harder.', fx: { cleave: { exec: 60 } } }, { n: 'Crowd Breaker', d: 'Cleave hits 8% harder for each other monster near its target, up to 5.', fx: { cleave: { grp: 8 } } }, { n: 'Rage', d: 'Cleave builds 3 more Fury with every hit.', fx: { cleave: { gen: 3 } } }],
    [{ n: 'Tremor', d: 'Ground Slam freezes monsters for a moment.', fx: { slam: { freeze: .5 } } }, { n: 'Seismic Echo', d: 'Ground Slam lands a second time for 35% of its damage.', fx: { slam: { echo: 35 } } }, { n: 'Iron Will', d: 'Casting Ground Slam makes you take 20% less damage for 3 seconds.', fx: { slam: { buff: { n: 'Iron Will', s: { dr: 20 }, t: 3 } } } }],
    [{ n: 'Frostbite', d: 'Frost Stomp heals 2% of your life for each monster it hits.', fx: { stomp: { heal: 2 } } }, { n: 'Cold Snap', d: 'Frost Stomp hits 60% harder.', fx: { stomp: { m: 1.6 } } }, { n: 'Winter\'s Reach', d: 'Frost Stomp reaches 30% further.', fx: { stomp: { r: 1.3 } } }],
    [{ n: 'Cinder Blood', d: 'Earthshatter heals 1% of your life for each monster it hits.', fx: { quake: { heal: 1 } } }, { n: 'Fault Line', d: 'Earthshatter spreads 40% wider.', fx: { quake: { spread: 1.4 } } }, { n: 'Cataclysm', d: 'Earthshatter hits monsters below a third of their life 80% harder.', fx: { quake: { exec: 80 } } }],
    [{ n: 'Last Stand', d: '+40% damage while you are below half life.', s: { lowLife: 40 } }, { n: 'Juggernaut', d: 'Take 12% less damage from everything.', s: { dr: 12 } }, { n: 'Warlord', d: 'All your skills hit 15% harder.', s: { dmg: 15 } }]
  ],
  ranger: [
    [{ n: 'Piercing Tip', d: 'Quick Shot passes through 2 more monsters.', fx: { shot: { pierce: 2 } } }, { n: 'Split Arrow', d: 'Quick Shot fires 2 arrows that each hit 30% softer.', fx: { shot: { cnt: 1, m: .7 } } }, { n: 'Steady Aim', d: 'Quick Shot has 10% more critical chance.', fx: { shot: { crit: 10 } } }],
    [{ n: 'Wide Fan', d: 'Multishot fires 1 more arrow.', fx: { multi: { cnt: 1 } } }, { n: 'Thrift', d: 'Multishot costs 16 Focus instead of 24.', fx: { multi: { cost: 16 } } }, { n: 'Barbed', d: 'Multishot hits 25% harder.', fx: { multi: { m: 1.25 } } }],
    [{ n: 'Downpour', d: 'Rain of Arrows drops 6 more arrows.', fx: { arrows: { cnt: 6 } } }, { n: 'Quick Volley', d: 'Rain of Arrows recharges in 4 seconds instead of 7.', fx: { arrows: { cd: 4 } } }, { n: 'Frost Arrows', d: 'Rain of Arrows freezes monsters for a moment.', fx: { arrows: { freeze: .5 } } }],
    [{ n: 'Fourth Ring', d: 'Shadow Volley fires a fourth ring.', fx: { volley: { waves: 1 } } }, { n: 'Dense Volley', d: 'Shadow Volley fires 6 more arrows in each ring.', fx: { volley: { cnt: 6 } } }, { n: 'Shadowstep', d: 'Casting Shadow Volley gives you 30% movement speed for 4 seconds.', fx: { volley: { buff: { n: 'Shadowstep', s: { ms: 30 }, t: 4 } } } }],
    [{ n: 'Hunter\'s Mark', d: 'Quick Shot hits monsters below a third of their life 60% harder.', fx: { shot: { exec: 60 } } }, { n: 'Rapid Fire', d: 'Quick Shot fires 20% faster.', fx: { shot: { as: 1.2 } } }, { n: 'Focused', d: 'Quick Shot builds 3 more Focus with every hit.', fx: { shot: { gen: 3 } } }],
    [{ n: 'Point Blank', d: 'Multishot hits 8% harder for each other monster near its target, up to 5.', fx: { multi: { grp: 8 } } }, { n: 'Ricochet', d: 'Multishot arrows pass through 1 monster but hit 25% softer.', fx: { multi: { pierce: 1, m: .75 } } }, { n: 'Siphon', d: 'Multishot heals 1% of your life for each monster it hits.', fx: { multi: { heal: 1 } } }],
    [{ n: 'Storm Cloud', d: 'Rain of Arrows spreads 40% wider.', fx: { arrows: { spread: 1.4 } } }, { n: 'Heavy Rain', d: 'Rain of Arrows hits 35% harder.', fx: { arrows: { m: 1.35 } } }, { n: 'Cold Blood', d: 'Frozen and chilled monsters take 25% more damage from all your skills.', s: { vsCtl: 25 } }],
    [{ n: 'Frozen Ring', d: 'Shadow Volley freezes monsters for 1 second.', fx: { volley: { freeze: 1 } } }, { n: 'Night Hunter', d: 'Shadow Volley recharges in 16 seconds instead of 24.', fx: { volley: { cd: 16 } } }, { n: 'Deadly Volley', d: 'Shadow Volley hits 30% harder.', fx: { volley: { m: 1.3 } } }],
    [{ n: 'Endless Quiver', d: 'Quick Shot, Multishot and Shadow Volley fire 1 more arrow.', s: { projExtra: 1 } }, { n: 'Deadeye', d: '+10% critical chance and +30% critical damage.', s: { crit: 10, critDmg: 30 } }, { n: 'Windrunner', d: '+20% movement speed and +10% chance to dodge.', s: { ms: 20, dodge: 10 } }]
  ],
  arcanist: [
    [{ n: 'Twin Bolts', d: 'Arcane Bolt fires 2 bolts that each hit 30% softer.', fx: { abolt: { cnt: 1, m: .7 } } }, { n: 'Piercing Bolt', d: 'Arcane Bolt passes through 2 monsters.', fx: { abolt: { pierce: 2 } } }, { n: 'Charged', d: 'Arcane Bolt builds 3 more Arcane Power with every hit.', fx: { abolt: { gen: 3 } } }],
    [{ n: 'Unstable Orb', d: 'Arcane Orb\'s blast is 35% bigger.', fx: { orb: { explode: 1.35 } } }, { n: 'Swift Orb', d: 'Arcane Orb flies 50% faster.', fx: { orb: { spd: 1.5 } } }, { n: 'Overcharge', d: 'Arcane Orb hits 35% harder but costs 38 Arcane Power instead of 30.', fx: { orb: { m: 1.35, cost: 38 } } }],
    [{ n: 'Wide Nova', d: 'Arcane Nova reaches 30% further.', fx: { anova: { r: 1.3 } } }, { n: 'Mana Burst', d: 'Arcane Nova gives back 3 Arcane Power for each monster it hits.', fx: { anova: { ref: 3 } } }, { n: 'Stasis', d: 'Arcane Nova freezes monsters for 1 second.', fx: { anova: { freeze: 1 } } }],
    [{ n: 'Third Ring', d: 'Arcane Torrent fires a third ring.', fx: { torrent: { waves: 1 } } }, { n: 'Dense Torrent', d: 'Arcane Torrent fires 6 more missiles in each ring.', fx: { torrent: { cnt: 6 } } }, { n: 'Flow', d: 'Arcane Torrent recharges in 7 seconds instead of 11.', fx: { torrent: { cd: 7 } } }],
    [{ n: 'Disintegrate', d: 'Arcane Bolt hits monsters below a third of their life 60% harder.', fx: { abolt: { exec: 60 } } }, { n: 'Arcane Haste', d: 'Arcane Bolt casts 20% faster.', fx: { abolt: { as: 1.2 } } }, { n: 'Spellblade', d: 'Arcane Bolt has 10% more critical chance.', fx: { abolt: { crit: 10 } } }],
    [{ n: 'Second Orb', d: 'Arcane Orb sends a second orb for 35% of its damage.', fx: { orb: { echo: 35 } } }, { n: 'Implosion', d: 'Arcane Orb hits 8% harder for each other monster near its target, up to 5.', fx: { orb: { grp: 8 } } }, { n: 'Leeching Orb', d: 'Arcane Orb heals 1% of your life for each monster it hits.', fx: { orb: { heal: 1 } } }],
    [{ n: 'Nova Shield', d: 'Casting Arcane Nova makes you take 20% less damage for 3 seconds.', fx: { anova: { buff: { n: 'Nova Shield', s: { dr: 20 }, t: 3 } } } }, { n: 'Echoing Nova', d: 'Arcane Nova bursts a second time for 35% of its damage.', fx: { anova: { echo: 35 } } }, { n: 'Shatter', d: 'Frozen and chilled monsters take 25% more damage from all your skills.', s: { vsCtl: 25 } }],
    [{ n: 'Piercing Torrent', d: 'Arcane Torrent missiles pass through 1 monster.', fx: { torrent: { pierce: 1 } } }, { n: 'Searing Torrent', d: 'Arcane Torrent hits 30% harder.', fx: { torrent: { m: 1.3 } } }, { n: 'Torrent Siphon', d: 'Arcane Torrent gives back 2 Arcane Power for each monster it hits.', fx: { torrent: { ref: 2 } } }],
    [{ n: 'Archmage', d: 'All your skills hit 15% harder.', s: { dmg: 15 } }, { n: 'Overflow', d: 'Skills recharge 15% faster.', s: { cdr: 15 } }, { n: 'Mana Ward', d: 'Take 12% less damage from everything.', s: { dr: 12 } }]
  ],
  brawler: [
    [{ n: 'Flurry', d: 'Jab strikes 20% faster.', fx: { jab: { as: 1.2 } } }, { n: 'Haymaker', d: 'Jab hits 35% harder but strikes 15% slower.', fx: { jab: { m: 1.35, as: .85 } } }, { n: 'Spirit Fist', d: 'Jab builds 3 more Spirit with every hit.', fx: { jab: { gen: 3 } } }],
    [{ n: 'Long Legs', d: 'Sweeping Kick reaches 30% further.', fx: { sweep: { r: 1.3 } } }, { n: 'Spinning Heel', d: 'Sweeping Kick hits 30% harder.', fx: { sweep: { m: 1.3 } } }, { n: 'Second Wind', d: 'Sweeping Kick heals 1% of your life for each monster it hits.', fx: { sweep: { heal: 1 } } }],
    [{ n: 'Inferno Palm', d: 'Burning Palm hits 40% harder.', fx: { palm: { m: 1.4 } } }, { n: 'Quick Palm', d: 'Burning Palm recharges in 2 seconds instead of 4.', fx: { palm: { cd: 2 } } }, { n: 'Wide Palm', d: 'Burning Palm strikes twice as wide.', fx: { palm: { arc: 2 } } }],
    [{ n: 'Tidal Force', d: 'Wave of Force hits 30% harder.', fx: { wave: { m: 1.3 } } }, { n: 'Long Wave', d: 'Wave of Force travels 50% further.', fx: { wave: { range: 1.5 } } }, { n: 'Undertow', d: 'Wave of Force recharges in 4 seconds instead of 6.', fx: { wave: { cd: 4 } } }],
    [{ n: 'Pressure Point', d: 'Jab hits monsters below a third of their life 60% harder.', fx: { jab: { exec: 60 } } }, { n: 'Precision', d: 'Jab has 10% more critical chance.', fx: { jab: { crit: 10 } } }, { n: 'Combo', d: 'Jab hits 8% harder for each other monster near its target, up to 5.', fx: { jab: { grp: 8 } } }],
    [{ n: 'Whirl Kick', d: 'Sweeping Kick strikes a second time for 35% of its damage.', fx: { sweep: { echo: 35 } } }, { n: 'Spirit Kick', d: 'Sweeping Kick gives back 3 Spirit for each monster it hits.', fx: { sweep: { ref: 3 } } }, { n: 'Iron Stance', d: 'Casting Sweeping Kick makes you take 20% less damage for 3 seconds.', fx: { sweep: { buff: { n: 'Iron Stance', s: { dr: 20 }, t: 3 } } } }],
    [{ n: 'Ember Fist', d: 'Burning Palm hits monsters below a third of their life 80% harder.', fx: { palm: { exec: 80 } } }, { n: 'Cauterize', d: 'Burning Palm heals 2% of your life for each monster it hits.', fx: { palm: { heal: 2 } } }, { n: 'Easy Palm', d: 'Burning Palm costs 10 Spirit instead of 20.', fx: { palm: { cost: 10 } } }],
    [{ n: 'Crushing Wave', d: 'Wave of Force stuns monsters for 1 second.', fx: { wave: { freeze: 1 } } }, { n: 'Rolling Thunder', d: 'Wave of Force rolls out a second time for 35% of its damage.', fx: { wave: { echo: 35 } } }, { n: 'Breaker', d: 'Wave of Force hits 8% harder for each other monster near its target, up to 5.', fx: { wave: { grp: 8 } } }],
    [{ n: 'Seven Fists', d: '+15% attack speed.', s: { aspd: 15 } }, { n: 'Unbreakable', d: 'Take 12% less damage from everything.', s: { dr: 12 } }, { n: 'Inner Fire', d: 'All your skills hit 15% harder.', s: { dmg: 15 } }]
  ],
  elementalist: [
    [{ n: 'Twin Flames', d: 'Firebolt fires 2 bolts that each hit 30% softer.', fx: { firebolt: { cnt: 1, m: .7 } } }, { n: 'Kindling', d: 'Firebolt builds 3 more Mana with every hit.', fx: { firebolt: { gen: 3 } } }, { n: 'Blazing', d: 'Firebolt hits 25% harder.', fx: { firebolt: { m: 1.25 } } }],
    [{ n: 'Permafrost', d: 'Frost Nova freezes for 1 second longer.', fx: { frost: { freeze: 1 } } }, { n: 'Iceblink', d: 'Frost Nova recharges in 3 seconds instead of 5.', fx: { frost: { cd: 3 } } }, { n: 'Wide Frost', d: 'Frost Nova reaches 30% further.', fx: { frost: { r: 1.3 } } }],
    [{ n: 'Forked', d: 'Chain Lightning jumps to 3 more monsters.', fx: { chain: { jumps: 3 } } }, { n: 'Overload', d: 'Chain Lightning hits 30% harder.', fx: { chain: { m: 1.3 } } }, { n: 'Conduit', d: 'Chain Lightning gives back 2 Mana for each monster it hits.', fx: { chain: { ref: 2 } } }],
    [{ n: 'Meteor Shower', d: 'Meteor calls down 3 meteors that each hit 40% softer.', fx: { meteor: { cnt: 2, m: .6, '=spread': 3.5 } } }, { n: 'Comet', d: 'Meteor lands twice as fast.', fx: { meteor: { delay: .5 } } }, { n: 'Firestorm', d: 'Meteor\'s blast is 30% bigger.', fx: { meteor: { r: 1.3 } } }],
    [{ n: 'Combustion', d: 'Firebolt hits monsters below a third of their life 60% harder.', fx: { firebolt: { exec: 60 } } }, { n: 'Quickcast', d: 'Firebolt casts 20% faster.', fx: { firebolt: { as: 1.2 } } }, { n: 'Fireball', d: 'Firebolt bursts on impact, hitting monsters around its target.', fx: { firebolt: { '=explode': 2.6 } } }],
    [{ n: 'Shatter', d: 'Frozen and chilled monsters take 25% more damage from all your skills.', s: { vsCtl: 25 } }, { n: 'Ice Armor', d: 'Casting Frost Nova makes you take 20% less damage for 3 seconds.', fx: { frost: { buff: { n: 'Ice Armor', s: { dr: 20 }, t: 3 } } } }, { n: 'Frostbite', d: 'Frost Nova hits 60% harder.', fx: { frost: { m: 1.6 } } }],
    [{ n: 'Static Field', d: 'Chain Lightning hits 8% harder for each other monster near its target, up to 5.', fx: { chain: { grp: 8 } } }, { n: 'Thunderlord', d: 'Chain Lightning has 10% more critical chance.', fx: { chain: { crit: 10 } } }, { n: 'Arc Reach', d: 'Chain Lightning reaches 30% further.', fx: { chain: { range: 1.3 } } }],
    [{ n: 'Cataclysm', d: 'Meteor hits monsters below a third of their life 80% harder.', fx: { meteor: { exec: 80 } } }, { n: 'Twin Meteor', d: 'Meteor falls a second time for 35% of its damage.', fx: { meteor: { echo: 35 } } }, { n: 'Starfall', d: 'Meteor recharges in 3 seconds instead of 5.', fx: { meteor: { cd: 3 } } }],
    [{ n: 'Elemental Mastery', d: 'All your skills hit 15% harder.', s: { dmg: 15 } }, { n: 'Mana Shield', d: 'Take 12% less damage from everything.', s: { dr: 12 } }, { n: 'Tempest', d: 'Skills recharge 15% faster.', s: { cdr: 15 } }]
  ]
};
function talRows(cls) { const c = TALENTS[cls] || [], out = []; let j = 0; for (let i = 0; i < TAL_LV.length; i++) out.push(TAL_SHARED[i] || c[j++] || []); return out; }

// build 0074 (Lee, Nov 15: "Upgrades you feel"): monster life is set by level and floor, not by your gear, so an upgrade shows at once.
// PAR_K: a typical hero's real hit at each level, compared with the old formula (measured, median of many rolled kits).
const PAR_L = [1, 5, 10, 20, 30, 45, 60], PAR_K = [2.4, 2, 1.65, 1.3, .95, .72, .55];
// Difficulty tiers, chosen at the town portal. Only monster life and damage, gold, and the Legendary (and so Mythic) chance change.
// XP, how many items drop, loot tables and the other rarity odds stay as they are.
const TIERS = [
  { n: 'Normal', hp: 1, dmg: 1, gold: 0, leg: 1 },
  { n: 'Hard', hp: 1.8, dmg: 1.4, gold: 50, leg: 1.5 },
  { n: 'Torment 1', hp: 3, dmg: 1.9, gold: 100, leg: 2 },
  { n: 'Torment 2', hp: 5, dmg: 2.5, gold: 150, leg: 2.5 },
  { n: 'Torment 3', hp: 8, dmg: 3.2, gold: 200, leg: 3 },
  { n: 'Torment 4', hp: 12, dmg: 4, gold: 300, leg: 4 }];
