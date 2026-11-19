// reward-basis (A안): 판정 순서를 같은 다섯 후보에 한 단계씩.
// 0단계 다섯 막대 → 1단계 E를 "나머지 4개 평균 +15%" 선에 대 보고 점선(평균 제외) → 2단계 같은 점선 = 유효 평균, 거리우선 녹색.
// 좌표는 실제 px. 숫자는 num(id)만. 기준선 높이(나머지 평균 × (1 + 15%))는 좌표로만 쓰고 글자로 찍지 않는다.
// 움직임(CSS는 장 html): 들어오면 막대가 차례로 자람(.grow, --i) → 1단계 평균 점선이 왼→오로 그어지고(.drawx) +15% 선이 가운데서 펼쳐짐(.drawc),
// +28.24%가 떠오름(.riseup) → 2단계 거리우선에 녹색이 바닥부터 차오르고(.fillup) 평균과의 틈이 드러남(.gap) → 3단계 5.34%가 세어 올라감(count-up)
export default function draw(host, { cfg, num, svg, el, text, g }) {
  const W = 1040, H = 620;
  const items = cfg.items.map((it) => ({ ...it, kg: num(`car-${it.k}-kg`) }));
  const s = svg(host, W, H, '자동차 후보 다섯 개의 예상 배기관 CO₂ 막대. 42km 후보는 나머지 평균보다 15% 넘게 높아 평균에서 빠지고, 남은 네 개의 평균보다 거리우선이 낮다');

  const base = 504, k = 44;                       // 1kgCO₂ = 44px, 0부터
  const y = (v) => base - v * k;
  const x0 = 264, step = 140, bw = 92;            // 막대 중심 x0 + i·step
  const lineX = 196, labelX = 180;                // 평균 점선 시작 · 왼쪽 라벨 끝
  const kmPerL = num('car-km-per-l');

  // 축 이름 (처음부터)
  text(s, 0, 28, 'lbl', `예상 배기관 CO₂(kgCO₂) · 휘발유차 1대 ${kmPerL.text}km/L 가정`);

  // 평균 점선 (1단계부터). 같은 선이 1단계엔 E의 나머지 평균, 2단계부터 유효 평균
  const mean = num('car-valid-mean');
  const others = num('car-e-others-mean');       // = 유효 평균 (E만 빠지므로 같은 값)
  const my = y(mean.value);
  const ml = g(s, 's1');
  ml.append(el('line', { x1: lineX, x2: x0 + step * 4 + bw / 2 + 24, y1: my, y2: my, class: 'ref drawx' }));
  text(ml, labelX, my + 10, 'val end', mean.text);
  text(ml, labelX, my - 30, 'lbl end only1', `나머지 ${num('car-valid-count').text}개 평균`);
  text(ml, labelX, my - 30, 'lbl end s2', '유효 평균');

  // 막대
  items.forEach((it, i) => {
    const cx = x0 + i * step, top = y(it.kg.value), h = base - top;
    const nm = it.name;
    if (it.out) {
      // E: 0단계 꽉 찬 회색 → 1단계부터 점선 빈 막대
      s.append(el('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 6, class: 'bar e-solid grow', style: `--i:${i}` }));
      s.append(el('rect', { x: cx - bw / 2 + 1.5, y: top + 1.5, width: bw - 3, height: h - 1.5, rx: 6, class: 'bar off s1' }));
      // 판정 기준선: 나머지 평균 × (1 + 15%) — E 칸에만
      const ly = y(others.value * (1 + num('exclude-pct').value / 100));
      const lg = g(s, 's1 d2');
      lg.append(el('line', { x1: cx - bw / 2 - 16, x2: cx + bw / 2 + 16, y1: ly, y2: ly, class: 'lim drawc' }));
      text(lg, cx, ly - 14, 'lbl mid', `+${num('exclude-pct').text}%`);
      // 값: 0단계 kg, 1단계부터 위에 +28.24% (지금 말하는 것 = 진하게)
      const v0 = text(s, cx, top - 18, 'val mid d1', it.kg.text);
      const vg = g(s, 'vin'); vg.setAttribute('style', `--i:${i}`); vg.append(v0);
      text(s, cx, top - 18 - 40, 'val mid hx h1 s1 riseup', `+${num('car-e-over-pct').text}%`);
      nm.forEach((line, j) => text(s, cx, base + 44 + j * 32, 'lbl mid', line));
      text(s, cx, base + 44 + nm.length * 32 + 8, 'note mid hx h1 s1', '평균 제외 · 선택 가능');
    } else {
      const pk = it.k === 'a';
      s.append(el('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 6, class: 'bar grow', style: `--i:${i}` }));
      if (pk) {
        // 2단계: 평균과의 틈(막대 꼭대기 ~ 평균 점선)이 연한 녹색으로 드러나고, 녹색이 바닥부터 차오른다
        if (my < top) s.append(el('rect', { x: cx - bw / 2, y: my, width: bw, height: top - my, class: 'gap' }));
        s.append(el('rect', { x: cx - bw / 2, y: top, width: bw, height: h, rx: 6, class: 'bar pk fillup' }));
      }
      const vg = g(s, 'vin'); vg.setAttribute('style', `--i:${i}`);
      text(vg, cx, top - 18, pk ? 'val mid pk a2' : 'val mid', it.kg.text);
      text(s, cx, base + 44, pk ? 'lbl mid pk a2' : 'lbl mid', nm[0]);
    }
  });
  // 바닥선
  s.append(el('line', { x1: x0 - step / 2 + 8, x2: x0 + step * 4 + step / 2 - 8, y1: base, y2: base, class: 'base' }));

  // 3단계 오른쪽 큰 숫자: 0부터 세어 올라간다(main.js countUp, 값은 근거 장부에서)
  const hn = host.closest('section')?.querySelector('.rail .hero-num');
  const pct = num('car-a-vs-mean-pct');
  if (hn && isFinite(pct.value)) { hn.dataset.countup = String(pct.value); hn.dataset.decimals = String((pct.text.split('.')[1] || '').length); }
}
