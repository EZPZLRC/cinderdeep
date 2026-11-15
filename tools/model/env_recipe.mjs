// build 0045: the recipe for the town and world scenery baked by env.mjs. Houses are put together from the village kit's
// 2 m wall pieces: ridge along x, gables on the ends, the front (+z) faces the camera. Everything else is one piece per item.
import fs from 'fs';
const P = Math.PI, H = P / 2, FL = 3.12;
function house({ nx, nz, floors, roof, gable, ground, upper, door = 'Wall_UnevenBrick_Door_Round', win1, win2, shut, chim = [] }) {
  const parts = [], put = (f, x, y, z, ry) => parts.push([f, +x.toFixed(3), +y.toFixed(3), +z.toFixed(3), +ry.toFixed(4)]);
  for (let f = 0; f < floors; f++) { const y = f * FL, plain = f ? upper : ground, win = f ? win2 : win1;
    for (let i = 0; i < nx; i++) { const x = -nx + 1 + 2 * i, mid = i === (nx >> 1) - (nx % 2 ? 0 : 1) + (nx % 2 ? 0 : 0);
      // front: the door in the middle of the ground floor, windows either side
      const front = !f && i === Math.floor((nx - 1) / 2) ? door : (i % 2 === (f ? 0 : 1) || nx <= 2) ? win.wall : plain; put(front, x, y, nz, 0);
      if (front === win.wall) { put(win.glass, x, y, nz, 0); if (shut) put(shut, x, y, nz, 0); }
      if (front === door) put('Door_1_Round', x - .56, y, nz - .11, 0);
      const back = i % 2 ? win.wall : plain; put(back, x, y, -nz, P); if (back === win.wall) put(win.glass, x, y, -nz, P); }
    for (let j = 0; j < nz; j++) { const z = -nz + 1 + 2 * j, side = (j + f) % 2 ? win.wall : plain;
      for (const s of [1, -1]) { put(side, s * nx, y, z, s * H); if (side === win.wall) put(win.glass, s * nx, y, z, s * H); } }
    for (const sx of [1, -1]) for (const sz of [1, -1]) put('Corner_Exterior_Wood', sx * nx, y, sz * nz, 0); }
  const top = floors * FL, rp = [[roof, 0, +top.toFixed(3), 0, +H.toFixed(4)]]; for (const s of [1, -1]) put(gable, s * nx, top, 0, s * H);
  for (const [cx, cz] of chim) put('Prop_Chimney', cx, top + .3, cz, 0);
  return [parts, rp];
}
const brick = { wall: 'Wall_UnevenBrick_Window_Wide_Round', glass: 'Window_Wide_Round1' }, plas = { wall: 'Wall_Plaster_Window_Wide_Round', glass: 'Window_Wide_Round1' }, thin = { wall: 'Wall_Plaster_Window_Thin_Round', glass: 'Window_Thin_Round1' };
const H2 = (n, o) => { const [b, r] = house(o); return [{ n, parts: b }, { n: n + '_roof', parts: r }]; };
const items = [
  ...H2('inn', { nx: 3, nz: 2, floors: 2, roof: 'Roof_RoundTiles_4x6', gable: 'Roof_Front_Brick4', ground: 'Wall_UnevenBrick_Straight', upper: 'Wall_Plaster_Straight', win1: brick, win2: plas, shut: null, chim: [[-1.6, -1], [1.6, -1]] }),
  ...H2('cottage_stone', { nx: 2, nz: 2, floors: 1, roof: 'Roof_RoundTiles_4x4', gable: 'Roof_Front_Brick4', ground: 'Wall_UnevenBrick_Straight', upper: null, win1: brick, shut: 'WindowShutters_Wide_Round_Open', chim: [[-1.2, -1]] }),
  ...H2('cottage_timber', { nx: 2, nz: 2, floors: 1, roof: 'Roof_RoundTiles_4x4', gable: 'Roof_Front_Brick4', ground: 'Wall_Plaster_Straight', upper: null, door: 'Wall_Plaster_Door_Round', win1: thin, shut: null, chim: [[1.2, -1]] }),
];
for (const n of ['Barrel', 'Crate_Wooden', 'Bench', 'Anvil', 'Cauldron', 'Prop_Wagon', 'Lantern_Wall', 'Prop_WoodenFence_Single', 'WeaponStand', 'Workbench', 'Bucket_Wooden_1', 'Dummy',
  'CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'Pine_1', 'Pine_2', 'Pine_3', 'Pine_5', 'DeadTree_1', 'DeadTree_2', 'DeadTree_3', 'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Bush_Common', 'Bush_Common_Flowers', 'Fern_1', 'Mushroom_Common', 'Flower_3_Group', 'Flower_4_Group'])
  items.push({ n, parts: [n] });
const mats = [['WindowGlass', 10], ['leaf|leaves|vine|grass|flower|petal|clover|fern|plant|mushroom', 2], ['bark|rock|pebble|path', 3], ['metal', 4]];
fs.writeFileSync(process.argv[2], JSON.stringify({ mats, items }));
