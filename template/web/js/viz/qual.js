// 숫자가 아닌 근거의 그림 템플릿: 자리(차별점)·대비·인과·구조·순환·조건 비교·간격·실물 화면·판정 규칙·관계.
// 글은 라벨로만. 사실 문장이 근거 장부에서 왔으면 항목에 "ref": "<근거 id>"를 달아 하단 출처에 붙인다.
import { el, svg, text, g, sCls, aCls, cx, arrow } from './core.js';

const W0 = 1632;
const refs = (ctx, ...items) => items.forEach((i) => { if (i?.ref) ctx.num(i.ref); });
const lines = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const div = (cls, str) => { const d = document.createElement('div'); d.className = cls; if (str != null) d.textContent = str; return d; };

// ── 자리: 2축 위의 기존 대안(회색)과 우리(강조 점 하나) — 차별점 ──
export function position(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 620, ax = cfg.axisLeft || 260, ay = H - 84, top = 24;
  const X = (v) => ax + 40 + v * (W - ax - 120), Y = (v) => ay - 110 - v * (ay - top - 150);
  const s = svg(host, W, H, cfg.label || `${cfg.x?.label} × ${cfg.y?.label}`);
  s.append(el('line', { x1: ax, y1: top, x2: ax, y2: ay, class: 'axis' }));
  s.append(el('line', { x1: ax, y1: ay, x2: W, y2: ay, class: 'axis' }));
  text(s, ax - 24, top + 22, 'lbl end', cfg.y?.high || '');
  text(s, ax - 24, ay - 6, 'lbl end', cfg.y?.low || '');
  if (cfg.y?.label) text(s, ax - 24, top + 58, 'note end', cfg.y.label);
  text(s, ax + 16, ay + 44, 'lbl', cfg.x?.low || '');
  text(s, W, ay + 44, 'lbl end', cfg.x?.high || '');
  if (cfg.x?.label) text(s, (ax + W) / 2, ay + 44, 'note mid', cfg.x.label);
  for (const it of cfg.items) {
    refs(ctx, it);
    const x = X(it.x), y = Y(it.y), left = it.x > 0.7;
    const gg = g(s, cx(sCls(cfg, it.accent ? 'accent' : 'items', it)));
    gg.append(el('circle', { cx: x, cy: y, r: it.accent ? 22 : 14, class: cx('dot', it.accent && 'pk') }));
    const tx = left ? x - 36 : x + 36, anc = left ? 'end' : '';
    text(gg, tx, y + 10, cx(it.accent ? 'ttl pk' : 'val', anc), it.label, it.accent ? { style: 'font-size:40px' } : {});
    lines(it.sub).forEach((l, i) => text(gg, tx, y + 50 + i * 34, cx('note', anc), l));
  }
}

// ── 대비: 같은 행에 지금(A) → 바뀐 뒤(B) ──
export function contrast(host, cfg, ctx) {
  const box = div('cmp');
  box.append(div('cmp-h'), div('cmp-h cmp-a', cfg.a?.title || ''), div('cmp-h'), div(cx('cmp-h cmp-b', sCls(cfg, 'b')), cfg.b?.title || ''));
  for (const r of cfg.rows) {
    refs(ctx, r);
    box.append(div('cmp-l', r.label || ''), div('cmp-a', r.a ?? ''), div(cx('cmp-arrow', sCls(cfg, 'b', r)), '→'),
      div(cx('cmp-b', r.accent && 't-pk', r.accent && aCls(cfg), sCls(cfg, 'b', r)), r.b ?? ''));
  }
  host.append(box);
}

// ── 인과: 원인 → 결과 사슬 (화살표 위에 "왜" 한 마디) ──
export function chain(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 340, n = cfg.nodes.length, colW = W / n;
  const s = svg(host, W, H, cfg.label || cfg.nodes.map((p) => p.label).join(' → '));
  cfg.nodes.forEach((p, i) => {
    refs(ctx, p);
    const x = i * colW, gg = g(s, sCls(cfg, `p${i + 1}`, p));
    text(gg, x, 140, cx('ttl', p.accent && 'pk', p.accent && aCls(cfg)), p.label, { style: 'font-size:40px' });
    lines(p.sub).forEach((l, li) => text(gg, x, 196 + li * 38, 'lbl', l));
    if (i < n - 1) {
      arrow(gg, x + colW - 112, 126, x + colW - 32);
      if (cfg.via?.[i]) text(gg, x + colW - 72, 92, 'note mid', cfg.via[i]);
    }
  });
}

// ── 구조: 왼쪽 뿌리 → 가지 → 잎 (구성 요소·분류) ──
export function tree(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 620;
  const kids = cfg.children || [];
  const rows = kids.reduce((a, k) => a + Math.max(1, (k.children || []).length), 0);
  const rowH = Math.min(96, H / Math.max(rows, 1)), colX = [0, W * 0.3, W * 0.62];
  const s = svg(host, W, Math.max(rowH * rows, 200), cfg.label || cfg.root?.label);
  refs(ctx, cfg.root);
  let r = 0;
  const pos = kids.map((k) => { const n = Math.max(1, (k.children || []).length), y = (r + n / 2) * rowH; const ys = (k.children || []).map((_, j) => (r + j + 0.5) * rowH); r += n; return { y, ys }; });
  const rootY = pos.length ? (pos[0].y + pos[pos.length - 1].y) / 2 : 100;
  text(s, colX[0], rootY + 12, 'ttl', cfg.root?.label || '', { style: 'font-size:40px' });
  lines(cfg.root?.sub).forEach((l, i) => text(s, colX[0], rootY + 52 + i * 34, 'note', l));
  const spine1 = colX[1] - 56;
  if (pos.length) s.append(el('path', { d: `M${spine1 - 40},${rootY} H${spine1} M${spine1},${pos[0].y} V${pos[pos.length - 1].y}`, class: 'arrow' }));
  kids.forEach((k, i) => {
    refs(ctx, k);
    const { y, ys } = pos[i], gg = g(s, sCls(cfg, `c${i + 1}`, k));
    gg.append(el('path', { d: `M${spine1},${y} H${colX[1] - 16}`, class: 'arrow' }));
    text(gg, colX[1], y + 10, cx('val', k.accent && 'pk', k.accent && aCls(cfg)), k.label);
    lines(k.sub).forEach((l, li) => text(gg, colX[1], y + 44 + li * 32, 'note', l));
    if (ys.length) {
      const sp = colX[2] - 56;
      gg.append(el('path', { d: `M${sp - 40},${y} H${sp} M${sp},${ys[0]} V${ys[ys.length - 1]}`, class: 'arrow' }));
      k.children.forEach((c, j) => {
        refs(ctx, c);
        gg.append(el('path', { d: `M${sp},${ys[j]} H${colX[2] - 16}`, class: 'arrow' }));
        text(gg, colX[2], ys[j] + 9, cx('lbl', c.accent && 'pk'), c.label);
      });
    }
  });
}

// ── 순환: 단계가 돌아오는 고리 ──
export function cycle(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 640, n = cfg.nodes.length, R = Math.min(230, H / 2 - 70), cx0 = W / 2, cy0 = H / 2;
  const s = svg(host, W, H, cfg.label || cfg.nodes.map((p) => p.label).join(' → '));
  s.append(el('circle', { cx: cx0, cy: cy0, r: R, class: 'cyc' }));
  const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  for (let i = 0; i < n; i++) { // 마디 사이 가운데에 시계 방향 화살촉
    const m = ang(i + 0.5), x = cx0 + R * Math.cos(m), y = cy0 + R * Math.sin(m);
    s.append(el('path', { d: 'M8,0 L-8,-8 L-8,8 Z', class: 'arrow-h', transform: `translate(${x},${y}) rotate(${(m * 180) / Math.PI + 90})` }));
  }
  if (cfg.center) text(s, cx0, cy0 + 12, 'ttl mid', cfg.center);
  cfg.nodes.forEach((p, i) => {
    refs(ctx, p);
    const a = ang(i), x = cx0 + R * Math.cos(a), y = cy0 + R * Math.sin(a), right = Math.cos(a) > 0.2, left = Math.cos(a) < -0.2;
    const gg = g(s, sCls(cfg, `p${i + 1}`, p));
    gg.append(el('circle', { cx: x, cy: y, r: p.accent ? 20 : 14, class: cx('dot', p.accent && 'pk', p.accent && aCls(cfg)) }));
    const tx = right ? x + 36 : left ? x - 36 : x, anc = right ? '' : left ? 'end' : 'mid';
    const ty = !right && !left ? (Math.sin(a) < 0 ? y - 64 : y + 56) : y + 10;
    text(gg, tx, ty, cx('val', anc, p.accent && 'pk', p.accent && aCls(cfg)), p.label);
    lines(p.sub).forEach((l, li) => text(gg, tx, ty + 36 + li * 32, cx('note', anc), l));
  });
}

// ── 조건 비교: 행(대안) × 열(조건), 칸은 점(●)·고리(○)·대시(–) — 표 대신 ──
export function matrix(host, cfg, ctx) {
  const W = cfg.width || W0, x0 = cfg.labelWidth || 380, cols = cfg.cols.length, colW = Math.min(240, (W - x0) / cols), rowH = 76, top = 72;
  const H = top + cfg.rows.length * rowH + 8;
  const s = svg(host, W, H, cfg.label || cfg.rows.map((r) => r.label).join(', '));
  cfg.cols.forEach((c, j) => text(s, x0 + colW * j + colW / 2, 32, 'lbl mid', c));
  cfg.rows.forEach((r, i) => {
    refs(ctx, r);
    const y = top + i * rowH + rowH / 2, gg = g(s, sCls(cfg, r.accent ? 'accent' : 'rows', r));
    text(gg, x0 - 40, y + 10, cx(r.accent ? 'ttl pk' : 'val', 'end', r.accent && aCls(cfg)), r.label);
    r.cells.forEach((v, j) => {
      const x = x0 + colW * j + colW / 2;
      if (v === true) gg.append(el('circle', { cx: x, cy: y, r: 13, class: cx('dot', r.accent ? 'pk' : 'on', r.accent && aCls(cfg)) }));
      else if (v === 'part') gg.append(el('circle', { cx: x, cy: y, r: 12, class: cx('ring', r.accent && 'pk') }));
      else if (v === false || v == null) gg.append(el('line', { x1: x - 12, x2: x + 12, y1: y, y2: y, class: 'none-ln' }));
      else text(gg, x, y + 9, cx('lbl mid', r.accent && 'pk'), String(v));
    });
  });
  const leg = cfg.legend ?? '● 있음 · ○ 일부 · – 없음';
  if (leg) { const p = div('t-3', leg); p.style.cssText = 'font-size:var(--fs-note);margin-top:var(--s3)'; host.append(p); }
}

// ── 간격: 지금(채운 점) → 목표·검증(빈 원), 날짜 없이 ──
export function gaps(host, cfg, ctx) {
  const W = cfg.width || W0, x1 = cfg.nowX || 640, x2 = cfg.goalX || 1200, rowH = 128, top = 56;
  const H = top + cfg.rows.length * rowH;
  const s = svg(host, W, H, cfg.label || cfg.rows.map((r) => r.label).join(', '));
  text(s, x1, 24, 'note', cfg.nowTitle || '지금');
  text(s, x2, 24, 'note', cfg.goalTitle || '검증·목표');
  cfg.rows.forEach((r, i) => {
    refs(ctx, r);
    const y = top + i * rowH + 36, gg = g(s, sCls(cfg, `r${i + 1}`, r));
    text(gg, 0, y + 11, cx(r.accent ? 'ttl pk' : 'val', r.accent && aCls(cfg)), r.label);
    gg.append(el('line', { x1: x1 + 24, x2: x2 - 24, y1: y, y2: y, class: 'dash-ln' }));
    gg.append(el('circle', { cx: x1, cy: y, r: 13, class: cx('dot pk', aCls(cfg)) }));
    gg.append(el('circle', { cx: x2, cy: y, r: 13, class: 'ring' }));
    lines(r.now).forEach((l, li) => text(gg, x1 - 13, y + 48 + li * 32, 'lbl', l));
    lines(r.goal).forEach((l, li) => text(gg, x2 - 13, y + 48 + li * 32, 'lbl', l));
  });
}

// ── 실물 화면: 캡처 + 리더선 라벨 (실제 = 실선, 모의 = 점선 + 흑백) ──
export function screen(host, cfg, ctx) {
  const W = cfg.width || W0, a = ctx.asset(cfg.asset);
  const iw = cfg.w || 390, ih = cfg.h || 844, dh = cfg.height || 640, sc = dh / ih, dw = iw * sc;
  const ix = cfg.align === 'left' ? 0 : cfg.align === 'right' ? W - dw : (W - dw) / 2;
  host.style.position = 'absolute';
  const wrap = div(cx('screen', cfg.mock && 'mock'));
  wrap.style.cssText = `position:absolute;left:${ix}px;top:0;width:${dw}px;height:${dh}px`;
  const img = document.createElement('img');
  img.src = a?.file ? a.file.replace(/^web\//, '') : '';
  img.alt = cfg.alt || cfg.asset;
  img.dataset.asset = cfg.asset;
  wrap.append(img);
  host.append(wrap);
  const s = svg(host, W, dh, cfg.label || (cfg.callouts || []).map((c) => c.label).join(', '));
  s.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
  for (const c of cfg.callouts || []) {
    refs(ctx, c);
    const px = ix + c.x * sc, py = c.y * sc, right = (c.side || (c.x > iw / 2 ? 'right' : 'left')) === 'right';
    const ex = right ? ix + dw + 64 : ix - 64, gg = g(s, sCls(cfg, 'callouts', c));
    gg.append(el('circle', { cx: px, cy: py, r: 6, class: cx('dot', c.accent ? 'pk' : 'ink') }));
    gg.append(el('line', { x1: px, y1: py, x2: ex, y2: py, class: cx('leader', cfg.mock && 'dashed', c.accent && 'pk') }));
    text(gg, right ? ex + 16 : ex - 16, py + 10, cx(c.accent ? 'val pk' : 'val', !right && 'end'), c.label);
    lines(c.sub).forEach((l, li) => text(gg, right ? ex + 16 : ex - 16, py + 46 + li * 32, cx('note', !right && 'end'), l));
  }
  if (cfg.mock) text(s, ix + dw / 2, dh + 40, 'note mid', cfg.mockLabel || '모의 화면');
}

// ── 판정 규칙: 규칙을 위에 한 줄로, 같은 후보들에 한 단계씩 적용 (지금 규칙만 진하게) ──
export function filter(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 460, n = cfg.items.length, colW = W / n, k = cfg.rules.length;
  const s = svg(host, W, H, cfg.label || cfg.rules.map((r) => r.label || r).join(' → '));
  const ruleW = W / k, marks = ['①', '②', '③'];
  cfg.rules.forEach((r, i) => {
    text(s, i * ruleW, 40, `ttl hx h${i + 1}`, `${marks[i]} ${r.label || r}`);
    if (i < k - 1) arrow(s, i * ruleW + ruleW - 96, 30, i * ruleW + ruleW - 40);
  });
  const y = 230;
  cfg.items.forEach((it, i) => {
    refs(ctx, it);
    const x = colW * i + colW / 2, keep = !it.out;
    const gg = g(s, it.out ? `d${it.out}` : '');
    gg.append(el('circle', { cx: x, cy: y, r: 18, class: cx('dot', keep && `pk a${k}`) }));
    text(gg, x, y + 64, cx('val mid', keep && `pk a${k}`), it.label);
    lines(it.sub).forEach((l, li) => text(gg, x, y + 100 + li * 32, 'note mid', l));
    if (it.out) text(s, x, y - 44, `note mid s${it.out}`, `${marks[it.out - 1]} 제외${it.why ? ` · ${it.why}` : ''}`);
  });
  if (cfg.result) text(s, 0, H - 16, `val pk s${k}`, cfg.result);
}

// ── 관계: 누가 누구에게 무엇을 (이해관계자·가치 흐름). 자리는 격자(col, row)로 정한다 ──
export function relations(host, cfg, ctx) {
  const W = cfg.width || W0, H = cfg.height || 620, cols = cfg.cols || 3, rows = cfg.rows || 2;
  const P = Object.fromEntries(cfg.nodes.map((nd) => [nd.id, { x: (W / cols) * (nd.col + 0.5), y: (H / rows) * (nd.row + 0.5) - 30, nd }]));
  const s = svg(host, W, H, cfg.label || cfg.nodes.map((nd) => nd.label).join(', '));
  for (const l of cfg.links) {
    refs(ctx, l);
    const a = P[l.from], b = P[l.to];
    if (!a || !b) { console.error('관계 그림: 없는 노드', l.from, l.to); continue; }
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, pad = 44;
    const both = cfg.links.some((o) => o.from === l.to && o.to === l.from), sh = both ? 16 : 0; // 양방향이면 두 선을 나란히
    const ox = -uy * sh, oy = ux * sh;
    const x1 = a.x + ux * pad + ox, y1 = a.y + uy * pad + oy, x2 = b.x - ux * pad + ox, y2 = b.y - uy * pad + oy;
    const gg = g(s, sCls(cfg, 'links', l));
    gg.append(el('line', { x1, y1, x2: x2 - ux * 10, y2: y2 - uy * 10, class: cx('arrow', l.accent && 'pk', l.accent && aCls(cfg)) }));
    gg.append(el('path', { d: 'M8,0 L-10,-9 L-10,9 Z', class: cx('arrow-h', l.accent && 'pk', l.accent && aCls(cfg)), transform: `translate(${x2},${y2}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})` }));
    const off = l.offset ?? (both ? 40 : -18), nx = -uy * off, ny = ux * off;
    text(gg, (x1 + x2) / 2 + nx, (y1 + y2) / 2 + ny, 'lbl mid', l.label || '');
  }
  for (const { x, y, nd } of Object.values(P)) {
    refs(ctx, nd);
    const gg = g(s, sCls(cfg, nd.accent ? 'accent' : 'nodes', nd));
    gg.append(el('circle', { cx: x, cy: y, r: nd.accent ? 24 : 18, class: cx('dot', nd.accent ? 'pk' : 'ink', nd.accent && aCls(cfg)) }));
    text(gg, x, y + 64, cx(nd.accent ? 'ttl pk' : 'val', 'mid', nd.accent && aCls(cfg)), nd.label);
    lines(nd.sub).forEach((l2, li) => text(gg, x, y + 100 + li * 32, 'note mid', l2));
  }
}
