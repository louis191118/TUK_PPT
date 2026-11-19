// 예시 장면: 도식 도시 위 두 경로 (갤러리 `scene3d` 장, 숨길 덱 표지·01장 지도의 축소판).
// 흰 도식 도시(옅은 바닥·도로선·낮은 블록) 위에 출발 원판 → 도착 핀, 회색(긴) 경로와 강조색(짧은) 경로.
// 두 경로 중심선 길이 비율 = 두 근거 값 비율(--long ÷ --short). 회색 경로의 우회 폭을 이분법으로 풀어 맞춘다.
//
// 출력 (덱 web/assets/3d/):
//   route-city.glb        빛·그림자를 정점 색으로 구운 unlit 메시 (ground · buildings · marker_origin · marker_dest · route_short · route_long)
//   route-city.json       카메라 · 마커 · 경로 중심선 · PNG 위 라벨 자리(anchors) · 파일 이름
//   route-city-0/1/2.png  WebGL 실패용 같은 카메라 그림 (0 = 경로 없음, 1 = 긴 경로만, 2 = 둘 다)
//
// 사용 (덱 폴더 안에서):
//   node <스킬>/scripts/deck.mjs build3d route-city -- --short km-b --long km-a
//       [--res 2200x1340] [--fit 0.12,0.13,0.76,0.72] [--fade 0.8,1.0] [--keep-out u0,v0,u1,v1;...] [--only png|glb] [--seed 7] [--name route-city]
// 내 덱용으로 고칠 때는 deck/tools/3d/<slug>.mjs로 복사해 장면을 바꾸고 경로로 돌린다.
export default async function (dk) {
  const { THREE } = dk;
  const SHORT_ID = dk.arg('--short', 'km-b'), LONG_ID = dk.arg('--long', 'km-a');
  const KM_S = dk.num(SHORT_ID), KM_L = dk.num(LONG_ID);
  const NAME = dk.arg('--name', 'route-city'), OUT = dk.arg('--out', 'web/assets/3d');
  const RES = dk.arg('--res', '2200x1340').split('x').map(Number);
  const FIT = dk.arg('--fit', '0.12,0.13,0.76,0.72').split(',').map(Number);
  const FADE = dk.arg('--fade', '0.8,1.0').split(',').map(Number);
  const KEEP = dk.arg('--keep-out', '').split(';').filter(Boolean).map((b) => b.split(',').map(Number));
  const ONLY = dk.arg('--only', 'png,glb').split(',');
  const rand = dk.rng(Number(dk.arg('--seed', 7)));
  const C = { bg: dk.tok('bg', '#FFFFFF'), ground: dk.tok('surface', '#F2F4F6'), building: dk.tok('hair', '#E5E8EB'),
    ink: dk.tok('text', '#191F28'), bar: dk.tok('bar', '#D1D6DB'), accent: dk.tok('accent', '#1B8A4E') };

  // 지도 좌표 (x, y) → three (x, 높이, −y). 위에서 본 지도처럼 생각하고 쓴다
  const g = (x, y, h = 0) => new THREE.Vector3(x, h, -y);

  // ── 도시 격자 (도식: 실제 도로 아님) ──
  const XS = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];   // 세로 도로 x
  const YS = [-5.5, -2.5, 0.5, 3.5, 6.5];         // 가로 도로 y
  const RW = 0.34;                                 // 도로선 폭
  const [G0, G1, H0, H1] = [-12, 12, -10, 10];
  const ORIGIN = g(-4.5, -5.5), DEST = g(4.5, 6.5);

  // ── 두 경로 ──
  const shortPath = () => dk.resample(dk.fillet([ORIGIN, g(-4.5, -2.5), g(-1.5, -2.5), g(-1.5, 0.5), g(1.5, 0.5), g(1.5, 3.5), g(4.5, 3.5), DEST], 0.45), 0.05);
  // 바깥으로 도는 길(동쪽으로 갔다가 북쪽). t가 클수록 길다(단조). t < 0: 모서리 반지름을 키워 짧게 · t ≥ 0: 남·동쪽으로 부풀려 길게
  const longPath = (t) => {
    const d = Math.max(0, t), r = t < 0 ? 1 - 4 * t : 1 + 0.4 * d;
    const c = d < 1e-4 ? [ORIGIN, g(4.5, -5.5), DEST] : [ORIGIN, g(-4.5, -5.5 - d), g(4.5 + d, -5.5 - d), g(4.5 + d, 6.5), DEST];
    return dk.resample(dk.fillet(c, r), 0.05);
  };
  const SHORT = shortPath(), LEN_S = dk.pathLen(SHORT), target = LEN_S * KM_L / KM_S;
  const lo = dk.pathLen(longPath(-1)), hi = dk.pathLen(longPath(6));
  if (target < lo || target > hi) dk.log(`주의: 근거 비율 ${(KM_L / KM_S).toFixed(3)}가 이 도식이 그릴 수 있는 범위 ${(lo / LEN_S).toFixed(3)}~${(hi / LEN_S).toFixed(3)} 밖 → longPath 모양을 바꾼다`);
  const D = dk.bisect((t) => dk.pathLen(longPath(t)), -1, 6, target);
  const LONG = longPath(D), LEN_L = dk.pathLen(LONG);
  dk.log(`짧은 ${LEN_S.toFixed(3)} · 긴 ${LEN_L.toFixed(3)} · 비율 ${(LEN_L / LEN_S).toFixed(4)} (근거 ${KM_L}/${KM_S} = ${(KM_L / KM_S).toFixed(4)}) · 우회 ${D.toFixed(3)}`);
  const R_S = 0.15, R_L = 0.11;
  const lift = (P, r) => P.map((p) => new THREE.Vector3(p.x, r + 0.03, p.z));

  // ── 카메라 (건물 배치 전에: 라벨 자리를 화면 좌표로 비우려고) ──
  const head = g(4.5, 6.5, 1.25);
  const cam = dk.camera({ hfov: 39.6, aspect: RES[0] / RES[1] });
  const pts = [...SHORT, ...LONG, head.clone().add(new THREE.Vector3(0, 0.6, 0)), ORIGIN.clone().add(new THREE.Vector3(0.6, 0, 0)), ORIGIN.clone().add(new THREE.Vector3(-0.6, 0, 0))];
  const { target: TARGET } = dk.fitCamera(cam, g(0, 0.5), new THREE.Vector3(-0.32, 1.05, 1.0), pts, FIT);

  // ── 형상 ──
  const ground = dk.paint(dk.ground([G0, G1], [-H1, -H0], { step: 0.3 }), C.ground);
  const roads = dk.paint(dk.merge([...XS.map((x) => dk.box(g(x, 0.5, 0.006), [RW, 0.004, H1 - H0])), ...YS.map((y) => dk.box(g(0, y, 0.01), [G1 - G0, 0.004, RW]))]), C.bg);

  // 건물: 격자 칸 안 낮은 블록. 경로·마커·라벨 자리(KEEP)를 비운다. 난수는 조건과 상관없이 같은 순서로 뽑아 배치가 흔들리지 않게
  const near = (c, P, r) => P.some((q, i) => i % 4 === 0 && Math.hypot(q.x - c.x, q.z - c.z) < r);
  const inKeep = (c, sx, sz, h) => [-sx / 2, sx / 2].some((dx) => [-sz / 2, sz / 2].some((dz) => {
    const [u, v] = dk.screen(cam, [c.x + dx, h, c.z + dz]);
    return KEEP.some((b) => b[0] <= u && u <= b[2] && b[1] <= v && v <= b[3]);
  }));
  const blds = [];
  for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < YS.length - 1; j++) for (let k = 0; k < 3; k++) {
    const cx = rand.uniform(XS[i] + 0.7, XS[i + 1] - 0.7), cy = rand.uniform(YS[j] + 0.7, YS[j + 1] - 0.7);
    const sx = rand.uniform(0.6, 1.2), sz = rand.uniform(0.6, 1.2), h = rand.uniform(0.25, 0.85), keep = rand() < 0.8;
    const c = g(cx, cy);
    const clear = Math.max(sx, sz) / 2 + 0.45;   // 건물 반 폭 + 관 반지름 + 여유: 경로를 가리지 않게
    if (!keep || near(c, SHORT, clear) || near(c, LONG, clear) || c.distanceTo(ORIGIN) < 1.3 || c.distanceTo(DEST) < 1.3) continue;
    if (inKeep(c, sx, sz, h) || blds.some((b) => Math.hypot(b.c.x - c.x, b.c.z - c.z) < 1.0)) continue;
    blds.push({ c, geo: dk.box([c.x, h / 2, c.z], [sx, h, sz], { bevel: 0.03 }) });
  }
  dk.log('건물', blds.length);
  const buildings = dk.paint(dk.merge(blds.map((b) => b.geo)), C.building);

  const mOrigin = dk.merge([dk.paint(dk.cylinder(g(-4.5, -5.5, 0.04), 0.5, 0.08), C.bg), dk.paint(dk.cylinder(g(-4.5, -5.5, 0.1), 0.24, 0.12), C.ink)]);
  const mDest = dk.merge([
    dk.paint(dk.cylinder(g(4.5, 6.5, 0.03), 0.3, 0.06), C.bg),
    dk.paint(dk.cylinder(g(4.5, 6.5, 0.62), 0.04, 1.0, { segs: 32, rTop: 0.42 }), C.ink),
    dk.paint(dk.sphere(head, 0.5), C.ink),
    dk.paint(dk.sphere(new THREE.Vector3(head.x, head.y + 0.12, head.z + 0.32), 0.2), C.bg),   // 눈: 카메라 쪽
  ]);
  const rShort = dk.paint(dk.tube(lift(SHORT, R_S), R_S), C.accent);
  const rLong = dk.paint(dk.tube(lift(LONG, R_L), R_L), C.bar);

  // ── 빛 굽기: 건물·마커가 그림자를 드리운다(경로는 드리우지 않는다 — 바닥에 검은 줄이 생기지 않게) ──
  const occ = [...blds.map((b) => dk.boxOf(b.geo)), dk.boxOf(mOrigin), dk.boxOf(mDest)];
  const groundAll = dk.merge([ground, roads]);
  for (const geo of [groundAll, buildings, mOrigin, mDest, rShort, rLong]) dk.bakeLight(geo, { occluders: occ });
  const M = {
    ground: dk.unlitMesh('ground', groundAll), buildings: dk.unlitMesh('buildings', buildings),
    marker_origin: dk.unlitMesh('marker_origin', mOrigin), marker_dest: dk.unlitMesh('marker_dest', mDest),
    route_short: dk.unlitMesh('route_short', rShort), route_long: dk.unlitMesh('route_long', rLong),
  };

  // ── PNG + 라벨 자리 (GLB와 같은 메시·같은 카메라) ──
  const uvPath = (P, r, n = 100) => {
    const line = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    return Array.from({ length: n + 1 }, (_, k) => { const p = line.getPointAt(k / n); return dk.screen(cam, [p.x, r * 2 + 0.03, p.z]).map((x) => +x.toFixed(5)); });
  };
  const anchors = {
    resolution: RES,
    origin: dk.screen(cam, [ORIGIN.x, 0.2, ORIGIN.z]).map((x) => +x.toFixed(5)),
    destination: dk.screen(cam, [head.x, head.y + 0.6, head.z]).map((x) => +x.toFixed(5)),
    short: uvPath(SHORT, R_S), long: uvPath(LONG, R_L),
  };
  const files = { 0: `${NAME}-0.png`, 1: `${NAME}-1.png`, 2: `${NAME}-2.png` };
  if (ONLY.includes('png')) {
    const scene = new THREE.Scene();
    Object.values(M).forEach((m) => scene.add(m));
    for (let i = 0; i < 3; i++) {
      M.route_long.visible = i >= 1;
      M.route_short.visible = i >= 2;
      dk.writePNG(`${OUT}/${files[i]}`, dk.render(scene, cam, { width: RES[0], height: RES[1], bg: C.bg, fade: FADE }));
    }
    M.route_long.visible = M.route_short.visible = true;
  }

  // ── GLB ──
  const tris = ONLY.includes('glb') ? await dk.writeGLB(`${OUT}/${NAME}.glb`, Object.values(M)) : null;

  const P3 = (P, r) => P.filter((_, i) => i % 2 === 0).map((p) => dk.r4([p.x, r + 0.03, p.z]));
  dk.writeJSON(`${OUT}/${NAME}.json`, {
    _about: '도식 도시(실제 도로 아님). three.js 좌표(Y-up). KPU_PPT scripts/3d/route-city.mjs가 만든다(deck.mjs build3d). 손으로 고치지 않는다.',
    camera: dk.cameraJSON(cam, TARGET, RES),
    markers: { origin: { position: dk.r4(ORIGIN.toArray()), top: dk.r4([ORIGIN.x, 0.2, ORIGIN.z]) },
      destination: { position: dk.r4(DEST.toArray()), pin_top: dk.r4([head.x, head.y + 0.6, head.z]) } },
    routes: {
      short: { num: SHORT_ID, value: KM_S, tube_radius: R_S, length: +LEN_S.toFixed(4), points: P3(SHORT, R_S) },
      long: { num: LONG_ID, value: KM_L, tube_radius: R_L, length: +LEN_L.toFixed(4), points: P3(LONG, R_L) },
    },
    fade: FADE, anchors, files: { glb: `${NAME}.glb`, png: files }, triangles: tris,
  });
}
