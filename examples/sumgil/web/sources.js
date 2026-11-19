// 출처 팝업. closing 장의 숨은 figure가 이 모듈을 불러 동작만 건다(화면에 그리지 않음).
// 서명의 숨길 잎·"숨길" 글자를 누르면 .src-pop이 1쪽으로 뜬다.
// 누르기 · → · ↓ · 스페이스 · PageDown · Enter = 다음 쪽(마지막 쪽에서는 닫기), ← · ↑ · PageUp = 앞 쪽, 그 밖의 키(Esc 등) = 닫기.
// 열려 있는 동안 키 입력은 reveal 장 이동으로 넘기지 않는다.
export default function sources(host, { section }) {
  host.remove();
  const pop = section.querySelector('.src-pop');
  if (!pop) return;
  const pages = [...pop.querySelectorAll('.src-page')];
  let p = 0;
  const show = (i) => { p = i; pages.forEach((pg, k) => { pg.hidden = k !== i; }); };
  const set = (on) => { if (on) show(0); pop.classList.toggle('on', on); pop.setAttribute('aria-hidden', String(!on)); };
  const next = () => (p < pages.length - 1 ? show(p + 1) : set(false));
  const prev = () => (p > 0 ? show(p - 1) : set(false));
  section.querySelectorAll('.sig .mark-leaf, .sig b').forEach((t) => t.addEventListener('click', (e) => { e.stopPropagation(); set(true); }));
  pop.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  window.addEventListener('keydown', (e) => {
    if (!pop.classList.contains('on')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) next();
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) prev();
    else set(false);
  }, true);
  // 다른 장으로 가면 닫아 둔다
  const tryHook = () => (window.Reveal?.on ? window.Reveal.on('slidechanged', () => set(false)) : setTimeout(tryHook, 200));
  tryHook();
}
