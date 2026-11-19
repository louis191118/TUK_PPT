# 단계 `review` — 독립 평가 — 새 맥락의 reviewer가 채점 기준으로 점수를 매기고, 사용자가 반영할 개선안을 고른다

부르는 법: `/kpu-ppt review`

CLI는 `node "$KIT/scripts/deck.mjs"`.

1. 최신 `deck/reviews/<날짜>/`에 모든 단계 캡처가 있는지 확인한다(없으면 `/kpu-ppt check`부터).
2. `reviewer` 에이전트를 띄운다. 프롬프트에는 **파일 경로만** 준다(brief, 캡처 폴더, slides/, deck.json). 만든 이유·고민은 주지 않는다.
3. `evaluation.md`를 읽고 개선안을 사용자에게 보여 준 뒤 **V1·V2**를 묻는다.
4. 반영하기로 한 것을 `decisions.md`에 원문과 함께 쌓고, outline·slides 기획부터 고친 뒤 `/kpu-ppt build <slug>`로 다시 만든다.
5. 남은 일(발표자 이름, 리허설, 실물 확인 등)을 `STATE.md`의 열린 문제로 옮긴다.
