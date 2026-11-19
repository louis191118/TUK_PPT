# deck/ 파일 형식

```
deck/
├─ STATE.md            지금 단계·다음 할 일 (세션 시작 때 자동으로 읽힘)
├─ brief.md            주제·청중·시간·채점 기준·정본·사용자 결정 값
├─ decisions.md        사용자 결정 원문 기록 (날짜 [단계] "말 그대로" → 반영)
├─ deck.json           제목·언어·테마·시간 제한·장 순서 (기계가 읽는 정본)
├─ outline.md          장별 설명 목적 표 (사람이 읽는 정본)
├─ research/           plan.md(하위 질문) + 질문별 조사 노트
├─ evidence/           질문별 근거 장부 *.json (`_`로 시작하면 무시)
├─ assets.json         에셋 장부 (사진·지도 데이터·화면·글꼴·참고 사례, references/assets.md)
├─ slides/             장별 기획 <slug>.md
├─ web/                덱 코드 (deck.mjs assemble이 index.html을 만든다)
│  ├─ slides/<slug>.html   장 하나 = <section> 조각
│  ├─ data/derived.js      파생값 계산 (근거 id로만)
│  ├─ css/theme.css        테마 토큰 (디자인 단계 산출물)
│  ├─ assets/3d/           3D 에셋(GLB·대체 PNG·장면 JSON) — 장면 스크립트(deck.mjs build3d)가 만든다
│  ├─ js/custom/           장마다 직접 설계한 그림 모듈 (3D 장면 포함)
│  └─ js/                  런타임 (손대지 않는다)
├─ tools/3d/      3D 에셋 스크립트 (deck.mjs build3d로 실행, 같은 명령 = 같은 에셋)
└─ reviews/<날짜>/     캡처·report.md·evaluation.md
```

## deck.json
```json
{
  "title": "발표 제목",
  "lang": "ko",
  "theme": "minimal",
  "timeLimitSec": 600,
  "timeTargetSec": 558,
  "slides": ["problem", "definition", "how", "ending"]
}
```
`slides` 순서가 장 순서다. 장 번호는 여기서 자동으로 매긴다.

## evidence/<질문-slug>.json
```json
{
  "question": "수송 부문은 국내 온실가스의 몇 %인가",
  "items": [
    {
      "id": "transport-share",
      "claim": "수송 부문 배출은 국내 총배출의 13.8%",
      "value": 13.8, "unit": "%", "decimals": 1,
      "source": {
        "publisher": "기관명", "title": "문서명", "url": "https://...",
        "date": "2025 잠정", "accessed": "2026-11-16",
        "quote": "원문에서 이 값이 나온 짧은 구절"
      },
      "confidence": "official",
      "note": "범위·정의·주의점"
    }
  ]
}
```
- `id`는 전 장부에서 유일, 영문 소문자·숫자·`-`.
- 숫자가 아닌 사실은 `value` 없이 `text`를 둔다.
- `confidence`: `official`(공식 통계·법령) · `peer-reviewed` · `report`(기관·기업 보고서) · `news` · `estimate`(우리 계산·가정) · `example`(예시값, 실제 아님).
- `estimate`는 `note`에 산식과 가정을 쓴다. `example`은 화면 하단에 "예시 값"이 자동 표시된다.

## web/data/derived.js
근거에서 계산한 값. 화면에 쓰는 파생 숫자는 여기서만 만든다.
```js
export default (E) => ({
  'share-gap': { value: E['a'].value - E['b'].value, unit: '%p', decimals: 1, from: ['a', 'b'] },
});
```
`from`에 쓴 근거의 출처가 그 값을 쓴 장의 하단 출처 줄에 자동으로 붙는다.

## slides/<slug>.md
```markdown
---
slug: problem
purpose: 청중이 이 장 뒤에 알거나 믿어야 할 것 한 문장
question: 이 장이 답하는 청중의 물음
evidence: [transport-share, road-share]
type: 비교 (보여야 할 관계)
form: 1km = 한 칸, 두 경로를 칸 수로 (직접 설계한 그림을 한 줄로)
headline: 수송 배출의 대부분은 도로
time: 45
steps: 2
owner:
---

## 화면
그림 하나와 라벨. 무엇을 녹색(강조)으로 하나.

## 단계
1. 비교 대상 막대
2. 우리 값 강조 + 주석

## 대본
하십시오체, 한 문장 30자 안팎. [→]는 다음 키.

## 예상 질문
- Q … → A … (숫자는 근거 id와 함께)
```
`deck.mjs assemble`이 `## 대본`과 `## 예상 질문`을 발표자 노트로 옮긴다. 대본을 HTML에 따로 쓰지 않는다.
- `steps`는 3 이하. 발표자가 둘러보는 탐색 장(3D 에셋 소개)은 `explore: true`로 9 이하.

## web/slides/<slug>.html
```html
<section data-slug="problem">
  <h1 class="head">수송 배출의 대부분은 도로</h1>
  <figure class="viz body" data-viz="bars">
    <script type="application/json">
      { "items": [ { "label": "도로", "num": "road-share", "accent": true },
                   { "label": "항공", "num": "air-share" } ],
        "unit": "%", "steps": { "bars": 1, "accent": 2 } }
    </script>
  </figure>
  <p class="foot-l">모델 추정 · 가정 한 줄</p>
</section>
```
- 그림은 장마다 직접 설계해 `data-viz="custom" data-module="custom/<slug>.js"`로 붙이는 것이 기본(`references/viz.md`). 위 예처럼 참고 패턴 이름을 바로 써도 된다.
- 숫자는 `<span data-num="id"></span>`(형식은 근거의 unit·decimals) 또는 그림 코드의 `num(id)`.
- 단계 공개는 `class="s1"`~`"s3"`(그 단계부터 보임). 단계 수는 spec의 `steps`.
- 하단 출처·장 번호·발표자 노트는 assemble이 붙인다.
- 움직임이 긴 장(3D 경로 그리기·분해)은 `<section data-slug="…" data-wait="2600">` — 검수 캡처가 단계마다 그만큼 기다린다.

## STATE.md
```markdown
---
stage: outline
updated: 2026-11-17
---
## 지금
outline 초안 작성 중. O1 승인 대기.
## 다음
사용자 승인 → /kpu-ppt design
## 열린 문제
- 발표자 이름 미정
```
