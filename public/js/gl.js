'use strict';
// Minimal instanced WebGL2 renderer: lit + shadow-mapped opaque pass, additive glow pass.
const GLX = (() => {
  const STRIDE = 22, SH = 2048;
  let gl, cv, pMain, pDepth, pGlow, pPost, fbo, shTex, post = null;
  const geo = {}, sets = { stat: {}, dyn: {}, glow: {} };
  const view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16), ivp = new Float32Array(16),
    lvp = new Float32Array(16), t1 = new Float32Array(16), t2 = new Float32Array(16), M = new Float32Array(16);
  const cam = { eye: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1] };
  const env = { sun: [.4, .8, .45], sunC: [1, 1, 1], sky: [.3, .3, .4], gnd: [.1, .1, .1], fog: [0, 0, 0], fogN: 45, fogF: 85, player: [0, 0, 0], lightR: 26, t: 0, q: 2 };
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
  function gTuft(B) {
    const v = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let b = 0; b < B; b++) {
      const a = b / B * 6.28319 + r() * .7, dx = Math.cos(a), dz = Math.sin(a), L = b ? .16 + r() * .34 : .04, H = b ? .55 + r() * .45 : 1, w = .05 + r() * .03, px = -dz, pz = dx;
      const nl = Math.hypot(dx * .35, 1, dz * .35), n = [dx * .35 / nl, 1 / nl, dz * .35 / nl], pt = [];
      for (let k = 0; k <= 3; k++) { const t = k / 3, o = L * t * t + .05 * t, ww = w * (1 - t * .85); pt.push([dx * o - px * ww, H * t - .5, dz * o - pz * ww], [dx * o + px * ww, H * t - .5, dz * o + pz * ww]); }
      for (let k = 0; k < 3; k++) { const A = pt[k * 2], Bq = pt[k * 2 + 1], C = pt[k * 2 + 2], D = pt[k * 2 + 3]; v.push(...A, ...n, ...Bq, ...n, ...D, ...n, ...A, ...n, ...D, ...n, ...C, ...n); }
    } return v;
  }
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
  const N3 = `float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
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
uniform mat4 uVP,uLVP; out vec3 vW,vN,vL; out vec4 vC; out vec2 vE; out vec4 vS;
${N3}
${WPOS}
void main(){vec4 w=wpos(iM,aP,aN,iE.y);vW=w.xyz;vL=aP;mat3 m=mat3(iM);vec3 sc=vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));vN=normalize(m*(aN/max(sc,vec3(1e-6))));vC=iC;vE=iE;vS=uLVP*w;gl_Position=uVP*w;}`;
  const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW,vN,vL; in vec4 vC; in vec2 vE; in vec4 vS;
uniform sampler2DShadow uSh; uniform vec3 uSun,uSunC,uSky,uGnd,uFog,uEye,uPl; uniform vec2 uFogR; uniform float uLR,uQ; uniform vec4 uLP[8]; uniform vec3 uLC[8]; out vec4 o;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
${N3}
void main(){float mat=vE.y;vec3 n=normalize(vN);vec3 a=vC.rgb;float spec=.12,shin=20.,wrap=0.,ao=1.;
 if(mat>0.&&mat<1.5){
  float f1=ns(vW.xz*.11)*.6+ns(vW.xz*.31)*.4,f2=ns(vW.xz*1.1),f3=ns(vW.xz*7.);
  vec3 dirt=vec3(dot(a,vec3(.45)))*vec3(1.5,1.12,.72);
  a=mix(a*(.6+.7*f2),dirt*(.7+.4*f3),smoothstep(.5,.68,f1+(f2-.5)*.25));
  a*=.8+.4*f3;if(uQ>.5){float f4=ns(vW.xz*19.),f5=ns(vW.xz*vec2(31.,5.)+f2*4.);a*=.82+.36*f4;a=mix(a,a*vec3(1.25,1.2,.8),smoothstep(.72,.9,f5)*.5);a*=1.-.35*smoothstep(.78,.95,ns(vW.xz*3.3+20.));n=normalize(n+vec3(ns(vW.xz*2.3+3.)-.5,0.,ns(vW.xz*2.3+9.)-.5)*.55+vec3(f4-.5,0.,ns(vW.xz*19.+7.)-.5)*.35);}spec=.03;
 }else{
  ao=mix(.42,1.,smoothstep(0.,1.6,vW.y));
  if(mat>1.5&&mat<2.5){a*=.55+.9*n3(vW*2.4);wrap=.5;spec=.05;if(uQ>.5){float lf=n3(vW*8.5),l2=n3(vW*17.+3.);a*=mix(.5,1.3,smoothstep(.28,.72,lf));a=mix(a,a*vec3(1.35,1.25,.7),smoothstep(.6,.9,l2)*max(dot(n,uSun),0.)*.8);a*=.62+.38*clamp(n.y*.6+.6,0.,1.);n=normalize(n+(vec3(n3(vW*3.1),n3(vW*3.1+5.),n3(vW*3.1+9.))-.5)*1.1+(vec3(lf,l2,n3(vW*8.5+4.))-.5)*.9);}}
  else if(mat>2.5&&mat<3.5){a*=.6+.8*n3(vW*vec3(3.,1.2,3.));spec=.06;if(uQ>.5){float bk=n3(vec3(vW.x*9.,vW.y*1.1,vW.z*9.)),cr=n3(vW*vec3(14.,3.,14.)+9.);a*=mix(.55,1.2,bk);a*=1.-.45*smoothstep(.7,.85,cr);a=mix(a,a*vec3(.7,1.15,.6),smoothstep(.55,.8,n3(vW*1.7+30.))*clamp(n.y*.8+.3,0.,1.)*.6);n=normalize(n+(vec3(n3(vW*4.),n3(vW*4.+5.),n3(vW*4.+9.))-.5)*.9+vec3(bk-.5,0.,cr-.5)*.8);}}
  else if(mat>3.5&&mat<4.5){spec=.5;shin=56.;a*=.5+.25*n3(vW*9.);}
  else if(mat>4.5&&mat<5.5){float t=clamp(vL.y+.5,0.,1.);a*=mix(.6,1.3,t)*(.8+.4*ns(vW.xz*1.3));ao=mix(.85,1.,t);wrap=.7;spec=.02;}
  else a*=.88+.24*n3(vW*5.);
 }
 vec3 sp=vS.xyz/vS.w*.5+.5;float sh=1.;
 if(sp.x>0.&&sp.x<1.&&sp.y>0.&&sp.y<1.&&sp.z<1.){if(uQ>.5){sh=0.;vec2 t=vec2(1.3/2048.);for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)sh+=texture(uSh,vec3(sp.xy+vec2(float(i),float(j))*t,sp.z-.0012));sh/=9.;}else sh=texture(uSh,vec3(sp.xy,sp.z-.0015));}
 vec3 V=normalize(uEye-vW);
 float dif=max((dot(n,uSun)+wrap)/(1.+wrap),0.);
 float sl=pow(max(dot(n,normalize(uSun+V)),0.),shin)*spec;
 vec3 c=a*(mix(uGnd,uSky,n.y*.5+.5)*ao+uSunC*dif*sh)+uSunC*sl*sh;
 for(int i=0;i<8;i++){vec3 d=uLP[i].xyz-vW;float dist=length(d);float at=clamp(1.-dist/uLP[i].w,0.,1.);at*=at;vec3 L=d/max(dist,.001);c+=uLC[i]*at*(a*max(dot(n,L),.2)+.5*spec*pow(max(dot(n,normalize(L+V)),0.),shin));}
 c+=a*uSky*pow(1.-max(dot(n,V),0.),3.)*1.2*ao;
 c+=vC.rgb*vE.x;
 float pd=length(vW.xz-uPl.xz);c*=mix(1.,.08,smoothstep(uLR*.45,uLR,pd));
 c=mix(c,uFog,smoothstep(uFogR.x,uFogR.y,length(vW-uEye)));
 c=c/(c+vec3(.6))*1.45;o=vec4(pow(c,vec3(1./2.2)),1.);}`;
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
precision highp float; in vec2 uv; uniform sampler2D uA,uB; uniform int uMode; uniform vec2 uDir; uniform float uT; out vec4 o;
void main(){
 if(uMode==0){vec3 c=texture(uA,uv).rgb;float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(.7,1.,l),1.);}
 else if(uMode==1){vec3 c=texture(uA,uv).rgb*.227;c+=(texture(uA,uv+uDir*1.385).rgb+texture(uA,uv-uDir*1.385).rgb)*.316;c+=(texture(uA,uv+uDir*3.231).rgb+texture(uA,uv-uDir*3.231).rgb)*.07;o=vec4(c,1.);}
 else{vec3 c=texture(uA,uv).rgb+texture(uB,uv).rgb*.8;vec2 q=uv-.5;c*=1.-dot(q,q)*.9;
  float l=dot(c,vec3(.3,.59,.11));c=mix(vec3(l),c,1.1);c=(c-.5)*1.1+.5;c=mix(c,c*vec3(1.04,1.,.94),.6);
  c+=(fract(sin(dot(uv+fract(uT),vec2(12.9898,78.233)))*43758.5453)-.5)*.018;o=vec4(c,1.);}}`;
  function prog(vs, fs, names) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n); return { p, u };
  }

  function init(canvas) {
    cv = canvas; gl = cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    addGeo('box', gBox()); addGeo('sphere', gSphere(20, 13)); addGeo('gem', gSphere(4, 2)); addGeo('cyl', gCyl(16, 1)); addGeo('cone', gCyl(14, 0)); addGeo('blade', gCyl(3, 0)); addGeo('tuft', gTuft(7));
    addGeo('taper', gCyl(14, .6)); addGeo('blob', gSphere(10, 7)); addGeo('fol', gCyl(9, 0)); addGeo('trunk', gCyl(7, .6)); addGeo('disc', gDisc(28, 0)); addGeo('ring', gDisc(36, .86));
    pMain = prog(VS, FS, ['uVP', 'uLVP', 'uSh', 'uSun', 'uSunC', 'uSky', 'uGnd', 'uFog', 'uEye', 'uPl', 'uFogR', 'uLR', 'uLP[0]', 'uLC[0]', 'uT', 'uQ']);
    pGlow = prog(VS, FSG, ['uVP', 'uLVP', 'uPl', 'uLR', 'uT']);
    pDepth = prog(VSD, FSD, ['uLVP', 'uT']); pPost = prog(VSQ, FSQ, ['uA', 'uB', 'uMode', 'uDir', 'uT']);
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
  function resize() { const d = Math.min(window.devicePixelRatio || 1, (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 1.25 : 1.5); const k = d * [.72, .86, 1][env.q]; const w = Math.max(2, Math.floor(cv.clientWidth * k)), h = Math.max(2, Math.floor(cv.clientHeight * k)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }

  function mkTex(w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
  function ensurePost() {
    const w = cv.width, h = cv.height; if (post && post.w === w && post.h === h && post.q === env.q) return;
    if (post) { gl.deleteFramebuffer(post.ms); gl.deleteRenderbuffer(post.rc); gl.deleteRenderbuffer(post.rd); for (const k of ['sc', 'a', 'b']) { gl.deleteTexture(post[k].t); gl.deleteFramebuffer(post[k].f); } }
    const smp = env.q > 1 ? Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0) : 0;
    const rc = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rc); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, gl.RGBA8, w, h);
    const rd = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rd); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, smp, gl.DEPTH_COMPONENT24, w, h);
    const ms = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, ms); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rc); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rd);
    const bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2);
    post = { w, h, q: env.q, ms, rc, rd, sc: mkTex(w, h), a: mkTex(bw, bh), b: mkTex(bw, bh) }; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function quad(target, mode, texA, texB, dx, dy) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, target ? target.w : cv.width, target ? target.h : cv.height);
    const u = pPost.u; gl.uniform1i(u.uMode, mode); gl.uniform2f(u.uDir, dx || 0, dy || 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB || texA); gl.uniform1i(u.uB, 1); gl.activeTexture(gl.TEXTURE0); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let curChunk = null; const chunks = {};
  function batch(set, g) {
    const box = set === 'stat' ? curChunk.b : sets[set]; let b = box[g];
    if (!b) {
      const Gm = geo[g]; b = { g: Gm, n: 0, cap: 256, data: new Float32Array(STRIDE * 256), vao: gl.createVertexArray(), buf: gl.createBuffer() };
      gl.bindVertexArray(b.vao); gl.bindBuffer(gl.ARRAY_BUFFER, Gm.vbo);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); const sb = STRIDE * 4;
      for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(2 + i); gl.vertexAttribPointer(2 + i, 4, gl.FLOAT, false, sb, i * 16); gl.vertexAttribDivisor(2 + i, 1); }
      gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, sb, 64); gl.vertexAttribDivisor(6, 1);
      gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 2, gl.FLOAT, false, sb, 80); gl.vertexAttribDivisor(7, 1);
      gl.bindVertexArray(null); box[g] = b;
    } return b;
  }
  function put(set, g, m, c, em, a, e2) {
    const b = batch(set, g);
    if (b.n >= b.cap) { b.cap *= 2; const d = new Float32Array(STRIDE * b.cap); d.set(b.data); b.data = d; }
    const o = b.n * STRIDE, d = b.data; for (let i = 0; i < 16; i++) d[o + i] = m[i];
    d[o + 16] = c[0]; d[o + 17] = c[1]; d[o + 18] = c[2]; d[o + 19] = a === undefined ? 1 : a; d[o + 20] = em || 0; d[o + 21] = e2 || 0; b.n++;
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
  function begin() { env.verts = 0; for (const g in sets.dyn) sets.dyn[g].n = 0; for (const g in sets.glow) sets.glow[g].n = 0; lights.length = 0; }
  function statBegin() { for (const k in chunks) { for (const g in chunks[k].b) { gl.deleteBuffer(chunks[k].b[g].buf); gl.deleteVertexArray(chunks[k].b[g].vao); } delete chunks[k]; } statChunk('all', 0, 0, true); }
  function statChunk(key, x, z, always) { curChunk = chunks[key] || (chunks[key] = { x, z, always: !!always, b: {} }); }
  function upload(set, usage) { const box = typeof set === 'string' ? sets[set] : set; for (const g in box) { const b = box[g]; if (!b.n) continue; gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.bufferData(gl.ARRAY_BUFFER, b.data.subarray(0, b.n * STRIDE), usage); } }
  function statEnd() { for (const k in chunks) { upload(chunks[k].b, gl.STATIC_DRAW); for (const g in chunks[k].b) { const b = chunks[k].b[g]; b.data = null; } } }
  let depthPass = false;
  function drawSet(set) {
    if (set === 'stat') { const p = env.player; for (const k in chunks) { const c = chunks[k]; if (!c.always && (Math.abs(c.x - p[0]) > 48 || c.z - p[2] > 32 || p[2] - c.z > 56)) continue; drawSet(c.b); } return; }
    const box = typeof set === 'string' ? sets[set] : set; for (const g in box) { const b = box[g]; if (!b.n || (depthPass && (g === 'blade' || g === 'disc' || g === 'tuft'))) continue; gl.bindVertexArray(b.vao); env.verts += b.g.count * b.n; gl.drawArraysInstanced(gl.TRIANGLES, 0, b.g.count, b.n); } }
  const LP = new Float32Array(32), LC = new Float32Array(24);
  function render() {
    resize(); ensurePost(); upload('dyn', gl.DYNAMIC_DRAW); upload('glow', gl.DYNAMIC_DRAW);
    const p = env.player, s = env.sun;
    lookAt(t1, [p[0] + s[0] * 60, s[1] * 60, p[2] + s[2] * 60], [p[0], 0, p[2]], [0, 1, 0]); ortho(t2, -38, 38, -38, 38, 1, 140); mul(lvp, t2, t1);
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, SH, SH); gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(pDepth.p); gl.uniformMatrix4fv(pDepth.u.uLVP, false, lvp); gl.uniform1f(pDepth.u.uT, env.t);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4); depthPass = true; drawSet('stat'); drawSet('dyn'); depthPass = false; gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, post.ms); gl.viewport(0, 0, cv.width, cv.height);
    const tm = v => Math.pow(v / (v + .6) * 1.45, 1 / 2.2); gl.clearColor(tm(env.fog[0]), tm(env.fog[1]), tm(env.fog[2]), 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    lights.sort((a, b) => (b.pri - a.pri) || ((a.x - p[0]) ** 2 + (a.z - p[2]) ** 2) - ((b.x - p[0]) ** 2 + (b.z - p[2]) ** 2));
    for (let i = 0; i < 8; i++) { const L = lights[i]; if (L) { LP[i * 4] = L.x; LP[i * 4 + 1] = L.y; LP[i * 4 + 2] = L.z; LP[i * 4 + 3] = Math.max(.01, L.r); LC[i * 3] = L.c[0] * L.k; LC[i * 3 + 1] = L.c[1] * L.k; LC[i * 3 + 2] = L.c[2] * L.k; } else { LP[i * 4] = LP[i * 4 + 1] = LP[i * 4 + 2] = 0; LP[i * 4 + 3] = 1; LC[i * 3] = LC[i * 3 + 1] = LC[i * 3 + 2] = 0; } }
    let u = pMain.u; gl.useProgram(pMain.p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(u.uSh, 0); gl.uniform1f(u.uT, env.t); gl.uniform1f(u.uQ, env.q > 0 ? 1 : 0);
    gl.uniform3fv(u.uSun, env.sun); gl.uniform3fv(u.uSunC, env.sunC); gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uGnd, env.gnd); gl.uniform3fv(u.uFog, env.fog);
    gl.uniform3fv(u.uEye, cam.eye); gl.uniform3fv(u.uPl, env.player); gl.uniform2f(u.uFogR, env.fogN, env.fogF); gl.uniform1f(u.uLR, env.lightR);
    gl.uniform4fv(u['uLP[0]'], LP); gl.uniform3fv(u['uLC[0]'], LC);
    drawSet('stat'); drawSet('dyn');
    u = pGlow.u; gl.useProgram(pGlow.p); gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp); gl.uniform3fv(u.uPl, env.player); gl.uniform1f(u.uLR, env.lightR); gl.uniform1f(u.uT, env.t);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); drawSet('glow'); gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, post.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, post.sc.f); gl.blitFramebuffer(0, 0, post.w, post.h, 0, 0, post.w, post.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.disable(gl.DEPTH_TEST); gl.useProgram(pPost.p); gl.uniform1f(pPost.u.uT, env.t);
    quad(post.a, 0, post.sc.t); quad(post.b, 1, post.a.t, null, 1 / post.a.w, 0); quad(post.a, 1, post.b.t, null, 0, 1 / post.a.h);
    if (env.q > 0) { quad(post.b, 1, post.a.t, null, 2 / post.a.w, 0); quad(post.a, 1, post.b.t, null, 0, 2 / post.a.h); }
    quad(null, 2, post.sc.t, post.a.t); gl.enable(gl.DEPTH_TEST);
  }
  return { init, resize, col, base, obj, part, halo, light, setCamera, toScreen, groundAt, begin, statBegin, statChunk, statEnd, render, env, cam };
})();
