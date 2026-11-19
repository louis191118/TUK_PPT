# 단계 `init` — 새 발표 덱 시작 — 주제·청중·시간·채점 기준을 묻고 deck/ 뼈대를 만든다

부르는 법: `/kpu-ppt init` [주제 한 줄 또는 정본 자료 경로]

`references/method.md`와 `references/interview.md`를 읽고 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`다.

사용자 입력: (스킬 인자에서 단계 이름 뒤에 온 말)

1. 이미 `deck/STATE.md`가 있으면 새로 만들지 말고 `deck.mjs status`를 보여 주고 이어서 할지 묻는다.
2. 입력과 대화에서 이미 알 수 있는 것(주제, 정본 자료 경로, 시간 등)을 먼저 정리한다. 정본 자료가 있으면 읽고 요약해 둔다.
3. 질문 은행의 **init 질문(I1~I8)** 중 아직 답이 없는 것만 `AskUserQuestion`으로 묻는다(한 번에 4개까지, 추천을 첫 선택지로). I2(채점 기준)는 원문을 붙여 달라고 한다.
4. `deck.mjs init deck --title "<제목>" --minutes <분>`으로 뼈대를 만든다.
5. `deck/brief.md`를 채운다(답은 말 그대로, 빈 칸은 기본값과 "기본값" 표시). 사용자 답 원문은 `deck/decisions.md`에 날짜·[init]과 함께 쌓는다.
6. 주제를 하위 질문 4~8개로 나눈 조사 계획 초안을 `deck/research/plan.md`에 쓴다(질문마다 slug, 왜 필요한지, 어떤 그림이 될 수 있는지).
7. `deck.mjs stage research`. 사용자에게 brief 요약 5줄과 조사 계획을 보여 주고, 다음은 `/kpu-ppt research`라고 알린다.
