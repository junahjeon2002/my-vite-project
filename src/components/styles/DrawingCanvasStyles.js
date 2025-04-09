import styled from '@emotion/styled'

export const CanvasContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  padding-bottom: 0.5rem;
  gap: 0.25rem;
  background: white;
`

export const ColorButton = styled.button`
  width: 36px;
  height: 36px;
  border: 2px solid #e9ecef;
  border-radius: 50%;
  background: ${props => props.color};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    transform: scale(1.1);
    border-color: #4f46e5;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  &:hover::after {
    border-color: #4f46e5;
  }
`

export const ToolBarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`

export const Button = styled.button`
  padding: 10px 20px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: ${props => props.active ? '#4f46e5' : 'white'};
  color: ${props => props.active ? 'white' : '#1f2937'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover {
    border-color: ${props => props.disabled ? '#e9ecef' : '#4f46e5'};
    background: ${props => {
      if (props.disabled) return 'white'
      return props.active ? '#4338ca' : '#f3f4f6'
    }};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(1px)'};
  }

  &:focus {
    outline: none;
    box-shadow: ${props => props.disabled ? 'none' : '0 0 0 3px rgba(79, 70, 229, 0.1)'};
  }
`

export const Canvas = styled.canvas`
  width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: ${props => props.tool === 'pen' ? 'crosshair' : 'default'};
`

export const SelectionLayer = styled.canvas`
  width: 100%;
  height: auto;
  border-radius: 8px;
` 