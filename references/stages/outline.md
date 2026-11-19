# 단계 `outline` — 이야기 짜기 — 장마다 설명 목적·청중의 질문·근거·형태·시간을 정해 outline.md와 장 순서를 만들고 승인받는다

부르는 법: `/kpu-ppt outline`

`references/method.md`·`references/viz.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

1. `deck/brief.md`(특히 audience·rubric·time·disclosure), `deck/research/summary.md`를 읽는다.
2. 채점 기준(rubric)의 각 항목이 어느 장에서 다뤄지는지 먼저 정한다. 기준이 요구하는 것에 시간을 쓰고, 요구하지 않는 정밀도에는 쓰지 않는다.
3. 이야기 흐름을 한 줄로 쓴다(예: 문제 → 정의 → 작동 → 근거 → 효과 → 한계 → 요청). 장마다 앞 장과 잇는 말 한 줄.
4. `deck/outline.md`에 장 표를 쓴다: slug · 설명 목적 · 청중의 질문 · 근거 id · 보여야 할 관계 하나 → 그림 발상(한 줄, 템플릿 이름이 아니라 무엇을 무엇으로 보일지) · 에셋(템플릿 그림만으로 부족할 때만: 사진·지도 데이터·실물 화면) · 헤드라인 초안 · 시간(초) · rubric 항목. 근거 id가 없는 장은 만들지 않는다.
5. 시간 합이 `timeTargetSec`(제한의 93%) 안인지 확인한다. 넘으면 압축안을 같이 낸다.
6. `deck.mjs init`이 만든 `deck/deck.json`의 `slides`를 표 순서로 고친다.
7. 사용자에게 표를 보여 주고 질문 은행 **O1~O5**를 묻는다. O1(설명 목적 승인)이 가장 중요하다. 고칠 장을 지목받으면 고쳐서 다시 보여 준다.
8. 승인 원문을 `decisions.md`에 쌓고 `deck.mjs stage assets` (에셋이 필요한 장이 없고 참고 사례 조사도 건너뛰기로 했으면 `stage design`).
