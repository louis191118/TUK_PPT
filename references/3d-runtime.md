# 런타임 — stage3d.js · inspect3d.js · 숨길 지도 기법

모두 `web/js/viz/`(런타임, `deck.mjs upgrade`로 갱신)와 `web/vendor/three/`(r170). 장 모듈은 `web/js/custom/<slug>.js`.

## stage3d.js API
```js
import { THREE, createStage, watchSlide, loadGLB, loadJSON, want3d, Polyline, checkRatio,
         tagProgress, progressMaterial, edgeFade, Tweens, ease, damp, merge, studioEnv, blobShadow } from '../viz/stage3d.js';
```
| 이름 | 하는 일 |
|---|---|
| `createStage(host, ctx, { width, height, left, top, look, fov, note, alt, onLost })` | 칸 하나(div.s3d) + 라벨 층(SVG). `look: 'diagram'`(투명·unlit·NoToneMapping) / `'product'`(흰 바탕·Neutral·스튜디오 환경맵) |
| `st.start3d()` | 렌더러를 만든다(3D를 쓸 때만). 컨텍스트 손실 → `st.lost` |
| `st.tok('--c-accent')` | 토큰 → THREE.Color. 3D 색은 이것으로만 |
| `st.label(key, { parts, cls, leader })` · `st.place(key, [x,y], { side, dx, dy })` · `st.show(key, on)` | 라벨(32px, 'pin' 지명 · 'pk' 강조 · 기본 회색). 3D 점은 `st.project(v)`로 px |
| `st.frame(fn)` · `st.kick()` · `st.stop()` · `st.continuous` | 프레임 콜백(dt초, now) — 하나라도 true면 계속. 장이 안 보이면 돌지 않는다 |
| `st.lost(why)` · `st.image(src)` | 대체 그림으로. `why = 'no3d'`면 경고, 그 밖은 console.error(검수 ERROR) |
| `st.prewarm(showAll, restore)` | 셰이더 예열(숨긴 캔버스에 모든 상태로 두 번 그림) |
| `watchSlide(section, { enter, step, leave }, st)` | enter(n) = 바로 놓기(처음·장 들어옴·움직임 줄이기), step(n, prev) = 장 안 단계 변화, leave() |
| `Tweens` | `T.to(obj, key, 목표, ms, ease)` · `T.tick(now)` · `T.finish()`. 같은 값에 새 트윈이 오면 지금 값에서 이어 간다 |
| `ease.inOut` · `ease.drive` · `ease.smoother` · `ease.out` · `damp(k, dt)` | 카메라·지우기 / 경로 그리기(차처럼 출발·정지) / 분해 / 나타나기 / 프레임 독립 감쇠 |
| `Polyline(points)` · `.at(f)` · `.fractionOf(x, z)` · `.len` | 중심선 길이 비율 ↔ 위치 |
| `tagProgress(geo, line)` + `progressMaterial(mat, flow?)` | 정점마다 길이 비율 aT → `u.uProg`보다 뒤 조각 버림(그려지기), `uStart`보다 앞 버림(흘러 빠지기), flow = 길 위로 흐르는 색 띠 |
| `edgeFade(mat, st, { inner, outer })` | 칸 가장자리에서 바탕색으로(초타원). 대체 PNG의 `dk.fadeCanvas`와 같은 식 |
| `checkRatio(이름, 그린 비율, 근거 비율, 0.03)` | 정직성 검사 |
| `studioEnv(renderer)` · `blobShadow(w, d)` | HDRI 없는 스튜디오 환경맵 · 그림자 맵 없는 접지 그림자 |

`window.__deck3d[slug]` = `{ mode: '3d'|'fallback', frames, medianMs, quality }` — 실제 브라우저에서 성능 확인.

## 도식 장면 모듈 만들기 (route3d.js가 출발점)
1. `loadJSON(<name>.json)` — 장면 스크립트(build3d)가 쓴 카메라·마커·중심선·anchors·fade. 중심선으로 `Polyline` → `checkRatio`.
2. `createStage(...)` + 라벨. `want3d(cfg)`면 `build3d()`, 아니면 `st.lost('no3d')`.
3. build3d: `st.start3d()` → `loadGLB` → 메시마다 `MeshBasicMaterial({ vertexColors })`. 경로는 `tagProgress` + `progressMaterial`, 바닥·건물은 `edgeFade`(마커는 빼서 또렷하게). 그리는 중의 둥근 머리(구체, 구운 색 밝은 쪽 평균). 카메라 = JSON 그대로(fov·자리), 단계마다 거리만 바꾼다(`camDist`).
4. `apply()` 하나에서 상태(S) → uProg·머리 위치·카메라·라벨 자리. 라벨은 경로 머리가 라벨 자리를 지난 뒤 켠다.
5. 대체: PNG 단계 파일 + anchors(0~1) × 칸 크기(object-fit contain)로 같은 라벨 자리.
6. `watchSlide`: enter = 상태 바로, step = 트윈(앞으로 = 그 길 길이 ÷ 기준 길이 × drawSec, ease.drive / 뒤로 = backSec, inOut) + 카메라 1.0초.

### 숨길 지도에서 더 쓴 기법 (examples/sumgil/web/hero-map.js, 설정은 hero-map.md)
| 기법 | 언제 | 어떻게 |
|---|---|---|
| **반복 모드 + 흐르는 색 띠** (`loop`) | 표지·마무리처럼 머무는 장 | 길은 늘 완성. 색 띠만 출발→도착으로 흐른다: 위상 = 거리/λ − 시간/주기(두 길이 같은 속도). 띠는 뒤가 길게 차오르고 앞이 부드럽게 잦아듦(`shape`). 강조 길은 같은 계열 밝은 색(#8BF7BE 쪽), 회색 길은 푸른 회색. 띠 밖 길은 살짝 어둡게(`base`)해야 띠가 보인다 |
| **칸 단위 잔잔한 파도** (`wave`) | 반복 모드에서 "살아 있는" 도시 | 바닥의 도로선(얇은 흰 띠)을 찾아 칸을 나누고, 칸마다 옆면 있는 판을 만들어 칸 중심의 물결 높이로 통째로 오르내림(휘지 않음). 건물은 칸과 함께, 도로선은 고정, 경로·마커는 최고 높이만큼 띄워 고정. 물결 = 두 사인 겹침, 위로만, 도시 바깥으로 잦아듦. 진폭 0.27·주기 6.4초(사용자 "아주 조금 더 세게") |
| **작은 차** (`car`) | 경로의 "이동"을 보이고 싶을 때 | 로우폴리(둥근 차체+지붕+바퀴 4) 정점 색 음영, unlit. 단계 모드: 그려지는 머리 바로 앞에서 달리다 도착하면 사라짐. 반복 모드: 띠 하나에 한 대, 띠와 같은 위상 → 짧은 길의 차가 먼저 도착 |
| **비율이 다른 칸** (`fitBox`) | 칸 비율 ≠ PNG 비율 | 가로 화각 기준 + 내용 점들이 상자에 맞게 fov·viewOffset 조정 |
| **타원 가장자리 사라짐** | 경로가 대각선으로 길 때 | 화면 공간 타원을 출발–도착 대각선에 맞춤(초타원 대신) |

## inspect3d.js 설정 (에셋 소개)
장 HTML:
```html
<section data-slug="ev-anatomy" data-wait="3500">
  <figure class="viz" data-viz="custom" data-module="viz/inspect3d.js"><script type="application/json">{ … }</script></figure>
</section>
```
장 기획: `explore: true`, `steps: <단계 수 − 1>` (9단계까지 허용), 대본 [→] 수 = steps.

숨김 장 해부를 그대로 재현한 설정(검수 캡처로 확인함, 숫자는 근거 id):
```json
{
  "models": [ { "file": "assets/3d/ioniq6.glb", "groupBy": { "^wheel": "wheels", ".": "body" } }, { "file": "assets/3d/egmp.glb" } ],
  "poster": "assets/3d/ioniq6-poster.png",
  "kicker": "E-GMP · IONIQ 6",
  "credit": "현대자동차 · InsideEVs · 차체 3D Car2022 (CC BY 4.0) · 내부 구조는 어림 형상",
  "paint": { "match": "paint", "color": "#E4E7EA" },
  "groups": {
    "body": { "name": "차체", "explode": [0, 1.35, 0], "order": 0, "shell": true },
    "wheels": { "name": "휠 · 타이어", "explode": [0, 0, 0.55], "order": 1, "outward": true },
    "battery": { "name": "배터리 팩", "explode": [0, -0.62, 0], "order": 2,
                 "sub": { "pack_tray": [0, -0.16, 0], "cooling_plate": [0, 0.1, 0], "modules": [0, 0.3, 0], "bms": [0, 0.5, 0], "pack_cover": [0, 0.72, 0] } },
    "rear_pe": { "name": "뒤 PE 시스템", "explode": [-0.72, -0.08, 0], "order": 3 },
    "front_pe": { "name": "앞 PE 시스템", "explode": [0.72, -0.08, 0], "order": 3 },
    "charging": { "name": "ICCU · 충전구", "explode": [-0.35, 0.28, 0], "order": 4 },
    "thermal": { "name": "열관리", "explode": [0.5, 0.32, 0], "order": 4 },
    "hv": { "name": "고전압 케이블", "explode": [0, -0.3, 0], "order": 2, "flow": true },
    "chassis": { "name": "서스펜션 · 서브프레임", "order": 5 }
  },
  "steps": [
    { "name": "외관", "paint": 1, "cam": { "t": [0, 0.6, 0], "az": 38, "el": 11, "d": 9.6 }, "idleSpin": true },
    { "name": "투시", "paint": 0, "ghost": 1, "pulse": 0.25, "cam": { "t": [0, 0.55, 0], "az": 28, "el": 21, "d": 9.8 } },
    { "name": "분해", "paint": 0, "ghost": 0.8, "ex": 1, "tags": true, "cam": { "t": [0, 0.95, 0], "az": 34, "el": 22, "d": 15.6 } },
    { "name": "배터리", "paint": 0, "ghost": 0.18, "ex": 1, "focus": ["battery"], "sub": 1, "anchor": "battery",
      "cam": { "t": [0, -0.05, 0], "az": 24, "el": 40, "d": 11.4 }, "card": { "title": "배터리 팩", "num": "ev-kwh", "note": "모듈 {ev-modules}개 · 셀 {ev-cells}개" } },
    { "name": "충전", "paint": 0, "ghost": 0.5, "focus": ["charging", "hv"], "pulse": 1, "anchor": "charge_port",
      "cam": { "t": [-0.7, 0.5, 0], "az": -142, "el": 17, "d": 10.4 }, "card": { "title": "800 V 초고속 충전", "num": "ev-charge-min", "note": "10 → 80 %" } },
    { "name": "조립", "paint": 1, "cam": { "t": [0, 0.6, 0], "az": -32, "el": 9, "d": 9.4 }, "idleSpin": true }
  ]
}
```
| 단계 키 | 뜻 |
|---|---|
| `paint` 0..1 | 외피(shell 그룹) 칠. 0이면 사라짐 |
| `ghost` 0..1 | 외피 투시 외곽선(프레넬) — 칠이 빠질 때만 보임 |
| `ex` 0..1 | 그룹 분해. `order` 순서로 겹치며(앞 그룹 반쯤에 다음 시작), 바닥 그림자도 같이 내려감 |
| `focus` · `sub` | 초점 그룹(나머지는 밝게 흐림) · 그 그룹 안쪽 분해 |
| `tags` | 분해가 85% 넘으면 모든 그룹 이름표(왼쪽·오른쪽 두 열, 세로로 겹치지 않게) |
| `card` · `anchor` | 오른쪽 카드(제목·큰 숫자·한 줄) + 초점 부품까지 녹색 리더선(그려지듯). 카드가 있으면 장면이 250px 왼쪽으로 비킨다 |
| `pulse` | flow 그룹에 흐르는 빛(강조색) |
| `idleSpin` | 손대지 않으면 3.5초 뒤 천천히 돎(첫·끝 단계만). 그 밖 단계는 유휴 때 처음 자리로 돌아옴 |
| `cam` | `t` 바라보는 점, `az`·`el` 도, `d` 미터. 단계 사이는 감쇠로 부드럽게 이동 |

조작: 드래그 = 돌리기, 휠 = 거리(0.65~1.5배), 두 번 누르기 = 처음 자리, 마우스 올리기 = 그룹 이름, 아래 단계 이름 누르기 = 그 단계로.

## 성능 (2026-11-18, M4 · Chrome 계열에서 잰 것)
- 그림자 맵(VSM) + HDR 후처리 + 블룸: 약 24fps, 셰이더 준비 42초 → **후처리·그림자 맵 없이** 기본 MSAA + Neutral 톤매핑 + 그림자 판으로 바꿔 60fps.
- 숨겼다 다시 보이는 메시는 Metal(ANGLE)이 다시 올리느라 12프레임쯤 70~140 ms 멈춤 → 투명도·밝기로만 흐리게.
- 외피 반투명은 처음부터 transparent(깊이는 기록) — 바뀔 때 셰이더가 다시 만들어지지 않게. 양면 반투명은 `forceSinglePass`.
- 처음 그리는 셰이더·혼합 조합은 그 자리에서 준비돼 100 ms쯤 멈칫 → `st.prewarm`(모든 상태를 켠 채 숨긴 캔버스에 두 번).
- 해상도: `min(상한, dpr × Reveal 배율 × quality)`, 90프레임 중앙값 > 22 ms면 quality × 0.85(하한 0.55).
- 무거운 장면(숨김 장)은 처음 열 때만 `import()`.

## 검수
- `<section data-wait="ms">`: 단계마다 그 시간 기다렸다 찍는다(경로 그리기·카메라 1~2초 → 2600, 분해 감쇠 → 3200~3500).
- `deck.mjs capture --steps --only <slug>`(3D, 헤드리스는 소프트웨어 WebGL이라 느려도 정상) + `--no3d`(대체 그림). 두 캡처의 라벨 자리를 비교한다.
- 헤드리스 캡처는 성능을 말해 주지 않는다 → 실제 브라우저에서 `window.__deck3d` / `window.__inspect3d`.

## 흔한 실수 (만들면서 실제로 걸린 것)
| 증상 | 원인 | 고침 |
|---|---|---|
| 장이 하얗게 비고 오류도 없음 | meshopt 압축 GLB를 디코더 없이 읽음, 실패가 경고로만 | `loadGLB`가 디코더를 늘 붙이고, 의도 아닌 실패는 console.error |
| 작은 물체 분해 때 부품이 화면 밖 | 자동 분해 거리가 미터 고정 | 모델 크기 단위 `U`(대각선 ÷ 5.5)로 잰다, `unit`으로 덮어씀 |
| 분해한 부품이 글·단계 목록을 덮음 | 분해 방향이 카메라 쪽 | 방향을 카메라와 비껴서, 그 단계 `cam.d`를 늘려서 |
| 리더선이 화면 밖으로 | 기준점이 화면 밖 | 화면 안 기준점에만 긋는다(inspect3d가 처리) |
| 작은 물체가 잘림 | 카메라 near가 0.3 m | near/far = 첫 단계 거리 × 0.02 / × 30 |
| 웹 장면이 PNG보다 어둡고 바닥 끝이 잘림 | 굽기 때 바깥 바닥이 없어 반사광 부족, 바닥이 화면보다 작음 | 바닥에 큰 바깥 고리(4장)를 붙여 굽는다 |
