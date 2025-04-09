import React from 'react'
import styled from '@emotion/styled'

const ChatHistory = ({ history, onViewChange, onSelectImage }) => {
  const handleBack = () => {
    onViewChange('chat')
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>← 돌아가기</BackButton>
        <Title>대화 기록</Title>
      </Header>
      <HistoryList>
        {history.map((message) => (
          <HistoryItem key={message.id}>
            {message.type === 'image' ? (
              <ImageContainer onClick={() => onSelectImage(message.id)}>
                <img src={message.content} alt="Chat history" />
                <ImageTime>{new Date(message.timestamp).toLocaleString()}</ImageTime>
              </ImageContainer>
            ) : (
              <MessageContainer>
                <MessageContent>{message.content}</MessageContent>
                <MessageTime>{new Date(message.timestamp).toLocaleString()}</MessageTime>
              </MessageContainer>
            )}
          </HistoryItem>
        ))}
      </HistoryList>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
`

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 1rem;

  &:hover {
    color: #333;
  }
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
`

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`

const HistoryItem = styled.div`
  margin-bottom: 1rem;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const ImageContainer = styled.div`
  position: relative;
  cursor: pointer;
  
  img {
    width: 100%;
    height: auto;
    display: block;
  }

  &:hover {
    opacity: 0.9;
  }
`

const ImageTime = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
`

const MessageContainer = styled.div`
  padding: 1rem;
`

const MessageContent = styled.div`
  color: #333;
  margin-bottom: 0.5rem;
`

const MessageTime = styled.div`
  color: #999;
  font-size: 0.8rem;
`

export default ChatHistory 