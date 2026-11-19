# 단계 `design` — 디자인 고정 — 대표 장 1장을 실제 근거로 만들어 보여 주고 테마·밀도를 승인받는다

부르는 법: `/kpu-ppt design`

`references/design.md`·`references/viz.md`·`references/writing.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

1. outline에서 그림이 가장 복잡한 장 하나를 고른다.
2. 그 장의 `slides/<slug>.md`와 `web/slides/<slug>.html`을 끝까지 만든다(slide-builder 절차를 직접 따른다).
3. 강조색 후보가 필요하면(주제 분위기) 2~3개를 `web/css/theme.css`의 `--c-accent`·`--c-accent-text`만 바꿔 각각 캡처한다. 밀도 질문(D2)용으로 같은 장을 밀도 두 단계로도 만든다(`<slug>`, `<slug>-dense`처럼 임시 slug, 승인 뒤 지운다).
4. `deck.mjs assemble` → `deck.mjs capture --only <slug>`로 캡처하고, 사용자가 볼 수 있게 `deck.mjs serve`의 주소와 캡처 경로를 준다.
5. 질문 은행 **D1~D4**를 묻는다. 반드시 화면을 보여 준 다음에 묻는다.
6. 승인되면 `decisions.md`에 "승인 시안: <slug>"와 사용자 말을 쌓고, 임시 slug를 지우고, `deck.mjs stage build`.
