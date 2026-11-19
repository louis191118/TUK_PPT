// KPU_PPT 3D 에셋 소개(분해·해부) 장면 — 실물 모델 하나를 외관 → 투시 → 분해 → 부품별 초점 → 조립 순으로 보인다.
// 숨길 덱 숨김 장 "전기차 해부"(아이오닉 6 + E-GMP)를 설정만으로 다른 에셋에 쓸 수 있게 일반화한 것.
// 판단·에셋 준비는 `references/3d.md`(references/asset-research.md, references/runtime.md "에셋 소개").
//
// 장 HTML:
//   <figure class="viz inspect" data-viz="custom" data-module="viz/inspect3d.js">   ← module 경로는 web/js 기준
//     <script type="application/json">{ "models": [...], "groups": {...}, "steps": [...] }</script>
//   </figure>
// 장 기획(slides/<slug>.md): explore: true, steps = 단계 수 − 1 (단계 0이 첫 화면)
//
// 모델 계약 (references/asset-research.md "GLB 계약"):
// - 미터 단위, +Y 위, 지면 y=0. 모델 여러 개면 같은 좌표계.
// - 최상위 노드 하나 = 부품 하나. 노드 extras(userData) { part, group }. 원점 = 부품 경계상자 중심.
// - group은 cfg.groups의 키. 없으면 models[].group(그 파일 전부) → models[].groupBy(이름 정규식) 순으로 정한다.
//
// 설정(cfg):
//   models   [{ file, group?, groupBy?: { "정규식": "group" } }]   (web/ 기준 경로)
//   groups   { key: { name, explode: [x,y,z] (분해 방향·거리, 미터), order (0이 먼저), outward?: true (z 부호를 노드 자리 따라),
//                     shell?: true (외피: 칠 ↔ 투시 대상), flow?: true (초점일 때 흐르는 빛), sub?: { node: [x,y,z] } (부품 안쪽 분해) } }
//   steps    [{ name, paint (0..1 외피 칠), ghost (0..1 투시 외곽선), ex (0..1 분해), focus: [group], sub (0..1 부품 안쪽 분해),
//               tags: true (모든 그룹 이름표), anchor: group|node (카드 리더선 끝), pulse (0..1 flow 그룹 빛),
//               idleSpin: true (손대지 않으면 천천히 돔), cam: { t: [x,y,z], az, el, d } (도·도·미터),
//               card: { title, num?: 근거 id, note?: '글 {근거id} 글' } }]   ← 숫자는 근거 장부 id로만(num, {id})
//   poster   3D를 못 쓸 때 보일 같은 구도의 렌더 PNG(web/ 기준) — 꼭 둔다
//   kicker   왼쪽 위 작은 글자 · credit 오른쪽 위 출처 한 줄(에셋 장부 credit과 같게) · alt 그림 설명
//   paint    외피 칠 바꾸기 { match: "재질 이름 정규식", color, metalness, roughness, clearcoat }
//   unit     자동 거리 단위(미터). 비우면 모델 대각선 ÷ 5.5
//   shadow   [w, d] 접지 그림자 크기(미터, 물체 길이·폭의 1.4배쯤) · floorDrop 분해할 때 바닥이 내려가는 거리(미터)
import {
  THREE, createStage, watchSlide, loadGLB, want3d, damp, clamp01, ease, blobShadow, reducedMotion,
} from './stage3d.js';

const W = 1920, H = 1080;

export default async function draw(host, ctx) {
  const c = { kicker: '', credit: '', alt: '', shadow: [6.6, 3.2], floorDrop: 0.9, ...ctx.cfg };
  const G = c.groups || {};
  const STEPS = c.steps || [];
  const sec = ctx.section;
  sec.classList.add('ix-x');
  injectCss();
  Object.assign(host.style, { position: 'absolute', left: '0px', top: '0px', width: `${W}px`, height: `${H}px`, margin: 0 });

  // 글 층: 카드(이름·큰 숫자·한 줄) · 단계 목록 · 리더선 · 마우스 이름표 · 불러오기 막대
  const cardOf = (s) => {
    if (!s.card) return null;
    const n = s.card.num ? ctx.num(s.card.num) : null;   // 근거 장부 → 하단 출처 자동
    // 보조 줄의 숫자도 근거 id로: "18650 · 길이 {pb-cell-mm}" → "18650 · 길이 65mm"
    const note = String(s.card.note || '').replace(/\{([a-z0-9-]+)\}/g, (_, id) => { const v = ctx.num(id); return `${v.text}${v.unit || ''}`; });
    return { t: s.card.title, n: n?.text || '', u: n?.unit || '', s: note };
  };
  const cards = STEPS.map(cardOf);
  host.insertAdjacentHTML('beforeend', `
    <svg class="ix-lead" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>
    ${c.kicker ? `<p class="ix-kick">${esc(c.kicker)}</p>` : ''}
    ${c.credit ? `<p class="ix-credit">${esc(c.credit)}</p>` : ''}
    <div class="ix-card" aria-live="polite"><p class="ct"></p><p class="cn"><b></b><span></span></p><p class="cs"></p></div>
    <ol class="ix-steps">${STEPS.map((s, i) => `<li data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i>${esc(s.name)}</li>`).join('')}</ol>
    <div class="ix-load"><span class="bar"><i></i></span><span class="pct">0%</span></div>
    <p class="ix-tip"></p>`);
  const $ = (q) => host.querySelector(q);
  const lead = $('.ix-lead'), card = $('.ix-card'), tip = $('.ix-tip'), load = $('.ix-load');
  const stepsEl = [...host.querySelectorAll('.ix-steps li')];

  const st = createStage(host, ctx, { width: W, height: H, look: 'product', fov: 20, maxRatio: 1.6, alt: c.alt || '3D 모델. 드래그로 돌려 볼 수 있음', onLost: () => fallback() });
  const fallback = () => {
    load.classList.add('done');
    if (c.poster) st.image(new URL(`../../${c.poster}`, import.meta.url).href);   // 같은 카메라·빛의 포스터(build3d dk.poster) 한 장
    else console.error('inspect3d: 3D를 쓸 수 없는데 poster(대체 이미지)가 없다 — build3d의 dk.poster로 만든 PNG를 poster로');
  };
  if (!want3d(c)) { st.lost('no3d'); return st; }
  st.start3d();
  const { scene, camera, renderer } = st;
  st.wrap.style.zIndex = '0';
  const canvas = st.canvas;
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  canvas.style.pointerEvents = 'auto';
  // 클리핑 면은 물체 크기(첫 단계 카메라 거리)에 맞춘다: 차(10 m)든 손바닥 기기(0.4 m)든
  const d0 = (STEPS[0]?.cam?.d) || 10;
  camera.near = d0 * 0.02; camera.far = d0 * 30; camera.updateProjectionMatrix();

  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(2.5, 9, 3.5); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffffff', 0.6); rim.position.set(-6, 3, -5); scene.add(rim);
  const shadows = [blobShadow(c.shadow[0], c.shadow[1], 0.16, 0.55), blobShadow(c.shadow[0] * 0.76, c.shadow[1] * 0.64, 0.2, 0.8)];
  shadows.forEach((m) => scene.add(m));

  // ── 불러오기 ──
  const prog = c.models.map(() => 0);
  const showProg = () => {
    const p = prog.reduce((a, b) => a + b, 0) / prog.length;
    load.querySelector('.bar i').style.transform = `scaleX(${p})`;
    load.querySelector('.pct').textContent = `${Math.round(p * 100)}%`;
  };
  let gl;
  try {
    gl = await Promise.all(c.models.map((m, i) => loadGLB(new URL(`../../${m.file}`, import.meta.url).href, { onProgress: (p) => { prog[i] = p; showProg(); } })
      .then((g) => { prog[i] = 1; showProg(); return g; })));
  } catch (e) { st.lost(`모델 불러오기 실패: ${e.message || e}`); return st; }

  // ── 부품·그룹 ──
  const root = new THREE.Group();
  scene.add(root);
  const parts = [], byGroup = {}, named = {};
  gl.forEach((g, i) => {
    const m = c.models[i];
    for (const n of [...g.scene.children]) {
      root.add(n);
      let group = n.userData?.group || m.group;
      if (!group && m.groupBy) for (const [re, gname] of Object.entries(m.groupBy)) if (new RegExp(re, 'i').test(n.name)) { group = gname; break; }
      group ||= 'other';
      if (!G[group] && group !== 'other') console.warn('inspect3d: groups에 없는 그룹', group, n.name);
      n.userData.group = group;
      named[n.name] = n;
      (byGroup[group] ||= []).push(n);
      const gc = G[group] || {};
      const dir = new THREE.Vector3(...(gc.explode || [0, 0, 0]));
      if (gc.outward) dir.z *= Math.sign(n.position.z || 1);
      parts.push({ node: n, group, p0: n.position.clone(), dir, order: gc.order ?? 5 });
    }
  });
  root.updateMatrixWorld(true);
  // 크기 단위: 모델 대각선 ÷ 5.5 (승용차 ≈ 1, 손바닥 기기 ≈ 0.03). 자동 거리(부품 안쪽 분해)는 이 단위로 잰다
  const U = c.unit || boxOf(Object.values(byGroup).flat()).getSize(new THREE.Vector3()).length() / 5.5;
  // 부품 안쪽 분해: 그룹 중심 → 노드 중심(수평) 0.25~0.6 U, sub에 적은 노드는 그 벡터(미터) 그대로
  for (const [g, nodes] of Object.entries(byGroup)) {
    if (G[g]?.shell) continue;
    const c0 = boxOf(nodes).getCenter(new THREE.Vector3());
    for (const n of nodes) {
      const p = parts.find((q) => q.node === n);
      const v = boxOf([n]).getCenter(new THREE.Vector3()).sub(c0); v.y = 0;
      const len = v.length();
      p.sub = len > 1e-3 * U ? v.multiplyScalar(U * Math.min(0.6, 0.25 + (len / U) * 0.35) / len) : new THREE.Vector3();
      if (G[g]?.sub?.[n.name]) p.sub.set(...G[g].sub[n.name]);
    }
  }
  // 재질: 그룹마다 복제(어둡게·투명도를 그룹 단위로). 원래 값은 userData.base
  const mats = {};
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let top = o; while (top.parent && top.parent !== root) top = top.parent;
    const group = top.userData.group;
    const one = (m) => {
      const k = `${group}|${m.uuid}`;
      if (!cache.has(k)) {
        let mm = m.clone();
        if (c.paint && G[group]?.shell && new RegExp(c.paint.match || 'paint', 'i').test(m.name || '')) {
          mm = new THREE.MeshPhysicalMaterial({ name: 'paint', color: c.paint.color || '#E4E7EA', metalness: c.paint.metalness ?? 0.25, roughness: c.paint.roughness ?? 0.3, clearcoat: c.paint.clearcoat ?? 1, clearcoatRoughness: 0.04 });
        }
        mm.userData.base = { color: mm.color?.clone(), env: mm.envMapIntensity ?? 1, emissive: mm.emissive?.clone(), ei: mm.emissiveIntensity ?? 1, opacity: mm.opacity, transparent: mm.transparent };
        cache.set(k, mm);
        (mats[group] ||= new Set()).add(mm);
      }
      return cache.get(k);
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
  const shellGroups = Object.keys(G).filter((g) => G[g].shell);
  const shellMats = shellGroups.flatMap((g) => [...(mats[g] || [])]);
  // 외피는 처음부터 반투명(깊이는 기록): 사라질 때 셰이더가 바뀌지 않아 멈칫하지 않고, 안쪽 면이 겹쳐 비치지 않는다
  for (const m of shellMats) { if (!m.userData.base.transparent) { m.transparent = true; m.depthWrite = true; m.needsUpdate = true; } if (m.side === THREE.DoubleSide) m.forceSinglePass = true; }
  // 투시 외곽선: 외피 메시마다 프레넬 유령(같은 지오메트리)
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 0 }, uCol: { value: st.tok('--c-text-2', '#4E5968') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uOp; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uCol, (.025 + f * .55) * uOp); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, forceSinglePass: true,
  });
  const ghosts = [];
  for (const g of shellGroups) for (const n of byGroup[g] || []) n.traverse((o) => {
    if (!o.isMesh || o.userData.ghost) return;
    const gm = new THREE.Mesh(o.geometry, ghostMat); gm.userData.ghost = true; gm.renderOrder = 10; gm.raycast = () => {};
    o.add(gm); ghosts.push(gm);
  });
  // 흐르는 빛(flow 그룹): 초점 단계의 pulse로 켠다(전류·냉각수처럼 흐름이 설명인 부품)
  const flowU = { uTime: { value: 0 }, uPulse: { value: 0 }, uAcc: { value: st.tok('--c-accent', '#1B8A4E') } };
  for (const [g, gc] of Object.entries(G)) if (gc.flow) for (const m of mats[g] || []) {
    if (!m.emissive) continue;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, flowU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uTime, uPulse; uniform vec3 uAcc;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat ph = fract(vWp.x * .55 - uTime * .7);\nfloat band = smoothstep(0., .06, ph) * smoothstep(.22, .06, ph);\ntotalEmissiveRadiance += uAcc * (band * 4. + .3) * uPulse;');
    };
    m.customProgramCacheKey = () => 'ix-flow';
  }

  // ── 상태 ──
  const S = { paint: 1, ghost: 0, ex: 0, pulse: 0, shift: 0 };
  const subT = {}, dim = {};
  Object.keys(mats).forEach((g) => (dim[g] = 0));
  let step = 0, leadDraw = 0;
  const s0 = STEPS[0]?.cam || { t: [0, 0.6, 0], az: 38, el: 11, d: 10 };
  const cam = { t: new THREE.Vector3(...s0.t), az: s0.az, el: s0.el, d: s0.d };
  const user = { az: 0, el: 0, z: 1 };
  let autoAz = 0, lastInput = -1e9;
  const setStep = (i) => {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    leadDraw = 0;
    stepsEl.forEach((li, j) => { li.classList.toggle('on', j === step); li.classList.toggle('done', j < step); });
    const k = cards[step];
    card.classList.toggle('on', !!k);
    if (k) {
      card.querySelector('.ct').textContent = k.t;
      card.querySelector('.cn').hidden = !k.n;
      card.querySelector('.cn b').textContent = k.n;
      card.querySelector('.cn span').textContent = k.u;
      card.querySelector('.cs').textContent = k.s;
    }
  };
  stepsEl.forEach((li) => li.addEventListener('click', () => window.Reveal?.slide(window.Reveal.getIndices(sec).h, 0, Number(li.dataset.i) - 1)));

  // ── 입력: 드래그 회전 · 휠 거리 · 두 번 눌러 처음 자리 · 마우스 올리면 부품 그룹 이름 ──
  let drag = null, mouse = null;
  const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: user.az, el: user.el }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; lastInput = performance.now(); st.kick(); });
  canvas.addEventListener('pointermove', (e) => {
    mouse = toLocal(e);
    st.kick();
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    user.az = drag.az - (e.clientX - drag.x) / r.width * 260;
    user.el = Math.max(-25, Math.min(60, drag.el + (e.clientY - drag.y) / r.height * 90));
    lastInput = performance.now();
  });
  const up = () => { drag = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); user.z = Math.max(0.65, Math.min(1.5, user.z * Math.exp(e.deltaY * 0.0012))); lastInput = performance.now(); st.kick(); }, { passive: false });
  canvas.addEventListener('dblclick', () => { user.az = 0; user.el = 0; user.z = 1; st.kick(); });

  const anchorOf = (k) => {
    const nodes = named[k] ? [named[k]] : byGroup[k];
    if (!nodes?.length) return null;
    const b = boxOf(nodes), p = b.getCenter(new THREE.Vector3());
    p.y = Math.max(p.y, b.max.y - 0.02);
    return p;
  };
  const ray = new THREE.Raycaster();
  const pick = () => {
    if (!mouse || drag) return null;
    ray.setFromCamera(new THREE.Vector2(mouse[0] / W * 2 - 1, -(mouse[1] / H) * 2 + 1), camera);
    let best = null, bd = Infinity;
    for (const g of Object.keys(byGroup)) {
      if (G[g]?.shell && S.paint > 0.5) continue;
      const hit = ray.ray.intersectBox(boxOf(byGroup[g]), new THREE.Vector3());
      if (!hit) continue;
      const d = hit.distanceTo(ray.ray.origin) + (G[g]?.shell ? 3 : 0);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  };

  // ── 이름표·리더선 (SVG, 화면 px) ──
  const tagGroups = Object.keys(G).filter((g) => !G[g].shell && byGroup[g]);
  const drawLead = (dt) => {
    const s = STEPS[step] || {};
    leadDraw = Math.min(1, leadDraw + dt * 1.6);
    let html = '';
    if (s.tags && S.ex > 0.85) {
      const a = clamp01((S.ex - 0.85) / 0.15) * leadDraw;
      const pts = tagGroups.map((k) => { const v = anchorOf(k); return v && { k, p: st.project(v) }; }).filter((q) => q && q.p[0] > 0 && q.p[0] < W && q.p[1] > 0 && q.p[1] < H);
      const col = (arr, x, end) => {
        let yPrev = 300;
        for (const q of arr.sort((p1, p2) => p1.p[1] - p2.p[1])) {
          const y = Math.max(yPrev + 58, Math.min(900, q.p[1])); yPrev = y;
          html += `<g opacity="${a.toFixed(3)}"><circle cx="${q.p[0]}" cy="${q.p[1]}" r="5"/><polyline points="${q.p[0]},${q.p[1]} ${x},${y}"/><text x="${end ? x - 18 : x + 18}" y="${y + 8}" text-anchor="${end ? 'end' : 'start'}">${esc(G[q.k].name || q.k)}</text></g>`;
        }
      };
      col(pts.filter((q) => q.p[0] < W / 2), 360, true);
      col(pts.filter((q) => q.p[0] >= W / 2), 1560, false);
    }
    if (cards[step] && s.anchor) {
      const v = anchorOf(s.anchor) || anchorOf(s.focus?.[0]);
      const P = v && st.project(v);
      if (P && P[0] > 0 && P[0] < W && P[1] > 0 && P[1] < H && P[2] < 1) {   // 화면 밖 기준점에는 리더선을 긋지 않는다
        const [x, y] = P, cx = W - 144 - 520 - 36, cy = 392;
        const k = ease.smoother(clamp01(leadDraw * 1.2 - 0.2)), mx = x + (cx - 60 - x) * 0.55;
        html += `<g><circle class="acc" cx="${x}" cy="${y}" r="${(7 * k).toFixed(2)}"/><polyline class="acc" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - k).toFixed(3)}" points="${x},${y} ${mx},${cy} ${cx},${cy}"/></g>`;
      }
    }
    lead.innerHTML = html;
  };

  // ── 매 프레임 (장이 보이는 동안 계속: 드래그·유휴 회전·감쇠가 있다) ──
  const tmp = new THREE.Vector3();
  let time = 0, frames = 0;
  st.continuous = true;
  st.frame((dt) => {
    time += dt;
    const s = STEPS[step] || {};
    const r = reducedMotion();
    const k = damp(r ? 30 : 3.2, dt);
    S.paint += ((s.paint ?? 0) - S.paint) * k;
    S.ghost += ((s.ghost ?? 0) - S.ghost) * k;
    S.ex += ((s.ex ?? 0) - S.ex) * damp(r ? 30 : 1.9, dt);
    S.pulse += ((s.pulse ?? 0) - S.pulse) * k;
    S.shift += ((cards[step] ? 1 : 0) - S.shift) * damp(2.4, dt);
    for (const g of Object.keys(byGroup)) {
      const want = s.focus?.includes(g) ? (s.sub ?? 0) : 0;
      subT[g] = (subT[g] ?? 0) + (want - (subT[g] ?? 0)) * damp(r ? 30 : 2.2, dt);
    }
    // 분해: 그룹 순서대로 겹치며(앞 그룹이 반쯤 갔을 때 다음 시작)
    for (const p of parts) {
      const t = ease.smoother(clamp01(S.ex * 1.9 - p.order * 0.18));
      p.node.position.copy(p.p0).addScaledVector(p.dir, t);
      if (p.sub) p.node.position.addScaledVector(p.sub, ease.smoother(clamp01(subT[p.group] || 0)));
    }
    const fy = 0.002 - c.floorDrop * ease.smoother(clamp01(S.ex * 1.9 - 0.36));
    shadows.forEach((m) => { m.position.y = fy; });
    for (const m of shellMats) { m.opacity = m.userData.base.opacity * S.paint; m.visible = S.paint > 0.01; }
    const gop = S.ghost * (1 - S.paint);
    ghostMat.uniforms.uOp.value = gop;
    ghosts.forEach((g) => { g.visible = gop > 0.004; });
    // 초점 밖은 흐리게(밝은 쪽으로) — 숨기지 않는다: 숨겼다 다시 보이면 GPU 업로드로 멈칫한다
    for (const g of Object.keys(mats)) {
      const want = s.focus && !s.focus.includes(g) ? (G[g]?.shell ? 0.4 : 0.78) : 0;
      dim[g] += (want - dim[g]) * k;
      for (const m of mats[g]) {
        const b = m.userData.base;
        if (b.color && m.color) m.color.copy(b.color).lerp(WHITE, dim[g] * 0.6);
        m.envMapIntensity = b.env * (0.35 + 0.65 * (1 - dim[g]));
        if (!G[g]?.flow && m.emissive) { m.emissive.copy(b.emissive || BLACK).lerp(WHITE, dim[g]); m.emissiveIntensity = (b.ei ?? 1) * (1 - dim[g]) + 0.92 * dim[g]; }
      }
    }
    flowU.uTime.value = time; flowU.uPulse.value = S.pulse;
    // 카메라: 단계 자세 + 드래그 + 유휴(3.5초) 때 idleSpin이면 천천히 돔, 아니면 처음 자리로 돌아감
    const cs = s.cam || s0;
    const kc = damp(r ? 30 : 1.6, dt);
    cam.t.lerp(tmp.set(...cs.t), kc);
    cam.az += (cs.az - cam.az) * kc; cam.el += (cs.el - cam.el) * kc; cam.d += (cs.d - cam.d) * kc;
    const idle = performance.now() - lastInput > 3500 && !drag;
    if (s.idleSpin && idle && !r) autoAz += dt * 3.5; else autoAz += (0 - autoAz) * damp(0.6, dt);
    if (idle && !s.idleSpin) { user.az += (0 - user.az) * damp(0.8, dt); user.el += (0 - user.el) * damp(0.8, dt); }
    const az = THREE.MathUtils.degToRad(cam.az + user.az + autoAz), el = THREE.MathUtils.degToRad(Math.max(-8, Math.min(75, cam.el + user.el))), d = cam.d * user.z;
    camera.position.set(cam.t.x + d * Math.cos(el) * Math.cos(az), cam.t.y + d * Math.sin(el), cam.t.z - d * Math.cos(el) * Math.sin(az));
    camera.lookAt(cam.t);
    camera.setViewOffset(W, H, S.shift * 250, 0, W, H);   // 카드가 있으면 그림을 왼쪽으로 비킨다
    camera.updateMatrixWorld();
    const hov = frames++ % 4 === 0 ? pick() : tip.dataset.g || null;
    if (hov && mouse && S.paint < 0.6) {
      tip.dataset.g = hov; tip.textContent = G[hov]?.name || hov;
      tip.style.transform = `translate(${mouse[0] + 18}px, ${mouse[1] + 18}px)`; tip.classList.add('on');
    } else { tip.classList.remove('on'); delete tip.dataset.g; }
    queueMicrotask(() => drawLead(dt));
    return true;
  });

  // 셰이더 예열: 모든 상태(외피 반쯤·투시·흐름)를 켠 채 두 번 그려 첫 전환의 멈칫을 없앤다
  load.querySelector('.pct').textContent = '준비';
  camera.position.set(9, 2, 6); camera.lookAt(0, 0.6, 0);
  await st.prewarm(() => {
    for (const m of shellMats) { m.visible = true; m.opacity = 0.5; }
    ghosts.forEach((g) => { g.visible = true; }); ghostMat.uniforms.uOp.value = 0.5; flowU.uPulse.value = 1;
  });
  requestAnimationFrame(() => setTimeout(() => load.classList.add('done'), 120));

  watchSlide(sec, {
    enter(n) { setStep(n); st.kick(); },
    step(n) { setStep(n); st.kick(); },
    leave() { st.stop(); },
  }, st);
  window.__inspect3d = { scene, camera, renderer, S, parts, byGroup, named, setStep };
  return st;
}

const WHITE = new THREE.Color(1, 1, 1), BLACK = new THREE.Color(0, 0, 0);
function boxOf(nodes) { const b = new THREE.Box3(); nodes.forEach((n) => b.expandByObject(n)); return b; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

function injectCss() {
  if (document.getElementById('ix-css')) return;
  const st = document.createElement('style');
  st.id = 'ix-css';
  st.textContent = `
  section.ix-x .s3d { z-index: 0; }
  section.ix-x .ix-lead { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; pointer-events: none; overflow: visible; z-index: 1; }
  section.ix-x .ix-lead polyline { stroke: var(--c-text-3); stroke-width: 2; fill: none; }
  section.ix-x .ix-lead .acc { stroke: var(--c-accent); stroke-width: 3; }
  section.ix-x .ix-lead circle { fill: var(--c-text-2); }
  section.ix-x .ix-lead circle.acc { fill: var(--c-accent); }
  section.ix-x .ix-lead text { font: 600 var(--fs-tick, 28px) var(--f); fill: var(--c-text-2); paint-order: stroke; stroke: var(--c-halo); stroke-width: 8px; stroke-linejoin: round; }
  section.ix-x .ix-kick, section.ix-x .ix-credit { position: absolute; top: 64px; margin: 0; z-index: 1; line-height: 1.3; color: var(--c-text-3); }
  section.ix-x .ix-kick { left: var(--pad-x, 144px); font-size: var(--fs-tick, 28px); font-weight: 600; white-space: nowrap; }
  section.ix-x .ix-credit { right: var(--pad-x, 144px); width: 760px; font-size: var(--fs-note, 24px); text-align: right; }
  section.ix-x .ix-card { position: absolute; right: var(--pad-x, 144px); top: 330px; width: 520px; z-index: 1; opacity: 0; transform: translateX(24px); transition: opacity 500ms var(--ease-out, ease-out), transform 700ms var(--ease-out, ease-out); pointer-events: none; }
  section.ix-x .ix-card.on { opacity: 1; transform: none; }
  section.ix-x .ix-card p { position: static; margin: 0; white-space: nowrap; }
  section.ix-x .ix-card .ct { font-size: var(--fs-lede, 44px); font-weight: 700; letter-spacing: -.03em; line-height: 1.2; color: var(--c-text); }
  section.ix-x .ix-card .cn[hidden] { display: none; }
  section.ix-x .ix-card .cn { margin-top: 24px; display: flex; align-items: baseline; gap: 8px; color: var(--c-accent); }
  section.ix-x .ix-card .cn b { font-size: var(--fs-hero, 190px); font-weight: 700; letter-spacing: -.05em; line-height: .9; font-variant-numeric: tabular-nums; }
  section.ix-x .ix-card .cn span { font-size: 72px; font-weight: 700; letter-spacing: -.03em; }
  section.ix-x .ix-card .cs { margin-top: 32px; font-size: var(--fs-tick, 28px); font-weight: 500; line-height: 1.35; color: var(--c-text-3); }
  section.ix-x .ix-steps { position: absolute; left: var(--pad-x, 144px); bottom: 40px; z-index: 1; display: flex; gap: 32px; margin: 0; padding: 0; list-style: none; font-size: var(--fs-tick, 28px); font-weight: 600; color: var(--c-text-4); white-space: nowrap; }
  section.ix-x .ix-steps li { position: relative; display: flex; gap: 8px; align-items: baseline; transition: color .4s; cursor: pointer; }
  section.ix-x .ix-steps li i { font-style: normal; font-size: var(--fs-note, 24px); font-variant-numeric: tabular-nums; }
  section.ix-x .ix-steps li::before { content: ''; position: absolute; left: 0; right: 0; top: -14px; height: 4px; border-radius: 2px; background: var(--c-accent); transform: scaleX(0); transform-origin: 0 50%; transition: transform 600ms var(--ease-out, ease-out); }
  section.ix-x .ix-steps li.on { color: var(--c-text); }
  section.ix-x .ix-steps li.on::before { transform: none; }
  section.ix-x .ix-steps li.done { color: var(--c-text-3); }
  section.ix-x .ix-load { position: absolute; left: 50%; top: 600px; z-index: 1; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; transition: opacity .6s; }
  section.ix-x .ix-load.done { opacity: 0; pointer-events: none; }
  section.ix-x .ix-load .bar { position: relative; width: 320px; height: 4px; border-radius: 2px; background: var(--c-hair); overflow: hidden; }
  section.ix-x .ix-load .bar i { position: absolute; inset: 0; background: var(--c-accent); transform-origin: 0 50%; transform: scaleX(0); transition: transform .2s; }
  section.ix-x .ix-load .pct { font-size: var(--fs-note, 24px); font-weight: 600; color: var(--c-text-3); font-variant-numeric: tabular-nums; width: 64px; }
  section.ix-x .ix-tip { position: absolute; left: 0; top: 0; z-index: 2; margin: 0; font-size: var(--fs-tick, 28px); font-weight: 700; color: var(--c-text); white-space: nowrap; opacity: 0; transition: opacity .2s; pointer-events: none; text-shadow: 0 0 6px #fff, 0 0 6px #fff, 0 0 12px #fff; }
  section.ix-x .ix-tip.on { opacity: 1; }
  section.ix-x .foot-l { display: none; }`;
  document.head.append(st);
}
