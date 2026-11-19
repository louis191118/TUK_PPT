# 단계 `check` — 검수 — 모든 장·모든 단계를 1920×1080으로 캡처하고 글자 크기·넘침·콘솔 오류·그림 없는 장·시간·출처를 검사한다

부르는 법: `/kpu-ppt check`

CLI는 `node "$KIT/scripts/deck.mjs"`.

1. `deck.mjs assemble` → `deck.mjs lint`.
2. `deck.mjs capture --steps` (Chrome이 없으면 설치 경로를 사용자에게 묻는다). 결과는 `deck/reviews/<날짜>/`와 `report.md`.
3. `report.md`의 오류(SMALL, OVERFLOW, ERROR, NO-VIZ, RAW-NUMBER)를 고치고 다시 찍는다. 오류 0이 될 때까지.
4. 캡처를 직접 열어 장마다 본다: 헤드라인이 그림으로 3초 안에 읽히나, 강조가 하나인가, 지난 단계가 흐리게 남나. `--size 1440x810`으로 한 번 더 찍어 작은 화면도 본다.
5. `fact-checker`로 대본·화면 숫자를 장부와 대조한다.
6. 결과 요약을 사용자에게 보여 주고 `deck.mjs stage review`.
