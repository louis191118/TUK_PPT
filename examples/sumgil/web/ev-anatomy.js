// 숨김 장 — 전기차 해부 (현대 아이오닉 6 · E-GMP).
// 차체: assets/ev/ioniq6.glb (Car2022, CC BY 4.0, 원래 덱의 다듬기 스크립트로 정리)
// 내부: assets/ev/egmp.glb (자체 제작 어림 형상, 원래 덱의 제작 스크립트)
// 두 GLB는 같은 좌표계: 미터, +X 앞, +Y 위, 지면 y=0, 원점 = 앞뒤 차축 가운데.
// 단계 = reveal fragment(.fragment.step) 수 → section[data-step]. 드래그 = 둘러보기, 휠 = 거리.
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/three/addons/libs/meshopt_decoder.module.js';

const W = 1920, H = 1080;
const BG = '#FFFFFF';            // 덱과 같은 흰 바탕
const ACC = 'var(--c-accent)';   // 덱 강조 녹색 하나(초점 부품·큰 숫자)
const ACC3 = new THREE.Color('#1B8A4E'); // 같은 녹색(3D 안: 충전 흐름 빛)
const HV = new THREE.Color('#FF6A13');

// 부품 그룹(이름은 egmp.glb 노드 extras.group, 없으면 노드 이름으로 추정)
const GROUP_NAME = {
  body: '차체', wheels: '휠 · 타이어', battery: '배터리 팩', rear_pe: '뒤 PE 시스템', front_pe: '앞 PE 시스템',
  charging: 'ICCU · 충전구', hv: '고전압 케이블', thermal: '열관리', chassis: '서스펜션 · 서브프레임',
};
// 분해 방향(미터)과 순서(0이 먼저). 정비 순서: 차체 → 바퀴 → 배터리 → PE → 나머지
const EXPLODE = {
  body: { d: [0, 1.35, 0], o: 0 },
  wheels: { d: [0, 0, 0.55], o: 1, out: true },
  battery: { d: [0, -0.62, 0], o: 2 },
  rear_pe: { d: [-0.72, -0.08, 0], o: 3 },
  front_pe: { d: [0.72, -0.08, 0], o: 3 },
  charging: { d: [-0.35, 0.28, 0], o: 4 },
  thermal: { d: [0.5, 0.32, 0], o: 4 },
  hv: { d: [0, -0.3, 0], o: 2 },
  chassis: { d: [0, 0, 0], o: 5 },
};

// 단계. 글은 필요한 것만: 장면 이름 + 강조 카드(이름·큰 숫자·한 줄)
// 숫자 출처: 배터리 77.4 kWh · 모듈 32 · 셀 384(InsideEVs E-GMP 팩 분해), 모터 165/74 kW · 800 V · 10→80 % 18분(현대자동차)
const STEPS = [
  { name: '외관', paint: 1, ghost: 0, ex: 0, cam: { t: [0, 0.6, 0], az: 38, el: 11, d: 9.6 }, spinCam: 1 },
  { name: '투시', paint: 0, ghost: 1, ex: 0, pulse: 0.25, cam: { t: [0, 0.55, 0], az: 28, el: 21, d: 9.8 } },
  { name: '분해', paint: 0, ghost: 0.8, ex: 1, tags: true, cam: { t: [0, 0.95, 0], az: 34, el: 22, d: 15.6 } },
  { name: '배터리', paint: 0, ghost: 0.18, ex: 1, cover: 0.35, focus: ['battery'], sub: 1, wave: 1, anchor: 'battery',
    cam: { t: [0, -0.05, 0], az: 24, el: 40, d: 11.4 },
    card: { t: '배터리 팩', n: '77.4', u: 'kWh', s: '모듈 32개 · 셀 384개' } },
  { name: '구동', paint: 0, ghost: 0.18, ex: 1, focus: ['rear_pe', 'front_pe'], sub: 1, spin: 2.2, anchor: 'rear_pe',
    cam: { t: [-0.1, 0.15, 0], az: 52, el: 20, d: 14.2 },
    card: { t: '뒤 모터', n: '165', u: 'kW', s: '앞 모터 74 kW · 감속기 · 인버터 일체' } },
  { name: '충전', paint: 0, ghost: 0.5, ex: 0, focus: ['charging', 'hv'], pulse: 1, anchor: 'charge_port',
    cam: { t: [-0.7, 0.5, 0], az: -142, el: 17, d: 10.4 },
    card: { t: '800 V 초고속 충전', n: '18', u: '분', s: '10 → 80 % · ICCU가 충전 · 12 V 전원 통합 제어' } },
  { name: '열관리', paint: 0, ghost: 0.18, ex: 1, focus: ['thermal'], sub: 1, anchor: 'thermal',
    cam: { t: [1.0, 0.45, 0], az: 40, el: 24, d: 11.4 },
    card: { t: '열관리', s: '히트펌프 · 라디에이터 · 냉각 회로' } },
  { name: '섀시', paint: 0, ghost: 0.18, ex: 1, focus: ['chassis'], sub: 0.6, anchor: 'front_suspension',
    cam: { t: [0, 0.35, 0], az: 30, el: 30, d: 14.0 },
    card: { t: '섀시', s: '앞 맥퍼슨 스트럿 · 뒤 멀티링크 · 브레이크' } },
  { name: '조립', paint: 1, ghost: 0, ex: 0, cam: { t: [0, 0.6, 0], az: -32, el: 9, d: 9.4 }, spinCam: 1 },
];
// 부품 안쪽 분해: 초점 그룹 안의 노드를 그룹 중심에서 바깥으로(미터 배율). 특정 노드는 위로
const SUB_UP = { pack_cover: 0.75, rear_inverter: 0.32, front_inverter: 0.3, bms: 0.22, heat_pump: 0.25, iccu: 0.2 };
// 배터리는 층으로 벌린다: 트레이(아래) · 냉각판 · 모듈 · 배선(BMS·버스바) · 덮개(위)
const SUB_SET = { pack_tray: [0, -0.16, 0], cooling_plate: [0, 0.1, 0], modules: [0, 0.3, 0], bms: [0, 0.5, 0], pack_connector: [0, 0.5, 0], pack_cover: [0, 0.72, 0] };

export function createSection() {
  const s = document.createElement('section');
  s.dataset.slug = 'ev-anatomy';
  s.className = 'ev-x';
  s.innerHTML = `
    <canvas class="ev-cv" width="${W}" height="${H}" aria-label="아이오닉 6 전기차 3D 해부 장면. 드래그로 돌려 볼 수 있음"></canvas>
    <svg class="ev-lead" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>
    <p class="ev-kick">E-GMP · IONIQ 6</p>
    <div class="ev-card" aria-live="polite"><p class="ct"></p><p class="cn"><b></b><span></span></p><p class="cs"></p></div>
    <ol class="ev-steps">${STEPS.map((s, i) => `<li data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${s.name}</li>`).join('')}</ol>
    <p class="ev-credit">현대자동차 · InsideEVs · 차체 3D Car2022 (CC BY 4.0) · 내부 구조는 어림 형상</p>
    <div class="ev-load"><span class="bar"><i></i></span><span class="pct">0%</span></div>
    <p class="ev-tip"></p>
    ${STEPS.slice(1).map(() => '<span class="fragment step" aria-hidden="true"></span>').join('')}
    <aside class="notes"><p>숨김 장(Ctrl+Shift+8, Mac ⌃⇧8). 아이오닉 6을 외관 → 투시 → 분해 → 배터리 → 구동 → 충전 → 조립 순으로 봅니다. 차체는 실제 모델, 내부 부품은 E-GMP 배치를 따른 어림 형상입니다.</p></aside>`;
  injectCss();
  return s;
}

function injectCss() {
  if (document.getElementById('ev-css')) return;
  const st = document.createElement('style');
  st.id = 'ev-css';
  st.textContent = `
  section.ev-x { color: var(--c-text); }
  section.ev-x .ev-cv { left: 0; top: 0; width: ${W}px; height: ${H}px; display: block; cursor: grab; touch-action: none; }
  section.ev-x .ev-cv.drag { cursor: grabbing; }
  section.ev-x .ev-lead { left: 0; top: 0; width: ${W}px; height: ${H}px; pointer-events: none; overflow: visible; }
  section.ev-x .ev-lead polyline { stroke: var(--c-text-3); stroke-width: 2; fill: none; }
  section.ev-x .ev-lead .acc { stroke: var(--c-accent); stroke-width: 3; }
  section.ev-x .ev-lead circle { fill: var(--c-text-2); }
  section.ev-x .ev-lead circle.acc { fill: var(--c-accent); }
  section.ev-x .ev-lead text { font: 600 var(--fs-tick) var(--f); fill: var(--c-text-2); letter-spacing: var(--ls-body);
    paint-order: stroke; stroke: var(--c-halo); stroke-width: 8px; stroke-linejoin: round; }
  section.ev-x .ev-kick { left: var(--pad-x); top: 64px; font-size: var(--fs-tick); font-weight: 600; line-height: 1.3; color: var(--c-text-3); white-space: nowrap; }
  section.ev-x .ev-card { right: var(--pad-x); top: 330px; width: 520px; opacity: 0; transform: translateX(24px);
    transition: opacity var(--d-frag) var(--ease-out), transform 700ms var(--ease-out); pointer-events: none; }
  section.ev-x .ev-card.on { opacity: 1; transform: none; }
  section.ev-x .ev-card p { position: static; margin: 0; white-space: nowrap; }
  section.ev-x .ev-card .ct { font-size: var(--fs-lede); font-weight: 700; letter-spacing: var(--ls-head); line-height: 1.2; color: var(--c-text); }
  section.ev-x .ev-card .cn[hidden] { display: none; }
  section.ev-x .ev-card .cn { margin-top: var(--s3); display: flex; align-items: baseline; gap: var(--s1); color: var(--c-accent); }
  section.ev-x .ev-card .cn b { font-size: var(--fs-hero); font-weight: 700; letter-spacing: var(--ls-hero); line-height: .9; font-variant-numeric: tabular-nums; }
  section.ev-x .ev-card .cn span { font-size: 72px; font-weight: 700; letter-spacing: -.03em; }
  section.ev-x .ev-card .cs { margin-top: var(--s4); font-size: var(--fs-tick); font-weight: 500; line-height: 1.35; color: var(--c-text-3); }
  section.ev-x .ev-steps { left: var(--pad-x); bottom: 40px; display: flex; gap: var(--s4); padding: 0; list-style: none; font-size: var(--fs-tick); font-weight: 600; color: var(--c-text-4); white-space: nowrap; }
  section.ev-x .ev-steps li { position: relative; display: flex; gap: var(--s1); align-items: baseline; transition: color .4s; cursor: pointer; }
  section.ev-x .ev-steps li i { font-style: normal; font-size: var(--fs-note); font-variant-numeric: tabular-nums; }
  section.ev-x .ev-steps li::before { content: ''; position: absolute; left: 0; right: 0; top: -14px; height: 4px; border-radius: 2px; background: var(--c-accent); transform: scaleX(0); transform-origin: 0 50%; transition: transform 600ms var(--ease-out); }
  section.ev-x .ev-steps li.on { color: var(--c-text); }
  section.ev-x .ev-steps li.on::before { transform: none; }
  section.ev-x .ev-steps li.done { color: var(--c-text-3); }
  section.ev-x .ev-credit { right: var(--pad-x); top: 64px; width: 760px; font-size: var(--fs-note); line-height: 1.35; color: var(--c-text-3); text-align: right; }
  section.ev-x .ev-load { left: 50%; top: 600px; transform: translateX(-50%); display: flex; align-items: center; gap: var(--s2); transition: opacity .6s; }
  section.ev-x .ev-load.done { opacity: 0; pointer-events: none; }
  section.ev-x .ev-load .bar { position: relative; width: 320px; height: 4px; border-radius: 2px; background: var(--c-hair); overflow: hidden; }
  section.ev-x .ev-load .bar i { position: absolute; inset: 0; background: var(--c-accent); transform-origin: 0 50%; transform: scaleX(0); transition: transform .2s; }
  section.ev-x .ev-load .pct { font-size: var(--fs-note); font-weight: 600; color: var(--c-text-3); font-variant-numeric: tabular-nums; width: 64px; }
  section.ev-x .ev-tip { left: 0; top: 0; font-size: var(--fs-tick); font-weight: 700; color: var(--c-text); white-space: nowrap; opacity: 0; transition: opacity .2s; pointer-events: none;
    text-shadow: 0 0 6px #fff, 0 0 6px #fff, 0 0 12px #fff; }
  section.ev-x .ev-tip.on { opacity: 1; }
  section.ev-x .fragment.step { left: 0; top: 0; width: 0; height: 0; }
  section.ev-x .foot-r, section.ev-x .foot-l { display: none; }`;
  document.head.append(st);
}

// ───────────────────────── 장면 ─────────────────────────
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const WHITE = new THREE.Color(1, 1, 1), BLACK = new THREE.Color(0, 0, 0);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const T0 = performance.now();
const dbg = (t) => window.__evDebug && console.log('[ev]', t, Math.round(performance.now() - T0));

export async function mount(sec, R) {
  const cv = sec.querySelector('.ev-cv');
  const lead = sec.querySelector('.ev-lead');
  const card = sec.querySelector('.ev-card');
  const tip = sec.querySelector('.ev-tip');
  const load = sec.querySelector('.ev-load');
  const stepsEl = [...sec.querySelectorAll('.ev-steps li')];

  // 렌더러 — 화면에 바로 그린다(후처리 없음). 기본 프레임버퍼 MSAA, Neutral 톤매핑.
  // 바탕은 clear color라 톤매핑을 안 거쳐 순백 그대로. 그림자 맵 없음(접지 그림자는 미리 그린 판)
  // 성능 기록(2026-11-18, M4·Aside): 그림자 맵(VSM)+HDR 후처리+블룸일 때 GPU 병목으로 약 24fps·셰이더 준비 42초 → 이 구성으로 바꿈
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(20, W / H, 0.5, 200);

  // 조명: 환경맵이 주광, 방향광 둘은 형태 강조만(그림자 없음)
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(2.5, 9, 3.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffffff', 0.6);
  rim.position.set(-6, 3, -5);
  scene.add(rim);

  // 접지 그림자: 부드러운 타원 두 겹(넓고 옅게 + 좁고 짙게). 분해하면 배터리와 함께 바닥이 내려간다
  const blob = (w, d, op, soft) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex(soft), transparent: true, opacity: op, depthWrite: false, toneMapped: false, color: '#000' }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = -1; scene.add(m); return m;
  };
  const shadows = [blob(6.6, 3.2, 0.16, 0.55), blob(5.0, 2.05, 0.2, 0.8)];
  const floorY = (ex) => 0.002 - 0.9 * ex;

  // 해상도: 화면에 보이는 크기 × 기기 배율(상한 1.6). 프레임이 느리면 계속 재며 스스로 낮춘다(하한 0.55)
  let quality = 1;
  const resize = () => {
    const scale = R.getScale ? R.getScale() : 1;
    const pr = Math.min(1.6, Math.max(0.55, (window.devicePixelRatio || 1) * scale * quality));
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
  };
  resize();
  R.on('resize', resize);

  // ── 모델 불러오기 ──
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const prog = { body: 0, egmp: 0 };
  const showProg = () => {
    const p = (prog.body + prog.egmp) / 2;
    load.querySelector('.bar i').style.transform = `scaleX(${p})`;
    load.querySelector('.pct').textContent = Math.round(p * 100) + '%';
  };
  const get = (url, k) => new Promise((res) => loader.load(url, (g) => { prog[k] = 1; showProg(); res(g); },
    (e) => { if (e.total) { prog[k] = e.loaded / e.total; showProg(); } },
    (err) => { console.warn('숨김 장 모델 없음:', url, err?.message || err); prog[k] = 1; showProg(); res(null); }));
  const [gBody, gEgmp] = await Promise.all([get('assets/ev/ioniq6.glb', 'body'), get('assets/ev/egmp.glb', 'egmp')]);

  dbg('loaded');
  const root = new THREE.Group();
  scene.add(root);
  const parts = [];      // { node, group, p0, dir, order }
  const byGroup = {};    // group → [node]
  const named = {};      // node name → node
  const groupOf = (n) => n.userData?.group || guessGroup(n.name);

  const addRoot = (g, defGroup) => {
    if (!g) return;
    const kids = [...g.scene.children];
    for (const n of kids) {
      root.add(n);
      const group = defGroup?.(n.name) || groupOf(n);
      n.userData.group = group;
      named[n.name] = n;
      (byGroup[group] ||= []).push(n);
      const ex = EXPLODE[group] || { d: [0, 0, 0], o: 5 };
      const dir = new THREE.Vector3(...ex.d);
      if (ex.out) dir.z *= Math.sign(n.position.z || 1);
      parts.push({ node: n, group, p0: n.position.clone(), dir, order: ex.o });
    }
  };
  addRoot(gBody, (name) => (/^wheel/i.test(name) ? 'wheels' : 'body'));
  addRoot(gEgmp, null);
  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
  });

  dbg('roots');
  // 부품 안쪽 분해 방향: 그룹 중심 → 노드 중심(수평), 크기 0.25~0.6 m
  root.updateMatrixWorld(true);
  for (const [g, nodes] of Object.entries(byGroup)) {
    if (g === 'body' || g === 'wheels') continue;
    const gc = new THREE.Box3(); nodes.forEach((n) => gc.expandByObject(n));
    const c0 = gc.getCenter(new THREE.Vector3());
    for (const n of nodes) {
      const p = parts.find((q) => q.node === n);
      const c = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
      const v = c.sub(c0); v.y = 0;
      const len = v.length();
      p.sub = len > 1e-3 ? v.multiplyScalar(Math.min(0.6, 0.25 + len * 0.35) / len) : new THREE.Vector3();
      p.sub.y += SUB_UP[n.name] || 0;
      if (SUB_SET[n.name]) p.sub.set(...SUB_SET[n.name]);
    }
  }
  // 브레이크는 두 모델에 다 있다(같은 자리). 조립 상태 = 차체 모델 캘리퍼, 분해 상태 = 내부 구조 brakes
  const bodyCalipers = [];
  named.body_trim?.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => /metal_dark/i.test(m.name))) bodyCalipers.push(o); });
  const setBrakes = (exploded) => {
    if (named.brakes) named.brakes.visible = exploded;
    bodyCalipers.forEach((o) => { o.visible = !exploded; });
  };
  // 재질: 그룹마다 따로 복제(어둡게 하기·투명도를 그룹 단위로)
  const mats = {};       // group → Set(material)
  const matCache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let top = o;
    while (top.parent && top.parent !== root) top = top.parent;
    const group = top.userData.group;
    const one = (m) => {
      const k = group + '|' + m.uuid;
      if (!matCache.has(k)) {
        const c = m.clone();
        c.userData.base = { color: c.color?.clone(), env: c.envMapIntensity ?? 1, emissive: c.emissive?.clone(), ei: c.emissiveIntensity ?? 1,
          opacity: c.opacity, transparent: c.transparent, depthWrite: c.depthWrite };
        matCache.set(k, c);
        (mats[group] ||= new Set()).add(c);
      }
      return matCache.get(k);
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
  dbg('mats');
  // 칠: 세레니티 화이트 펄 느낌(어두운 바탕에서 형태가 산다)
  for (const m of [...(mats.body || [])]) {
    const n = (m.name || '').toLowerCase();
    if (n === 'paint' || n.includes('paint')) {
      const p = new THREE.MeshPhysicalMaterial({ name: 'paint', color: '#E4E7EA', metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 });
      p.userData.base = { color: p.color.clone(), env: 1.1, emissive: p.emissive.clone(), ei: 1, opacity: 1, transparent: false, depthWrite: true };
      swapMat(root, m, p);
      mats.body.delete(m); mats.body.add(p);
    }
    if (n.startsWith('lamp_emissive')) { m.emissiveIntensity = 3.2; m.userData.base.ei = 3.2; m.toneMapped = true; }
  }
  dbg('paint');
  // 고전압 케이블: 주황 + 흐르는 빛(충전 단계)
  const hvU = { uTime: { value: 0 }, uPulse: { value: 0 }, uAcc: { value: ACC3 } };
  for (const m of mats.hv || []) {
    m.emissive = HV.clone(); m.emissiveIntensity = 0.0; m.userData.base.emissive = HV.clone(); m.userData.base.ei = 0;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, hvU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uTime, uPulse; uniform vec3 uAcc;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float ph = fract(vWp.x * .55 - uTime * .7);
          float band = smoothstep(0., .06, ph) * smoothstep(.22, .06, ph);
          totalEmissiveRadiance += uAcc * (band * 4. + .3) * uPulse;`);
    };
    m.customProgramCacheKey = () => 'hvpulse';
  }

  dbg('hv');
  // 투시 껍데기: 차체 메시마다 프레넬 유령(같은 지오메트리, 덧셈 혼합)
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 0 }, uCol: { value: new THREE.Color('#4E5968') } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOp; uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.2);
        gl_FragColor = vec4(uCol, (.025 + f * .55) * uOp); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, forceSinglePass: true,
  });
  const ghosts = [];
  for (const n of byGroup.body || []) {
    if (/interior/i.test(n.name)) continue;
    n.traverse((o) => {
      if (!o.isMesh || o.userData.ghost) return;
      const g = new THREE.Mesh(o.geometry, ghostMat);
      g.userData.ghost = true; g.renderOrder = 10; g.raycast = () => {};
      o.add(g); ghosts.push(g);
    });
  }

  dbg('ghost');
  // 배터리 모듈 단위(인스턴싱 여부 모두 처리) — 배터리 단계에서 앞→뒤로 물결처럼 들림
  const modUnits = [];
  const modRoot = named.modules;
  if (modRoot) {
    modRoot.traverse((o) => {
      if (o.isInstancedMesh) {
        const base = [];
        for (let i = 0; i < o.count; i++) { const m = new THREE.Matrix4(); o.getMatrixAt(i, m); base.push(m); }
        base.forEach((m, i) => {
          const p = new THREE.Vector3().setFromMatrixPosition(m);
          modUnits.push({ x: p.x, apply: (dy) => { const mm = m.clone(); mm.elements[13] += dy; o.setMatrixAt(i, mm); o.instanceMatrix.needsUpdate = true; } });
        });
      }
    });
    if (!modUnits.length) {
      for (const c of modRoot.children) {
        const y0 = c.position.y;
        modUnits.push({ x: c.position.x, apply: (dy) => { c.position.y = y0 + dy; } });
      }
    }
    const xs = modUnits.map((u) => u.x);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    modUnits.forEach((u) => { u.k = x1 > x0 ? (x1 - u.x) / (x1 - x0) : 0; });
  }
  const cover = named.pack_cover;
  const coverMats = new Set();
  cover?.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => coverMats.add(m)); });
  // 차체·덮개는 처음부터 반투명 재질로 고정(깊이는 기록). 사라질 때 셰이더를 바꾸지 않아 멈칫·깨짐이 없고,
  // 깊이를 쓰므로 바깥 껍데기만 옅어지고 그 뒤 차체 안쪽 면이 겹쳐 비치지 않는다. 유리·렌즈는 원래 투명
  for (const m of [...(mats.body || []), ...coverMats]) {
    if (m.userData.base.transparent) continue;
    m.transparent = true; m.depthWrite = true; m.needsUpdate = true;
  }
  // 양면 반투명은 three가 뒷면·앞면 두 번 그린다 → 한 번만(깊이를 쓰므로 차이 없음, 그리기 호출 절반)
  for (const m of [...(mats.body || []), ...coverMats]) if (m.side === THREE.DoubleSide) m.forceSinglePass = true;
  const wheels = (byGroup.wheels || []);

  dbg('modules');
  // ── 상태 ──
  const S = { paint: 1, ghost: 0, ex: 0, cover: 1, pulse: 0, wave: 0, spin: 0, shift: 0 };
  const subT = {};      // group → 0..1 (부품 안쪽 분해 정도)
  const dim = {};        // group → 0..1
  Object.keys(mats).forEach((g) => (dim[g] = 0));
  let step = 0, stepT = 0, leadDraw = 0;
  const cam = { t: new THREE.Vector3(0, 0.6, 0), az: 38, el: 11, d: 11.6 };
  const user = { az: 0, el: 0, z: 1 };
  let autoAz = 0;

  const setStep = (i) => {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    stepT = 0;
    stepsEl.forEach((li, j) => { li.classList.toggle('on', j === step); li.classList.toggle('done', j < step); });
    const c = STEPS[step].card;
    card.classList.toggle('on', !!c);
    if (c) {
      card.querySelector('.ct').textContent = c.t;
      card.querySelector('.cn').hidden = !c.n;
      card.querySelector('.cn b').textContent = c.n || '';
      card.querySelector('.cn span').textContent = c.u || '';
      card.querySelector('.cs').textContent = c.s;
    }
    leadDraw = 0;
  };
  const readStep = () => Number(sec.dataset.step || 0);
  setStep(readStep());
  new MutationObserver(() => setStep(readStep())).observe(sec, { attributes: true, attributeFilter: ['data-step'] });
  stepsEl.forEach((li) => li.addEventListener('click', () => {
    const want = Number(li.dataset.i), h = R.getIndices(sec).h;
    R.slide(h, 0, want - 1);
  }));

  // ── 입력: 드래그 회전, 휠 거리, 마우스 올리면 부품 이름 ──
  const toLocal = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  let drag = null, mouse = null, lastInput = -1e9;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: user.az, el: user.el }; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); lastInput = performance.now(); });
  cv.addEventListener('pointermove', (e) => {
    mouse = toLocal(e);
    if (!drag) return;
    const r = cv.getBoundingClientRect();
    user.az = drag.az - (e.clientX - drag.x) / r.width * 260;
    user.el = Math.max(-25, Math.min(60, drag.el + (e.clientY - drag.y) / r.height * 90));
    lastInput = performance.now();
  });
  const up = () => { drag = null; cv.classList.remove('drag'); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { mouse = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); user.z = Math.max(0.65, Math.min(1.5, user.z * Math.exp(e.deltaY * 0.0012))); lastInput = performance.now(); }, { passive: false });
  cv.addEventListener('dblclick', () => { user.az = 0; user.el = 0; user.z = 1; });

  // 그룹 상자(마우스 올림·라벨 기준점)
  const boxOf = (nodes) => { const b = new THREE.Box3(); nodes.forEach((n) => b.expandByObject(n)); return b; };
  const anchorOf = (key) => {
    const nodes = named[key] ? [named[key]] : byGroup[key];
    if (!nodes?.length) return null;
    const b = boxOf(nodes);
    const c = b.getCenter(new THREE.Vector3());
    if (key === 'battery') c.y = b.max.y;
    return c;
  };
  const project = (v) => { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H, p.z]; };
  const ray = new THREE.Raycaster();
  const pick = () => {
    if (!mouse || drag) return null;
    ray.setFromCamera(new THREE.Vector2(mouse[0] / W * 2 - 1, -(mouse[1] / H) * 2 + 1), camera);
    let best = null, bd = Infinity;
    for (const g of Object.keys(byGroup)) {
      if (g === 'body' && S.paint < 0.5) continue;
      const hit = ray.ray.intersectBox(boxOf(byGroup[g]), new THREE.Vector3());
      if (!hit) continue;
      const d = hit.distanceTo(ray.ray.origin) + (g === 'body' || g === 'chassis' ? 3 : 0); // 큰 상자는 뒤로 미룬다
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  };

  // ── 라벨·리더선 ──
  const TAGS = ['battery', 'rear_pe', 'front_pe', 'charging', 'thermal', 'chassis'];
  const drawLead = (dt) => {
    const st = STEPS[step];
    leadDraw = Math.min(1, leadDraw + dt * 1.6);
    let html = '';
    if (st.tags && S.ex > 0.85) {
      const a = clamp01((S.ex - 0.85) / 0.15) * leadDraw;
      const pts = TAGS.map((k) => { const v = anchorOf(k); return v && { k, p: project(v) }; }).filter(Boolean);
      const L = pts.filter((q) => q.p[0] < W / 2).sort((x, y) => x.p[1] - y.p[1]);
      const Rr = pts.filter((q) => q.p[0] >= W / 2).sort((x, y) => x.p[1] - y.p[1]);
      const col = (arr, x, anchorEnd) => {
        let yPrev = 300;
        for (const q of arr) {
          const y = Math.max(yPrev + 58, Math.min(900, q.p[1]));
          yPrev = y;
          const tx = anchorEnd ? x - 14 : x + 14;
          html += `<g opacity="${a}"><circle cx="${q.p[0]}" cy="${q.p[1]}" r="5"/><polyline points="${q.p[0]},${q.p[1]} ${x},${y} ${tx + (anchorEnd ? -0 : 0)},${y}"/>`
            + `<text x="${anchorEnd ? x - 18 : x + 18}" y="${y + 8}" text-anchor="${anchorEnd ? 'end' : 'start'}">${GROUP_NAME[q.k]}</text></g>`;
        }
      };
      col(L, 360, true);
      col(Rr, 1560, false);
    }
    if (st.card && st.anchor) {
      const v = anchorOf(st.anchor) || anchorOf(st.focus?.[0]);
      if (v) {
        const [x, y] = project(v);
        const cx = W - 144 - 470 - 36, cy = 392;
        const k = ease(clamp01(leadDraw * 1.2 - 0.2));
        const mx = x + (cx - 60 - x) * 0.55;
        html += `<g><circle class="acc" cx="${x}" cy="${y}" r="${7 * k}"/>`
          + `<polyline class="acc" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - k}" points="${x},${y} ${mx},${cy} ${cx},${cy}"/></g>`;
      }
    }
    lead.innerHTML = html;
  };

  // ── 매 프레임 ──
  let running = false, t0 = performance.now(), tPrev = t0, frames = 0, ghostOn = true;
  const dts = [];
  const tmp = new THREE.Vector3();
  const loop = (now) => {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - tPrev) / 1000);
    tPrev = now;
    const time = (now - t0) / 1000;
    stepT += dt;
    const st = STEPS[step];
    const k = damp(reduce ? 30 : 3.2, dt);
    S.paint += ((st.paint ?? 0) - S.paint) * k;
    S.ghost += ((st.ghost ?? 0) - S.ghost) * k;
    S.ex += ((st.ex ?? 0) - S.ex) * damp(reduce ? 30 : 1.9, dt);
    S.cover += ((st.cover ?? 1) - S.cover) * k;
    S.pulse += ((st.pulse ?? 0) - S.pulse) * k;
    S.wave += ((st.wave ?? 0) - S.wave) * k;
    S.spin += ((st.spin ?? 0) - S.spin) * k;
    S.shift += ((st.card ? 1 : 0) - S.shift) * damp(2.4, dt);

    // 분해: 그룹 순서대로 겹치며 진행(앞 단계가 반쯤 갔을 때 다음 시작)
    for (const g of Object.keys(byGroup)) {
      const want = st.focus?.includes(g) ? (st.sub ?? 0) : 0;
      subT[g] = (subT[g] ?? 0) + (want - (subT[g] ?? 0)) * damp(reduce ? 30 : 2.2, dt);
    }
    for (const p of parts) {
      const t = ease(clamp01(S.ex * 1.9 - p.order * 0.18));
      p.node.position.copy(p.p0).addScaledVector(p.dir, t);
      if (p.sub) p.node.position.addScaledVector(p.sub, ease(clamp01(subT[p.group] || 0)));
      if (p.node === cover) p.node.position.y += 0.4 * t;
    }
    // 바퀴 굴리기(구동 단계)
    for (const w of wheels) w.rotation.z -= S.spin * dt;
    // 배터리 모듈 물결
    if (modUnits.length) for (const u of modUnits) {
      const ph = clamp01((stepT * 0.9 - u.k * 0.9));
      const lift = S.wave * (0.07 + 0.05 * Math.sin((time * 2.2 - u.k * 6.0))) * ease(ph);
      u.apply(lift);
    }
    setBrakes(S.ex > 0.08);
    const fy = floorY(clamp01(S.ex * 1.9 - 2 * 0.18));
    shadows.forEach((m) => { m.position.y = fy; });

    // 차체 칠 ↔ 투시
    for (const m of mats.body || []) {
      m.opacity = m.userData.base.opacity * S.paint;
      m.visible = S.paint > 0.01;
    }
    // 내부 부품은 차체에 가려도 숨기지 않는다: 숨겼다 다시 보이면 Metal이 GPU에 다시 올리느라 12프레임쯤 70~140 ms 멈춤(2026-11-18 측정)
    const gop = S.ghost * (1 - S.paint);
    ghostMat.uniforms.uOp.value = gop;
    if (ghostOn !== gop > 0.004) { ghostOn = !ghostOn; ghosts.forEach((g) => { g.visible = ghostOn; }); }
    for (const m of coverMats) { m.opacity = S.cover; m.visible = S.cover > 0.02; }
    // 강조: 초점 그룹 밖은 어둡게
    const focus = st.focus;
    for (const g of Object.keys(mats)) {
      const want = focus && !focus.includes(g) ? (g === 'body' ? 0.4 : 0.78) : 0;
      dim[g] += (want - dim[g]) * k;
      const f = 1 - dim[g];
      for (const m of mats[g]) {
        const b = m.userData.base;
        if (b.color && m.color) m.color.copy(b.color).lerp(WHITE, dim[g] * 0.6);
        m.envMapIntensity = b.env * (0.35 + 0.65 * f);
        if (g !== 'hv' && m.emissive) {
          m.emissive.copy(b.emissive || BLACK).lerp(WHITE, dim[g]);
          m.emissiveIntensity = (b.ei ?? 1) * f + 0.92 * dim[g];
        }
      }
    }
    hvU.uTime.value = time;
    hvU.uPulse.value = S.pulse;

    // 카메라: 단계 자세 + 사용자 드래그 + 정지 화면 자동 회전
    const c = st.cam;
    const kc = damp(reduce ? 30 : 1.6, dt);
    cam.t.lerp(tmp.set(...c.t), kc);
    cam.az += (c.az - cam.az) * kc;
    cam.el += (c.el - cam.el) * kc;
    cam.d += (c.d - cam.d) * kc;
    const idle = now - lastInput > 3500 && !drag;
    if (st.spinCam && idle && !reduce) autoAz += dt * 3.5; else autoAz += (0 - autoAz) * damp(0.6, dt);
    if (idle && !st.spinCam) { user.az += (0 - user.az) * damp(0.8, dt); user.el += (0 - user.el) * damp(0.8, dt); }
    const az = THREE.MathUtils.degToRad(cam.az + user.az + autoAz);
    const el = THREE.MathUtils.degToRad(Math.max(-8, Math.min(75, cam.el + user.el)));
    const d = cam.d * user.z;
    camera.position.set(cam.t.x + d * Math.cos(el) * Math.cos(az), cam.t.y + d * Math.sin(el), cam.t.z - d * Math.cos(el) * Math.sin(az));
    camera.lookAt(cam.t);
    // 카드가 있으면 그림을 왼쪽으로 비킨다(시야 창 이동)
    camera.setViewOffset(W, H, S.shift * 250, 0, W, H);

    // 마우스 올린 부품 이름
    const hov = frames % 4 === 0 ? pick() : tip.dataset.g || null;
    if (hov && mouse && S.paint < 0.6) {
      tip.dataset.g = hov;
      tip.textContent = GROUP_NAME[hov] || hov;
      tip.style.transform = `translate(${mouse[0] + 18}px, ${mouse[1] + 18}px)`;
      tip.classList.add('on');
    } else { tip.classList.remove('on'); delete tip.dataset.g; }

    if (frames < 3) dbg('frame' + frames);
    const tr0 = performance.now();
    renderer.render(scene, camera);
    if (window.__evDebug) (window.__evPerf ||= []).push([Math.round(now), Math.round(dt * 1000), step, Math.round((performance.now() - tr0) * 10) / 10]);
    if (frames < 3) dbg('rendered' + frames);
    drawLead(dt);

    // 느리면 해상도 낮춤: 90프레임마다 중앙값 > 22ms(약 45fps 미만)면 15 % 낮춤
    frames++;
    dts.push(dt);
    if (dts.length >= 90) {
      const med = dts.sort((a, b) => a - b)[45];
      dts.length = 0;
      if (med > 0.022 && quality > 0.5) { quality *= 0.85; resize(); }
    }
  };

  dbg('ready');
  try {
    load.querySelector('.pct').textContent = '준비';
    camera.position.set(9, 2, 6); camera.lookAt(0, 0.6, 0);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    renderer.compile(scene, camera);
    // 예열: Metal(ANGLE)은 처음 그리는 셰이더·혼합 조합을 그 자리에서 준비해 단계 전환 때 100 ms쯤 멈칫한다.
    // 모든 상태(차체 반쯤, 투시 외곽선, 덮개 반쯤, 충전 흐름, 브레이크 두 벌)를 한 번에 켠 채 화면에 두 번 그려 둔다(캔버스는 숨김)
    cv.style.visibility = 'hidden';
    for (const m of mats.body || []) { m.visible = true; m.opacity = 0.5; }
    for (const m of coverMats) { m.visible = true; m.opacity = 0.5; }
    ghosts.forEach((g) => { g.visible = true; });
    ghostMat.uniforms.uOp.value = 0.5;
    hvU.uPulse.value = 1;
    if (named.brakes) named.brakes.visible = true;
    bodyCalipers.forEach((o) => { o.visible = true; });
    for (let i = 0; i < 2; i++) {
      renderer.render(scene, camera);
      await new Promise((r) => requestAnimationFrame(r));
    }
    cv.style.visibility = '';
  } catch (e) { console.warn('셰이더 미리 준비 실패', e); }
  dbg('compiled');
  const start = () => { if (running) return; running = true; tPrev = performance.now(); requestAnimationFrame(loop); };
  const stop = () => { running = false; };
  R.on('slidechanged', (e) => (e.currentSlide === sec ? start() : stop()));
  if (R.getCurrentSlide() === sec) start();
  // 첫 프레임 뒤 로딩 표시 숨김
  requestAnimationFrame(() => setTimeout(() => load.classList.add('done'), 120));
  window.__ev = { scene, camera, renderer, S, parts, byGroup, named, setStep };
}

// 접지 그림자 텍스처: 가운데가 짙고 가장자리로 사라지는 타원(soft = 짙은 부분 비율)
function shadowTex(soft) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(soft * 0.6, 'rgba(0,0,0,.75)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function swapMat(root, from, to) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material = o.material.map((m) => (m === from ? to : m));
    else if (o.material === from) o.material = to;
  });
}

function guessGroup(name = '') {
  const n = name.toLowerCase();
  if (/pack|module|cooling_plate|bms/.test(n)) return 'battery';
  if (/^rear_(motor|reducer|inverter|driveshaft)/.test(n)) return 'rear_pe';
  if (/^front_(motor|reducer|inverter|driveshaft)/.test(n)) return 'front_pe';
  if (/iccu|charge|lv_battery/.test(n)) return 'charging';
  if (/hv_cable/.test(n)) return 'hv';
  if (/radiator|heat_pump|coolant/.test(n)) return 'thermal';
  return 'chassis';
}

// 스튜디오 환경맵: HDRI 대신 밝은 판(소프트박스·띠 조명)을 둘러 PMREM으로 굽는다
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#2B2F33');
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (w, h, pos, look, inten, col = '#ffffff') => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(inten), side: THREE.DoubleSide }));
    m.scale.set(w, h, 1); m.position.set(...pos); m.lookAt(...look); s.add(m);
  };
  add(9, 3.2, [0, 7, 0], [0, 0, 0], 3.0);                 // 위 큰 소프트박스
  add(12, 0.35, [0, 2.2, -7], [0, 1.2, 0], 2.4);          // 왼쪽 긴 띠
  add(12, 0.35, [0, 2.2, 7], [0, 1.2, 0], 2.4);           // 오른쪽 긴 띠
  add(12, 0.25, [0, 4.6, -6], [0, 0, 0], 1.6);
  add(12, 0.25, [0, 4.6, 6], [0, 0, 0], 1.6);
  add(3.5, 4, [8, 2.2, 0], [0, 1, 0], 1.3);   // 앞
  add(3.5, 4, [-8, 2.2, 0], [0, 1, 0], 0.9);  // 뒤(따뜻)
  add(20, 20, [0, -3, 0], [0, 0, 0], 0.05);               // 바닥 반사 아주 약하게
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}
