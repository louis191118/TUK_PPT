// figure[data-viz] → 템플릿 실행. 설정은 안쪽 <script type="application/json">.
import * as T0 from './templates.js';
import * as Q from './qual.js';
import { el, svg, text, g } from './core.js';
import { N, num, fmt } from '../numbers.js';

const T = { ...T0, ...Q };
const ASSETS = Object.fromEntries((JSON.parse(document.getElementById('asset-data')?.textContent || '{"items":[]}').items || []).map((a) => [a.id, a]));
const asset = (id) => { const a = ASSETS[id]; if (!a) console.error('에셋 장부에 없거나 고르지 않은 에셋:', id); return a; };

export async function renderViz(section, used) {
  for (const host of section.querySelectorAll('figure[data-viz]')) {
    const name = host.dataset.viz;
    let cfg = {};
    const js = host.querySelector('script[type="application/json"]');
    try { cfg = js ? JSON.parse(js.textContent) : {}; } catch (e) { console.error(`그림 설정 JSON 오류 (${section.dataset.slug})`, e); continue; }
    js?.remove();
    const ctx = { N, fmt, num: (id, o) => num(id, used, o), asset, section };
    try {
      if (name === 'custom') {
        const mod = await import(`../${host.dataset.module}`);
        await mod.default(host, { ...ctx, cfg, el, svg, text, g });
      } else if (T[name]) T[name](host, cfg, ctx);
      else console.error('없는 그림 템플릿:', name);
    } catch (e) {
      console.error(`그림 실패 (${section.dataset.slug} · ${name})`, e);
    }
  }
}
