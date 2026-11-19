// annual (A안): 같은 kg 축 위 가로 막대 세 줄. 막대 하나 = 편도 520회 = 520칸(세로 = 한 주의 편도 횟수, 가로 = 52주).
// 세 줄 모두 칸 수는 같고 칸 폭만 편도 거리 차이(1·2·4km)에 비례 → 막대 길이 = 연간 차이, 0부터 같은 축.
// 0단계: 줄 이름 + 대표 줄 칸 하나(편도 한 번, 숨 쉬듯 커졌다 작아짐) → 1단계: 대표 520칸 → 2단계: 회색 두 줄. 숫자는 num(id)만.
// 움직임(CSS는 장 html): 칸 하나하나가 쌓이는 순서대로 톡 생겨난다. 주(열) 왼쪽 → 오른쪽 20ms, 한 주 안의 편도 위 → 아래 9ms
// (칸마다 --dl). 세 줄 모두 같은 박자(같은 52주·520회) → 줄마다 칸 폭만 다르다는 게 박자로 보인다. 뒤로 가면 오른쪽 끝부터 접힌다(--dr).
// 오른쪽 큰 숫자는 생겨난 칸 수 × 편도 한 번 값으로 칸과 같이 올라간다. 장에 들어올 때마다(앞·뒤 어느 쪽이든) 지금 단계까지 다시 생겨난다.
export default function draw(host, { cfg, num, svg, el, text, g }) {
  const W = 1000, H = 690;
  const s = svg(host, W, H, '기존 경로를 거리우선 31km로 바꿨을 때 1년(편도 520회) 배기관 CO₂ 차이. 큰길우선 35km에서 바꾸면 488.4kg, 무료우선 33km는 244.2kg, 실시간 추천 32km는 122.1kg');

  const weeks = num('weeks-per-year').value;                                   // 가로 열 = 주
  const perWeek = num('days-per-week').value * num('trips-per-day').value;     // 세로 칸 = 한 주의 편도 횟수
  const rows = cfg.rows.map((r) => ({
    ...r,
    km: num(`car-${r.k}-km`), dkm: num(`car-${r.k}-vs-a-km`),
    kg: num(`yr-${r.k}-kg`), l: num(`yr-${r.k}-l`),
  }));
  const maxKg = Math.max(...rows.map((r) => r.kg.value));
  const barMax = 832;                     // 가장 긴 막대 px (대표 줄: 열 간격 16px)
  const pxPerKg = barMax / maxKg;
  const x0 = 6;                           // 0 기준선 바로 오른쪽
  const py = 11, th = 8;                  // 칸 세로 간격·높이
  const barH = perWeek * py - (py - th);
  const COL = 20, ROW = 9, BACK = 4;      // 나올 때 열·칸 지연, 물러날 때 열 지연(ms)
  const born = [];                        // 대표 줄 칸이 생겨나는 시각(ms) — 숫자를 칸과 맞춘다

  // 축 이름 (처음부터)
  text(s, 0, 28, 'lbl', `기존 경로 → 거리우선 ${num('car-a-km').text}km · 연간 배기관 CO₂ 차이(kgCO₂)`);

  let y = 100;                            // 첫 줄 이름 기준선
  rows.forEach((r, ri) => {
    const st = `s${r.s}`;
    // 줄 이름: 대표 줄은 진하게, 나머지는 라벨색
    const nm = el('text', { x: 0, y, class: r.pk ? 'ttl' : 'val' });
    nm.append(el('tspan', { class: r.pk ? '' : 'nm2' }, `${r.name} ${r.km.text}km`));
    nm.append(el('tspan', { class: 'lbl', dx: 16 }, `편도 ${r.dkm.text}km 차이`));
    s.append(nm);

    const top = y + 20;
    const len = r.kg.value * pxPerKg;     // 막대 길이 = 연간 kg
    const px = len / weeks;               // 열 간격 = 한 주의 kg에 해당하는 폭
    const gapX = Math.max(1, Math.round(px * 0.25));
    const tw = px - gapX;
    const cls = r.pk ? 'tile pk' : 'tile';
    const rx = tw >= 8 ? 2 : 0;

    for (let c = 0; c < weeks; c++) {
      for (let k = 0; k < perWeek; k++) {
        // 대표 줄의 첫 칸은 0단계부터 (편도 한 번)
        const first = r.pk && c === 0 && k === 0;
        const tile = el('rect', { x: x0 + c * px, y: top + k * py, width: tw, height: th, rx, class: first ? `${cls} one` : `${cls} t ${st}` });
        if (!first) {
          const dl = c * COL + k * ROW;
          tile.setAttribute('style', `--dl:${dl}ms;--dr:${(weeks - 1 - c) * BACK}ms`);
          if (r.pk) born.push(dl);
        }
        s.append(tile);
      }
    }

    // 0 기준선 (줄마다 짧게, 이름과 겹치지 않게)
    s.append(el('line', { x1: 2, x2: 2, y1: top - 8, y2: top + barH + 8, class: r.pk ? 'base' : `base ${st}` }));

    // 막대 끝 직접 라벨: kg(같은 축의 값) · 휘발유 L. 대표 줄은 같은 높이 오른쪽 레일의 큰 숫자가 라벨
    if (!r.pk) {
      const v = el('text', { x: x0 + len - gapX + 20, y: top + barH / 2 + 10, class: `val ${st} after` });
      v.append(el('tspan', {}, r.kg.text));
      v.append(el('tspan', { class: 'u' }, ` kg · ${r.l.text} L`));
      s.append(v);
    }

    if (r.pk) {
      // 0단계: 칸 하나 = 편도 한 번
      const o = g(s, 'only0');
      const my = top + barH / 2;
      o.append(el('path', { d: `M${x0 + tw + 6},${top + th / 2} L${x0 + tw + 26},${top + th / 2} L${x0 + tw + 26},${my} L${x0 + tw + 46},${my}`, class: 'leader pk', fill: 'none' }));
      text(o, x0 + tw + 58, my + 10, 'val', `편도 한 번 = 휘발유 ${num('trip-d-l').text}L 차이`);
      // 1단계부터: 칸 읽는 법
      const bot = top + barH + 36;
      text(s, 0, bot, `note ${st}`, '한 칸 = 편도 한 번 · 한 열 = 한 주');
      text(s, x0 + len - gapX, bot, `note end ${st} after`, `${num('weeks-per-year').text}주`);
      y = bot + 76;
    } else {
      y = top + barH + 76;
    }
  });

  // 1단계 오른쪽 큰 숫자: 칸이 생겨나는 동안 (생긴 칸 수 ÷ 520) × 연간 kg로 함께 올라간다. 값은 근거 장부(yr-d-kg)에서, 끝은 원래 글자 그대로
  const sec = host.closest('section');
  const hn = sec?.querySelector('.rail .hero-num');
  const kg = num(`yr-${rows.find((r) => r.pk)?.k}-kg`);
  if (!sec) return;
  born.sort((a, b) => a - b);
  const total = born.length + 1;          // + 0단계부터 있던 칸 하나
  const dec = (kg.text.split('.')[1] || '').length;
  const final = hn?.textContent;
  const reduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  let raf = 0;
  const stopCount = () => { cancelAnimationFrame(raf); raf = 0; if (hn) hn.textContent = final; };
  const count = () => {
    cancelAnimationFrame(raf);
    if (!hn || !isFinite(kg.value) || reduce()) return stopCount();
    const t0 = performance.now(), POP = 120;  // 칸이 눈에 보일 만큼 커진 때 센다
    const tick = (t) => {
      const e = t - t0 - POP;
      let n = 1;
      while (n - 1 < born.length && born[n - 1] <= e) n++;
      if (n >= total) return stopCount();
      hn.textContent = fmt(kg.value * n / total);
      raf = requestAnimationFrame(tick);
    };
    hn.textContent = fmt(kg.value / total);
    raf = requestAnimationFrame(tick);
  };

  // 장에 들어올 때: 칸을 한 프레임 비우고(an-rest) 지금 단계까지 다시 생겨나게. 떠날 때·0단계로 돌아갈 때 숫자는 원래 글자로
  const anyTile = s.querySelector('rect.one');
  let present = false, step = 0;
  // classList.remove는 이미 없는 클래스여도 속성을 다시 써서 관찰자를 또 부른다 → 있을 때만 지운다(무한 반복 방지)
  const unrest = () => { if (sec.classList.contains('an-rest')) sec.classList.remove('an-rest'); };
  const replay = () => {
    sec.classList.add('an-rest');
    if (anyTile) getComputedStyle(anyTile).opacity;    // 빈 상태를 먼저 확정해야 전환이 처음부터 돈다
    requestAnimationFrame(() => requestAnimationFrame(() => {
      unrest();
      if (present && step >= 1) count();
    }));
  };
  const onChange = () => {
    const p = sec.classList.contains('present'), st = Number(sec.dataset.step || 0);
    const was = present, prev = step;
    present = p; step = st;
    if (p === was && st === prev) return;   // 내 an-rest 토글 등 상관없는 변화
    if (reduce()) { unrest(); return stopCount(); }
    if (p && !was) { if (st >= 1 && hn) hn.textContent = fmt(kg.value / total); return replay(); }
    if (!p) { unrest(); return stopCount(); }
    if (st >= 1 && prev < 1) count();
    else if (st < 1) stopCount();
  };
  new MutationObserver(onChange).observe(sec, { attributes: true, attributeFilter: ['class', 'data-step'] });
  onChange();
}
