// node tools/rename.js old=new [old2=new2 ...] [--dry]
// Renames names that live in the shared top-level scope of src/js/*.js, in every file at once.
// Scope-aware: a local variable or parameter that happens to have the same name is left alone,
// and so are property names (obj.old, {old: 1}) and text inside strings.
const acorn = require('/opt/npm-tools/node_modules/acorn');
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'src/js');
const args = process.argv.slice(2), dry = args.includes('--dry');
const map = {}; args.filter(a => a.includes('=')).forEach(a => { const [o, n] = a.split('='); map[o] = n; });
if (!Object.keys(map).length) { console.log('usage: node tools/rename.js old=new ...'); process.exit(1); }

function hoisted(body) {
  const names = [];
  (function w(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration') { names.push(n.id.name); return; }
    if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return;
    if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { if (d.id.type === 'Identifier') names.push(d.id.name); });
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v.type === 'string') w(v); }
  })(body);
  return names;
}
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
const parsed = files.map(f => { const src = fs.readFileSync(path.join(DIR, f), 'utf8'); return { f, src, ast: acorn.parse(src, { ecmaVersion: 2020, allowReturnOutsideFunction: true }) }; });
const shared = new Set(); parsed.forEach(p => hoisted(p.ast).forEach(n => shared.add(n)));
for (const o in map) {
  if (!shared.has(o)) { console.log('not a shared top-level name: ' + o); process.exit(1); }
  if (shared.has(map[o]) && !args.includes('--merge')) { console.log(map[o] + ' already exists (use --merge if the two are meant to become one)'); process.exit(1); }
}
let total = 0;
parsed.forEach(p => {
  const hits = [];
  function walk(n, scopes) {
    if (!n || typeof n.type !== 'string') return;
    const inner = scopes.length > 0;
    switch (n.type) {
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        if (n.type === 'FunctionDeclaration' && !inner && map[n.id.name]) hits.push(n.id);
        const s = new Set(n.params.map(q => q.name)); if (n.id && n.type === 'FunctionExpression') s.add(n.id.name);
        hoisted(n.body).forEach(x => s.add(x));
        walk(n.body, scopes.concat([s])); return;
      }
      case 'CatchClause': walk(n.body, scopes.concat([new Set(n.param ? [n.param.name] : [])])); return;
      case 'VariableDeclarator': if (!inner && n.id.type === 'Identifier' && map[n.id.name]) hits.push(n.id); walk(n.init, scopes); return;
      case 'MemberExpression': walk(n.object, scopes); if (n.computed) walk(n.property, scopes); return;
      case 'Property': if (n.computed) walk(n.key, scopes); walk(n.value, scopes); return;
      case 'LabeledStatement': walk(n.body, scopes); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'Identifier': if (map[n.name] && !scopes.some(s => s.has(n.name))) hits.push(n); return;
    }
    for (const k in n) { if (k === 'type') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => walk(x, scopes)); else if (v && typeof v.type === 'string') walk(v, scopes); }
  }
  walk(p.ast, []);
  if (!hits.length) return;
  hits.sort((x, y) => y.start - x.start);
  let s = p.src; hits.forEach(h => { s = s.slice(0, h.start) + map[h.name] + s.slice(h.end); });
  total += hits.length; console.log(('    ' + hits.length).slice(-4) + '  ' + p.f);
  if (!dry) fs.writeFileSync(path.join(DIR, p.f), s);
});
console.log(total + ' replacement(s)' + (dry ? ' (dry run)' : ''));
