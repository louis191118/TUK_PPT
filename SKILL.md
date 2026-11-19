---
name: kpu-ppt
description: KPU_PPT 발표 덱 스킬. 주제만 설명하면 조사 → 근거 장부 → 장별 기획 → 시안 승인 → 시각화 HTML 덱(reveal.js, 직접 그린 SVG, three.js 3D) → 캡처 검수 → 독립 평가까지 단계별로 만든다. 숫자는 출처 있는 근거에서만. 발표·슬라이드·PPT·덱을 새로 만들 때, deck/ 폴더(STATE.md·brief.md·evidence/)가 있는 프로젝트에서 장을 만들거나 고치거나 검수할 때, 3D 도식 장면·실물 분해 장을 만들 때 쓴다. `/kpu-ppt <단계> [인자]` — init·research·outline·assets·design·build·scene·check·review·status.
---

# KPU_PPT — 단계별 발표 덱

한 번에 만들지 않는다. 단계마다 마크다운·JSON 파일을 남기고 사용자 승인을 받은 뒤 다음으로 간다. 맥락은 대화가 아니라 `deck/` 안의 파일에 있어서, 새 세션이나 다른 에이전트가 이어받아도 같은 품질로 계속한다.

## 경로
이 파일이 있는 폴더(스킬을 불러올 때 안내되는 Base directory)를 **`$KIT`**라고 부른다. 이 스킬의 모든 문서에서 `references/…`, `scripts/…`, `template/…`, `examples/…`는 `$KIT` 기준이다. 셸 명령에서는 `$KIT`를 절대 경로로 바꿔 쓴다.

CLI: `node "$KIT/scripts/deck.mjs" <명령>` (아래에서 `deck.mjs`라고 줄여 쓴다)

## 부르면 할 일
1. `deck.mjs status`로 지금 덱(`deck/STATE.md`)이 있는지, 어느 단계인지 본다.
2. [references/method.md](references/method.md)를 읽는다(모든 단계 공통: 정본 계층, 단계와 문, 장을 정하는 순서, 일 나누기, 규칙).
3. 인자 첫 단어가 단계 이름이면 `references/stages/<단계>.md`를 읽고 그대로 따른다. 나머지 인자는 그 단계의 입력이다.
   - 인자가 없으면: 덱이 있으면 상태를 보여 주고 STATE.md "다음"의 단계를 진행할지 묻는다. 덱이 없으면 `init`.
   - 단계 이름 없이 주제나 요청만 오면: 덱이 없으면 `init`에 그 말을 넘기고, 있으면 맞는 단계를 골라 따른다(장 하나 고치기 = `build <slug>`, 3D 장 = `scene <slug>`, 검사 = `check`).

| 단계 | 문서 | 남는 것 | 끝나는 조건 |
|---|---|---|---|
| init | [stages/init.md](references/stages/init.md) | brief.md, STATE.md, deck.json, web/ 뼈대 | 질문 I1~I8 답 |
| research | [stages/research.md](references/stages/research.md) | evidence/*.json 근거 장부, research/*.md | 사실 확인 통과 |
| outline | [stages/outline.md](references/stages/outline.md) | outline.md, 장 순서 | **사용자 승인** |
| assets | [stages/assets.md](references/stages/assets.md) | assets.json, 후보 모음 페이지 | **사용자가 보고 고름** |
| design | [stages/design.md](references/stages/design.md) | theme.css, 대표 장 1장 | **사용자가 보고 승인** |
| build | [stages/build.md](references/stages/build.md) | slides/<slug>.md, web/slides/<slug>.html, custom/<slug>.js | lint 통과 |
| scene | [stages/scene.md](references/stages/scene.md) | 3D 장(도식 장면·에셋 소개), assets/3d/ | 3D·대체 그림 캡처 검수 |
| check | [stages/check.md](references/stages/check.md) | reviews/<날짜>/ 캡처 + report.md | 오류 0 |
| review | [stages/review.md](references/stages/review.md) | evaluation.md | 사용자 반영 결정 |
| status | [stages/status.md](references/stages/status.md) | — | — |

## 읽을 것 (필요할 때)
| 문서 | 언제 |
|---|---|
| [references/interview.md](references/interview.md) | 사용자에게 묻는 질문 은행(I·R·O·A·D·B·S·V). 구조는 먼저 묻고, 취향은 보여 주고 묻는다 |
| [references/files.md](references/files.md) | deck/ 파일 형식(deck.json, evidence, derived.js, 장 기획, 장 HTML) |
| [references/assets.md](references/assets.md) | 사진·지도·화면·글꼴·3D 모델 조사와 라이선스, 에셋 장부 |
| [references/viz.md](references/viz.md) · [viz-patterns.md](references/viz-patterns.md) | 장의 근거를 그림으로 바꾸는 판단법, 참고 패턴 20종 |
| [references/design.md](references/design.md) | 시각 체계(흰 바탕·글꼴 하나·강조색 하나, 상자 없음), 테마 토큰 |
| [references/writing.md](references/writing.md) | 헤드라인·화면 글·대본 |
| [references/3d.md](references/3d.md) | 3D를 쓸지 판단, 두 형태, 지키는 것, 자기 점검 |
| [references/3d-build.md](references/3d-build.md) | 3D 에셋 만들기(`deck.mjs build3d`, Blender 없음) |
| [references/3d-runtime.md](references/3d-runtime.md) · [3d-asset-research.md](references/3d-asset-research.md) · [3d-taste.md](references/3d-taste.md) · [3d-interactions.md](references/3d-interactions.md) | 3D 런타임 API, 실물 모델 조사·제작, 움직임 취향, 시연·QR·출처 팝업 |

## 에이전트 띄우기
일을 나눌 때는 Agent 도구로 서브에이전트(`general-purpose`)를 띄운다. 역할 지시문은 `references/agents/<이름>.md`에 있다. 프롬프트 첫 줄: "`<$KIT 절대 경로>/references/agents/<이름>.md`를 읽고 그 역할로 일한다. 경로는 그 스킬 폴더 기준이다." 그다음 그 문서의 "입력"을 붙인다. 서로 다른 장·질문은 **한 메시지에서 병렬로** 띄운다.

| 에이전트 | 하는 일 | 모델 |
|---|---|---|
| [researcher](references/agents/researcher.md) | 하위 질문 하나 → evidence + 조사 노트 | sonnet |
| [fact-checker](references/agents/fact-checker.md) | 장부·대본 숫자를 원문과 대조 | sonnet |
| [asset-scout](references/agents/asset-scout.md) | 필요 하나 → 에셋 후보 2~3개 | sonnet |
| [slide-builder](references/agents/slide-builder.md) | 장 하나 설계·제작·자기 비판 | 기본 |
| [scene-builder](references/agents/scene-builder.md) | 3D 장 하나(도식 장면·에셋 소개) | 기본 |
| [model-builder](references/agents/model-builder.md) | 실물 3D 에셋 조사·다듬기·직접 만들기 | 기본 |
| [reviewer](references/agents/reviewer.md) | 만든 과정을 모르는 독립 평가 | 기본 |

## CLI (`deck.mjs`)
| 명령 | 하는 일 |
|---|---|
| `init [dir] --title T --minutes M` | `template/`을 복사해 deck/ 뼈대 |
| `stage <단계> [--now 글] [--next 글]` · `status` | STATE.md 단계 갱신 · 단계·장별 완성도·시간 |
| `assemble` · `lint` | 장 HTML을 모아 web/index.html · 정적 검사(출처 없는 숫자 등) |
| `serve [--port 8800]` | 미리보기(S 키: 발표자 노트) |
| `capture [--steps] [--only a,b] [--no3d] [--size 1440x810]` | 헤드리스 Chrome 검수 캡처 + report.md |
| `build3d <장면.mjs> [-- 인자]` | 3D 에셋(GLB·PNG·JSON)을 헤드리스 Chrome + three.js로 (예시: `route-city`, `power-bank`) |
| `assets` · `upgrade` | 에셋 후보 페이지 · 스킬 갱신 뒤 덱 런타임(web/js·vendor) 갱신 |

필요한 것: Node 22 이상(의존성 없음), Chrome·Chromium·Edge 중 하나(`CHROME_PATH`로 지정 가능). 3D도 같은 Chrome으로 만든다.

## 지키는 원칙
- **숫자를 지어내지 않는다.** 덱의 모든 숫자는 근거 장부 id(`data-num`, `num(id)`)로만 들어가고, 쓴 장 하단에 출처가 자동으로 붙는다.
- **에셋도 근거처럼.** 라이선스·출처가 장부에 있고 사용자가 고른 것만 화면에 들어간다.
- **그림은 메뉴에서 고르지 않는다.** 장마다 "3초 안에 보여야 할 관계 하나"를 정하고 직접 설계한다.
- **단계를 건너뛰지 않는다.** "바로 만들어"라고 해도 init·outline 승인·design 승인은 짧게라도 거친다.
- **3D는 설명할 때만.** 평면이면 놓치는 관계에만 쓰고, 근거 비율대로 그리고, 글자는 굽지 않고, 언제나 같은 카메라의 대체 그림이 있다.
- 사용자 결정은 `deck/decisions.md`에 말 그대로 쌓는다. 단계가 끝나면 `deck.mjs stage <다음>`.

## 폴더
```
SKILL.md            이 문서 (입구)
references/         method · interview · files · assets · viz · design · writing · 3d-*
  stages/           단계별 절차 10개 (/kpu-ppt <단계>)
  agents/           서브에이전트 역할 지시문 7개
scripts/            deck.mjs + lib/ (CLI) · 3d/ (kit3d.js, runner.html, 예시 장면 route-city·power-bank)
template/           init이 복사하는 deck/ 뼈대와 런타임(web/js/viz, vendor: reveal.js·three.js·Pretendard)
themes/             테마 토큰(minimal.css)
examples/gallery/   패턴 20종 + 직접 설계 1장 + 3D 도식 장면(scene3d) + 3D 에셋 소개(asset3d) 예시 덱 (예시 값)
examples/sumgil/    실제 발표 "숨길"의 3D·인터랙션 런타임 코드 (읽고 배우는 용도)
```

## 세션 시작 때 덱 상태 자동 안내 (선택)
스킬은 훅을 가질 수 없다. 원하면 프로젝트 `.claude/settings.json`에 SessionStart 훅을 넣는다:
```json
{ "hooks": { "SessionStart": [ { "hooks": [ { "type": "command", "command": "node \"<$KIT 절대 경로>/scripts/deck.mjs\" hook-session" } ] } ] } }
```
