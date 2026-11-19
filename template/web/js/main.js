// KPU_PPT 런타임 진입점. 손대지 않는다: 장 내용은 slides/<slug>.html, 숫자는 근거 장부, 그림은 viz 템플릿.
import Reveal from '../vendor/reveal/reveal.esm.js';
import Notes from '../vendor/reveal/plugin/notes/notes.esm.js';
import { renderNums, sourceLine } from './numbers.js';
import { renderViz } from './viz/index.js';

window.__errs = [];
window.addEventListener('error', (e) => window.__errs.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errs.push(String(e.reason)));
const origErr = console.error;
console.error = (...a) => { window.__errs.push(a.map(String).join(' ')); origErr(...a); };

const ASSETS = Object.fromEntries((JSON.parse(document.getElementById('asset-data')?.textContent || '{"items":[]}').items || []).map((a) => [a.id, a]));
const sections = [...document.querySelectorAll('.reveal .slides > section')];
for (const [i, sec] of sections.entries()) {
  sec.dataset.step = '0';
  const used = new Set();
  renderNums(sec, used);
  await renderViz(sec, used);
  // 하단 오른쪽: 출처(자동) + 장 번호
  const src = sourceLine(used);
  const credits = [...new Set([...sec.querySelectorAll('[data-asset]')].map((e) => ASSETS[e.dataset.asset]?.credit).filter(Boolean))];
  [...sec.querySelectorAll('[data-asset]')].forEach((e) => { if (!ASSETS[e.dataset.asset]) console.error('에셋 장부에 없거나 고르지 않은 에셋:', e.dataset.asset); });
  const r = document.createElement('p');
  r.className = 'foot-r';
  r.textContent = [src.text, credits.length ? '이미지 ' + credits.join(' · ') : ''].filter(Boolean).join(' · ');
  const pg = document.createElement('span');
  pg.className = 'pg';
  pg.textContent = String(i + 1);
  r.append(pg);
  sec.append(r);
  // 예시 값을 쓴 장은 하단 왼쪽에 자동 표시
  if (src.example) {
    let l = sec.querySelector('.foot-l');
    if (!l) { l = document.createElement('p'); l.className = 'foot-l'; sec.append(l); }
    if (!/예시 값/.test(l.textContent)) l.textContent = (l.textContent ? l.textContent + ' · ' : '') + '예시 값 (실제 데이터 아님)';
  }
}

await Reveal.initialize({
  width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 3,
  center: false, hash: true, controls: false, progress: false, slideNumber: false,
  transition: 'none', backgroundTransition: 'none', plugins: [Notes],
});
window.Reveal = Reveal;

// 단계 동기화: section[data-step] = 보인 단계 수
function countUp(sec) {
  sec.querySelectorAll('[data-countup]').forEach((n) => {
    const host = n.closest('.s1, .s2, .s3');
    const need = host ? Number(host.className.match(/\bs(\d)\b/)[1]) : 0;
    if (Number(sec.dataset.step) < need) return;
    if (n.dataset.done) return;
    n.dataset.done = '1';
    const to = Number(n.dataset.countup), dec = Number(n.dataset.decimals || 0), t0 = performance.now(), dur = 1200;
    const final = n.textContent;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
      n.textContent = k < 1 ? (to * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : final;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function sync() {
  const sec = Reveal.getCurrentSlide();
  if (!sec) return;
  sec.dataset.step = String(sec.querySelectorAll('.fragment.step.visible').length);
  requestAnimationFrame(() => countUp(sec));
}
['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach((e) => Reveal.on(e, sync));
sync();
// 전체화면: F 키(reveal 기본) 또는 오른쪽 위 버튼. 버튼은 마우스를 움직일 때만 잠깐 보이고 전체화면 중·캡처에는 안 보인다
{
  const root = document.documentElement;
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const toggle = () => {
    const r = isFs() ? (document.exitFullscreen || document.webkitExitFullscreen).call(document)
      : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    r?.catch?.((e) => console.warn('전체화면 전환 거절:', e.message)); // 거절은 검수 오류로 세지 않는다
  };
  const st = document.createElement('style');
  st.textContent = `.deck-fs{position:fixed;top:20px;right:20px;z-index:1000;width:48px;height:48px;padding:0;display:grid;place-items:center;
    border:1px solid rgba(0,0,0,.12);border-radius:10px;background:rgba(255,255,255,.92);color:#333;cursor:pointer;
    opacity:0;pointer-events:none;transition:opacity .2s}
  .deck-fs.on{opacity:1;pointer-events:auto}.deck-fs:hover{background:#fff;color:#000}
  .deck-fs svg{width:24px;height:24px}`;
  document.head.append(st);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'deck-fs';
  btn.title = btn.ariaLabel = '전체화면 (F)';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>';
  btn.addEventListener('click', () => { toggle(); btn.blur(); btn.classList.remove('on'); });
  document.body.append(btn);
  let t;
  window.addEventListener('mousemove', () => {
    if (isFs()) return;
    btn.classList.add('on');
    clearTimeout(t);
    t = setTimeout(() => btn.classList.remove('on'), 2000);
  });
  const onFs = () => { if (isFs()) btn.classList.remove('on'); };
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
}
document.documentElement.dataset.ready = '1';
