import React from 'react'
import styled from '@emotion/styled'

const ToolBar = ({ 
  tool, 
  setTool, 
  colors, 
  selectedColor, 
  setSelectedColor,
  currentImageIndex,
  totalImages,
  onClearAll,
  onUndo
}) => {
  return (
    <ToolBarContainer>
      <ButtonGroup>
        <ToolButton 
          active={tool === 'pen'} 
          onClick={() => setTool('pen')}
        >
          펜
        </ToolButton>
        <ToolButton 
          active={tool === 'select'} 
          onClick={() => setTool('select')}
        >
          영역 선택
        </ToolButton>
        <ToolButton 
          onClick={onUndo}
        >
          한 단계 지우기
        </ToolButton>
        <ToolButton 
          onClick={onClearAll}
        >
          전체 지우기
        </ToolButton>
      </ButtonGroup>
      <ColorGroup>
        {colors.map(color => (
          <ColorButton
            key={color}
            color={color}
            active={selectedColor === color}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </ColorGroup>
    </ToolBarContainer>
  )
}

const ToolBarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 6px;
`

const ColorGroup = styled.div`
  display: flex;
  gap: 6px;
  margin-left: auto;
`

const ToolButton = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: ${props => props.active ? '#4f46e5' : '#f3f4f6'};
  color: ${props => props.active ? 'white' : '#1f2937'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#4338ca' : '#e5e7eb'};
  }
`

const ColorButton = styled.button`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.active ? '#4f46e5' : 'transparent'};
  border-radius: 50%;
  background: ${props => props.color};
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`

export default ToolBar 