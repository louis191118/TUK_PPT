# 참고 구현 — 숨길 덱 (2026-11, 실제 발표 코드)

ESG 강의 팀 과제 "숨길"(수원역 → 강남역 길찾기 탄소 비교 앱) 발표 덱에서 그대로 복사했다. 수치·지명은 그 발표의 것이므로 **읽고 배우는 용도**이고, 새 덱에서는 일반화된 런타임(`viz/stage3d.js`·`viz/inspect3d.js`)과 3D 빌드 예시(`../../scripts/3d/`)에서 출발한다. 사용자 결정 원문은 [../../references/3d-taste.md](../../references/3d-taste.md).

이 덱의 3D 에셋(지도 GLB·PNG, 해부 장 GLB)은 키트가 Blender를 쓰던 때 만들었다. 런타임 모듈은 에셋을 만든 도구와 상관없이 같은 GLB·JSON 계약을 읽는다. 지금 키트에서 같은 에셋을 만들 때는 `deck.mjs build3d`와 [../../references/3d-build.md](../../references/3d-build.md)를 따른다.

| 파일 | 무엇 | 볼 점 |
|---|---|---|
| `web/hero-map.js` + `hero-map.md` | 표지·01장·마무리 3D 도식 지도 (1,087줄) | 단계 모드 경로 그리기·카메라, 반복 모드 흐르는 색 띠, 칸 단위 파도, 작은 차, PNG 대체·anchors, 근거 비율 검사, 타원 가장자리 사라짐 |
| `web/ev-anatomy.js` | 숨김 장 전기차 해부 (687줄) | 스튜디오 환경맵, 투시 프레넬, 그룹 분해·초점·카드·리더선, 모듈 물결, 고전압 흐름 빛, 예열·적응 해상도, 성능 측정 기록. inspect3d.js의 원본 |
| `web/secret-ev.js` | 숨김 장 단축키 진입점 | e.code, 지연 import, 장 붙이기 |
| `web/demo.js` | 라이브 앱 iframe 시연 | 키 넘김, 포커스 되찾기, 백업 자동 전환, 앱 해시 따라 단계 표시 |
| `web/closing.js` | 마무리 여정 줄 + 오프라인 QR | QR 상자 맞춤 |
| `web/sources.js` | 출처 팝업 | 키 캡처, 쪽 넘김 |
| `web/annual.js` · `reward-basis.js` | "모양은 같고 모션만" 2D 애니메이션 | 쌓이는 순서 지연, 숫자를 칸과 같은 박자로 |

경로는 원래 덱 기준(`deck/web/assets/render/`)이라 그대로는 돌지 않는다.
