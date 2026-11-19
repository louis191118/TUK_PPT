# 에셋 조사·선택

숫자만 근거가 아니다. 사진, 지도 데이터, 도식, 실물 화면, 글꼴, 참고 덱도 **조사해서 후보를 모으고, 프로젝트에 맞는 것을 골라야** 한다. 에셋은 근거와 같은 원칙을 따른다: 출처와 라이선스가 장부에 없으면 화면에 들어가지 않는다.

## 원칙: 고품질 오픈소스를 먼저, 최대한 (사용자 2026-11-18)
> "에셋은 highquality 오픈소스 최대한 활용하게 가이드 수정하자"

화면에 보이는 모든 시각 요소(사진·3D 모델·소품·질감·환경광·아이콘·글꼴·지도 데이터)는 **이 순서로** 정한다. 앞 단계에서 기준을 넘는 후보가 있으면 뒤로 가지 않는다.

1. **고품질 오픈 라이선스 에셋을 그대로**(CC0·퍼블릭 도메인 → CC BY → OFL·MIT·Apache 같은 허용 라이선스). 아래 출처표의 "먼저 볼 곳"을 최소 3곳 뒤진다.
2. **오픈 에셋을 다듬어서**: 축척 맞추기, 재질을 덱 톤으로 다시 입히기, 노드 나누기, 자르기·저채도. 형상이 맞으면 다듬기가 새로 만들기보다 낫다.
3. **직접 만들기는 마지막**: 2까지 기준을 넘는 후보가 없을 때만. 장부에 `searched`(뒤진 출처·검색어·떨어진 이유)를 남기고, 화면 credit에 "어림 형상"을 밝힌다. 속이 빈 실물 모델의 내부 부품처럼 공개 자료가 원래 없는 것이 대표 경우다.

- 도식 장면의 **소품**(차·사람·나무·건물·가구)도 같다. 상자·원통을 이어 붙이기 전에 CC0 소품 묶음(Kenney·Quaternius·Poly Pizza CC0)에서 찾는다. 도식 톤은 재질을 덱 색 토큰으로 다시 입혀 맞춘다.
- **고품질 기준**(하나라도 못 넘으면 후보에서 뺀다): 1920×1080에서 쓰는 크기의 2배 해상도 · 3D는 실루엣과 대표 디테일이 실물과 맞고 PBR 재질(또는 다시 입히기 쉬운 깔끔한 재질 구분) · 깨진 면·워터마크·로고 박힌 텍스처 없음 · 작가·라이선스가 원본 페이지에서 확인됨. 같은 조건이면 평점·다운로드 수가 높은 것, 큐레이션된 것(Staff Picks, Featured)을 먼저 본다.
- 에셋 하나에 **후보 2~3개**를 같은 구도 미리보기로 나란히 보여 주고 사용자가 고른다(A1). "첫 검색 결과"나 "만들기 쉬운 것"으로 정하지 않는다.
- 내려받기 전 사용자 허락(파일 이름·출처·크기·라이선스)은 그대로다. 오픈소스라도 받기 전에 묻는다.

## 무엇을 찾나 (종류)와 먼저 볼 곳
| kind | 예 | 먼저 볼 곳 (고품질 오픈 라이선스) |
|---|---|---|
| `photo` | 현장·사람·사물 사진 | Wikimedia Commons(Featured/Quality images), 공공 기관 보도자료·공공누리 제1유형, NASA·ESA 이미지(PD/CC BY), Unsplash·Pexels(자체 라이선스 확인), 직접 촬영 |
| `map-data` | 행정구역 경계, 노선, 지점 좌표, 건물 | 국가·지자체 공공데이터 포털, Natural Earth(PD), OpenStreetMap(ODbL, 표기 필수), Overture Maps(CDLA/ODbL, 건물·도로) |
| `diagram` | 기관이 공개한 구조도·공정도 | 원 문서(그대로 쓰지 말고 우리 템플릿으로 다시 그리는 근거로) |
| `screenshot` | 우리 앱·사이트·제품 화면 | 직접 캡처(`deck.mjs capture`나 기기 캡처). 다른 서비스 화면은 쓰지 않는다 |
| `font` | 주제 분위기에 맞는 글꼴 | SIL OFL 글꼴만(Pretendard, Noto, Google Fonts의 OFL 글꼴). 파일을 `web/vendor/fonts/`에 |
| `icon` | 줄 아이콘·기호 | Lucide(ISC), Tabler Icons(MIT), Phosphor(MIT), Material Symbols(Apache 2.0). SVG를 그대로 넣고 색은 토큰으로 |
| `texture` · `hdri` | 3D 재질 질감, 환경광 | Poly Haven(CC0), ambientCG(CC0). 실물 장면 환경광은 `studioEnv` 대신 Poly Haven 스튜디오 HDRI도 후보 |
| `model3d` | 실물 3D 모델(제품·차량·기기 외형) | Sketchfab(Downloadable, CC0·CC BY만, Staff Picks 먼저), Smithsonian Open Access(CC0 스캔), NASA 3D, Poly Haven 모델(CC0). 고르는 법·다듬기는 `references/3d-asset-research.md` |
| `prop3d` | 도식 장면 소품(차·사람·나무·건물·가구) | Kenney(CC0), Quaternius(CC0), Poly Pizza(CC0·CC BY 표시된 것), Poly Haven 모델(CC0) |
| `reference` | 같은 주제를 잘 시각화한 사례, 우수 발표 | 링크와 배울 점만 기록. 복제하지 않는다 |
| `dataset` | 그림의 원자료(CSV 등) | 공식 통계 원표. 값은 근거 장부(evidence)로 옮긴다 |

## 고르는 기준 (후보마다 1~5점, `fit`에 적는다)
1. **설명 목적에 맞나**: 그 장의 헤드라인을 보여 주는가, 장식인가. 장식이면 뺀다.
2. **사실인가**: 연출·합성·AI 생성이 아닌 실제 장면·데이터인가(실제가 아니면 "도식", "예시"로 표시).
3. **디자인 체계와 맞나**: 흰 바탕·강조색 하나와 어울리나. 색이 강한 사진은 흑백·저채도로 쓸 수 있나.
4. **라이선스가 분명한가**: 상업·변형 허용 여부, 표기 문구.
5. **해상도**: 1920×1080 화면에서 쓰는 크기의 2배 이상.

## 라이선스 규칙
- 쓸 수 있는 것: CC0·퍼블릭 도메인, CC BY(표기), 공공누리 제1유형(출처 표시), SIL OFL·MIT·ISC·Apache 2.0(글꼴·아이콘, 라이선스 파일 동봉), 사진 사이트의 자체 라이선스(조건 확인), 우리가 만든 것.
- CC BY-SA·ODbL은 쓸 수 있지만 같은 조건 공유 의무가 있다 — 다듬은 파일을 따로 배포할 때 그 라이선스를 따른다고 장부 `edits`에 적는다.
- 덱은 웹으로 배포되므로 에셋 파일이 그대로 공개된다. "재배포 금지"·"에셋 자체 판매 금지" 조건이 붙은 무료 라이선스(BlenderKit Royalty Free, 일부 스톡·마켓 무료 에셋)는 원문에 웹 배포 허용이 명시되지 않으면 쓰지 않는다.
- 3D 모델: CC BY-NC(상업 발표), CC BY-ND(다듬기가 늘 필요해 불가), 게임에서 뜯어낸 모델, 재배포 금지 CAD(GrabCAD 등은 참고만)는 쓰지 않는다.
- 피할 것: 라이선스 불명, CC BY-ND(변형 금지인데 자르기·흑백 처리가 필요하면), 다른 서비스의 로고·화면, 검색 결과 썸네일, 스톡 워터마크.
- 다운로드 전에 라이선스와 원본 주소를 먼저 장부에 적는다. 표기 문구(`credit`)는 그 장 하단에 자동으로 붙는다.

## 장부: deck/assets.json
```json
{
  "items": [
    {
      "id": "photo-commute",
      "kind": "photo",
      "status": "candidate",
      "file": "web/assets/photo-commute.jpg",
      "source": { "url": "원본 페이지", "author": "작가·기관", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/" },
      "credit": "사진 작가명 · CC BY 4.0",
      "fits": ["problem"],
      "why": "통학 차량 정체 — 1장 '매일 고르는 길' 장면",
      "fit": { "purpose": 4, "real": 5, "design": 3, "license": 5, "resolution": 4 },
      "edits": "흑백, 16:9 자르기"
    }
  ]
}
```
- 직접 만든 에셋은 `"source": { "author": "자체 제작", "license": "자체 제작" }`에 더해 `"searched"`를 꼭 적는다: `[{ "where": "Sketchfab", "query": "sedan CC0", "why": "축척 오차 8% · 텍스처에 로고" }, …]` (최소 3곳). `searched`가 없는 자체 제작 에셋은 오케스트레이터가 조사 단계로 되돌린다.
- `status`: `candidate`(후보) → `chosen`(사용자가 고름) / `rejected`. 화면에는 `chosen`만.
- 후보 파일은 `web/assets/_candidates/`, 고른 파일은 `web/assets/`.
- 화면에서 쓸 때: `<img src="assets/photo-commute.jpg" data-asset="photo-commute">` 또는 `screen` 템플릿의 `"asset": "id"`.
- `deck.mjs assets`가 후보를 한 페이지(`web/assets/_candidates/index.html`)로 모아 준다. 사용자는 `deck.mjs serve`로 열어 보고 고른다.

## 절차 (/kpu-ppt assets)
1. outline의 장마다 "그림만으로 부족한 것"을 적는다. 대부분의 장은 템플릿 그림으로 충분하다. 사진은 문제 제기·사례·실물 장 정도에만. 3D 장은 장면에 들어갈 소품·모델·질감·환경광까지 필요로 적는다.
2. 필요마다 `asset-scout` 에이전트가 위 "원칙" 순서로 고품질 오픈 에셋 후보 2~3개를 찾아 장부에 `candidate`로 적고 파일을 `_candidates/`에 받는다(3D 파일은 허락 뒤).
3. 참고 사례(`reference`)는 주제당 3~5개: 같은 데이터를 잘 보여 준 시각화, 같은 청중 앞의 우수 발표. 배울 점 한 줄씩.
4. `deck.mjs assets`로 후보 페이지를 만들고 질문 A1~A3을 묻는다(보여 주고 묻기).
5. 고른 것은 `chosen`, 파일을 `web/assets/`로 옮기고 `edits`대로 처리, `decisions.md`에 기록.
