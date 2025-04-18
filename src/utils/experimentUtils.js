// 실험 ID별 조건 배열 정의
const experimentConditions = {
  1: ['a1l', 'b4l', 'c3x', 'd2x'],
  2: ['b2l', 'a3l', 'd4x', 'c1x'],
  3: ['c4l', 'd1l', 'a2x', 'b3x'],
  4: ['d3l', 'c2l', 'b1x', 'a4x'],
  5: ['a1x', 'b4x', 'c3l', 'd2l'],
  6: ['b2x', 'a3x', 'd4l', 'c1l'],
  7: ['c4x', 'd1x', 'a2l', 'b3l'],
  8: ['d3x', 'c2x', 'b1l', 'a4l']

};

// 차트 유형별 시스템 프롬프트 정의
const systemPrompts = {
  a: '이 차트는 연도에 따른 각 국가별 총 생산량을 보여줍니다.',
  b: '이 차트는 시기에 따른 도시 A-E의 국정 지지율을 보여줍니다.\n2023년 6월-7월 사이에 사건 X가 발생하였습니다.',
  c: '이 차트는 일 평균 외부활동 시간과 \n가상의 전염병 X 발병률의 관계를 보여줍니다.',
  d: '이 차트는 가상의 해수면 상승에 따른 \n나라 X의 인프라 파괴 정도를 보여줍니다.'
};

/**
 * 실험 ID에 해당하는 조건 배열을 반환합니다.
 * @param {number} experimentId - 실험 ID (1~8)
 * @returns {string[]} 조건 배열
 */
export const getConditionsForExperiment = (experimentId) => {
  if (!experimentId || experimentId < 1 || experimentId > 8) {
    throw new Error('유효한 실험 ID(1~8)를 입력해주세요.');
  }
  return experimentConditions[experimentId];
};

/**
 * 조건에 해당하는 이미지 파일 경로를 반환합니다.
 * @param {string} condition - 조건 (예: 'a1l')
 * @returns {string} 이미지 파일 경로
 */
export const getImagePath = (condition) => {
  if (!condition || condition.length !== 3) {
    throw new Error('유효한 조건을 입력해주세요.');
  }
  const imageId = condition.substring(0, 2); // 'a1l' -> 'a1'
  return `/images/${imageId}.png`;
};

/**
 * 조건에 해당하는 시스템 프롬프트를 반환합니다.
 * @param {string} condition - 조건 (예: 'a1l')
 * @returns {string} 시스템 프롬프트
 */
export const getSystemPrompt = (condition) => {
  if (!condition || condition.length !== 3) {
    throw new Error('유효한 조건을 입력해주세요.');
  }
  const chartType = condition[0]; // 'a1l' -> 'a'
  return systemPrompts[chartType] || '이 차트에 대한 설명이 없습니다.';
};

/**
 * 조건이 비LLM 조건인지 여부를 반환합니다.
 * @param {string} condition - 조건 (예: 'a1l')
 * @returns {boolean} 비LLM 조건이면 true
 */
export const isNonLLM = (condition) => {
  if (!condition || condition.length !== 3) {
    throw new Error('유효한 조건을 입력해주세요.');
  }
  return condition[2] === 'x'; // 'a1l' -> false, 'a1x' -> true
};

/**
 * 현재 차트의 조건을 반환합니다.
 * @param {number} experimentId - 실험 ID
 * @param {number} currentIndex - 현재 차트 인덱스 (0~3)
 * @returns {string} 현재 차트의 조건
 */
export const getCurrentCondition = (experimentId, currentIndex) => {
  const conditions = getConditionsForExperiment(experimentId);
  return conditions[currentIndex];
}; 