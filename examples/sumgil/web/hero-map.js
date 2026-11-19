// 01장 3D 도식 지도 — 수원역 → 강남역, 자동차 두 경로 (KPU_PPT custom 그림 모듈)
// v8 승인 장면(slides/js/scenes/map.js)의 모양·재질·트윈을 그대로 옮겼다. 설명은 hero-map.md.
// - 도시·마커·경로 튜브: 조명·AO를 정점 색으로 구운 city-gn.glb (unlit, NoToneMapping)
// - 경로 중심선·카메라: routes-gn.json. 두 중심선 길이 비율 = 두 근거 km 비율 (장면 스크립트가 맞춤, 여기서 다시 확인)
// - 단계: section[data-step]을 지켜본다. 카메라 1.0초 ease-in-out, 경로는 같은 속도로 그린다(길이 비율만큼 시간)
// - 움직일 때만 그린다. 자유·자동 회전 없음. WebGL 실패 → 같은 카메라의 대체 PNG + 같은 라벨
// - 글자는 렌더에 굽지 않는다: 라벨은 SVG(HTML 위) 32px, ● 6px + 1.5px 리더선. 색은 theme.css 토큰만.
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/GLTFLoader.js';

const ASSET = (f) => new URL(`../../assets/render/${f}`, import.meta.url).href;
const SVGNS = 'http://www.w3.org/2000/svg';

export const DEFAULTS = {
  width: 1100, height: 670, left: 0, top: 0,   // figure 안 지도 칸(px). 같은 비율(1.642)이면 PNG와 카메라가 똑같다
  // 단계별 상태: e = 회색(car-e) 진행, a = 초록(car-a) 진행, cam = 카메라 자세(camDist의 키)
  steps: [
    { e: 0, a: 0, cam: 'wide' },
    { e: 1, a: 0, cam: 'mid' },
    { e: 1, a: 1, cam: 'base' },
  ],
  camDist: { wide: 1.07, mid: 1.035, base: 1 },   // 바라보는 점에서 카메라까지 거리 배율
  camSec: 1.0,
  drawSec: 1.3,          // 초록(짧은 길)을 그리는 시간. 회색은 길이 비율만큼 길다(같은 속도)
  backSec: 0.6,          // 뒤로 갈 때 지우는 시간
  fitBox: [0.11, 0.10, 0.80, 0.74],   // 비율이 PNG와 다를 때만: 내용이 들어갈 상자 [x, y, w, h]
  fade: [0.5, 1.0],      // 바닥·건물이 바깥으로 사라지는 타원 거리(v8과 같음). [9, 10]이면 끈다(PNG와 똑같이)
  fontSize: 32,
  labels: {
    origin: { text: '수원역', side: 'below', dx: 0, dy: 30 },
    destination: { text: '강남역', side: 'above', dx: 0, dy: -10 },
    e: { name: '수도권제1순환고속도로', num: 'car-e-km', at: 0.30, side: 'below', dx: 0, dy: 44 },
    // 기본 자리는 장면 스크립트가 건물을 비워 둔 칸(--keep-out). 크게 옮기면 --keep-out도 바꾼다
    a: { name: '거리우선', num: 'car-a-km', at: 0.36, side: 'left', dx: -52, dy: -36 },
  },
  note: '지도 도식 · 실제 경로 형상 아님',   // false면 그리지 않는다(장의 .foot-l에 쓸 때)
  fallback: 'auto',      // 'auto' | 'png' (항상 PNG)
  hideLabels: false,     // true면 라벨(지명·경로 이름)을 그리지 않는다 (표지)
  alt: '',               // 그림 설명(스크린 리더). 비우면 aria-hidden
  // 반복 모드(표지): 장에 머무는 동안 완성 → 지움 → 빈 도시 → 회색 → 초록을 되풀이. 단계(steps)는 쓰지 않는다
  // false면 끈다. 객체면 { hold, erase, empty, gap, drawSec, camFrom } (초, camFrom = 빈 도시일 때 카메라 거리 배율)
  loop: false,
  // 잔잔한 파도(반복 모드에서만 움직임): false면 끈다. { amp, len, sec, r0, r1 } = 높이·물결 길이(장면 단위)·주기(초)·잦아드는 반지름
  wave: false,
  // 작은 차(선택): false면 끈다. 객체면 CAR_DEFAULTS와 합친다. 반복 모드 = 흐르는 띠 머리마다 한 대(출발에서 나타나 도착에서 사라짐),
  // 단계 모드 = 그려지는 경로 머리에 한 대(도착하면 사라짐). 자세한 키는 CAR_DEFAULTS·hero-map.md
  car: false,
  ratioTolerance: 0.03,  // 그린 길이 비율과 근거 km 비율의 허용 차이
};

// 차 기본값. 거리 단위는 장면 단위(초록 경로 길이 약 19.7), 색은 비우면 theme.css 토큰
const CAR_DEFAULTS = {
  routes: ['a', 'e'],    // 차를 올릴 경로
  size: 0.62,            // 차 길이(장면 단위). 폭 = 0.52배
  fadeIn: 1.2,           // 출발에서 이 거리 동안 페이드·스케일 인
  fadeOut: 0.8,          // (반복) 도착 전 이 거리 동안 페이드·스케일 아웃
  outSec: 0.45,          // (단계) 도착 뒤 사라지는 시간(초)
  ahead: 0.22,           // (단계) 차 중심이 그려지는 끝보다 앞선 거리 → 차 뒤꽁무니에서 길이 나온다
  lead: 0.6,             // (반복) 띠 머리(shape[1])와 띠 끝(shape[2]) 사이 어디에 차 중심을 둘지(0..1). phase를 주면 그 위상 그대로
  phase: null,
  every: 1,              // (반복) 띠 몇 개마다 한 대
  a: { body: '#FFFFFF', cabin: null },   // cabin 비우면 --c-accent
  e: { body: '#FFFFFF', cabin: null },   // cabin 비우면 --c-text-4
  wheel: null,           // 비우면 --c-text-2
};

// ── 작은 도구 ──
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// 차 주행처럼: 부드럽게 출발 → 일정 속도 → 부드럽게 정지 (v8 core.js easeDrive)
function easeDrive(t, A = 0.22) {
  if (t <= 0) return 0; if (t >= 1) return 1;
  const v = 1 / (1 - A);
  const ramp = (u) => v * A * (u - Math.sin(Math.PI * u) / Math.PI) / 2;
  if (t < A) return ramp(t / A);
  if (t > 1 - A) return 1 - ramp((1 - t) / A);
  return ramp(1) + v * (t - A);
}
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
const sv = (tag, attrs = {}) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// 중심선: 길이 비율 → 위치
class Polyline {
  constructor(pts) {
    this.p = pts.map((a) => new THREE.Vector3(...a));
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
  fractionOf(x, z) {
    let best = 1e9, bi = 0;
    for (let i = 0; i < this.p.length; i++) {
      const dx = this.p[i].x - x, dz = this.p[i].z - z, d = dx * dx + dz * dz;
      if (d < best) { best = d; bi = i; }
    }
    return this.cum[bi] / this.len;
  }
}

// 경로 재질: 진행 비율(uProg)보다 뒤 조각, 꼬리(uStart)보다 앞 조각은 버린다.
// flow(표지 반복): 이미 그려진 길 위로 색 그라데이션 띠가 출발→도착으로 흐른다(길은 그대로, 색만 바뀜).
//   위상 = 출발에서 잰 거리/물결 길이 − 시각/주기 → 두 길에서 같은 속도. 띠 = 뒤는 길게 부드럽게, 앞은 조금 빨리 잦아드는 그라데이션
function routeMaterial(mat, flow) {
  const u = {
    uProg: { value: 0 }, uStart: { value: -1 },
    uFlowT: flow?.t || { value: 0 }, uFlowLen: { value: flow?.len || 1 }, uFlowLam: { value: flow?.lam || 9 }, uFlowSec: { value: flow?.sec || 3.5 },
    uFlowAmt: { value: flow?.amt || 0 }, uFlowTint: { value: new THREE.Vector3(...(flow?.tint || [1, 1, 1])) },
    // hi(색 지정)가 있으면 배율 대신 그 색으로 섞는다(띠가 바탕 길과 확실히 구분되게). shape = 띠 [꼬리 시작, 머리(가장 진함), 끝]
    uFlowHi: { value: new THREE.Color(flow?.hi || 0xffffff) }, uFlowUseHi: { value: flow?.hi ? 1 : 0 },
    uFlowShape: { value: new THREE.Vector3(...(flow?.shape || [0, 0.74, 0.96])) },
    // base = 띠 밖 바탕 길 밝기 [출발, 도착] 배율. 낮출수록 띠와 대비가 커진다
    uFlowBase: { value: new THREE.Vector2(...(flow?.base || [0.94, 1.04])) },
  };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aT;\nvarying float vT;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvT = aT;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uProg;\nuniform float uStart;\nvarying float vT;\nuniform float uFlowT, uFlowLen, uFlowLam, uFlowSec, uFlowAmt, uFlowUseHi;\nuniform vec3 uFlowTint, uFlowHi, uFlowShape;\nuniform vec2 uFlowBase;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vT > uProg || vT < uStart) discard;
if (uFlowAmt > 0.0) {
  // 깔린 흐름: 출발 → 도착으로 아주 약하게 밝아진다(띠가 없을 때도 방향이 읽힌다)
  diffuseColor.rgb *= mix(uFlowBase.x, uFlowBase.y, vT);
  // 흐르는 띠: 뒤는 길게 천천히 차오르고, 앞은 부드럽게 잦아든다. 위상 = 거리/물결 길이 − 시각/주기
  float ph = fract(vT * uFlowLen / uFlowLam - uFlowT / uFlowSec);
  float g = smoothstep(uFlowShape.x, uFlowShape.y, ph) * (1.0 - smoothstep(uFlowShape.y, uFlowShape.z, ph));
  vec3 hiC = uFlowUseHi > 0.5 ? uFlowHi : min(diffuseColor.rgb * uFlowTint, vec3(1.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, hiC, g * uFlowAmt);
}`);
  };
  mat.customProgramCacheKey = () => 'hm-route';
  return mat;
}

// 바닥·건물이 바깥쪽에서 슬라이드 바탕색으로 사라지게 (v8 map.js fadeEdges와 같은 식, 틀·잘린 모서리가 보이지 않게).
// 화면 공간: 출발→도착 대각선을 긴 축으로 하는 타원(uC·uU·uAB, 버퍼 px) 거리 uFE.x→uFE.y에서 바탕색,
// 그리고 캔버스 가장자리 바로 앞에서는 무조건 바탕색.
function fadeEdges(mat, fade) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fade);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uRes;\nuniform vec2 uFE;\nuniform vec3 uBg;\nuniform vec2 uC;\nuniform vec2 uU;\nuniform vec2 uAB;')
      .replace('#include <opaque_fragment>', `vec2 fp = gl_FragCoord.xy - uC;
float fe = length(vec2(dot(fp, uU) / uAB.x, dot(fp, vec2(-uU.y, uU.x)) / uAB.y));
vec2 fq = abs(gl_FragCoord.xy / uRes * 2.0 - 1.0);
float fb = pow(pow(fq.x, 4.0) + pow(fq.y, 4.0), 0.25);
float fk = max(smoothstep(uFE.x, uFE.y, fe), smoothstep(0.86, 1.0, fb));
outgoingLight = mix(outgoingLight, uBg, fk * fk * (3.0 - 2.0 * fk));
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'hm-fade';
  return mat;
}

// 잔잔한 파도(표지 반복 모드): 도로선으로 나뉜 바닥 네모칸 하나하나가 한 조각으로 오르내린다.
// 정점마다 aWave = (칸 중심 x, 칸 중심 z, 무게). 높이 = 무게 × 물결(칸 중심) → 같은 칸의 바닥·건물은 휘지 않고 통째로 움직인다.
// 물결 = 두 사인을 겹쳐 위로만(0..amp), 도시 중심에서 멀어지면 잦아든다(r0→r1). 도로선·멀리 깔린 판은 무게 0(그대로)
function addWave(mat, wave) {
  const prev = mat.onBeforeCompile;
  const key = mat.customProgramCacheKey?.() || 'hm-basic';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, wave);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec4 uWave; uniform vec2 uWaveC; uniform vec2 uWaveR;
attribute vec3 aWave;
float hmWave(vec2 p) {
  vec2 q = p - uWaveC;
  float k = 6.2831853 / uWave.y, w = 6.2831853 / uWave.z;
  float h = 0.62 * (0.5 + 0.5 * sin(k * dot(q, vec2(0.83, 0.56)) - w * uTime))
          + 0.38 * (0.5 + 0.5 * sin(k * 1.37 * dot(q, vec2(-0.41, 0.91)) - w * 0.73 * uTime + 1.7));
  return uWave.x * h * (1.0 - smoothstep(uWaveR.x, uWaveR.y, length(q)));
}`)
      .replace('#include <project_vertex>', `vec4 hmW = modelMatrix * vec4(transformed, 1.0);
hmW.y += aWave.z >= 0.0 ? aWave.z * hmWave(aWave.xy) : -aWave.z * uWave.x;   // 음수 무게 = 물결 최고 높이만큼 고정으로 띄움(경로·마커 층)
vec4 mvPosition = viewMatrix * hmW;
gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => key + '-w';
  return mat;
}

// 바닥의 도로선(흰 띠, y 0.006~0.014)을 모아 세로선(x)·가로선(z) 목록 [{lo, hi}]을 만든다
function roadGrid(geo) {
  const p = geo.attributes.position, layers = new Map();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y <= 0.006 || y >= 0.014) continue;
    const k = y.toFixed(3);
    if (!layers.has(k)) layers.set(k, []);
    layers.get(k).push([p.getX(i), p.getZ(i)]);
  }
  const out = { x: [], z: [] };
  for (const pts of layers.values()) for (const [ax, ot] of [[0, 1], [1, 0]]) {
    const sorted = [...pts].sort((a, b) => a[ax] - b[ax]);
    let grp = [sorted[0]];
    const flush = () => {
      const lo = grp[0][ax], hi = grp[grp.length - 1][ax];
      // 진짜 도로선 = 좁고(폭 < 1) 길며(길이 > 5) 길이 방향으로 끊김 없이 이어진다(최대 틈 < 1).
      // 다른 방향 선들의 꼭짓점이 우연히 같은 좌표에 모인 묶음은 띄엄띄엄이라 걸러진다
      const ov = grp.map((q) => q[ot]).sort((a, b) => a - b);
      let gap = 0;
      for (let i = 1; i < ov.length; i++) gap = Math.max(gap, ov[i] - ov[i - 1]);
      if (hi - lo < 1 && ov[ov.length - 1] - ov[0] > 5 && gap < 1) out[ax ? 'z' : 'x'].push({ lo, hi });
    };
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][ax] - sorted[i - 1][ax] > 0.3) { flush(); grp = []; }
      grp.push(sorted[i]);
    }
    flush();
  }
  out.x.sort((a, b) => a.lo - b.lo); out.z.sort((a, b) => a.lo - b.lo);
  return out;
}
// 한 축에서 v가 든 칸: { c: 칸 중심, d: 가까운 도로선 가장자리까지 거리 } · 도로선 위면 d 0 · 바깥이면 null
function axisCell(lines, v) {
  if (lines.length < 2 || v < lines[0].lo || v > lines[lines.length - 1].hi) return null;
  for (let k = 0; k < lines.length; k++) {
    if (v >= lines[k].lo && v <= lines[k].hi) return { c: 0, d: 0 };
    if (k + 1 < lines.length && v > lines[k].hi && v < lines[k + 1].lo) return { c: (lines[k].hi + lines[k + 1].lo) / 2, d: Math.min(v - lines[k].hi, lines[k + 1].lo - v) };
  }
  return null;
}
function cellOf(grid, x, z) {
  const cx = axisCell(grid.x, x), cz = axisCell(grid.z, z);
  if (!cx || !cz || !cx.d || !cz.d) return null;
  return { x: cx.c, z: cz.c, d: Math.min(cx.d, cz.d) };
}
// 정점마다 aWave를 단다. mode: rigid(건물: 든 칸과 함께) · lift(경로·마커·머리: 물결 최고 높이만큼 고정으로 띄움) · none(움직이지 않음)
function tagWave(geo, grid, mode) {
  const p = geo.attributes.position, a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    if (mode === 'lift') { a[i * 3 + 2] = -1; continue; }
    if (mode !== 'rigid') continue;
    const c = cellOf(grid, p.getX(i), p.getZ(i));
    if (c) { a[i * 3] = c.x; a[i * 3 + 1] = c.z; a[i * 3 + 2] = 1; }
  }
  geo.setAttribute('aWave', new THREE.BufferAttribute(a, 3));
}
// 바닥 판에서 칸 안쪽(도로에 닿지 않는) 삼각형만 떼어 칸마다 한 조각이 되는 판을 만든다(원래 정점 색 그대로, 0.003 위).
// 조각 둘레에는 아래로 내려가는 옆면(조금 어두운 색)을 붙여, 떠오르면 두께가 보인다. 원래 바닥 판·도로선은 그대로 둔다
function buildTiles(geo, grid, wallDepth = 0.35, wallShade = 0.9) {
  const P = geo.attributes.position, C = geo.attributes.color, I = geo.index;
  const pos = [], col = [], wav = [];
  const edges = new Map();
  const tri = (k) => (I ? I.getX(k) : k);
  const n = I ? I.count : P.count;
  const push = (x, y, z, r, g, b, c) => { pos.push(x, y, z); col.push(r, g, b); wav.push(c.x, c.z, 1); };
  // 구운 색은 Uint16 정규화 값 → 0..1로 직접 바꾼다(three 판에 따라 getX가 정규화를 풀지 않을 수 있다)
  const cmax = C && C.normalized ? (C.array instanceof Uint16Array ? 65535 : C.array instanceof Uint8Array ? 255 : 1) : 1;
  const raw = (v, k) => C.array[v * C.itemSize + k] / cmax;
  const colOf = (v) => (C ? [raw(v, 0), raw(v, 1), raw(v, 2)] : [0.94, 0.945, 0.95]);
  for (let k = 0; k < n; k += 3) {
    const v = [tri(k), tri(k + 1), tri(k + 2)];
    if (v.some((i) => P.getY(i) > 0.003)) continue;
    const cs = v.map((i) => cellOf(grid, P.getX(i), P.getZ(i)));
    if (cs.some((c) => !c) || cs.some((c) => c.x !== cs[0].x || c.z !== cs[0].z)) continue;
    for (const i of v) { const [r, g, b] = colOf(i); push(P.getX(i), 0.003, P.getZ(i), r, g, b, cs[0]); }
    for (let e = 0; e < 3; e++) {
      const i0 = v[e], i1 = v[(e + 1) % 3];
      // 정점이 면마다 따로라(면별 구운 색) 번호가 아니라 좌표로 같은 변을 찾는다
      const k0 = `${Math.round(P.getX(i0) * 1000)},${Math.round(P.getZ(i0) * 1000)}`, k1 = `${Math.round(P.getX(i1) * 1000)},${Math.round(P.getZ(i1) * 1000)}`;
      const key = k0 < k1 ? `${k0}|${k1}` : `${k1}|${k0}`;
      const rec = edges.get(key);
      if (rec) rec.n++; else edges.set(key, { n: 1, i0, i1, c: cs[0] });
    }
  }
  for (const { n: cnt, i0, i1, c } of edges.values()) {
    if (cnt !== 1) continue;
    const [r0, g0, b0] = colOf(i0).map((q) => q * wallShade), [r1, g1, b1] = colOf(i1).map((q) => q * wallShade);
    const x0 = P.getX(i0), z0 = P.getZ(i0), x1 = P.getX(i1), z1 = P.getZ(i1);
    push(x0, 0.003, z0, r0, g0, b0, c); push(x1, 0.003, z1, r1, g1, b1, c); push(x1, -wallDepth, z1, r1, g1, b1, c);
    push(x0, 0.003, z0, r0, g0, b0, c); push(x1, -wallDepth, z1, r1, g1, b1, c); push(x0, -wallDepth, z0, r0, g0, b0, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aWave', new THREE.Float32BufferAttribute(wav, 3));
  return g;
}

// 작은 차(로우폴리, 둥근 모서리). 길이 1 기준, +z가 앞, 바퀴 바닥 y 0.
// 조명은 장면처럼 정점 색에 굽는다(면 방향 음영: 위 면이 가장 밝고 옆은 조금 어둡게) → unlit 재질로 도시와 같은 톤
function carGeometry(body, cabin, wheel) {
  const pos = [], col = [];
  const L = new THREE.Vector3(-0.3, 0.86, 0.42).normalize();
  const n = new THREE.Vector3();
  const add = (geo, color) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      n.fromBufferAttribute(N, i);
      const k = 0.72 + 0.28 * Math.max(0, n.dot(L));
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      col.push(color.r * k, color.g * k, color.b * k);
    }
  };
  // 옆모습(앞뒤 z, 높이 y) 모양을 폭(x) 방향으로 밀어낸다. 둥근 끝은 bevel
  const extrude = (shape, width, bevel) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -(width - 2 * bevel) / 2);
    g.rotateY(-Math.PI / 2);   // 모양 x → 앞(+z)
    return g;
  };
  const rr = (z0, y0, z1, y1, r) => {
    const s = new THREE.Shape();
    s.moveTo(z0 + r, y0); s.lineTo(z1 - r, y0); s.quadraticCurveTo(z1, y0, z1, y0 + r);
    s.lineTo(z1, y1 - r); s.quadraticCurveTo(z1, y1, z1 - r, y1); s.lineTo(z0 + r, y1);
    s.quadraticCurveTo(z0, y1, z0, y1 - r); s.lineTo(z0, y0 + r); s.quadraticCurveTo(z0, y0, z0 + r, y0);
    return s;
  };
  // 차체: 낮고 둥근 판
  add(extrude(rr(-0.44, 0.1, 0.44, 0.27, 0.07), 0.52, 0.05), body);
  // 지붕(창): 뒤쪽으로 조금 치우친 둥근 사다리꼴
  const cab = new THREE.Shape();
  cab.moveTo(-0.3, 0.27); cab.lineTo(0.2, 0.27); cab.quadraticCurveTo(0.12, 0.43, 0.02, 0.44);
  cab.lineTo(-0.2, 0.44); cab.quadraticCurveTo(-0.28, 0.43, -0.3, 0.27);
  add(extrude(cab, 0.42, 0.035), cabin);
  // 바퀴 4개 (차체 밑으로 조금 보임)
  for (const x of [-0.22, 0.22]) for (const z of [-0.27, 0.27]) {
    const w = new THREE.CylinderGeometry(0.1, 0.1, 0.09, 10);
    w.rotateZ(Math.PI / 2); w.translate(x, 0.1, z);
    add(w, wheel);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function tagFractions(geo, line) {
  const pos = geo.attributes.position;
  const a = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) a[i] = line.fractionOf(pos.getX(i), pos.getZ(i));
  geo.setAttribute('aT', new THREE.BufferAttribute(a, 1));
}

// 경로 밑 바닥 띠(도로색). 진행 비율 속성 포함
function ribbonGeo(line, halfW, y, n = 600) {
  const pos = [], t = [], idx = [];
  const p = new THREE.Vector3(), q = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    line.at(f, p);
    if (f >= 1) { line.at(f - 1e-3, q); side.subVectors(p, q); } else { line.at(Math.min(1, f + 1e-3), q); side.subVectors(q, p); }
    side.set(-side.z, 0, side.x).normalize().multiplyScalar(halfW);
    pos.push(p.x + side.x, y, p.z + side.z, p.x - side.x, y, p.z - side.z);
    t.push(f, f);
    if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  g.setIndex(idx);
  return g;
}

// 구운 정점 색 중 밝은 쪽(위를 향한 면) 평균 = 경로 머리 색
function averageColor(mesh, dflt) {
  const c = mesh?.geometry?.attributes?.color;
  if (!c) return dflt.clone();
  const arr = [];
  for (let i = 0; i < c.count; i++) arr.push([c.getX(i), c.getY(i), c.getZ(i)]);
  arr.sort((p, q) => (q[0] + q[1] + q[2]) - (p[0] + p[1] + p[2]));
  const top = arr.slice(0, Math.max(1, arr.length >> 2));
  const s = top.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  return new THREE.Color(s[0] / top.length, s[1] / top.length, s[2] / top.length);
}

function readColor(el, name, dflt) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  try { return v ? new THREE.Color(v) : new THREE.Color(dflt); } catch (e) { return new THREE.Color(dflt); }
}

let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
.hm { position: absolute; overflow: visible; }
.hm > canvas, .hm > img.hm-png { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hm > img.hm-png { object-fit: contain; }
.hm > svg.hm-ov { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.hm .hm-lb { opacity: 0; transition: opacity 420ms var(--ease-out, ease-out); }
.hm .hm-lb.on { opacity: 1; }
.hm .hm-t { font-family: var(--f); letter-spacing: -0.01em; paint-order: stroke; stroke: var(--c-halo); stroke-width: 8px; stroke-linejoin: round; dominant-baseline: central; }
.hm .hm-t.pin { fill: var(--c-text); font-weight: 700; }
.hm .hm-t.e { fill: var(--c-text-2); font-weight: 600; }
.hm .hm-t.e .km { fill: var(--c-text-2); font-weight: 700; }
.hm .hm-t.a { fill: var(--c-accent-text); font-weight: 700; }
.hm .hm-dot { fill: var(--c-text); stroke: var(--c-halo); stroke-width: 1.5; }
.hm .hm-ld { stroke: var(--c-text); stroke-width: 1.5; fill: none; }
.reveal .hm .hm-note, .hm .hm-note { position: absolute; left: 0; bottom: 0; margin: 0; font-size: var(--fs-note, 24px); line-height: 1.35; color: var(--c-text-3); white-space: nowrap; }
`;
  document.head.append(st);
}

class HeroMap {
  constructor(host, ctx) {
    this.host = host;
    this.ctx = ctx;
    this.section = ctx.section || host.closest('section');
    this.cfg = merge(DEFAULTS, ctx.cfg || {});
    if (Array.isArray(ctx.cfg?.steps)) this.cfg.steps = ctx.cfg.steps;
    this.W = this.cfg.width; this.H = this.cfg.height;
    this.aspect = this.W / this.H;
    this.s = { e: 0, a: 0 };
    this.anims = [];
    this.step = -1;
    this.active = false;
    this.raf = null;
    this.mode = 'loading';
  }

  async init() {
    injectStyle();
    const c = this.cfg;
    const wrap = document.createElement('div');
    wrap.className = 'hm';
    Object.assign(wrap.style, { left: `${c.left}px`, top: `${c.top}px`, width: `${this.W}px`, height: `${this.H}px` });
    this.host.append(wrap);
    this.wrap = wrap;
    this.host.__heroMap = this;

    this.R = await (await fetch(ASSET('routes-gn.json'))).json();
    const R = this.R;
    this.lines = { e: new Polyline(R.routes.route_e.points), a: new Polyline(R.routes.route_a.points) };
    this.checkRatio();
    this.buildLabels();

    const wantPng = c.fallback === 'png' || /[?&]no3d\b/.test(location.search) || !webglAvailable();
    let ok = false;
    if (!wantPng) {
      try { ok = await this.build3d(); } catch (e) {
        console.warn('hero-map: 3D 실패 → PNG', e);
        ok = false;
        this.canvas?.remove();
        this.renderer?.dispose();
        this.renderer = null;
      }
    }
    if (!ok) await this.buildFallback();
    this.watch();
  }

  // 그린 두 길이의 비율이 근거 km 비율과 같은지 (지도가 정직한지) 확인
  checkRatio() {
    const L = this.cfg.labels;
    this.kmE = this.ctx.num(L.e.num, { unit: true });
    this.kmA = this.ctx.num(L.a.num, { unit: true });
    const want = this.kmE.value / this.kmA.value;
    const got = this.lines.e.len / this.lines.a.len;
    this.ratio = { want, got };
    if (isFinite(want) && Math.abs(got / want - 1) > this.cfg.ratioTolerance) {
      console.error(`hero-map: 지도 경로 길이 비율 ${got.toFixed(3)} ≠ 근거 km 비율 ${want.toFixed(3)} (${L.e.num}/${L.a.num}). 장면 스크립트(deck.mjs build3d)로 GLB·PNG를 다시 만든다`);
    }
  }

  // ── 라벨 (SVG, 지도 칸 좌표 px) ──
  buildLabels() {
    const c = this.cfg, L = c.labels, fs = c.fontSize;
    const ov = sv('svg', { class: 'hm-ov', width: this.W, height: this.H, viewBox: `0 0 ${this.W} ${this.H}`, 'aria-hidden': 'true' });
    this.wrap.append(ov);
    this.labels = {};
    const make = (key, cls, parts, withLeader) => {
      const g = sv('g', { class: `hm-lb hm-lb-${key}` });
      const ld = withLeader ? sv('line', { class: 'hm-ld' }) : null;
      const dot = withLeader ? sv('circle', { class: 'hm-dot', r: 3 }) : null;
      const t = sv('text', { class: `hm-t ${cls}`, 'font-size': fs });
      parts.forEach(([txt, pc], i) => {
        const sp = sv('tspan', pc ? { class: pc } : {});
        sp.textContent = (i ? ' ' : '') + txt;
        t.append(sp);
      });
      if (ld) g.append(ld);
      if (dot) g.append(dot);
      g.append(t);
      ov.append(g);
      this.labels[key] = { g, ld, dot, t, def: L[key] };
    };
    make('origin', 'pin', [[L.origin.text]], false);
    make('destination', 'pin', [[L.destination.text]], false);
    make('e', 'e', [[L.e.name], [this.kmE.text, 'km']], true);
    make('a', 'a', [[L.a.name], [this.kmA.text, 'km']], true);
    if (c.hideLabels) ov.style.display = 'none';
    if (c.alt) { this.wrap.setAttribute('role', 'img'); this.wrap.setAttribute('aria-label', c.alt); } else this.wrap.setAttribute('aria-hidden', 'true');
    if (c.note) {
      const p = document.createElement('p');
      p.className = 'hm-note';
      p.textContent = c.note;
      this.wrap.append(p);
    }
  }

  // 라벨 하나를 화면 점 A(px)에 놓는다. side: 글자가 끝점의 어느 쪽에 오는지
  placeLabel(lb, A) {
    if (!A) return;
    const d = lb.def, fs = this.cfg.fontSize, gap = 8;
    const E = [A[0] + (d.dx || 0), A[1] + (d.dy || 0)];
    const t = lb.t;
    let x = E[0], y = E[1], anchor = 'middle';
    const lead = !!lb.ld;
    if (d.side === 'left') { x = E[0] - (lead ? gap : 0); anchor = 'end'; }
    else if (d.side === 'right') { x = E[0] + (lead ? gap : 0); anchor = 'start'; }
    else if (d.side === 'above') { y = E[1] - (lead ? gap : 0) - fs * 0.55; }
    else { y = E[1] + (lead ? gap : 0) + fs * 0.6; }
    t.setAttribute('x', x.toFixed(1)); t.setAttribute('y', y.toFixed(1)); t.setAttribute('text-anchor', anchor);
    if (lb.ld) {
      lb.dot.setAttribute('cx', A[0].toFixed(1)); lb.dot.setAttribute('cy', A[1].toFixed(1));
      lb.ld.setAttribute('x1', A[0].toFixed(1)); lb.ld.setAttribute('y1', A[1].toFixed(1));
      lb.ld.setAttribute('x2', E[0].toFixed(1)); lb.ld.setAttribute('y2', E[1].toFixed(1));
    }
  }

  setLabelOn(key, on) { this.labels[key]?.g.classList.toggle('on', !!on); }

  // ── 3D ──
  async build3d() {
    const R = this.R;
    const gltf = await new GLTFLoader().loadAsync(ASSET(R.glb?.file || 'city-gn.glb'));
    const C = {
      bg: readColor(this.host, '--c-bg', 0xffffff),
      bar: readColor(this.host, '--c-bar', 0xd1d6db),
      accent: readColor(this.host, '--c-accent', 0x1b8a4e),
    };
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(C.bg, 0);   // 투명: 지도가 흰 슬라이드 위에 떠 있다(틀 없음)
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.toFallback('context-lost'); });
    this.wrap.prepend(canvas);
    this.canvas = canvas;
    this.renderer = renderer;
    this.fade = {
      uRes: { value: new THREE.Vector2(this.W, this.H) }, uBg: { value: C.bg.clone() },
      uFE: { value: new THREE.Vector2(...(this.cfg.fade || [9, 10])) },
      uC: { value: new THREE.Vector2(this.W / 2, this.H / 2) }, uU: { value: new THREE.Vector2(1, 0) }, uAB: { value: new THREE.Vector2(this.W, this.H) },
    };
    this.setPixelRatio();
    const W = this.cfg.wave ? { amp: 0.22, len: 11, sec: 7, r0: 11, r1: 26, ...(isObj(this.cfg.wave) ? this.cfg.wave : {}) } : null;
    this.wave = W ? {
      uTime: { value: 0 }, uWave: { value: new THREE.Vector4(W.amp, W.len, W.sec, 0) },
      uWaveC: { value: new THREE.Vector2(R.camera.target[0], R.camera.target[2]) }, uWaveR: { value: new THREE.Vector2(W.r0, W.r1) },
    } : null;
    const wv = (m) => (this.wave ? addWave(m, this.wave) : m);

    const scene = new THREE.Scene();
    this.scene = scene;
    const routes = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = (o.name || '').replace(/_\d+$/, '');
      const vc = !!o.geometry.attributes.color;
      if (name === 'route_e' || name === 'route_a') {
        const key = name.slice(-1);
        const F = this.flowCfg(key);
        o.material = wv(routeMaterial(new THREE.MeshBasicMaterial({ vertexColors: vc, color: vc ? 0xffffff : (key === 'e' ? C.bar : C.accent) }), F));
        tagFractions(o.geometry, this.lines[key]);
        o.renderOrder = 2;
        routes[key] = o;
      } else {
        o.material = new THREE.MeshBasicMaterial({ vertexColors: vc, color: vc ? 0xffffff : C.bar });
        if (!name.startsWith('marker')) fadeEdges(o.material, this.fade);
        wv(o.material);
      }
    });
    if (!routes.e || !routes.a) throw new Error('city-gn.glb에 route_e/route_a 없음');
    let grid = null;
    if (this.wave) {
      gltf.scene.traverse((o) => { if (o.isMesh && /^ground/.test(o.name || '')) grid = roadGrid(o.geometry); });
      if (!grid || grid.x.length < 2 || grid.z.length < 2) console.warn('hero-map: 도로선을 못 찾음 → 파도 없음', grid);
      const G = grid || { x: [], z: [] };
      let ground = null;
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const name = (o.name || '').replace(/_\d+$/, '');
        if (name === 'ground') ground = o;
        tagWave(o.geometry, G, name === 'ground' ? 'none' : name === 'buildings' ? 'rigid' : 'lift');
      });
      // 칸 조각 판: 바닥과 같은 재질 규칙(정점 색 · 가장자리 사라짐 · 파도), 옆면이 보이게 양면
      if (ground && G.x.length > 1) {
        // 원래 바닥 판과 같은 높이 근처에 겹치므로 깊이에서 늘 앞에 둔다(z-fighting 방지)
        const tm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
        fadeEdges(tm, this.fade); wv(tm);
        const tiles = new THREE.Mesh(buildTiles(ground.geometry, G), tm);
        tiles.name = 'tiles';
        scene.add(tiles);
      }
    }
    scene.add(gltf.scene);
    this.routes = routes;

    // 경로 밑 도로색 띠 (에셋 casing과 같은 폭) + 그리는 중의 둥근 머리
    this.casings = {}; this.heads = {}; this.tails = {};
    for (const key of ['e', 'a']) {
      const def = R.routes[`route_${key}`];
      const cas = new THREE.Mesh(ribbonGeo(this.lines[key], def.casing_half_width ?? (key === 'e' ? 0.22 : 0.32), key === 'e' ? 0.022 : 0.026),
        wv(routeMaterial(new THREE.MeshBasicMaterial({ color: C.bg }))));
      if (this.wave) tagWave(cas.geometry, grid || { x: [], z: [] }, 'lift');
      cas.renderOrder = 1;
      scene.add(cas);
      this.casings[key] = cas;
      const capMat = wv(new THREE.MeshBasicMaterial({ color: averageColor(routes[key], key === 'e' ? C.bar : C.accent) }));
      const headGeo = new THREE.SphereGeometry(def.tube_radius, 24, 16);
      if (this.wave) tagWave(headGeo, grid || { x: [], z: [] }, 'lift');
      const head = new THREE.Mesh(headGeo, capMat);
      head.visible = false;
      head.renderOrder = 3;
      scene.add(head);
      this.heads[key] = head;
      const tail = head.clone();   // 꼬리 둥근 끝(경로가 흘러 빠질 때)
      scene.add(tail);
      this.tails[key] = tail;
    }
    this.buildCars();

    // 카메라: 대체 PNG와 같은 자리. 거리만 단계마다 바꾼다(자유·자동 회전 없음)
    const cam = R.camera;
    this.camera = new THREE.PerspectiveCamera(cam.fov_vertical_deg, this.aspect, 0.1, 500);
    this.tgt = new THREE.Vector3(...cam.target);
    this.dir = new THREE.Vector3(...cam.position).sub(this.tgt);
    this.dist = 1;
    this.setupLens();
    this.mode = '3d';
    this.computeFade();
    this.applyState();
    this.applyCamera();
    try { renderer.compile(scene, this.camera); } catch (e) { /* 무시 */ }
    this.render();
    return true;
  }

  // 지도 칸 비율이 PNG와 같으면 에셋 세로 화각 그대로. 다르면 가로 화각을 기준으로 내용이 fitBox에 들어오게 줌·이동
  setupLens() {
    const cam = this.R.camera;
    this.vfov = cam.fov_vertical_deg;
    this.shift = null;
    if (Math.abs(this.aspect / cam.aspect - 1) < 0.01) return;
    const h = THREE.MathUtils.degToRad(cam.fov_horizontal_deg);
    this.vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / this.aspect));
    this.applyCamera(1);
    const pts = [...this.lines.e.p, ...this.lines.a.p, new THREE.Vector3(...this.R.markers.destination.pin_top)];
    const O = new THREE.Vector3(...this.R.markers.origin.position);
    for (const [dx, dz] of [[-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.6]]) pts.push(O.clone().add(new THREE.Vector3(dx, 0, dz)));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const v = new THREE.Vector3();
    for (const p of pts) { v.copy(p).project(this.camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const b = this.cfg.fitBox;
    const f = Math.max((x1 - x0) / (2 * b[2]), (y1 - y0) / (2 * b[3]));
    this.vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.vfov) / 2) * f));
    const cx = (x0 + x1) / 2 / f, cy = (y0 + y1) / 2 / f;
    this.shift = [b[0] + b[2] / 2 - (cx + 1) / 2, b[1] + b[3] / 2 - (1 - cy) / 2];
  }

  applyCamera(dist = this.dist) {
    const cam = this.camera;
    cam.position.copy(this.tgt).addScaledVector(this.dir, dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.tgt);
    cam.fov = this.vfov;
    cam.aspect = this.aspect;
    if (this.shift) cam.setViewOffset(this.W, this.H, -this.shift[0] * this.W, -this.shift[1] * this.H, this.W, this.H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  setPixelRatio() {
    if (!this.renderer) return;
    const scale = (window.Reveal?.getScale?.() || 1);
    const pr = Math.min(1.5, Math.max(1, (window.devicePixelRatio || 1) * scale));
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.W, this.H, false);
    this.renderer.getDrawingBufferSize(this.fade?.uRes.value || new THREE.Vector2());
    if (this.camera) this.computeFade();
  }

  // 가장자리 사라짐 타원: 기본 자세(마지막 단계) 화면에서 출발·도착을 잇는 대각선 + 회색 경로가 가장 멀리 나간 거리
  computeFade() {
    if (!this.fade) return;
    const keep = this.dist;
    this.applyCamera(1);
    const pr = this.renderer.getPixelRatio();
    const toBuf = (p) => { const [x, y] = this.project(p); return new THREE.Vector2(x * pr, (this.H - y) * pr); };
    const o = toBuf(new THREE.Vector3(...this.R.markers.origin.position));
    const d = toBuf(new THREE.Vector3(...this.R.markers.destination.position));
    const c = o.clone().add(d).multiplyScalar(0.5);
    const u = d.clone().sub(o); const half = u.length() / 2; u.normalize();
    const n = new THREE.Vector2(-u.y, u.x);
    let off = 0, along = 0;
    for (const key of ['e', 'a']) for (const p of this.lines[key].p) {
      const q = toBuf(p).sub(c);
      off = Math.max(off, Math.abs(q.dot(n)));
      along = Math.max(along, Math.abs(q.dot(u)));
    }
    this.fade.uC.value.copy(c);
    this.fade.uU.value.copy(u);
    this.fade.uAB.value.set(Math.max(half, along) * 1.32, Math.max(off * 1.45, half * 0.5));
    this.applyCamera(keep);
  }

  // 월드 점 → 지도 칸 px
  project(p) {
    const v = p.clone().project(this.camera);
    return [(v.x + 1) / 2 * this.W, (1 - v.y) / 2 * this.H];
  }

  anchors3d() {
    const R = this.R, up = (line, f, r) => line.at(f).add(new THREE.Vector3(0, r, 0));
    const L = this.cfg.labels;
    return {
      origin: this.project(new THREE.Vector3(...R.markers.origin.top)),
      destination: this.project(new THREE.Vector3(...R.markers.destination.pin_top)),
      e: this.project(up(this.lines.e, L.e.at, R.routes.route_e.tube_radius)),
      a: this.project(up(this.lines.a, L.a.at, R.routes.route_a.tube_radius)),
    };
  }

  applyState() {
    const s = this.s, L = this.cfg.labels;
    if (this.mode === '3d') {
      for (const key of ['e', 'a']) {
        const p = s[key], st = s['s' + key] || 0;
        const u = this.routes[key].material.userData.u;
        u.uProg.value = p >= 0.999 ? 2 : p;
        u.uStart.value = st <= 0.001 ? -1 : st;
        this.routes[key].visible = p > st + 0.0005;
        const cu = this.casings[key].material.userData.u;
        cu.uProg.value = u.uProg.value; cu.uStart.value = u.uStart.value;
        this.casings[key].visible = this.routes[key].visible;
        const h = this.heads[key];
        h.visible = p > 0.002 && p < 0.999 && p > st;
        if (h.visible) this.lines[key].at(p, h.position);
        const tl = this.tails[key];
        tl.visible = st > 0.002 && st < 0.999 && p > st;
        if (tl.visible) this.lines[key].at(st, tl.position);
      }
      this.updateCars(performance.now());
      const A = this.anchors3d();
      for (const k of Object.keys(this.labels)) this.placeLabel(this.labels[k], A[k]);
    }
    // 라벨: 지명은 늘, 경로 이름은 그 경로 머리가 라벨 자리를 지난 뒤
    this.setLabelOn('origin', true);
    this.setLabelOn('destination', true);
    this.setLabelOn('e', s.e >= Math.min(L.e.at + 0.04, 1));
    this.setLabelOn('a', s.a >= Math.min(L.a.at + 0.04, 1));
  }

  // ── 작은 차 (cfg.car) ──
  buildCars() {
    if (!this.cfg.car) return;
    const K = merge(CAR_DEFAULTS, isObj(this.cfg.car) ? this.cfg.car : {});
    this.car = K;
    this.carRun = {};
    this.cars = {};
    const tok = (v, name, dflt) => (v ? new THREE.Color(v) : readColor(this.host, name, dflt));
    const wheel = tok(K.wheel, '--c-text-2', 0x4e5968);
    const L = this.loopCfg();
    for (const key of K.routes) {
      if (!this.lines[key]) continue;
      const k = K[key] || {};
      const geo = carGeometry(tok(k.body, '--c-bg', 0xffffff), tok(k.cabin, key === 'a' ? '--c-accent' : '--c-text-4', key === 'a' ? 0x1b8a4e : 0x8b95a1), wheel);
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 });
      // 반복이면 경로 위 띠 수만큼(동시에 보일 수 있는 최대), 단계면 한 대
      const n = L ? Math.ceil(this.lines[key].len / (L.lam * Math.max(1, K.every | 0))) + 1 : 1;
      this.cars[key] = Array.from({ length: n }, () => {
        const m = new THREE.Mesh(geo, mat.clone());
        m.visible = false;
        m.renderOrder = 4;
        this.scene.add(m);
        return m;
      });
    }
  }

  // 차 한 대를 경로 위 거리 d(장면 단위)에 진행 방향으로 놓는다. a = 0..1 (투명도·크기)
  placeCar(m, key, d, a) {
    const line = this.lines[key], K = this.car;
    const f = clamp01(d / line.len), df = 0.3 / line.len;
    const p = line.at(f, m.position);
    const q = line.at(Math.min(1, f + df)), r = line.at(Math.max(0, f - df));
    m.rotation.set(0, Math.atan2(q.x - r.x, q.z - r.z), 0);
    // 튜브 위에 살짝 묻히게: 중심선 + 반지름의 절반, 파도 중이면 경로처럼 물결 최고 높이만큼 띄움
    p.y += (this.R.routes[`route_${key}`]?.tube_radius || 0.1) * 0.5 + (this.wave ? this.wave.uWave.value.x : 0);
    const e = a * a * (3 - 2 * a);
    m.scale.setScalar(K.size * (0.35 + 0.65 * e));
    m.material.opacity = e;
    m.visible = e > 0.01;
  }

  hideCars() {
    if (!this.cars) return;
    for (const arr of Object.values(this.cars)) for (const m of arr) m.visible = false;
  }

  updateCars(now) {
    if (!this.cars) return;
    this.hideCars();
    const K = this.car;
    if (this.looping) {
      // 반복: 띠 머리 위상(ph)에 차 중심. 거리 d = lam × (ph + t/sec + n) → 띠와 같은 속도·같은 자리.
      // 반복을 시작한 뒤 출발에서 나온 차만(장에 들어오는 순간 길 중간에 갑자기 있지 않게)
      const L = this.loopL, t = this.loopTime || 0, ev = Math.max(1, K.every | 0);
      for (const key of Object.keys(this.cars)) {
        const len = this.lines[key].len, sh = L[key]?.shape || [0, 0.74, 0.96];
        const ph = K.phase ?? (sh[1] + K.lead * (sh[2] - sh[1]));
        const k = ph + t / L.sec;
        let i = 0;
        for (let n = Math.ceil(-k); n <= Math.floor(len / L.lam - k) && i < this.cars[key].length; n++) {
          if (n > -ph || ((n % ev) + ev) % ev) continue;
          const d = L.lam * (k + n);
          const a = Math.min(clamp01(d / K.fadeIn), clamp01((len - d) / K.fadeOut));
          this.placeCar(this.cars[key][i++], key, d, a);
        }
      }
      return;
    }
    // 단계: 그려지는 끝(머리)에 한 대. 출발에서 페이드·스케일 인, 도착하면 outSec 동안 사라짐
    for (const key of Object.keys(this.cars)) {
      const run = this.carRun[key];
      if (!run) continue;
      const len = this.lines[key].len, dh = this.s[key] * len;
      let a = clamp01(dh / K.fadeIn);
      if (this.s[key] >= 0.999) {
        run.arrive = run.arrive || now;
        a = Math.min(a, 1 - (now - run.arrive) / (K.outSec * 1000));
        if (a <= 0) { this.carRun[key] = null; continue; }
      }
      this.placeCar(this.cars[key][0], key, Math.min(len, dh + K.ahead), a);
    }
  }

  carsLive() { return !!this.carRun && Object.values(this.carRun).some(Boolean); }

  render() {
    if (this.mode !== '3d' || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  // ── 트윈 ──
  to(key, target, dur, ease) {
    const from = this.s[key] ?? 0;
    if (dur <= 0 || from === target) { this.s[key] = target; return; }
    const t0 = performance.now();
    this.anims.push({ t0, dur, ease, apply: (t) => { this.s[key] = lerp(from, target, t); } });
  }
  toDist(target, dur) {
    const from = this.dist;
    if (dur <= 0 || from === target) { this.dist = target; return; }
    this.anims.push({ t0: performance.now(), dur, ease: easeInOut, apply: (t) => { this.dist = lerp(from, target, t); } });
  }
  // 트윈을 끝 상태로. 차는 남기지 않는다(장을 떠날 때·움직이지 않을 때)
  finish() { for (const a of this.anims) a.apply(1); this.anims = []; if (this.carRun) this.carRun = {}; this.hideCars(); }

  setStep(n, instant) {
    const c = this.cfg;
    n = Math.max(0, n | 0);
    const S = c.steps[Math.min(n, c.steps.length - 1)];
    const prev = this.step;
    this.step = n;
    this.anims = [];
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = instant || reduce || prev < 0;
    const lenA = this.lines.a.len;
    // 차: 바로 놓을 때(장 들어옴·움직임 줄이기)는 없앤다. 앞으로 그리는 경로에만 머리에 한 대, 지우면(뒤로) 바로 없앤다
    if (this.carRun && now) { this.carRun = {}; this.hideCars(); }
    for (const key of ['e', 'a']) {
      const target = S[key] ? 1 : 0;
      const from = this.s[key];
      if (from === target) continue;
      const fwd = target > from;
      if (this.carRun && this.cars?.[key]) this.carRun[key] = fwd && !now ? (this.carRun[key] || { arrive: 0 }) : null;
      const dur = now ? 0 : fwd ? c.drawSec * 1000 * (this.lines[key].len / lenA) * (target - from) : c.backSec * 1000;
      this.to(key, target, dur, fwd ? easeDrive : easeInOut);
    }
    const d = c.camDist[S.cam] ?? Number(S.cam) ?? 1;
    this.toDist(isFinite(d) ? d : 1, now ? 0 : c.camSec * 1000);
    if (this.mode === 'png') this.showPng(n);
    this.kick();
  }

  kick() {
    if (this.raf) return;
    if (this.mode !== '3d' || !this.active) { this.finish(); this.applyState(); if (this.mode === '3d') { this.applyCamera(); this.render(); } return; }
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = (now) => {
    this.raf = null;
    let live = false;
    for (const a of this.anims) {
      const t = clamp01((now - a.t0) / a.dur);
      a.apply(a.ease(t));
      if (t < 1) live = true;
    }
    if (!live) this.anims = [];
    this.applyCamera();
    this.applyState();
    this.render();
    // 도착한 차가 사라지는 동안에도 계속 그린다
    if ((live || this.carsLive()) && this.active) this.raf = requestAnimationFrame(this.tick);
  };

  // ── 반복 모드 ──
  loopCfg() {
    const L = this.cfg.loop;
    if (!L) return null;
    // 녹색 #1B8A4E → 밝은 같은 계열 녹색 #4FC283 쪽, 회색 #D1D6DB → 차분한 푸른 회색 #A3AFBD 쪽(곱하는 배율)
    return { lam: 11, sec: 4.2, a: { amt: 1, tint: [2.9, 1.42, 1.72] }, e: { amt: 1, tint: [0.76, 0.8, 0.87] }, ...(isObj(L) ? L : {}) };
  }

  // 경로 색 흐름 설정(반복 모드에서만): 길이·물결 길이·주기·세기·색 배율(구운 정점 색에 곱함: 초록은 밝게, 회색은 살짝 짙게)
  flowCfg(key) {
    const L = this.loopCfg();
    if (!L) return null;
    this.flowT = this.flowT || { value: 0 };
    return { t: this.flowT, len: this.lines[key].len, lam: L.lam, sec: L.sec, ...(L[key] || {}) };
  }

  // 반복 모드: 두 길은 늘 완성된 채로 있고(지우지 않음), 색 띠만 흐른다. 카메라 고정, 바닥·건물은 wave로 일렁인다
  loopState() {
    this.s.e = this.s.a = 1; this.s.se = this.s.sa = 0;
    this.dist = 1;
  }

  startLoop() {
    this.loopL = this.loopCfg();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!this.loopL || this.mode !== '3d' || !this.active || reduce) return;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.anims = [];
    this.looping = true;
    this.loopT0 = performance.now();
    this.raf = requestAnimationFrame(this.loopTick);
  }

  stopLoop() {
    this.looping = false;
    this.hideCars();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  loopTick = (now) => {
    this.raf = null;
    if (!this.looping || !this.active) return;
    const t = (now - this.loopT0) / 1000;
    this.loopState();
    this.loopTime = t;
    if (this.wave) this.wave.uTime.value = t;
    if (this.flowT) this.flowT.value = t;
    this.applyCamera();
    this.applyState();
    this.render();
    this.raf = requestAnimationFrame(this.loopTick);
  };

  // ── 단계·장 들어오기 지켜보기 ──
  watch() {
    const sec = this.section;
    // reveal.js가 장을 관리하기 시작하면(present·past·future 클래스) 'present'일 때만 켠다. 그 전(로드 중)·시험 페이지는 켠 것으로 본다
    const present = () => {
      if (!sec) return true;
      const cl = sec.classList;
      return cl.contains('present') || !(cl.contains('past') || cl.contains('future'));
    };
    const stepNow = () => Number(sec?.dataset.step || 0);
    let entering = false;
    const enter = () => {
      entering = true;
      // main.js sync()가 data-step을 맞출 때까지 두 프레임 기다렸다가 바로 그 단계로 (애니메이션 없이)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        entering = false;
        this.active = present();
        this.setPixelRatio();
        this.setStep(stepNow(), true);
        if (this.cfg.loop) this.startLoop();
      }));
    };
    const onChange = () => {
      const p = present();
      if (p && !this.active && !entering) { enter(); return; }
      if (!p && this.active) {
        this.active = false;
        this.stopLoop();
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
        this.finish();
        this.applyState();
        return;
      }
      if (p && !entering && !this.looping && stepNow() !== this.step) this.setStep(stepNow(), false);
    };
    this.active = present();
    this.setStep(stepNow(), true);
    if (this.cfg.loop && this.active) this.startLoop();
    if (sec) new MutationObserver(onChange).observe(sec, { attributes: true, attributeFilter: ['data-step', 'class'] });
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { this.setPixelRatio(); this.applyCamera(); this.render(); }, 120); });
  }

  // ── WebGL 실패: 같은 카메라의 대체 PNG + 같은 라벨 ──
  async buildFallback() {
    this.mode = 'png';
    const img = document.createElement('img');
    img.className = 'hm-png';
    img.alt = '';
    img.decoding = 'async';
    this.wrap.prepend(img);
    this.img = img;
    try { this.pa = await (await fetch(ASSET('anchors-gn.json'))).json(); } catch (e) { this.pa = null; console.error('hero-map: anchors-gn.json 읽기 실패', e); }
    this.placePngLabels();
  }

  toFallback(reason) {
    console.warn('hero-map: WebGL 중단 → PNG', reason);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.canvas?.remove();
    this.renderer = null;
    this.buildFallback().then(() => this.setStep(this.step, true));
  }

  showPng(n) {
    const S = this.cfg.steps[Math.min(n, this.cfg.steps.length - 1)];
    const f = this.pa?._meta?.files || { 'gn-0': 'hero-gn-0.png', 'gn-1': 'hero-gn-1.png', 'gn-2': 'hero-gn.png' };
    const file = S.a ? f['gn-2'] : S.e ? f['gn-1'] : f['gn-0'];
    const src = ASSET(file);
    if (this.img && this.img.dataset.src !== src) { this.img.src = src; this.img.dataset.src = src; }
  }

  // PNG(같은 카메라) 좌표 → 지도 칸 px (object-fit: contain)
  placePngLabels() {
    const j = this.pa;
    if (!j) return;
    const [rw, rh] = j._meta?.resolution || [2200, 1340];
    const k = Math.min(this.W / rw, this.H / rh), ox = (this.W - rw * k) / 2, oy = (this.H - rh * k) / 2;
    const m = ([x, y]) => [ox + x * rw * k, oy + y * rh * k];
    const along = (arr, f) => {
      const i = clamp01(f) * (arr.length - 1), lo = Math.floor(i), hi = Math.min(arr.length - 1, lo + 1), t = i - lo;
      return [lerp(arr[lo][0], arr[hi][0], t), lerp(arr[lo][1], arr[hi][1], t)];
    };
    const L = this.cfg.labels;
    const A = { origin: m(j.origin), destination: m(j.destination), e: m(along(j.route_e, L.e.at)), a: m(along(j.route_a, L.a.at)) };
    for (const key of Object.keys(this.labels)) this.placeLabel(this.labels[key], A[key]);
  }
}

export default async function draw(host, ctx) {
  // countup: 근거 id → 같은 장 오른쪽 레일 큰 숫자가 그 단계에 0부터 세어 올라간다(main.js countUp)
  const cu = ctx.cfg?.countup;
  const hn = cu && host.closest('section')?.querySelector('.rail .hero-num');
  if (hn) { const r = ctx.num(cu); if (isFinite(r.value)) { hn.dataset.countup = String(r.value); hn.dataset.decimals = String((r.text.split('.')[1] || '').length); } }
  const map = new HeroMap(host, ctx);
  await map.init();
  return map;
}
