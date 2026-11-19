# 단계 `build` — 장 제작 — 장마다 slide-builder 에이전트로 기획·화면을 만들고 조립한다

부르는 법: `/kpu-ppt build` [slug ... (비우면 아직 없는 장 전부)]

`references/method.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

대상: (스킬 인자에서 단계 이름 뒤에 온 말)

1. `deck.mjs status`로 아직 없는 장을 확인한다(인자가 있으면 그 장만).
2. 형태에 3D가 적힌 장(도식 장면·에셋 소개)은 `/kpu-ppt scene` 절차(scene-builder·model-builder)로 따로 만든다. 나머지 장마다 `slide-builder` 에이전트를 **한 메시지에서 병렬로** 띄운다(동시에 4~6개까지). 프롬프트에: slug, outline의 그 장 줄, 승인 시안 slug, brief 경로.
3. 돌아온 요청(파생값 식, 템플릿 기능)은 오케스트레이터가 `web/data/derived.js`·런타임에 반영한다. 반영 뒤 그 장을 다시 확인한다.
4. `deck.mjs assemble` → `deck.mjs lint`. 오류는 고친다.
5. A/B 형태가 있는 장은 두 캡처를 보여 주고 **B1**을 묻는다. 고른 쪽만 남긴다.
6. 사용자에게 `deck.mjs serve` 주소를 주고 처음부터 넘겨 보게 한 뒤 **B2**를 묻는다.
7. `deck.mjs stage check`.
