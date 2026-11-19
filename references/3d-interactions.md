# 인터랙션 — 시연·QR·출처·숨김 장·모션

모두 숨길 덱에서 실제로 쓴 것이다. 코드는 [examples/sumgil/web/](../examples/sumgil/web/). custom 모듈로 붙이고, 장 안의 숨은 figure가 동작만 거는 방식(`<figure class="viz" data-viz="custom" data-module="custom/x.js" hidden>`)을 쓴다.

## 라이브 앱 시연 (demo.js)
실물 앱을 iframe으로 띄워 발표 중에 직접 조작한다.
- 장에 **들어올 때만** `src`를 넣고, 매번 주소에 시각을 붙여 시작 화면부터. 나가면 `about:blank`로 비운다(지도·재생 멈춤).
- 화면은 실제 폰 비율 그대로 CSS scale, 36px 둥근 모서리 + 1px `--c-hair` 선(베젤·그림자 없음). 숨길: 390×844 → 477×1032(화면 아래까지).
- 앱 안을 눌러도 장 넘김이 되게: 같은 출처면 앱 문서의 keydown을 잡아 PageDown·PageUp(클리커)·화살표를 덱으로 넘긴다. 검색칸에 글자를 치는 중에는 화살표를 앱에 두고 Esc로 덱에 돌아온다. 앱이 스스로 준 포커스는 발표자가 만지기 전이면 덱으로 되돌린다.
- **백업**: B 키 = 캡처 세 장(비교·선택·도착) 켜고 끄기. `failMs`(4초) 안에 앱이 안 뜨면 자동 전환. `?demo=backup`으로 검수.
- 앱 화면을 따라 왼쪽 단계 표시(지금 단계만 진하게): 앱 해시를 0.3초마다 읽음(pushState라 hashchange가 안 온다), 이 장에 있을 때만.

## QR (closing.js drawQR)
- 덱 안 라이브러리(`vendor/qr/qrcode.js`)로 **오프라인 생성**, 오류 정정 M, 여백 4모듈, 가운데 로고 없음, 패널 없음.
- 어두운 모듈이 정해진 상자(150px)에 딱 맞고 여백은 상자 밖 흰 바탕으로 나간다 → 정렬선이 QR 모듈 가장자리에 맞는다.
- 가로로 이어진 모듈은 한 사각형 path로(이음새 없음), `shape-rendering: crispEdges`.
- 주소 글자는 QR과 같은 값 한곳(`cfg.url`)에서. 리허설 때 교실 뒷줄 거리로 휴대폰 스캔.

## 출처 팝업 (sources.js)
마무리 장 서명(잎 표시·이름)을 누르면 상세 출처표가 뜬다(문서·쪽·표·원문 인용·주소·쓰인 장). 화면 하단 출처 줄로 부족한 질의응답용.
- 누르기·→·↓·스페이스·PageDown·Enter = 다음 쪽(마지막 쪽에서 닫기), ←·↑·PageUp = 앞 쪽, 그 밖(Esc) = 닫기.
- 열려 있는 동안 키를 캡처 단계에서 잡아(`addEventListener(…, true)` + `stopImmediatePropagation`) reveal 장 이동을 막는다. 다른 장으로 가면 닫는다.

## 숨김 장 (secret-ev.js)
본편 시간 밖의 깊은 내용(에셋 소개, 계산 상세)을 단축키로 연다.
- 단축키: Ctrl+Shift+숫자(Mac ⌃⇧숫자). 브라우저·OS 공식 단축키 목록에서 겹치지 않는지 확인했다(Chrome은 Ctrl+숫자·Ctrl+Shift+글자만, macOS Control-Shift 숫자 없음). Shift가 눌리면 `e.key`가 기호로 바뀌므로 **`e.code`**(Digit8)로 본다. reveal은 수정키 입력을 무시하므로 충돌 없다.
- 처음 누를 때만 무거운 모듈을 `import()`, 마지막 장 뒤에 `<section>`을 붙이고 `Reveal.sync()` → 그 장으로. 그 장에서 다시 누르면 앞 장으로. 한 번 붙은 장은 남는다(→로 다시 들어감).
- 단계 수는 `.fragment.step` 수로(`data-step` 동기화는 main.js).

## 전체화면 (main.js)
F 키(reveal 기본) + 오른쪽 위 버튼(마우스 움직일 때 2초 보임, 전체화면 중·캡처에는 안 보임). 거절은 경고로만(검수 오류 아님).

## "모양은 같고 모션만" (annual.js · reward-basis.js)
승인된 정지 화면을 바꾸지 않고 설명 순서만 움직임으로 보인다.
- 막대: 차례로 자람(`--i` 지연) → 기준 점선이 왼→오로 그어짐(stroke-dashoffset) → 비교 틈이 연하게 드러남 → 큰 숫자 세어 올라감(main.js `data-countup`, 1.2초 ease-out).
- 단위가 쌓이는 그림: 칸이 쌓이는 순서 그대로 톡톡(열 20 ms · 행 9 ms), 살짝 튀어 오름, 숫자는 생겨난 칸 수 × 단위값으로 같이 오름. 뒤로 가면 끝에서부터 접힌다.
- 0단계에 "하나"를 보여 주는 숨쉬기(칸 하나가 커졌다 작아짐)로 단위를 먼저 알린다.
- 장에 들어올 때마다(앞·뒤 어느 쪽이든) 지금 단계까지 다시 재생. `prefers-reduced-motion`이면 끝 상태.
