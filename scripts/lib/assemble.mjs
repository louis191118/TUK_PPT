// deck.json 순서대로 web/slides/<slug>.html을 모으고, slides/<slug>.md의 대본·예상 질문을 발표자 노트로 붙이고,
// 단계 수만큼 보이지 않는 fragment를 넣고, 근거 장부를 내장해 web/index.html을 만든다.
import fs from 'node:fs';
import path from 'node:path';
import { KIT, readJSON, loadEvidence, loadSpecs, esc } from './util.mjs';

function mdToHtml(md) {
  if (!md) return '';
  const out = [];
  let list = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) { if (!list) { list = []; } list.push(`<li>${esc(li[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (line) out.push(`<p>${esc(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('\n');
}

// 화면에 쓸 수 있는 에셋(chosen)의 표기만 내장한다
function assetData(deck) {
  const p = path.join(deck, 'assets.json');
  let items = [];
  try { items = fs.existsSync(p) ? readJSON(p).items || [] : []; } catch { /* lint가 잡는다 */ }
  const chosen = items.filter((a) => a.status === 'chosen').map((a) => ({ id: a.id, kind: a.kind, credit: a.credit || '', file: a.file || '' }));
  return JSON.stringify({ items: chosen }).replace(/<\//g, '<\\/');
}

export function assemble(deck) {
  const cfg = readJSON(path.join(deck, 'deck.json'));
  const specs = loadSpecs(deck, cfg.slides || []);
  const parts = [], problems = [];
  for (const s of specs) {
    if (!s.html) { problems.push(`${s.slug}: web/slides/${s.slug}.html 없음 (건너뜀)`); continue; }
    let html = s.html.trim();
    if (!/<section[\s>]/.test(html)) { problems.push(`${s.slug}: <section> 없음 (건너뜀)`); continue; }
    if (!/data-slug=/.test(html)) html = html.replace(/<section/, `<section data-slug="${s.slug}"`);
    if (!/\sid=/.test(html.match(/<section[^>]*>/)[0])) html = html.replace(/<section/, `<section id="s-${s.slug}"`);
    const d = s.spec?.data || {};
    // 설명 장은 3단계까지. 탐색 장(explore: true — 3D 에셋 소개처럼 발표자가 둘러보는 장)은 9단계까지
    const steps = Math.max(0, Math.min(String(d.explore) === 'true' ? 9 : 3, Number(d.steps) || 0));
    const triggers = Array.from({ length: steps }, (_, i) => `<span class="fragment step" data-fragment-index="${i}"></span>`).join('');
    const notes = [
      d.purpose ? `<p><b>설명 목적</b> ${esc(d.purpose)}</p>` : '',
      d.owner || d.time ? `<p><b>담당·시간</b> ${esc(d.owner || '-')} · ${esc(d.time || '?')}초</p>` : '',
      s.secs['대본'] ? `<h4>대본</h4>\n${mdToHtml(s.secs['대본'])}` : '',
      s.secs['예상 질문'] ? `<h4>예상 질문</h4>\n${mdToHtml(s.secs['예상 질문'])}` : '',
    ].filter(Boolean).join('\n');
    const i = html.lastIndexOf('</section>');
    html = html.slice(0, i) + `\n${triggers}\n<aside class="notes">\n${notes}\n</aside>\n` + html.slice(i);
    parts.push(`<!-- ${s.slug} -->\n${html}`);
  }
  const ev = loadEvidence(deck);
  problems.push(...ev.errors);
  const evidence = JSON.stringify({ items: ev.items.map(({ _file, ...it }) => it) }).replace(/<\//g, '<\\/');
  const shell = fs.readFileSync(path.join(KIT, 'scripts', 'shell.html'), 'utf8');
  const out = shell
    .replace('{{LANG}}', esc(cfg.lang || 'ko'))
    .replace('{{TITLE}}', esc(cfg.title || 'deck'))
    .replace('{{SLIDES}}', () => parts.join('\n\n'))
    .replace('{{EVIDENCE}}', () => evidence)
    .replace('{{ASSETS}}', () => assetData(deck));
  fs.writeFileSync(path.join(deck, 'web', 'index.html'), out);
  return { count: parts.length, total: specs.length, problems };
}
