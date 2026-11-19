# 3D 에셋 빌드 — 스크립트로 만들기 (Blender 없음)

손으로 모델링하지 않는다. **장면 스크립트 하나 = 에셋 한 벌**(GLB·PNG·JSON)이고, 같은 명령이면 같은 결과가 나온다. 숫자가 바뀌면 다시 돌린다. 스크립트는 `deck/tools/3d/<slug>.mjs`에 두고 장 기획에 명령을 적는다.

필요한 것은 검수 캡처와 같다: Node 22 이상 + Chrome(또는 Chromium·Edge, `CHROME_PATH`). 따로 설치할 3D 프로그램이 없다.

## 실행
```bash
node "$KIT/scripts/deck.mjs" build3d route-city -- --short km-b --long km-a       # 스킬 예시 (이름만)
node "$KIT/scripts/deck.mjs" build3d deck/tools/3d/cover.mjs -- --seed 3             # 덱 스크립트 (경로)
```
- 헤드리스 Chrome을 띄워 `scripts/3d/runner.html`을 열고, 장면 스크립트의 기본 내보내기를 `await scene(dk)`로 부른다. `dk` = `scripts/3d/kit3d.js`.
- 페이지가 읽을 수 있는 곳: `/kit/`(스킬 폴더 — three.js, 런타임), `/deck/`(덱 폴더 — 받은 모델 등). 쓰기는 **덱 폴더 안으로만**(`dk.write*`의 경로는 덱 기준).
- 덱의 `theme.css` 색 토큰과 `evidence/*.json` 근거 값이 미리 들어가 있다(`dk.tok`, `dk.num`).
- 몇 초면 끝난다(갤러리 지도 2초, 조립품 1초). 헤드리스는 소프트웨어 WebGL이라 그림은 같고 속도만 느리다.
- 스크립트의 `console.log`·오류는 터미널에 그대로 나온다. 실패하면 종료 코드 1.

## 장면 스크립트 모양
```js
// deck/tools/3d/cover.mjs
export default async function (dk) {
  const { THREE } = dk;
  const ratio = dk.num('km-a') / dk.num('km-b');          // 근거에서만
  const geo = dk.paint(dk.box([0, 0.4, 0], [1, 0.8, 1], { bevel: 0.03 }), dk.tok('hair'));
  dk.bakeLight(geo, { occluders: [dk.boxOf(geo)] });
  const mesh = dk.unlitMesh('buildings', geo);
  const cam = dk.camera({ hfov: 39.6, aspect: 2200 / 1340 });
  const { target } = dk.fitCamera(cam, [0, 0, 0], [-0.3, 1, 1], [[-1, 0, -1], [1, 1, 1]], [0.12, 0.13, 0.76, 0.72]);
  const scene = new THREE.Scene(); scene.add(mesh);
  dk.writePNG('web/assets/3d/cover-0.png', dk.render(scene, cam, { fade: [0.8, 1.0] }));
  await dk.writeGLB('web/assets/3d/cover.glb', [mesh]);
  dk.writeJSON('web/assets/3d/cover.json', { camera: dk.cameraJSON(cam, target, [2200, 1340]) });
}
```

## kit3d.js (dk)
| 이름 | 하는 일 |
|---|---|
| `arg(name, 기본)` · `flag(name)` · `log()` | `--` 뒤 인자, 로그 |
| `tok(name)` · `num(id)` · `rng(seed)` | theme.css 색 토큰(`'accent'` → `#1B8A4E`), 근거 값, 시드 난수(`rng.uniform(a, b)`) |
| `box(중심, 크기, {bevel})` · `cylinder(중심, r, h, {rTop})` · `sphere` · `tube(점들, r)` · `ground([x0,x1],[z0,z1],{step, ring})` | 월드 좌표에 놓인 형상. 좌표는 three.js 그대로: 미터, +Y 위, 바닥 y = 0 |
| `paint(형상, hex)` · `merge(형상들)` | 바탕색을 정점 색으로 · 하나로 합치기(위치·법선·색) |
| `resample` · `pathLen` · `fillet` · `bisect(fn, lo, hi, 목표)` | 경로 수학, **근거 비율에 맞게 형상 풀기** |
| `bakeLight(형상, {sun, sky, occluders, contact})` · `boxOf(형상)` | 하늘빛 + 햇빛(부드러운 그림자, 상자 차폐물) + 접지 어둠을 정점 색에 곱한다. 흰 윗면 = 토큰 색 그대로 |
| `unlitMesh(name, 형상)` | 구운 정점 색 메시(MeshBasicMaterial). 이름 = 런타임 모듈이 찾는 이름 |
| `camera({hfov, aspect})` · `look` · `fitCamera(cam, 바라볼 점, 방향, 점들, 화면 상자)` · `screen(cam, p)` · `cameraJSON` | 카메라, 내용을 화면 상자에 꼭 맞추기, 월드 → 화면 0~1, 웹 카메라 JSON |
| `render(scene, cam, {width, height, fade, look})` · `fadeCanvas` | PNG용 캔버스. fade = 런타임 `edgeFade`와 같은 초타원 식 |
| `material(hex, {rough, metal, emit})` · `part(name, group, [[형상, 재질]…], extra)` | 실물 조립품: PBR 재질 · 부품 노드(같은 재질 합침, 원점 = 경계상자 중심, extras `{part, group}`) |
| `poster(root, {t, az, el, d}, {shadow})` | inspect3d 첫 단계와 같은 빛·구도의 포스터 |
| `outside(속 부품, 외피, 여유)` | 맞춤 검사: 외피 경계상자 밖 정점 수 |
| `loadGLB(덱 경로)` · `normalize(root, {length, axis})` · `splitIslands(mesh)` · `regroup(root, 규칙)` | 받은 모델 다듬기 |
| `writePNG(경로, 캔버스)` · `writeGLB(경로, 물체들)` · `writeJSON(경로, 값)` | 덱 폴더 기준 경로로 쓰기. GLB는 삼각형 수·MB를 출력 |

## 도식 장면 레시피 (scripts/3d/route-city.mjs)
1. **색**: 바닥 `--c-surface`, 건물 `--c-hair`, 도로 `--c-bg`(흰 띠), 잉크 `--c-text`, 비교 경로 `--c-bar`, 선택 경로 `--c-accent`. 텍스처·반사 없음.
2. **빛**: `bakeLight` 기본값(하늘 0.72, 해 방향 `[0.35, 0.82, −0.45]`). 위를 향한 흰 면 = 1.0이 되게 하늘과 해를 나눠서 토큰 색이 그대로 나온다. 더 밝게 하면 바닥과 회색 길이 흰색으로 날아간다.
3. **배치**: `dk.rng(시드)`. 격자 칸 안의 낮은 블록, 경로·마커·**라벨 자리**(`--keep-out` 화면 상자)에서 뺀다 — 라벨이 건물 위에 얹히지 않게. 건물은 반 폭 + 관 반지름만큼 경로에서 띄운다. 난수는 조건과 상관없이 같은 순서로 뽑아 배치가 흔들리지 않게.
4. **정직성**: 근거 비율(`num`)로 형상 하나(우회 폭·모서리 반지름)를 `bisect`로 푼다. 그릴 수 있는 범위를 벗어나면 경고하고 형상 함수를 바꾼다. 로그에 `비율 1.0303 (근거 34/33 = 1.0303)`.
5. **카메라**: 건물 배치 **전에** `fitCamera`로 경로·마커가 화면 상자(기본 0.12, 0.13, 0.76, 0.72) 안에. PNG 해상도 = 웹 칸의 2배(1100×670 → 2200×1340). 비율이 같아야 웹 카메라가 PNG와 똑같다.
6. **그림자 드리우는 것**: 건물·마커만(`occluders`). 경로는 드리우지 않는다 — 바닥에 검은 줄이 생기지 않게.
7. **PNG**: 단계마다 한 장(경로 없음 / 긴 길 / 둘 다). GLB와 **같은 메시·같은 카메라**로 찍고 `fade`로 가장자리를 바탕에 녹인다 → 3D 화면과 대체 그림이 같다.
8. **anchors**: 같은 카메라에서 마커·경로 101점의 화면 좌표(0~1) → 대체 그림 라벨 자리.
9. **GLB**: 바닥은 보이는 곳만 촘촘한 격자(0.3) + 바깥 고리 큰 판 4장(화면 끝까지 이어짐). 3만~5만 삼각형, 1 MB 안팎.
10. **JSON**: 카메라(fov 세로·가로, 자리, 바라보는 점), 마커, 중심선(three 좌표), 근거 id·값, fade, anchors, 파일 이름. 런타임은 이것만 읽는다.

숨길 지도에서 더 한 것: 물 띠, 대로·외곽 길, 도착 핀 눈, 경로 밑 흰 테두리(casing). 모두 같은 형상 도구로 만든다(`tube` 반지름을 키운 흰 관 = casing).

## 실물 조립품 레시피 (scripts/3d/power-bank.mjs)
[3d-asset-research.md](3d-asset-research.md) ⑤를 따른다. 요점:
- `DIM` 한곳에 치수와 출처. 미터, +X 앞 · +Y 위, 바닥 0.
- 부품 = 노드 하나: `dk.part(name, group, [[형상, 재질], …])`. 그룹 이름 = 장면 설정의 groups 키. 이름은 설정의 `anchor`·`sub`가 찾는 이름.
- 재질: 실물 톤, 낮은 채도. 금속은 metal 1·rough 0.25~0.55, 플라스틱 rough 0.4~0.6, 고전압 케이블 주황(관례).
- 포스터: `dk.poster(root, 첫 단계 cam, { shadow })` — inspect3d와 같은 빛·카메라 식(az·el·d, 세로 화각 20°)이라 대체 그림이 3D 첫 화면과 같다. 1920×1080.
- 맞춤 검사(`--fit`): `dk.outside` → `FIT 케이스 밖 정점 0 / 16848`.
- 포스터를 찍은 뒤 GLB를 쓴다(`writeGLB`가 물체를 새 장면으로 옮긴다).

## 받은 모델 다듬기
[3d-asset-research.md](3d-asset-research.md) ④. `dk.loadGLB` → `splitIslands`·지우기·재질 대응표 → `normalize` → `regroup` → `writeGLB`.

## 걸린 것
- 정점 색은 **선형 색**으로 저장된다(`paint`가 `THREE.Color(hex)`로 변환). glTF COLOR_0도 선형이라 런타임 MeshBasicMaterial이 토큰 색을 그대로 낸다. hex를 직접 0~1로 나눠 넣으면 색이 밝게 뜬다.
- 상자 차폐물은 경계상자로 계산한다 — 둥근 건물·나무처럼 상자가 아닌 것은 작은 상자 여러 개로 나눠 넘긴다.
- 같은 파일 이름으로 PNG를 덮어쓰면 이미지 보기 도구가 예전 것을 보여 줄 수 있다 → 확인할 때는 새 이름으로 복사해서 연다.
