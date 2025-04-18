import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

const blink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
`;

const Timer = ({ chartId }) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    // chartId가 변경될 때마다 타이머 리셋
    setTimeLeft(300);
    setIsTimeUp(false);
    setIsWarning(false);
  }, [chartId]);

  useEffect(() => {
    let timer;

    if (timeLeft <= 0) {
      setIsTimeUp(true);
      return;
    }

    // 1분(60초) 이하로 남았을 때 경고색상으로 변경
    if (timeLeft <= 60 && !isWarning) {
      setIsWarning(true);
    }

    timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [timeLeft, isWarning]);

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
        <TimeText 
          isTimeUp={false} 
          isWarning={isWarning} 
          isBlinking={timeLeft <= 60 && timeLeft > 55}
        >
          {formatTime(timeLeft)}
        </TimeText>
      )}
    </TimerContainer>
  );
};

const TimerContainer = styled.div`
  position: static;
  background: transparent;
  padding: 8px 16px;
  border-radius: 8px;
  z-index: 10;
`;

const TimeText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => {
    if (props.isTimeUp) return '#ef4444';
    if (props.isWarning) return '#ef4444';
    return 'white';
  }};
  transition: color 0.3s ease;
  ${props => props.isBlinking && css`
    animation: ${blink} 1s infinite;
    color: #ef4444;
  `}
`;

export default Timer;