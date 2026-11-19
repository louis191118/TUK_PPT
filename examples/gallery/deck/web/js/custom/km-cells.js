// 직접 설계한 그림 예: "1km = 한 칸". 두 경로의 거리 차이를 칸 수로, 같은 계수라 배출량은 칸 수에 비례한다는 걸 보인다.
export default function draw(host, { num, svg, el, text }) {
  const eco = num('km-b'), rec = num('km-a'), f = num('factor'), ecoKg = num('eq-kg');
  const s = svg(host, 1632, 200, `1칸 = 1km. 거리우선 ${eco.text}칸, 실시간 추천 ${rec.text}칸`);
  const x0 = 200, u = 36, cw = 31;
  const row = (y, n, pk, name, val, stepCls) => {
    text(s, 0, y + 26, pk ? 'ttl pk' : 'val', name);
    for (let i = 0; i < n; i++) s.append(el('rect', { x: x0 + i * u, y, width: cw, height: cw, rx: 4, class: pk ? `bar pk ${stepCls}` : 'bar' }));
    text(s, x0 + n * u + 20, y + 26, pk ? `val pk ${stepCls}` : 'val', val);
  };
  row(0, rec.value, false, '실시간 추천', `${rec.text}km`);
  row(56, eco.value, true, '거리우선', `${eco.text}km · ${ecoKg.text}kg`, 'a1');
  text(s, x0, 150, 'note s1', `1칸 = 1km × ${f.text}kgCO₂ — 같은 계수라 배출량은 칸 수에 비례`);
}
