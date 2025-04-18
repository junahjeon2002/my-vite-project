import React, { useState, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import { sendMessage } from '../services/api'
import { getSystemPrompt } from '../utils/experimentUtils'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const StarRating = ({ messageId, initialRating = 0, onRatingChange }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarClick = async (value) => {
    if (!messageId) {
      console.error('Cannot rate: No messageId available');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const participantId = localStorage.getItem('participantId');
      if (!participantId) {
        throw new Error('참여자 ID가 없습니다.');
      }

      console.log('별점 저장 시도:', { messageId, rating: value, participantId });

      const response = await fetch(`${API_BASE_URL}/api/rate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messageId,
          rating: value,
          participantId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '별점 저장에 실패했습니다');
      }

      console.log('별점 저장 성공:', data);
      setRating(value);
      if (onRatingChange) {
        onRatingChange(messageId, value);
      }
    } catch (error) {
      console.error('Rating error:', error);
      alert(error.message || '별점 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StarsContainer>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          filled={star <= (hover || rating)}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          disabled={isSubmitting}
        >
          ★
        </Star>
      ))}
    </StarsContainer>
  );
};

const ParticipantIdInput = ({ onIdSubmit }) => {
  const [id, setId] = useState('');
  const [experimentId, setExperimentId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim()) {
      setError('참여자 ID를 입력해주세요');
      return;
    }
    if (!experimentId.trim()) {
      setError('실험 ID를 입력해주세요');
      return;
    }
    if (parseInt(experimentId) < 1 || parseInt(experimentId) > 8) {
      setError('실험 ID는 1부터 8까지의 숫자만 입력 가능합니다');
      return;
    }
    localStorage.setItem('participantId', id);
    localStorage.setItem('experimentId', experimentId);
    onIdSubmit(id);
  };

  return (
    <ParticipantIdContainer>
      <ParticipantIdForm onSubmit={handleSubmit}>
        <h2>실험 정보 입력</h2>
        <InputGroup>
          <InputLabel>실험 참여자 ID</InputLabel>
          <ParticipantIdInputField
            type="number"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="참여자 ID를 입력하세요"
            required
            min="1"
            autoFocus
          />
        </InputGroup>
        <InputGroup>
          <InputLabel>실험 ID</InputLabel>
          <ParticipantIdInputField
            type="number"
            value={experimentId}
            onChange={(e) => setExperimentId(e.target.value)}
            placeholder="실험 ID를 입력하세요 (1~8)"
            required
            min="1"
            max="8"
          />
        </InputGroup>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ParticipantIdSubmitButton type="submit">시작하기</ParticipantIdSubmitButton>
      </ParticipantIdForm>
    </ParticipantIdContainer>
  );
};

const SystemPromptBar = styled.div`
  background: #666;
  color: white;
  padding: 16px 20px;
  font-size: 14px;
  text-align: center;
  width: 100%;
  white-space: pre-line;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ChatPanel = ({ isNonLLM = false, currentImageId: propCurrentImageId }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [showParticipantInput, setShowParticipantInput] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentImageId, setCurrentImageId] = useState(propCurrentImageId);
  const [systemPrompt, setSystemPrompt] = useState('');
  const textAreaRef = useRef(null);

  // propCurrentImageId가 변경될 때 currentImageId 상태 업데이트
  useEffect(() => {
    setCurrentImageId(propCurrentImageId);
  }, [propCurrentImageId]);

  const handleParticipantIdSubmit = (id) => {
    setParticipantId(id);
    setShowParticipantInput(false);
  };

  // 차트 변경 시 채팅 히스토리 초기화 및 새 히스토리 로드
  useEffect(() => {
    if (participantId && currentImageId) {
      loadChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [participantId, currentImageId]);

  const loadChatHistory = async () => {
    try {
      // 차트별 시스템 프롬프트 가져오기
      let newSystemPrompt = '이것은 튜토리얼입니다.';
      if (currentImageId && currentImageId !== 'tutorial') {
        newSystemPrompt = getSystemPrompt(currentImageId);
      }
      setSystemPrompt(newSystemPrompt);

      // 초기 시스템 메시지는 더 이상 채팅 히스토리에 포함되지 않음
      setChatHistory([]);

      const response = await fetch(`${API_BASE_URL}/api/history?participantId=${participantId}&chartId=${currentImageId || 'tutorial'}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("서버에서 JSON이 아닌 다른 형식의 데이터를 반환했습니다");
      }

      const data = await response.json();
      if (data.history && Array.isArray(data.history)) {
        const historyMessages = data.history.map(msg => {
          // 사용자 메시지와 AI 응답을 모두 포함
          const messages = [];
          
          // 사용자 메시지 추가
          messages.push({
            id: msg._id,
            type: 'user',
            content: msg.content,
            image: msg.image,
            timestamp: new Date(msg.timestamp),
            mongoId: msg._id,
            rating: msg.satisfaction || 0
          });

          // AI 응답이 있는 경우 추가
          if (msg.reply) {
            messages.push({
              id: `${msg._id}_ai`,
              type: 'ai',
              content: msg.reply,
              timestamp: new Date(msg.timestamp),
              mongoId: msg._id,
              rating: msg.satisfaction || 0
            });
          }

          return messages;
        }).flat(); // 배열을 평탄화하여 하나의 메시지 배열로 만듦
        
        // 타임스탬프 순으로 정렬
        const sortedMessages = historyMessages.sort((a, b) => a.timestamp - b.timestamp);
        setChatHistory(sortedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatHistory([]);
    }
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      if (e.key === 'Enter' && e.shiftKey) return;
    }

    if (!participantId) {
      alert('참여자 ID가 없습니다.');
      return;
    }
    if (!message.trim() && !previewImage) {
      alert('메시지를 입력하거나 이미지를 첨부해주세요.');
      return;
    }

    const newMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      image: previewImage,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, newMessage]);
    setMessage('');
    setPreviewImage(null);
    if (textAreaRef.current) textAreaRef.current.style.height = "40px";

    setIsLoading(true);
    try {
      // 메시지 저장 요청
      const payload = {
        chartId: currentImageId || 'tutorial',
        role: 'user',
        content: message.trim() || '[이미지만 입력됨]',
        image: previewImage || null,
        participantId: participantId
      };

      console.log('POST /api/messages payload:', payload);

      const saveResponse = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '메시지 저장에 실패했습니다');
      }

      // 기존 채팅 응답 요청
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          image: previewImage,
          participantId,
          experimentId: localStorage.getItem('experimentId'),
          chartId: currentImageId || 'tutorial'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI 응답을 받아오는데 실패했습니다');
      }

      const data = await response.json();
      const rawId = data.messageId;
      const mongoId = (rawId && typeof rawId === 'object' && rawId.$oid) ? rawId.$oid : rawId;

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.reply,
        timestamp: new Date(),
        mongoId: mongoId,
        rating: 0
      };

      setChatHistory(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'system',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextareaChange = (e) => {
    const target = e.target;
    target.style.height = "40px";
    const scrollHeight = target.scrollHeight;
    const lineHeight = 24;
    if (scrollHeight > 7 * lineHeight) {
      target.style.height = `${7 * lineHeight}px`;
      target.style.overflowY = "auto";
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = "hidden";
    }
    target.scrollTop = target.scrollHeight;
  };

  // 마지막 AI 메시지가 평가되었는지 확인하는 함수
  const isLastAIMessageRated = () => {
    const aiMessages = chatHistory.filter(msg => msg.type === 'ai');
    if (aiMessages.length === 0) return true;
    const lastAIMessage = aiMessages[aiMessages.length - 1];
    return lastAIMessage.rating > 0;
  };

  // TextArea의 disabled 상태를 결정하는 함수
  const isInputDisabled = () => {
    return isLoading || !isLastAIMessageRated() || isNonLLM;
  };

  // placeholder 텍스트를 결정하는 함수
  const getPlaceholderText = () => {
    if (isNonLLM) return "비LLM 조건입니다.";
    if (isInputDisabled() && !isLoading) return "이전 응답을 평가해 주세요...";
    return "메시지를 입력하세요...";
  };

  const handleImageClick = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      setPreviewImage(imageData);
    }
  };

  const handleDeleteImage = () => setPreviewImage(null);

  const handleRatingChange = (messageId, newRating) => {
    setChatHistory(prev => prev.map(msg => 
      msg.mongoId === messageId ? { ...msg, rating: newRating } : msg
    ));
  };

  if (showParticipantInput) {
    return <ParticipantIdInput onIdSubmit={handleParticipantIdSubmit} />;
  }

  return (
    <Container>
      <SystemPromptBar>{systemPrompt}</SystemPromptBar>
      <ChatContainer>
        <MessageWrapper>
          {chatHistory.map((msg) => {
            const isUser = msg.type === 'user';
            const isAI = msg.type === 'ai';
            const isSystem = msg.type === 'system';

            return (
              <MessageBase key={msg.id} isUser={isUser} type={msg.type}>
                <MessageContent isUser={isUser}>
                  {msg.image && (
                    <MessageImage 
                      src={msg.image} 
                      alt={isUser ? "User" : "AI"} 
                      isUser={isUser}
                      onClick={() => window.open(msg.image, '_blank')}
                    />
                  )}
                  {msg.content && (
                    <MessageWrapper>
                      <MessageBubble isUser={isUser} type={msg.type}>
                        {msg.content}
                      </MessageBubble>
                      {isAI && msg.mongoId && !isSystem && (
                        <StarRating 
                          messageId={msg.mongoId} 
                          initialRating={msg.rating || 0}
                          onRatingChange={handleRatingChange}
                        />
                      )}
                    </MessageWrapper>
                  )}
                </MessageContent>
              </MessageBase>
            );
          })}
          {isLoading && (
            <MessageBase isUser={false}>
              <MessageContent isUser={false}>
                <MessageBubble isUser={false}>응답을 생성하는 중...</MessageBubble>
              </MessageContent>
            </MessageBase>
          )}
        </MessageWrapper>
      </ChatContainer>

      <InputSection>
        <InputContainer>
          <AddButton onClick={handleImageClick} disabled={isInputDisabled()}>+</AddButton>
          <InputWrapper>
            {previewImage && (
              <PreviewContainer>
                <PreviewImage src={previewImage} alt="Preview" />
                <DeleteButton onClick={handleDeleteImage}>×</DeleteButton>
              </PreviewContainer>
            )}
            <TextArea
              ref={textAreaRef}
              value={message}
              onChange={(e) => {
                handleTextareaChange(e);
                setMessage(e.target.value);
              }}
              placeholder={getPlaceholderText()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isInputDisabled()}
            />
          </InputWrapper>
          <SendButton onClick={handleSubmit} disabled={isInputDisabled()}>전송</SendButton>
        </InputContainer>
      </InputSection>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #e5dbff;
  padding: 0;
`

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`

const MessageBase = styled.div`
  display: flex;
  justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  padding: ${props => props.type === 'system' ? '12px 0' : '8px 20px'};
  position: relative;
  width: 100%;
  box-sizing: border-box;
  &::before {
    content: '${props => props.type === 'system' ? '' : props.isUser ? 'User' : 'AI'}';
    font-size: 12px;
    color: #666;
    position: absolute;
    top: -4px;
    ${props => props.isUser ? 'right: 20px' : 'left: 20px'};
  }
`

const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 70%;
`

const MessageBubble = styled.div`
  background: ${props => props.type === 'system' ? 'transparent' : props.isUser ? '#7c3aed' : 'white'};
  color: ${props => props.type === 'system' ? '#666' : props.isUser ? 'white' : '#000'};
  padding: ${props => props.type === 'system' ? '0' : '12px 16px'};
  border-radius: ${props => props.type === 'system' ? '0' : '16px'};
  box-shadow: ${props => props.type === 'system' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.1)'};
  font-size: ${props => props.type === 'system' ? '13px' : '14px'};
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: ${props => props.type === 'system' ? 'center' : 'left'};
`

const MessageImage = styled.img`
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
  &:hover {
    transform: scale(1.02);
  }
`

const InputSection = styled.div`
  padding: 16px;
  background: white;
  border-top: 1px solid #DDD;
`

const InputContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
`

const TextArea = styled.textarea`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #DDD;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #000;
  height: 40px;
  max-height: 168px;
  resize: none;
  transition: all 100ms;
  line-height: 24px;
  &::placeholder {
    color: #666;
  }
  &:focus {
    outline: none;
    border-color: #4F46E5;
  }
`

const SendButton = styled.button`
  background: #4F46E5;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  color: white;
  font-size: 14px;
  height: 40px;
  opacity: ${props => props.disabled ? 0.5 : 1};
  &:hover:not(:disabled) {
    background: #4338CA;
  }
`

const AddButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #DDD;
  color: #666;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  font-weight: 300;
  opacity: ${props => props.disabled ? 0.5 : 1};
  &:hover:not(:disabled) {
    background: #e9ecef;
    color: #4F46E5;
    border-color: #4F46E5;
  }
  &:focus {
    outline: none;
    border-color: #4F46E5;
  }
`

const InputWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PreviewContainer = styled.div`
  position: relative;
  width: 200px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  margin-bottom: 8px;
`

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const DeleteButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`

const StarsContainer = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px 0;
  justify-content: flex-start;
  opacity: 0.7;
  transition: opacity 0.2s;
  margin: 4px 0 0 16px;
  &:hover {
    opacity: 1;
  }
`

const Star = styled.span`
  color: ${props => props.filled ? '#7c3aed' : '#d1d5db'};
  cursor: ${props => props.disabled ? 'wait' : 'pointer'};
  font-size: 20px;
  transition: all 0.2s;
  user-select: none;
  &:hover {
    transform: ${props => props.disabled ? 'none' : 'scale(1.2)'};
  }
`

const ParticipantIdContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #e5dbff;
  padding: 20px;
`;

const ParticipantIdForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0;
    color: #4F46E5;
    font-size: 20px;
    margin-bottom: 4px;
  }
`;

const ParticipantIdInputField = styled.input`
  width: 100%;
  padding: 0 20px;
  border: 1.5px solid #7c3aed;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  text-align: center;
  height: 48px;
  background: white;
  color: #000000;
  box-sizing: border-box;
  
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  &[type=number] {
    -moz-appearance: textfield;
  }
  
  &:focus {
    border-color: #4f46e5;
  }

  &::placeholder {
    color: #666;
    opacity: 0.8;
  }
`;

const ParticipantIdSubmitButton = styled.button`
  width: 100%;
  padding: 0 20px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  height: 48px;
  box-sizing: border-box;
  transition: background-color 0.2s;
  font-weight: 500;
  
  &:hover {
    background: #4f46e5;
  }
`;

const InputGroup = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InputLabel = styled.label`
  font-size: 13px;
  color: #4F46E5;
  font-weight: 500;
  margin-left: 4px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
`;

export default ChatPanel;