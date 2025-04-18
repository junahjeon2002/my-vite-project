// 실험 ID별 조건 배열 정의
const experimentConditions = {
  1: ['a1l', 'b2x', 'c3l', 'd4x'],
  2: ['a1x', 'b2l', 'c3x', 'd4l'],
  3: ['a1l', 'b2l', 'c3x', 'd4x'],
  4: ['a1x', 'b2x', 'c3l', 'd4l'],
  5: ['a1l', 'c3x', 'b2l', 'd4x'],
  6: ['a1x', 'c3l', 'b2x', 'd4l'],
  7: ['a1l', 'd4x', 'b2l', 'c3x'],
  8: ['a1x', 'd4l', 'b2x', 'c3l']
};

// 차트 유형별 시스템 프롬프트 정의
const systemPrompts = {
  a: '이 차트는 시간에 따른 온도 변화를 보여줍니다.',
  b: '이 차트는 지역별 판매량 비교를 보여줍니다.',
  c: '이 차트는 제품별 고객 만족도 점수를 보여줍니다.',
  d: '이 차트는 월별 방문자 수 추이를 보여줍니다.'
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