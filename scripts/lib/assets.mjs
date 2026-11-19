// 에셋 후보 모음 페이지: 사용자가 보고 고르도록 장별로 후보를 나란히 (web/assets/_candidates/index.html)
import fs from 'node:fs';
import path from 'node:path';
import { readJSON, esc } from './util.mjs';

const IMG = /\.(png|jpe?g|webp|gif|svg)$/i;

export function assetsPage(deck) {
  const p = path.join(deck, 'assets.json');
  const items = fs.existsSync(p) ? readJSON(p).items || [] : [];
  const dir = path.join(deck, 'web', 'assets', '_candidates');
  fs.mkdirSync(dir, { recursive: true });
  const groups = new Map();
  for (const a of items) {
    if (a.status === 'rejected') continue;
    const key = a.kind === 'reference' ? '참고 사례' : (a.fits || ['(장 미정)']).join(', ');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  const score = (f = {}) => Object.entries(f).map(([k, v]) => `${k} ${v}`).join(' · ');
  const card = (a) => {
    // 페이지는 web/assets/_candidates/ 에 있으므로 deck 기준 file 경로(web/...)를 이 페이지 기준으로 바꾼다
    const rel = a.file ? path.relative(dir, path.join(deck, a.file)) : '';
    // 3D 모델(model3d)은 previews(같은 구도 미리보기 렌더, deck 기준 경로)를 보여 준다
    const pv = (a.previews || []).map((f) => path.relative(dir, path.join(deck, f)));
    const media = pv.length ? `<img src="${esc(pv[0])}" alt="${esc(a.id)}">${pv.length > 1 ? `<div class="thumbs">${pv.slice(1).map((f) => `<img src="${esc(f)}" alt="">`).join('')}</div>` : ''}`
      : a.file && IMG.test(a.file) ? `<img src="${esc(rel)}" alt="${esc(a.id)}">` : a.source?.url ? `<a class="link" href="${esc(a.source.url)}" target="_blank" rel="noopener">${esc(a.source.url)}</a>` : '';
    return `<article class="${a.status === 'chosen' ? 'chosen' : ''}">
  ${media}
  <h3>${esc(a.id)} <small>${esc(a.kind)}${a.status === 'chosen' ? ' · 고름' : ''}</small></h3>
  <p>${esc(a.why || '')}</p>
  <p class="meta">${esc(a.credit || a.source?.license || '라이선스 미기재')}${a.source?.url && a.file ? ` · <a href="${esc(a.source.url)}" target="_blank" rel="noopener">원본</a>` : ''}</p>
  ${a.fit ? `<p class="meta">적합도 ${esc(score(a.fit))}</p>` : ''}
  ${a.model ? `<p class="meta">3D: ${esc(Object.entries(a.model).map(([k, v]) => `${k} ${v}`).join(' · '))}</p>` : ''}
  ${a.edits ? `<p class="meta">처리: ${esc(a.edits)}</p>` : ''}
</article>`;
  };
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>에셋 후보</title>
<link rel="stylesheet" href="../../vendor/fonts/pretendard/pretendard.css"><link rel="stylesheet" href="../../css/theme.css">
<style>
body{margin:0;padding:48px 64px;background:var(--c-bg);color:var(--c-text);font-family:var(--f)}
h1{font-size:40px;letter-spacing:-.03em;margin:0 0 8px} .lead{color:var(--c-text-3);margin:0 0 48px}
h2{font-size:28px;margin:48px 0 16px} .row{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:32px}
article img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;background:var(--c-surface)}
article.chosen h3{color:var(--c-accent-text)} h3{font-size:20px;margin:12px 0 4px} small{color:var(--c-text-3);font-weight:500}
p{margin:4px 0;font-size:16px;line-height:1.45} .thumbs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px} .thumbs img{aspect-ratio:16/9} .meta{color:var(--c-text-3);font-size:14px} .link{word-break:break-all}
</style></head><body>
<h1>에셋 후보</h1><p class="lead">장마다 후보를 보고 고른다. 고른 것은 assets.json에서 status를 chosen으로 바꾼다.</p>
${[...groups.entries()].map(([k, list]) => `<h2>${esc(k)}</h2><div class="row">${list.map(card).join('\n')}</div>`).join('\n') || '<p>후보 없음. /kpu-ppt assets로 조사한다.</p>'}
</body></html>`;
  const file = path.join(dir, 'index.html');
  fs.writeFileSync(file, html);
  return { file, candidates: items.filter((a) => a.status === 'candidate').length, chosen: items.filter((a) => a.status === 'chosen').length, refs: items.filter((a) => a.kind === 'reference').length };
}
