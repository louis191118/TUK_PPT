// 파생값: 근거(E)에서 계산한 숫자. 화면에 쓰는 계산값은 여기서만 만든다.
export default (E) => ({
  'eq-kg': { value: E['km-b'].value * E['factor'].value, unit: 'kg', decimals: 2, from: ['km-b', 'factor'], note: '거리 × 1km당 계수' },
  'year-kg': { value: E['trips'].value * (E['car-a'].value - E['car-b'].value), unit: 'kg', decimals: 1, from: ['trips', 'car-a', 'car-b'], note: '편도 횟수 × 1회 차이' },
});
