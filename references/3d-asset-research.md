# 3D 에셋 조사·제작 — 실물을 소개하는 장을 혼자 만들기

숨길 덱의 숨김 장 "전기차 해부"를 만든 과정을 다른 물건(제품·기기·차량·설비·건물·장비)에도 쓸 수 있게 정리했다. 순서대로 따르면 에이전트가 **무엇을 보일지 정하고 → 제원을 근거로 모으고 → 모델을 찾거나 직접 만들고 → 맞는지 검사해 → inspect3d 장면**까지 간다. 각 단계는 파일을 남긴다(다음 세션이 이어받을 수 있게).

```
① 보일 것 정하기 ─ research/<slug>-3d.md (부품 그룹 표)
② 제원 조사     ─ evidence/<slug>-3d.json (치수·배치·카드 숫자) + research/<slug>-3d.md 치수표
③ 모델 찾기     ─ assets.json kind "model3d" 후보 + 미리보기(dk.poster) → 사용자가 고름(A1)   ← 고품질 오픈소스를 최대한
④ 다듬기        ─ deck/tools/3d/<slug>_prep.mjs → web/assets/3d/<id>.glb
⑤ 직접 만들기   ─ deck/tools/3d/<slug>_build.mjs (③에서 3곳 이상 뒤져도 없을 때만, searched 기록)
⑥ 맞춤 검사     ─ 같은 스크립트 --fit: 밖으로 나간 정점 수·겹친 그림 3장
⑦ 장면          ─ web/slides/<slug>.html (inspect3d 설정) → capture --steps / --no3d
```

## ① 무엇을 보일지 먼저 (모델보다 이야기)
모델의 부품 트리(CAD 구조)를 그대로 보이지 않는다. **설명 목적에서 부품 그룹을 고른다.**

1. 장의 설명 목적 한 문장: "청중이 이 장 뒤에 ___ 를 안다." (예: 전기차의 무게·공간 대부분이 바닥의 배터리라는 것)
2. 그 문장에 필요한 그룹만 5~9개. 그룹마다 **카드 하나**(이름 · 근거 숫자 하나 · 한 줄). 숫자가 없는 그룹은 이름표만.
3. 단계 순서: 외관(실물임을 보임) → 투시(속이 있음) → 분해(전체 지도, 그룹 이름표) → 초점 그룹들(설명 목적 순서, 정비·조립 순서가 자연스러우면 그것) → 조립(처음으로 돌아옴). 9단계를 넘으면 그룹을 합친다.
4. 본편 시간이 빠듯하면 **숨김 장**(단축키로 마지막 장 뒤에 붙임, interactions.md)이나 질의응답용 탐색 장으로 둔다. 숨길에서는 본편 9:00을 지키려고 숨김 장으로 뒀다.

`research/<slug>-3d.md` 첫 표:

| 그룹 key | 화면 이름 | 노드(부품) | 카드 숫자(근거 id) | 한 줄 | 분해 방향 | 초점 단계 |
|---|---|---|---|---|---|---|
| battery | 배터리 팩 | pack_tray, modules(32), cooling_plate, bms, pack_cover | ev-kwh | 모듈 {ev-modules}개 · 셀 {ev-cells}개 | 아래 | 4 |

## ② 제원 조사 (근거 장부)
세 종류를 찾는다. 모두 `evidence/<slug>-3d.json`에 원문 구절과 함께(references/method.md files.md 형식).

| 종류 | 무엇 | 왜 | 예 (해부 장) |
|---|---|---|---|
| **기준 치수** | 전체 크기 하나 이상(길이·폭·높이·휠베이스·지름…) | 모델 축척을 맞추고 검사한다 | 휠베이스 2,950 mm |
| **배치** | 각 부품이 어디에 있고 무엇과 닿나(글 사실, `text`) | 직접 만들 부품의 자리 | 팩은 앞뒤 차축 사이 바닥 전체, 모듈 2열 × 16행 |
| **카드 숫자** | 그룹마다 하나, 반복 수(모듈 수 등) | 화면 숫자 = 장부 | 77.4 kWh, 165 kW, 10→80 % 18분 |

**출처 등급** (위가 우선, 화면 숫자는 두 출처가 맞을 때만):
1. 제조사 공식 — 제원표, 보도자료, 기술 설명회 자료, 사업 보고서. 검색: `<제품> specifications`, `<제품> 제원`, `<플랫폼> technical`, `site:<제조사 도메인> <제품>`
2. 인증·규제·특허 — 형식승인·에너지 효율 신고, 환경 인증, 특허 도면(배치 확인에 강함). 검색: `site:patents.google.com <회사> <부품>`
3. 분해·실측 — 분해 기사, 전문지 실측, 수리 가이드. 검색: `<제품> teardown`, `<제품> 분해`, `<부품> cross section`, `<제품> exploded view`
4. 정비 매뉴얼·부품 카탈로그 — **배치 확인용으로만**(재배포 금지, 화면에 그림 쓰지 않음)
5. 커뮤니티·포럼 — 실마리용. 장부에 넣지 않는다

- 숫자 단위·조건(예: "10→80 %", "AWD 롱레인지")을 claim에 같이 쓴다. 트림·연식이 다르면 하나로 고정하고 brief에 적는다.
- 반복 부품 수(모듈 32, 셀 384)는 모델 검사에도 쓴다: 만든 모델의 노드 수가 장부 값과 같아야 한다.
- 웹 조사 도구는 세션 것을 쓴다(사용자 전역 규칙이 브라우저를 지정하면 그것). 조사 노트에 검색어·연 페이지·날짜를 남긴다.

## ③ 모델 찾기 (에셋 장부) — 고품질 오픈소스를 최대한
원칙은 references/method.md `references/assets.md` "고품질 오픈소스를 먼저": **찾은 것 그대로 → 찾은 것을 다듬어서 → 직접 만들기(마지막)**. 외형은 거의 언제나 공개 모델이 있으니 찾는다. 속(내부 부품)도 먼저 찾고(분해 모델·컷어웨이·부품 단품 모델을 따로 찾아 조합), 그래도 없는 부품만 ⑤에서 만든다.

- **최소 3곳**을 뒤진다(아래 표 위에서부터). 검색어는 영어·제조사 표기·모델 코드까지: `<제품> 3d model`, `<제품 코드> glb`, `<제품> cutaway`, `<부품> 3d`, 같은 차급·같은 형태의 대체 모델(`midsize sedan`, `fastback sedan`).
- 정확한 그 제품이 없으면 **같은 차급·같은 실루엣의 고품질 모델을 축척만 맞춰** 쓰는 것이 직접 만든 어림 형상보다 낫다. 이때 credit에 "크기 비교용 대체 모델(<모델 이름>)"을 밝힌다.
- 도식 장면의 소품(차·사람·나무·건물)은 `prop3d` — Kenney·Quaternius·Poly Pizza CC0 묶음에서 먼저 찾고 재질을 덱 색 토큰으로 다시 입힌다. 상자·원통 조립 소품은 이 묶음에 없을 때만.
- 질감·환경광은 Poly Haven·ambientCG(CC0). 실물 장면이 밋밋하면 `studioEnv` 대신 Poly Haven 스튜디오 HDRI를 후보로(PMREM, 1k~2k면 충분).

| 어디 | 라이선스 | 좋은 것 | 주의 |
|---|---|---|---|
| Sketchfab (Downloadable 필터, Staff Picks·평점 순) | 모델마다: CC BY · CC0 · CC BY-SA · CC BY-NC · Standard/Editorial | 차량·제품 외형이 가장 많다, 고품질 PBR 많음 | 라이선스 칸을 읽는다. NC는 상업 발표 불가, ND는 다듬을 수 없어 불가. 게임에서 뜯어낸 모델(ripped)·브랜드 무단 모델 제외 |
| Smithsonian Open Access 3D · 박물관 공개 컬렉션 | CC0 표시된 것만 | 실물 스캔(유물·표본·기계) | 스캔이라 무겁다 → 줄이기 |
| NASA 3D Resources | NASA 미디어 지침 | 우주선·위성·탐사선 | 보증·제휴 암시 금지 |
| Poly Haven | CC0 | 고품질 소품·질감·HDRI(환경광) | 제품 외형은 적다 |
| ambientCG | CC0 | PBR 질감(금속·콘크리트·직물·아스팔트) | 모델 없음 |
| Kenney · Quaternius | CC0 | 로우폴리 소품 묶음(차·사람·나무·건물·도로) — 도식 장면 소품 1순위 | 실물 소개용 아님. 재질을 토큰 색으로 |
| Poly Pizza | 모델마다 CC0 · CC BY | 로우폴리 소품 검색(Kenney·Quaternius 포함 수천 개) | 모델마다 라이선스·작가 확인 |
| Thingiverse · Printables | 대개 CC BY/SA/NC | 기계 부품·기구 | STL(재질 없음), 축척 확인 |
| 제조사 CAD·보도용 3D | 제공 조건대로 | 정확한 외형 | 드묾. 조건을 원문 그대로 장부에 |
| GrabCAD 등 CAD 공유 | 대개 재배포 금지 | 치수·배치 참고 | **덱에 넣지 않는다**(참고만) |
| Khronos glTF Sample Assets | 모델마다 | 파이프라인 시험 | 발표용 아님 |

- 후보마다 references/method.md assets.md의 다섯 점수 + 3D 항목을 적는다: **축척 오차**(기준 치수 대비, 3% 안), **구조**(겹친 면·뭉친 노드·내부 유무), **크기**(화면 삼각형 30만 이하, GLB 15 MB 이하 — 넘으면 meshopt·줄이기), **재질**(PBR인가, 다시 입혀야 하나).
- **내려받기 전에 사용자에게 묻는다**: 파일 이름·출처 주소·크기·라이선스. 받은 파일은 후보마다 새 폴더 `web/assets/_candidates/3d/<후보 id>/`에 두고, 그 안의 스크립트·실행 파일은 열지도 돌리지도 않는다.
- AI 생성 메시·추정 모델은 "실물 형상"이라 부르지 않는다(도식으로만, 표시).

장부 항목 (`assets.json`):
```json
{
  "id": "ioniq6-body",
  "kind": "model3d",
  "status": "candidate",
  "file": "web/assets/3d/ioniq6.glb",
  "source": { "url": "https://sketchfab.com/3d-models/…", "author": "Car2022", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/" },
  "credit": "차체 3D Car2022 (CC BY 4.0)",
  "fits": ["ev-anatomy"],
  "why": "외형 실루엣·휠·실내까지 있음. 내부 구동계 없음 → E-GMP는 직접 제작",
  "fit": { "purpose": 5, "real": 4, "design": 4, "license": 5, "resolution": 4 },
  "model": { "scaleRef": "wheelbase-mm", "scaleError": 0.004, "tris": 380000, "mb": 3.3, "interior": "실내만, 구동계 없음", "materials": "재질 이름 뒤죽박죽 → 18개로 다시 입힘" },
  "edits": "겹친 면 제거, 섬 단위로 노드 분리(바퀴·실내·램프·배지), 번호판·모서리선 삭제, 휠베이스 2.95 m로 균일 축척, +X 앞 · 원점 차축 중간",
  "previews": ["web/assets/_candidates/3d/ioniq6-body/front34.png", "web/assets/_candidates/3d/ioniq6-body/side.png", "web/assets/_candidates/3d/ioniq6-body/top.png"]
}
```
**보여 주고 고르게**: 후보마다 같은 구도 미리보기 3장(외관 3/4, 옆, 아래 또는 분해 3/4)을 `dk.poster`로 찍어 장부 `previews`에 적으면 `deck.mjs assets` 후보 페이지가 보여 준다. 그다음 A1을 묻는다. 말로 고르게 하지 않는다.

## ④ 다듬기 (`deck/tools/3d/<slug>_prep.mjs`)
받은 모델을 장면 스크립트 하나로 다듬는다(`deck.mjs build3d deck/tools/3d/<slug>_prep.mjs`). 숨길 덱은 Sketchfab 차체(CC BY)를 이렇게 다듬었다. 흔히 고칠 것:

1. **겹친 면** — SketchUp·Collada 변환본은 면이 앞뒤 두 장. 재질을 `side = THREE.FrontSide`로 두고 뒤집힌 쪽 메시를 지운다(같은 위치·반대 법선).
2. **노드 나누기** — 재질별로 뭉친 메시를 연결된 섬 단위로 나눠(`dk.splitIslands(mesh)`) 위치로 분류한다(바퀴 = 차축 근처 원통, 실내 = 실내 상자 안, 램프·배지…). 분해·강조는 노드 단위로만 된다.
3. **지울 것** — 모서리선 메시, 번호판·글씨, 카메라·조명 노드, 보이지 않는 내부 찌꺼기(`o.removeFromParent()`).
4. **재질 다시 입히기** — 원본 재질 이름 → 작은 PBR 집합(칠·유리·고무·크롬·트림…, `dk.material`). 원래 이름 대응표를 스크립트 맨 위에 둔다. 텍스처는 꼭 필요할 때만.
5. **축척·축·원점** — 기준 치수(②)로 균일 축척(`dk.normalize(root, { length, axis })`). 미터, +X 앞 · +Y 위, 지면 y = 0, 원점 = 의미 있는 점(차축 가운데, 바닥 중심). 내부 부품 GLB도 **같은 좌표계**.
6. **부품 노드로 묶기** — `dk.regroup(root, [[정규식, part, group], …])`: 메시·재질 이름 규칙으로 최상위 부품 노드(extras `{part, group}`)를 만든다.
7. **실측해서 적어 두기** — 바퀴 중심 폭·차축 높이·디스크 크기처럼 ⑤가 맞춰야 할 값을 `dk.writeJSON('research/<slug>-stats.json', …)`. 직접 만드는 부품은 이 값을 읽는다.
8. 내보내기: `await dk.writeGLB('web/assets/3d/<id>.glb', parts)`. 크면 gltfpack/meshopt로 줄인다(런타임이 늘 디코더를 붙인다).

```js
// deck/tools/3d/car_prep.mjs  (예: 받은 차체 다듬기)
export default async function (dk) {
  const g = await dk.loadGLB('web/assets/_candidates/3d/car-a/scene.glb');
  dk.normalize(g.scene, { length: dk.num('car-length-m'), axis: 'x' });     // 전장 = 근거 값
  const parts = dk.regroup(g.scene, [['wheel|tire|rim', 'wheels', 'wheels'], ['glass|window', 'glass', 'body']], ['body', 'body']);
  await dk.writeGLB('web/assets/3d/car.glb', parts);
}
```

## ⑤ 직접 만들기 (`deck/tools/3d/<slug>_build.mjs`) — 마지막 수단
③에서 3곳 이상 뒤지고도 기준을 넘는 공개 모델이 없을 때만(장부 `searched`에 뒤진 곳·검색어·떨어진 이유). 대개 속이 빈 실물의 내부 부품이다(숨길 덱: E-GMP 27개 노드). 출발점 [scripts/3d/power-bank.mjs](../scripts/3d/power-bank.mjs).

- **치수를 맨 위 한곳에**: `DIM = {…}`. 값마다 출처(근거 id·실측) 주석. 근거 없는 값은 "예시"라고 쓰고 화면 credit에 "어림 형상/예시 치수".
- **알아볼 만큼만 자세히**: 실루엣이 맞고, 그 부품을 알아보게 하는 대표 디테일 2~3개(배터리: 모듈 줄·냉각판 채널·버스바 / 모터: 원통 + 냉각 핀 + 감속기 / 케이블: 업계 관례 색 주황). 볼트 하나하나는 만들지 않는다.
- 형상: `dk.box`(bevel로 둥근 모서리)·`dk.cylinder`·`dk.sphere`·`dk.tube`, 그 밖은 three.js 형상(`new THREE.CylinderGeometry(…)` 등)을 그대로.
- 반복 부품(모듈 32개)은 같은 형상을 돌려 쓴다 → 런타임 물결 효과 같은 단위 움직임이 쉽다.
- 노드 = 부품 하나: `dk.part(name, group, [[형상, 재질], …], extra)` — 같은 재질끼리 합치고, 원점을 경계상자 중심에 두고, extras `{part, group}`을 붙인다. 그룹 이름은 ①의 표와 같게.
- 재질은 `dk.material(hex, { rough, metal, emit })`(MeshStandardMaterial), 낮은 채도. 강조색(--c-accent)은 재질에 쓰지 않는다 — 초점은 런타임이 리더선·숫자로 준다.
- 포스터: `dk.poster(root, 첫 단계 cam, { shadow })` — inspect3d와 같은 빛(스튜디오 환경맵 + 키·림 + 접지 그림자 판)·구도라서 대체 그림이 3D 화면과 같다.

## ⑥ 맞춤 검사 (`--fit`)
만든 부품이 실물 외형 안에 제대로 들어가는지 숫자와 그림으로 본다(해부 장은 이걸로 충전구 위치·브레이크 디스크·팩 폭을 고쳤다).
- `dk.outside(속 부품들, 외피, 여유)` → 외피 경계상자 밖으로 나간 정점 수를 줄로 출력: `FIT 케이스 밖 정점 0 / 16848`. 차처럼 곡면 외피는 `THREE.Raycaster`로 외판까지 거리를 재서 같은 형식으로 출력한다.
- 겹친 그림 3장(옆·위·앞, 외피 반투명)을 `dk.render`로 찍어 `research/<slug>-fit-*.png`에 쓰고 직접 열어 본다.
- 반복 수 검사: 모듈 노드 수 = 근거 값.

## ⑦ GLB 계약과 예산 (inspect3d가 기대하는 것)
| 항목 | 값 |
|---|---|
| 단위·축 | 미터, +Y 위(three), 지면 y = 0, 여러 GLB는 같은 좌표계 |
| 노드 | 최상위 노드 = 부품 하나, extras `{ part, group }` (또는 설정 `groupBy` 정규식) |
| 원점 | 부품 경계상자 중심 |
| 크기 | 화면 삼각형 합 60만 이하, GLB 합 15 MB 이하(해부 장: 57만 · 13.9 MB, M4에서 60fps) |
| 재질 | PBR(metal/rough). 외피 칠은 설정 `paint`로 덱 톤에 맞게 바꿀 수 있다 |
| 대체 | 같은 구도 포스터 PNG 1920×1080(외관 단계) — 설정 `poster` |

## ⑧ 장면과 표기
- `data-module="viz/inspect3d.js"` 설정: `models`, `groups`(①의 표 그대로), `steps`(카드 `num`·`{id}`), `kicker`, `credit`, `poster`. 갤러리 `asset3d` 장과 해부 장 재현 설정(runtime.md)을 출발점으로.
- credit 한 줄 = 제조사·분해 자료 출처 · 모델 작가(라이선스) · 실제가 아닌 것("내부 구조는 어림 형상"). CC BY는 작가·제목·출처·라이선스·변경 여부를 장부에 남긴다.
- 브랜드 로고는 그 물건 자체에 붙은 것만(배지). 따로 로고를 얹지 않는다.

## 조사 노트 틀 (`research/<slug>-3d.md`)
```
# <물건> 3D 소개 — 조사 노트
설명 목적: …
## 부품 그룹 (① 표)
## 기준 치수·배치·카드 숫자 (근거 id ↔ 출처, 교차 확인 여부)
## 모델 후보 (출처·라이선스·축척 오차·구조·크기·고칠 것) → 사용자 선택 결과
## 직접 만들 부품 (부품 · 근거 · 어림 정도)
## 맞춤 검사 결과 (FIT 줄 요약, 고친 것)
## 남은 한계 (화면 credit에 쓸 말)
```
