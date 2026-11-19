# 단계 `scene` — 3D 장 — 장마다 3D가 설명을 돕는지 판단하고 도식 장면(build3d → three.js) 또는 에셋 소개(분해·해부)를 만들어 3D·대체 그림으로 검수한다

부르는 법: `/kpu-ppt scene` <slug ...> [에셋 소개면 물건 이름]

`references/3d.md`를 따른다. CLI는 `node "$KIT/scripts/deck.mjs"`.

대상: (스킬 인자에서 단계 이름 뒤에 온 말)

1. 대상 장의 outline 줄·설명 목적을 읽고, 장마다 형태를 정한다: 도식 장면(어디서·어떤 경로로·무대) / 에셋 소개(무엇으로 이뤄졌나) / 3D 아님. 애매하면 2D·3D 두 안을 만들어 보여 주고 **S1**을 묻는다.
2. 3D 에셋은 `deck.mjs build3d`(헤드리스 Chrome + three.js)로 만든다. 따로 설치할 것은 없다. Chrome이 없으면 검수 캡처와 같이 `CHROME_PATH`를 묻는다.
3. 에셋 소개 장이면 먼저 `model-builder` 에이전트를 띄운다. 모델 내려받기 전에 돌아오면 후보(파일 이름·출처·크기·라이선스)를 사용자에게 보여 주고 허락을 받은 뒤 이어서 맡긴다. 미리보기 렌더를 보여 주고 **A1**을 묻는다. 어디에 둘지 **S4**(숨김 장 / 탐색 장).
4. 장마다 `scene-builder` 에이전트를 띄운다(서로 다른 장은 한 메시지에서 병렬로, 4개까지 — 캡처 검수가 무겁다). 프롬프트에: slug, outline 줄, 형태, 승인 시안 slug, brief 경로, (에셋 소개면) model-builder가 남긴 GLB·그룹 설정 초안.
5. 돌아온 요청(런타임 기능, 공용 CSS 토큰)을 반영하고 그 장을 다시 확인한다.
6. `deck.mjs assemble` → `deck.mjs lint` → `deck.mjs capture --steps --only <slug>`와 `--no3d`. 두 캡처를 사용자에게 보여 주고, 실제 브라우저(`deck.mjs serve`)로 움직임을 본 뒤 **S2·S3**(반복/단계, 세기)를 묻는다. 답은 decisions.md에 말 그대로.
7. STATE.md "지금"에 3D 장 상태와 build3d 명령(그대로 다시 돌릴 수 있게)을 적는다.
