import React, { useState, useEffect, useRef } from 'react'
import styled from '@emotion/styled'
import DrawingCanvas from './components/DrawingCanvas'
import ChatPanel from './components/ChatPanel'
import ChatHistory from './components/ChatHistory'

const App = () => {
  const [currentImageId, setCurrentImageId] = useState(null)
  const [currentImage, setCurrentImage] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [view, setView] = useState('chat') // 'chat' or 'history'
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showParticipantInput, setShowParticipantInput] = useState(true)
  const canvasRef = useRef(null)
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // 실험 조건 정의
  const experimentConditions = {
    "1": {
      useLLM: {
        2: true,  // 2번 이미지는 LLM 사용
        4: true,  // 4번 이미지는 LLM 사용
      }
      // 나머지 이미지는 기본적으로 LLM 미사용
    }
  };

  // 현재 이미지에서 LLM을 사용해야 하는지 확인하는 함수
  const shouldUseLLM = () => {
    const experimentId = localStorage.getItem('experimentId');
    // 첫 번째 이미지(튜토리얼)는 항상 LLM 사용
    if (currentImageIndex === 0) return true;
    
    // 실험 조건이 정의되지 않은 경우 기본값으로 LLM 사용
    if (!experimentId || !experimentConditions[experimentId]) return true;

    // 현재 이미지 번호에 대한 LLM 사용 여부 확인
    return experimentConditions[experimentId].useLLM?.[currentImageIndex + 1] ?? false;
  };

  // 대화 기록 저장 함수
  const saveChatHistory = async () => {
    try {
      console.log('대화 기록 저장 시도:', chatHistory);
      
      const response = await fetch(`${baseURL}/api/save-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatHistory }),
      });
      
      const result = await response.json();
      console.log('저장 결과:', result);
      
      if (!response.ok) {
        throw new Error('Failed to save chat history');
      }
      
      console.log('Chat history saved successfully');
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // 대화 기록 불러오기 함수
  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${baseURL}/history`);
      
      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }
      
      const data = await response.json();
      if (data.history && data.history.length > 0) {
        // 대화 내역을 시간순으로 정렬하여 설정
        const sortedHistory = data.history.map(msg => ({
          id: msg._id,  // MongoDB의 _id를 id로 사용
          type: msg.message ? 'user' : 'ai',  // message 필드가 있으면 user, 없으면 ai
          content: msg.message || msg.reply,  // user는 message, ai는 reply 필드 사용
          timestamp: new Date(msg.timestamp),
          mongoId: msg._id,
          rating: msg.satisfaction || 0,  // satisfaction 값을 rating으로 매핑
          image: msg.image  // 이미지 데이터 추가
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setChatHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendImage = (imageData) => {
    const newImageId = Date.now()
    const newMessage = {
      id: newImageId,
      type: 'image',
      content: imageData,
      timestamp: new Date()
    }
    setCurrentImageId(newImageId)
    setCurrentImage(imageData)
    setChatHistory(prev => [...prev, newMessage])
  }

  const handleSelectImage = (imageId) => {
    const image = chatHistory.find(msg => msg.id === imageId && msg.type === 'image')
    if (image) {
      setCurrentImageId(imageId)
      setCurrentImage(image.content)
      setView('chat')
    }
  }

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentImageIndex < 4) { // 5개 이미지 (0-4)
      setCurrentImageIndex(prev => prev + 1)
    }
  }

  const handleChatMessage = async (message) => {
    const newMessage = {
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    
    setChatHistory(prev => [...prev, newMessage])

    try {
      const response = await fetch(`${baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('AI 응답을 받아오는데 실패했습니다');
      }

      const data = await response.json();
      
      const aiResponse = {
        type: 'ai',
        content: data.reply,
        timestamp: new Date()
      }
      
      setChatHistory(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        type: 'system',
        content: '죄송합니다. 오류가 발생했습니다.',
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    }
  }

  const handleImageSend = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      
      // 시스템 메시지 (이미지와 텍스트)
      const systemMessage = {
        id: Date.now(),
        type: 'system',
        content: '지금부터 이 차트에 대해서 이야기를 시작할 것입니다.\n파이팅!',
        image: imageData,
        timestamp: new Date()
      };
      
      // AI 질문 메시지
      const aiQuestion = {
        id: Date.now() + 1,
        type: 'ai',
        content: '무엇을 도와드릴까요?',
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, systemMessage, aiQuestion]);
      // 대화 기록 저장
      saveChatHistory();
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 대화 기록 불러오기
    loadChatHistory();
  }, []);

  useEffect(() => {
    // 컴포넌트 마운트 시 localStorage에서 participantId 확인
    const savedParticipantId = localStorage.getItem('participantId');
    if (savedParticipantId) {
      setShowParticipantInput(false);
    }
  }, []);

  return (
    <Container>
      <Header>
        <NavButton onClick={handlePrevious} disabled={currentImageIndex === 0}>
          이전으로
        </NavButton>
        <NavButton onClick={handleNext} disabled={currentImageIndex === 4}>
          다음으로
        </NavButton>
      </Header>
      <ContentArea>
        <DrawingSection>
          <DrawingCanvas 
            currentImageIndex={currentImageIndex}
            ref={canvasRef}
          />
        </DrawingSection>
        <RightSection>
          <ChatSection>
            <ChatPanel
              currentImageId={currentImageIndex}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              onRequestImageSend={handleImageSend}
              isNonLLM={!shouldUseLLM()}
            />
          </ChatSection>
        </RightSection>
      </ContentArea>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
  padding: 1rem;
  gap: 0.5rem;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
  background: #666;
  border-radius: 8px;
  height: 40px;
`

const NavButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: ${props => props.disabled ? 0.5 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};

  &:hover:not(:disabled) {
    text-decoration: underline;
  }
`

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  gap: 1rem;
  min-height: calc(100vh - 80px);
  width: 100%;
`

const DrawingSection = styled.div`
  flex: 0.65;
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: auto;
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  padding: 1rem;

  /* 스크롤바 스타일링 */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`

const RightSection = styled.div`
  flex: 0.35;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  min-width: 320px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: hidden;
  background: #E9ECEF;
`

const ChatSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
`

const NonLLMSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const NonLLMMessage = styled.div`
  font-size: 20px;
  color: #666;
  font-weight: 500;
  text-align: center;
  padding: 20px;
`;

const ImagePreview = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`
export default App 

