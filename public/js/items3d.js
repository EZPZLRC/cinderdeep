// 3D items (Lee, Nov 15: "1 and 2"): every item in the bag is a small 3D model, and hovering (or tapping on a phone) shows it large and turning.
// Models are built from simple shapes with three.js, coloured from the item's own look (metal, trim, gem), rendered once into a picture and kept.
// Only the showcase draws live, and only while its tooltip is open. If WebGL is missing, the flat icons stay.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const cv = document.createElement('canvas');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0, 0);
const scene = new THREE.Scene();
let envReady = false; const env = () => { if (envReady) return; const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); envReady = true; };
const key = new THREE.DirectionalLight(0xfff1dd, 2.4); key.position.set(-3, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xffa060, 2.2); rim.position.set(4, 2, -4); scene.add(rim);
const fill = new THREE.DirectionalLight(0x8090ff, .5); fill.position.set(3, -2, 3); scene.add(fill);
const cam = new THREE.PerspectiveCamera(24, 1, .1, 100);

// ---------- materials ----------
const MC = new Map(); const mat = (k, f) => { if (!MC.has(k)) MC.set(k, f()); return MC.get(k); };
const col = c => new THREE.Color(c);
const M = {
  steel: c => mat('s' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#c8ccd4'), metalness: 1, roughness: .28 })),
  dark: c => mat('d' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#3a3d44'), metalness: 1, roughness: .38 })),
  gold: c => mat('g' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#e0b050'), metalness: 1, roughness: .25 })),
  wood: c => mat('w' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#6a4024'), metalness: 0, roughness: .65 })),
  leather: c => mat('l' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#5a3420'), metalness: 0, roughness: .55 })),
  cloth: c => mat('c' + c, () => new THREE.MeshStandardMaterial({ color: col(c || '#7a2030'), metalness: 0, roughness: .85 })),
  bone: () => mat('bone', () => new THREE.MeshStandardMaterial({ color: col('#e8dcc0'), roughness: .5 })),
  black: () => mat('blk', () => new THREE.MeshStandardMaterial({ color: col('#050506'), roughness: .9 })),
  paper: () => mat('ppr', () => new THREE.MeshStandardMaterial({ color: col('#e9dfc4'), roughness: .9 })),
  gem: (c, glow) => mat('j' + c + (glow || ''), () => new THREE.MeshPhysicalMaterial({ color: col(c), roughness: .02, clearcoat: 1, emissive: col(c), emissiveIntensity: glow || .35, specularIntensity: 1 })),
};
// keep geometry per call; everything built for one picture is freed after
let GEOS = []; const G = g => (GEOS.push(g), g);
const mesh = (g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) => { const o = new THREE.Mesh(G(g), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); if (s) o.scale.set(...s); return o; };
const ext = (pts, depth, bev, m) => { const sh = new THREE.Shape(); pts.forEach((p, i) => i ? (p.length === 4 ? sh.quadraticCurveTo(p[0], p[1], p[2], p[3]) : sh.lineTo(p[0], p[1])) : sh.moveTo(p[0], p[1])); const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 16 }); g.translate(0, 0, -depth / 2); return new THREE.Mesh(G(g), m); };
const tube = (pts, r, m, closed) => new THREE.Mesh(G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), !!closed), 64, r, 10, !!closed)), m);
const lathe = (pts, m, seg = 48) => new THREE.Mesh(G(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg)), m);
const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
const gemAt = (g, c, r, x, y, z, rx = 0, glow) => { if (!c) return; const m = mesh(new THREE.OctahedronGeometry(r, 1), M.gem(c, glow), x, y, z, rx, 0, 0, [1, 1, .55]); g.add(m); };

// ---------- the models ----------
// o: metal, trim, gem (null = none), wood, leather, cloth, base (the item's base name), v (four numbers from the item's seed)
const B = {
  sword(o) { const g = new THREE.Group(), a = o.v[0] * 3 | 0;
    const blade = [[[0, 2.2], [.13, 1.9], [.13, .2], [-.13, .2], [-.13, 1.9]], [[0, 2.25], [.15, 2.0], [.11, 1.0], [.16, .2], [-.16, .2], [-.11, 1.0], [-.15, 2.0]], [[.02, 2.2], [.18, 1.7, .14, 1.0], [.14, .2], [-.14, .2], [-.14, 1.95]]][a];
    g.add(ext(blade, .03, .03, M.steel(o.metal))); g.add(mesh(new THREE.BoxGeometry(.035, 1.4, .085), M.dark(), 0, 1.0, 0));
    g.add(mesh(RB(.9, .12, .16, .05), M.gold(o.trim), 0, .14, 0)); for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(.09, 20, 14), M.gold(o.trim), .47 * s, .17, 0));
    g.add(mesh(new THREE.CylinderGeometry(.065, .065, .55, 16), M.leather(o.leather), 0, -.2, 0)); for (let i = 0; i < 6; i++) g.add(mesh(new THREE.TorusGeometry(.068, .014, 6, 20), M.leather('#3a2010'), 0, -.42 + i * .09, 0, Math.PI / 2, 0, .3));
    g.add(mesh(new THREE.SphereGeometry(.12, 20, 14), M.gold(o.trim), 0, -.55, 0)); gemAt(g, o.gem, .09, 0, .15, .1); return g; },
  axe(o) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.06, .07, 2.3, 16), M.wood(o.wood), 0, 0, 0));
    g.add(ext(o.v[0] < .5 ? [[0.05, .95], [.55, 1.25, .75, .75], [.8, .55], [.75, .25, .55, -.05], [.05, .25]] : [[.05, .9], [.6, 1.35], [.82, .6, .7, .1], [.6, -.2], [.05, .3]], .05, .03, M.steel(o.metal)));
    if (o.v[1] < .6) g.add(ext([[-.05, .9], [-.4, .7], [-.05, .4]], .04, .025, M.steel(o.metal)));
    g.add(mesh(new THREE.CylinderGeometry(.09, .09, .55, 16), M.dark(), 0, .62, 0)); for (const y of [-.9, -.7]) g.add(mesh(new THREE.TorusGeometry(.072, .018, 6, 20), M.gold(o.trim), 0, y, 0, Math.PI / 2));
    gemAt(g, o.gem, .08, 0, .62, .1); return g; },
  maul(o) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.06, .07, 2.1, 16), M.wood(o.wood), 0, -.1, 0));
    if (o.v[0] < .5) g.add(mesh(RB(1.0, .55, .55, .09), M.steel(o.metal), 0, .95, 0)); else g.add(mesh(new THREE.CylinderGeometry(.3, .3, 1.0, 8), M.steel(o.metal), 0, .95, 0, 0, 0, Math.PI / 2));
    for (const x of [-.36, .36]) g.add(mesh(RB(.1, .62, .62, .03), M.gold(o.trim), x, .95, 0));
    gemAt(g, o.gem, .11, 0, .95, .32); g.add(mesh(new THREE.SphereGeometry(.1, 16, 12), M.gold(o.trim), 0, -1.17, 0)); return g; },
  staff(o) { const g = new THREE.Group(), wand = o.base === 'Wand', L = wand ? 1.1 : 2.1, y0 = wand ? -.45 : -1.1, pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([Math.sin(t * 14) * .03, y0 + t * L, Math.cos(t * 14) * .03]); } g.add(tube(pts, wand ? .045 : .055, M.wood(o.wood)));
    const top = y0 + L; for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; g.add(tube([[0, top - .15, 0], [Math.cos(a) * .2, top, Math.sin(a) * .2], [Math.cos(a) * .17, top + .25, Math.sin(a) * .17], [Math.cos(a) * .05, top + .38, Math.sin(a) * .05]], .025, M.gold(o.trim))); }
    g.add(mesh(new THREE.SphereGeometry(.16, 28, 20), M.gem(o.gem || '#9fd8ff', .9), 0, top + .1, 0)); if (wand) g.add(mesh(new THREE.SphereGeometry(.07, 14, 10), M.gold(o.trim), 0, y0, 0)); return g; },
  bow(o) { const g = new THREE.Group(), sh = o.base === 'Shortbow' ? .8 : 1.15, pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24 * 2 - 1; pts.push([-.42 * (1 - t * t) * sh / 1.15 + .08 * t * t * t * t, t * sh, 0]); } g.add(tube(pts, .045, M.wood(o.wood)));
    g.add(mesh(new THREE.CylinderGeometry(.006, .006, sh * 2.02, 6), M.bone(), .08, 0, 0)); g.add(mesh(new THREE.CylinderGeometry(.065, .065, .32, 14), M.leather(o.leather), -.42 * sh / 1.15, 0, 0));
    for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(.05, .14, 10), M.gold(o.trim), .08, (sh + .03) * s, 0, s < 0 ? Math.PI : 0)); gemAt(g, o.gem, .06, -.42 * sh / 1.15, 0, .07); return g; },
  fist(o) { const g = new THREE.Group(); g.add(mesh(RB(1.1, .5, .32, .12), M.steel(o.metal), 0, .3, 0));
    for (let i = 0; i < 4; i++) { g.add(mesh(new THREE.TorusGeometry(.13, .05, 10, 20), M.steel(o.metal), -.39 + i * .26, -.05, 0)); if (o.base === 'Spiked Knuckles') g.add(mesh(new THREE.ConeGeometry(.07, .3, 12), M.steel('#d8dee8'), -.39 + i * .26, .66, 0)); }
    g.add(mesh(RB(1.14, .1, .36, .03), M.gold(o.trim), 0, .1, 0)); gemAt(g, o.gem, .1, 0, .32, .18); return g; },
  shield(o) { const g = new THREE.Group();
    g.add(ext([[0, 1], [.75, .85], [.72, .1, .75, .1], [.5, -.55, 0, -1.05], [-.5, -.55, -.72, .1], [-.75, .85]], .1, .05, M.steel(o.metal)));
    const f = ext([[0, .86], [.62, .74], [.6, .1, .62, .1], [.4, -.45, 0, -.88], [-.4, -.45, -.6, .1], [-.62, .74]], .06, .02, M.cloth(o.cloth)); f.position.z = .08; g.add(f);
    g.add(mesh(new THREE.SphereGeometry(.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.gold(o.trim), 0, .15, .1, Math.PI / 2));
    if (o.v[1] < .65) { const cr = ext([[-.06, .78], [.06, .78], [.06, -.75], [-.06, -.75]], .02, .015, M.gold(o.trim)); cr.position.z = .12; g.add(cr); const c2 = ext([[-.55, .48], [.55, .48], [.55, .36], [-.55, .36]], .02, .015, M.gold(o.trim)); c2.position.z = .12; g.add(c2); }
    gemAt(g, o.gem, .09, 0, .15, .32); return g; },
  quiver(o) { const g = new THREE.Group(); g.add(lathe([[.0, -1], [.3, -.98], [.34, -.6], [.38, .5], [.4, .62], [.36, .62]], M.leather(o.leather), 32));
    for (const y of [-.7, .4]) g.add(mesh(new THREE.TorusGeometry(.37, .035, 8, 32), M.gold(o.trim), 0, y, 0, Math.PI / 2));
    for (let i = 0; i < 5; i++) { const a = i * 1.3, x = Math.cos(a) * .17, z = Math.sin(a) * .17; g.add(mesh(new THREE.CylinderGeometry(.015, .015, 1.1, 6), M.wood(o.wood), x, .9, z, 0, 0, (i - 2) * .05)); g.add(mesh(new THREE.BoxGeometry(.02, .26, .14), M.cloth(i % 2 ? '#e9e2d0' : '#b33a2a'), x, 1.32, z, 0, a, (i - 2) * .05)); }
    gemAt(g, o.gem, .08, 0, -.15, .38); return g; },
  orb(o) { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.55, 40, 28), M.gem(o.gem || '#7fc0ff', .7), 0, .35, 0));
    g.add(lathe([[0, -.85], [.45, -.82], [.5, -.7], [.3, -.55], [.36, -.3], [.2, -.2]], M.gold(o.trim)));
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; g.add(tube([[Math.cos(a) * .25, -.25, Math.sin(a) * .25], [Math.cos(a) * .52, .05, Math.sin(a) * .52], [Math.cos(a) * .45, .5, Math.sin(a) * .45]], .035, M.gold(o.trim))); } return g; },
  charm(o) { const g = new THREE.Group(); g.add(ext([[0, .9], [.5, .1], [0, -.9], [-.5, .1]], .14, .05, M.gold(o.trim)));
    gemAt(g, o.gem || '#bfeee6', .3, 0, .05, .12); g.add(mesh(new THREE.TorusGeometry(.1, .03, 8, 16), M.gold(o.trim), 0, 1.0, 0));
    for (const s of [-1, 1]) g.add(tube([[.25 * s, -.45, 0], [.35 * s, -.9, .05], [.3 * s, -1.25, 0]], .025, M.cloth(o.cloth || '#a83a2a'))); return g; },
  tome(o) { const g = new THREE.Group(); g.add(mesh(RB(1.1, 1.4, .3, .05), M.leather(o.cloth || o.leather), 0, 0, 0)); g.add(mesh(new THREE.BoxGeometry(1.0, 1.32, .24), M.paper(), .07, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(.16, .16, 1.42, 16, 1, false, Math.PI, Math.PI), M.leather(o.cloth || o.leather), -.55, 0, 0));
    for (const [x, y] of [[-.45, .6], [.45, .6], [-.45, -.6], [.45, -.6]]) g.add(mesh(RB(.24, .24, .34, .04), M.gold(o.trim), x, y, 0));
    g.add(mesh(new THREE.TorusGeometry(.26, .04, 8, 28), M.gold(o.trim), 0, 0, .16)); gemAt(g, o.gem, .14, 0, 0, .2); return g; },
  helm(o) { const g = new THREE.Group();
    if (o.base === 'Circlet') { g.add(mesh(new THREE.TorusGeometry(.7, .09, 12, 56), M.gold(o.metal), 0, 0, 0, Math.PI / 2 - .35)); g.rotation.x = -.75;
      for (let k = -2; k <= 2; k++) { const a = Math.PI / 2 + k * .32; g.add(mesh(new THREE.ConeGeometry(.07, k ? .22 : .38, 4), M.gold(o.metal), Math.cos(a) * .7, .14 + Math.sin(a) * .22 + (k ? .04 : .1), Math.sin(a) * .66, -.35)); }
      gemAt(g, o.gem || '#bfeee6', .14, 0, .16, .68, -.35); return g; }
    if (o.base === 'Leather Hood') { const lm = M.leather(o.leather), sh = new THREE.Mesh(G(new THREE.SphereGeometry(.7, 40, 24, Math.PI / 2 + .75, Math.PI * 2 - 1.5, 0, Math.PI * .72)), lm); sh.material = lm; sh.scale.set(1, 1.2, 1.1); g.add(sh);
      const ins = new THREE.Mesh(G(new THREE.SphereGeometry(.66, 32, 20, 0, Math.PI * 2, 0, Math.PI * .7)), M.black()); ins.scale.set(.98, 1.18, 1.05); g.add(ins);
      g.add(lathe([[.45, -.98], [.86, -.72], [.8, -.5], [.64, -.32]], lm)); g.add(mesh(new THREE.ConeGeometry(.2, .55, 16), lm, 0, .72, -.55, -1.1));
      g.add(mesh(new THREE.TorusGeometry(.66, .04, 8, 40, Math.PI * .5), M.gold(o.trim), 0, 0, 0, 0, -Math.PI / 2 + .02, Math.PI * .25, [1.05, 1.2, 1.1])); gemAt(g, o.gem, .08, 0, -.8, .66); return g; }
    g.add(lathe([[.6, -.72], [.62, -.3], [.64, .1], [.6, .4], [.48, .62], [.3, .76], [.0, .8]], M.steel(o.metal), 56));
    g.add(mesh(new THREE.TorusGeometry(.61, .05, 10, 56), M.gold(o.trim), 0, -.7, 0, Math.PI / 2)); g.add(mesh(new THREE.TorusGeometry(.645, .035, 10, 56), M.gold(o.trim), 0, .08, 0, Math.PI / 2));
    for (const s of [-1, 1]) g.add(mesh(RB(.42, .07, .2, .03), M.black(), .24 * s, -.08, .58, 0, -.35 * s));
    g.add(mesh(RB(.09, .7, .12, .03), M.gold(o.trim), 0, -.38, .62));
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(.025, .025, .1, 8), M.black(), (.18 + i * .09) * s, -.42, .6 - i * .03, Math.PI / 2));
    if (o.v[1] < .5) { const pl = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pl.push([0, .8 + Math.sin(t * Math.PI) * .25, .1 - t * 1.0]); } g.add(tube(pl, .07, M.cloth(o.cloth || '#a01828'))); }
    else g.add(mesh(new THREE.TorusGeometry(.8, .045, 8, 40, Math.PI * .9), M.gold(o.trim), 0, 0, 0, 0, Math.PI / 2, Math.PI * .05));
    gemAt(g, o.gem, .1, 0, .3, .64); return g; },
  chest(o) { const g = new THREE.Group(), robe = o.base === 'Silk Robe', lea = o.base === 'Leather Jerkin', body = robe ? M.cloth(o.cloth) : lea ? M.leather(o.leather) : M.steel(o.metal);
    const prof = robe ? [[.78, -1.25], [.62, -.6], [.6, .05], [.72, .42], [.62, .66], [.32, .8]] : [[.5, -.78], [.56, -.45], [.68, .05], [.76, .42], [.66, .66], [.34, .8]];
    g.add(lathe(prof, body)); g.children[0].scale.set(1, 1, .62);
    if (!robe && !lea) g.add(mesh(new THREE.SphereGeometry(.5, 28, 14, -Math.PI * .35, Math.PI * .7, Math.PI * .25, Math.PI * .4), M.steel(o.metal), 0, .02, .02, 0, 0, 0, [.9, 1.3, .9]));
    if (!robe) for (const s of [-1, 1]) { const sh = new THREE.Group(), pm = lea ? M.leather(o.leather) : M.steel(o.metal); sh.add(mesh(new THREE.SphereGeometry(.36, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), pm, 0, 0, 0, 0, 0, 0, [1, .7, .95])); sh.add(mesh(new THREE.TorusGeometry(.355, .04, 8, 32), M.gold(o.trim), 0, 0, 0, Math.PI / 2, 0, 0, [1, .95, 1])); if (!lea) sh.add(mesh(new THREE.SphereGeometry(.3, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), pm, 0, -.16, 0, 0, 0, 0, [1.05, .6, 1])); sh.position.set(.7 * s, .56, 0); sh.rotation.z = -.5 * s; g.add(sh); }
    if (lea) for (let i = 0; i < 4; i++) g.add(mesh(RB(.3, .04, .04, .015), M.gold(o.trim), 0, .3 - i * .22, .47, 0, 0, i % 2 ? .4 : -.4));
    if (robe) { for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(.22, .3, .7, 20), M.cloth(o.cloth), .78 * s, .38, 0, 0, 0, .7 * s)); g.add(tube([[-.32, .78, .1], [0, .2, .4], [.32, .78, .1]], .045, M.gold(o.trim))); }
    g.add(mesh(new THREE.TorusGeometry(.34, .07, 10, 32), M.gold(o.trim), 0, .8, 0, Math.PI / 2, 0, 0, [1, .62, 1]));
    g.add(mesh(new THREE.TorusGeometry(robe ? .6 : .53, .07, 10, 40), robe ? M.gold(o.trim) : M.leather('#4a2a18'), 0, -.6, 0, Math.PI / 2, 0, 0, [1, .64, 1])); g.add(mesh(RB(.26, .2, .08, .03), M.gold(o.trim), 0, -.6, robe ? .4 : .36));
    gemAt(g, o.gem, .12, 0, .3, .48);
    if (!robe) for (let i = 0; i < 5; i++) g.add(mesh(RB(.2, .32, .05, .02), lea ? M.leather(o.leather) : M.dark(), -.4 + i * .2, -.86, .26, .12)); return g; },
  shoulders(o) { const g = new THREE.Group(), lea = o.base === 'Leather Mantle', m = lea ? M.leather(o.leather) : M.steel(o.metal);
    g.rotation.set(.85, 0, .25); for (let i = 0; i < 3; i++) { g.add(mesh(new THREE.SphereGeometry(.7 - i * .08, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, -i * .28, 0, 0, 0, 0, [1.15, .62, .95])); g.add(mesh(new THREE.TorusGeometry(.7 - i * .08, .035, 8, 40), M.gold(o.trim), 0, -i * .28, 0, Math.PI / 2, 0, 0, [1.15, .95, 1])); }
    if (!lea) g.add(mesh(new THREE.ConeGeometry(.12, .35, 16), M.dark(), 0, .55, 0)); else g.add(mesh(new THREE.SphereGeometry(.42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.cloth('#8f887c'), 0, .2, -.15, 0, 0, 0, [1.4, .5, 1]));
    gemAt(g, o.gem, .1, 0, .22, .58, -.6); return g; },
  bracers(o) { const g = new THREE.Group(); g.rotation.set(.35, 0, -.55); g.add(mesh(new THREE.CylinderGeometry(.42, .3, 1.3, 36, 1, false), M.leather(o.leather), 0, 0, 0));
    if (o.base !== 'Leather Bracers') g.add(mesh(new THREE.CylinderGeometry(.45, .37, .9, 36, 1, true, -Math.PI * .5, Math.PI), M.steel(o.metal), 0, 0, 0)); else for (const y of [-.25, 0, .25]) g.add(mesh(new THREE.TorusGeometry(.4 - y * .07, .025, 6, 32), M.leather('#2a1a10'), 0, y, 0, Math.PI / 2));
    for (const y of [.55, -.55]) g.add(mesh(new THREE.TorusGeometry(y > 0 ? .43 : .35, .05, 10, 36), M.gold(o.trim), 0, y, 0, Math.PI / 2)); gemAt(g, o.gem, .1, 0, 0, .46); return g; },
  belt(o) { const g = new THREE.Group(), sash = o.base === 'Sash'; g.rotation.x = -.55; g.add(mesh(new THREE.TorusGeometry(.75, .16, 4, 56), sash ? M.cloth(o.cloth) : M.leather(o.leather), 0, 0, 0, Math.PI / 2 - .35, 0, 0, [1, 1, 1.6]));
    if (sash) { g.add(mesh(new THREE.SphereGeometry(.18, 16, 12), M.cloth(o.cloth), .2, -.2, .72)); for (const s of [0, 1]) g.add(tube([[.2, -.25, .75], [.3 + s * .15, -.7, .8], [.25 + s * .25, -1.15, .7]], .07, M.cloth(o.cloth))); }
    else { g.add(mesh(RB(.5, .42, .12, .05), M.gold(o.trim), 0, -.26, .72, -.35)); g.add(mesh(RB(.32, .38, .18, .05), M.leather('#4a2a18'), -.62, -.28, .45, -.35, -.6)); }
    gemAt(g, o.gem, .12, sash ? .2 : 0, sash ? -.2 : -.28, sash ? .9 : .8, -.35); return g; },
  pants(o) { const g = new THREE.Group(), plate = o.base === 'Plate Tassets', m = plate ? M.cloth(o.cloth || '#4a3a5a') : M.leather(o.leather);
    for (const s of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(.27, .22, 1.5, 24), m, .25 * s, -.35, 0, 0, 0, .06 * s)); if (plate) g.add(mesh(new THREE.SphereGeometry(.26, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.steel(o.metal), .27 * s, -.2, .12, Math.PI / 2 - .2, 0, 0, [1, 1, .55])); }
    g.add(mesh(RB(1.0, .4, .55, .1), m, 0, .45, 0)); if (plate) for (const s of [-1, 1]) g.add(mesh(RB(.46, .5, .08, .04), M.steel(o.metal), .26 * s, .25, .3, -.15, 0, .1 * s));
    g.add(mesh(RB(1.04, .12, .58, .04), M.leather('#3a2414'), 0, .62, 0)); g.add(mesh(RB(.2, .14, .06, .02), M.gold(o.trim), 0, .62, .3)); gemAt(g, o.gem, .06, 0, .62, .34); return g; },
  boots(o) { const g = new THREE.Group(), gr = o.base === 'Greaves';
    g.add(ext([[-.25, 1], [.22, 1], [.24, .1], [.75, -.05, .78, -.4], [.78, -.55], [-.3, -.55], [-.3, -.1]], .38, .1, M.leather(o.leather)));
    if (gr) { g.add(ext([[.3, .02], [.75, -.05, .78, -.4], [.78, -.5], [.3, -.5]], .44, .05, M.steel(o.metal))); g.add(mesh(RB(.66, .2, .62, .06), M.steel(o.metal), -.02, .9, 0)); g.add(ext([[-.32, .85], [.26, .85], [.26, .1], [-.32, .1]], .5, .04, M.steel(o.metal))); }
    g.add(mesh(RB(1.2, .1, .62, .03), M.dark(), .24, -.62, 0)); for (const y of gr ? [.6, .35] : [.7, .45, .2]) g.add(mesh(RB(.6, .06, .62, .02), gr ? M.gold(o.trim) : M.leather('#2a1a10'), -.02, y, 0));
    gemAt(g, o.gem, .08, -.02, .6, .33); return g; },
  gloves(o) { const g = new THREE.Group(), gt = o.base === 'Gauntlets';
    g.add(ext([[-.4, -.9], [.4, -.9], [.42, .05], [.5, .2], [.58, .45, .38, .5], [.3, .3], [.3, 1.05, .2, 1.05], [.1, .4], [.07, 1.15, -.05, 1.15], [-.12, .4], [-.18, 1.05, -.28, 1.0], [-.32, .4], [-.4, .9, -.48, .82], [-.5, .3]], .3, .08, M.leather(o.leather)));
    if (gt) { for (let i = 0; i < 4; i++) g.add(mesh(RB(.17, .16, .42, .04), M.steel(o.metal), -.4 + i * .19, .55 + (i === 1 || i === 2 ? .12 : 0), 0)); g.add(mesh(RB(.8, .4, .44, .1), M.steel(o.metal), -.03, .05, 0)); }
    g.add(mesh(RB(1.0, .38, .5, .08), gt ? M.steel(o.metal) : M.leather(o.leather), 0, -.72, 0)); g.add(mesh(RB(1.04, .07, .54, .02), M.gold(o.trim), 0, -.55, 0));
    gemAt(g, o.gem, .08, 0, -.72, .27); return g; },
  ring(o) { const g = new THREE.Group(), band = o.base === 'Band', sig = o.base === 'Signet';
    g.add(mesh(new THREE.TorusGeometry(.55, band ? .18 : .12, 20, 56), M.gold(o.metal), 0, -.15, 0, .35, 0, 0, band ? [1, 1, 1.6] : null));
    if (sig) { g.add(mesh(new THREE.CylinderGeometry(.26, .22, .14, 28), M.gold(o.metal), 0, .42, 0)); g.add(mesh(new THREE.CylinderGeometry(.2, .2, .02, 28), M.gem(o.gem || '#3c3a48', .1), 0, .5, 0)); }
    else if (!band) { for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .78; g.add(mesh(new THREE.CylinderGeometry(.025, .03, .3, 6), M.gold(o.metal), Math.cos(a) * .17, .52, Math.sin(a) * .17, Math.sin(a) * .5, 0, -Math.cos(a) * .5)); }
      g.add(mesh(new THREE.CylinderGeometry(.18, .12, .14, 20), M.gold(o.metal), 0, .4, 0)); gemAt(g, o.gem || '#bfeee6', .24, 0, .58, 0, Math.PI / 2); }
    else for (let k = 0; k < 5; k++) { const a = -.6 + k * .3; gemAt(g, o.gem, .07, Math.sin(a) * .58, -.15 + Math.cos(a) * .58 * Math.cos(.35), Math.cos(a) * .58 * Math.sin(.35) + .1); }
    return g; },
  amulet(o) { const g = new THREE.Group(), pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2; pts.push([Math.sin(t) * .62, .98 - Math.cos(t) * .66, -Math.sin(t / 2) * .25]); }
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), true), link = G(new THREE.TorusGeometry(.045, .014, 5, 10)), gm = M.gold(o.metal);
    for (let i = 0; i < 52; i++) { const p = curve.getPoint(i / 52); const m = new THREE.Mesh(link, gm); m.position.copy(p); m.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(m); }
    g.add(mesh(new THREE.TorusGeometry(.08, .025, 8, 16), gm, 0, .3, 0));
    const shp = o.base === 'Talisman' ? [[0, .22], [.3, .1], [.38, -.3], [0, -.78], [-.38, -.3], [-.3, .1]] : o.base === 'Pendant' ? [[0, .22], [.3, .12, .36, -.25], [.3, -.65, 0, -.72], [-.3, -.65, -.36, -.25], [-.3, .12, 0, .22]] : [[0, .22], [.38, -.18], [0, -.78], [-.38, -.18]];
    g.add(ext(shp, .08, .05, gm)); gemAt(g, o.gem || '#bfeee6', .22, 0, -.22, .1); return g; },
};

// ---------- which model, which colours ----------
function spec(it) {
  const L = itemLook(it), mc = L.mat[1], acc = L.acc === mc ? '#3a3440' : L.acc;
  const o = { v: L.v, base: it.base, trim: acc, gem: it.rar > 0 || L.v[1] > .5 ? L.gem[1] : null };
  o[{ metal: 'metal', wood: 'wood', leather: 'leather', cloth: 'cloth', jewel: 'metal' }[L.kind]] = mc;
  if (L.kind === 'jewel' && it.slot === 'offhand') o.trim = mc;
  let k = it.slot;
  if (k === 'weapon') k = it.wt === 'fist' ? 'fist' : it.wt; else if (k === 'offhand') k = ({ Shield: 'shield', Quiver: 'quiver', Orb: 'orb', Charm: 'charm', Tome: 'tome' })[it.base];
  if (!B[k]) return null; return { k, o };
}
const TILT = { sword: -.75, axe: -.55, maul: -.55, staff: -.5, bow: -.3, quiver: -.3 }, TILT_TALL = { sword: -.12, axe: -.12, maul: -.1, staff: -.1, bow: -.08, quiver: -.12 };
let curG = null;
function stage(sp, tall, yaw, pitch) {
  if (curG) { scene.remove(curG); for (const g of GEOS) g.dispose(); GEOS = []; curG = null; }
  const g = B[sp.k](sp.o), w = new THREE.Group(); { const tz = (tall ? TILT_TALL : TILT)[sp.k]; if (tz !== undefined) g.rotation.z = tz; } w.add(g); w.rotation.set(pitch, yaw, 0); scene.add(w); curG = w;
  const box = new THREE.Box3().setFromObject(w), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); w.position.sub(c);
  return { sz };
}
function frame(sz, asp, pad) { cam.aspect = asp; cam.updateProjectionMatrix(); const r = Math.max(sz.x / asp, sz.y) * .5 * pad; cam.position.set(0, 0, r / Math.tan(THREE.MathUtils.degToRad(12)) + sz.z * .5); cam.lookAt(0, 0, 0); }

// ---------- bag pictures: rendered once, kept as image addresses ----------
const DPR = Math.min(2, window.devicePixelRatio || 1), ICON = Math.round(88 * DPR);
const cache = new Map(), queue = [], queued = new Set();
const out2d = document.createElement('canvas'), o2 = out2d.getContext('2d');
function iconKey(it, tall) { const sp = spec(it); if (!sp) return null; return sp.k + '|' + (sp.o.base || '') + '|' + [sp.o.metal, sp.o.trim, sp.o.gem, sp.o.wood, sp.o.leather, sp.o.cloth].join(',') + '|' + sp.o.v.map(x => x.toFixed(2)).join(',') + (tall ? '|t' : ''); }
function drawIcon(job) {
  env(); const w = job.tall ? ICON : ICON, h = job.tall ? ICON * 2 : ICON; R.setSize(w, h, false);
  const { sz } = stage(job.sp, job.tall, -.5, .25); frame(sz, w / h, 1.06); R.render(scene, cam);
  out2d.width = w; out2d.height = h; o2.clearRect(0, 0, w, h); o2.drawImage(cv, 0, 0);
  return new Promise(res => out2d.toBlob(b => { if (b && store) { try { store.put(keyReq(job.key), new Response(b, { headers: { 'Content-Type': 'image/png' } })).catch(() => { }); } catch (e) { } } res(b ? URL.createObjectURL(b) : null); }, 'image/png'));
}
let pumping = false;
function pump() {
  if (pumping || !queue.length) return; pumping = true;
  const step = async () => { const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 8) { const job = queue.shift(); queued.delete(job.key); if (cache.has(job.key)) continue; let url = null; try { url = await drawIcon(job); } catch (e) { url = null; }
      cache.set(job.key, url); for (const el of document.querySelectorAll('[data-m3="' + CSS.escape(job.key) + '"]')) { if (!url) { el.classList.add('m3f'); continue; } const im = new Image(); im.className = 'm3 in'; im.alt = ''; im.draggable = false; im.src = url; el.replaceWith(im); } }
    if (queue.length) setTimeout(step, 4); else pumping = false; };
  setTimeout(step, 0);
}
// what ui.js asks for: the picture if it is ready, or { key } and it gets drawn soon (the slot stays empty meanwhile, and the picture fades in; if it can't be drawn, the flat icon shows)
function icon(it, tall) {
  const key = iconKey(it, tall); if (!key) return null; if (cache.has(key)) { const u = cache.get(key); return u ? { url: u } : null; }
  if (!queued.has(key)) { const sp = spec(it); queue.push({ key, sp, tall }); queued.add(key); pump(); } return { key };
}

// ---------- the big turning showcase ----------
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sc = { el: null, cv: null, it: null, sp: null, yaw: -.5, raf: 0, last: 0 };
function showcase(holder, it) {
  const sp = spec(it); if (!sp) { holder.remove(); return; }
  if (!sc.cv) { sc.cv = document.createElement('canvas'); sc.cv.className = 'show3c'; sc.cv.style.cssText = 'display:block;width:100%;height:100%'; sc.ctx = sc.cv.getContext('2d'); }
  if (sc.it !== it) { sc.it = it; sc.sp = sp; sc.yaw = -.5; sc.sz = null; }
  holder.appendChild(sc.cv); sc.el = holder;
  const r = holder.getBoundingClientRect(), d = Math.min(1.5, window.devicePixelRatio || 1), W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
  if (sc.cv.width !== W || sc.cv.height !== H) { sc.cv.width = W; sc.cv.height = H; }
  draw(0); if (!sc.raf && !still) { sc.last = performance.now(); sc.raf = requestAnimationFrame(loop); }
}
function draw(dt) {
  env(); const tall = ['sword', 'axe', 'maul', 'staff', 'bow', 'quiver'].includes(sc.sp.k), W = sc.cv.width, H = sc.cv.height; R.setSize(W, H, false);
  sc.yaw += dt * .6; const { sz } = stage(sc.sp, tall, sc.yaw, .2); if (!sc.sz) sc.sz = new THREE.Vector3(Math.max(sz.x, sz.z), sz.y, Math.max(sz.x, sz.z)); frame(sc.sz, W / H, 1.02); R.render(scene, cam);
  sc.ctx.clearRect(0, 0, W, H); sc.ctx.drawImage(cv, 0, 0);
}
function loop(t) {
  const tip = document.getElementById('tip');
  if (!sc.cv.isConnected || !tip || tip.classList.contains('hide') || document.hidden) { sc.raf = 0; return; }
  const dt = Math.min(.1, (t - sc.last) / 1000); if (dt >= 1 / 31) { sc.last = t; try { draw(dt); } catch (e) { sc.raf = 0; return; } } sc.raf = requestAnimationFrame(loop);
}

// a quick check that this device can draw at all; if not, ui.js shows the flat icons
let ok = true; try { R.setSize(4, 4, false); R.render(scene, cam); ok = !!R.getContext() && !R.getContext().isContextLost(); } catch (e) { ok = false; }
// build 0114: software drawing (no graphics card) takes seconds per picture, so keep the flat icons there rather than leave slots empty or switch looks late
try { const gl = R.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'), name = String(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ''); if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) ok = false; } catch (e) { }
cv.addEventListener('webglcontextlost', e => { e.preventDefault(); ok = false; });
// build 0130: finished pictures are kept on the device for this build (Cache Storage), so after a reload every item shows its 3D picture straight away.
// ui.js waits for `ready` (1.5 s at most) before it draws the bag. A new build gets a fresh store and the old one is cleared, so a picture is never out of date.
let store = null;
const CN = 'ob-items3d-' + (new URL(import.meta.url).searchParams.get('v') || '0') + '-' + ICON, keyReq = k => new Request(new URL('__items3d/' + encodeURIComponent(k), location.href).href);
const ready = Promise.race([new Promise(r => setTimeout(r, 1500)), (async () => { try { if (!ok || !self.caches || !window.isSecureContext) return;
  for (const k of await caches.keys()) if (k.startsWith('ob-items3d-') && k !== CN) caches.delete(k).catch(() => { });
  const st = await caches.open(CN), reqs = await st.keys();
  await Promise.all(reqs.map(async r => { try { const res = await st.match(r); if (!res) return; const b = await res.blob(), k = decodeURIComponent(new URL(r.url).pathname.split('/').pop()); if (!cache.has(k)) cache.set(k, URL.createObjectURL(b)); } catch (e) { } }));
  store = st; } catch (e) { } })()]);
export default { get ok() { return ok; }, ready, icon, showcase, spec };
