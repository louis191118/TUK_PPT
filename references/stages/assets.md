# 단계 `assets` — 에셋 조사·선택 — 장마다 필요한 사진·지도 데이터·화면·글꼴·참고 사례 후보를 찾아 보여 주고 사용자가 고른다

부르는 법: `/kpu-ppt assets` [slug ... (비우면 outline에서 에셋이 필요한 장 전부)]

`references/method.md`와 `references/assets.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

대상: (스킬 인자에서 단계 이름 뒤에 온 말)

1. `deck/outline.md`의 "에셋" 칸과 장별 설명 목적을 읽고, 템플릿 그림만으로 부족한 필요를 목록으로 만든다(필요 id, 장, 종류, 무엇을 보여야 하나). 사진이 꼭 필요한 장만 고른다.
2. 참고 사례(`reference`) 조사도 하나의 필요로 넣는다: 같은 주제를 잘 시각화한 사례와 같은 청중 앞의 우수 발표 3~5개.
3. 모든 필요는 assets.md "원칙"대로 고품질 오픈소스 후보를 먼저 찾는다(직접 만들기는 3곳 이상 뒤져도 없을 때만). 실물 3D 모델이 필요한 장(에셋 소개)은 `references/3d-asset-research.md`를 따르고, 모델 후보는 `asset-scout`가 찾되 **내려받기 전에 사용자 허락**(파일 이름·출처·크기·라이선스)을 받는다. 다듬기·직접 만들기는 `/kpu-ppt scene`의 `model-builder`가 한다.
4. 필요마다 `asset-scout` 에이전트를 **한 메시지에서 병렬로** 띄운다.
5. `deck.mjs assets`로 후보 모음 페이지를 만들고, `deck.mjs serve` 주소(`/assets/_candidates/`)를 사용자에게 준다.
6. 질문 은행 **A1~A3**을 묻는다. 반드시 후보를 보여 준 다음에 묻는다.
7. 고른 것: 장부 `status`를 `chosen`으로, 파일을 `web/assets/`로 옮기고 `edits` 처리. 고르지 않은 후보는 `rejected`, `_candidates/` 파일은 지운다. 결정을 `decisions.md`에 쌓는다.
8. 참고 사례에서 배운 점이 디자인·형태 결정에 영향을 주면 `decisions.md`에 적고 `deck.mjs stage design`.
