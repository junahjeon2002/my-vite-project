import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://3.35.24.104:3001';

export const sendMessage = async (message, imageData = null) => {
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