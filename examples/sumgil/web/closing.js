// closing (마무리). 같은 모듈이 장의 두 그림을 그린다(cfg.part).
//  journey: 한 여정 위에 놓은 숨길의 제안. 출발 전 "배출량 비교" ● ── ● 이용 확인 뒤 "선택 보상" (녹색 실선 = 제안,
//           why-action 마지막 줄과 같은 표기) ⋯⋯ ○ 다음 단계 "경로 선택 변화 검증" (회색 점선 + 빈 원 = 아직 하지 않은 일).
//  qr:      데모 앱 QR. 덱 안 라이브러리(vendor/qr/qrcode.js)로 오프라인 생성, 오류 정정 M, 여백 4모듈, 로고 없음, 패널 없음.
//           어두운 모듈이 150px 상자(오른쪽·위 정렬선)에 딱 맞고 여백은 상자 밖 흰 바탕으로 나간다(v8과 같은 방식).
// 숫자 없음(기획서 유의점: 최대 격차·연간값을 다시 나열하지 않는다). 좌표는 실제 px.
export default async function draw(host, ctx) {
  if (ctx.cfg.part === 'qr') return drawQR(host, ctx);
  return drawJourney(host, ctx);
}

function drawJourney(host, { cfg, svg, el, text, g }) {
  const W = 1632, H = 176;
  const s = svg(host, W, H, '숨길의 제안: 출발 전 배출량 비교에서 이용 확인 뒤 선택 보상까지 녹색 실선으로 잇고, 다음 단계인 경로 선택 변화 검증은 점선으로 이어진다');
  const yT = 26, yL = 76, yV = 152, r = 14;          // 때 글자 기준선 · 선 · 무엇 글자 기준선 · 점 반지름
  const [n1, n2, n3] = cfg.nodes;
  const x = cfg.nodes.map((n) => n.x + r);           // 점 중심 (글자 왼쪽 끝 = 점 왼쪽 끝 = n.x)

  // 다음 단계 (1단계): 점선 + 빈 원
  const nx = g(s, 'nx s1');
  nx.append(el('line', { x1: x[1] + r + 18, x2: x[2] - r - 14, y1: yL, y2: yL, class: 'dash-ln' }));
  nx.append(el('circle', { cx: x[2], cy: yL, r, class: 'ring nx-ring' }));
  text(nx, n3.x, yT, 'when', n3.when);
  text(nx, n3.x, yV, 'what nx-what', n3.what);

  // 숨길의 제안: 녹색 점 두 개 + 실선
  const pr = g(s, 'prop');
  pr.append(el('line', { x1: x[0], x2: x[1], y1: yL, y2: yL, class: 'ln pk' }));
  [0, 1].forEach((i) => pr.append(el('circle', { cx: x[i], cy: yL, r, class: 'dot pk' })));
  [n1, n2].forEach((n) => {
    text(pr, n.x, yT, 'when', n.when);
    text(pr, n.x, yV, 'what pr-what', n.what);
  });
}

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
  // 가로로 이어진 어두운 모듈은 한 사각형으로 (이음새 없이)
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
  // 주소 글자: QR과 같은 값 한곳(cfg.url)에서
  section.querySelectorAll('[data-demo-url]').forEach((p) => { p.textContent = cfg.url.replace(/^https?:\/\//, '').replace(/\/$/, ''); });
}
