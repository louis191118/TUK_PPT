// 정적 검사: 근거 장부 형식, 파생값, 장별 기획 필수 칸, 근거 id 연결, 화면에 직접 쓴 숫자, 그림 없는 장, 시간 합계.
import path from 'node:path';
import { readJSON, exists, loadEvidence, loadDerived, loadSpecs, frontmatter, fmtTime } from './util.mjs';
import fs from 'node:fs';

const CONF = ['official', 'peer-reviewed', 'report', 'news', 'estimate', 'example'];
const REQ = ['purpose', 'question', 'evidence', 'type', 'form', 'headline', 'time', 'steps'];
const TEMPLATES = ['bars', 'groups', 'line', 'stack', 'tiles', 'timeline', 'flow', 'equation', 'scatter', 'hero',
  'position', 'contrast', 'chain', 'tree', 'cycle', 'matrix', 'gaps', 'screen', 'filter', 'relations', 'custom'];

// viz 설정 JSON 안의 근거 id 모으기 (num, x, y)
function vizIds(obj, out = []) {
  if (Array.isArray(obj)) obj.forEach((o) => vizIds(o, out));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) {
    // x·y는 산점(scatter)에서만 근거 id. 선(line)의 점은 num을 갖고 x는 축 이름이다
    const isId = k === 'num' || k === 'mean' || k === 'ref' || ((k === 'x' || k === 'y') && !('num' in obj));
    if (isId && typeof v === 'string' && /^[a-z0-9-]+$/.test(v)) out.push(v);
    else vizIds(v, out);
  }
  return out;
}

export async function lint(deck) {
  const R = [];
  const add = (level, where, msg) => R.push({ level, where, msg });
  const state = exists(path.join(deck, 'STATE.md')) ? frontmatter(fs.readFileSync(path.join(deck, 'STATE.md'), 'utf8')).data : {};
  const building = ['build', 'check', 'review', 'done'].includes(state.stage);

  // deck.json
  let cfg = {};
  try { cfg = readJSON(path.join(deck, 'deck.json')); } catch (e) { add('ERROR', 'deck.json', `읽지 못함: ${e.message}`); }
  const slugs = cfg.slides || [];
  if (new Set(slugs).size !== slugs.length) add('ERROR', 'deck.json', 'slides에 같은 slug가 두 번');

  // 근거 장부
  const ev = loadEvidence(deck);
  ev.errors.forEach((m) => add('ERROR', 'evidence', m));
  const ids = new Map();
  for (const it of ev.items) {
    const w = `evidence/${it._file}#${it.id || '?'}`;
    if (!it.id || !/^[a-z0-9][a-z0-9-]*$/.test(it.id)) add('ERROR', w, 'id는 영문 소문자·숫자·-');
    if (ids.has(it.id)) add('ERROR', w, `id 중복 (${ids.get(it.id)})`);
    ids.set(it.id, it._file);
    if (!it.claim) add('ERROR', w, 'claim 없음');
    if (it.value == null && !it.text) add('ERROR', w, 'value(숫자)나 text(사실) 중 하나는 있어야 함');
    if (it.value != null && typeof it.value !== 'number') add('ERROR', w, 'value는 숫자');
    if (!CONF.includes(it.confidence)) add('ERROR', w, `confidence는 ${CONF.join('|')}`);
    const s = it.source || {};
    if (!['estimate', 'example'].includes(it.confidence)) {
      if (!s.url && !s.title) add('ERROR', w, '출처(url 또는 title) 없음');
      if (!s.date) add('WARN', w, '출처 날짜(기준 연도) 없음');
      if (!s.quote) add('WARN', w, '원문 구절(quote) 없음 — 값이 원문에서 왔는지 확인 불가');
    }
    if (it.confidence === 'estimate' && !it.note) add('ERROR', w, 'estimate는 note에 산식·가정');
  }

  // 파생값
  const der = await loadDerived(deck, ev.items);
  if (der.error) add('ERROR', 'web/data/derived.js', der.error);
  for (const [id, d] of Object.entries(der.values)) {
    if (ids.has(id)) add('ERROR', `derived#${id}`, '근거 id와 겹침');
    if (typeof d.value !== 'number' || !isFinite(d.value)) add('ERROR', `derived#${id}`, `value가 숫자가 아님 (${d.value})`);
    if (!d.from?.length) add('WARN', `derived#${id}`, 'from 없음 — 출처가 하단에 붙지 않음');
    for (const f of d.from || []) if (!ids.has(f) && !der.values[f]) add('ERROR', `derived#${id}`, `from에 없는 id ${f}`);
  }
  const known = (id) => ids.has(id) || id in der.values;

  // 에셋 장부
  let assets = [];
  const ap = path.join(deck, 'assets.json');
  if (exists(ap)) { try { assets = readJSON(ap).items || []; } catch (e) { add('ERROR', 'assets.json', `JSON 오류 ${e.message}`); } }
  const aIds = new Map();
  for (const a of assets) {
    const w = `assets.json#${a.id || '?'}`;
    if (!a.id || !/^[a-z0-9][a-z0-9-]*$/.test(a.id)) add('ERROR', w, 'id는 영문 소문자·숫자·-');
    if (aIds.has(a.id)) add('ERROR', w, 'id 중복');
    aIds.set(a.id, a);
    if (!['candidate', 'chosen', 'rejected'].includes(a.status)) add('ERROR', w, 'status는 candidate|chosen|rejected');
    if (a.status === 'rejected') continue;
    if (a.kind !== 'reference' && !a.source?.license) add('ERROR', w, '라이선스(source.license) 없음 — 확인 안 된 에셋은 후보도 안 됨');
    if (a.kind !== 'reference' && !a.source?.url && !/자체|직접|own/i.test(a.source?.license || '')) add('WARN', w, '원본 주소(source.url) 없음');
    if (a.status === 'chosen' && a.kind !== 'reference') {
      if (!a.credit) add('ERROR', w, '고른 에셋에 표기(credit) 없음');
      if (a.file && !exists(path.join(deck, a.file))) add('ERROR', w, `파일 없음 ${a.file}`);
      if (a.file && /_candidates/.test(a.file)) add('WARN', w, '고른 에셋이 아직 _candidates/에 있음 → web/assets/로');
    }
  }
  const okAsset = (id) => aIds.get(id)?.status === 'chosen';

  // 장별 기획과 화면
  let total = 0;
  for (const s of loadSpecs(deck, slugs)) {
    const w = s.slug;
    if (!s.spec) { add(building ? 'ERROR' : 'INFO', w, 'slides/<slug>.md 없음'); continue; }
    const d = s.spec.data;
    for (const k of REQ) if (d[k] == null || d[k] === '') add('ERROR', w, `기획 칸 비어 있음: ${k}`);
    total += Number(d.time) || 0;
    const evIds = Array.isArray(d.evidence) ? d.evidence : d.evidence ? [d.evidence] : [];
    for (const id of evIds) if (!known(id)) add('ERROR', w, `기획의 근거 id가 장부에 없음: ${id}`);
    if (d.headline && [...String(d.headline)].length > 24) add('WARN', w, `헤드라인 ${[...String(d.headline)].length}자 — 한 줄(18자 안팎)로`);
    if (Number(d.steps) > (String(d.explore) === 'true' ? 9 : 3)) add('ERROR', w, String(d.explore) === 'true' ? '탐색 장 단계(steps)는 9 이하' : '단계(steps)는 3 이하 (3D 에셋 소개처럼 둘러보는 장은 explore: true)');
    const script = s.secs['대본'] || '';
    if (!script) add('WARN', w, '## 대본 없음');
    const arrows = (script.match(/\[→\]/g) || []).length;
    if (script && arrows !== Number(d.steps || 0)) add('WARN', w, `대본의 [→] ${arrows}개 ≠ steps ${d.steps}`);
    if (script) {
      const chars = script.replace(/\[→\]|\s/g, '').length, est = chars / 5.3; // 분당 약 320자
      if (d.time && Math.abs(est - d.time) > Math.max(10, d.time * 0.25)) add('WARN', w, `대본 길이로 본 시간 약 ${Math.round(est)}초 ≠ time ${d.time}초`);
    }
    if (!s.html) { add(building ? 'ERROR' : 'INFO', w, 'web/slides/<slug>.html 없음'); continue; }
    const h = s.html;
    const hasViz = /data-viz=/.test(h) || /class="[^"]*\b(hero|quote)\b/.test(h) || /<(img|svg|iframe)\b/.test(h);
    if (!hasViz) add('WARN', w, 'NO-VIZ 그림이 없는 장 (헤드라인 = 주장, 본문 = 그림 하나)');
    for (const m of h.matchAll(/data-num="([^"]+)"/g)) if (!known(m[1])) add('ERROR', w, `data-num 근거 없음: ${m[1]}`);
    for (const m of h.matchAll(/data-module="([^"]+)"/g)) {
      const f = path.join(deck, 'web', 'js', m[1]);
      if (!exists(f)) add('ERROR', w, `그림 모듈 없음: web/js/${m[1]}`);
      else {
        const code = fs.readFileSync(f, 'utf8');
        for (const n of code.matchAll(/num\(\s*['"]([a-z0-9-]+)['"]/g)) if (!known(n[1])) add('ERROR', w, `그림 코드의 근거 id 없음: ${n[1]}`);
        for (const n of code.matchAll(/asset\(\s*['"]([a-z0-9-]+)['"]/g)) if (!okAsset(n[1])) add('ERROR', w, `그림 코드의 에셋을 고르지 않음: ${n[1]}`);
        // 런타임 모듈(viz/stage3d·inspect3d 등)은 토큰을 못 읽을 때의 기본값만 가진다 → 색 검사는 장 모듈(custom/)만
        if (!m[1].startsWith('viz/') && /#[0-9a-fA-F]{3,6}\b|rgb\(/.test(code)) add('WARN', w, `${m[1]}에 색을 직접 씀 — CSS 클래스·토큰으로 (3D 재질 색은 st.tok('--c-…')로)`);
        // 설정 JSON의 근거 id (inspect3d 카드 "num", 글 속 {id})
        const cfgTxt = h.match(/<script type="application\/json">([\s\S]*?)<\/script>/)?.[1] || '';
        for (const n of cfgTxt.matchAll(/"num"\s*:\s*"([a-z0-9-]+)"|\{([a-z0-9]+(?:-[a-z0-9]+)+)\}/g)) { const id = n[1] || n[2]; if (!known(id)) add('ERROR', w, `그림 설정의 근거 id 없음: ${id}`); }
      }
    }
    for (const m of h.matchAll(/<img\b[^>]*>/g)) {
      const id = m[0].match(/data-asset="([^"]+)"/)?.[1];
      if (!id) add('ERROR', w, `이미지에 data-asset 없음 (에셋 장부를 거치지 않은 이미지): ${m[0].slice(0, 80)}`);
      else if (!okAsset(id)) add('ERROR', w, `고르지 않았거나 장부에 없는 에셋: ${id}`);
    }
    for (const m of h.matchAll(/"asset"\s*:\s*"([^"]+)"/g)) if (!okAsset(m[1])) add('ERROR', w, `고르지 않았거나 장부에 없는 에셋: ${m[1]}`);
    for (const m of h.matchAll(/data-viz="([^"]+)"[^>]*>\s*<script type="application\/json">([\s\S]*?)<\/script>/g)) {
      if (!TEMPLATES.includes(m[1])) add('ERROR', w, `없는 패턴 ${m[1]} (직접 그리려면 data-viz="custom" data-module="custom/<slug>.js")`);
      try { for (const id of vizIds(JSON.parse(m[2]))) if (!known(id)) add('ERROR', w, `그림 근거 없음: ${id}`); }
      catch (e) { add('ERROR', w, `그림 설정 JSON 오류: ${e.message}`); }
    }
    const usedSteps = [...h.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).map((c) => c.match(/^[sad]([1-3])$/)?.[1]).filter(Boolean).map(Number);
    for (const m of h.matchAll(/"steps"\s*:\s*\{([^}]*)\}/g)) for (const n of m[1].matchAll(/:\s*([1-3])\b/g)) usedSteps.push(Number(n[1]));
    for (const m of h.matchAll(/"s"\s*:\s*([1-3])\b/g)) usedSteps.push(Number(m[1]));
    const maxStep = Math.max(0, ...usedSteps);
    if (maxStep > Number(d.steps || 0)) add('WARN', w, `화면이 ${maxStep}단계까지 쓰는데 steps ${d.steps || 0} — 마지막 단계가 보이지 않음`);
    // 화면에 직접 쓴 숫자 (근거 장부를 거치지 않은 값)
    const visible = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<aside[\s\S]*?<\/aside>/g, '')
      .replace(/<([a-z]+)[^>]*data-num="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');
    const raw = [...visible.matchAll(/\d[\d,.]*/g)].map((x) => x[0]);
    if (raw.length) add('WARN', w, `RAW-NUMBER 화면에 직접 쓴 숫자: ${[...new Set(raw)].slice(0, 6).join(', ')} — 근거 id(data-num)로`);
    if (/\b(estimate)\b/.test(evIds.map((id) => ev.items.find((i) => i.id === id)?.confidence).join(' ')) && !/foot-l/.test(h)) add('WARN', w, '추정값을 쓰는데 하단 가정 줄(.foot-l)이 없음');
  }
  for (const f of exists(path.join(deck, 'slides')) ? fs.readdirSync(path.join(deck, 'slides')) : []) {
    const slug = f.replace(/\.md$/, '');
    if (f.endsWith('.md') && !f.startsWith('_') && !slugs.includes(slug)) add('INFO', slug, 'deck.json slides에 없는 기획 파일');
  }
  const target = cfg.timeTargetSec || (cfg.timeLimitSec ? Math.round(cfg.timeLimitSec * 0.93) : 0);
  if (target && total > target) add(building ? 'ERROR' : 'WARN', '시간', `합계 ${fmtTime(total)} > 목표 ${fmtTime(target)} (제한 ${fmtTime(cfg.timeLimitSec || 0)})`);
  return { results: R, total, target, evidenceCount: ev.items.length, derivedCount: Object.keys(der.values).length };
}

export function printLint({ results, total, target }) {
  const order = { ERROR: 0, WARN: 1, INFO: 2 };
  results.sort((a, b) => order[a.level] - order[b.level]);
  for (const r of results) console.log(`${r.level.padEnd(5)} ${r.where} — ${r.msg}`);
  const n = (l) => results.filter((r) => r.level === l).length;
  console.log(`\n오류 ${n('ERROR')} · 경고 ${n('WARN')} · 참고 ${n('INFO')} · 시간 ${fmtTime(total)}${target ? ` / 목표 ${fmtTime(target)}` : ''}`);
  return n('ERROR');
}
