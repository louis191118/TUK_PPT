// kit3d — 발표 덱 3D 에셋을 스크립트로 만드는 도구 (Blender 없음).
// `deck.mjs build3d <장면.mjs> [-- 인자]`가 헤드리스 Chrome에서 runner.html을 열고, 장면 스크립트의 기본 내보내기를
// `await scene(dk)`로 부른다. dk = 이 모듈. 결과(GLB·PNG·JSON)는 dk.write*로 덱 폴더에 쓴다.
//
// 원칙 (references/3d-build.md):
// - 좌표는 three.js 그대로: 미터, +Y 위, 바닥 y = 0.
// - 색은 덱 theme.css 토큰(dk.tok), 숫자는 근거 장부(dk.num)에서만. 난수는 dk.rng(시드) — 같은 명령이면 같은 에셋.
// - 글자는 굽지 않는다. 라벨 자리는 anchors(화면 0~1)로 내보내고 HTML이 얹는다.
// - 도식 장면: 빛·그림자·접지 어둠을 정점 색으로 계산해(dk.bakeLight) unlit GLB. 대체 PNG는 같은 메시·같은 카메라로 찍는다.
// - 실물 조립품: 최상위 노드 = 부품 하나, userData(→ glTF extras) { part, group }, 원점 = 부품 경계상자 중심.
import * as THREE from '../../template/web/vendor/three/three.module.min.js';
import { GLTFExporter } from '../../template/web/vendor/three/addons/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from '../../template/web/vendor/three/addons/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from '../../template/web/vendor/three/addons/RoundedBoxGeometry.js';
import { studioEnv, blobShadow, loadGLB as loadGLBUrl } from '../../template/web/js/viz/stage3d.js';

export { THREE };
const DK = window.__DK || { args: [], tokens: {}, evidence: {}, deckUrl: '/deck/' };

// ──────────────────────────────────────────────── 인자 · 로그
export const args = DK.args;
export function arg(name, def) { const i = args.indexOf(name); return i >= 0 && i + 1 < args.length ? args[i + 1] : def; }
export const flag = (name) => args.includes(name);
export const log = (...a) => console.log('[kit3d]', ...a);
export function fail(msg) { throw new Error(msg); }

// ──────────────────────────────────────────────── 토큰 · 근거
export const tokens = DK.tokens;          // { bg: '#FFFFFF', accent: '#1B8A4E', ... } (theme.css --c-*)
export const evidence = DK.evidence;      // { id: item }
export const tok = (name, def) => tokens[name] || def || fail(`theme.css에 --c-${name} 없음`);
export function num(id, override) {
  if (override != null) return Number(override);
  const it = evidence[id];
  if (!it || it.value == null) fail(`근거 장부에 값 없음: ${id}`);
  return Number(it.value);
}
export const deckUrl = (rel) => DK.deckUrl + rel.replace(/^\/+/, '');

// 시드 난수 (mulberry32). rng() → 0~1, rng.uniform(a, b)
export function rng(seed = 7) {
  let s = seed >>> 0;
  const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.uniform = (a, b) => a + (b - a) * f();
  return f;
}

// ──────────────────────────────────────────────── 형상 (월드 좌표에 놓인 BufferGeometry)
const V = (a) => (a.isVector3 ? a : new THREE.Vector3(...a));
/** 상자. center = 상자 중심 [x, y, z], size = [sx, sy, sz]. bevel > 0이면 모서리를 둥글게. */
export function box(center, size, { bevel = 0 } = {}) {
  const [sx, sy, sz] = size;
  const g = bevel > 0 ? new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(bevel, sx / 2, sy / 2, sz / 2)) : new THREE.BoxGeometry(sx, sy, sz);
  return g.translate(...V(center).toArray());
}
/** 원통(축 = Y). rTop ≠ rBottom이면 원뿔대. */
export function cylinder(center, r, h, { segs = 48, rTop = r } = {}) {
  return new THREE.CylinderGeometry(rTop, r, h, segs).translate(...V(center).toArray());
}
export function sphere(center, r, { ws = 32, hs = 16 } = {}) {
  return new THREE.SphereGeometry(r, ws, hs).translate(...V(center).toArray());
}
/** 평면 격자(바닥). 굽기 해상도 = step. 바깥 고리 큰 판(ring)을 붙이면 화면 끝까지 바닥이 이어진다. */
export function ground([x0, x1], [z0, z1], { step = 0.3, ring = 60 } = {}) {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  if (!ring) return g;
  const plate = (a0, a1, b0, b1) => new THREE.PlaneGeometry(a1 - a0, b1 - b0).rotateX(-Math.PI / 2).translate((a0 + a1) / 2, 0, (b0 + b1) / 2);
  const R = ring;
  return merge([g, plate(-R, R, -R, z0), plate(-R, R, z1, R), plate(-R, x0, z0, z1), plate(x1, R, z0, z1)]);
}
/** 점 목록을 따라 둥근 관(경로·케이블). 끝은 평평하게 막는다(런타임이 그리는 중 머리 공을 얹는다). */
export function tube(points, r, { radial = 12, caps = true } = {}) {
  const P = points.map(V), n = P.length, pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    t.subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    a.crossVectors(t, Math.abs(t.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    b.crossVectors(a, t).normalize();
    for (let k = 0; k < radial; k++) {
      const th = (k / radial) * Math.PI * 2;
      pos.push(...new THREE.Vector3().copy(P[i]).addScaledVector(a, Math.cos(th) * r).addScaledVector(b, Math.sin(th) * r).toArray());
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const k2 = (k + 1) % radial, p = i * radial;
    idx.push(p + k, p + radial + k, p + k2, p + k2, p + radial + k, p + radial + k2);
  }
  if (caps) for (const [i, s] of [[0, 1], [n - 1, -1]]) {
    const c = pos.length / 3; pos.push(...P[i].toArray());
    for (let k = 0; k < radial; k++) { const k2 = (k + 1) % radial; s > 0 ? idx.push(c, i * radial + k2, i * radial + k) : idx.push(c, i * radial + k, i * radial + k2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 여러 형상을 하나로 (위치·법선·색만 남김). */
export function merge(geos) {
  const ok = geos.filter(Boolean).map((g) => {
    let h = g.index ? g.toNonIndexed() : g.clone();
    if (!h.attributes.normal) h.computeVertexNormals();
    for (const k of Object.keys(h.attributes)) if (!['position', 'normal', 'color'].includes(k)) h.deleteAttribute(k);
    return h;
  });
  const anyColor = ok.some((g) => g.attributes.color);
  if (anyColor) for (const g of ok) if (!g.attributes.color) paint(g, '#FFFFFF');
  const m = mergeGeometries(ok, false);
  if (!m) fail('merge: 형상 속성이 맞지 않음');
  return m;
}
/** 형상에 바탕색(토큰 hex)을 정점 색으로 칠한다(선형 색). bakeLight가 이 색에 빛을 곱한다. */
export function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// ──────────────────────────────────────────────── 경로 수학
export const pathLen = (P) => P.slice(1).reduce((s, p, i) => s + p.distanceTo(P[i]), 0);
/** 같은 간격(step)으로 다시 찍기. */
export function resample(P, step = 0.05) {
  const out = [P[0].clone()];
  let acc = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], seg = a.distanceTo(b);
    if (!seg) continue;
    let t = step - acc;
    while (t <= seg) { out.push(a.clone().lerp(b, t / seg)); t += step; }
    acc = (acc + seg) % step;
  }
  if (out.at(-1).distanceTo(P.at(-1)) > 1e-6) out.push(P.at(-1).clone());
  return out;
}
/** 꺾은선 모서리를 반지름 radius로 둥글게(2차 베지어). */
export function fillet(C, radius = 0.5, steps = 10) {
  const out = [C[0].clone()];
  for (let i = 1; i < C.length - 1; i++) {
    const a = C[i - 1], b = C[i], c = C[i + 1];
    const u = a.clone().sub(b).normalize(), w = c.clone().sub(b).normalize();
    const r = Math.min(radius, a.distanceTo(b) / 2, c.distanceTo(b) / 2);
    const p0 = b.clone().addScaledVector(u, r), p1 = b.clone().addScaledVector(w, r);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      out.push(p0.clone().multiplyScalar((1 - t) ** 2).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(p1, t * t));
    }
  }
  out.push(C.at(-1).clone());
  return out;
}
/** fn(x)가 단조일 때 fn(x) = target인 x. 근거 비율에 맞게 도식 형상을 풀 때 쓴다. */
export function bisect(fn, lo, hi, target, iters = 50) {
  let flo = fn(lo) - target;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2, fm = fn(mid) - target;
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

// ──────────────────────────────────────────────── 빛 굽기 (도식 장면: 정점 색)
// 흰 윗면(해를 받는 위쪽 면) = 바탕색 그대로(1.0)가 되게 하늘빛 sky + 햇빛 (1 − sky)를 나눈다. 더 밝게 하면 토큰 색이 날아간다.
// occluders = 그림자를 드리우는 상자들(THREE.Box3) — 건물·마커처럼 상자 모양인 것. 그림자는 해 방향 둘레 몇 갈래 광선으로 부드럽게.
// 접지 어둠(contact): 상자 아랫부분과 그 둘레 바닥을 살짝 어둡게(광선 AO 대신 해석적으로 — 겹친 모서리가 검게 번지지 않는다).
export function bakeLight(geo, { sun = [0.35, 0.82, -0.45], sky = 0.72, occluders = [], soft = 0.12, rays = 6, shadow = 0.85, contact = 0.28, reach = 0.6 } = {}) {
  if (!geo.attributes.color) fail('bakeLight: 먼저 paint()로 바탕색을 칠한다');
  const s = new THREE.Vector3(...sun).normalize();
  const sunK = (1 - sky) / Math.max(0.2, s.y);
  const dirs = [s.clone()];
  const t1 = new THREE.Vector3().crossVectors(s, new THREE.Vector3(0, 1, 0)).normalize(), t2 = new THREE.Vector3().crossVectors(t1, s);
  for (let k = 0; k < rays - 1; k++) { const a = (k / (rays - 1)) * Math.PI * 2; dirs.push(s.clone().addScaledVector(t1, Math.cos(a) * soft).addScaledVector(t2, Math.sin(a) * soft).normalize()); }
  const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), o = new THREE.Vector3(), ray = new THREE.Ray();
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
    const amb = sky * (0.62 + 0.38 * Math.max(0, n.y));         // 옆면은 하늘을 덜 본다
    const lam = Math.max(0, n.dot(s));
    let vis = 1;
    if (lam > 0 && occluders.length) {
      o.copy(p).addScaledVector(n, 1e-3);
      let lit = 0;
      for (const d of dirs) { ray.set(o, d); if (!occluders.some((b) => !b.containsPoint(o) && ray.intersectsBox(b))) lit++; }
      vis = 1 - shadow * (1 - lit / dirs.length);
    }
    let ao = 1;
    for (const b of occluders) {
      const h = b.max.y - b.min.y;
      if (p.y > b.max.y - 1e-4 && n.y > 0.5) continue;              // 윗면은 그대로
      const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x), dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
      const dxz = Math.hypot(dx, dz), r = reach * Math.min(1, 0.35 + h);
      if (dxz > r) continue;
      const near = 1 - smooth(0, r, dxz), low = 1 - smooth(b.min.y, b.min.y + Math.max(0.05, h * 0.9), p.y);
      ao = Math.min(ao, 1 - contact * near * low);
    }
    const k = (amb + sunK * lam * vis) * ao;
    C.setXYZ(i, C.getX(i) * k, C.getY(i) * k, C.getZ(i) * k);
  }
  C.needsUpdate = true;
  return geo;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1))); return t * t * (3 - 2 * t); };
/** 형상들의 경계상자(그림자 드리우는 물체 목록용). */
export const boxOf = (geo) => { geo.computeBoundingBox(); return geo.boundingBox.clone(); };

/** 구운 정점 색 메시(unlit). 이름이 런타임 장면 모듈이 찾는 이름이다. */
export function unlitMesh(name, geo) {
  const m = new THREE.Mesh(mergeVertices(geo, 1e-5), new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.name = name;
  return m;
}

// ──────────────────────────────────────────────── 카메라
/** 가로 화각·화면 비율로 PerspectiveCamera (three는 세로 화각을 쓴다). */
export function camera({ hfov = 39.6, aspect = 2200 / 1340 } = {}) {
  const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / aspect));
  return new THREE.PerspectiveCamera(vfov, aspect, 0.05, 500);
}
export function look(cam, pos, target) { cam.position.copy(V(pos)); cam.lookAt(V(target)); cam.updateMatrixWorld(true); }
/** 월드 점 → 화면 [u, v] (좌상단 0, 0~1). */
export function screen(cam, p) { const v = V(p).clone().project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2]; }
/** target에서 direction 쪽으로 물러난 카메라가 points를 화면 상자 [x, y, w, h](0~1) 안에 꼭 맞게 담도록
 *  거리와 바라보는 점을 맞춘다. 돌려줌: { position, target }. */
export function fitCamera(cam, target, direction, points, box = [0.1, 0.1, 0.8, 0.8], iters = 14) {
  let tgt = V(target).clone(), dist = 20;
  const dir = V(direction).clone().normalize(), P = points.map(V);
  const put = () => look(cam, tgt.clone().addScaledVector(dir, dist), tgt);
  const bounds = () => { const uv = P.map((p) => screen(cam, p)); const us = uv.map((q) => q[0]), vs = uv.map((q) => q[1]); return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]; };
  for (let i = 0; i < iters; i++) {
    put();
    let [u0, u1, v0, v1] = bounds();
    dist *= Math.max((u1 - u0) / box[2], (v1 - v0) / box[3]);
    put();
    [u0, u1, v0, v1] = bounds();
    const du = (u0 + u1) / 2 - (box[0] + box[2] / 2), dv = (v0 + v1) / 2 - (box[1] + box[3] / 2);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), halfW = halfH * cam.aspect;
    tgt.addScaledVector(right, du * 2 * halfW).addScaledVector(up, -dv * 2 * halfH);
  }
  put();
  return { position: cam.position.clone(), target: tgt };
}
/** 런타임(route3d.js 등)이 읽는 카메라 JSON. */
export function cameraJSON(cam, target, res) {
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect);
  return { position: r4(cam.position.toArray()), target: r4(V(target).toArray()), fov_vertical_deg: +cam.fov.toFixed(4),
    fov_horizontal_deg: +THREE.MathUtils.radToDeg(hfov).toFixed(4), aspect: +cam.aspect.toFixed(6), png_resolution: res };
}
export const r4 = (a) => a.map((x) => Math.round(x * 1e4) / 1e4);

// ──────────────────────────────────────────────── 그리기 · PNG
let R = null;
function renderer(w, h, look) {
  if (!R) {
    R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    R.outputColorSpace = THREE.SRGBColorSpace;
  }
  R.setPixelRatio(1); R.setSize(w, h, false);
  R.toneMapping = look === 'product' ? THREE.NeutralToneMapping : THREE.NoToneMapping;
  R.toneMappingExposure = 1;
  return R;
}
/** 장면을 찍어 2D 캔버스로. fade = [inner, outer]면 가장자리를 바탕색으로(런타임 edgeFade와 같은 초타원 식). */
export function render(scene, cam, { width = 2200, height = 1340, bg = '#FFFFFF', fade = null, look = 'diagram' } = {}) {
  const r = renderer(width, height, look);
  r.setClearColor(new THREE.Color(bg), 1);
  r.render(scene, cam);
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const g = c.getContext('2d');
  g.drawImage(r.domElement, 0, 0);
  if (fade) fadeCanvas(c, fade[0], fade[1], bg);
  return c;
}
export function fadeCanvas(c, inner = 0.62, outer = 0.98, bg = '#FFFFFF') {
  const g = c.getContext('2d'), { width: w, height: h } = c, img = g.getImageData(0, 0, w, h), d = img.data;
  const hx = bg.replace('#', ''), B = [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16));   // 캔버스 픽셀 = sRGB
  for (let y = 0; y < h; y++) {
    const qy = Math.abs((y + 0.5) / h * 2 - 1) ** 4;
    for (let x = 0; x < w; x++) {
      const fb = (Math.abs((x + 0.5) / w * 2 - 1) ** 4 + qy) ** 0.25;
      if (fb <= inner) continue;
      let k = Math.min(1, Math.max(0, (fb - inner) / (outer - inner))); k = k * k * (3 - 2 * k); k = k * k * (3 - 2 * k);
      const i = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) d[i + ch] = d[i + ch] * (1 - k) + B[ch] * k;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ──────────────────────────────────────────────── 실물 조립품
/** PBR 재질(실물 톤, 낮은 채도). emit = 빛나는 색. */
export function material(hex, { rough = 0.5, metal = 0, emit = null, emitK = 1, opacity = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
  if (emit) { m.emissive = new THREE.Color(emit); m.emissiveIntensity = emitK; }
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}
/** 부품 하나 = 최상위 노드 하나. meshes = [[geo, mat], ...] 또는 Mesh. 원점 = 경계상자 중심, userData { part, group, ...extra }. */
export function part(name, group, meshes, extra = {}) {
  const node = new THREE.Group();
  node.name = name;
  const list = meshes.map((m, i) => { const mm = m.isMesh ? m : new THREE.Mesh(m[0], m[1]); mm.name ||= `${name}_${i}`; return mm; });
  const bb = new THREE.Box3();
  list.forEach((m) => { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix)); });
  const c = bb.getCenter(new THREE.Vector3());
  // 같은 재질끼리 합쳐 노드를 가볍게
  const byMat = new Map();
  for (const m of list) { m.updateMatrix(); const g = m.geometry.clone().applyMatrix4(m.matrix).translate(-c.x, -c.y, -c.z); (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(g); }
  let k = 0;
  for (const [mat, geos] of byMat) { const mesh = new THREE.Mesh(mergeGeometries(geos.map(clean), false), mat); mesh.name = `${name}_${k++}`; node.add(mesh); }
  node.position.copy(c);
  node.userData = { part: name, group, ...extra };
  return node;
}
const clean = (g) => { const h = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(h.attributes)) if (!['position', 'normal'].includes(k)) h.deleteAttribute(k); return h; };
/** inspect3d 첫 단계와 같은 구도·빛으로 포스터(3D를 못 쓸 때 대신 보이는 그림). cam = { t, az, el, d } (도·미터), fov 세로 20°. */
export function poster(root, cam, { width = 1920, height = 1080, fov = 20, shadow = [6.6, 3.2], bg = '#FFFFFF' } = {}) {
  const r = renderer(width, height, 'product');
  const scene = new THREE.Scene();
  scene.environment = studioEnv(r);
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(2.5, 9, 3.5); scene.add(key);
  const rim = new THREE.DirectionalLight('#ffffff', 0.6); rim.position.set(-6, 3, -5); scene.add(rim);
  for (const m of [blobShadow(shadow[0], shadow[1], 0.16, 0.55), blobShadow(shadow[0] * 0.76, shadow[1] * 0.64, 0.2, 0.8)]) { m.position.y = 0.002; scene.add(m); }
  const parent = root.parent; scene.add(root);
  const c = new THREE.PerspectiveCamera(fov, width / height, cam.d * 0.02, cam.d * 30);
  const az = THREE.MathUtils.degToRad(cam.az), el = THREE.MathUtils.degToRad(cam.el), t = new THREE.Vector3(...cam.t);
  c.position.set(t.x + cam.d * Math.cos(el) * Math.cos(az), t.y + cam.d * Math.sin(el), t.z - cam.d * Math.cos(el) * Math.sin(az));
  c.lookAt(t);
  const out = render(scene, c, { width, height, bg, look: 'product' });
  if (parent) parent.add(root); else scene.remove(root);
  return out;
}
/** 맞춤 검사: inner 노드들의 정점 중 shell 경계상자 밖으로 나간 수(여유 tol 미터). */
export function outside(inner, shell, tol = 0) {
  const bb = new THREE.Box3().setFromObject(shell).expandByScalar(tol), p = new THREE.Vector3();
  let n = 0, all = 0;
  for (const node of [].concat(inner)) node.traverse((o) => {
    if (!o.isMesh) return;
    o.updateWorldMatrix(true, false);
    const P = o.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) { all++; if (!bb.containsPoint(p.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld))) n++; }
  });
  return { outside: n, total: all };
}

// ──────────────────────────────────────────────── 받은 모델 다듬기
/** 덱 폴더 기준 경로의 GLB를 읽는다(예: 'web/assets/_candidates/3d/x/model.glb'). */
export const loadGLB = (rel) => loadGLBUrl(deckUrl(rel));
/** 균일 축척: 경계상자 축(axis) 길이를 length(미터)로, 바닥 y = 0, 가로 중심 원점. */
export function normalize(root, { length, axis = 'x' } = {}) {
  let bb = new THREE.Box3().setFromObject(root);
  if (length) root.scale.multiplyScalar(length / (bb.max[axis] - bb.min[axis]));
  root.updateMatrixWorld(true);
  bb = new THREE.Box3().setFromObject(root);
  const c = bb.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(c.x, bb.min.y, c.z));
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}
/** 메시 하나를 연결된 섬(같은 위치 정점을 공유하는 삼각형 묶음)마다 새 메시로 나눈다. 돌려줌: Mesh[] (월드 좌표, 원래 재질). */
export function splitIslands(mesh, { minTris = 1 } = {}) {
  mesh.updateWorldMatrix(true, false);
  const g = mesh.geometry.index ? mesh.geometry : mergeVertices(mesh.geometry, 1e-6);
  const P = g.attributes.position, I = g.index.array, key = (i) => `${P.getX(i).toFixed(6)},${P.getY(i).toFixed(6)},${P.getZ(i).toFixed(6)}`;
  const id = new Map(), par = [];
  const vid = (i) => { const k = key(i); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } return id.get(k); };
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  const tv = [];
  for (let t = 0; t < I.length; t += 3) { const a = vid(I[t]), b = vid(I[t + 1]), c = vid(I[t + 2]); tv.push(a); par[find(a)] = find(b); par[find(b)] = find(c); }
  const groups = new Map();
  for (let t = 0; t < tv.length; t++) { const r = find(tv[t]); (groups.get(r) || groups.set(r, []).get(r)).push(t); }
  const out = [];
  for (const tris of groups.values()) {
    if (tris.length < minTris) continue;
    const idx = tris.flatMap((t) => [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]]);
    const h = g.clone(); h.setIndex(idx);
    const m = new THREE.Mesh(h.toNonIndexed().applyMatrix4(mesh.matrixWorld), mesh.material);
    m.name = `${mesh.name}_${out.length}`;
    out.push(m);
  }
  return out;
}
/** 메시를 규칙으로 부품 노드에 나눠 담는다. rules = [[정규식(메시·재질 이름), part, group], ...]. 남은 것은 rest 부품. */
export function regroup(root, rules, rest = ['body', 'shell']) {
  root.updateMatrixWorld(true);
  const bins = new Map(), meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const key = `${o.name} ${[].concat(o.material).map((m) => m.name).join(' ')}`;
    const hit = rules.find(([re]) => new RegExp(re, 'i').test(key)) || [null, ...rest];
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    (bins.get(hit[1]) || bins.set(hit[1], { group: hit[2], list: [] }).get(hit[1])).list.push([g, o.material]);
  }
  return [...bins].map(([name, b]) => part(name, b.group, b.list));
}

// ──────────────────────────────────────────────── 쓰기 (덱 폴더 기준 경로)
function put(rel, b64) { window.__dkWrite(JSON.stringify({ file: rel, b64 })); }
const toB64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
export function writePNG(rel, canvas) { put(rel, canvas.toDataURL('image/png').split(',')[1]); log('PNG', rel, `${canvas.width}×${canvas.height}`); }
export function writeJSON(rel, data) { put(rel, toB64(new TextEncoder().encode(JSON.stringify(data, null, 1) + '\n'))); log('JSON', rel); }
export async function writeGLB(rel, objects) {
  const scene = new THREE.Scene();
  for (const o of [].concat(objects)) scene.add(o);
  const buf = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  let tris = 0;
  scene.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  put(rel, toB64(buf));
  log(`GLB ${rel} · 삼각형 ${Math.round(tris).toLocaleString()} · ${(buf.byteLength / 1e6).toFixed(2)} MB`);
  return Math.round(tris);
}
