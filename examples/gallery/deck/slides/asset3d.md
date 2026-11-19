---
slug: asset3d
purpose: 3D 에셋 소개 장(inspect3d)이 외관 → 투시 → 분해 → 부품 초점 → 조립으로 둘러보는 모습을 보인다
question: 이 물건 안에는 무엇이 어떻게 들어 있나
evidence: [pb-cells, pb-cell-mm]
type: 구조 (무엇으로 이뤄졌나)
form: 3D 분해 — 단계마다 한 부품 그룹에 초점, 카드 숫자는 근거 id
headline: 보조배터리 안을 열어 보면
time: 15
steps: 4
explore: true
owner:
---

## 화면
- 탐색 장(explore): 단계 0~4 = 외관 · 투시 · 분해 · 셀 · 조립. 드래그로 돌려 보고, 아래 단계 이름을 눌러 건너뛴다
- 에셋: `web/assets/3d/power-bank.glb`·`power-bank-poster.png` ← `scripts/3d/power-bank.mjs` (직접 만든 도식 조립품)

## 대본
보조배터리 하나를 열어 보겠습니다. [→] 케이스를 비추면 안이 보입니다. [→] 부품을 나누면 셀, 기판, 단자입니다. [→] 원통형 셀 6개가 들어 있습니다. [→] 다시 닫습니다.

## 예상 질문
- Q 실제 제품인가? → A 아닙니다. 셀 규격(18650)만 실제이고 나머지 치수는 예시인 도식 조립품입니다.
