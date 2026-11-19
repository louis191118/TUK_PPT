// 3D 도식 지도 예 (`references/3d.md`의 출발점 모듈). 숨길 덱 표지·01장 hero-map.js를 stage3d로 줄인 것.
// 에셋: assets/3d/route-city.{glb,json,-0/1/2.png} ← 스킬 scripts/3d/route-city.mjs (deck.mjs build3d, 빛을 정점 색에 굽기)
// 단계: 0 도시 + 출발·도착 → 1 긴(회색) 길이 그려짐 → 2 짧은(강조) 길이 그려짐. 두 길은 같은 속도(길이 비율만큼 시간)
// 정직성: 그린 두 길이의 비율 = 근거 비율(num). 3% 넘게 다르면 console.error → 검수 ERROR
// 대체: ?no3d · WebGL 없음 · 실패 → 같은 카메라 PNG + 같은 라벨(anchors)
import {
  THREE, createStage, watchSlide, loadGLB, loadJSON, want3d, Polyline, checkRatio,
  tagProgress, progressMaterial, edgeFade, Tweens, ease, merge,
} from '../viz/stage3d.js';

const DEFAULTS = {
  file: 'route-city',
  width: 1100, height: 670, left: 0, top: 0,           // 칸(px). 비율 = PNG 비율(2200×1340)이면 카메라가 똑같다
  steps: [{ long: 0, short: 0, cam: 1.07 }, { long: 1, short: 0, cam: 1.035 }, { long: 1, short: 1, cam: 1 }],
  drawSec: 1.3, camSec: 1.0, backSec: 0.6,              // 짧은 길 그리는 시간 · 카메라 · 지우기(초)
  labels: {
    origin: { text: '출발', side: 'below', dy: 30 },
    destination: { text: '도착', side: 'above', dy: -10 },
    long: { name: '실시간 추천', at: 0.62, side: 'right', dx: 40, dy: 28 },
    short: { name: '거리우선', at: 0.36, side: 'left', dx: -52, dy: -36 },
  },
  note: '지도 도식 · 실제 경로 형상 아님',
  alt: '',
};

export default async function draw(host, ctx) {
  const c = merge(DEFAULTS, ctx.cfg || {});
  if (Array.isArray(ctx.cfg?.steps)) c.steps = ctx.cfg.steps;
  const url = (f) => new URL(`../../assets/3d/${f}`, import.meta.url).href;
  const J = await loadJSON(url(`${c.file}.json`));
  const lines = { short: new Polyline(J.routes.short.points), long: new Polyline(J.routes.long.points) };
  const km = { short: ctx.num(J.routes.short.num), long: ctx.num(J.routes.long.num) };
  checkRatio(`route3d(${c.file})`, lines.long.len / lines.short.len, km.long.value / km.short.value);

  const st = createStage(host, ctx, { width: c.width, height: c.height, left: c.left, top: c.top, look: 'diagram', note: c.note, alt: c.alt, onLost: () => usePng() });
  const L = c.labels;
  st.label('origin', { parts: [[L.origin.text]], cls: 'pin' });
  st.label('destination', { parts: [[L.destination.text]], cls: 'pin' });
  st.label('long', { parts: [[L.long.name], [`${km.long.text}${km.long.unit}`]], leader: true });
  st.label('short', { parts: [[L.short.name], [`${km.short.text}${km.short.unit}`]], cls: 'pk', leader: true });

  const S = { long: 0, short: 0, dist: 1 };   // 지금 상태(트윈이 움직이는 값)
  const T = new Tweens();
  let three = null;                             // 3D 부품(실패하면 null)

  // ── 3D ──
  async function build3d() {
    st.start3d();
    const gltf = await loadGLB(url(J.files.glb));
    const routes = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name.replace(/[._]\d+$/, '');
      o.material = new THREE.MeshBasicMaterial({ vertexColors: !!o.geometry.attributes.color });
      if (name === 'route_short' || name === 'route_long') {
        const key = name.slice(6);
        tagProgress(o.geometry, lines[key]);
        progressMaterial(o.material);
        o.renderOrder = 2;
        routes[key] = o;
      } else if (!name.startsWith('marker')) edgeFade(o.material, st, { inner: J.fade[0], outer: J.fade[1] });
    });
    if (!routes.short || !routes.long) throw new Error(`${J.files.glb}에 route_short·route_long 없음`);
    st.scene.add(gltf.scene);
    // 그리는 중의 둥근 머리(경로 색 = 구운 정점 색 중 밝은 쪽 평균)
    const heads = {};
    for (const k of ['short', 'long']) {
      heads[k] = new THREE.Mesh(new THREE.SphereGeometry(J.routes[k].tube_radius, 24, 16), new THREE.MeshBasicMaterial({ color: topColor(routes[k]) }));
      heads[k].renderOrder = 3;
      st.scene.add(heads[k]);
    }
    const cam = J.camera;
    st.camera.fov = cam.fov_vertical_deg;
    st.camera.aspect = c.width / c.height;
    st.camera.updateProjectionMatrix();
    three = { routes, heads, tgt: new THREE.Vector3(...cam.target), dir: new THREE.Vector3(...cam.position).sub(new THREE.Vector3(...cam.target)) };
    apply();
    await st.prewarm();
  }

  function apply() {
    if (three) {
      for (const k of ['short', 'long']) {
        const p = S[k], u = three.routes[k].material.userData.u;
        u.uProg.value = p >= 0.999 ? 2 : p;
        three.routes[k].visible = p > 0.0005;
        three.heads[k].visible = p > 0.002 && p < 0.999;
        if (three.heads[k].visible) lines[k].at(p, three.heads[k].position);
      }
      st.camera.position.copy(three.tgt).addScaledVector(three.dir, S.dist);
      st.camera.lookAt(three.tgt);
      st.camera.updateMatrixWorld();
      const up = (k) => lines[k].at(L[k].at).add(new THREE.Vector3(0, J.routes[k].tube_radius, 0));
      st.place('origin', st.project(new THREE.Vector3(...J.markers.origin.top)), L.origin);
      st.place('destination', st.project(new THREE.Vector3(...J.markers.destination.pin_top)), L.destination);
      st.place('long', st.project(up('long')), L.long);
      st.place('short', st.project(up('short')), L.short);
    }
    st.show('origin', true);
    st.show('destination', true);
    st.show('long', S.long >= L.long.at + 0.04);    // 경로 머리가 라벨 자리를 지난 뒤
    st.show('short', S.short >= L.short.at + 0.04);
  }

  // ── 대체: 같은 카메라 PNG + anchors로 같은 자리에 라벨 ──
  function usePng() {
    three = null;
    const A = J.anchors, [rw, rh] = A.resolution;
    const k = Math.min(c.width / rw, c.height / rh), ox = (c.width - rw * k) / 2, oy = (c.height - rh * k) / 2;
    const m = ([u, v]) => [ox + u * rw * k, oy + v * rh * k];
    const along = (arr, f) => arr[Math.round(Math.min(1, Math.max(0, f)) * (arr.length - 1))];
    st.place('origin', m(A.origin), L.origin);
    st.place('destination', m(A.destination), L.destination);
    st.place('long', m(along(A.long, L.long.at)), L.long);
    st.place('short', m(along(A.short, L.short.at)), L.short);
  }
  const showPng = (n) => {
    const s = c.steps[Math.min(n, c.steps.length - 1)];
    st.image(url(J.files.png[s.short ? 2 : s.long ? 1 : 0]));
  };

  if (want3d(c)) {
    try { await build3d(); } catch (e) { st.lost(e.message || e); }
  } else st.lost('no3d');

  // ── 단계 ──
  st.frame((dt, now) => { const live = T.tick(now); apply(); return live; });
  const target = (n) => c.steps[Math.min(Math.max(0, n), c.steps.length - 1)];
  watchSlide(ctx.section, {
    enter(n) {   // 바로 놓기
      const s = target(n);
      T.list = [];
      Object.assign(S, { long: s.long, short: s.short, dist: s.cam });
      apply();
      if (st.mode === 'fallback') showPng(n); else st.render();
    },
    step(n) {
      const s = target(n);
      for (const k of ['long', 'short']) {
        if (S[k] === s[k]) continue;
        const fwd = s[k] > S[k];
        const dur = fwd ? c.drawSec * 1000 * (lines[k].len / lines.short.len) : c.backSec * 1000;
        T.to(S, k, s[k], dur, fwd ? ease.drive : ease.inOut);
      }
      T.to(S, 'dist', s.cam, c.camSec * 1000, ease.inOut);
      if (st.mode === 'fallback') { T.finish(); apply(); showPng(n); } else st.kick();
    },
    leave() { T.finish(); apply(); st.render(); },
  }, st);
  return st;
}

// 구운 정점 색 중 밝은 쪽 4분의 1 평균 = 위를 향한 면의 색
function topColor(mesh) {
  const col = mesh.geometry.attributes.color;
  if (!col) return mesh.material.color.clone();
  const arr = [];
  for (let i = 0; i < col.count; i++) arr.push([col.getX(i), col.getY(i), col.getZ(i)]);
  arr.sort((p, q) => q[0] + q[1] + q[2] - (p[0] + p[1] + p[2]));
  const top = arr.slice(0, Math.max(1, arr.length >> 2));
  const s = top.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  return new THREE.Color(s[0] / top.length, s[1] / top.length, s[2] / top.length);
}
