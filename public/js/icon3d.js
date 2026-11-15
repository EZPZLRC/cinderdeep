/* 3D item icons. Each item's painted icon is turned into a real 3D piece: the shape is raised into a solid with
   thickness and rounded bevels, its painted details are pressed into the surface, and it is lit and rendered at a
   three-quarter angle with shine that suits its material (metal and gems gleam, leather and cloth stay soft).
   Every item is rendered once into a small picture and kept, so the bag costs nothing after that. Hovering an item
   turns it slowly in the light. Without WebGL2 the flat icon is used, exactly as before. */
const ICON3D = (() => {
  const T = 192, OUT = 176, N = 144, DEPTH = .12, cache = new Map(), meshes = new Map(), queue = [], waiting = new Map();
  const MAT = { metal: [.55, .6, 36, .18], jewel: [.7, .7, 50, .2], wood: [.14, 0, 24, .08], leather: [.12, 0, 20, .06], cloth: [.05, 0, 10, .04] }; // spec, metalness, shininess, rim
  let R0 = null, R1 = null, busy = false, dead = false;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

  const VS = `#version 300 es
  in vec2 a; uniform sampler2D hT; uniform mat4 M, P; uniform float D; out vec2 vU; out float vH; out vec3 vW;
  void main(){ vU = a; float h = texture(hT, a).r; vH = h; vec4 w = M * vec4(a.x - .5, .5 - a.y, h * D, 1.); vW = w.xyz; gl_Position = P * w; }`;
  const FS = `#version 300 es
  precision highp float; in vec2 vU; in float vH; in vec3 vW; uniform sampler2D hT, cT; uniform mat4 M; uniform float D, ks, mt, sh, rim; uniform vec2 tx; out vec4 o;
  void main(){
    if (vH < .02) discard;
    vec4 c = texture(cT, vU); vec3 base = c.rgb;
    float hx = texture(hT, vU + vec2(tx.x, 0.)).r - texture(hT, vU - vec2(tx.x, 0.)).r, hy = texture(hT, vU + vec2(0., tx.y)).r - texture(hT, vU - vec2(0., tx.y)).r;
    vec3 n = normalize(mat3(M) * normalize(vec3(-hx * D / (2. * tx.x), hy * D / (2. * tx.y), 1.)));
    vec3 V = normalize(-vW), L = normalize(vec3(-.65, .72, .25)), L2 = normalize(vec3(.8, -.2, .4));
    float side = smoothstep(.52, .36, vH); base *= mix(1., .55, side);
    float dif = max(dot(n, L), 0.), dif2 = max(dot(n, L2), 0.) * .18, hemi = mix(.16, .34, n.y * .5 + .5);
    vec3 r = reflect(-V, n); vec3 env = mix(vec3(.12, .1, .1), vec3(.82, .76, .68), smoothstep(-.25, .8, r.y)) + vec3(1., .55, .25) * .25 * smoothstep(.2, .9, -r.x);
    float lum = dot(base, vec3(.3, .59, .11)), sat = max(base.r, max(base.g, base.b)) - min(base.r, min(base.g, base.b));
    float gem = smoothstep(.35, .6, sat) * smoothstep(.3, .6, lum);
    vec3 col = base * (dif * .78 + dif2 + hemi);
    col = mix(col, base * env * (.45 + dif * .55), mt * .55 * (1. - gem));
    float sp = pow(max(dot(n, normalize(L + V)), 0.), sh) * ks + pow(max(dot(n, normalize(L + V)), 0.), 90.) * gem * 1.4;
    col += vec3(1., .96, .88) * sp * .8 * (1. - side * .6);
    col += vec3(1., .72, .42) * pow(1. - max(dot(n, V), 0.), 3.) * rim;
    o = vec4(col, 1.);
  }`;
  function Renderer(cv) {
    const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true });
    if (!gl) throw new Error('no webgl2');
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const k of ['hT', 'cT', 'M', 'P', 'D', 'ks', 'mt', 'sh', 'rim', 'tx']) u[k] = gl.getUniformLocation(p, k);
    const v = new Float32Array((N + 1) * (N + 1) * 2); let q = 0; for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) { v[q++] = x / N; v[q++] = y / N; }
    const ix = new Uint32Array(N * N * 6); q = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * (N + 1) + x; ix.set([i, i + N + 1, i + 1, i + 1, i + N + 1, i + N + 2], q); q += 6; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW); const al = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
    const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const hT = tex(), cT = tex(); let cur = null;
    const persp = (f, a, n, fa) => { const t = 1 / Math.tan(f / 2); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]); };
    const P = persp(.5, 1, .5, 10);
    function model(yaw, pitch) { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), s = 1.32; // rotate Y then X, push back from the camera
      return new Float32Array([cy * s, sy * sp * s, -sy * cp * s, 0, 0, cp * s, sp * s, 0, sy * s, -cy * sp * s, cy * cp * s, 0, 0, .02, -2.6, 1]); }
    this.gl = gl;
    this.draw = (m, yaw, pitch) => {
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.useProgram(p); gl.bindVertexArray(vao);
      if (cur !== m) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hT); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, T, T, 0, gl.RED, gl.UNSIGNED_BYTE, m.h);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, T, T, 0, gl.RGBA, gl.UNSIGNED_BYTE, m.c); cur = m; }
      else { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hT); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cT); }
      const mt = MAT[m.kind] || MAT.metal;
      gl.uniform1i(u.hT, 0); gl.uniform1i(u.cT, 1); gl.uniformMatrix4fv(u.M, false, model(yaw, pitch)); gl.uniformMatrix4fv(u.P, false, P); gl.uniform1f(u.D, DEPTH); gl.uniform1f(u.ks, mt[0]); gl.uniform1f(u.mt, mt[1]); gl.uniform1f(u.sh, mt[2]); gl.uniform1f(u.rim, mt[3]); gl.uniform2f(u.tx, 1.5 / T, 1.5 / T);
      gl.drawElements(gl.TRIANGLES, N * N * 6, gl.UNSIGNED_INT, 0);
    };
  }
  // The flat icon, drawn with the shared gradients and textures it uses, as a picture we can read.
  function raster(svg) {
    const defs = document.getElementById('ixdefs'), ids = new Set([...svg.matchAll(/url\(#([\w-]+)\)/g)].map(m => m[1]));
    let d = ''; for (const id of ids) { const e = defs && defs.querySelector('#' + id); if (e) d += e.outerHTML; }
    const box = document.createElement('div'); box.innerHTML = svg; const el = box.firstElementChild; // the page's own parser tidies the markup into a valid picture
    el.setAttribute('width', T); el.setAttribute('height', T); el.insertAdjacentHTML('afterbegin', '<defs>' + d + '</defs>');
    const src = new XMLSerializer().serializeToString(el);
    return new Promise((ok, no) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = T; const x = c.getContext('2d'); x.drawImage(im, 0, 0, T, T); try { ok(x.getImageData(0, 0, T, T).data); } catch (e) { no(e); } }; im.onerror = no; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); });
  }
  const blur = (a, r) => { const b = new Float32Array(T * T), o = new Float32Array(T * T), w = 2 * r + 1; // box blur, rows then columns
    for (let y = 0; y < T; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * T + Math.min(T - 1, Math.max(0, x))]; for (let x = 0; x < T; x++) { b[y * T + x] = s / w; s += a[y * T + Math.min(T - 1, x + r + 1)] - a[y * T + Math.max(0, x - r)]; } }
    for (let x = 0; x < T; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(T - 1, Math.max(0, y)) * T + x]; for (let y = 0; y < T; y++) { o[y * T + x] = s / w; s += b[Math.min(T - 1, y + r + 1) * T + x] - b[Math.max(0, y - r) * T + x]; } }
    return o; };
  // Height: a solid slab where the icon is, rounded at its edges, with its painted details pressed in. Colour is
  // pushed out past the edge so the sides of the slab carry the colour of the face above them.
  function build(px, kind) {
    const n = T * T, A = new Float32Array(n), Lm = new Float32Array(n); for (let i = 0; i < n; i++) { A[i] = px[i * 4 + 3] / 255; Lm[i] = (px[i * 4] * .3 + px[i * 4 + 1] * .59 + px[i * 4 + 2] * .11) / 255; }
    const b1 = blur(blur(A, 5), 5), ls = blur(blur(Lm, 1), 1), lb = blur(blur(Lm, 4), 4), h = new Uint8Array(n); // detail from shapes, not from the fine grain of the material
    for (let i = 0; i < n; i++) { if (A[i] < .5) continue; const bev = Math.min(1, Math.max(0, (b1[i] - .5) * 2.4)); const det = Math.max(-.05, Math.min(.05, (ls[i] - lb[i]) * .4)); h[i] = Math.max(140, Math.min(255, Math.round(255 * (.6 + .32 * Math.sqrt(bev) + det)))); }
    const c = new Uint8Array(n * 4); for (let i = 0; i < n; i++) if (A[i] >= .5) { c[i * 4] = px[i * 4]; c[i * 4 + 1] = px[i * 4 + 1]; c[i * 4 + 2] = px[i * 4 + 2]; c[i * 4 + 3] = 255; }
    for (let k = 0; k < 4; k++) { const c2 = c.slice(); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const i = y * T + x; if (c[i * 4 + 3]) continue; for (const j of [i - 1, i + 1, i - T, i + T]) { if (j < 0 || j >= n || !c[j * 4 + 3]) continue; c2[i * 4] = c[j * 4]; c2[i * 4 + 1] = c[j * 4 + 1]; c2[i * 4 + 2] = c[j * 4 + 2]; c2[i * 4 + 3] = 255; break; } } c.set(c2); }
    return { h, c, kind };
  }
  const YAW = -.34, PITCH = -.36; // three-quarter view: the piece leans back and turns a little, light from the top left
  function pump() {
    if (busy || dead || !queue.length) return; busy = true;
    const [key, svg, kind] = queue.shift();
    raster(svg).then(px => {
      if (!R0) { const cv = document.createElement('canvas'); cv.width = cv.height = OUT; R0 = { cv, r: new Renderer(cv) }; }
      const m = build(px, kind); meshes.set(key, m); if (meshes.size > 120) meshes.delete(meshes.keys().next().value);
      R0.r.draw(m, YAW, PITCH); const url = R0.cv.toDataURL('image/png'); cache.set(key, url); if (cache.size > 600) cache.delete(cache.keys().next().value);
      waiting.delete(key); document.querySelectorAll('[data-i3="' + key + '"]').forEach(el => { el.innerHTML = img(key); });
    }).catch(e => { if (e && /webgl|shader|program/i.test(e.message || '')) { dead = true; console.warn('3D item icons are off on this device:', e.message); } waiting.delete(key); }).finally(() => { busy = false; setTimeout(pump, 0); });
  }
  const img = key => `<img class="i3" src="${cache.get(key)}" alt="" draggable="false">`;
  const I = {};
  I.ok = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  // Returns the picture for an icon: the 3D render if it is ready, otherwise the flat icon until the render lands.
  I.html = (flat, fallback, kind) => {
    if (!I.ok || dead) return fallback;
    const key = hash(flat + kind); if (cache.has(key)) return `<span class="i3w" data-i3="${key}">${img(key)}</span>`;
    if (!waiting.has(key)) { waiting.set(key, 1); queue.push([key, flat, kind]); setTimeout(pump, 0); }
    return `<span class="i3w" data-i3="${key}">${fallback}</span>`;
  };
  // Hover: the piece turns slowly in the light, then settles back when the pointer leaves.
  let spin = null;
  I.hover = el => {
    const w = el && el.querySelector('.i3w'), key = w && w.dataset.i3, m = key && meshes.get(key); if (!m || dead) return;
    if (spin && spin.el === el) return; I.unhover();
    try { if (!R1) { const cv = document.createElement('canvas'); cv.width = cv.height = OUT; cv.className = 'i3 i3spin'; R1 = { cv, r: new Renderer(cv) }; } } catch (e) { return; }
    const im = w.querySelector('img'); if (!im) return; im.style.display = 'none'; w.appendChild(R1.cv);
    const t0 = performance.now(); spin = { el, im, raf: 0 };
    const step = t => { if (!spin) return; if (!el.isConnected) { I.unhover(); return; } const s = (t - t0) / 1000; R1.r.draw(m, YAW + Math.sin(s * 1.6) * .55, PITCH + Math.sin(s * 1.1) * .08); spin.raf = requestAnimationFrame(step); };
    spin.raf = requestAnimationFrame(step);
  };
  I.unhover = () => { if (!spin) return; cancelAnimationFrame(spin.raf); spin.im.style.display = ''; if (R1 && R1.cv.parentNode) R1.cv.parentNode.removeChild(R1.cv); spin = null; };
  document.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const el = e.target && e.target.closest && e.target.closest('.it'); if (el) I.hover(el); });
  document.addEventListener('pointerout', e => { if (spin && !(e.relatedTarget && spin.el.contains(e.relatedTarget))) I.unhover(); });
  return I;
})();
