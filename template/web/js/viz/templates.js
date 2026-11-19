// 근거 유형별 그림 템플릿. 설정은 `references/viz.md` 표. 숫자는 모두 ctx.num(id)로만.
// 크기 기본: 본문 폭 1632 × 높이 600. 색·글자는 base.css 클래스.
import { el, svg, text, g, sCls, aCls, cx, niceMax, arrow } from './core.js';

const W0 = 1632, H0 = 600;
const val = (r, unit) => r.text + (unit ?? r.unit ?? '');

// ── 비교: 막대 (0부터, 우리 값만 강조, 평균은 점선) ──
export function bars(host, cfg, ctx) {
  const items = cfg.items.map((it) => ({ ...it, r: ctx.num(it.num) }));
  const unit = cfg.unit;
  const horiz = cfg.orient ? cfg.orient === 'h' : (items.length > 7 || items.some((i) => [...i.label].length > 7));
  const live = items.filter((i) => !i.off);
  let mean = null;
  if (cfg.mean === true) mean = { value: live.reduce((a, i) => a + i.r.value, 0) / live.length };
  else if (typeof cfg.mean === 'string') { const r = ctx.num(cfg.mean); mean = { value: r.value, text: r.text }; }
  if (mean && mean.text == null) mean.text = ctx.fmt(mean.value, cfg.meanDecimals ?? ctx.N[items[0].num]?.decimals ?? 1);
  const max = niceMax(Math.max(...items.map((i) => i.r.value), mean?.value ?? 0));
  const W = cfg.width || W0, H = cfg.height || (horiz ? Math.min(H0, items.length * 88 + 40) : H0);
  const s = svg(host, W, H, cfg.label || `${items.map((i) => `${i.label} ${val(i.r, unit)}`).join(', ')}`);
  const bar = (i, x, y, w, h) => {
    const cls = cx('bar', i.off && 'off', i.accent && 'pk', i.accent && aCls(cfg), sCls(cfg, 'bars', i));
    s.append(el('rect', { x, y, width: Math.max(w, 0), height: Math.max(h, 0), rx: 6, class: cls }));
  };
  if (!horiz) {
    const Wp = mean ? W - 280 : W;   // 평균 라벨 자리를 오른쪽에 비워 둔다 (막대 값과 겹치지 않게)
    const base = H - 64, top = 56, k = (base - top) / max, step = Wp / items.length, bw = Math.min(160, step * 0.56);
    if (mean) s.append(el('line', { x1: -8, x2: Wp + 8, y1: base - mean.value * k, y2: base - mean.value * k, class: cx('ref', sCls(cfg, 'mean')) }));
    items.forEach((i, n) => {
      const c = step * n + step / 2, h = i.r.value * k;
      bar(i, c - bw / 2, base - h, bw, h);
      text(s, c, base - h - 18, cx('val mid', i.accent && 'pk', i.accent && aCls(cfg), sCls(cfg, 'bars', i)), val(i.r, unit));
      text(s, c, base + 44, cx('lbl mid', i.accent && 'pk', i.accent && aCls(cfg)), i.label + (i.off ? ' · 제외' : ''));
    });
    s.append(el('line', { x1: 0, x2: Wp, y1: base, y2: base, class: 'base' }));
    if (mean) {
      const my = base - mean.value * k, mg = g(s, sCls(cfg, 'mean'));
      text(mg, Wp + 32, my - 6, 'lbl', cfg.meanLabel || '평균');
      text(mg, Wp + 32, my + 30, 'val', `${mean.text}${unit ?? ''}`);
    }
  } else {
    const x0 = cfg.labelWidth || 360, L = W - x0 - 220, rowH = (H - 40) / items.length, bh = Math.min(48, rowH * 0.6), k = L / max;
    items.forEach((i, n) => {
      const y = n * rowH + (rowH - bh) / 2;
      text(s, x0 - 32, y + bh / 2 + 9, cx('lbl end', i.accent && 'pk', i.accent && aCls(cfg)), i.label);
      bar(i, x0, y, i.r.value * k, bh);
      text(s, x0 + i.r.value * k + 20, y + bh / 2 + 11, cx('val', i.accent && 'pk', i.accent && aCls(cfg), sCls(cfg, 'bars', i)), val(i.r, unit));
    });
    s.append(el('line', { x1: x0, x2: x0, y1: 0, y2: H - 40, class: 'base' }));
    if (mean) {
      const mx = x0 + mean.value * k;
      s.append(el('line', { x1: mx, x2: mx, y1: -8, y2: H - 32, class: cx('ref', sCls(cfg, 'mean')) }));
      text(s, mx, H - 4, cx('lbl mid', sCls(cfg, 'mean')), `${cfg.meanLabel || '평균'} ${mean.text}${unit ?? ''}`);
    }
  }
  if (cfg.note) note(host, cfg);
}

// ── 한계·반례: 묶음마다 0부터 그린 가로 막대 (순서가 뒤집히는 게 보이게) ──
export function groups(host, cfg, ctx) {
  const W = cfg.width || W0, x0 = cfg.labelWidth || 360, L = W - x0 - 240, bh = 48, gap = 16;
  const blocks = cfg.groups.map((gr) => ({ ...gr, items: gr.items.map((i) => ({ ...i, r: ctx.num(i.num) })) }));
  const H = blocks.reduce((a, b) => a + 56 + b.items.length * (bh + gap) + 40, 0);
  const s = svg(host, W, H, cfg.label || blocks.map((b) => b.title).join(' / '));
  let y = 0;
  blocks.forEach((b, gi) => {
    const gg = g(s, sCls(cfg, `g${gi + 1}`));
    text(gg, 0, y + 30, 'ttl', b.title);
    y += 56;
    const max = niceMax(Math.max(...b.items.map((i) => i.r.value)));
    b.items.forEach((i) => {
      text(gg, x0 - 32, y + bh / 2 + 9, cx('lbl end', i.accent && 'pk'), i.label);
      gg.append(el('rect', { x: x0, y, width: (i.r.value / max) * L, height: bh, rx: 6, class: cx('bar', i.accent && 'pk') }));
      text(gg, x0 + L + 40, y + bh / 2 + 11, cx('val', i.accent && 'pk'), val(i.r, b.unit ?? cfg.unit));
      y += bh + gap;
    });
    gg.append(el('line', { x1: x0, x2: x0, y1: y - b.items.length * (bh + gap) - 4, y2: y - gap + 4, class: 'base' }));
    y += 40;
  });
  if (cfg.note) note(host, cfg);
}

// ── 추세: 선 (끝점 직접 라벨, 강조 선 하나) ──
export function line(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || H0, padR = 260, base = H - 64, top = 40;
  const series = cfg.series.map((sr) => ({ ...sr, pts: sr.points.map((p) => ({ x: p.x, r: ctx.num(p.num) })) }));
  const xs = series[0].pts.map((p) => p.x);
  const vals = series.flatMap((sr) => sr.pts.map((p) => p.r.value));
  const lo = cfg.zero === false ? Math.min(...vals) * 0.9 : 0, hi = niceMax(Math.max(...vals));
  const X = (i) => (xs.length === 1 ? 0 : (i / (xs.length - 1)) * (W - padR));
  const Y = (v) => base - ((v - lo) / (hi - lo)) * (base - top);
  const s = svg(host, W, H, cfg.label || series.map((sr) => sr.label).join(', '));
  [0.5, 1].forEach((f) => s.append(el('line', { x1: 0, x2: W - padR, y1: Y(lo + (hi - lo) * f), y2: Y(lo + (hi - lo) * f), class: 'grid' })));
  s.append(el('line', { x1: 0, x2: W - padR, y1: base, y2: base, class: 'base' }));
  const every = Math.ceil(xs.length / 8);
  xs.forEach((x, i) => { if (i % every === 0 || i === xs.length - 1) text(s, X(i), base + 44, 'lbl mid', String(x)); });
  series.forEach((sr, si) => {
    const gg = g(s, sCls(cfg, `series${si + 1}`, sr));
    const d = sr.pts.map((p, i) => `${i ? 'L' : 'M'}${X(i)},${Y(p.r.value)}`).join(' ');
    gg.append(el('path', { d, class: cx('ln', sr.accent && 'pk', sr.accent && aCls(cfg)) }));
    const last = sr.pts[sr.pts.length - 1], lx = X(sr.pts.length - 1), ly = Y(last.r.value);
    gg.append(el('circle', { cx: lx, cy: ly, r: sr.accent ? 9 : 7, class: cx('dot', sr.accent && 'pk', sr.accent && aCls(cfg)) }));
    text(gg, lx + 24, ly - 4, cx('val', sr.accent && 'pk', sr.accent && aCls(cfg)), val(last.r, cfg.unit));
    text(gg, lx + 24, ly + 30, cx('lbl', sr.accent && 'pk', sr.accent && aCls(cfg)), sr.label);
    if (sr.showFirst) { const f = sr.pts[0]; text(gg, X(0), Y(f.r.value) - 20, 'val', val(f.r, cfg.unit)); }
  });
  if (cfg.note) note(host, cfg);
}

// ── 구성: 100% 가로 막대 (말하는 조각만 강조, 좁은 조각 라벨은 오른쪽 끝에 모아서) ──
export function stack(host, cfg, ctx) {
  const W = cfg.width || W0, multi = cfg.rows.length > 1, x0 = multi ? (cfg.labelWidth || 280) : 0, L = W - x0;
  const bh = multi ? 72 : 120, rowH = bh + 128;
  const rows = cfg.rows.map((rw) => ({ ...rw, items: rw.items.map((i) => ({ ...i, r: ctx.num(i.num) })) }));
  const H = rows.length * rowH;
  const s = svg(host, W, H, cfg.label || rows.map((r) => r.items.map((i) => `${i.label} ${i.r.text}`).join(', ')).join(' / '));
  rows.forEach((rw, ri) => {
    const y = ri * rowH + 16, sum = rw.items.reduce((a, i) => a + i.r.value, 0);
    const share = (i) => (cfg.unit === '%' ? i.r.text + '%' : ctx.fmt((i.r.value / sum) * 100, cfg.shareDecimals ?? 0) + '%');
    if (x0) text(s, x0 - 32, y + bh / 2 + 9, 'lbl end', rw.label || '');
    let x = x0;
    const small = [];
    rw.items.forEach((i) => {
      const w = (i.r.value / sum) * L;
      const gg = g(s, sCls(cfg, 'rows', i));
      gg.append(el('rect', { x: x + 2, y, width: Math.max(w - 4, 1), height: bh, rx: 6, class: cx('bar', i.accent && 'pk', i.accent && aCls(cfg)) }));
      if (w >= 160 || i.accent) {
        text(gg, x + 2, y + bh + 44, cx('val', i.accent && 'pk', i.accent && aCls(cfg)), share(i));
        text(gg, x + 2, y + bh + 82, cx('lbl', i.accent && 'pk', i.accent && aCls(cfg)), i.label);
      } else small.push(i);
      x += w;
    });
    if (small.length) text(s, W, y + bh + 44, 'lbl end', small.map((i) => `${i.label} ${share(i)}`).join(' · '));
  });
  if (cfg.note) note(host, cfg);
}

// ── 규모: 타일 (타일 하나 = 친숙한 단위 하나) + 총량 ──
export function tiles(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || H0, side = 480;
  const r = ctx.num(cfg.num);
  const count = Math.min(3000, Math.round(r.value / (cfg.per || 1)));
  const area = W - side - 48;
  const cols = cfg.cols || Math.ceil(Math.sqrt((count * area) / H));
  const u = Math.min(area / cols, H / Math.ceil(count / cols)), sz = Math.max(u - Math.max(2, u * 0.18), 2);
  const s = svg(host, W, H, cfg.label || `${count}개, 1개 = ${cfg.tileLabel || ''}`);
  const gg = g(s, sCls(cfg, 'tiles'));
  for (let i = 0; i < count; i++) {
    const c = i % cols, rr = Math.floor(i / cols);
    gg.append(el('rect', { x: c * u, y: H - (rr + 1) * u, width: sz, height: sz, rx: Math.min(3, sz / 4), class: cx('bar pk', aCls(cfg)) }));
  }
  const t = g(s, sCls(cfg, 'total'));
  text(t, W - side, H - 220, 'big', ctx.fmt(count, 0));
  text(t, W - side, H - 160, 'val', cfg.countLabel || '개');
  text(t, W - side, H - 100, 'lbl', `1개 = ${cfg.tileLabel || ''}`);
  text(t, W - side, H - 60, 'note', `총 ${val(r, cfg.unit)}`);
  if (cfg.note) note(host, cfg);
}

// ── 시간: 타임라인 (연도면 비례 배치, 아니면 순서 배치) ──
export function timeline(host, cfg) {
  const W = cfg.width || W0, H = cfg.height || 420, y = H / 2;
  const ev = cfg.events;
  const numeric = ev.every((e) => typeof e.when === 'number');
  const lo = numeric ? Math.min(...ev.map((e) => e.when)) : 0, hi = numeric ? Math.max(...ev.map((e) => e.when)) : ev.length - 1;
  const X = (e, i) => 40 + ((numeric ? e.when - lo : i) / Math.max(hi - lo, 1)) * (W - 280);
  const s = svg(host, W, H, cfg.label || ev.map((e) => `${e.when} ${e.label}`).join(', '));
  s.append(el('line', { x1: 0, x2: W - 200, y1: y, y2: y, class: 'base' }));
  ev.forEach((e, i) => {
    const x = X(e, i), up = i % 2 === 0;
    const gg = g(s, sCls(cfg, `e${i + 1}`, e));
    gg.append(el('circle', { cx: x, cy: y, r: e.accent ? 16 : 11, class: cx('dot', e.accent && 'pk', e.accent && aCls(cfg)) }));
    text(gg, x, up ? y - 92 : y + 64, 'note mid', String(e.when));
    text(gg, x, up ? y - 44 : y + 108, cx('val mid', e.accent && 'pk', e.accent && aCls(cfg)), e.label);
  });
  if (cfg.note) note(host, cfg);
}

// ── 과정: 왼쪽 → 오른쪽 흐름 (상자 없이, 지금 단계만 강조) ──
export function flow(host, cfg) {
  const W = cfg.width || W0, H = cfg.height || 320, n = cfg.steps.length, colW = W / n;
  const s = svg(host, W, H, cfg.label || cfg.steps.map((p) => p.label).join(' → '));
  cfg.steps.forEach((p, i) => {
    const x = i * colW, gg = g(s, sCls(cfg, `p${i + 1}`, p));
    text(gg, x, 60, 'note', String(i + 1).padStart(2, '0'));
    text(gg, x, 128, cx('ttl', p.accent && 'pk', p.accent && aCls(cfg)), p.label, { style: 'font-size:44px' });
    if (p.accent) gg.append(el('rect', { x, y: 150, width: Math.min(colW - 96, 240), height: 6, rx: 3, class: cx('uline pk', aCls(cfg)) }));
    (Array.isArray(p.sub) ? p.sub : p.sub ? [p.sub] : []).forEach((line, li) => text(gg, x, 204 + li * 38, 'lbl', line));
    if (i < n - 1) arrow(gg, x + colW - 88, 116, x + colW - 32);
  });
  if (cfg.note) note(host, cfg);
}

// ── 산식: 단어식 → 같은 자리에 숫자 대입 → 결과만 강조 (HTML 격자) ──
export function equation(host, cfg, ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'eq';
  wrap.style.gridTemplateRows = 'auto auto auto';
  cfg.terms.forEach((t, ci) => {
    const col = (cls, str, row) => { const d = document.createElement('div'); d.className = cls; d.textContent = str; d.style.gridRow = row; d.style.gridColumn = String(ci + 1); wrap.append(d); return d; };
    if (t.op) { col('op', t.op, '1'); col(cx('op', sCls(cfg, 'numbers')), t.op, '2'); return; }
    col('w', t.word, '1');
    if (t.num) {
      const r = ctx.num(t.num);
      col(cx('n', t.accent && 'pk', t.accent && aCls(cfg, 'result'), sCls(cfg, 'numbers')), r.text, '2');
      col(cx('u', sCls(cfg, 'numbers')), t.unit ?? r.unit, '3');
    } else col('n', '', '2');
  });
  host.append(wrap);
  if (cfg.note) note(host, cfg);
}

// ── 관계·분포: 산점 ──
export function scatter(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || H0, x0 = 96, base = H - 72;
  const pts = cfg.points.map((p) => ({ ...p, xr: ctx.num(p.x), yr: ctx.num(p.y) }));
  const mx = niceMax(Math.max(...pts.map((p) => p.xr.value))), my = niceMax(Math.max(...pts.map((p) => p.yr.value)));
  const X = (v) => x0 + (v / mx) * (W - x0 - 200), Y = (v) => base - (v / my) * (base - 48);
  const s = svg(host, W, H, cfg.label || `${cfg.xLabel} 대 ${cfg.yLabel}`);
  s.append(el('line', { x1: x0, x2: W - 200, y1: base, y2: base, class: 'base' }));
  s.append(el('line', { x1: x0, x2: x0, y1: 24, y2: base, class: 'base' }));
  text(s, W - 176, base + 9, 'lbl', cfg.xLabel || '');
  text(s, x0, 8, 'lbl', cfg.yLabel || '');
  text(s, x0 - 16, base + 9, 'note end', '0');
  text(s, x0 - 16, Y(my) + 9, 'note end', ctx.fmt(my, 0));
  text(s, X(mx), base + 48, 'note mid', ctx.fmt(mx, 0));
  s.append(el('line', { x1: x0, x2: W - 200, y1: Y(my), y2: Y(my), class: 'grid' }));
  pts.forEach((p) => {
    const gg = g(s, cx(sCls(cfg, p.accent ? 'accent' : 'points', p)));
    gg.append(el('circle', { cx: X(p.xr.value), cy: Y(p.yr.value), r: p.accent ? 14 : 10, class: cx('dot', p.accent && 'pk') }));
    if (p.label) text(gg, X(p.xr.value) + 22, Y(p.yr.value) + 9, cx('lbl', p.accent && 'pk'), p.label);
  });
  if (cfg.note) note(host, cfg);
}

// ── 핵심 숫자 (장당 하나) ──
export function hero(host, cfg, ctx) {
  const r = ctx.num(cfg.num);
  const box = document.createElement('div');
  box.className = cx('hero', sCls(cfg, 'num'));
  box.innerHTML = '<span class="hero-num"></span><span class="hero-unit"></span>';
  box.querySelector('.hero-num').textContent = r.text;
  box.querySelector('.hero-unit').textContent = cfg.unit ?? r.unit;
  if (cfg.countUp) Object.assign(box.querySelector('.hero-num').dataset, { countup: r.value, decimals: cfg.decimals ?? ctx.N[cfg.num]?.decimals ?? 0 });
  host.append(box);
  if (cfg.caption) {
    const p = document.createElement('p');
    p.className = cx('hero-cap', sCls(cfg, 'caption'));
    p.textContent = cfg.caption;
    host.append(p);
  }
}

function note(host, cfg) {
  const p = document.createElement('p');
  p.className = cx('t-3', sCls(cfg, 'note'));
  p.style.cssText = 'font-size:var(--fs-tick);margin-top:var(--s4)';
  p.textContent = cfg.note;
  host.append(p);
}
