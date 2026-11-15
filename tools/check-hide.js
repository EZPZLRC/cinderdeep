// Pre-ship check (build 0083 lesson): an element hidden with the .hide class must not be kept visible by a stronger
// `display:...!important` rule. `.hide{display:none!important}` has specificity (0,1,0); an #id rule with !important beats it.
// Run: node tools/check-hide.js   (exits 1 and lists offenders)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', 'public');
const js = fs.readdirSync(path.join(R, 'js')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(R, 'js', f), 'utf8')).join('\n');
const html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const ids = new Set(); for (const m of js.matchAll(/\$\('([\w-]+)'\)\.classList\.(?:add|toggle|remove)\('hide'/g)) ids.add(m[1]);
for (const m of js.matchAll(/getElementById\('([\w-]+)'\)\.classList\.(?:add|toggle|remove)\('hide'/g)) ids.add(m[1]);
for (const m of html.matchAll(/<[^>]*id="([\w-]+)"[^>]*class="[^"]*\bhide\b/g)) ids.add(m[1]);
for (const m of html.matchAll(/<[^>]*class="[^"]*\bhide\b[^"]*"[^>]*id="([\w-]+)"/g)) ids.add(m[1]);
let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
for (const f of fs.readdirSync(path.join(R, 'css'))) if (f.endsWith('.css')) css += '\n' + fs.readFileSync(path.join(R, 'css', f), 'utf8');
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = []; (function walk(s) { let i = 0; while (i < s.length) { const o = s.indexOf('{', i); if (o < 0) break; const sel = s.slice(i, o).trim(); let d = 1, j = o + 1; while (j < s.length && d) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; } const body = s.slice(o + 1, j - 1); if (/^@(media|supports|layer|container)/.test(sel)) walk(body); else if (!sel.startsWith('@')) rules.push([sel, body]); i = j; } })(css);
const spec = s => { s = s.replace(/:(?:where)\([^)]*\)/g, '').replace(/::?[\w-]+(\([^)]*\))?/g, m => m.startsWith('::') ? ' ' : m.startsWith(':not(') ? m.slice(5, -1) : '.x'); return [(s.match(/#[\w-]+/g) || []).length, (s.match(/\.[\w-]+|\[[^\]]*\]/g) || []).length]; };
const bad = [];
for (const id of ids) { const shows = [], hides = [];
  for (const [selList, body] of rules) for (const sel of selList.split(',').map(x => x.trim())) { const last = sel.split(/[\s>+~]+/).pop(); if (!new RegExp('#' + id + '(?![\\w-])').test(last)) continue; const dm = body.match(/display\s*:\s*([\w-]+)\s*!important/); if (!dm) continue;
    if (/\.hide\b/.test(last) && !/:not\(\.hide\)/.test(last)) { if (dm[1] === 'none') hides.push(spec(sel)); } else if (dm[1] !== 'none' && !/:not\(\.hide\)/.test(last)) shows.push([sel, spec(sel)]); }
  for (const [sel, sp] of shows) { const gt = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]; if (!gt(sp, [0, 1])) continue; if (hides.some(h => !gt(sp, h))) continue; bad.push('#' + id + ': "' + sel + '" shows it with !important and outranks .hide'); } }
if (bad.length) { console.log('HIDE CHECK FAILED:\n' + bad.join('\n')); process.exit(1); } console.log('hide check ok (' + ids.size + ' toggled elements)');
