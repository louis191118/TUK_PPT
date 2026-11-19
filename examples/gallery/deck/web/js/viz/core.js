// SVG 그리기 도구. viewBox = 실제 px라서 SVG 글자 px = 화면 px.
const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, str) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== '') e.setAttribute(k, v);
  if (str != null) e.textContent = str;
  return e;
}
export function svg(host, w, h, label) {
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': label || '' });
  host.append(s);
  return s;
}
export function text(parent, x, y, cls, str, extra = {}) {
  const t = el('text', { x, y, class: cls, ...extra }, str);
  parent.append(t);
  return t;
}
export function g(parent, cls) {
  const x = el('g', { class: cls });
  parent.append(x);
  return x;
}

// 단계 클래스: 항목 s > cfg.steps[part] > 0(처음부터)
export function sCls(cfg, part, item) {
  const n = item?.s ?? cfg.steps?.[part] ?? 0;
  return n ? `s${n}` : '';
}
// 강조가 나타나는 단계: cfg.steps.accent가 있으면 그 전에는 중립색
export function aCls(cfg, part = 'accent') {
  const n = cfg.steps?.[part] ?? 0;
  return n ? `a${n}` : '';
}
export const cx = (...a) => a.filter(Boolean).join(' ');

// 0부터 시작하는 눈금 최대값 (값의 110%를 보기 좋은 수로)
export function niceMax(v) {
  if (!(v > 0)) return 1;
  const t = v * 1.08, p = 10 ** Math.floor(Math.log10(t)), m = t / p;
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => x >= m - 1e-9);
  return nice * p;
}

export function arrow(parent, x1, y, x2, cls = '') {
  const gg = g(parent, cls);
  gg.append(el('line', { x1, y1: y, x2: x2 - 12, y2: y, class: 'arrow' }));
  gg.append(el('path', { d: `M${x2},${y} l-14,-8 v16 z`, class: 'arrow-h' }));
  return gg;
}
