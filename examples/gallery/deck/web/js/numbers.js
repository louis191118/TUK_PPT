// KPU_PPT 숫자: 덱의 모든 숫자는 근거 장부(evidence/*.json → index.html에 내장)와 data/derived.js에서만 온다.
// 손대지 않는 런타임 파일. 파생값은 data/derived.js에 쓴다.
import derive from '../data/derived.js';

const raw = JSON.parse(document.getElementById('evidence-data')?.textContent || '{"items":[]}');
export const E = {};
for (const it of raw.items) E[it.id] = it;

export const N = {};
for (const [id, it] of Object.entries(E)) N[id] = { ...it, id, sources: [id] };
let D = {};
try { D = derive(E, N) || {}; } catch (e) { console.error('derived.js 계산 실패', e); }
for (const [id, d] of Object.entries(D)) {
  if (N[id]) console.error('파생값 id가 근거 id와 겹친다:', id);
  const from = d.from || [];
  N[id] = { ...d, id, derived: true, sources: from.flatMap((f) => N[f]?.sources || []) };
  for (const f of from) if (!N[f]) console.error(`파생값 ${id}: from에 없는 id ${f}`);
}

const MINUS = '−';
export function fmt(v, decimals = 0) {
  if (typeof v !== 'number' || !isFinite(v)) return String(v ?? '');
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (v < 0 && Number(s.replace(/,/g, '')) !== 0 ? MINUS : '') + s;
}

// id → 화면 글자. used(Set)에 기록해 그 장 하단 출처를 자동으로 만든다.
export function num(id, used, { unit = false, decimals } = {}) {
  const n = N[id];
  if (!n) { console.error('근거 장부에 없는 id:', id); return { ok: false, value: NaN, text: `⟨${id}?⟩`, unit: '' }; }
  used?.add(id);
  if (n.value == null) return { ok: true, value: NaN, text: n.text ?? '', unit: '' };
  const t = fmt(n.value, decimals ?? n.decimals ?? 0);
  return { ok: true, value: n.value, text: unit && n.unit ? t + n.unit : t, unit: n.unit || '' };
}

// [data-num] 채우기. data-unit이 있으면 단위를 붙이고, data-decimals로 자릿수를 바꾼다.
export function renderNums(section, used) {
  section.querySelectorAll('[data-num]').forEach((elm) => {
    const r = num(elm.dataset.num, used, { unit: elm.hasAttribute('data-unit'), decimals: elm.dataset.decimals != null ? Number(elm.dataset.decimals) : undefined });
    elm.textContent = r.text;
    if (!r.ok) elm.classList.add('num-missing');
  });
}

// 그 장에서 쓴 근거의 출처를 짧게: "기관 연도 · 기관 연도 외 n"
export function sourceLine(used) {
  const seen = new Map();
  let example = false, estimate = false;
  for (const id of used) for (const sid of N[id]?.sources || []) {
    const e = E[sid];
    if (!e) continue;
    if (e.confidence === 'example') example = true;
    if (e.confidence === 'estimate') estimate = true;
    const s = e.source || {};
    const key = [s.publisher || s.title || '', s.date || ''].filter(Boolean).join(' ');
    if (key && !seen.has(key)) seen.set(key, true);
  }
  const list = [...seen.keys()];
  const text = list.length ? '출처 ' + list.slice(0, 3).join(' · ') + (list.length > 3 ? ` 외 ${list.length - 3}` : '') : '';
  return { text, example, estimate };
}
