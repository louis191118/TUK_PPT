// KPU_PPT 3D 무대 — custom 그림 모듈이 three.js 장면을 발표 장에 넣을 때 쓰는 공용 도구.
// 규칙과 판단은 `references/3d.md`(SKILL.md, references/runtime.md). 이 파일은 런타임이라 `deck.mjs upgrade` 때 덮어써진다.
//
// 쓰는 법 (web/js/custom/<slug>.js):
//   import { THREE, createStage, watchSlide, loadGLB, want3d, ease } from '../viz/stage3d.js';
//   export default async function draw(host, ctx) {
//     const st = createStage(host, ctx, { width: 1100, height: 670, look: 'diagram', alt: '그림이 말하는 것' });
//     ...장면 만들기...
//     watchSlide(ctx.section, { enter: (n) => place(n), step: (n, prev) => animate(n, prev), leave: () => st.stop() });
//   }
//
// 지키는 것 (발표 덱 기준):
// - 장이 present일 때만 그린다. 움직일 때만 프레임을 돈다(frame 콜백이 true를 돌려주는 동안, 또는 continuous).
// - 장에 들어올 때는 애니메이션 없이 그 단계 모습으로 바로 놓는다(main.js가 data-step을 맞출 때까지 두 프레임 기다림).
// - 해상도 = 화면에 보이는 크기 × 기기 배율(상한 1.5), 느리면 스스로 낮춘다(adaptive).
// - ?no3d · WebGL 없음 · 컨텍스트 손실 → onLost(이유)로 대체 그림(같은 카메라 PNG 또는 2D SVG)으로 바꾼다.
// - 글자는 렌더에 굽지 않는다: 라벨은 overlay(SVG, 지도 칸 px)에 theme.css 토큰 색으로.
import * as THREE from '../../vendor/three/three.module.min.js';

export { THREE };

// ── 시간·보간 ──
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a, b, t) => a + (b - a) * t;
// 프레임 길이와 무관한 지수 감쇠: x += (want - x) * damp(k, dt). k가 클수록 빨리 따라간다(3 ≈ 1초에 95%)
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),       // 카메라·지우기
  out: (t) => 1 - Math.pow(1 - t, 3),                                              // 나타나기
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),                             // 분해·조립
  // 차 주행처럼: 부드럽게 출발 → 일정 속도 → 부드럽게 정지 (경로 그리기)
  drive(t, A = 0.22) {
    if (t <= 0) return 0; if (t >= 1) return 1;
    const v = 1 / (1 - A), ramp = (u) => v * A * (u - Math.sin(Math.PI * u) / Math.PI) / 2;
    if (t < A) return ramp(t / A);
    if (t > 1 - A) return 1 - ramp((1 - t) / A);
    return ramp(1) + v * (t - A);
  },
};
export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
export function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}

// ── 3D를 쓸 수 있나 ──
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
// false면 대체 그림으로: ?no3d (검수 `deck.mjs capture --no3d`), WebGL 없음, cfg.fallback === 'png'
export const want3d = (cfg = {}) => cfg.fallback !== 'png' && !/[?&]no3d\b/.test(location.search) && webglAvailable();

// ── 불러오기 ──
// meshopt 압축(EXT_meshopt_compression, gltfpack으로 줄인 것) GLB도 읽게 디코더를 늘 붙인다
export async function loadGLB(url, { onProgress } = {}) {
  const { GLTFLoader } = await import('../../vendor/three/addons/GLTFLoader.js');
  const { MeshoptDecoder } = await import('../../vendor/three/addons/libs/meshopt_decoder.module.js');
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((res, rej) => loader.load(url, res, (e) => e.total && onProgress?.(e.loaded / e.total), rej));
}
export const loadJSON = async (url) => (await fetch(url)).json();

// ── 경로 중심선: 길이 비율(0..1) ↔ 위치 ──
export class Polyline {
  constructor(pts) {
    this.p = pts.map((a) => (a.isVector3 ? a.clone() : new THREE.Vector3(...a)));
    this.cum = [0];
    for (let i = 1; i < this.p.length; i++) this.cum.push(this.cum[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.len = this.cum[this.cum.length - 1];
  }
  at(f, out = new THREE.Vector3()) {
    const d = clamp01(f) * this.len;
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] < d) lo = m; else hi = m; }
    const seg = this.cum[hi] - this.cum[lo] || 1;
    return out.lerpVectors(this.p[lo], this.p[hi], (d - this.cum[lo]) / seg);
  }
  // 수평면(x, z)에서 가장 가까운 점의 길이 비율
  fractionOf(x, z) {
    let best = Infinity, bi = 0;
    for (let i = 0; i < this.p.length; i++) {
      const dx = this.p[i].x - x, dz = this.p[i].z - z, d = dx * dx + dz * dz;
      if (d < best) { best = d; bi = i; }
    }
    return this.cum[bi] / this.len;
  }
}

// 그린 길이 비율이 근거 비율과 같은지(도식이라도 비율은 정직하게). 어긋나면 console.error → 검수 ERROR
export function checkRatio(what, drawn, evidence, tol = 0.03) {
  const ok = isFinite(evidence) && Math.abs(drawn / evidence - 1) <= tol;
  if (!ok) console.error(`${what}: 그린 비율 ${drawn.toFixed(3)} ≠ 근거 비율 ${Number(evidence).toFixed(3)} — 장면 스크립트(deck.mjs build3d)로 에셋을 다시 만든다`);
  return ok;
}

// ── 셰이더 조각 (onBeforeCompile) ──
// 진행 비율 속성 aT(0..1)를 단다. 경로 튜브처럼 길이를 따라 그릴 메시에.
export function tagProgress(geo, line) {
  const pos = geo.attributes.position, a = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) a[i] = line.fractionOf(pos.getX(i), pos.getZ(i));
  geo.setAttribute('aT', new THREE.BufferAttribute(a, 1));
  return geo;
}
// uProg보다 뒤, uStart보다 앞 조각을 버린다 → 그려지기·흘러 빠지기. flow를 주면 길 위로 색 띠가 출발→도착으로 흐른다(표지 반복).
// flow = { len(장면 길이), lam(띠 간격), sec(주기), hi(띠 색), amt(0..1), shape:[꼬리, 머리, 끝], base:[출발, 도착 밝기 배율] }
export function progressMaterial(mat, flow = null, clock = null) {
  const u = {
    uProg: { value: 2 }, uStart: { value: -1 },
    uFlowT: clock || { value: 0 }, uFlowLen: { value: flow?.len || 1 }, uFlowLam: { value: flow?.lam || 11 }, uFlowSec: { value: flow?.sec || 4.2 },
    uFlowAmt: { value: flow ? (flow.amt ?? 1) : 0 }, uFlowHi: { value: new THREE.Color(flow?.hi || '#ffffff') },
    uFlowShape: { value: new THREE.Vector3(...(flow?.shape || [0, 0.74, 0.96])) }, uFlowBase: { value: new THREE.Vector2(...(flow?.base || [0.94, 1.04])) },
  };
  mat.userData.u = u;
  chain(mat, 'prog', (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aT;\nvarying float vT;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvT = aT;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vT;\nuniform float uProg, uStart, uFlowT, uFlowLen, uFlowLam, uFlowSec, uFlowAmt;\nuniform vec3 uFlowHi, uFlowShape;\nuniform vec2 uFlowBase;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vT > uProg || vT < uStart) discard;
if (uFlowAmt > 0.0) {
  diffuseColor.rgb *= mix(uFlowBase.x, uFlowBase.y, vT);
  float ph = fract(vT * uFlowLen / uFlowLam - uFlowT / uFlowSec);
  float g = smoothstep(uFlowShape.x, uFlowShape.y, ph) * (1.0 - smoothstep(uFlowShape.y, uFlowShape.z, ph));
  diffuseColor.rgb = mix(diffuseColor.rgb, uFlowHi, g * uFlowAmt);
}`);
  });
  return u;
}
// 바닥·건물이 칸 가장자리로 가며 슬라이드 바탕색으로 사라진다(틀 없음). 화면 공간 초타원 거리 inner→outer(0..1).
export function edgeFade(mat, stage, { inner = 0.62, outer = 0.98 } = {}) {
  const u = stage.fadeU;
  u.uFE.value.set(inner, outer);
  chain(mat, 'fade', (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uRes, uFE;\nuniform vec3 uBg;')
      .replace('#include <opaque_fragment>', `vec2 fq = abs(gl_FragCoord.xy / uRes * 2.0 - 1.0);
float fb = pow(pow(fq.x, 4.0) + pow(fq.y, 4.0), 0.25);
float fk = smoothstep(uFE.x, uFE.y, fb);
outgoingLight = mix(outgoingLight, uBg, fk * fk * (3.0 - 2.0 * fk));
#include <opaque_fragment>`);
  });
}
// 여러 조각을 한 재질에 겹쳐 걸 수 있게 onBeforeCompile을 잇는다
function chain(mat, key, fn) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.() || '';
  mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); fn(sh); };
  const k = `${prevKey}|${key}`;
  mat.customProgramCacheKey = () => k;
  mat.needsUpdate = true;
}

// ── 스튜디오 환경맵 (제품·실물 장면): HDRI 대신 밝은 판을 둘러 PMREM으로 굽는다 ──
export function studioEnv(renderer, { bg = '#2B2F33' } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (w, h, pos, look, k) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(k), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1); m.position.set(...pos); m.lookAt(...look); s.add(m);
  };
  add(9, 3.2, [0, 7, 0], [0, 0, 0], 3.0);        // 위 큰 소프트박스
  add(12, 0.35, [0, 2.2, -7], [0, 1.2, 0], 2.4); // 양옆 긴 띠 (차체 같은 곡면에 선 하이라이트)
  add(12, 0.35, [0, 2.2, 7], [0, 1.2, 0], 2.4);
  add(3.5, 4, [8, 2.2, 0], [0, 1, 0], 1.3);
  add(3.5, 4, [-8, 2.2, 0], [0, 1, 0], 0.9);
  add(20, 20, [0, -3, 0], [0, 0, 0], 0.05);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}
// 접지 그림자: 그림자 맵 대신 부드러운 타원 판 (프레임 비용 거의 0)
export function blobShadow(w, d, opacity = 0.18, soft = 0.6) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(soft * 0.6, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false, toneMapped: false, color: '#000' }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = -1;
  return m;
}

// ── 무대 ──
let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
.s3d { position: absolute; overflow: visible; }
.s3d > canvas, .s3d > img.s3d-png { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.s3d > img.s3d-png { object-fit: contain; }
.s3d > svg.s3d-ov { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.s3d .s3d-lb { opacity: 0; transition: opacity 420ms var(--ease-out, ease-out); }
.s3d .s3d-lb.on { opacity: 1; }
.s3d .s3d-t { font-family: var(--f); letter-spacing: -0.01em; paint-order: stroke; stroke: var(--c-halo, #fff); stroke-width: 8px; stroke-linejoin: round; dominant-baseline: central; fill: var(--c-text-2); font-weight: 600; }
.s3d .s3d-t.pin { fill: var(--c-text); font-weight: 700; }
.s3d .s3d-t.pk { fill: var(--c-accent-text); font-weight: 700; }
.s3d .s3d-dot { fill: var(--c-text); stroke: var(--c-halo, #fff); stroke-width: 1.5; }
.s3d .s3d-ld { stroke: var(--c-text); stroke-width: 1.5; fill: none; }
.s3d .s3d-note { position: absolute; left: 0; bottom: 0; margin: 0; font-size: var(--fs-note, 24px); line-height: 1.35; color: var(--c-text-3); white-space: nowrap; }
`;
  document.head.append(st);
}
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// look: 'diagram' = 구운 정점 색 그대로(unlit, NoToneMapping, 투명 바탕 → 흰 장 위에 떠 있음)
//       'product' = 실물 재질(PBR, Neutral 톤매핑, 스튜디오 환경맵, 바탕 = --c-bg)
export function createStage(host, ctx, opt = {}) {
  injectStyle();
  const o = { width: 1100, height: 670, left: 0, top: 0, look: 'diagram', fov: 30, maxRatio: 1.5, minQuality: 0.55, note: '', alt: '', ...opt };
  const W = o.width, H = o.height;
  const section = ctx.section || host.closest('section');
  const wrap = document.createElement('div');
  wrap.className = 's3d';
  Object.assign(wrap.style, { left: `${o.left}px`, top: `${o.top}px`, width: `${W}px`, height: `${H}px` });
  if (o.alt) { wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', o.alt); } else wrap.setAttribute('aria-hidden', 'true');
  host.append(wrap);
  const overlay = sv('svg', { class: 's3d-ov', width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  wrap.append(overlay);
  if (o.note) { const p = document.createElement('p'); p.className = 's3d-note'; p.textContent = o.note; wrap.append(p); }

  const tok = (name, dflt = '#888888') => {
    const v = getComputedStyle(host).getPropertyValue(name).trim();
    try { return new THREE.Color(v || dflt); } catch (e) { return new THREE.Color(dflt); }
  };
  const slug = section?.dataset.slug || 'scene';
  const perf = ((window.__deck3d ||= {})[slug] = { frames: 0, medianMs: 0, quality: 1, mode: 'loading' });

  const st = {
    THREE, W, H, wrap, overlay, section, tok, perf, opt: o,
    mode: 'loading', active: false, continuous: false, quality: 1,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(o.fov, W / H, 0.1, 500),
    renderer: null, canvas: null, labels: {}, frameFns: new Set(), raf: null,
    fadeU: { uRes: { value: new THREE.Vector2(W, H) }, uFE: { value: new THREE.Vector2(9, 10) }, uBg: { value: tok('--c-bg', '#ffffff') } },
  };

  // 렌더러는 3D를 쓸 때만 만든다(대체 그림 경로에서는 만들지 않음)
  st.start3d = () => {
    const canvas = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: o.look === 'diagram', powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    if (o.look === 'diagram') { r.toneMapping = THREE.NoToneMapping; r.setClearColor(st.fadeU.uBg.value, 0); }
    else {
      r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1;
      r.setClearColor(st.fadeU.uBg.value, 1);
      st.scene.environment = studioEnv(r);
    }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); st.lost('context-lost'); });
    wrap.prepend(canvas);
    st.canvas = canvas; st.renderer = r; st.mode = perf.mode = '3d';
    st.resize();
    return r;
  };
  st.resize = () => {
    if (!st.renderer) return;
    const scale = window.Reveal?.getScale?.() || 1;
    const pr = Math.min(o.maxRatio, Math.max(o.minQuality, (window.devicePixelRatio || 1) * scale * st.quality));
    st.renderer.setPixelRatio(pr);
    st.renderer.setSize(W, H, false);
    st.renderer.getDrawingBufferSize(st.fadeU.uRes.value);
    st.render();
  };
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(st.resize, 120); });

  // 월드 점 → 칸 px
  const v = new THREE.Vector3();
  st.project = (p) => { v.copy(p).project(st.camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  st.render = () => { if (st.mode === '3d' && st.renderer) st.renderer.render(st.scene, st.camera); };

  // 프레임: 콜백(dt초, 지금ms)이 true를 돌려주는 동안 또는 continuous면 계속, 아니면 멈춘다
  const dts = [];
  let tPrev = 0;
  const tick = (now) => {
    st.raf = null;
    if (!st.active || st.mode !== '3d') return;
    const dt = tPrev ? Math.min(0.05, (now - tPrev) / 1000) : 1 / 60;
    tPrev = now;
    let live = st.continuous;
    for (const fn of st.frameFns) if (fn(dt, now)) live = true;
    st.render();
    perf.frames++;
    dts.push(dt);
    if (dts.length >= 90) {   // 느리면 해상도 15%씩 낮춤(중앙값 > 22ms ≈ 45fps 미만)
      const med = dts.sort((a, b) => a - b)[45];
      dts.length = 0;
      perf.medianMs = Math.round(med * 1000);
      if (med > 0.022 && st.quality > o.minQuality) { st.quality *= 0.85; perf.quality = st.quality; st.resize(); }
    }
    if (live) st.raf = requestAnimationFrame(tick); else tPrev = 0;
  };
  st.frame = (fn) => { st.frameFns.add(fn); return () => st.frameFns.delete(fn); };
  st.kick = () => { if (!st.raf && st.active && st.mode === '3d') st.raf = requestAnimationFrame(tick); else if (!st.active) st.render(); };
  st.stop = () => { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; tPrev = 0; };

  // 3D 실패 → 대체 그림. onLost는 모듈이 정한다(같은 카메라 PNG + 같은 라벨, 또는 2D SVG)
  // why = 'no3d'(의도: ?no3d·WebGL 없음·cfg.fallback) | 'context-lost' | 오류 글. 의도가 아닌 실패는 console.error → 검수 ERROR
  st.lost = (why) => {
    if (st.mode === 'fallback') return;
    if (why === 'no3d' || why === 'context-lost') console.warn(`3D(${slug}) → 대체 그림:`, why);
    else console.error(`3D(${slug}) 실패 → 대체 그림:`, why);
    st.stop();
    st.canvas?.remove();
    try { st.renderer?.dispose(); } catch (e) { /* 무시 */ }
    st.renderer = null;
    st.mode = perf.mode = 'fallback';
    o.onLost?.(why);
  };
  st.image = (src) => {
    let img = wrap.querySelector('img.s3d-png');
    if (!img) { img = document.createElement('img'); img.className = 's3d-png'; img.alt = ''; img.decoding = 'async'; wrap.prepend(img); }
    if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
    return img;
  };

  // 셰이더 예열: 모든 상태를 한 번에 켠 채 숨긴 캔버스에 두 번 그린다(첫 단계 전환 때 멈칫 방지)
  st.prewarm = async (showAll, restore) => {
    if (st.mode !== '3d') return;
    try {
      st.renderer.compile(st.scene, st.camera);
      if (showAll) {
        st.canvas.style.visibility = 'hidden';
        showAll();
        for (let i = 0; i < 2; i++) { st.renderer.render(st.scene, st.camera); await new Promise((r) => requestAnimationFrame(r)); }
        restore?.();
        st.canvas.style.visibility = '';
      }
    } catch (e) { console.warn('셰이더 예열 실패', e); }
  };

  // ── 라벨 (SVG, 칸 px). parts = [[글, 클래스?], ...], cls = 'pin' | 'pk' | '' ──
  st.label = (key, { parts, cls = '', leader = false, fontSize = 32 }) => {
    const g = sv('g', { class: `s3d-lb s3d-lb-${key}` });
    const ld = leader ? sv('line', { class: 's3d-ld' }) : null;
    const dot = leader ? sv('circle', { class: 's3d-dot', r: 3 }) : null;
    const t = sv('text', { class: `s3d-t ${cls}`, 'font-size': fontSize });
    parts.forEach(([txt, pc], i) => { const sp = sv('tspan', pc ? { class: pc } : {}); sp.textContent = (i ? ' ' : '') + txt; t.append(sp); });
    if (ld) g.append(ld);
    if (dot) g.append(dot);
    g.append(t);
    overlay.append(g);
    return (st.labels[key] = { g, ld, dot, t, fontSize });
  };
  // A = 기준점 px, side = 글자가 리더선 끝의 어느 쪽(left·right·above·below), dx·dy = 리더선 끝
  st.place = (key, A, { side = 'right', dx = 0, dy = 0 } = {}) => {
    const lb = st.labels[key];
    if (!lb || !A) return;
    const fs = lb.fontSize, gap = 8, lead = !!lb.ld, E = [A[0] + dx, A[1] + dy];
    let x = E[0], y = E[1], anchor = 'middle';
    if (side === 'left') { x -= lead ? gap : 0; anchor = 'end'; }
    else if (side === 'right') { x += lead ? gap : 0; anchor = 'start'; }
    else if (side === 'above') y -= (lead ? gap : 0) + fs * 0.55;
    else y += (lead ? gap : 0) + fs * 0.6;
    lb.t.setAttribute('x', x.toFixed(1)); lb.t.setAttribute('y', y.toFixed(1)); lb.t.setAttribute('text-anchor', anchor);
    if (lead) {
      lb.dot.setAttribute('cx', A[0].toFixed(1)); lb.dot.setAttribute('cy', A[1].toFixed(1));
      lb.ld.setAttribute('x1', A[0].toFixed(1)); lb.ld.setAttribute('y1', A[1].toFixed(1));
      lb.ld.setAttribute('x2', E[0].toFixed(1)); lb.ld.setAttribute('y2', E[1].toFixed(1));
    }
  };
  st.show = (key, on) => st.labels[key]?.g.classList.toggle('on', !!on);
  return st;
}

// ── 장·단계 지켜보기 ──
// h.enter(step)  : 장이 보이게 됐다(처음 로드 포함). 애니메이션 없이 그 단계 모습으로 바로 놓는다
// h.step(n, prev): 장 안에서 단계가 바뀌었다. 여기서만 움직인다
// h.leave()      : 장을 떠났다. 프레임을 멈추고 끝 상태로
// 돌려주는 객체의 active로 지금 보이는지 안다. stage를 주면 stage.active를 함께 맞춘다.
export function watchSlide(section, h, stage = null) {
  const w = { active: false, step: -1 };
  const present = () => {
    if (!section) return true;
    const cl = section.classList;
    return cl.contains('present') || !(cl.contains('past') || cl.contains('future'));
  };
  const stepNow = () => Number(section?.dataset.step || 0);
  const setActive = (a) => { w.active = a; if (stage) stage.active = a; };
  let entering = false;
  const enter = () => {
    entering = true;
    // main.js가 data-step을 맞출 때까지 두 프레임
    requestAnimationFrame(() => requestAnimationFrame(() => {
      entering = false;
      setActive(present());
      stage?.resize();
      w.step = stepNow();
      h.enter?.(w.step);
    }));
  };
  const onChange = () => {
    const p = present();
    if (p && !w.active && !entering) return enter();
    if (!p && w.active) { setActive(false); stage?.stop(); h.leave?.(); return; }
    if (p && !entering && stepNow() !== w.step) {
      const prev = w.step;
      w.step = stepNow();
      if (reducedMotion()) h.enter?.(w.step); else h.step?.(w.step, prev);
    }
  };
  setActive(present());
  w.step = stepNow();
  h.enter?.(w.step);
  if (section) new MutationObserver(onChange).observe(section, { attributes: true, attributeFilter: ['data-step', 'class'] });
  return w;
}

// ── 트윈 묶음: 단계 전환 애니메이션을 관리한다(새 단계가 오면 진행 중인 것을 끝 상태로 건너뛰지 않고 그 자리에서 이어 감) ──
export class Tweens {
  constructor() { this.list = []; }
  // obj[key]를 dur ms 동안 to로. 같은 obj·key에 걸린 트윈은 지금 값에서 새로 시작한다
  to(obj, key, to, dur, fn = ease.inOut) {
    const from = obj[key];
    this.list = this.list.filter((a) => !(a.obj === obj && a.key === key));
    if (dur <= 0 || from === to) { obj[key] = to; return; }
    this.list.push({ obj, key, set: (v) => { obj[key] = v; }, from, to, t0: performance.now(), dur, fn });
  }
  // 프레임마다 부른다. 아직 움직이면 true
  tick(now) {
    let live = false;
    for (const a of this.list) {
      const t = clamp01((now - a.t0) / a.dur);
      a.set(lerp(a.from, a.to, a.fn(t)));
      if (t < 1) live = true;
    }
    if (!live) this.list = [];
    return live;
  }
  finish() { for (const a of this.list) a.set(a.to); this.list = []; }
}
