// 파생값: 근거(E)에서 계산한 숫자. 화면에 쓰는 계산값은 여기서만 만든다.
// 형식: 'id': { value, unit, decimals, from: [근거 id...], note }
// from에 쓴 근거의 출처가 이 값을 쓴 장의 하단에 자동으로 붙는다.
export default (E) => ({
  // 'share-gap': { value: E['a-share'].value - E['b-share'].value, unit: '%p', decimals: 1, from: ['a-share', 'b-share'] },
});
