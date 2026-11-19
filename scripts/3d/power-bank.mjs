// 예시 장면: 공개 모델 없이 직접 만드는 조립품 — 보조배터리(도식 치수, 실제 제품 아님) → inspect3d용 GLB + 포스터 PNG.
// 숨길 덱 숨김 장의 E-GMP 내부 구조를 만든 방법을 작게 줄였다(references/3d-asset-research.md "직접 만들기").
// - 치수는 근거(공식 제원·분해 자료)에서 온 값을 맨 위 DIM에 모은다. 여기서는 일반 18650 셀 치수(지름 18 mm, 길이 65 mm)만
//   실제 규격이고 나머지는 예시 값이다. 그래서 화면 credit에 "도식 · 예시 치수"를 쓴다.
// - 미터 단위, three.js 좌표: +X 앞(단자 쪽) · +Y 위 · 바닥 y = 0. 몸체 폭은 Z 방향(앞에서 볼 때 −Z가 오른쪽).
// - 최상위 노드 = 부품 하나, userData(→ glTF extras) { part, group }, 원점 = 부품 경계상자 중심 (dk.part가 처리).
// - 재질은 MeshStandardMaterial만(텍스처 없음): 실물처럼 보이되 덱 화면과 싸우지 않는 낮은 채도.
//
// 출력 (덱 web/assets/3d/): power-bank.glb, power-bank-poster.png (inspect3d 첫 단계와 같은 구도·빛, 흰 바탕)
// 사용: node <스킬>/scripts/deck.mjs build3d power-bank [-- --no-poster] [--fit]
export default async function (dk) {
  const { THREE } = dk;
  const OUT = dk.arg('--out', 'web/assets/3d');

  // ── 치수 (미터). 출처를 옆에 적는다 ──
  const DIM = {
    L: 0.150, W: 0.072, H: 0.026,   // 몸체 길이(X)·폭(Z)·높이(Y) (예시)
    wall: 0.0018,                    // 케이스 두께 (예시)
    cellR: 0.009, cellLen: 0.065,    // 18650 원통형 셀 규격(지름 18 mm · 길이 65 mm)
    pcb: [0.0016, 0.016, 0.064],     // 회로 기판 두께(X)·높이(Y)·폭(Z) (예시)
  };
  const { L, W, H, wall: T } = DIM;

  const M = {
    case: dk.material('#E6E8EB', { rough: 0.45 }),
    caseDark: dk.material('#3A3E43', { rough: 0.5 }),
    cell: dk.material('#3C5E86', { rough: 0.35, metal: 0.1 }),
    cellCap: dk.material('#C9CCD0', { rough: 0.3, metal: 1 }),
    holder: dk.material('#2A2C2F', { rough: 0.6 }),
    pcb: dk.material('#1F2326', { rough: 0.4 }),
    chip: dk.material('#0E0F10', { rough: 0.3 }),
    gold: dk.material('#C8A24A', { rough: 0.3, metal: 1 }),
    steel: dk.material('#B9BDC2', { rough: 0.25, metal: 1 }),
    nickel: dk.material('#A9ADB2', { rough: 0.35, metal: 1 }),
    led: dk.material('#FFFFFF', { rough: 0.2, emit: '#FFFFFF', emitK: 2 }),
  };
  M.case.name = 'case'; M.caseDark.name = 'case_front';
  const B = (c, s, m, bevel = 0) => [dk.box(c, s, { bevel }), m];   // [형상, 재질]
  const alongX = (geo) => geo.rotateZ(Math.PI / 2);                   // 원통 축 Y → X
  const nodes = [];
  const part = (...a) => { const n = dk.part(...a); nodes.push(n); return n; };
  const x0 = -L / 2;

  // ── 케이스 (외피: shell) — 아래·위 두 쪽 ──
  part('case_bottom', 'shell', [
    B([0, T / 2, 0], [L, T, W], M.case, 0.003),
    B([0, H * 0.3, W / 2 - T / 2], [L, H * 0.6, T], M.case, 0.0008),
    B([0, H * 0.3, -W / 2 + T / 2], [L, H * 0.6, T], M.case, 0.0008),
    B([x0 + T / 2, H * 0.3, 0], [T, H * 0.6, W], M.case, 0.0008),
    B([-x0 - T / 2, H * 0.3, 0], [T, H * 0.6, W], M.caseDark, 0.0008),
  ]);
  part('case_top', 'shell', [
    B([0, H - T / 2, 0], [L, T, W], M.case, 0.004),
    B([0, H * 0.8, W / 2 - T / 2], [L, H * 0.4, T], M.case, 0.0008),
    B([0, H * 0.8, -W / 2 + T / 2], [L, H * 0.4, T], M.case, 0.0008),
    B([x0 + T / 2, H * 0.8, 0], [T, H * 0.4, W], M.case, 0.0008),
    B([-x0 - T / 2, H * 0.8, 0], [T, H * 0.4, W], M.caseDark, 0.0008),
  ]);

  // ── 배터리: 셀 6개(2열 × 3행, 길이 방향 = X) + 홀더 + 니켈 띠 ──
  const r = DIM.cellR, cl = DIM.cellLen, yc = T + r + 0.0004;
  const cells = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const cx = x0 + T + 0.002 + cl / 2 + i * (cl + 0.001), cz = (j - 1) * (2 * r + 0.0006);
    cells.push([alongX(new THREE.CylinderGeometry(r, r, cl, 40)).translate(cx, yc, cz), M.cell]);
    for (const s of [-1, 1]) cells.push([alongX(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.0008, 24)).translate(cx + s * (cl / 2 + 0.0003), yc, cz), M.cellCap]);
  }
  part('cells', 'battery', cells, { index: 6 });
  part('cell_holder', 'battery', [0, 1, 2].map((k) => B([x0 + T + 0.003 + k * (cl + 0.001), yc, 0], [0.002, 2 * r + 0.002, 6 * r + 0.004], M.holder, 0.0005)));
  part('nickel_strip', 'battery', [0, 1, 2].map((k) => B([x0 + T + 0.0014 + k * (cl + 0.001) + (k === 0 ? 0.0012 : 0), yc, 0], [0.0003, 0.006, 6 * r], M.nickel)));

  // ── 회로 기판: 앞쪽(+X) 끝, 세워서 ──
  const px = -x0 - T - 0.004 - DIM.pcb[0] / 2 - 0.006;
  const pcb = [B([px, H / 2, 0], DIM.pcb, M.pcb)];
  [[0.018, 0.012, 0.010, 0.008], [-0.006, 0.010, 0.012, 0.006], [-0.022, 0.015, 0.006, 0.005]]
    .forEach(([cz, cy, sz, sy]) => pcb.push(B([px - 0.0015, cy, cz], [0.0014, sy, sz], M.chip, 0.0002)));
  for (let k = 0; k < 8; k++) pcb.push(B([px - 0.0009, 0.0045, -0.028 + k * 0.008], [0.0003, 0.0016, 0.003], M.gold));
  part('pcb', 'board', pcb);

  // ── 단자: USB-C 두 개 + USB-A 하나 (앞면) + 표시 LED 넷 ──
  const fx = -x0 - T;   // 앞면 안쪽. 단자는 앞면과 같은 높이(튀어나오지 않게)
  part('usb_c', 'ports', [0.022, 0.006].flatMap((cz) => [
    B([fx - 0.0035 + T, H * 0.42, cz], [0.007, 0.0032, 0.0089], M.steel, 0.0012),
    B([fx + T + 0.00005, H * 0.42, cz], [0.0002, 0.0016, 0.0072], M.chip, 0.0006),
  ]));
  part('usb_a', 'ports', [
    B([fx - 0.0045 + T, H * 0.42, -0.016], [0.009, 0.0047, 0.0125], M.steel, 0.0003),
    B([fx + T + 0.00005, H * 0.42, -0.016], [0.0002, 0.0026, 0.0112], M.chip),
  ]);
  part('led', 'ports', [0, 1, 2, 3].map((k) => B([fx + T + 0.00005, 0.007 + k * 0.0032, -0.030], [0.0002, 0.0014, 0.0016], M.led)));

  dk.log('노드', nodes.length, nodes.map((n) => `${n.name}(${n.userData.group})`).join(', '));

  // ── 맞춤 검사: 속 부품이 케이스 밖으로 나가지 않나 ──
  if (dk.flag('--fit')) {
    const shell = new THREE.Group(); nodes.filter((n) => n.userData.group === 'shell').forEach((n) => shell.add(n.clone()));
    const f = dk.outside(nodes.filter((n) => n.userData.group !== 'shell'), shell, 0.0005);
    dk.log(`FIT 케이스 밖 정점 ${f.outside} / ${f.total}`);
  }

  // ── 포스터: inspect3d 첫 단계와 같은 구도(az 38°, el 18°, d, t = 몸체 중심, 세로 화각 20°) ──
  if (!dk.flag('--no-poster')) {
    const root = new THREE.Group(); nodes.forEach((n) => root.add(n));
    dk.writePNG(`${OUT}/power-bank-poster.png`, dk.poster(root, { t: [0, H / 2, 0], az: 38, el: 18, d: Number(dk.arg('--cam-d', 0.36)) }, { shadow: [0.26, 0.13] }));
  }
  await dk.writeGLB(`${OUT}/power-bank.glb`, nodes);
}
