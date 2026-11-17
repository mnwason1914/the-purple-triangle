// Collects every piece of on-screen Korean text (dialogue, narration, choices, labels, cards, menus)
// into src/data/text/source.json, in play order with context, so it can be rewritten as a whole.
import fs from 'node:fs';
import ts from 'typescript';

const HANGUL = /[가-힣]/;
const SKIP_FILES = ['src/characters/cast.ts']; // proper names stay fixed
const FILES = ['src/data/chapter1.ts', 'src/game/game.ts', 'src/main.ts'];
const out = [];
// code-only comparisons and fixed names that are not rewritten
const EXCLUDE = new Set(['엘리제', '현관에']);
const seen = new Map();

const id = (text) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
  return 't' + h.toString(36);
};
const add = (text, meta) => {
  text = text.trim();
  if (!HANGUL.test(text) || EXCLUDE.has(text)) return;
  const k = id(text);
  if (seen.has(k)) { seen.get(k).uses++; return; }
  const e = { id: k, text, uses: 1, ...meta };
  seen.set(k, e); out.push(e);
};

const KINDS = { say: 'dialogue', think: 'thought', voice: 'voice', choose: 'choice', toast: 'toast', objective: 'objective',
  card: 'card', end: 'ending', counter: 'counter', action: 'label' };

for (const file of FILES) {
  if (SKIP_FILES.includes(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const scene = (n) => { while (n) { if ((ts.isFunctionDeclaration(n)) && n.name) return n.name.text; n = n.parent; } return 'top'; };
  const describe = (node) => {
    let n = node.parent; let speaker, expr, kind = 'text';
    while (n && !ts.isSourceFile(n)) {
      if (ts.isPropertyAssignment(n) && ['verb', 'label'].includes(n.name.getText())) { kind = 'label'; break; }
      if (ts.isCallExpression(n)) {
        const name = ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : n.expression.getText();
        if (KINDS[name]) {
          kind = KINDS[name];
          if (name === 'say' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) { speaker = n.arguments[0].text; expr = n.arguments[1]?.getText().replace(/'/g, ''); }
          if (name === 'voice' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) speaker = n.arguments[0].text;
          break;
        }
      }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /label|textContent/.test(n.left.getText())) { kind = 'label'; break; }
      n = n.parent;
    }
    return { kind, speaker, expr };
  };
  const visit = (node) => {
    let text = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateExpression(node)) {
      text = node.head.text; node.templateSpans.forEach((s, i) => { text += `{${i}}` + s.literal.text; });
    }
    if (text !== null && HANGUL.test(text)) {
      const d = describe(node);
      // the voice() speaker label is a name, not a line
      const isVoiceName = ts.isCallExpression(node.parent) && node.parent.arguments[0] === node && /\.voice$/.test(node.parent.expression.getText());
      if (!isVoiceName && !/innerHTML/.test(node.parent.getText().slice(0, 40))) {
        add(text, { file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, scene: scene(node), ...d });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// static HTML text (menus, buttons, labels)
const html = fs.readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/>([^<>]*[가-힣][^<>]*)</g)) add(m[1].trim(), { file: 'index.html', scene: 'menu', kind: 'menu' });
for (const m of html.matchAll(/aria-label="([^"]*[가-힣][^"]*)"/g)) add(m[1], { file: 'index.html', scene: 'menu', kind: 'menu' });

fs.writeFileSync('src/data/text/source.json', JSON.stringify(out, null, 1) + '\n');
const by = {}; for (const e of out) by[e.kind] = (by[e.kind] ?? 0) + 1;
console.log(`${out.length} unique strings`, by);
