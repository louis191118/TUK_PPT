# 방법 — 단계별 발표 덱 제작

한 번에 덱을 만들지 않는다. 단계마다 **파일 하나를 산출물로 남기고, 사용자 승인을 받은 뒤** 다음 단계로 간다. 맥락은 대화가 아니라 `deck/` 안의 마크다운·JSON에 있다. 새 세션은 `deck/STATE.md`만 읽으면 이어서 할 수 있어야 한다.

## 정본 계층 (위가 아래를 이긴다)
1. `deck/brief.md` — 주제·청중·목적·시간·채점 기준·정본 자료·사용자 결정 값
2. `deck/evidence/*.json` — 근거 장부. **덱의 모든 숫자·사실은 여기 id로만 들어간다**
   `deck/assets.json` — 에셋 장부. **사진·지도 데이터·화면·글꼴은 출처·라이선스가 여기 있어야 들어간다**
3. `deck/outline.md` + `deck/deck.json` — 장 순서·설명 목적·시간 배분
4. `deck/slides/<slug>.md` — 장별 기획(헤드라인·형태·단계·대본·예상 질문)
5. `deck/web/` — 코드. 위 파일에서 만들어진다. 코드에 숫자나 대본을 직접 쓰지 않는다

`deck/decisions.md`는 사용자 결정을 말 그대로 날짜와 함께 쌓는 기록이다. 기획 문서 안에 "v4→v5 바뀐 것" 같은 변경 일지를 쌓지 않는다.

## 단계와 문 (gate)
| 단계 | 명령 | 산출물 | 끝나는 조건 |
|---|---|---|---|
| 0 init | `/kpu-ppt init` | brief.md, STATE.md, deck.json, web/ 뼈대 | 질문 I1~I8 답(또는 기본값) |
| 1 research | `/kpu-ppt research` | research/plan.md, research/*.md, evidence/*.json | 하위 질문마다 근거, `fact-checker` 통과 |
| 2 outline | `/kpu-ppt outline` | outline.md, deck.json slides 순서 | **사용자 승인** (O1~O5) |
| 2.5 assets | `/kpu-ppt assets` | assets.json(에셋 장부), 후보 모음 페이지, 참고 사례 | **사용자가 후보를 보고 고름** (A1~A3) |
| 3 design | `/kpu-ppt design` | web/css/theme.css, 대표 장 1장 | **사용자가 시안을 보고 승인** (D1~D4) |
| 4 build | `/kpu-ppt build` | slides/<slug>.md, web/slides/<slug>.html | `deck lint` 통과, B1~B2 |
| 5 check | `/kpu-ppt check` | reviews/<날짜>/ 캡처 + report.md | 오류 0 |
| 6 review | `/kpu-ppt review` | reviews/<날짜>/evaluation.md | 사용자 반영 결정 (V1~V2) → 4로 |

- 단계를 건너뛰지 않는다. 사용자가 "바로 만들어"라고 해도 init·outline 승인·design 승인은 짧게라도 거친다. 이 셋이 재작업의 대부분을 막는다.
- 단계가 끝나면 `node "$KIT/scripts/deck.mjs" stage <다음 단계>`로 STATE.md를 갱신한다.
- 언제 무엇을 묻는지는 [interview.md](interview.md). **구조는 먼저 묻고, 취향은 보여 주고 묻는다.**
- 파일 형식은 [files.md](files.md). 에셋 조사·선택은 [assets.md](assets.md). 3D 장면·실물 모델·인터랙션은 `references/3d.md`.
- 근거만큼 에셋도 조사한다. 사진·지도·화면·글꼴·3D 모델·소품·참고 사례를 2~3개 후보로 모으고 **사용자가 보고 고른다**. 아무거나 첫 검색 결과를 넣지 않는다.
- **고품질 오픈소스를 최대한 쓴다**: 찾은 것 그대로 → 다듬어서 → 직접 만들기는 3곳 이상 뒤져도 없을 때만(assets.md "원칙").

## 장을 정하는 순서 (outline·build 공통)
장마다 이 순서로 정한다. 앞이 비면 뒤를 정하지 않는다.
1. **설명 목적**: 청중이 이 장을 본 뒤 알거나 믿어야 할 것 한 문장
2. **청중의 질문**: 이 장이 답하는 물음
3. **근거**: evidence id (없으면 조사로 돌아간다. 지어내지 않는다)
4. **보여야 할 관계 하나 → 그림**: `references/viz.md`의 설계 절차로 장마다 직접 설계한다. 참고 패턴은 예시일 뿐 메뉴가 아니다
5. 헤드라인(주장 한 문장) → 단계(fragment ≤ 3) → 대본 → 예상 질문

## 일 나누기
- 조사: 하위 질문마다 `researcher` 에이전트를 병렬로. 각자 `evidence/<질문-slug>.json`과 `research/<질문-slug>.md`만 쓴다(같은 파일을 둘이 쓰지 않는다).
- 사실 확인: `fact-checker`가 장부의 값·단위·출처·날짜를 원문과 대조.
- 에셋: 필요마다 `asset-scout` 에이전트를 병렬로. 각자 `assets.json`에 자기 후보만 추가한다.
- 장 제작: 장마다 `slide-builder` 에이전트. 각자 `slides/<slug>.md`와 `web/slides/<slug>.html`만 쓴다. 공용 파일(theme.css, viz 템플릿, derived.js)이 필요하면 직접 고치지 말고 요청으로 돌려준다 → 오케스트레이터가 고친다.
- 3D 장(도식 장면·에셋 소개): `/kpu-ppt scene` — 장마다 `scene-builder`, 실물 모델 조사·제작은 `model-builder`. 3D 빌드는 몇 초라 장 수만큼 병렬로 띄워도 된다(캡처 검수가 무거우니 4개까지). 판단·절차는 `references/3d.md`.
- 평가: `reviewer`는 새 맥락에서 brief의 채점 기준으로만 점수를 매긴다. 만든 이유를 알려 주지 않는다.

## 어디서나 지키는 규칙
- 숫자를 지어내지 않는다. 모든 숫자는 `data-num="<evidence id>"` 또는 `web/data/derived.js`의 파생값. 화면 HTML에 숫자를 직접 쓰면 `deck lint`가 경고한다.
- 한 장 = 한 주장 = 그림 하나. 글만 있는 장을 만들지 않는다.
- 시간은 `slides/<slug>.md`의 `time`을 더한 값이 정본. 발표 시간표를 따로 손으로 맞추지 않는다.
- 장 번호를 화면·노트에 쓰지 않는다(장을 옮기면 어긋난다). 참조는 slug로.
- 하지 않은 일을 한 것처럼 쓰지 않는다: "검증 전", "가정", "모의", "추정"을 붙인다.
- 웹 조사 도구는 세션에 있는 것을 쓴다(WebSearch·WebFetch, 브라우저 도구가 있으면 그것도). 사용자 전역 규칙이 특정 브라우저를 지정하면 그것을 따른다.
