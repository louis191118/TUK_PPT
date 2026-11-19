#!/usr/bin/env node
// KPU_PPT 덱 CLI. 의존성 없음 (Node 22+, 검수 캡처·3D 빌드는 Chrome).
//   init [dir] --title T --minutes M [--theme minimal]   deck/ 뼈대 만들기
//   stage <init|research|outline|assets|design|build|check|review|done> [--now 글] [--next 글]
//   status                                               단계·장별 완성도·시간
//   assemble                                             web/index.html 만들기
//   lint                                                 정적 검사 (오류가 있으면 종료 코드 1)
//   serve [--port 8800]                                  미리보기 서버
//   capture [--steps] [--only a,b] [--size 1440x810] [--out dir] [--wait ms] [--no3d]   (장마다 <section data-wait="ms">)
//   build3d <장면.mjs> [-- 인자]                         3D 에셋(GLB·PNG·JSON)을 헤드리스 Chrome + three.js로 만든다 (Blender 없음)
//   assets                                               에셋 후보 모음 페이지 (web/assets/_candidates/index.html)
//   upgrade                                              플러그인 업데이트 뒤 덱 런타임 갱신
//   hook-session                                         SessionStart 훅 (상태 요약 출력)
// 공통: --deck <경로> (기본: 현재 폴더에서 위로 deck/STATE.md를 찾는다)
import fs from 'node:fs';
import path from 'node:path';
import { KIT, today, parseArgs, findDeck, needDeck, readJSON, exists, frontmatter, setFrontmatter, sections, loadSpecs, loadEvidence, fmtTime } from './lib/util.mjs';
import { assemble } from './lib/assemble.mjs';
import { lint, printLint } from './lib/lint.mjs';

const STAGES = ['init', 'research', 'outline', 'assets', 'design', 'build', 'check', 'review', 'done'];
const NEXT = {
  init: 'init 질문 답 → research/plan.md → /kpu-ppt research',
  research: '/kpu-ppt research (하위 질문별 조사 → 사실 확인 → summary.md)',
  outline: '/kpu-ppt outline (장별 설명 목적 표 → 사용자 승인)',
  assets: '/kpu-ppt assets (장별 에셋·참고 사례 후보 → 사용자가 고름)',
  design: '/kpu-ppt design (대표 장 시안 → 사용자 승인)',
  build: '/kpu-ppt build (장마다 slide-builder)',
  check: '/kpu-ppt check (모든 단계 캡처·검사)',
  review: '/kpu-ppt review (독립 평가 → 반영 결정)',
  done: '리허설·실물 확인 (STATE.md 열린 문제)',
};
const CLI = `node "${path.join(KIT, 'scripts', 'deck.mjs')}"`;
const [cmd, ...rest] = process.argv.slice(2);
const opt = parseArgs(rest);

function copyDir(src, dst, map) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    if (f.name === '.DS_Store') continue;
    const s = path.join(src, f.name), d = path.join(dst, f.name);
    if (f.isDirectory()) copyDir(s, d, map);
    else if (/\.(md|json)$/.test(f.name) && map) fs.writeFileSync(d, Object.entries(map).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), fs.readFileSync(s, 'utf8')));
    else fs.copyFileSync(s, d);
  }
}

switch (cmd) {
  case 'init': {
    const dir = path.resolve(opt._[0] || 'deck');
    if (exists(path.join(dir, 'STATE.md'))) { console.error(`이미 덱이 있다: ${dir} (status로 확인)`); process.exit(2); }
    const title = opt.title || '발표', minutes = Number(opt.minutes || 10), theme = opt.theme || 'minimal';
    const themeFile = path.join(KIT, 'themes', `${theme}.css`);
    if (!exists(themeFile)) { console.error(`테마 없음: ${theme}`); process.exit(2); }
    copyDir(path.join(KIT, 'template'), dir, { TITLE: title, DATE: today(), MINUTES: String(minutes) });
    fs.copyFileSync(themeFile, path.join(dir, 'web', 'css', 'theme.css'));
    for (const d of ['research', 'reviews', 'web/js/custom', 'web/assets']) fs.mkdirSync(path.join(dir, d), { recursive: true });
    const limit = minutes * 60;
    fs.writeFileSync(path.join(dir, 'deck.json'), JSON.stringify({ title, lang: opt.lang || 'ko', theme, timeLimitSec: limit, timeTargetSec: Math.round(limit * 0.93), slides: [] }, null, 2) + '\n');
    console.log(`덱 뼈대: ${dir}\n다음: brief.md 채우기 → research/plan.md → /kpu-ppt research`);
    break;
  }
  case 'stage': {
    const deck = needDeck(opt), st = opt._[0];
    if (!STAGES.includes(st)) { console.error(`단계: ${STAGES.join(' | ')}`); process.exit(2); }
    const p = path.join(deck, 'STATE.md');
    let src = setFrontmatter(fs.readFileSync(p, 'utf8'), { stage: st, updated: today() });
    const secs = sections(frontmatter(src).body);
    const now = opt.now || `${st} 단계 시작`;
    const next = opt.next || NEXT[st];
    const open = secs['열린 문제'] || '';
    src = src.replace(/## 지금[\s\S]*$/, `## 지금\n${now}\n\n## 다음\n${next}\n\n## 열린 문제\n${open}\n`);
    fs.writeFileSync(p, src);
    console.log(`단계 → ${st}. 다음: ${next}`);
    break;
  }
  case 'status': {
    const deck = needDeck(opt);
    const st = frontmatter(fs.readFileSync(path.join(deck, 'STATE.md'), 'utf8'));
    const cfg = readJSON(path.join(deck, 'deck.json'));
    const ev = loadEvidence(deck);
    console.log(`${cfg.title} — 단계 ${st.data.stage} (${st.data.updated})  ·  ${deck}`);
    console.log(`근거 ${ev.items.length}개 (${ev.files.length}개 파일)`);
    let total = 0;
    for (const [i, s] of loadSpecs(deck, cfg.slides || []).entries()) {
      const t = Number(s.spec?.data.time) || 0;
      total += t;
      console.log(`${String(i + 1).padStart(2)} ${s.slug.padEnd(18)} 기획 ${s.spec ? '✓' : '·'} 화면 ${s.html ? '✓' : '·'} ${String(t).padStart(4)}초  ${s.spec?.data.headline || ''}`);
    }
    console.log(`시간 ${fmtTime(total)} / 목표 ${fmtTime(cfg.timeTargetSec || 0)} / 제한 ${fmtTime(cfg.timeLimitSec || 0)}`);
    const secs = sections(st.body);
    console.log(`\n지금: ${secs['지금'] || '-'}\n다음: ${secs['다음'] || NEXT[st.data.stage]}`);
    if (secs['열린 문제']) console.log(`열린 문제:\n${secs['열린 문제']}`);
    break;
  }
  case 'assemble': {
    const deck = needDeck(opt);
    const r = assemble(deck);
    r.problems.forEach((p) => console.log('WARN', p));
    console.log(`web/index.html — ${r.count}/${r.total}장`);
    break;
  }
  case 'lint': {
    const deck = needDeck(opt);
    process.exitCode = printLint(await lint(deck)) ? 1 : 0;
    break;
  }
  case 'serve': {
    const deck = needDeck(opt);
    const { serve } = await import('./lib/serve.mjs');
    const { port } = await serve(path.join(deck, 'web'), Number(opt.port || 8800));
    console.log(`http://127.0.0.1:${port}/  (발표자 노트: S 키, 종료: Ctrl+C)`);
    break;
  }
  case 'capture': {
    const deck = needDeck(opt);
    assemble(deck);
    const { capture } = await import('./lib/capture.mjs');
    try { process.exitCode = (await capture(deck, opt)) ? 1 : 0; }
    catch (e) { console.error('캡처 실패:', e.message); process.exitCode = 2; }
    break;
  }
  case 'assets': {
    const deck = needDeck(opt);
    const { assetsPage } = await import('./lib/assets.mjs');
    const r = assetsPage(deck);
    console.log(`후보 ${r.candidates} · 고름 ${r.chosen} · 참고 사례 ${r.refs} → ${r.file}\n보기: deck.mjs serve → /assets/_candidates/`);
    break;
  }
  case 'upgrade': {
    // 플러그인을 업데이트한 뒤 덱의 런타임만 새것으로 (장·근거·테마·custom·derived는 그대로)
    const deck = needDeck(opt);
    const T = path.join(KIT, 'template', 'web');
    for (const f of fs.readdirSync(path.join(T, 'js'), { withFileTypes: true })) {
      if (f.name === 'custom') continue;
      const s = path.join(T, 'js', f.name), d = path.join(deck, 'web', 'js', f.name);
      if (f.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
    }
    fs.copyFileSync(path.join(T, 'css', 'base.css'), path.join(deck, 'web', 'css', 'base.css'));
    copyDir(path.join(T, 'vendor'), path.join(deck, 'web', 'vendor'));
    console.log('런타임 갱신: web/js(custom 제외), css/base.css, vendor/. 다음: assemble → capture로 확인');
    break;
  }
  case 'build3d': {
    // 3D 에셋 스크립트 실행: 이름만 주면 스킬 scripts/3d/의 예시(route-city, power-bank)를 찾는다. 덱 스크립트는 경로로(deck/tools/3d/<slug>.mjs)
    const name = opt._[0];
    if (!name) { console.log('사용: deck.mjs build3d <장면.mjs> [-- --short km-b --long km-a ...]  (예시: route-city, power-bank)'); break; }
    const { build3d, findScript } = await import('./lib/build3d.mjs');
    const file = findScript(name);
    if (!file) { console.error('스크립트 없음:', name); process.exitCode = 2; break; }
    const deck = needDeck(opt);
    const dash = process.argv.indexOf('--');
    const pass = dash > 0 ? process.argv.slice(dash + 1) : [];
    try { process.exitCode = (await build3d(deck, file, pass)) ? 0 : 1; }
    catch (e) { console.error('3D 빌드 실패:', e.message); process.exitCode = 2; }
    break;
  }
  case 'hook-session': {
    // SessionStart 훅: 덱이 있으면 상태를 맥락에 넣는다. 없으면 CLI 경로 한 줄만.
    const deck = findDeck(opt);
    if (!deck) { console.log(`KPU_PPT CLI: ${CLI}`); break; }
    const st = frontmatter(fs.readFileSync(path.join(deck, 'STATE.md'), 'utf8'));
    const secs = sections(st.body);
    console.log([
      `[KPU_PPT] 이 프로젝트에 발표 덱이 있다: ${deck}`,
      `단계: ${st.data.stage} (${st.data.updated}) · 지금: ${secs['지금'] || '-'} · 다음: ${secs['다음'] || NEXT[st.data.stage]}`,
      secs['열린 문제'] ? `열린 문제: ${secs['열린 문제'].replace(/\n/g, ' ')}` : '',
      `작업 전 kpu-ppt 스킬(SKILL.md)을 읽는다. CLI: ${CLI}`,
    ].filter(Boolean).join('\n'));
    break;
  }
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
