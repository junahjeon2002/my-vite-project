import React, { useState } from 'react';
import styled from '@emotion/styled';

const ParticipantIdInput = ({ onIdSubmit }) => {
  const [participantId, setParticipantId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (participantId.trim()) {
      localStorage.setItem('participantId', participantId);
      onIdSubmit(participantId);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSubmit}>
        <Title>참가자 ID를 입력해주세요</Title>
        <Input
          type="text"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          placeholder="참가자 ID"
          required
        />
        <Button type="submit">시작하기</Button>
      </Form>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f8f9fa;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
  text-align: center;
`;

const Input = styled.input`
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
`;

export default ParticipantIdInput; 