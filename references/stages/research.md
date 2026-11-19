# 단계 `research` — 조사 — 하위 질문마다 researcher 에이전트를 병렬로 띄워 근거 장부(evidence/)를 만들고 사실 확인까지

부르는 법: `/kpu-ppt research` [추가로 조사할 질문 (선택)]

`references/method.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

추가 요청: (스킬 인자에서 단계 이름 뒤에 온 말)

1. `deck/brief.md`, `deck/research/plan.md`를 읽는다. 질문 은행 R1~R3 중 답이 없는 것을 묻는다(R3: 조사 계획을 보여 주고 빼거나 더할 것).
2. 하위 질문마다 `researcher` 에이전트를 **한 메시지에서 병렬로** 띄운다. 각 프롬프트에: 질문, slug, brief 경로, 쓸 파일 두 개(`deck/evidence/<slug>.json`, `deck/research/<slug>.md`), brief의 정본 자료 경로.
3. 다 돌아오면 `deck.mjs lint`로 장부 형식을 확인하고, 비어 있는 질문은 다시 조사할지 판단한다.
4. `fact-checker` 에이전트로 장부를 대조한다. "고침 필요"는 근거 원문을 다시 확인해 직접 고친다.
5. `deck/research/summary.md`를 쓴다: 이야기의 뼈대가 될 발견 5~8개(각각 근거 id), **그림이 될 근거 묶음**(비교·추세·구성 등 유형 표시), 못 찾아서 주장할 수 없는 것.
6. `deck.mjs stage outline`. 사용자에게 summary 요점을 보여 주고 다음은 `/kpu-ppt outline`이라고 알린다.
