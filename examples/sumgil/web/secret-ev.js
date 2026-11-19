// 숨김 장 진입점. closing 장의 숨은 figure가 이 모듈을 불러 단축키만 걸어 둔다(화면에는 아무것도 그리지 않음).
// Ctrl+Shift+8 (Mac: ⌃⇧8, 8 = 800 V) → 마지막 장 뒤에 "전기차 해부" 장을 붙이고 그 장으로 간다.
// 그 장에서 한 번 더 누르면 바로 앞 장으로 돌아간다. 장은 한 번 붙으면 남는다(→ 키로 다시 들어갈 수 있음).
// 겹침 확인(2026-11-18, 공식 단축키 목록): Chrome은 Ctrl+숫자·Ctrl+Shift+글자만 쓰고 Ctrl+Shift+숫자는 없음,
// macOS Control-Shift 조합에 숫자 없음, Windows Ctrl+Shift+숫자는 파일 탐색기 보기 전환뿐(브라우저 밖).
// reveal은 수정키가 붙은 입력을 무시한다. Shift가 눌리면 e.key가 기호('*')로 바뀌므로 e.code로 본다.
// 무거운 three.js 장면(js/secret/ev-anatomy.js)은 처음 누를 때만 불러온다.
export default function secretEv(host) {
  host.remove();
  if (window.__evSecret) return;
  window.__evSecret = true;

  let sec = null;
  let busy = false;

  const open = async () => {
    const R = window.Reveal;
    if (!R || busy) return;
    if (sec && R.getCurrentSlide() === sec) { R.prev(); return; }
    busy = true;
    try {
      const m = await import('../secret/ev-anatomy.js');
      if (!sec) {
        sec = m.createSection();
        document.querySelector('.reveal .slides').append(sec);
        R.sync();
        m.mount(sec, R);
      }
      R.slide(R.getIndices(sec).h, 0, -1);
    } catch (err) {
      console.error('숨김 장 실패', err);
    } finally {
      busy = false;
    }
  };

  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey)) return;
    if (e.code !== 'Digit8' && e.code !== 'Numpad8') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) open();
  }, true);
}
