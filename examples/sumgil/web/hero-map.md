# hero-map.js — 01장 3D 도식 지도 (수원역 → 강남역, 자동차 두 경로)

v8 1장 지도 장면(`slides/js/scenes/map.js`, 승인)의 모양을 KPU_PPT custom 그림 모듈로 옮긴 것. 흰 도식 도시 위에 회색(수도권제1순환고속도로 이용)과 초록(거리우선) 경로가 차례로 그려진다.

## 장에 넣는 법

```html
<figure class="viz body" data-viz="custom" data-module="custom/hero-map.js">
  <script type="application/json">
    {
      "note": false,
      "labels": {
        "e": { "name": "수도권제1순환고속도로", "num": "car-e-km" },
        "a": { "name": "거리우선", "num": "car-a-km" }
      }
    }
  </script>
</figure>
<p class="foot-l">지도 도식 · 실제 경로 형상 아님</p>
```

- `figure.body`(1632×670) 왼쪽 1100×670에 지도를 그린다. 오른쪽 532px(x 1244~1776)은 비어 있다 → 숫자 레일 자리.
- 장 기획(`slides/<slug>.md`)의 `steps`는 2 이상. 3단계를 쓰면 지도는 2단계 모습 그대로 있다.
- `"num"` 키는 KPU_PPT lint가 근거 장부에서 확인한다. 라벨의 km 글자는 `num()`으로만 만든다(코드에 숫자 없음).

## 단계 (`section[data-step]`)

| 단계 | 지도 | 카메라 | 라벨 |
|---|---|---|---|
| 0 | 도시 + 출발 원판 + 도착 핀 | `wide` (거리 ×1.07) | 수원역 · 강남역 |
| 1 | 회색 42km 경로가 출발에서 도착까지 그려짐 (약 1.76초) | `mid` (×1.035), 1.0초 ease-in-out | + "수도권제1순환고속도로 42km" (경로 머리가 라벨 자리를 지나면 나타남) |
| 2 | 초록 31km 경로가 그려짐 (1.3초) | `base` (×1, PNG와 같은 자리) | + "거리우선 31km" |

- 두 경로는 **같은 속도**로 그린다: 그리는 시간 = `drawSec` × (그 경로 길이 ÷ 초록 길이). 회색이 42/31배 오래 걸린다.
- 뒤로 가면 0.6초에 지우고 라벨도 같이 사라진다. 장에 들어올 때(앞·뒤 어느 쪽이든)는 애니메이션 없이 그 단계 모습으로 바로 놓는다(main.js가 `data-step`을 맞출 때까지 두 프레임 기다림).
- `prefers-reduced-motion`이면 늘 바로 놓는다. 장이 `present`가 아니면 그리지 않는다. 움직일 때만 그린다.

## cfg (모두 선택, 기본값은 `hero-map.js`의 `DEFAULTS`)

| 키 | 기본 | 뜻 |
|---|---|---|
| `width`, `height`, `left`, `top` | 1100, 670, 0, 0 | figure 안 지도 칸(px). 비율 1.642이면 대체 PNG와 카메라가 똑같다. 다르면 가로 화각 기준으로 `fitBox`에 맞춰 줌·이동 |
| `steps` | 위 표 | `[{ "e": 0/1, "a": 0/1, "cam": "wide"/"mid"/"base" 또는 거리 배율 숫자 }]`. 배열을 주면 통째로 바뀐다. 단계 수보다 짧으면 마지막 것을 쓴다 |
| `camDist` | `{wide:1.07, mid:1.035, base:1}` | 자세 이름 → 바라보는 점까지 거리 배율 |
| `camSec` · `drawSec` · `backSec` | 1.0 · 1.3 · 0.6 | 카메라 이동 · 초록 그리기 · 지우기(초) |
| `labels.origin` / `labels.destination` | 수원역(아래) / 강남역(위) | `{ text, side, dx, dy }`. 지명은 점·리더선 없이 마커 옆 |
| `labels.e` / `labels.a` | 순환고속도로 · `car-e-km` · at 0.30 아래 / 거리우선 · `car-a-km` · at 0.36 왼쪽 | `{ name, num, at, side, dx, dy }`. `at` = 경로 길이 비율 위치(● 6px), `dx·dy` = 리더선 끝(px), `side` = 글자가 끝점의 어느 쪽(`left·right·above·below`) |
| `fontSize` | 32 | 라벨 글자(px) |
| `note` | "지도 도식 · 실제 경로 형상 아님" | 지도 칸 왼쪽 아래 24px 한 줄. 장의 `.foot-l`에 쓸 때는 `false` |
| `fade` | `[0.5, 1.0]` | 바닥·건물이 바깥으로 사라지는 타원 거리(v8과 같음). `[9, 10]`이면 끈다 |
| `fitBox` | `[0.11, 0.10, 0.80, 0.74]` | 비율이 다를 때만 쓰는 내용 상자 |
| `fallback` | `"auto"` | `"png"`면 늘 PNG |
| `hideLabels` · `alt` | false · "" | 라벨을 숨긴다 / 그림 설명(스크린 리더) |
| `loop` | false | 반복 모드(표지). `{ lam, sec, a: { amt, tint }, e: { amt, tint } }`. 두 길은 늘 완성된 채로 두고(지우지 않음), 길 위로 색 그라데이션 띠가 출발→도착으로 흐른다. 위상 = 출발에서 잰 거리/lam − 시각/sec라 두 길에서 같은 속도. tint = 구운 정점 색에 곱하는 배율(초록 밝게, 회색 짙게), amt = 세기. 카메라 고정. 단계(`data-step`)는 무시. 움직임 줄이기·PNG 대체면 움직이지 않는다 |
| `wave` | false | 잔잔한 파도(반복 중에만 움직임). `{ amp, len, sec, r0, r1 }` = 높이·물결 길이(장면 단위)·주기(초)·잦아드는 반지름. 바닥의 도로선(흰 띠)을 찾아 칸을 나누고, 바닥 판에서 칸 안쪽 삼각형을 떼어 칸마다 한 조각 판(옆면 포함, 원래 구운 색)을 만든다. 칸 판과 그 위 건물은 칸 중심의 물결 높이로 통째로(휘지 않고) 오르내린다. 원래 바닥·도로선은 그대로, 경로·마커는 물결 최고 높이만큼 고정으로 띄워 칸 위에 흔들림 없이 놓인다. 물결 = 두 사인 겹침(위로만), 도시 바깥으로 잦아듦 |
| `ratioTolerance` | 0.03 | 그린 길이 비율 ↔ 근거 km 비율 허용 차이 |
| `car` | false | 작은 차(선택 기능). `true`나 객체면 켠다(아래 표). 지금 쓰는 곳: 표지(반복 모드) `{"routes":["a","e"]}`, 2장(단계 모드) `{"routes":["a","e"],"size":0.95}`. 마무리(12장)는 끔 |

### `car` (작은 차)
three.js로 직접 만든 로우폴리 차(둥근 차체 + 지붕 + 바퀴 4개, 외부 모델 없음). 조명은 장면처럼 정점 색에 굽고(면 방향 음영) unlit 재질로 그린다. 경로 중심선(`route_a`·`route_e`)을 따라가며 진행 방향으로 돈다. 튜브 위에 반지름 절반만큼 묻혀 놓이고, 파도(`wave`) 중이면 경로처럼 물결 최고 높이만큼 띄운다.
- **반복 모드**(`loop`): 흐르는 띠 하나마다 차 한 대. 차 중심 거리 = `lam × (위상 + 시각/sec + n)`이라 띠와 같은 속도·같은 위상(띠 머리 바로 앞, 뒤로 띠가 꼬리처럼 남음). 두 길이 같은 속도라 초록 차가 먼저 도착한다. 반복을 시작한 뒤 출발에서 나온 차만 보인다(장에 들어오는 순간 길 중간에 차가 갑자기 있지 않게, 첫 차는 약 0.6초 뒤 출발 원판에서 나옴). 출발 `fadeIn` 거리 동안 페이드·스케일 인, 도착 전 `fadeOut` 거리 동안 페이드·스케일 아웃.
- **단계 모드**: 앞으로 그려지는 경로의 머리에 한 대(차 중심 = 그려지는 끝 + `ahead`, 차 꽁무니에서 길이 나옴). 도착하면 `outSec` 동안 사라진다. 뒤로 가기(지움)·장 들어오기(바로 놓기)·장 떠나기·`prefers-reduced-motion`이면 차를 바로 없앤다. PNG 대체(`?no3d`, WebGL 실패)에는 차가 없다.

| 키 | 기본 | 뜻 |
|---|---|---|
| `routes` | `["a","e"]` | 차를 올릴 경로 |
| `size` | 0.62 | 차 길이(장면 단위, 초록 경로 길이 약 19.7). 폭 = 0.52배 |
| `fadeIn` · `fadeOut` | 1.2 · 0.8 | 출발 뒤 · (반복) 도착 전 페이드·스케일 거리(장면 단위) |
| `outSec` | 0.45 | (단계) 도착 뒤 사라지는 시간(초) |
| `ahead` | 0.22 | (단계) 차 중심이 그려지는 끝보다 앞선 거리 |
| `lead` · `phase` | 0.6 · null | (반복) 차 중심 위상 = `shape[1] + lead × (shape[2] − shape[1])`. `phase`를 주면 그 위상(0..1) 그대로 |
| `every` | 1 | (반복) 띠 몇 개마다 한 대 |
| `a` · `e` | `{ body: "#FFFFFF", cabin: null }` | 차체·지붕 색. `cabin`을 비우면 초록 길 = `--c-accent`, 회색 길 = `--c-text-4` |
| `wheel` | null | 바퀴 색. 비우면 `--c-text-2` |

라벨 4개(한 화면 최대 4개 규칙). 색은 theme.css 토큰만: 지명 `--c-text`, 회색 경로 라벨 `--c-text-2`, 초록 경로 라벨 `--c-accent-text`, 점·리더선 `--c-text`, 흰 외곽선 `--c-halo`. 글자는 렌더에 굽지 않는다(SVG 텍스트).

## 정직성 확인
- 두 중심선 길이 비율 = `car-e-km ÷ car-a-km`(42/31 = 1.3548). 장면 스크립트가 `deck/evidence/lookup.json`에서 km를 읽어 회색 남동 모서리 반지름을 이분법으로 풀어 맞춘다(초록 19.677, 회색 26.660 장면 단위).
- 실행할 때 `num()` 값으로 다시 확인하고, 3% 넘게 다르면 `console.error`(검수 캡처의 ERROR로 잡힘) → GLB·PNG를 다시 만든다.

## 파일
| 파일 | 내용 |
|---|---|
| `js/custom/hero-map.js` | 모듈 |
| `assets/render/city-gn.glb` | 도시·마커·경로 튜브, 조명·AO를 정점 색으로 구움(약 7만 삼각형) |
| `assets/render/routes-gn.json` | 카메라, 마커 좌표, 경로 중심선(`route_e` 회색 · `route_a` 초록), 길이, km |
| `assets/render/hero-gn-0.png` · `hero-gn-1.png` · `hero-gn.png` | WebGL 실패 대체(0·1·2단계, 2200×1340, 같은 카메라) |
| `assets/render/anchors-gn.json` | PNG 위 라벨 자리(마커, 경로마다 0~1을 101점) |
| `vendor/three/` | three.js r170 + GLTFLoader (slides/vendor/three 복사, LICENSE 포함) |
| `_test/hero.html`, `_test/shot.mjs`, `_test/make-deck.mjs` | 시험(덱에 안 들어감) |

## WebGL 실패
`?no3d`, WebGL 없음, GLB 로드 실패, 컨텍스트 손실 → `<img>`로 같은 카메라 PNG를 단계에 맞춰 바꿔 보이고, 라벨은 `anchors-gn.json` 좌표에 같은 모양으로 얹는다. 카메라 이동·그리기 애니메이션은 없다.

## 다시 만들기
원래 덱에서는 Blender 스크립트(`render_gn.py`·`export_gn.py`)로 만들었다. 키트에서는 같은 장면을 `deck.mjs build3d`로 만든다: 출발점 `scripts/3d/route-city.mjs`에 물 띠·대로·외곽 길·casing(반지름을 키운 흰 관)을 더한다. 방법은 [../../../references/3d-build.md](../../../references/3d-build.md).
- km 값이 바뀌면 다시 돌린다(회색 길이가 다시 맞춰짐). 라벨 "거리우선"을 크게 옮기면 `--keep-out`(건물 비울 화면 상자)도 바꾼다.
- 도시 배치는 시드 고정. 건물은 두 경로·대로·동쪽 길·라벨 자리에서 뺀다.

## 시험
```sh
cd deck/web && python3 -m http.server 8771 --bind 127.0.0.1
# 모듈만: http://127.0.0.1:8771/_test/hero.html#0 (←/→ 단계, P = 장 떠났다 돌아오기, ?no3d = PNG 경로, ?bare, ?frame)
node _test/shot.mjs --out _test/shots --steps 0,1,2 --wait 2600 --mid 900
node _test/shot.mjs --url "http://127.0.0.1:8771/_test/hero.html?no3d" --name png --out _test/shots --steps 0,1,2 --wait 800
# 실제 런타임(reveal + main.js + 근거 장부)으로: node _test/make-deck.mjs → http://127.0.0.1:8771/_test/deck.html#/1
```
- KPU_PPT 검수 캡처는 단계마다 기다림이 짧으면(기본 800ms) 그리는 중간을 찍는다. 이 장은 `--wait 2400` 이상으로 찍는다.
