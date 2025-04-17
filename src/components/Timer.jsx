import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';

const Timer = ({ chartId }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    // chartId가 변경될 때마다 타이머 리셋
    setTimeLeft(300);
    setIsTimeUp(false);
  }, [chartId]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsTimeUp(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <TimerContainer>
      {isTimeUp ? (
        <TimeText isTimeUp={true}>시간 종료</TimeText>
      ) : (
        <TimeText>{formatTime(timeLeft)}</TimeText>
      )}
    </TimerContainer>
  );
};

const TimerContainer = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const TimeText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.isTimeUp ? '#ef4444' : '#4F46E5'};
`;

export default Timer; 