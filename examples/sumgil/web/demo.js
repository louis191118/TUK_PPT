// demo (시연, 본편 9:00 밖). 같은 모듈이 장의 두 그림을 맡는다(cfg.part).
//  live: 실제 데모 앱(app/ = prototype/sumgil 심볼릭 링크)을 iframe으로 띄운다. v8 12장 방식 그대로.
//        - 이 장에 들어올 때만 src를 넣고, 들어올 때마다 시작 해시(cfg.start)로 새로 연다(주소에 시각을 붙여 앱 상태 초기화).
//        - 나가면 about:blank로 비워 지도·재생을 멈춘다.
//        - B 키 = 백업 캡처 세 장(비교·선택·도착) 켜고 끄기. cfg.failMs 안에 앱이 안 뜨면 백업으로 자동 전환.
//        - 앱 안을 클릭해도 장 넘김이 되게: 앱 안에서 누른 PageDown/PageUp(클리커)·화살표·B·Esc를 덱으로 넘긴다
//          (같은 출처라서 가능. 검색 입력칸에 글자를 치는 중에는 화살표를 앱에 두고, Esc로 덱에 돌아온다). 다른 출처로 바꾸면 여백 클릭으로 포커스를 되찾는다.
//        - 앱이 시작 화면에서 검색칸에 스스로 주는 포커스는, 발표자가 앱을 만지기 전이면 덱으로 되돌린다.
//        - 앱 화면을 따라 왼쪽 세 단계(.watch .st)의 지금 단계를 진하게: 검색·결과 = 비교, 상세 = 선택, 안내·도착 = 도착
//          (앱은 pushState로 해시를 바꾸므로 이 장에 있는 동안만 0.3초마다 앱 해시를 읽는다).
//        - 캡처·점검용 주소 옵션: ?demo=backup 이면 이 장에서 백업 화면부터 보인다.
//  qr:   데모 앱 QR. 마무리 장과 같은 방식(vendor/qr/qrcode.js로 오프라인 생성, 오류 정정 M, 여백 4모듈, 로고·패널 없음).
// 숫자 없음(화면 숫자는 html의 data-num). 좌표는 실제 px.
export default async function draw(host, ctx) {
  if (ctx.cfg.part === 'qr') return drawQR(host, ctx);
  return live(host, ctx);
}

// ---------- 라이브 앱 ----------
function live(host, { cfg, section }) {
  const iframe = host.querySelector('iframe');
  const steps = [...section.querySelectorAll('.watch .st')];
  const forceBackup = new URLSearchParams(location.search).get('demo') === 'backup';
  let on = false, timer = 0, poll = 0, judged = false, appWin = null, touched = false;

  host.classList.add('idle');
  const setStage = (k) => steps.forEach((s, i) => { s.classList.toggle('now', i === k); s.classList.toggle('seen', i < k); });
  const backup = (force) => section.classList.toggle('backup-on', force ?? !section.classList.contains('backup-on'));

  // 앱 해시 → 단계 (app.js 해시 경로: #/search, #/results/…, #/detail/…, #/nav/…, #/done/…)
  const stageOf = (hash) => (/^#\/(nav|done)\//.test(hash) ? 2 : /^#\/detail\//.test(hash) ? 1 : 0);
  const follow = () => { try { setStage(stageOf(iframe.contentWindow.location.hash)); } catch { /* 다른 출처: 단계 표시는 그대로 */ } };

  // 앱이 떴는지: 같은 출처면 #ui 안에 화면이 그려졌는지, 404·오류 문서가 아닌지 본다
  const inspect = () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc) return true;
      if (doc.readyState !== 'complete' && doc.readyState !== 'interactive') return false;
      if (/error|not found|404|없음/i.test(`${doc.title} ${(doc.body?.textContent || '').slice(0, 80)}`) && !doc.getElementById('ui')) return false;
      const ui = doc.getElementById('ui');
      return !!ui && ui.children.length > 0;
    } catch { return true; } // 다른 출처면 load 이벤트를 성공으로 본다
  };
  const judge = (ok) => {
    if (judged || !on) return;
    judged = true;
    clearTimeout(timer);
    host.classList.remove('idle');
    host.classList.toggle('ok', ok);
    host.classList.toggle('failed', !ok);
    if (!ok) { console.info('데모 앱이 뜨지 않아 백업 캡처로 바꿨다'); backup(true); }
  };

  // 앱 안에서 누른 키 → 덱으로
  const NAV = { PageDown: 'next', PageUp: 'prev', ArrowRight: 'next', ArrowLeft: 'prev', ArrowDown: 'next', ArrowUp: 'prev' };
  const toDeck = () => {
    try { iframe.contentDocument?.activeElement?.blur?.(); } catch { /* 무시 */ }
    iframe.blur();
    window.focus();
  };
  const onAppKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target, typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
    const clicker = e.key === 'PageDown' || e.key === 'PageUp';
    if (e.key === 'Escape') { e.preventDefault(); toDeck(); return; }
    if (typing && !clicker) return;                    // 검색칸에 글자를 치는 중이면 앱에 둔다
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); e.stopPropagation(); toDeck(); backup(); return; }
    const go = NAV[e.key];
    if (!go) return;
    e.preventDefault(); e.stopPropagation();
    toDeck();
    window.Reveal?.[go]?.();
  };
  const hook = () => {
    try {
      const w = iframe.contentWindow;
      if (!w || w === appWin || w.location.href === 'about:blank') return;
      appWin = w;
      w.addEventListener('keydown', onAppKey, true);
      w.addEventListener('pointerdown', () => { touched = true; }, true);
    } catch { /* 다른 출처 */ }
  };

  iframe.addEventListener('load', () => {
    if (!on || !iframe.getAttribute('src') || iframe.getAttribute('src') === 'about:blank') return;
    hook();
    follow();
    // 앱은 검색 화면을 열면 입력칸에 스스로 포커스를 준다(app.js render 뒤 50ms) → 그대로 두면 덱의 화살표·B가 앱으로 간다.
    // 발표자가 앱을 아직 만지지 않았으면 포커스를 덱으로 되돌린다.
    [120, 400, 900].forEach((ms) => setTimeout(() => { if (on && !touched && document.activeElement === iframe) toDeck(); }, ms));
    setTimeout(() => judge(inspect()), 500);
  });
  iframe.addEventListener('error', () => judge(false));

  function enter() {
    judged = false; appWin = null; touched = false;
    host.classList.remove('ok', 'failed');
    host.classList.add('idle');
    setStage(0);
    backup(forceBackup);
    clearTimeout(timer);
    timer = setTimeout(() => judge(inspect()), cfg.failMs || 4000);
    clearInterval(poll);
    poll = setInterval(follow, 300); // 앱은 pushState로 해시를 바꿔 hashchange가 안 온다 → 짧게 살핀다(이 장에 있을 때만)
    const sep = cfg.app.includes('?') ? '&' : '?';
    iframe.src = `${cfg.app}${sep}deck=${Date.now()}&replay=${cfg.replay}${encodeHash(cfg.start)}`; // 매번 새 주소 → 시작 화면부터. 재생은 덱에서만 빠르게
  }
  function leave() {
    clearTimeout(timer);
    clearInterval(poll);
    if (document.activeElement === iframe) toDeck();
    host.classList.remove('ok', 'failed');
    host.classList.add('idle');
    if (iframe.getAttribute('src') && iframe.getAttribute('src') !== 'about:blank') iframe.src = 'about:blank';
    appWin = null;
    backup(false);
    setStage(0);
  }

  // 이 장이 지금 장인지: Reveal이 section에 'present'를 붙이고 뗀다(런타임 main.js는 건드리지 않는다)
  const check = () => {
    const now = section.classList.contains('present');
    if (now === on) return;
    on = now;
    if (on) enter(); else leave();
  };
  new MutationObserver(check).observe(section, { attributes: true, attributeFilter: ['class'] });
  check();

  // 덱에서 누른 B: 이 장에서는 화면 가리기(Reveal 기본) 대신 백업 캡처 (Reveal보다 먼저 받도록 window 캡처 단계)
  window.addEventListener('keydown', (e) => {
    if (!on || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== 'b' && e.key !== 'B') return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    backup();
  }, true);

  // 점검용
  window.__demo = { enter, leave, backup, setStage, get state() { return { on, judged, cls: host.className, backup: section.classList.contains('backup-on') }; } };
}

// 해시 안의 한글 검색어를 주소에 안전하게
function encodeHash(h = '') {
  const [p, q] = h.split('?');
  if (!q) return p;
  const qs = new URLSearchParams(q);
  return `${p}?${qs.toString()}`;
}

// ---------- QR ----------
let qrLib;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  qrLib ??= new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'vendor/qr/qrcode.js';
    sc.onload = () => (window.qrcode ? res(window.qrcode) : rej(new Error('qrcode 전역이 없다')));
    sc.onerror = () => rej(new Error('QR 라이브러리를 읽지 못했다 (vendor/qr/qrcode.js)'));
    document.head.append(sc);
  });
  return qrLib;
}

async function drawQR(host, { cfg, el, section }) {
  const QR = await loadQR();
  QR.stringToBytes = QR.stringToBytesFuncs['UTF-8'];
  const q = QR(0, 'M');
  q.addData(cfg.url, 'Byte');
  q.make();
  const n = q.getModuleCount(), quiet = cfg.quiet, tot = n + quiet * 2;
  const m = cfg.size / n;                            // 모듈 한 칸 px (어두운 모듈 상자 = cfg.size)
  let d = '';
  for (let rr = 0; rr < n; rr++) {
    for (let c = 0; c < n; c++) {
      if (!q.isDark(rr, c)) continue;
      let k = c;
      while (k + 1 < n && q.isDark(rr, k + 1)) k++;
      d += `M${c + quiet},${rr + quiet}h${k - c + 1}v1h${-(k - c + 1)}z`;
      c = k;
    }
  }
  const s = el('svg', { viewBox: `0 0 ${tot} ${tot}`, width: tot * m, height: tot * m, 'shape-rendering': 'crispEdges', role: 'img', 'aria-label': `데모 앱 QR ${cfg.url}` });
  s.classList.add('qr-svg');
  s.style.left = s.style.top = `${-quiet * m}px`;
  s.append(el('rect', { width: tot, height: tot, class: 'qr-bg' }));
  s.append(el('path', { d, class: 'qr-fg' }));
  host.append(s);
  section.querySelectorAll('[data-demo-url]').forEach((p) => { p.textContent = cfg.url.replace(/^https?:\/\//, '').replace(/\/$/, ''); });
}
