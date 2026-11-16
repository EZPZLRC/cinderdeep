'use strict';
// Minimal instanced WebGL2 renderer: lit + shadow-mapped opaque pass, additive glow pass.
const GLX = (() => {
  const STRIDE = 22, SH = 2048;
  let gl, cv, pMain, pDepth, pGlow, pPost, pMainS, pDepthS, fbo, shTex, post = null;
  const geo = {}, sets = { stat: {}, dyn: {}, glow: {}, xr: {} };
  const view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16), ivp = new Float32Array(16),
    lvp = new Float32Array(16), t1 = new Float32Array(16), t2 = new Float32Array(16), M = new Float32Array(16);
  const cam = { eye: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1] };
  const env = { sun: [.4, .8, .45], sunC: [1, 1, 1], sky: [.3, .3, .4], gnd: [.1, .1, .1], fog: [0, 0, 0], fogN: 45, fogF: 85, player: [0, 0, 0], lightR: 26, t: 0, q: 2, wet: .5, mist: .3, gr: [.45, .2, .05, 0], ge: [1, .4, .1], dof: .8, ao: .9, scale: 1, shadows: true, pt: null, ptc: [0, 0, 0], ptr: 15, scat: .035 };
  const lights = [];
  const ccache = new Map();
  function col(h) { let c = ccache.get(h); if (!c) { c = [Math.pow((h >> 16 & 255) / 255, 2.2), Math.pow((h >> 8 & 255) / 255, 2.2), Math.pow((h & 255) / 255, 2.2)]; ccache.set(h, c); } return c; }

  function mul(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    } return o;
  }
  function persp(o, fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
  function ortho(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; }
  function lookAt(o, e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1; return o;
  }
  function invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return o; det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det; return o;
  }

  // ---- geometry ----
  function gBox() {
    const v = [], f = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const n of f) {
      const u = [n[1], n[2], n[0]], w = [n[2], n[0], n[1]];
      const Pt = (a, b) => [(n[0] + u[0] * a + w[0] * b) * .5, (n[1] + u[1] * a + w[1] * b) * .5, (n[2] + u[2] * a + w[2] * b) * .5];
      const q = [Pt(-1, -1), Pt(1, -1), Pt(1, 1), Pt(-1, 1)];
      for (const i of [0, 1, 2, 0, 2, 3]) v.push(...q[i], ...n);
    } return v;
  }
  function gSphere(S, Rg) {
    const v = [];
    const pt = (i, j) => { const th = i / S * Math.PI * 2, ph = j / Rg * Math.PI; const x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th); return [x * .5, y * .5, z * .5, x, y, z]; };
    for (let j = 0; j < Rg; j++) for (let i = 0; i < S; i++) { const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1); v.push(...a, ...b, ...c, ...a, ...c, ...d); }
    return v;
  }
  // capsule: a rounded limb with smooth ends, fitted inside the unit box so it scales like a cylinder
  function gCap(S, R) {
    const v = [], ring = [], k = .5;
    for (let j = 0; j <= R; j++) { const ph = j / R * Math.PI, y = Math.cos(ph), r = Math.sin(ph), cy = y > 0 ? .25 + y * .25 : -.25 + y * .25; ring.push([r * k, cy, y, r]); }
    for (let j = 0; j < R; j++) for (let i = 0; i < S; i++) { const a0 = i / S * 6.28319, a1 = (i + 1) / S * 6.28319, P = (rg, a) => [Math.cos(a) * rg[0], rg[1], Math.sin(a) * rg[0], Math.cos(a) * rg[3], rg[2], Math.sin(a) * rg[3]], A = P(ring[j], a0), B = P(ring[j], a1), C = P(ring[j + 1], a1), D = P(ring[j + 1], a0); v.push(...A, ...B, ...C, ...A, ...C, ...D); }
    return v;
  }
  // rounded box: a soft-edged block for armour plates, torsos and heads
  function gRBox(S, Rg, e) {
    const v = [], sg = x => x < 0 ? -1 : 1, pw = (x, p) => sg(x) * Math.pow(Math.abs(x), p);
    const pt = (i, j) => { const th = i / S * Math.PI * 2, ph = j / Rg * Math.PI, x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th); const nx = pw(x, 2 - e), ny = pw(y, 2 - e), nz = pw(z, 2 - e), nl = Math.hypot(nx, ny, nz) || 1; return [pw(x, e) * .5, pw(y, e) * .5, pw(z, e) * .5, nx / nl, ny / nl, nz / nl]; };
    for (let j = 0; j < Rg; j++) for (let i = 0; i < S; i++) { const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1); v.push(...a, ...b, ...c, ...a, ...c, ...d); }
    return v;
  }
  function gCyl(S, tr) {
    const v = [];
    for (let i = 0; i < S; i++) {
      const a0 = i / S * 6.28319, a1 = (i + 1) / S * 6.28319, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), ny = .5 * (1 - tr);
      const n0 = [c0, ny, s0], n1 = [c1, ny, s1], b0 = [c0 * .5, -.5, s0 * .5], b1 = [c1 * .5, -.5, s1 * .5], T0 = [c0 * .5 * tr, .5, s0 * .5 * tr], T1 = [c1 * .5 * tr, .5, s1 * .5 * tr];
      v.push(...b0, ...n0, ...b1, ...n1, ...T1, ...n1, ...b0, ...n0, ...T1, ...n1, ...T0, ...n0);
      v.push(0, -.5, 0, 0, -1, 0, ...b1, 0, -1, 0, ...b0, 0, -1, 0);
      if (tr > 0) v.push(0, .5, 0, 0, 1, 0, ...T0, 0, 1, 0, ...T1, 0, 1, 0);
    } return v;
  }
  // build 0037: a smooth sculpted body part. rings run bottom to top as [y, half width, front depth, back depth, forward shift] in the unit box; the
  // surface is smoothed between rings (Catmull-Rom) and closed at both ends, so torsos, limbs and heads read as one soft form instead of stacked balls
  function gLoft(rings, S, sub) {
    const cr = (a, b, c, d, t) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t), R = [];
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sub; k++) { const t = k / sub, a = rings[Math.max(0, i - 1)], b = rings[i], c = rings[i + 1], d = rings[Math.min(rings.length - 1, i + 2)]; R.push(b.map((_, j) => cr(a[j], b[j], c[j], d[j], t))); }
    R.push(rings[rings.length - 1].slice());
    const P = R.map(r => { const row = []; for (let i = 0; i <= S; i++) { const an = i / S * 6.28319, sn = Math.sin(an), dz = r[3] + (r[2] - r[3]) * (.5 + .5 * sn); row.push([Math.cos(an) * r[1], r[0], r[4] + sn * dz]); } return row; });
    const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const N = P.map((row, j) => row.map((q, i) => { const up = P[Math.min(P.length - 1, j + 1)][i], dn = P[Math.max(0, j - 1)][i], rt = row[(i + 1) % S], lf = row[(i + S - 1) % S]; return nrm(crs(sub3(up, dn), sub3(rt, lf))); }));
    const v = [], V = (j, i) => v.push(...P[j][i], ...N[j][i]);
    for (let j = 0; j < P.length - 1; j++) for (let i = 0; i < S; i++) { V(j, i); V(j + 1, i + 1); V(j, i + 1); V(j, i); V(j + 1, i); V(j + 1, i + 1); }
    for (const [j, up] of [[0, -1], [P.length - 1, 1]]) { const c = [0, P[j][0][1], R[j][4]]; for (let i = 0; i < S; i++) { const a = P[j][i], b = P[j][i + 1]; if (up > 0) v.push(...c, 0, 1, 0, ...b, 0, 1, 0, ...a, 0, 1, 0); else v.push(...c, 0, -1, 0, ...a, 0, -1, 0, ...b, 0, -1, 0); } }
    return v;
  }
  const BODY = { // build 0037: hero body shapes
    skirt: [[-.5, .5, .48, .48, 0], [-.2, .46, .44, .44, 0], [.15, .42, .4, .4, 0], [.5, .4, .37, .37, 0]], // build 0038: chainmail skirt, flaring from the hips
    hood: [[-.38, .48, .3, .37, -.04], [-.3, .4, .25, .34, -.06], [-.2, .31, .2, .33, -.07], [-.08, .28, .16, .31, -.06], [.08, .28, .16, .3, -.06], [.25, .24, .15, .27, -.07], [.36, .13, .1, .17, -.11], [.42, .02, .02, .04, -.16]], // build 0038: a deep cowl that drapes onto the shoulders, open where the face is
    torso: [[-.5, .34, .3, .3, 0], [-.3, .36, .32, .32, 0], [-.1, .42, .38, .34, .01], [.1, .48, .44, .36, .02], [.25, .5, .42, .34, .01], [.36, .48, .34, .3, 0], [.44, .36, .24, .24, -.01], [.5, .16, .15, .15, 0]],
    uarm: [[-.5, .2, .2, .2, 0], [-.42, .3, .3, .3, 0], [-.22, .34, .36, .34, 0], [.02, .38, .43, .36, .01], [.24, .44, .42, .42, 0], [.42, .42, .4, .4, 0], [.5, .22, .2, .2, 0]],
    farm: [[-.5, .2, .18, .18, 0], [-.42, .27, .26, .26, 0], [-.18, .34, .32, .32, 0], [.15, .44, .42, .4, 0], [.4, .46, .44, .42, 0], [.5, .3, .28, .28, 0]],
    thigh: [[-.5, .22, .22, .22, 0], [-.38, .32, .34, .3, 0], [-.1, .4, .43, .38, .01], [.2, .46, .48, .44, .01], [.42, .48, .46, .46, 0], [.5, .32, .3, .3, 0]],
    calf: [[-.5, .2, .18, .18, 0], [-.36, .26, .26, .26, 0], [-.1, .36, .32, .42, -.02], [.18, .42, .36, .5, -.04], [.4, .4, .38, .38, 0], [.5, .24, .22, .22, 0]],
    head: [[-.5, .1, .05, .05, .28], [-.43, .26, .12, .2, .17], [-.3, .36, .3, .3, .1], [-.15, .42, .36, .38, .06], [0, .46, .38, .44, .03], [.1, .47, .4, .46, .02], [.2, .48, .4, .48, 0], [.33, .44, .32, .44, -.02], [.43, .32, .22, .32, -.03], [.5, .1, .06, .08, -.03]]
  };
  function gTuft(B) {
    const v = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let b = 0; b < B; b++) {
      const a = b / B * 6.28319 + r() * .7, dx = Math.cos(a), dz = Math.sin(a), L = b ? .16 + r() * .34 : .04, H = b ? .55 + r() * .45 : 1, w = .05 + r() * .03, px = -dz, pz = dx;
      const nl = Math.hypot(dx * .35, 1, dz * .35), n = [dx * .35 / nl, 1 / nl, dz * .35 / nl], pt = [];
      for (let k = 0; k <= 3; k++) { const t = k / 3, o = L * t * t + .05 * t, ww = w * (1 - t * .85); pt.push([dx * o - px * ww, H * t - .5, dz * o - pz * ww], [dx * o + px * ww, H * t - .5, dz * o + pz * ww]); }
      for (let k = 0; k < 3; k++) { const A = pt[k * 2], Bq = pt[k * 2 + 1], C = pt[k * 2 + 2], D = pt[k * 2 + 3]; v.push(...A, ...n, ...Bq, ...n, ...D, ...n, ...A, ...n, ...D, ...n, ...C, ...n); }
    } return v;
  }
  function gSect(S, half) { /* build 0048: a thin slice of a disc pointing along +z, for ground cones */ const v = []; for (let i = 0; i < S; i++) { const a0 = -half + 2 * half * i / S, a1 = -half + 2 * half * (i + 1) / S; v.push(0, 0, 0, 0, 1, 0, Math.sin(a0) * .5, 0, Math.cos(a0) * .5, 0, 1, 0, Math.sin(a1) * .5, 0, Math.cos(a1) * .5, 0, 1, 0); } return v; }
  function gDisc(S, inner) {
    const v = [];
    for (let i = 0; i < S; i++) {
      const a0 = i / S * 6.28319, a1 = (i + 1) / S * 6.28319, c0 = Math.cos(a0) * .5, s0 = Math.sin(a0) * .5, c1 = Math.cos(a1) * .5, s1 = Math.sin(a1) * .5;
      if (!inner) v.push(0, 0, 0, 0, 1, 0, c1, 0, s1, 0, 1, 0, c0, 0, s0, 0, 1, 0);
      else v.push(c0 * inner, 0, s0 * inner, 0, 1, 0, c1 * inner, 0, s1 * inner, 0, 1, 0, c1, 0, s1, 0, 1, 0, c0 * inner, 0, s0 * inner, 0, 1, 0, c1, 0, s1, 0, 1, 0, c0, 0, s0, 0, 1, 0);
    } return v;
  }
  function addGeo(name, arr) { const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); geo[name] = { vbo, count: arr.length / 6 }; }

  // ---- shaders ----
  const N3 = `float h3(vec3 p){uvec3 q=uvec3(ivec3(p))*uvec3(1597334673U,3812015801U,2798796415U);uint n=(q.x^q.y^q.z)*1597334673U;n^=n>>15;n*=2246822519U;n^=n>>13;return float(n>>8)*(1./16777216.);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
  const WPOS = `uniform float uT;
vec4 wpos(mat4 m,vec3 p,vec3 n,float mat){vec4 w=m*vec4(p,1.);
 if(mat>1.5&&mat<3.5){float sc=length(m[0].xyz);vec3 q=w.xyz;float d=n3(q*1.3)+.5*n3(q*2.9)-.75;vec3 wn=normalize(mat3(m)*n);w.xyz+=wn*d*min(.55,sc*.17);
  if(mat<2.5){float hg=(p.y+.5)*length(m[1].xyz);w.x+=sin(uT*1.3+w.x*.35+w.z*.27)*.05*hg;w.z+=cos(uT*1.1+w.x*.3)*.03*hg;}}
 if(mat>4.5&&mat<5.5){float hg=(p.y+.5);hg*=hg*length(m[1].xyz);w.x+=sin(uT*1.6+w.x*.5+w.z*.4)*.12*hg;w.z+=cos(uT*1.3+w.x*.45)*.08*hg;}
 return w;}`;
  const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in mat4 iM; layout(location=6) in vec4 iC; layout(location=7) in vec2 iE;
uniform mat4 uVP,uLVP; uniform float uOut; uniform vec3 uEye; out vec3 vW,vN,vL,vO; out vec4 vC; out vec2 vE; out vec4 vS;
${N3}
${WPOS}
void main(){vec4 w=wpos(iM,aP,aN,iE.y);vW=w.xyz;vL=aP;mat3 m=mat3(iM);vec3 sc=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));vN=normalize(m*(aN/max(sc,vec3(1e-6))));vO=aP*sqrt(sc);if(uOut>0.){w.xyz+=vN*uOut+normalize(w.xyz-uEye)*uOut*3.;}vC=iC;vE=iE;vS=uLVP*w;gl_Position=uVP*w;}`;
  const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW,vN,vL,vO; in vec4 vC; in vec2 vE; in vec4 vS;
uniform sampler2DShadow uSh; uniform vec3 uSun,uSunC,uSky,uGnd,uFog,uEye,uPl; uniform vec2 uFogR; uniform float uLR,uQ,uT,uWet,uMist,uRim,uOut; uniform vec4 uGr; uniform vec3 uGe; uniform vec4 uLP[8]; uniform vec3 uLC[8]; uniform vec4 uTP; uniform vec3 uTC; uniform float uTR,uScat; out vec4 o;
float h(vec2 p){uvec2 q=uvec2(ivec2(p))*uvec2(1597334673U,3812015801U);uint n=(q.x^q.y)*1597334673U;n^=n>>15;n*=2246822519U;n^=n>>13;return float(n>>8)*(1./16777216.);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
${N3}
void main(){if(uOut>0.){o=vec4(.016,.012,.009,1.);return;}float mat=vE.y;
 if(uRim==0.&&((mat>1.5&&mat<3.5)||(mat>10.5&&mat<14.5))&&vW.y>2.3){float hd=length(vec2(vW.x,vW.z-(vW.y-1.)*.72)-uPl.xz);if(hd<4.2){float th=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(th>smoothstep(3.55,4.15,hd))discard;}} // whatever stands between the camera and the hero thins out so you can always see the fight
 vec3 n=normalize(vN);vec3 a=vC.rgb;float spec=.12,shin=20.,wrap=0.,ao=1.,wet=0.;vec3 ex=vec3(0.);
 if(mat>0.&&mat<1.5){
  /* build 0044: floors. Grass, earth, stone and ash meet in soft height blends; warped, rotated noise means no pattern ever repeats */
  vec2 p=vW.xz,pw=p;const mat2 R=mat2(.8,.6,-.6,.8);if(uQ>.5)pw+=(vec2(ns(p*.07+3.),ns(p*.07+17.))-.5)*7.;
  float big=ns(pw*.045)*.55+ns(R*pw*.11+5.)*.3+ns(R*R*pw*.27+9.)*.15,fine=ns(R*pw*1.15+2.),micro=ns(pw*5.3+7.),lum=dot(a,vec3(.3,.5,.2));
  vec3 cG=a*(.74+.5*fine)*(.86+.28*ns(R*pw*.5+4.)),cD=vec3(lum)*vec3(1.5,1.16,.84)*(.72+.5*fine),cS=(mix(vec3(lum*1.3),a,.22)+.01)*(.86+.28*micro),cA=vec3(.04,.036,.033)*(.6+.8*micro)+lum*.22;
  float hG=.5+(fine-.5)*.3,hD=uGr.x*(big*1.7-.38)+(fine-.5)*.28,hS=uGr.y*(ns(R*pw*.055+40.)*1.8-.5)+(micro-.5)*.14,hA=uGr.z*(ns(R*pw*.08+60.)*1.7-.35)+(fine-.5)*.22,mx=max(max(hG,hD),max(hS,hA))-.11;
  vec4 w=max(vec4(hG,hD,hS,hA)-mx,0.);w/=w.x+w.y+w.z+w.w;
  if(uQ>.5&&w.z>.01){vec2 sp=pw*.8,ip=floor(sp),fp=fract(sp),id=ip;float d1=8.,d2=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),r=g+.15+.7*vec2(h(ip+g),h(ip+g+57.))-fp;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=ip+g;}else if(d<d2)d2=d;}
   float mort=1.-smoothstep(.05,.16,sqrt(d2)-sqrt(d1));cS*=(.74+.46*h(id+3.))*(1.-.6*mort);cS=mix(cS,cG*.7,mort*.3*(1.-uGr.z));n=normalize(n+vec3(h(id+5.)-.5,0.,h(id+9.)-.5)*.3*(1.-mort)*w.z);}
  a=cG*w.x+cD*w.y+cS*w.z+cA*w.w;a*=1.-.22*smoothstep(.8,.95,ns(R*R*R*pw*2.7+20.))*(w.x+w.y);
  if(uQ>.5){float f4=ns(pw*19.),f5=ns(pw*vec2(31.,5.)+fine*4.);a*=.86+.28*f4;a=mix(a,a*vec3(1.25,1.2,.8),smoothstep(.72,.9,f5)*.45*w.x);n=normalize(n+(vec3(ns(pw*2.3+3.)-.5,0.,ns(pw*2.3+9.)-.5)*.5+vec3(f4-.5,0.,ns(pw*19.+7.)-.5)*.3)*(1.-w.z*.7));}
  spec=.03+.07*w.z;if(uGr.w>0.&&w.w>.2)ex+=uGe*uGr.w*w.w*(1.-smoothstep(0.,.035,abs(ns(R*pw*.6+80.)-.5)))*smoothstep(.45,.7,ns(pw*.3+90.))*(.6+.4*sin(uT*1.3+big*25.))*2.;
  if(uQ>.5&&uWet>0.&&vN.y>.9){wet=smoothstep(.6,.68,ns(p*.17+31.)*.68+ns(p*.49+7.)*.32)*uWet*(1.-w.w);a*=mix(1.,.42,wet);spec=mix(spec,.9,wet);shin=mix(shin,110.,wet);n=normalize(mix(n,vec3(sin(vW.x*7.+uT*1.3)*.02,1.,cos(vW.z*7.-uT*1.1)*.02),wet));}
 }else{
  ao=mix(.42,1.,smoothstep(0.,1.6,vW.y));
  if(mat>1.5&&mat<2.5){a*=.55+.9*n3(vW*2.4);wrap=.5;spec=.05;if(uQ>.5){float lf=n3(vW*8.5),l2=n3(vW*17.+3.);a*=mix(.5,1.3,smoothstep(.28,.72,lf));a=mix(a,a*vec3(1.35,1.25,.7),smoothstep(.6,.9,l2)*max(dot(n,uSun),0.)*.8);a*=.62+.38*clamp(n.y*.6+.6,0.,1.);n=normalize(n+(vec3(n3(vW*3.1),n3(vW*3.1+5.),n3(vW*3.1+9.))-.5)*1.1+(vec3(lf,l2,n3(vW*8.5+4.))-.5)*.9);}}
  else if(mat>2.5&&mat<3.5){a*=.6+.8*n3(vW*vec3(3.,1.2,3.));spec=.06;if(uQ>.5){float bk=n3(vec3(vW.x*9.,vW.y*1.1,vW.z*9.)),cr=n3(vW*vec3(14.,3.,14.)+9.);a*=mix(.55,1.2,bk);a*=1.-.45*smoothstep(.7,.85,cr);a=mix(a,a*vec3(.7,1.15,.6),smoothstep(.55,.8,n3(vW*1.7+30.))*clamp(n.y*.8+.3,0.,1.)*.6);n=normalize(n+(vec3(n3(vW*4.),n3(vW*4.+5.),n3(vW*4.+9.))-.5)*.9+vec3(bk-.5,0.,cr-.5)*.8);}}
  else if(mat>10.5&&mat<14.5){ /* build 0056: dressed stone masonry for crypt walls. Coursed blocks with sunken mortar joints and bevelled edges, each block its own shade, cracks, grime run down from the top and damp moss at the foot; tops are big worn cap stones. build 0059: 12 is lava basalt whose joints glow with magma, 13 is void obsidian, polished, with violet veins */
   float lv=step(11.5,mat)*step(mat,12.5),vd=step(12.5,mat)*step(mat,13.5),ic=step(13.5,mat),mo=1.-lv-vd-ic,pu=.75+.25*sin(uT*1.7+dot(vW,vec3(.31,.0,.27)));float lum=dot(a,vec3(.3,.5,.2));a=mix(a,vec3(lum)*vec3(1.12,1.03,.9),.55*mo);a*=1.-.35*lv-.2*vd;spec=.08+.5*vd+.45*ic;shin=26.+70.*vd+50.*ic;vec3 an=abs(n);vec3 gc=lv*vec3(1.,.36,.08)*1.6+vd*vec3(.55,.2,1.)*1.2;
   if(an.y>.6){vec2 sp=vW.xz*.8+(vec2(n3(vec3(vW.xz*.9,4.)),n3(vec3(vW.xz*.9,6.)))-.5)*.5,ip=floor(sp),fp=fract(sp),id=ip;float d1=8.,d2=8.;for(int jj=-1;jj<=1;jj++)for(int ii=-1;ii<=1;ii++){vec2 g=vec2(ii,jj),r=g+.15+.7*vec2(h(ip+g),h(ip+g+57.))-fp;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=ip+g;}else if(d<d2)d2=d;}
    float j=1.-smoothstep(.03,.12,sqrt(d2)-sqrt(d1)),g=n3(vec3(vW.xz*7.,3.));a*=(.4+.3*h(id+3.))*(1.-.38*j)*(.8+.4*g);float ms=n3(vec3(vW.xz*1.1,1.))*.7+n3(vec3(vW.xz*3.7,2.))*.3;a=mix(a,a*vec3(.5,.8,.42),smoothstep(.45,.65,ms)*.8*mo);a=mix(a,a*vec3(.62,.66,.5),j*.6*mo);float jg=1.-smoothstep(.0,.035,sqrt(d2)-sqrt(d1));ex+=gc*jg*pu*(lv*.22+vd*.1)*smoothstep(.3,.7,n3(vec3(vW.xz*.6,5.)));a=mix(a,vec3(.56,.62,.7)*(.85+.25*g),ic*.8*smoothstep(.35,.6,n3(vec3(vW.xz*1.3,7.))+.15));
    if(uQ>.5)n=normalize(n+vec3(h(id+5.)-.5,0.,h(id+9.)-.5)*.2*(1.-j)+vec3(g-.5,0.,n3(vec3(vW.xz*7.,8.))-.5)*.35);}
   else{bool ax=an.x>an.z;float u=ax?vW.z:vW.x,ch=.46+.4*vd,rw=floor(vW.y/ch),bl=.7+.55*h(vec2(rw,11.)),uu=u/bl+.37*rw+h(vec2(rw,3.));vec2 id=vec2(floor(uu),rw),f=vec2(fract(uu),fract(vW.y/ch));
    float wv=uQ>.5?(n3(vW*6.)-.5)*.06:0.,eu=min(f.x,1.-f.x)*bl,ev=min(f.y,1.-f.y)*ch,j=1.-smoothstep(.012,.04,min(eu,ev)+wv);float bv=h(id+vec2(5.,1.));
    a*=(.68+.44*bv)*(1.-.66*j);a*=1.-.28*smoothstep(.55,.82,n3(vec3(u*4.,vW.y*.35,bv*9.)));a=mix(a,a*vec3(.58,.74,.52),smoothstep(1.5,0.,vW.y)*smoothstep(.35,.7,n3(vW*1.8+4.))*.7*mo);ex+=gc*j*pu*(lv*smoothstep(2.4,0.,vW.y)*.9+vd*.45);float fr2=smoothstep(.3,.75,n3(vW*vec3(2.,.9,2.)+2.)+smoothstep(1.2,0.,vW.y)*.5-.15);a=mix(a,a*vec3(.85,.95,1.15),ic*.6);a=mix(a,vec3(.6,.68,.78),ic*fr2*.45);
    if(uQ>.5){vec3 t=ax?vec3(0.,0.,1.):vec3(1.,0.,0.);float bx=1.-smoothstep(0.,.08,eu),by=1.-smoothstep(0.,.08,ev),g=n3(vW*11.),cr=n3(vW*vec3(2.6,5.,2.6)+bv*13.);
     float ck=(1.-smoothstep(0.,.025,abs(cr-.5)))*step(.6-.25*lv,bv);a*=(.86+.28*g)*(1.-.6*ck);ex+=gc*ck*pu*(lv*.8*smoothstep(2.8,0.,vW.y)+vd*.4);n=normalize(n+t*(f.x<.5?-1.:1.)*bx*.55+vec3(0.,f.y<.5?-1.:1.,0.)*by*.55+(vec3(n3(vW*4.),n3(vW*4.+5.),n3(vW*4.+9.))-.5)*.35);}}
  }
  else if(mat>3.5&&mat<4.5){if(uRim>0.&&uQ>.5){ /* build 0036: hero steel. Brushed grain, grime, worn bright edges, scratches and a reflection of the room */
    vec3 Vv=normalize(uEye-vW),R=reflect(-Vv,n);float br=n3(vec3(vO.x*60.,vO.y*4.,vO.z*60.)),wr=n3(vO*6.+2.),gm=n3(vO*14.+5.),fr=pow(1.-max(dot(n,Vv),0.),4.);
    a*=.48+.3*br;a*=1.-.35*smoothstep(.55,.75,gm);a=mix(a,a*1.5,smoothstep(.62,.8,wr)*.5);spec=.9;shin=60.+50.*br;
    vec3 env=mix(uGnd*1.4,uSky*2.2+vec3(.06,.055,.05),smoothstep(-.3,.6,R.y))+vec3(1.,.55,.25)*.3*(1.-smoothstep(0.,.18,abs(R.y-.05)));
    ex+=env*(.1+.7*fr)*mix(a*1.5,vec3(.8),.2)*(1.-.5*gm);
    if(uQ>1.5){float s2=abs(n3(vec3(vO.x*3.+vO.y*30.,vO.z*30.,vO.y*3.-vO.x*9.))-.5),scr=(1.-smoothstep(0.,.018,s2))*smoothstep(.62,.78,n3(vO*5.+9.));scr*=1.-smoothstep(.4,1.2,fwidth(vO.y*30.));a*=1.+scr*.7;ex+=scr*.2*(uSky+uSunC*.3);}
   }else{spec=.5;shin=56.;a*=.5+.25*n3(vW*9.);}}
  else if(mat>14.5&&mat<15.5){ /* town build: Emberwatch cobbles. Rounded setts in warm honey, sand and grey, each its own shade, sunken mortar with a little moss. Not bent like bark, so the square lies flat */
   ao=.88;wrap=.2;spec=.07;shin=26.;
   if(abs(n.y)>.6){vec2 sp=vW.xz*1.55;if(uQ>.5)sp+=(vec2(n3(vec3(vW.xz*.7,1.)),n3(vec3(vW.xz*.7,2.)))-.5)*.35;
    vec2 ip=floor(sp),fp=fract(sp),id=ip;float d1=8.,d2=8.;for(int jj=-1;jj<=1;jj++)for(int ii=-1;ii<=1;ii++){vec2 g=vec2(ii,jj),r=g+.2+.6*vec2(h(ip+g),h(ip+g+57.))-fp;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=ip+g;}else if(d<d2)d2=d;}
    float mj=1.-smoothstep(.035,.12,sqrt(d2)-sqrt(d1)),tv=h(id+3.);vec3 tint=mix(vec3(1.07,.97,.85),vec3(.94,.92,.9),step(.55,tv));tint=mix(tint,vec3(1.14,.99,.8),step(.86,tv));
    a*=tint*(.84+.3*h(id+7.));a*=1.-.5*mj;spec=.05+.09*(1.-mj);
    if(uQ>.5){a*=.93+.14*n3(vec3(vW.xz*6.,4.));n=normalize(n+vec3(h(id+5.)-.5,0.,h(id+9.)-.5)*.22*(1.-mj)+vec3(fp.x-.5,0.,fp.y-.5)*.12*(1.-mj));a=mix(a,a*vec3(.72,.9,.62),smoothstep(.5,.85,n3(vec3(vW.xz*.9,8.)))*mj*.7);}}
   else a*=.9+.2*n3(vW*4.);}
  else if(mat>5.5&&uRim>0.&&uQ>.5){vec3 Vv=normalize(uEye-vW);float nv=max(dot(n,Vv),0.);
   if(mat<6.5){ /* build 0036: cloth. A woven thread pattern that fades out before it can shimmer, soft folds, fuzz and a velvet sheen */
    float f=uQ>1.5?95.:60.,u=(vO.x+vO.z)*f,v=vO.y*f,wv=sin(u)*sin(v),fw=fwidth(u)+fwidth(v);wv*=1.-smoothstep(.6,2.,fw);float fo=n3(vO*vec3(5.,2.,5.)+7.),fz=n3(vO*30.);
    a*=(1.+.12*wv)*(.72+.5*fo)*(.9+.2*fz);wrap=.35;spec=.04;shin=8.;n=normalize(n+(vec3(n3(vO*vec3(5.,2.,5.)+8.),.5,n3(vO*vec3(5.,2.,5.)+9.))-.5)*.5);ex+=a*(uSky*1.2+uSunC*.25)*pow(1.-nv,2.)*.55;}
   else if(mat<7.5){ /* leather: pebbled grain, creases, lighter scuffed patches and a waxy shine */
    float gr=n3(vO*70.),pt=n3(vO*3.5+3.),cr=n3(vO*vec3(24.,5.,24.)+11.);gr=mix(gr,.5,smoothstep(.5,1.5,fwidth(vO.x*70.)));
    a*=.9+.16*gr;a*=1.-.28*smoothstep(.6,.78,cr);float wo=smoothstep(.5,.85,pt);a=mix(a*.85,a*vec3(1.3,1.18,1.02)+.015,wo);spec=.3*(1.-.6*wo)+.08*gr;shin=18.;n=normalize(n+(vec3(gr,n3(vO*70.+4.),n3(vO*70.+8.))-.5)*.22);ex+=a*uSky*pow(1.-nv,3.)*.5*(1.-wo);}
   else if(mat<8.5){ /* skin: soft wrapped light, warm blood glow where light turns to shadow and through thin edges */
    float nd=dot(n,uSun);a*=.95+.1*n3(vO*25.);wrap=.45;spec=.1;shin=14.;ex+=a*uSunC*vec3(.9,.28,.16)*.24*smoothstep(-.45,.15,nd)*(1.-smoothstep(.15,.7,nd))+a*vec3(1.,.55,.45)*pow(1.-nv,3.)*.2;}
   else if(mat<9.5){ /* hair: strands that run down the head with a soft shine along them */
    float st=n3(vec3(vO.x*90.,vO.y*7.,vO.z*90.));st=mix(st,.5,smoothstep(.5,1.5,fwidth(vO.x*90.)));a*=.65+.6*st;spec=.12+.3*st;shin=34.;wrap=.2;}
   else{ /* build 0038: chainmail. Rows of interlocked rings, dark gaps between them, each ring catching its own glint; it melts to an even grey before it can shimmer */
    float F=uQ>1.5?44.:30.,u=atan(vO.z,vO.x)*F*.16,v=vO.y*F,rw=floor(v);u+=.5*mod(rw,2.);vec2 ce=fract(vec2(u,v))-.5;float rd=length(ce),rg=1.-smoothstep(.06,.14,abs(rd-.3)),fw=fwidth(v)+fwidth(u),fd=smoothstep(.35,1.1,fw);rg=mix(rg,.55,fd);
    vec3 R=reflect(-Vv,n);a*=mix(.08,.7,rg);spec=.2+.6*rg;shin=40.;n=normalize(n+vec3(ce.x,ce.y,0.)*rg*(1.-fd)*.8);ex+=mix(uGnd*1.2,uSky*1.8,smoothstep(-.3,.6,R.y))*a*.3*rg;}
  }
  else if(mat>4.5&&mat<5.5){float t=clamp(vL.y+.5,0.,1.);a*=mix(.6,1.3,t)*(.8+.4*ns(vW.xz*1.3));ao=mix(.85,1.,t);wrap=.7;spec=.02;}
  else a*=.88+.24*n3(vW*5.);
 }
 vec3 sp=vS.xyz/vS.w*.5+.5;float sh=1.;
 if(sp.x>0.&&sp.x<1.&&sp.y>0.&&sp.y<1.&&sp.z<1.){if(uQ>1.5){sh=0.;float rn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2832;for(int i=0;i<12;i++){float fi=float(i)+.5,an=fi*2.39996+rn;sh+=texture(uSh,vec3(sp.xy+vec2(cos(an),sin(an))*sqrt(fi/12.)*(2.6/2048.),sp.z-.0013));}sh/=12.;}else if(uQ>.5){sh=0.;vec2 t=vec2(1.3/2048.);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)sh+=texture(uSh,vec3(sp.xy+vec2(float(i),float(j))*t,sp.z-.0012));sh/=9.;}else sh=texture(uSh,vec3(sp.xy,sp.z-.0015));}
 vec3 V=normalize(uEye-vW);
 float dif=max((dot(n,uSun)+wrap)/(1.+wrap),0.);
 float sl=pow(max(dot(n,normalize(uSun+V)),0.),shin)*spec;
 float shS=sh;vec3 tl=vec3(0.);
 if(uTP.w>0.){ /* build 0052: in dark places the hero's torch is the light that casts shadows; the cold moonlight fills in unshadowed */
  vec3 td=uTP.xyz-vW;vec3 TL=td/max(length(td),.001);float tat=clamp(1.-length(vW.xz-uTP.xz)/uTR,0.,1.);tat*=tat;float tdf=max((dot(n,TL)+wrap)/(1.+wrap),0.);
  tl=uTC*tat*(sh*(a*tdf+spec*pow(max(dot(n,normalize(TL+V)),0.),shin))+a*.14*ao);shS=mix(1.,sh,clamp(tat*1.6,0.,1.));sh=.7;}
 vec3 c=a*(mix(uGnd,uSky,n.y*.5+.5)*ao+uSunC*dif*sh)+uSunC*sl*sh+ex*(.4+.6*shS)*ao+tl;
 for(int i=0;i<8;i++){vec3 d=uLP[i].xyz-vW;float dist=length(d);float at=clamp(1.-dist/uLP[i].w,0.,1.);at*=at;vec3 L=d/max(dist,.001);c+=uLC[i]*at*(a*max(dot(n,L),.2)+.5*spec*pow(max(dot(n,normalize(L+V)),0.),shin));}
 c+=a*uSky*pow(1.-max(dot(n,V),0.),3.)*1.2*ao;
 if(uRim>0.){float fr=pow(1.-max(dot(n,V),0.),3.6);c+=(uSunC*.4+uSky*.6)*fr*uRim*(.35+.65*shS)+a*uSunC*.18*uRim*max(dot(n,normalize(vec3(-uSun.x,.6,-uSun.z))),0.);} // characters catch a rim of light so they read against the ground
 c+=wet*uSky*(.24+2.2*pow(1.-max(dot(n,V),0.),4.))*(.45+.55*shS);
 c+=vC.rgb*vE.x;
 if(uQ>.5&&uMist>0.){float mi=ns(vW.xz*.05+vec2(uT*.03,uT*.021))*ns(vW.xz*.13-vec2(uT*.025,0.));c=mix(c,mix(uFog,uSky,.75)*1.5,clamp(mi*1.7-.28,0.,1.)*smoothstep(3.2,0.,vW.y)*uMist);}
 float pd=length(vW.xz-uPl.xz);c*=mix(1.,.08,smoothstep(uLR*.45,uLR,pd));
 c=mix(c,uFog,smoothstep(uFogR.x,uFogR.y,length(vW-uEye)));
 if(uQ>.5&&uScat>0.){ /* build 0052: light hangs in the air. Each lamp, torch and spell lights the dust and mist around it, worked out along the line of sight */
  vec3 rd=vW-uEye;float rl=length(rd);rd/=rl;vec3 sc=vec3(0.);
  for(int i=0;i<8;i++){vec3 lp=uLP[i].xyz-uEye;float tc=dot(lp,rd),hh=max(length(lp-rd*tc),.9),hk=1.-hh/uLP[i].w;if(hk<=0.)continue;sc+=uLC[i]*hk*hk*(atan((rl-tc)/hh)-atan(-tc/hh))/hh;}
  if(uTP.w>0.){vec3 lp=vec3(uTP.x,2.4,uTP.z)-uEye;float tc=dot(lp,rd),hh=max(length(lp-rd*tc),.9),hk=1.-hh/(uTR*.6);if(hk>0.)sc+=uTC*hk*hk*(atan((rl-tc)/hh)-atan(-tc/hh))/hh;}
  c+=sc*uScat;}
 c*=1.3;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);o=vec4(pow(c,vec3(1./2.2)),1.);}`;
  const FSG = `#version 300 es
precision highp float;
in vec3 vW,vN,vL; in vec4 vC; in vec2 vE; in vec4 vS; uniform vec3 uPl; uniform float uLR; out vec4 o;
void main(){float f=1.;float r=length(vL.xz)*2.;
 if(vE.y>.5){f=1.-smoothstep(0.,1.,r);f*=f;}else if(vE.y<-.5){f=.18+.82*smoothstep(.82,1.,r);}
 float pd=length(vW.xz-uPl.xz);f*=mix(1.,.15,smoothstep(uLR*.6,uLR*1.1,pd));
 o=vec4(vC.rgb*vC.a*vE.x*f,1.);}`;
  const VSD = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in mat4 iM; layout(location=7) in vec2 iE; uniform mat4 uLVP;
${N3}
${WPOS}
void main(){gl_Position=uLVP*wpos(iM,aP,aN,iE.y);}`;
  const FSD = `#version 300 es
precision highp float; void main(){}`;
  const VSQ = `#version 300 es
out vec2 uv; void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const FSQ = `#version 300 es
precision highp float; in vec2 uv; uniform sampler2D uA,uB,uC,uD; uniform int uMode; uniform vec2 uDir; uniform float uT; uniform vec4 uPI,uFx; uniform float uWarm; out vec4 o;
vec3 vpos(vec2 p){float z=uPI.w/(texture(uD,p).r*2.-1.+uPI.z);return vec3((p*2.-1.)*z/uPI.xy,-z);}
void main(){
 if(uMode==0){vec3 c=texture(uA,uv).rgb;float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.68,1.,l),1.);}
 else if(uMode==1){vec3 c=texture(uA,uv).rgb*.227;c+=(texture(uA,uv+uDir*1.385).rgb+texture(uA,uv-uDir*1.385).rgb)*.316;c+=(texture(uA,uv+uDir*3.231).rgb+texture(uA,uv-uDir*3.231).rgb)*.07;o=vec4(c,1.);}
 else if(uMode==3){
  if(texture(uD,uv).r>=.9999){o=vec4(1.);return;}
  vec3 P=vpos(uv),N=normalize(cross(dFdx(P),dFdy(P)));float rad=.6*uPI.y/(-P.z),asp=uPI.y/uPI.x,occ=0.;
  float rn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2832;
  for(int i=0;i<10;i++){float fi=float(i)+.5,an=fi*2.39996+rn;vec3 v=vpos(uv+vec2(cos(an)/asp,sin(an))*rad*sqrt(fi/10.))-P;float l=length(v);occ+=max(dot(N,v)/(l+.001)-.14,0.)/(1.+l*l*.7);}
  o=vec4(vec3(clamp(1.-occ*.26,0.,1.)),1.);}
 else{vec2 q=uv-.5;vec3 c=texture(uA,uv).rgb;
  if(uFx.z>0.){float ca=dot(q,q)*uFx.z;c.r=texture(uA,uv+q*ca).r;c.b=texture(uA,uv-q*ca).b;}
  vec3 bl=texture(uC,uv).rgb;float fz=smoothstep(.26,.6,abs(uv.y-.53))*uFx.x;
  c+=(c-bl)*uFx.w*(1.-fz);c=mix(c,bl,fz);
  if(uFx.y>0.)c*=mix(1.,texture(uD,uv).r,uFx.y);
  c=max(c,0.)+texture(uB,uv).rgb*.85;
  float l=dot(c,vec3(.3,.59,.11));c=mix(vec3(l),c,1.14);c*=mix(vec3(.93,1.,1.1),vec3(1.07,1.01,.9),smoothstep(.12,.7,l));
  c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.4);
  {float L=dot(c,vec3(.3,.59,.11));vec3 g=mix(vec3(L),c,.6+.28*uWarm);float warm=clamp((c.r-c.b)*2.2,0.,1.);g=mix(g,c,warm*.65);g=mix(g*mix(vec3(.84,.92,1.08),vec3(.97,.92,.9),uWarm),g*vec3(1.12,1.,.8),smoothstep(.15,.65,L));c=clamp(pow(g,vec3(1.15-.03*uWarm))*(1.04+.01*uWarm),0.,1.);c*=mix(1.,smoothstep(.9,.2,length(q*vec2(1.,1.08))),.35-.15*uWarm);} /* build 0025: the Ashen Gothic look, cold grey world, warm fire and magic */
  c*=mix(1.,smoothstep(.98,.28,length(q*vec2(1.,1.08))),.6-.25*uWarm); /* town build: home is warmer, a little more colour and a lighter vignette */
  c+=(fract(sin(dot(uv+fract(uT),vec2(12.9898,78.233)))*43758.5453)-.5)*.016;o=vec4(c,1.);}}`;
  // build 0039: skinned variants of the hero shaders. Bone matrices live in a float texture (3 texels a bone, one row per drawn copy),
  // so a real model's mesh stays on the graphics card and only ~19 KB of bones are sent each frame for a full party
  const SKN = `layout(location=8) in vec4 aJ; layout(location=9) in vec4 aW; layout(location=10) in vec4 aK; uniform highp sampler2D uBones; uniform int uBR;
mat3x4 bone(float j){int b=int(j)*3;return mat3x4(texelFetch(uBones,ivec2(b,uBR),0),texelFetch(uBones,ivec2(b+1,uBR),0),texelFetch(uBones,ivec2(b+2,uBR),0));}
mat3x4 skm(){return bone(aJ.x)*aW.x+bone(aJ.y)*aW.y+bone(aJ.z)*aW.z+bone(aJ.w)*aW.w;}`;
  const skinVS = (vs, main) => vs.replace('void main(){', SKN + '\nvoid main(){mat3x4 SK=skm();vec3 sP=vec4(aP,1.)*SK,sN=vec4(aN,0.)*SK;').replace(main[0], main[1]);
  const VSS = skinVS(VS, ['vec4 w=wpos(iM,aP,aN,iE.y);vW=w.xyz;vL=aP;', 'vec4 w=wpos(iM,sP,sN,iE.y);vW=w.xyz;vL=aP;']).replace('vN=normalize(m*(aN/', 'vN=normalize(m*(sN/').replace('vC=iC;', 'vC=iC*vec4(aK.rgb*aK.rgb,1.);');
  const VSDS = skinVS(VSD, ['gl_Position=uLVP*wpos(iM,aP,aN,iE.y);', 'gl_Position=uLVP*wpos(iM,sP,sN,iE.y);']);
  // ---- build 0046: textured scenery meshes (houses, props and trees from Lee's free packs). They get their own shaders, so if a graphics card refuses them the old scenery simply stays ----
  const VSM = VS.replace('layout(location=7) in vec2 iE;', 'layout(location=7) in vec2 iE; layout(location=11) in vec2 aU; layout(location=12) in vec2 aM; out vec2 vU; flat out float vLy,vAl;')
    .replace('vec4 w=wpos(iM,aP,aN,iE.y);', 'float mt=aM.y;vec4 w=iM*vec4(aP,1.);if(mt>1.5&&mt<2.5){float hg=max(aP.y,0.)*.3*length(iM[1].xyz);w.x+=sin(uT*1.3+w.x*.35+w.z*.27)*.05*hg;w.z+=cos(uT*1.1+w.x*.3)*.03*hg;}vU=aU;vLy=aM.x;vAl=(mt>1.5&&mt<2.5)?1.:0.;')
    .replace('vC=iC;vE=iE;', 'vC=mt>9.5?vec4(1.,.56,.24,1.):iC;vE=vec2(iE.x+(mt>9.5?.9:0.),(mt>3.5&&mt<4.5)?4.:0.);');
  const FSM = FS.replace('uniform vec4 uGr;', 'uniform vec4 uGr; uniform mediump sampler2DArray uTex; in vec2 vU; flat in float vLy,vAl;').replace('((mat>1.5&&mat<3.5)||(mat>10.5&&mat<14.5))&&vW.y>2.3){float hd=length(vec2(vW.x,vW.z-(vW.y-1.)*.72)-uPl.xz);if(hd<4.2){float th=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(th>smoothstep(3.55,4.15,hd))discard;}}', 'vW.y>1.3){float hd=length(vec2(vW.x,vW.z-(vW.y-1.)*.72)-uPl.xz);if(hd<6.6){float th=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(th>.12+.88*smoothstep(4.6,6.4,hd))discard;}}') /* build 0062 (playtest): trees and other models fade in a wider circle between the camera and the hero (this rule had stopped matching in 0056) */
    .replace('vec3 n=normalize(vN);vec3 a=vC.rgb;', 'vec3 n=normalize(vN);vec4 tx=texture(uTex,vec3(vU,vLy));if(vAl>.5&&tx.a<.5)discard;vec3 tc=tx.rgb*tx.rgb;vec3 a=vC.rgb*mix(vec3(dot(tc,vec3(.3,.59,.11))),tc,.7)*1.15;if(!gl_FrontFacing)n=-n;');
  const VSDM = `#version 300 es
layout(location=0) in vec3 aP; layout(location=2) in mat4 iM; layout(location=11) in vec2 aU; layout(location=12) in vec2 aM; uniform mat4 uLVP; out vec2 vU; flat out float vLy,vAl;
void main(){vU=aU;vLy=aM.x;vAl=(aM.y>1.5&&aM.y<2.5)?1.:0.;gl_Position=uLVP*(iM*vec4(aP,1.));}`;
  const FSDM = `#version 300 es
precision highp float; uniform mediump sampler2DArray uTex; in vec2 vU; flat in float vLy,vAl; void main(){if(vAl>.5&&texture(uTex,vec3(vU,vLy)).a<.5)discard;}`;
  let pMesh = null, pDepthM = null, envTex = null; const ENVM = { state: 'off', why: 'not asked for yet', meshes: {} };
  const envOn = () => ENVM.state === 'on';
  function addMesh(name, d) { const mk = (t, a) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, a, gl.STATIC_DRAW); return b; }; gl.bindVertexArray(null);
    geo[name] = { mesh: true, vbo: mk(gl.ARRAY_BUFFER, d.P), nbo: mk(gl.ARRAY_BUFFER, d.N), ubo: mk(gl.ARRAY_BUFFER, d.U), lbo: mk(gl.ARRAY_BUFFER, d.L), ibo: mk(gl.ELEMENT_ARRAY_BUFFER, d.I), count: d.I.length, it: d.I instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT }; }
  // the scenery pack: world.cde (meshes, 16-bit steps over each mesh's range) and two picture strips (colour, and cut-out masks for leaves)
  function envLoad(base, ver) {
    if (ENVM.p) return ENVM.p; if (!gl || !pMesh || typeof fetch === 'undefined' || typeof Image === 'undefined') { ENVM.state = 'off'; ENVM.why = !pMesh ? 'the graphics card would not build the scenery shader' : 'no loader'; return (ENVM.p = Promise.resolve(false)); }
    ENVM.state = 'loading'; ENVM.why = ''; const q = '?v=' + (ver || ''), get = (u, t) => fetch(base + u + q).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r[t](); });
    const img = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('picture ' + u)); i.src = base + u + q; });
    return (ENVM.p = Promise.all([get('world.cde', 'arrayBuffer'), get('tex.json', 'json'), img('tex.jpg'), img('alpha.png')]).then(([ab, tj, ci, am]) => {
      const S = tj.size, n = tj.n, cvs = document.createElement('canvas'); cvs.width = S; cvs.height = Math.max(S * n, am.height); const cx = cvs.getContext('2d', { willReadFrequently: true });
      cx.drawImage(ci, 0, 0); const px = new Uint8Array(cx.getImageData(0, 0, S, S * n).data.buffer); cx.clearRect(0, 0, S, cvs.height); cx.drawImage(am, 0, 0); const ad = cx.getImageData(0, 0, S, am.height).data;
      for (let k = 0; k < S * S * n; k++) px[k * 4 + 3] = 255; for (const li in tj.alpha) { const o = +li * S * S, oa = tj.alpha[li] * S * S; for (let k = 0; k < S * S; k++) px[(o + k) * 4 + 3] = ad[(oa + k) * 4]; }
      for (let k = 0; k < 32 && gl.getError() !== gl.NO_ERROR; k++);
      envTex = gl.createTexture(); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D_ARRAY, envTex); gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, S, S, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D_ARRAY, an.TEXTURE_MAX_ANISOTROPY_EXT, 4); gl.activeTexture(gl.TEXTURE0);
      const dv = new DataView(ab); if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'CDE1') throw new Error('not a scenery pack'); const hl = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl))), B0 = 8 + hl;
      for (const m of H.meshes) { const v = m.v, o = m.o.map(x => x + B0), q = m.q, Pq = new Int16Array(ab, o[0], v * 3), Uq = new Int16Array(ab, o[2], v * 2), P = new Float32Array(v * 3), U = new Float32Array(v * 2);
        for (let k = 0; k < v * 3; k++) { const c = k % 3; P[k] = (Pq[k] + 32768) / 65535 * q[3 + c] + q[c]; } for (let k = 0; k < v * 2; k++) { const c = k & 1; U[k] = (Uq[k] + 32768) / 65535 * q[8 + c] + q[6 + c]; }
        addMesh('m:' + m.n, { P, N: new Int8Array(ab, o[1], v * 4), U, L: new Uint8Array(ab, o[3], v * 2), I: m.i32 ? new Uint32Array(ab, o[4], m.i) : new Uint16Array(ab, o[4], m.i) }); ENVM.meshes[m.n] = { b: m.b }; }
      const er = gl.getError(); if (er !== gl.NO_ERROR) throw new Error('graphics card error 0x' + er.toString(16) + ' on upload'); ENVM.state = 'on'; ENVM.why = H.meshes.length + ' pieces, ' + (ab.byteLength / 1048576).toFixed(1) + ' MB'; return true;
    }).catch(e => { ENVM.state = 'failed'; ENVM.why = String(e && e.message || e).slice(0, 140); console.warn('scenery pack failed, keeping the old scenery', e); return false; }));
  }
  function prog(vs, fs, names) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n); return { p, u };
  }

  function init(canvas) {
    cv = canvas; gl = cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    addGeo('box', gBox()); addGeo('cap', gCap(14, 10)); addGeo('rbox', gRBox(16, 12, .32)); addGeo('sphere', gSphere(20, 13)); addGeo('gem', gSphere(4, 2)); addGeo('cyl', gCyl(16, 1)); addGeo('cone', gCyl(14, 0)); addGeo('blade', gCyl(3, 0)); addGeo('tuft', gTuft(7));
    addGeo('taper', gCyl(14, .6)); for (const k in BODY) addGeo(k, gLoft(BODY[k], 20, 4)); addGeo('blob', gSphere(10, 7)); addGeo('fol', gCyl(9, 0)); addGeo('trunk', gCyl(7, .6)); addGeo('disc', gDisc(28, 0)); addGeo('ring', gDisc(36, .86)); addGeo('sect', gSect(3, .0873));
    pMain = prog(VS, FS, ['uVP', 'uLVP', 'uSh', 'uSun', 'uSunC', 'uSky', 'uGnd', 'uFog', 'uEye', 'uPl', 'uFogR', 'uLR', 'uLP[0]', 'uLC[0]', 'uT', 'uQ', 'uWet', 'uMist', 'uRim', 'uOut', 'uGr', 'uGe', 'uTP', 'uTC', 'uTR', 'uScat']);
    pGlow = prog(VS, FSG, ['uVP', 'uLVP', 'uPl', 'uLR', 'uT']);
    pDepth = prog(VSD, FSD, ['uLVP', 'uT']); try { pMainS = prog(VSS, FS, ['uVP', 'uLVP', 'uSh', 'uSun', 'uSunC', 'uSky', 'uGnd', 'uFog', 'uEye', 'uPl', 'uFogR', 'uLR', 'uLP[0]', 'uLC[0]', 'uT', 'uQ', 'uWet', 'uMist', 'uRim', 'uOut', 'uGr', 'uGe', 'uTP', 'uTC', 'uTR', 'uScat', 'uBones', 'uBR']); pDepthS = prog(VSDS, FSD, ['uLVP', 'uT', 'uBones', 'uBR']); } catch (e) { pMainS = pDepthS = null; MI.state = 'off'; MI.why = 'the graphics card would not build the model shader: ' + String(e && e.message || e).split('\n')[0].slice(0, 120); console.warn('skinned models off', e); } try { pMesh = prog(VSM, FSM, ['uVP', 'uLVP', 'uSh', 'uSun', 'uSunC', 'uSky', 'uGnd', 'uFog', 'uEye', 'uPl', 'uFogR', 'uLR', 'uLP[0]', 'uLC[0]', 'uT', 'uQ', 'uWet', 'uMist', 'uRim', 'uOut', 'uGr', 'uGe', 'uTP', 'uTC', 'uTR', 'uScat', 'uTex']); pDepthM = prog(VSDM, FSDM, ['uLVP', 'uTex']); } catch (e) { pMesh = pDepthM = null; ENVM.why = 'the graphics card would not build the scenery shader: ' + String(e && e.message || e).split('\n')[0].slice(0, 120); console.warn('scenery meshes off', e); } pPost = prog(VSQ, FSQ, ['uA', 'uB', 'uC', 'uD', 'uMode', 'uDir', 'uT', 'uPI', 'uFx', 'uWarm']);
    shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SH, SH, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    resize(); return true;
  }
  function resize() { const d = Math.min(window.devicePixelRatio || 1, (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 1.25 : 1.5); const k = d * [.72, .86, 1][env.q] * (env.scale || 1); const w = Math.max(2, Math.floor(cv.clientWidth * k)), h = Math.max(2, Math.floor(cv.clientHeight * k)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }

  function mkTex(w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
  function ensurePost() {
    const w = cv.width, h = cv.height; if (post && post.w === w && post.h === h && post.q === env.q) return;
    if (post) { gl.deleteFramebuffer(post.ms); gl.deleteRenderbuffer(post.rc); gl.deleteRenderbuffer(post.rd); for (const k of ['sc', 'a', 'b', 'c', 'd', 'e', 'f']) { gl.deleteTexture(post[k].t); gl.deleteFramebuffer(post[k].f); } gl.deleteTexture(post.dt); }
    const smp = env.q > 1 ? Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0) : 0;
    const rc = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rc); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, gl.RGBA8, w, h);
    const rd = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rd); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, gl.DEPTH_COMPONENT24, w, h);
    const ms = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, ms); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rc); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rd);
    const bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2);
    const sc = mkTex(w, h), dt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, dt); gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sc.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dt, 0);
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    post = { w, h, q: env.q, ms, rc, rd, sc, dt, a: mkTex(bw, bh), b: mkTex(bw, bh), c: mkTex(bw, bh), d: mkTex(bw, bh), e: mkTex(hw, hh), f: mkTex(hw, hh) }; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function quad(target, mode, texA, texB, dx, dy, texC, texD) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, target ? target.w : cv.width, target ? target.h : cv.height);
    const u = pPost.u; gl.uniform1i(u.uMode, mode); gl.uniform2f(u.uDir, dx || 0, dy || 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB || texA); gl.uniform1i(u.uB, 1); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texC || texA); gl.uniform1i(u.uC, 2); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texD || texA); gl.uniform1i(u.uD, 3); gl.activeTexture(gl.TEXTURE0); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let curChunk = null; const chunks = {};
  function batch(set, g) {
    const box = set === 'stat' ? curChunk.b : sets[set]; let b = box[g];
    if (!b) {
      const Gm = geo[g]; b = { g: Gm, n: 0, cap: 256, data: new Float32Array(STRIDE * 256), vao: gl.createVertexArray(), buf: gl.createBuffer() };
      gl.bindVertexArray(b.vao); gl.bindBuffer(gl.ARRAY_BUFFER, Gm.vbo);
      if (Gm.mesh) { gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ARRAY_BUFFER, Gm.nbo); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.BYTE, true, 4, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, Gm.ubo); gl.enableVertexAttribArray(11); gl.vertexAttribPointer(11, 2, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ARRAY_BUFFER, Gm.lbo); gl.enableVertexAttribArray(12); gl.vertexAttribPointer(12, 2, gl.UNSIGNED_BYTE, false, 2, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Gm.ibo); }
      else { gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); }
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); const sb = STRIDE * 4;
      for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(2 + i); gl.vertexAttribPointer(2 + i, 4, gl.FLOAT, false, sb, i * 16); gl.vertexAttribDivisor(2 + i, 1); }
      gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, sb, 64); gl.vertexAttribDivisor(6, 1);
      gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 2, gl.FLOAT, false, sb, 80); gl.vertexAttribDivisor(7, 1);
      gl.bindVertexArray(null); box[g] = b;
    } return b;
  }
  let GK = 1; /* build 0062: a dimmer for spell glow in busy fights, so danger shapes stay visible */
  function put(set, g, m, c, em, a, e2) {
    const b = batch(set, g);
    if (b.n >= b.cap) { b.cap *= 2; const d = new Float32Array(STRIDE * b.cap); d.set(b.data); b.data = d; }
    const o = b.n * STRIDE, d = b.data; for (let i = 0; i < 16; i++) d[o + i] = m[i];
    d[o + 16] = c[0]; d[o + 17] = c[1]; d[o + 18] = c[2]; d[o + 19] = (a === undefined ? 1 : a) * (set === 'glow' ? GK : 1); d[o + 20] = em || 0; d[o + 21] = e2 || 0; b.n++;
  }
  // entity base matrix: T * Ry * uniform scale
  function base(o, x, y, z, ry, s) { const c = Math.cos(ry) * s, sn = Math.sin(ry) * s; o[0] = c; o[1] = 0; o[2] = -sn; o[3] = 0; o[4] = 0; o[5] = s; o[6] = 0; o[7] = 0; o[8] = sn; o[9] = 0; o[10] = c; o[11] = 0; o[12] = x; o[13] = y; o[14] = z; o[15] = 1; return o; }
  // world-aligned object: T * Ry * S
  function obj(set, g, x, y, z, ry, sx, sy, sz, c, em, a, e2) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    M[0] = cs * sx; M[1] = 0; M[2] = -sn * sx; M[3] = 0; M[4] = 0; M[5] = sy; M[6] = 0; M[7] = 0; M[8] = sn * sz; M[9] = 0; M[10] = cs * sz; M[11] = 0; M[12] = x; M[13] = y; M[14] = z; M[15] = 1;
    put(set, g, M, c, em, a, e2);
  }
  // jointed part: B * T(p) * R(ry,rx,rz) * T(o) * S(s)
  function part(set, g, B, px, py, pz, rx, ry, rz, ox, oy, oz, sx, sy, sz, c, em, a, e2) {
    const cx = Math.cos(rx), sxn = Math.sin(rx), cy = Math.cos(ry), syn = Math.sin(ry), cz = Math.cos(rz), szn = Math.sin(rz);
    const m00 = cy * cz + syn * sxn * szn, m01 = -cy * szn + syn * sxn * cz, m02 = syn * cx, m10 = cx * szn, m11 = cx * cz, m12 = -sxn,
      m20 = -syn * cz + cy * sxn * szn, m21 = syn * szn + cy * sxn * cz, m22 = cy * cx;
    const tx = px + m00 * ox + m01 * oy + m02 * oz, ty = py + m10 * ox + m11 * oy + m12 * oz, tz = pz + m20 * ox + m21 * oy + m22 * oz;
    const l = t1; l[0] = m00 * sx; l[1] = m10 * sx; l[2] = m20 * sx; l[3] = 0; l[4] = m01 * sy; l[5] = m11 * sy; l[6] = m21 * sy; l[7] = 0; l[8] = m02 * sz; l[9] = m12 * sz; l[10] = m22 * sz; l[11] = 0; l[12] = tx; l[13] = ty; l[14] = tz; l[15] = 1;
    mul(M, B, l); put(set, g, M, c, em, a, e2);
  }
  // camera-facing soft glow
  function halo(x, y, z, size, c, a) {
    const r = cam.right, u = cam.up, b = cam.back;
    M[0] = r[0] * size; M[1] = r[1] * size; M[2] = r[2] * size; M[3] = 0; M[4] = b[0]; M[5] = b[1]; M[6] = b[2]; M[7] = 0; M[8] = u[0] * size; M[9] = u[1] * size; M[10] = u[2] * size; M[11] = 0; M[12] = x; M[13] = y; M[14] = z; M[15] = 1;
    put('glow', 'disc', M, c, 1, a === undefined ? 1 : a, 1);
  }
  function light(x, y, z, r, c, k, pri) { lights.push({ x, y, z, r, c, k: k === undefined ? 1 : k, pri: pri || 0 }); }
  function setCamera(eye, target, fov) {
    lookAt(view, eye, target, [0, 1, 0]); persp(proj, fov, cv.width / cv.height, .5, 300); mul(vp, proj, view); invert(ivp, vp);
    cam.eye = eye; cam.right = [view[0], view[4], view[8]]; cam.up = [view[1], view[5], view[9]]; cam.back = [view[2], view[6], view[10]];
  }
  function toScreen(x, y, z) {
    const w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]; if (w <= .01) return null;
    const sx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w, sy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w;
    return [(sx * .5 + .5) * cv.clientWidth, (1 - (sy * .5 + .5)) * cv.clientHeight];
  }
  function unproj(nx, ny, nz) { const w = ivp[3] * nx + ivp[7] * ny + ivp[11] * nz + ivp[15]; return [(ivp[0] * nx + ivp[4] * ny + ivp[8] * nz + ivp[12]) / w, (ivp[1] * nx + ivp[5] * ny + ivp[9] * nz + ivp[13]) / w, (ivp[2] * nx + ivp[6] * ny + ivp[10] * nz + ivp[14]) / w]; }
  function groundAt(mx, my) {
    const nx = mx / cv.clientWidth * 2 - 1, ny = 1 - my / cv.clientHeight * 2; const a = unproj(nx, ny, -1), b = unproj(nx, ny, 1);
    const dy = b[1] - a[1]; if (Math.abs(dy) < 1e-6) return [a[0], a[2]]; const t = -a[1] / dy; return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function begin() { env.verts = 0; SKD.length = 0; boneRows = 0; for (const g in sets.dyn) sets.dyn[g].n = 0; for (const g in sets.glow) sets.glow[g].n = 0; for (const g in sets.xr) sets.xr[g].n = 0; lights.length = 0; }
  function statBegin() { for (const k in chunks) { for (const g in chunks[k].b) { gl.deleteBuffer(chunks[k].b[g].buf); gl.deleteVertexArray(chunks[k].b[g].vao); } delete chunks[k]; } statChunk('all', 0, 0, true); }
  function statChunk(key, x, z, always) { curChunk = chunks[key] || (chunks[key] = { x, z, always: !!always, b: {} }); }
  function upload(set, usage) { const box = typeof set === 'string' ? sets[set] : set; for (const g in box) { const b = box[g]; if (!b.n) continue; gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.bufferData(gl.ARRAY_BUFFER, b.data.subarray(0, b.n * STRIDE), usage); } }
  function statEnd() { for (const k in chunks) { upload(chunks[k].b, gl.STATIC_DRAW); for (const g in chunks[k].b) { const b = chunks[k].b[g]; b.data = null; } } }
  let depthPass = false;
  function drawSet(set, mesh) {
    if (set === 'stat') { const p = env.player; for (const k in chunks) { const c = chunks[k]; if (!c.always && (Math.abs(c.x - p[0]) > 48 || c.z - p[2] > 32 || p[2] - c.z > 56)) continue; drawSet(c.b, mesh); } return; }
    const box = typeof set === 'string' ? sets[set] : set; for (const g in box) { const b = box[g]; if (!b.n || !b.g.mesh !== !mesh || (depthPass && (g === 'blade' || g === 'disc' || g === 'tuft'))) continue; gl.bindVertexArray(b.vao); env.verts += b.g.count * b.n;
      if (mesh) gl.drawElementsInstanced(gl.TRIANGLES, b.g.count, b.g.it, 0, b.n); else gl.drawArraysInstanced(gl.TRIANGLES, 0, b.g.count, b.n); } }
  const LP = new Float32Array(32), LC = new Float32Array(24);
  let aoOK = 1;
  const UM = () => ({ uVP: vp, uLVP: lvp, uT: [env.t], uQ: [env.q], uWet: [env.wet], uMist: [env.mist], uGr: env.gr, uGe: env.ge, uSun: env.sun, uSunC: env.sunC, uSky: env.sky, uGnd: env.gnd, uFog: env.fog, uEye: cam.eye, uPl: env.player, uFogR: [env.fogN, env.fogF], uLR: [env.lightR], 'uLP[0]': LP, 'uLC[0]': LC, uTP: TPv(), uTC: env.ptc, uTR: [env.ptr], uScat: [env.scat] });
  const TP4 = new Float32Array(4), TPv = () => { const t = env.pt; if (t && env.shadows !== false) { TP4[0] = t[0]; TP4[1] = t[1]; TP4[2] = t[2]; TP4[3] = 1; } else TP4.fill(0); return TP4; };
  function render() {
    resize(); ensurePost(); upload('dyn', gl.DYNAMIC_DRAW); upload('glow', gl.DYNAMIC_DRAW); upload('xr', gl.DYNAMIC_DRAW);
    const p = env.player, s = env.sun;
    if (env.pt) { const t = env.pt; lookAt(t1, [t[0], t[1], t[2]], [p[0], 0, p[2] - .01], [0, 0, -1]); persp(t2, t[3], 1, 1.5, 60); } /* build 0052: a torch's shadows spread out from the hero */ else { lookAt(t1, [p[0] + s[0] * 60, s[1] * 60, p[2] + s[2] * 60], [p[0], 0, p[2]], [0, 1, 0]); ortho(t2, -38, 38, -38, 38, 1, 140); } mul(lvp, t2, t1);
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, SH, SH); gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(pDepth.p); gl.uniformMatrix4fv(pDepth.u.uLVP, false, lvp); gl.uniform1f(pDepth.u.uT, env.t);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4); depthPass = true; upBones(); if (env.shadows !== false) { env.solo || drawSet('stat'); if (envOn()) { gl.useProgram(pDepthM.p); gl.uniformMatrix4fv(pDepthM.u.uLVP, false, lvp); gl.uniform1i(pDepthM.u.uTex, 5); env.solo || drawSet('stat', 1); gl.useProgram(pDepth.p); } drawSet('dyn'); if (SKD.length) { syncS(pDepthS, 0, { uLVP: lvp, uT: [env.t] }); drawSkinned(pDepthS); gl.useProgram(pDepth.p); } } depthPass = false; gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, post.ms); gl.viewport(0, 0, cv.width, cv.height);
    const tm = v => { v *= 1.3; v = (v * (2.51 * v + .03)) / (v * (2.43 * v + .59) + .14); return Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2); }; gl.clearColor(tm(env.fog[0]), tm(env.fog[1]), tm(env.fog[2]), 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    lights.sort((a, b) => (b.pri - a.pri) || ((a.x - p[0]) ** 2 + (a.z - p[2]) ** 2) - ((b.x - p[0]) ** 2 + (b.z - p[2]) ** 2));
    for (let i = 0; i < 8; i++) { const L = lights[i]; if (L) { LP[i * 4] = L.x; LP[i * 4 + 1] = L.y; LP[i * 4 + 2] = L.z; LP[i * 4 + 3] = Math.max(.01, L.r); LC[i * 3] = L.c[0] * L.k; LC[i * 3 + 1] = L.c[1] * L.k; LC[i * 3 + 2] = L.c[2] * L.k; } else { LP[i * 4] = LP[i * 4 + 1] = LP[i * 4 + 2] = 0; LP[i * 4 + 3] = 1; LC[i * 3] = LC[i * 3 + 1] = LC[i * 3 + 2] = 0; } }
    let u = pMain.u; gl.useProgram(pMain.p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(u.uSh, 0); gl.uniform1f(u.uT, env.t); gl.uniform1f(u.uQ, env.q); gl.uniform1f(u.uWet, env.wet); gl.uniform1f(u.uMist, env.mist); gl.uniform4fv(u.uGr, env.gr); gl.uniform3fv(u.uGe, env.ge);
    gl.uniform3fv(u.uSun, env.sun); gl.uniform3fv(u.uSunC, env.sunC); gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uGnd, env.gnd); gl.uniform3fv(u.uFog, env.fog);
    gl.uniform3fv(u.uEye, cam.eye); gl.uniform3fv(u.uPl, env.player); gl.uniform2f(u.uFogR, env.fogN, env.fogF); gl.uniform1f(u.uLR, env.lightR); gl.uniform4fv(u.uTP, TPv()); gl.uniform3fv(u.uTC, env.ptc); gl.uniform1f(u.uTR, env.ptr); gl.uniform1f(u.uScat, env.scat);
    gl.uniform4fv(u['uLP[0]'], LP); gl.uniform3fv(u['uLC[0]'], LC);
    gl.uniform1f(pMain.u.uRim, 0); env.solo || drawSet('stat');
    if (envOn()) { syncS(pMesh, 0, UM()); gl.uniform1f(pMesh.u.uRim, 0); gl.uniform1f(pMesh.u.uOut, 0); gl.uniform1i(pMesh.u.uTex, 5); env.solo || drawSet('stat', 1); gl.useProgram(pMain.p); }
    // hero ghost: drawn against the world only, before the hero, so it shows only where walls or trees hide them
    { let n = 0; for (const g in sets.xr) n += sets.xr[g].n; if (n && !env.solo) { const gu = pGlow.u; gl.useProgram(pGlow.p); gl.uniformMatrix4fv(gu.uVP, false, vp); gl.uniformMatrix4fv(gu.uLVP, false, lvp); gl.uniform3fv(gu.uPl, env.player); gl.uniform1f(gu.uLR, env.lightR); gl.uniform1f(gu.uT, env.t); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); gl.depthFunc(gl.GREATER); drawSet('xr'); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.useProgram(pMain.p); } }
    if (env.q > 0 && env.outline !== false) { gl.uniform1f(pMain.u.uOut, .026); drawSet('dyn'); gl.uniform1f(pMain.u.uOut, 0); } // a thin ink outline so heroes and monsters stand out from the ground
    gl.uniform1f(pMain.u.uRim, env.q > 0 ? .8 : .4); drawSet('dyn'); gl.uniform1f(pMain.u.uRim, 0);
    if (SKD.length) { const U = UM();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); syncS(pMainS, 0, U); const su = pMainS.u;
      if (env.q > 0 && env.outline !== false) { gl.uniform1f(su.uRim, 0); gl.uniform1f(su.uOut, .026); drawSkinned(pMainS); }
      gl.uniform1f(su.uOut, 0); gl.uniform1f(su.uRim, env.q > 0 ? .8 : .4); drawSkinned(pMainS); gl.useProgram(pMain.p); }
    u = pGlow.u; gl.useProgram(pGlow.p); gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.uniform3fv(u.uPl, env.player); gl.uniform1f(u.uLR, env.lightR); gl.uniform1f(u.uT, env.t);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); drawSet('glow'); gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, post.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, post.sc.f); const mid = env.q > 0; gl.blitFramebuffer(0, 0, post.w, post.h, 0, 0, post.w, post.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    // contact shading needs the depth buffer as a texture; if this graphics card refuses the copy, switch the effect off for good rather than risk a dark screen
    if (env.q > 1 && aoOK) { if (aoOK === 1) gl.getError(); gl.blitFramebuffer(0, 0, post.w, post.h, 0, 0, post.w, post.h, gl.DEPTH_BUFFER_BIT, gl.NEAREST); if (aoOK === 1) aoOK = gl.getError() === gl.NO_ERROR ? 2 : 0; }
    const hi = env.q > 1 && aoOK === 2;
    gl.disable(gl.DEPTH_TEST); gl.useProgram(pPost.p); gl.uniform1f(pPost.u.uT, env.t);
    quad(post.a, 0, post.sc.t); quad(post.b, 1, post.a.t, null, 1 / post.a.w, 0); quad(post.a, 1, post.b.t, null, 0, 1 / post.a.h);
    if (env.q > 0) { quad(post.b, 1, post.a.t, null, 2 / post.a.w, 0); quad(post.a, 1, post.b.t, null, 0, 2 / post.a.h); }
    if (mid) { quad(post.d, 1, post.sc.t, null, 1.4 / post.c.w, 0); quad(post.c, 1, post.d.t, null, 0, 1.4 / post.c.h); }
    if (hi) { gl.uniform4f(pPost.u.uPI, proj[0], proj[5], proj[10], proj[14]); quad(post.e, 3, post.sc.t, null, 0, 0, null, post.dt); quad(post.f, 1, post.e.t, null, 1 / post.e.w, 0); quad(post.e, 1, post.f.t, null, 0, 1 / post.e.h); }
    gl.uniform4f(pPost.u.uFx, mid ? env.dof : 0, hi ? env.ao : 0, mid ? .012 : 0, mid ? .28 : 0); gl.uniform1f(pPost.u.uWarm, env.warm || 0);
    quad(null, 2, post.sc.t, post.a.t, 0, 0, mid ? post.c.t : null, hi ? post.e.t : null); gl.enable(gl.DEPTH_TEST);
  }
  // ---- build 0039: real character models (see models.js). The mesh sits on the graphics card once; each frame only the pose is sent ----
  let libP = null; const models = {}, SKD = [], BR = 64, MI = { state: 'waiting', why: 'starts when a Ranger is on screen' }; let boneTex = null, boneW = 0, boneData = null, boneRows = 0;
  function model(name, url) { let m = models[name]; if (m) return m.ready ? m : null; m = models[name] = { ready: false }; if (typeof fetch === 'undefined' || typeof CDM === 'undefined' || !gl || !pMainS) { if (MI.state !== 'off') { MI.state = 'off'; MI.why = !pMainS ? 'no model shader' : 'model reader missing'; } return null; } MI.state = 'loading'; MI.why = '';
    const get = u => fetch(u).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('download failed, HTTP ' + r.status)));
    get(url).then(ab => { MI.why = (ab.byteLength / 1048576).toFixed(1) + ' MB'; Object.assign(m, CDM.parse(ab)); if (!m.head.lib) return;
      /* build 0042: mesh-only models share one animation file, downloaded once */ if (!libP) libP = get(url.replace(/[^/?]*\.cdm/, 'anims.cdl')).then(CDM.lib); return libP.then(L => CDM.link(m, L)); }).then(() => { for (let k = 0; k < 32 && gl.getError() !== gl.NO_ERROR; k++); /* clear errors left by earlier drawing, so only the upload's own count */ upModel(m); const er = gl.getError(); if (er !== gl.NO_ERROR) throw new Error('graphics card error 0x' + er.toString(16) + ' on upload'); m.ready = true; MI.state = 'on'; MI.why = name + ' loaded'; }).catch(e => { m.failed = true; MI.state = 'off'; MI.why = String(e && e.message || e).slice(0, 140); console.warn('model ' + name + ' failed to load', e); }); return null; }
  function upModel(m) {
    const V = m.head.v, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = (data, loc, n, type, norm, st) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, type, norm, st || 0, 0); };
    vb(m.pos, 0, 3, gl.FLOAT, false); vb(m.nrm, 1, 3, gl.BYTE, true, 4); vb(m.jn, 8, 4, gl.UNSIGNED_BYTE, false); vb(m.wt, 9, 4, gl.UNSIGNED_BYTE, true);
    if (m.col) vb(m.col, 10, 4, gl.UNSIGNED_BYTE, true); else { gl.disableVertexAttribArray(10); }
    if (m.idx) { const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW); m.itype = m.head.i32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT; m.isz = m.head.i32 ? 4 : 2; }
    gl.bindVertexArray(null); m.vao = vao; m.hasIdx = !!m.idx; m.hasCol = !!m.col; m.pos = m.nrm = m.jn = m.wt = m.col = m.idx = null; m.V = V;
    const w = m.head.bones * 3; if (w > boneW) { boneW = w; if (boneTex) gl.deleteTexture(boneTex); boneTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, boneTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, boneW, BR, 0, gl.RGBA, gl.FLOAT, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); boneData = new Float32Array(boneW * 4 * BR); }
  }
  // draw model m posed by layers ([[anim, time, loop, weight], ...]) at matrix B; look(gi, group) gives [colour, glow, material] for each colour group, or null to hide it
  function drawModel(m, B, layers, look) {
    if (!m || !m.ready || !skinOK || boneRows >= BR) return false; CDM.pose(m, layers); const r = boneRows++, S = m.S, n = m.head.bones, o = r * boneW * 4;
    for (let b = 0; b < n; b++) { const s = b * 12, d = o + b * 12; for (let k = 0; k < 3; k++) { boneData[d + k * 4] = S[s + k]; boneData[d + k * 4 + 1] = S[s + 3 + k]; boneData[d + k * 4 + 2] = S[s + 6 + k]; boneData[d + k * 4 + 3] = S[s + 9 + k]; } }
    const groups = m.head.groups; for (let gi = 0; gi < groups.length; gi++) { const L = look ? look(gi, groups[gi]) : [groups[gi].col, 0, groups[gi].mat]; if (!L) continue; SKD.push({ m, r, start: groups[gi].start, count: groups[gi].count, M: Float32Array.from(B), c: L[0], em: L[1] || 0, mat: L[2] || 0 }); }
    return true;
  }
  let skinOK = true;
  function drawSkinned(P) {
    if (!SKD.length || !skinOK) return; try { gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, boneTex); gl.uniform1i(P.u.uBones, 4); gl.activeTexture(gl.TEXTURE0);
    for (const d of SKD) { gl.bindVertexArray(d.m.vao); gl.uniform1i(P.u.uBR, d.r); for (let i = 0; i < 4; i++) gl.vertexAttrib4f(2 + i, d.M[i * 4], d.M[i * 4 + 1], d.M[i * 4 + 2], d.M[i * 4 + 3]); gl.vertexAttrib4f(6, d.c[0], d.c[1], d.c[2], 1); gl.vertexAttrib2f(7, d.em, d.mat); if (!d.m.hasCol) gl.vertexAttrib4f(10, 1, 1, 1, 1); env.verts += d.count; if (d.m.hasIdx) gl.drawElements(gl.TRIANGLES, d.count, d.m.itype, d.start * d.m.isz); else gl.drawArrays(gl.TRIANGLES, d.start, d.count); }
    } catch (e) { skinOK = false; MI.state = 'off'; MI.why = 'drawing failed: ' + String(e && e.message || e).slice(0, 120); console.warn('real models switched off', e); } gl.bindVertexArray(null);
  }
  function upBones() { if (!boneRows) return; gl.bindTexture(gl.TEXTURE_2D, boneTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, boneW, boneRows, gl.RGBA, gl.FLOAT, boneData.subarray(0, boneW * 4 * boneRows)); }
  // shared uniforms for the skinned copy of a program, copied from the plain program's current values
  function syncS(P, keys, vals) { gl.useProgram(P.p); for (const k in vals) { const v = vals[k], u = P.u[k]; if (!u) continue; if (v.length === 16) gl.uniformMatrix4fv(u, false, v); else if (v.length === 32) gl.uniform4fv(u, v); else if (v.length === 24) gl.uniform3fv(u, v); else if (v.length === 3) gl.uniform3fv(u, v); else if (v.length === 4) gl.uniform4fv(u, v); else if (v.length === 2) gl.uniform2fv(u, v); else gl.uniform1f(u, v[0]); } if (P.u.uSh) gl.uniform1i(P.u.uSh, 0); }
  return { glowK: v => { GK = v; }, init, resize, col, base, obj, part, halo, light, setCamera, toScreen, groundAt, begin, statBegin, statChunk, statEnd, render, env, cam, model, drawModel, modelInfo: () => MI, envLoad, envOn, envInfo: () => ENVM, attach: (m, name, o) => m && m.ready ? CDM.attach(m, name, o) : null };
})();
