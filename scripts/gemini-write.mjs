// Rewrites every on-screen string of Chapter 1 through the Gemini API.
//   node scripts/gemini-write.mjs            rewrite everything
//   node scripts/gemini-write.mjs --scene street   only one scene (others keep their current text)
//   node scripts/gemini-write.mjs --dry      print the first prompt, call nothing
// Needs GEMINI_API_KEY in .env.local (never committed). Optional GEMINI_MODEL.
// Output: src/data/text/gemini.json  { originalText: newText }  — read by src/text/tx.ts at runtime.
//         development/gemini-report.md  — before/after for review.
import fs from 'node:fs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null;

for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.GEMINI_API_KEY;
if (!KEY && !DRY) {
  console.error('GEMINI_API_KEY가 없습니다. 프로젝트 폴더의 .env.local 파일에 다음 한 줄을 넣어 주세요:\nGEMINI_API_KEY=발급받은키');
  process.exit(1);
}
const API = 'https://generativelanguage.googleapis.com/v1beta';

const source = JSON.parse(fs.readFileSync('src/data/text/source.json', 'utf8'));
const bible = fs.readFileSync('scripts/gemini/bible.md', 'utf8');
const outPath = 'src/data/text/gemini.json';
const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};

// ---------------------------------------------------------------- model
async function pickModel() {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } });
  if (!r.ok) throw new Error(`모델 목록 실패 ${r.status}: ${await r.text()}`);
  const names = (await r.json()).models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''))
    .filter((n) => /^gemini-\d/.test(n) && !/(tts|image|audio|live|embed|lite|exp|vision|computer|robotics|nano)/.test(n));
  const ver = (n) => parseFloat(n.match(/^gemini-(\d+(?:\.\d+)?)/)[1]);
  const rank = (n) => ver(n) * 10 + (/pro/.test(n) ? 2 : /flash/.test(n) ? 1 : 0) - (/preview/.test(n) ? 0.5 : 0);
  names.sort((a, b) => rank(b) - rank(a));
  if (!names.length) throw new Error('사용할 수 있는 Gemini 모델이 없습니다');
  return names[0];
}

// ---------------------------------------------------------------- validation
const NAMES = ['엘리제', '파울', '로테', '요한', '크뤼거', '포크트', '브란트', '베커', '하르트만', '노이만', '린덴펠트', '베스트팔렌'];
const META = /(\bAI\b|인공지능|제미나이|Gemini|출처|실화|역사적 사실|픽션|허구|개발자|플레이어|게임을|이 게임)/i;
const LIMIT = { label: 8, menu: 18, objective: 26, toast: 34, counter: 30, choice: 34, dialogue: 95, thought: 95, voice: 60, card: 90, text: 40, ending: 40 };
const tokens = (s, re) => (s.match(re) ?? []).sort().join('|');

function check(e, out) {
  const errs = [];
  if (typeof out !== 'string' || !out.trim()) return ['빈 문자열'];
  if (tokens(out, /\{\d\}/g) !== tokens(e.text, /\{\d\}/g)) errs.push('자리표시자 {n}을 원문과 똑같이 유지');
  if (tokens(out, /<\/?[a-z]+>/g) !== tokens(e.text, /<\/?[a-z]+>/g)) errs.push('HTML 태그를 원문과 똑같이 유지');
  if ((out.match(/\n/g) ?? []).length !== (e.text.match(/\n/g) ?? []).length) errs.push('줄바꿈 개수 유지');
  for (const d of e.text.match(/\d+/g) ?? []) if (!out.includes(d)) errs.push(`숫자 ${d} 유지`);
  for (const n of NAMES) if (e.text.includes(n) && !out.includes(n)) errs.push(`이름 "${n}" 유지`);
  if (e.text.includes('「') && !out.includes('「')) errs.push('「」 괄호 유지');
  if (META.test(out) && e.kind !== 'menu') errs.push('메타 표현 금지');
  const lim = Math.max(LIMIT[e.kind] ?? 80, Math.ceil(e.text.length * 1.15));
  for (const line of out.replace(/<[^>]+>/g, '').split('\n')) if (line.length > lim) errs.push(`길이 ${line.length}자 → ${lim}자 이하`);
  if (e.kind === 'choice' && /^".*"$/.test(e.text) !== /^".*"$/.test(out)) errs.push('선택지의 큰따옴표 형식 유지');
  return errs;
}

// ---------------------------------------------------------------- prompting
const fmt = (e, text = e.text) =>
  `${e.id} [${e.kind}${e.speaker ? ' · ' + e.speaker : ''}${e.expr ? ' · ' + e.expr : ''}] ${JSON.stringify(text)}`;
const ORDER = [];
for (const e of source) if (!ORDER.includes(e.scene)) ORDER.push(e.scene);
const fullScript = ORDER.map((sc) => `## ${sc}\n` + source.filter((e) => e.scene === sc).map((e) => fmt(e)).join('\n')).join('\n\n');

async function generate(model, prompt) {
  const body = {
    systemInstruction: { parts: [{ text: bible }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 4000 * 2 ** attempt)); continue; }
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try { return JSON.parse(text.replace(/^```json\s*|```\s*$/g, '')); } catch { throw new Error('JSON이 아닌 응답: ' + text.slice(0, 300)); }
  }
  throw new Error('Gemini 요청이 계속 거절되었습니다(사용량 한도일 수 있음)');
}

const result = { ...prev };
const report = [];
let model = 'DRY';
if (!DRY) { model = await pickModel(); console.log('모델:', model); }

for (const scene of ORDER) {
  if (ONLY && scene !== ONLY) continue;
  const items = source.filter((e) => e.scene === scene);
  const done = ORDER.slice(0, ORDER.indexOf(scene))
    .flatMap((sc) => source.filter((e) => e.scene === sc && result[e.text]).map((e) => fmt(e, result[e.text])));
  const prompt = [
    '아래는 제1장의 원문 대본 전체다(형식: id [종류 · 화자 · 표정] "원문"). 흐름과 맥락을 파악하는 용도다.',
    fullScript,
    done.length ? `\n이미 새로 쓴 앞부분(문체와 말투를 이어 갈 것):\n${done.join('\n')}` : '',
    `\n이번에 새로 쓸 장면: "${scene}". 아래 ${items.length}줄을 모두 새로 써라.`,
    items.map((e) => fmt(e)).join('\n'),
    '\nJSON 객체 하나만 출력하라. 키는 위의 id, 값은 새 문장. 모든 id를 빠짐없이 포함하라.',
  ].join('\n');
  if (DRY) { console.log(prompt.slice(0, 4000)); break; }

  process.stdout.write(`${scene} (${items.length}줄) … `);
  let out = await generate(model, prompt);
  let bad = items.map((e) => [e, check(e, out[e.id])]).filter(([, errs]) => errs.length);
  if (bad.length) {
    const fix = await generate(model, prompt + '\n\n다음 줄은 규칙을 어겼다. 이 줄들만 고쳐서 같은 JSON 형식으로 다시 출력하라:\n' +
      bad.map(([e, errs]) => `${fmt(e, out[e.id] ?? '')}  ← ${errs.join(', ')}`).join('\n'));
    for (const [e] of bad) if (fix[e.id] !== undefined) out[e.id] = fix[e.id];
    bad = items.map((e) => [e, check(e, out[e.id])]).filter(([, errs]) => errs.length);
  }
  const badIds = new Set(bad.map(([e]) => e.id));
  for (const e of items) {
    if (badIds.has(e.id)) { delete result[e.text]; report.push(`- ❌ \`${e.kind}\` ${e.text}  — 원문 유지 (${check(e, out[e.id]).join(', ')})`); }
    else { result[e.text] = out[e.id]; report.push(`- \`${e.kind}${e.speaker ? '·' + e.speaker : ''}\` ${e.text}\n  → ${out[e.id]}`); }
  }
  console.log(bad.length ? `완료, ${bad.length}줄은 원문 유지` : '완료');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 1) + '\n'); // save as we go
}

if (!DRY) {
  fs.writeFileSync('development/gemini-report.md',
    `# 제미나이 대본 보고서\n\n모델: ${model} · ${new Date().toISOString()}\n` +
    `새로 쓴 줄 ${Object.keys(result).length} / 전체 ${source.length}\n\n` + report.join('\n') + '\n');
  console.log(`\n${Object.keys(result).length}/${source.length}줄 교체 → ${outPath}\n검토용 비교표 → development/gemini-report.md`);
}
