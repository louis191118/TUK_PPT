# 참고 패턴 설정

`<figure class="viz body" data-viz="이름"><script type="application/json">{설정}</script></figure>`
공통: `steps`(부분 이름 → 처음 보이는 단계, 0 = 처음부터), 항목별 `"s": n`, `accent: true`, `note`(그림 아래 한 줄), `ref`(사실 문장의 근거 id → 하단 출처).
조금이라도 바꿔야 하면 `web/js/viz/templates.js`·`qual.js`의 해당 함수를 `web/js/custom/<slug>.js`로 복사해 고친다(런타임 파일은 `deck.mjs upgrade` 때 덮어써진다).

## 숫자 근거
| 패턴 | 설정 | steps 부분 |
|---|---|---|
| `bars` | `items:[{label, num, accent?, off?}]`, `unit`, `mean?: true\|"<id>"`, `meanLabel?`, `orient?: "v"\|"h"` | `bars`, `accent`, `mean`, `note` |
| `groups` | `groups:[{title, unit, items:[{label, num, accent?}]}]` | `g1`, `g2`, …, `note` |
| `line` | `series:[{label, accent?, points:[{x, num}]}]`, `unit`, `zero?` | `series1`, …, `accent`, `note` |
| `stack` | `rows:[{label, items:[{label, num, accent?}]}]`, `unit` | `rows`, `accent`, `note` |
| `tiles` | `num`(총량), `per`, `tileLabel`, `countLabel`, `cols?` | `tiles`, `total`, `note` |
| `equation` | `terms:[{word, num?, unit?, op?, accent?}]` | `numbers`, `result` |
| `scatter` | `points:[{label?, x, y, accent?}]`(x·y는 근거 id), `xLabel`, `yLabel` | `points`, `accent`, `note` |
| `hero` | `num`, `unit?`, `caption?`, `countUp?` | `num`, `caption` |

## 정성 근거
| 패턴 | 설정 | steps 부분 |
|---|---|---|
| `position` | `x:{low, high, label}`, `y:{low, high, label}`, `items:[{label, sub?, x:0~1, y:0~1, accent?}]` | `items`, `accent` |
| `contrast` | `a:{title}`, `b:{title}`, `rows:[{label, a, b, accent?}]` | `b` |
| `flow` | `steps:[{label, sub?, accent?}]` | `p1`, `p2`, … |
| `chain` | `nodes:[{label, sub?, accent?}]`, `via:[화살표 위 말]` | `p1`, `p2`, … |
| `cycle` | `center?`, `nodes:[{label, sub?, accent?}]` | `p1`, … |
| `tree` | `root:{label, sub?}`, `children:[{label, sub?, accent?, children:[{label}]}]` | `c1`, `c2`, … |
| `matrix` | `cols:[조건]`, `rows:[{label, cells:[true\|"part"\|false\|"글"], accent?}]`, `legend?` | `rows`, `accent` |
| `gaps` | `nowTitle`, `goalTitle`, `rows:[{label, now, goal, accent?}]` | `r1`, `r2`, … |
| `timeline` | `events:[{when, label, accent?}]` (when이 모두 숫자면 비례 배치) | `e1`, … |
| `filter` | `rules:[규칙]`(≤3, 단계 = 규칙), `items:[{label, out?: 규칙 번호, why?}]`, `result?` | 규칙 번호가 곧 단계 |
| `relations` | `cols`, `rows`, `nodes:[{id, label, sub?, col, row, accent?}]`, `links:[{from, to, label, accent?}]` | `nodes`, `accent`, `links` |
| `screen` | `asset`(고른 에셋 id), `w`, `h`(원본 px), `height`(표시 높이), `align?`, `mock?`, `callouts:[{x, y, label, sub?, side?, accent?}]` | `callouts` |
