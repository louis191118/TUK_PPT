# KPU_PPT

주제만 설명하면 **조사하고, 근거를 장부로 모으고, 장마다 그림을 설계해** 발표용 HTML 덱(reveal.js)을 단계별로 만드는 Claude Code **스킬**입니다. 한 번에 만들지 않고, 단계마다 마크다운·JSON 파일을 남기고 사용자 승인을 받은 뒤 다음으로 넘어갑니다. 그래서 새 세션이나 다른 에이전트가 이어받아도 같은 품질로 계속할 수 있습니다.

이 방식은 실제 강의 팀 과제 발표 덱을 여러 차례 고쳐 가며 만든 과정에서 나왔습니다. 그때 사용자가 중간에 끼어들어 방향을 바꾼 지점들("설명 목적을 장마다 판단해", "너무 미니멀해", "한계는 필요한 만큼만", "부록 없이")을 **단계별 질문**으로 바꿔 넣었습니다.

## 설치
스킬 폴더 이름은 `kpu-ppt`입니다(Claude Code 스킬 이름은 소문자·숫자·하이픈만 됩니다).
```bash
git clone https://github.com/louis191118/KPU_PPT.git ~/.claude/skills/kpu-ppt
```
한 프로젝트에서만 쓰려면 그 프로젝트의 `.claude/skills/kpu-ppt`에 받습니다.

필요한 것: Node 22 이상(의존성 없음), Chrome·Chromium·Edge 중 하나(검수 캡처와 3D 에셋 빌드에 씀, `CHROME_PATH`로 지정 가능). **Blender 등 3D 프로그램은 필요 없습니다.**

## 쓰는 법
발표할 프로젝트 폴더에서 Claude Code를 열고:
```
/kpu-ppt init 대학 ESG 강의 팀 과제, 10분, 길찾기 탄소 비교 앱 아이디어
```
각 단계가 끝날 때 다음 단계를 안내합니다. 단계 이름 없이 `/kpu-ppt`만 부르면 지금 덱 상태를 보고 이어서 합니다.

| 단계 | 부르는 법 | 남는 것 |
|---|---|---|
| 시작 | `/kpu-ppt init` | `deck/brief.md` 청중·채점 기준·시간·정본 자료, `STATE.md` |
| 조사 | `/kpu-ppt research` | 하위 질문별 병렬 조사 → `evidence/*.json` 근거 장부(값·단위·출처·원문 구절) + 사실 확인 |
| 이야기 | `/kpu-ppt outline` | 장마다 설명 목적·청중의 질문·근거·보여야 할 관계·시간 → **승인** |
| 에셋 | `/kpu-ppt assets` | 사진·지도 데이터·실물 화면·글꼴·참고 사례 후보를 라이선스와 함께 모아 **보여 주고 고르게** |
| 디자인 | `/kpu-ppt design` | 대표 장 1장을 실제 근거로 만들어 **보여 주고 승인** |
| 제작 | `/kpu-ppt build` | 장마다 서브에이전트가 그림을 직접 설계(`custom/<slug>.js`), 캡처를 보고 스스로 고침 |
| 3D | `/kpu-ppt scene` | 3D가 설명을 돕는 장만: 도식 장면(스크립트로 굽기 → three.js 단계 애니메이션) 또는 에셋 소개(실물 모델 조사·다듬기·직접 만들기 → 분해·해부). 3D·대체 그림 두 캡처로 검수 |
| 검수 | `/kpu-ppt check` | 모든 장·모든 단계 1920×1080 캡처, 24px 미만·넘침·겹침·콘솔 오류·그림 없는 장·출처 없는 숫자 검사 |
| 평가 | `/kpu-ppt review` | 만든 과정을 모르는 평가자가 채점 기준으로 점수·개선안 → 반영할 것을 사용자가 고름 |
| 상태 | `/kpu-ppt status` | 단계·장별 완성도·시간 합계 |

CLI만 따로 쓸 수도 있습니다:
```bash
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs status      # 단계·장·시간
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs lint        # 정적 검사
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs serve       # 미리보기 (S 키: 발표자 노트)
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs capture --steps   # --no3d: 3D 장을 대체 그림으로
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs build3d route-city -- --short km-b --long km-a   # 3D 에셋 (몇 초)
node ~/.claude/skills/kpu-ppt/scripts/deck.mjs upgrade     # 스킬 갱신 뒤 덱 런타임 갱신
```

## 지키는 원칙
- **숫자를 지어내지 않는다.** 덱의 모든 숫자는 근거 장부 id(`data-num`, `num(id)`)로만 들어가고, 쓴 장 하단에 출처가 자동으로 붙습니다. 화면에 숫자를 직접 쓰면 lint가 경고합니다.
- **에셋도 근거처럼.** 라이선스·출처가 장부에 있고 사용자가 고른 에셋만 화면에 들어갑니다. 표기는 자동.
- **그림은 메뉴에서 고르지 않는다.** 장마다 "3초 안에 보여야 할 관계 하나"를 정하고 직접 설계합니다. 패턴 20종은 참고 예시입니다.
- **구조는 먼저 묻고, 취향은 보여 주고 묻는다.** 질문 은행: `references/interview.md`.
- 흰 바탕·글꼴 하나·강조색 하나, 상자 없는 미니멀 체계(`references/design.md`). 테마는 토큰 파일 하나로 바뀝니다.
- **3D는 설명할 때만.** 평면이면 놓치는 관계(어디서·어떤 경로로, 무엇으로 이뤄졌나)에만 씁니다. 근거 비율대로 그리고(장면 스크립트가 형상을 풀고 런타임이 다시 확인), 글자는 굽지 않고, 언제나 같은 카메라의 대체 그림이 있습니다.

## 3D 에셋은 어떻게 만드나
`deck.mjs build3d <장면.mjs>`가 헤드리스 Chrome을 띄워 three.js로 장면 스크립트를 돌립니다. 스크립트는 `scripts/3d/kit3d.js`의 도구로 형상을 만들고, 근거 비율에 맞게 경로를 풀고(이분법), 하늘빛·햇빛·그림자·접지 어둠을 정점 색에 구운 뒤 GLB·대체 PNG·카메라 JSON을 덱 폴더에 씁니다. 대체 PNG는 GLB와 같은 메시를 같은 카메라로 찍으므로 3D 화면과 똑같습니다. 갤러리 지도 장면은 2초, 조립품은 1초 걸립니다. 자세히: `references/3d-build.md`.

## 구조
```
SKILL.md            스킬 입구 (단계 고르기, 읽을 문서, 에이전트, CLI)
references/         method · interview · files · assets · viz · design · writing · 3d-*
  stages/           단계별 절차 10개
  agents/           서브에이전트 역할 지시문 7개 (researcher · fact-checker · asset-scout · slide-builder · scene-builder · model-builder · reviewer)
scripts/            deck.mjs (init·stage·status·assemble·lint·serve·capture·build3d·assets·upgrade) · lib/ · 3d/
template/           init이 복사하는 deck/ 뼈대와 런타임(web/, 3D: js/viz/stage3d.js·inspect3d.js, vendor/three)
themes/             테마 토큰
examples/gallery/   패턴 20종 + 직접 설계 1장 + 3D 도식 장면(scene3d) + 3D 에셋 소개(asset3d) 예시 덱 (예시 값, 실제 데이터 아님)
examples/sumgil/    실제 발표 "숨길"의 3D·인터랙션 런타임 코드
```
갤러리를 보려면: `cd examples/gallery/deck && node ../../../scripts/deck.mjs serve`

## 라이선스
MIT. 함께 들어 있는 것: reveal.js(MIT, `template/web/vendor/reveal/LICENSE`), Pretendard(SIL OFL 1.1, `template/web/vendor/fonts/pretendard/LICENSE`), three.js r170(MIT, `template/web/vendor/three/LICENSE`).
