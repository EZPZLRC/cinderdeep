'use strict';
const BUILD = '0003';
const SLOTS = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'bracers', 'belt', 'pants', 'boots', 'amulet', 'ring1', 'ring2'];
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
  cleave: { n: 'Cleave', lv: 1, i: '⚔', type: 'melee', el: 'phys', m: 1.0, range: 3.4, arc: 2.0, basic: 1, gen: 8, d: 'Sweep your weapon in a wide arc, striking every enemy in front of you.' },
  bash: { n: 'Bash', i: '⚒', type: 'melee', el: 'phys', m: 1.6, range: 3.3, arc: .9, basic: 1, gen: 12, lv: 2, d: 'A heavy blow on one target in front of you. Builds Fury quickly.' },
  stomp: { n: 'Frost Stomp', i: '❄', type: 'nova', el: 'cold', m: 1.2, cost: 10, cd: 8, r: 6, freeze: 2, ct: .3, lv: 8, d: 'Stomp the ground with frost, damaging nearby enemies and freezing them for 2 seconds.' },
  charge: { n: 'Furious Charge', i: '➤', type: 'dash', el: 'phys', m: 2.2, cd: 7, range: 14, land: 3.2, gen: 10, flat: 1, lv: 10, d: 'Rush forward in a straight line and smash into enemies where you stop.' },
  slam: { n: 'Ground Slam', lv: 1, i: '✹', type: 'nova', el: 'phys', m: 1.9, cost: 20, r: 5.2, ct: .45, d: 'Smash the ground, damaging all enemies around you.' },
  leap: { n: 'Leap', lv: 3, i: '⤴', type: 'dash', el: 'phys', m: 1.7, cd: 5, range: 12, land: 3.8, gen: 5, d: 'Leap to the target location and crash down on enemies there.' },
  warcry: { n: 'War Cry', lv: 6, i: '♛', type: 'buff', cd: 16, dur: 7, s: { dmg: 35, aspd: 20, ms: 15 }, gen: 0, d: 'Bellow a war cry: +35% damage, +20% attack speed and +15% movement speed for 7 seconds.' },
  whirl: { n: 'Whirlwind', lv: 5, i: '✪', type: 'spin', el: 'phys', m: .7, cost: 25, cd: 6, dur: 3, r: 3.8, tick: .2, d: 'Spin for 3 seconds, striking everything nearby. You can move while spinning.' },
  quake: { n: 'Earthshatter', lv: 12, i: '☄', type: 'rain', el: 'fire', m: 3.2, cd: 14, cost: 45, cnt: 9, spread: 7.5, r: 3.4, delay: .5, stagger: .1, d: 'Tear open the earth: nine molten eruptions burst around the target.' },
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
  multi: { n: 'Multishot', lv: 1, i: '⋔', type: 'proj', el: 'phys', m: .85, cost: 18, cnt: 5, spread: .7, spd: 34, pr: .4, range: 15, ct: .32, arrow: 1, d: 'Fire a fan of five arrows.' },
  roll: { n: 'Vault', lv: 3, i: '↯', type: 'dash', el: 'phys', m: 0, cd: 4, range: 9.5, flat: 1, d: 'Tumble a short distance, avoiding all damage.' },
  arrows: { n: 'Rain of Arrows', lv: 5, i: '⇊', type: 'rain', el: 'phys', m: .9, cost: 25, cd: 5, cnt: 14, spread: 4.6, r: 1.9, delay: .35, stagger: .07, d: 'Blanket an area with fourteen falling arrows.' },
  mark: { n: "Hunter's Mark", lv: 6, i: '◎', type: 'buff', cd: 18, dur: 8, s: { crit: 20, critDmg: 40, aspd: 15 }, d: '+20% critical chance, +40% critical damage and +15% attack speed for 8 seconds.' },
  trap: { n: 'Frost Trap', lv: 8, i: '❄', type: 'nova', el: 'cold', m: 1.2, cost: 10, cd: 9, r: 5.5, freeze: 3, ct: .25, d: 'Spring a trap at your feet that freezes nearby enemies for 3 seconds.' },
  pierce: { n: 'Storm Bolt', lv: 10, i: '⚡', type: 'proj', el: 'light', m: 2.7, cost: 22, cd: 3, spd: 44, pierce: 99, pr: .9, range: 18, ct: .4, d: 'A charged bolt that pierces every enemy in its path.' },
  volley: { n: 'Shadow Volley', lv: 12, i: '✺', type: 'barrage', el: 'cold', m: 1.1, cost: 40, cd: 20, cnt: 18, waves: 3, spd: 26, pr: .45, range: 13, d: 'Three rings of freezing arrows burst outward from you.' },
  // Arcanist
  abolt: { n: 'Arcane Bolt', lv: 1, i: '✦', type: 'proj', el: 'arc', m: 1.0, basic: 1, spd: 28, pr: .5, range: 15, d: 'Hurl a bolt of raw arcane energy.' },
  shards: { n: 'Prism Shards', lv: 2, i: '⁂', type: 'proj', el: 'arc', m: .5, basic: 1, cnt: 3, spread: .4, spd: 30, pr: .4, range: 13, d: 'Three shards in a tight fan. Strong against packs.' },
  orb: { n: 'Arcane Orb', lv: 1, i: '◉', type: 'proj', el: 'arc', m: 2.4, cost: 30, spd: 13, pr: .9, range: 15, explode: 3.8, ct: .4, d: 'A slow orb that detonates on the first enemy it touches.' },
  tele: { n: 'Teleport', lv: 3, i: '✧', type: 'dash', blink: 1, el: 'arc', m: 0, cd: 4, range: 13, cost: 10, d: 'Teleport instantly to the target location.' },
  anova: { n: 'Arcane Nova', lv: 5, i: '✹', type: 'nova', el: 'arc', m: 1.7, cost: 28, r: 6.5, ct: .3, d: 'A burst of arcane force around you.' },
  prism: { n: 'Prismatic Ward', lv: 6, i: '⬡', type: 'buff', cd: 18, dur: 8, s: { dr: 25, resAll: 20, area: 20 }, d: '25% damage reduction, +20% all resistances and +20% area for 8 seconds.' },
  ray: { n: 'Disintegrate', lv: 8, i: '⟶', type: 'proj', el: 'arc', m: 2.3, cost: 22, cd: 2, spd: 60, pierce: 99, pr: .7, range: 20, ct: .3, d: 'A searing beam that pierces everything in a line.' },
  torrent: { n: 'Arcane Torrent', lv: 10, i: '✺', type: 'barrage', el: 'arc', m: .9, cost: 35, cd: 9, cnt: 14, waves: 2, spd: 24, pr: .45, range: 12, d: 'Two rings of arcane missiles burst outward from you.' },
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
  seven: { n: 'Seven-Sided Strike', lv: 12, i: '✵', type: 'rain', el: 'phys', m: 2.0, cost: 45, cd: 16, cnt: 7, spread: 3.5, r: 2.4, delay: .15, stagger: .12, d: 'Seven blinding strikes land around the target.' },
  // Elementalist
  firebolt: { n: 'Firebolt', lv: 1, i: '✦', type: 'proj', el: 'fire', m: 1.05, basic: 1, spd: 27, pr: .5, range: 15, d: 'Hurl a bolt of fire that sets enemies alight.' },
  spark: { n: 'Shock Pulse', lv: 2, i: '⚡', type: 'proj', el: 'light', m: .5, basic: 1, cnt: 3, spread: .5, spd: 24, pr: .4, range: 10, d: 'Three crackling sparks at short range.' },
  frost: { n: 'Frost Nova', lv: 1, i: '❄', type: 'nova', el: 'cold', m: 1.4, cost: 22, cd: 5, r: 6.5, freeze: 1.8, ct: .3, d: 'A ring of frost that damages and freezes nearby enemies.' },
  fdash: { n: 'Flame Dash', lv: 3, i: '➤', type: 'dash', el: 'fire', m: 1.2, cd: 4, range: 11, land: 3, cost: 8, flat: 1, d: 'Streak forward in a burst of flame, burning enemies where you stop.' },
  chain: { n: 'Chain Lightning', lv: 5, i: '⚡', type: 'chain', el: 'light', m: 1.35, cost: 18, jumps: 5, range: 15, ct: .35, d: 'Lightning that arcs between up to six enemies.' },
  mshield: { n: 'Molten Shield', lv: 6, i: '♨', type: 'buff', cd: 16, dur: 8, s: { dr: 15, fire: 30, thorns: 12 }, d: '15% damage reduction, +30% fire damage and burning thorns for 8 seconds.' },
  meteor: { n: 'Meteor', lv: 8, i: '☄', type: 'rain', el: 'fire', m: 4.4, cost: 40, cd: 5, cnt: 1, spread: 0, r: 4.8, delay: .8, fall: 1, d: 'Call down a meteor for massive fire damage.' },
  blizz: { n: 'Blizzard', lv: 10, i: '❅', type: 'rain', el: 'cold', m: .9, cost: 35, cd: 8, cnt: 16, spread: 6, r: 2.4, delay: .3, stagger: .12, d: 'Sixteen shards of ice hammer an area, chilling everything.' },
  inferno: { n: 'Firestorm', lv: 12, i: '♨', type: 'rain', el: 'fire', m: 1.8, cost: 60, cd: 22, cnt: 22, spread: 10, r: 3, delay: .35, stagger: .11, fall: 1, d: 'Rain two dozen fireballs across a huge area.' }
});
const CLASSES = {
  warden: { n: 'Warden', tag: 'Melee', d: 'Sword and shield. Wades into the horde and builds Fury with every swing.', life: 130, lifeLv: 17, armor: 4, ms: 8.6, regen: 1.6, res: { n: 'Fury', max: 100, decay: 5, c: 'radial-gradient(circle at 35% 30%,#ffd070,#e07a14 55%,#7a3204)' }, wts: ['sword', 'axe', 'maul'], w: 'Sword', skills: ['cleave', 'bash', 'slam', 'leap', 'whirl', 'warcry', 'stomp', 'charge', 'quake'] },
  ranger: { n: 'Ranger', tag: 'Bow', d: 'A swift archer who kites and shreds enemies from range.', life: 100, lifeLv: 13, armor: 2.5, ms: 9.4, regen: 1.1, res: { n: 'Focus', max: 100, regen: 5, c: 'radial-gradient(circle at 35% 30%,#b8ff9a,#3aa02a 55%,#12480e)' }, wts: ['bow'], w: 'Longbow', skills: ['shot', 'power', 'multi', 'roll', 'arrows', 'mark', 'trap', 'pierce', 'volley'] },
  arcanist: { n: 'Arcanist', tag: 'Arcane', d: 'Bends raw arcane power: orbs, beams and teleports. Power refills fast.', life: 85, lifeLv: 11, armor: 1.5, ms: 8.6, regen: .8, res: { n: 'Arcane Power', max: 100, regen: 11, c: 'radial-gradient(circle at 35% 30%,#e0b8ff,#8a3ae0 55%,#34106a)' }, wts: ['staff'], w: 'Wand', skills: ['abolt', 'shards', 'orb', 'tele', 'anova', 'prism', 'ray', 'torrent', 'hole'] },
  brawler: { n: 'Brawler', tag: 'Physical', d: 'Bare-knuckle martial artist. Very fast strikes, dashes and kicks; builds Spirit.', life: 115, lifeLv: 15, armor: 3, ms: 9.6, regen: 1.8, res: { n: 'Spirit', max: 100, decay: 2, c: 'radial-gradient(circle at 35% 30%,#fff4b0,#d0b020 55%,#6a5606)' }, wts: ['fist'], w: 'Cestus', skills: ['jab', 'hook', 'sweep', 'dstrike', 'cyclone', 'iron', 'palm', 'wave', 'seven'] },
  elementalist: { n: 'Elementalist', tag: 'Spell caster', d: 'Commands fire, frost and lightning. Fragile, but erases whole packs.', life: 85, lifeLv: 11, armor: 1.5, ms: 8.6, regen: .8, res: { n: 'Mana', max: 120, regen: 6, c: 'radial-gradient(circle at 35% 30%,#9ac8ff,#2a5ae0 55%,#0c1e6a)' }, wts: ['staff'], w: 'Staff', skills: ['firebolt', 'spark', 'frost', 'fdash', 'chain', 'mshield', 'meteor', 'blizz', 'inferno'] }
};
const CLASS_IDS = Object.keys(CLASSES);
const LOOK = {
  warden: { a: 0x8e97a8, am: 4, d: 0x3c4250, cl: 0x6e2420, head: 'helm', pauld: 1, shield: 1, cape: 1, w: 'sword' },
  ranger: { a: 0x4f5c38, am: 0, d: 0x3d3326, cl: 0x2c4a2a, head: 'hood', cape: 1, w: 'bow' },
  arcanist: { a: 0x4a3a80, am: 0, d: 0x2c2448, cl: 0x7a52c8, head: 'hat', robe: 1, w: 'staff', orb: 0xb070ff },
  brawler: { a: 0xa87c5c, am: 0, d: 0xa87c5c, cl: 0xb03a22, head: 'band', w: 'fist' },
  elementalist: { a: 0x8a2c1e, am: 0, d: 0x4c1c14, cl: 0xd8782c, head: 'hood', robe: 1, w: 'staff', orb: 0xff7a2a }
};
const ARCH = {
  grunt: { hp: 1, dmg: 1, spd: 4.3, r: .6, sc: 1, rec: .7, wind: .45, xp: 1, reach: 1.7, w: 4 },
  swarm: { hp: .75, dmg: .55, spd: 6.4, r: .45, sc: .7, rec: .5, wind: .3, xp: .5, reach: 1.4, w: 3 },
  caster: { hp: .7, dmg: .9, spd: 3.7, r: .6, sc: 1, rec: 1.3, wind: .55, xp: 1.2, reach: 11, w: 2 },
  brute: { hp: 1.4, dmg: 1.9, spd: 3.2, r: 1, sc: 1.55, rec: 1.1, wind: .95, xp: 2.5, reach: 2.8, w: 1 },
  bomber: { hp: .5, dmg: 2.1, spd: 6.2, r: .5, sc: .8, rec: 0, wind: .7, xp: .8, reach: 1.9, w: 1 }
};
const EMODS = {
  hasted: { n: 'Hasted', d: 'Moves and attacks faster' }, armored: { n: 'Armored', d: 'Takes 40% less damage' }, volatile: { n: 'Volatile', d: 'Explodes on death' },
  storm: { n: 'Stormbound', d: 'Calls lightning down on you' }, molten: { n: 'Molten', d: 'Leaves burning ground' }, regen: { n: 'Regenerating', d: 'Heals over time' }
};
const THEMES = {
  town: { ground: 0x4e5632, gdet: .4, wall: 'tree', wc: [0x4a382a, 0x24402a, 0x2f4f2c], sunC: [1.2, 1.0, .74], sky: [.16, .2, .26], gnd: [.07, .08, .06], fog: 0x0a1012, torch: 0xffb070, lightR: 46, lamp: 0xffa040 },
  forest: { ground: 0x485a30, gdet: .4, wall: 'tree', wc: [0x4a382a, 0x24402a, 0x2f4f2c], sunC: [1.15, .98, .72], sky: [.13, .18, .24], gnd: [.06, .07, .05], fog: 0x080e10, torch: 0xffb070, lightR: 34, lamp: 0x7dff6a, elem: 'phys',
    mon: [{ a: 'grunt', n: 'Rotting Husk', c: 0x6b7a4a, c2: 0x3a4226, e: 0xd0ff60 }, { a: 'swarm', n: 'Blight Crawler', c: 0x4a3a2a, c2: 0x7a9a3a, e: 0xc0ff40 }, { a: 'caster', n: 'Spore Seer', c: 0x3a5a3a, c2: 0x9adf5a, e: 0xa0ff70 }, { a: 'brute', n: 'Mossback', c: 0x4a5a3a, c2: 0x2a3a22, e: 0xffe060 }] },
  crypt: { ground: 0x3a3c46, gdet: .22, wall: 'block', wc: [0x4a4d5a, 0x3a3d48, 0x5a5d6a], sunC: [.32, .36, .5], sky: [.12, .13, .2], gnd: [.05, .05, .07], fog: 0x05060a, torch: 0xffb070, lightR: 25, lamp: 0x6aa8ff, elem: 'cold',
    mon: [{ a: 'grunt', n: 'Bonewalker', c: 0xd8d2bc, c2: 0x6a6658, e: 0x7ad0ff }, { a: 'swarm', n: 'Crypt Rat', c: 0x5a5048, c2: 0x3a3430, e: 0xff5050 }, { a: 'caster', n: 'Grave Chanter', c: 0x3a3a5a, c2: 0x8a9aff, e: 0x9ab0ff }, { a: 'brute', n: 'Tomb Guardian', c: 0x7a7a86, c2: 0x4a4a56, e: 0x70c0ff }, { a: 'bomber', n: 'Corpse Bloat', c: 0x8a9a6a, c2: 0x5a6a3a, e: 0xc0ff60 }] },
  lava: { ground: 0x3a2620, gdet: .45, wall: 'rock', wc: [0x2a2020, 0x3a2a26, 0xff5a1a], sunC: [.6, .34, .2], sky: [.22, .1, .07], gnd: [.1, .04, .03], fog: 0x0c0403, torch: 0xff9050, lightR: 27, lamp: 0xff5a1a, elem: 'fire',
    mon: [{ a: 'grunt', n: 'Cinder Thrall', c: 0x5a3028, c2: 0x2a1a18, e: 0xff7a2a }, { a: 'swarm', n: 'Ember Imp', c: 0xa03a20, c2: 0x5a2010, e: 0xffc040 }, { a: 'caster', n: 'Flame Herald', c: 0x4a2020, c2: 0xff7a2a, e: 0xffa040 }, { a: 'brute', n: 'Magma Hulk', c: 0x3a2a2a, c2: 0xff5a1a, e: 0xff8a2a }, { a: 'bomber', n: 'Living Bomb', c: 0xc04a1a, c2: 0x6a2a10, e: 0xffe060 }] },
  ice: { ground: 0x7a8a9a, gdet: .2, wall: 'crystal', wc: [0x8ac0e0, 0xc0e0f0, 0x5a90c0], sunC: [.55, .65, .8], sky: [.2, .26, .36], gnd: [.08, .1, .14], fog: 0x0a1018, torch: 0xffd0a0, lightR: 29, lamp: 0x8ae0ff, elem: 'cold',
    mon: [{ a: 'grunt', n: 'Frostbitten', c: 0x7a9ab0, c2: 0x3a5a70, e: 0xc0f0ff }, { a: 'swarm', n: 'Ice Skitter', c: 0xa0d0e0, c2: 0x5a8aa0, e: 0xffffff }, { a: 'caster', n: 'Rime Witch', c: 0x4a6a9a, c2: 0xc0f0ff, e: 0xa0e0ff }, { a: 'brute', n: 'Glacial Yeti', c: 0xd0e0e8, c2: 0x8aa0b0, e: 0x60c0ff }] },
  void: { ground: 0x241c30, gdet: .4, wall: 'pillar', wc: [0x1c1426, 0x3a2a56, 0xb060ff], sunC: [.4, .28, .6], sky: [.14, .09, .22], gnd: [.05, .03, .08], fog: 0x07040c, torch: 0xd0a0ff, lightR: 26, lamp: 0xb060ff, elem: 'light',
    mon: [{ a: 'grunt', n: 'Voidspawn', c: 0x3a2a56, c2: 0x1c1426, e: 0xd080ff }, { a: 'swarm', n: 'Null Mite', c: 0x5a3a8a, c2: 0x2a1a46, e: 0xff80ff }, { a: 'caster', n: 'Rift Oracle', c: 0x2a1a46, c2: 0xb060ff, e: 0xfff07a }, { a: 'brute', n: 'Abyssal Maw', c: 0x2a2036, c2: 0x7a3ac0, e: 0xff60d0 }, { a: 'bomber', n: 'Unstable Wisp', c: 0x9a5aff, c2: 0x5a2ac0, e: 0xffffff }] }
};
const BOSSES = {
  forest: { n: 'The Rootmother', c: 0x3a5a2a, c2: 0x6a4a2a, e: 0xc0ff40, pat: ['slam', 'summon', 'ring', 'barrage'] },
  crypt: { n: 'Warden of Bones', c: 0xe0d8c0, c2: 0x4a4a6a, e: 0x7ad0ff, pat: ['charge', 'ring', 'summon', 'nova'] },
  lava: { n: 'The Ashen Tyrant', c: 0x3a2020, c2: 0xff5a1a, e: 0xffc040, pat: ['barrage', 'charge', 'spiral', 'slam'] },
  ice: { n: 'The Pale Matriarch', c: 0xc0e0f0, c2: 0x5a90c0, e: 0xffffff, pat: ['spiral', 'nova', 'summon', 'barrage', 'ring'] },
  void: { n: 'Null, the Unmade', c: 0x2a1a46, c2: 0xb060ff, e: 0xff80ff, pat: ['spiral', 'charge', 'barrage', 'nova', 'summon', 'ring'] }
};
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
function xpNeed(l) { return Math.round(22 * Math.pow(1.13, l) * (30 + l * 14 + l * l * 1.6)); }
function paragonNeed(p) { return Math.round(xpNeed(MAX_LEVEL - 1) * (1 + p * .05)); }
const PARAGON = { dmg: ['Damage', '+1% damage', 0], life: ['Life', '+1% maximum life', 0], armor: ['Armor', '+2% armor', 0], crit: ['Critical damage', '+2% critical damage', 0], mf: ['Magic find', '+1% magic find', 0], ms: ['Move speed', '+1% movement speed', 25] };
const MAX_LEVEL = 60;
