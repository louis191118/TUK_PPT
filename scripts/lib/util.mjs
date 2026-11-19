import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const today = () => new Date().toISOString().slice(0, 10);

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), nx = argv[i + 1];
      if (nx == null || nx.startsWith('--')) out[k] = true; else { out[k] = nx; i++; }
    } else out._.push(a);
  }
  return out;
}

// deck 폴더 찾기: --deck > 현재 폴더에서 위로 올라가며 deck/STATE.md 또는 STATE.md
export function findDeck(opt = {}) {
  if (opt.deck) return path.resolve(opt.deck);
  let d = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(d, 'deck', 'STATE.md'))) return path.join(d, 'deck');
    if (fs.existsSync(path.join(d, 'STATE.md')) && fs.existsSync(path.join(d, 'deck.json'))) return d;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}
export function needDeck(opt) {
  const d = findDeck(opt);
  if (!d) { console.error('deck 폴더를 찾지 못했다. /kpu-ppt init 먼저, 또는 --deck <경로>'); process.exit(2); }
  return d;
}

export const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const exists = (p) => fs.existsSync(p);

// --- 마크다운 frontmatter (평평한 key: value, 배열은 [a, b]) ---
export function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}
export function setFrontmatter(src, patch) {
  const { data, body } = frontmatter(src);
  const all = { ...data, ...patch };
  const fm = Object.entries(all).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`).join('\n');
  return `---\n${fm}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
}
// "## 제목" 단위로 나누기
export function sections(body) {
  const out = {};
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1]; out[cur] = []; continue; }
    if (cur) out[cur].push(line);
  }
  for (const k of Object.keys(out)) out[k] = out[k].join('\n').trim();
  return out;
}

// 근거 장부 전부 (evidence/*.json, _로 시작하는 파일 제외)
export function loadEvidence(deck) {
  const dir = path.join(deck, 'evidence');
  const files = exists(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort() : [];
  const items = [], errors = [];
  for (const f of files) {
    try {
      const j = readJSON(path.join(dir, f));
      for (const it of j.items || []) items.push({ ...it, _file: f });
    } catch (e) { errors.push(`${f}: JSON 오류 ${e.message}`); }
  }
  return { items, errors, files };
}

export async function loadDerived(deck, items) {
  const p = path.join(deck, 'web', 'data', 'derived.js');
  if (!exists(p)) return { values: {}, error: null };
  const E = Object.fromEntries(items.map((i) => [i.id, i]));
  try {
    const mod = await import(`${pathToFileURL(p).href}?t=${Date.now()}`);
    return { values: mod.default(E) || {}, error: null };
  } catch (e) { return { values: {}, error: e.message }; }
}

export function loadSpecs(deck, slugs) {
  return slugs.map((slug) => {
    const p = path.join(deck, 'slides', `${slug}.md`);
    const h = path.join(deck, 'web', 'slides', `${slug}.html`);
    const spec = exists(p) ? frontmatter(fs.readFileSync(p, 'utf8')) : null;
    return { slug, specPath: p, htmlPath: h, spec, secs: spec ? sections(spec.body) : {}, html: exists(h) ? fs.readFileSync(h, 'utf8') : null };
  });
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
