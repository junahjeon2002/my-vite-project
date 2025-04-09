import React, { useState, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import { sendMessage } from '../services/api'

// StarRating 컴포넌트 수정
const StarRating = ({ messageId, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async (value) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:3000/rate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, rating: value }),
      });

      if (!response.ok) {
        throw new Error('별점 저장에 실패했습니다');
      }

      setRating(value);
    } catch (error) {
      console.error('Error saving rating:', error);
      // 에러가 발생해도 UI는 업데이트
      setRating(value);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 컴포넌트가 마운트될 때 초기 별점 값 설정
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  return (
    <StarsContainer>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          filled={star <= (hover || rating)}
          onClick={() => handleRating(star)}
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

const ChatPanel = ({ currentImageId, chatHistory, setChatHistory, onRequestImageSend }) => {
  const [message, setMessage] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef(null)
  const textAreaRef = useRef(null)
  const [sessionId, setSessionId] = useState(Date.now().toString());

  // 채팅 기록 불러오기
  const loadChatHistory = async () => {
    try {
      const response = await fetch('http://localhost:3000/history');
      if (!response.ok) {
        throw new Error('채팅 기록을 불러오는데 실패했습니다');
      }
      const data = await response.json();
      if (data.history && data.history.length > 0) {
        const sortedHistory = data.history.map(msg => {
          // 시스템 메시지 처리
          if (msg.type === 'system') {
            return {
              id: msg._id,
              type: 'system',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              image: msg.image
            };
          }
          
          // 사용자와 AI 메시지 처리
          const isUserMessage = msg.message !== undefined;
          return {
            id: msg._id,
            type: isUserMessage ? 'user' : 'ai',
            content: isUserMessage ? msg.message : msg.reply,
            timestamp: new Date(msg.timestamp),
            mongoId: msg._id,
            rating: msg.satisfaction || 0,
            image: msg.image
          };
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        console.log('불러온 채팅 기록:', sortedHistory);
        setChatHistory(sortedHistory);
      }
    } catch (error) {
      console.error('채팅 기록 불러오기 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 채팅 기록 불러오기
  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

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

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      if (e.key === 'Enter' && e.shiftKey) {
        return;
      }
    }
    
    if (!message.trim() && !previewImage) return;

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
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "40px";
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          image: previewImage,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('AI 응답을 받아오는데 실패했습니다');
      }

      const data = await response.json();
      
      const aiMessage = {
        id: data.messageId,
        type: 'ai',
        content: data.reply,
        timestamp: new Date(),
        mongoId: data.messageId,
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

  const handleImageClick = () => {
    if (onRequestImageSend) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const imageData = canvas.toDataURL('image/png');
        setPreviewImage(imageData);
      }
    }
  };

  const handleDeleteImage = () => {
    setPreviewImage(null);
  };

  // 컴포넌트 마운트 시 세션 ID만 생성
  useEffect(() => {
    setSessionId(Date.now().toString());
  }, []);

  return (
    <Container>
      <ChatContainer ref={chatContainerRef}>
        <MessageWrapper>
          {chatHistory.map((msg, index) => {
            const isUser = msg.type === 'user';
            const isAI = msg.type === 'ai';
            
            if (msg.type === 'system') {
              return (
                <MessageBase key={msg.id} isUser={false}>
                  <MessageContent isUser={false}>
                    {msg.image && (
                      <MessageImage 
                        src={msg.image} 
                        alt="System" 
                        isUser={false}
                      />
                    )}
                    <MessageBubble isUser={false}>
                      {msg.content}
                    </MessageBubble>
                  </MessageContent>
                </MessageBase>
              );
            }

            return (
              <MessageBase key={msg.id} isUser={isUser}>
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
                      <MessageBubble isUser={isUser}>
                        {msg.content}
                      </MessageBubble>
                      {!isUser && <StarRating messageId={msg.mongoId || msg._id} initialRating={msg.rating} />}
                    </MessageWrapper>
                  )}
                </MessageContent>
              </MessageBase>
            );
          })}
          {isLoading && (
            <MessageBase isUser={false}>
              <MessageContent isUser={false}>
                <MessageBubble isUser={false}>
                  응답을 생성하는 중...
                </MessageBubble>
              </MessageContent>
            </MessageBase>
          )}
        </MessageWrapper>
      </ChatContainer>
      
      <InputSection>
        <InputContainer>
          <AddButton onClick={handleImageClick}>
            +
          </AddButton>
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
              placeholder="메시지를 입력하세요..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
          </InputWrapper>
          <SendButton onClick={handleSubmit} disabled={isLoading}>
            전송
          </SendButton>
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
  gap: 8px;
  width: 100%;
`

const MessageBase = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  max-width: 100%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  padding: 24px 40px 0 40px;  // 좌우 여백을 40px로 설정

  &::before {
    content: '${props => props.isUser ? 'User' : 'AI'}';
    font-size: 12px;
    color: #666;
    position: absolute;
    top: 4px;
    ${props => props.isUser ? 'right: 40px;' : 'left: 40px;'}  // 라벨도 여백에 맞춤
  }
`

const MessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: clamp(120px, 65%, 600px);
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`

const MessageBubble = styled.div`
  background: ${props => props.isUser ? '#7c3aed' : 'white'};
  color: ${props => props.isUser ? 'white' : '#000'};
  padding: 12px 16px;
  border-radius: ${props => props.isUser ? '16px 16px 0 16px' : '16px 16px 16px 0'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
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
  cursor: pointer;
  color: white;
  font-size: 14px;
  height: 40px;

  &:hover {
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  font-weight: 300;

  &:hover {
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
  margin-left: 12px;  // 별점 위치 조정

  &:hover {
    opacity: 1;
  }
`

const Star = styled.span`
  color: ${props => props.filled ? '#7c3aed' : '#d1d5db'};
  cursor: ${props => props.disabled ? 'wait' : 'pointer'};
  font-size: 16px;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    transform: ${props => props.disabled ? 'none' : 'scale(1.2)'};
  }
`

export default ChatPanel
