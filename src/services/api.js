import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://3.35.24.104:3000/api';

export const sendMessage = async (message, imageData = null) => {
  // 파라미터 검증
  if (!message || typeof message !== 'string') {
    throw new Error('유효한 메시지가 필요합니다.');
  }

  try {
    const response = await axios.post(`${API_URL}/chat`, {
      message,
      image: imageData
    });
    return response.data;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    throw error;
  }
};

export const rateMessage = async (messageId, rating) => {
  // 파라미터 검증
  if (!messageId) {
    throw new Error('메시지 ID가 필요합니다.');
  }
  
  if (rating === undefined || rating === null || isNaN(parseInt(rating)) || rating < 0 || rating > 5) {
    throw new Error('유효한 별점(0-5)이 필요합니다.');
  }

  const participantId = localStorage.getItem('participantId');
  if (!participantId) {
    throw new Error('참여자 ID가 없습니다.');
  }

  try {
    const response = await axios.post(`${API_URL}/rate-message`, {
      messageId,
      rating: parseInt(rating),
      participantId
    });
    return response.data;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    throw error;
  }
};

export const getHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/history`);
    return response.data;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    throw error;
  }
}; 