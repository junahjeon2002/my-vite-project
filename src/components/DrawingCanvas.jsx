import React, { useRef, useState, useEffect, forwardRef } from 'react'
import { CanvasContainer, Canvas, SelectionLayer } from './styles/DrawingCanvasStyles'
import ToolBar from './ToolBar'
import styled from '@emotion/styled'

const DrawingCanvas = forwardRef(({ onSendImage, currentImageIndex }, ref) => {
  const canvasRef = useRef(null)
  const selectionRef = useRef(null)
  const combinedCanvasRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [selectedColor, setSelectedColor] = useState('black')
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentArea, setCurrentArea] = useState(null)
  const [selectedAreas, setSelectedAreas] = useState([])
  const [selectedImageDatas, setSelectedImageDatas] = useState([])
  const [currentImage, setCurrentImage] = useState(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [drawingHistory, setDrawingHistory] = useState([])
  const [currentPath, setCurrentPath] = useState([])

  const images = Array.from({ length: 29 }, (_, i) => `/images/${i + 1}.png`)

  useEffect(() => {
    if (currentImageIndex < images.length) {
      loadImage(images[currentImageIndex])
      setShowCompletion(false)
      // 이미지가 변경될 때 선택된 영역들 초기화
      setSelectedAreas([])
      setSelectedImageDatas([])
      setCurrentArea(null)
      
      // 선택 레이어 초기화
      if (selectionRef.current) {
        const ctx = selectionRef.current.getContext('2d')
        ctx.clearRect(0, 0, selectionRef.current.width, selectionRef.current.height)
      }
    } else {
      setShowCompletion(true)
    }
  }, [currentImageIndex])

  useEffect(() => {
    const updateSelectionLayerSize = () => {
      if (canvasRef.current && selectionRef.current) {
        selectionRef.current.width = canvasRef.current.width
        selectionRef.current.height = canvasRef.current.height
        selectionRef.current.style.width = '100%'
        selectionRef.current.style.height = 'auto'
      }
    }

    updateSelectionLayerSize()
    window.addEventListener('resize', updateSelectionLayerSize)
    return () => window.removeEventListener('resize', updateSelectionLayerSize)
  }, [currentImage])

  useEffect(() => {
    if (ref) {
      ref.current = {
        toDataURL: () => {
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          
          tempCanvas.width = canvasRef.current.width
          tempCanvas.height = canvasRef.current.height
          
          tempCtx.drawImage(canvasRef.current, 0, 0)
          
          if (selectionRef.current) {
            tempCtx.drawImage(selectionRef.current, 0, 0)
          }
          
          return tempCanvas.toDataURL('image/png')
        }
      }
    }
  }, [ref, selectedAreas])

  const loadImage = (src) => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      setCurrentImage(img)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      // 캔버스 크기를 원본 이미지 크기로 설정
      canvas.width = img.width
      canvas.height = img.height
      
      // 이미지를 원본 크기로 그린 후, CSS로 크기 조정
      ctx.drawImage(img, 0, 0)
      canvas.style.width = '100%'
      canvas.style.height = 'auto'

      // 선택 레이어도 동일한 크기로 설정
      if (selectionRef.current) {
        selectionRef.current.width = img.width
        selectionRef.current.height = img.height
        selectionRef.current.style.width = '100%'
        selectionRef.current.style.height = 'auto'
      }
    }
  }

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1)
      setShowCompletion(false)
    }
  }

  const handleNext = () => {
    setCurrentImageIndex(prev => {
      if (prev < images.length - 1) {
        setShowCompletion(false)
        return prev + 1
      } else if (prev === images.length - 1) {
        setShowCompletion(true)
        return prev + 1
      }
      return prev // 이미 완료 상태면 아무것도 안 함
    })
  }
  

  const getScaledCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e) => {
    const { x, y } = getScaledCoordinates(e)

    if (tool === 'select') {
      setIsDrawing(true)
      setStartPos({ x, y })
      setCurrentArea(null)
    } else if (tool === 'pen') {
      setIsDrawing(true)
      setStartPos({ x, y })
      setCurrentPath([{ x, y }])
      const ctx = canvasRef.current.getContext('2d')
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return

    const { x, y } = getScaledCoordinates(e)

    if (tool === 'select') {
      const width = x - startPos.x
      const height = y - startPos.y
      setCurrentArea({ x: startPos.x, y: startPos.y, width, height })
      drawSelection()
    } else if (tool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }])
      draw(e)
    }
  }

  const handleMouseUp = (e) => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (tool === 'select' && currentArea) {
      const { x, y, width, height } = currentArea
      const imageData = canvasRef.current.getContext('2d').getImageData(
        Math.min(x, x + width),
        Math.min(y, y + height),
        Math.abs(width),
        Math.abs(height)
      )
      const newArea = { ...currentArea, type: 'select', color: selectedColor }
      setSelectedAreas(prev => [...prev, newArea])
      setSelectedImageDatas(prev => [...prev, imageData])
      setDrawingHistory(prev => [...prev, { type: 'select', area: newArea, imageData }])
    } else if (tool === 'pen' && currentPath.length > 0) {
      setDrawingHistory(prev => [...prev, { 
        type: 'pen', 
        path: currentPath, 
        color: selectedColor 
      }])
      setCurrentPath([])
    }
  }

  const draw = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getScaledCoordinates(e)

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = tool === 'eraser' ? 'white' : selectedColor

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const drawSelection = () => {
    const canvas = selectionRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 기존에 선택된 영역들 모두 그리기
    selectedAreas.forEach(area => {
      const { x, y, width, height, color } = area
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(
        Math.min(x, x + width),
        Math.min(y, y + height),
        Math.abs(width),
        Math.abs(height)
      )
    })

    // 현재 선택 중인 영역 그리기
    if (currentArea) {
      const { x, y, width, height } = currentArea
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = 2
      ctx.strokeRect(
        Math.min(x, x + width),
        Math.min(y, y + height),
        Math.abs(width),
        Math.abs(height)
      )
    }
  }

  const handleToolChange = (newTool) => {
    setTool(newTool)
    if (newTool !== 'select') {
      setCurrentArea(null)
      drawSelection()
    }
  }

  const undoLastAction = () => {
    if (drawingHistory.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 현재 이미지 다시 로드
    if (currentImage) {
      ctx.drawImage(currentImage, 0, 0)
    }

    // 마지막 작업을 제외한 모든 작업 다시 그리기
    const newHistory = drawingHistory.slice(0, -1)
    newHistory.forEach(action => {
      if (action.type === 'pen') {
        ctx.beginPath()
        ctx.moveTo(action.path[0].x, action.path[0].y)
        action.path.forEach(point => {
          ctx.lineTo(point.x, point.y)
          ctx.strokeStyle = action.color
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(point.x, point.y)
        })
      }
    })

    // 선택 영역 업데이트
    const newSelectedAreas = newHistory
      .filter(action => action.type === 'select')
      .map(action => action.area)
    setSelectedAreas(newSelectedAreas)
    
    // 선택 레이어 다시 그리기
    const selectionCtx = selectionRef.current.getContext('2d')
    selectionCtx.clearRect(0, 0, selectionRef.current.width, selectionRef.current.height)
    newSelectedAreas.forEach(area => {
      const { x, y, width, height, color } = area
      selectionCtx.strokeStyle = color
      selectionCtx.lineWidth = 2
      selectionCtx.strokeRect(
        Math.min(x, x + width),
        Math.min(y, y + height),
        Math.abs(width),
        Math.abs(height)
      )
    })

    setDrawingHistory(newHistory)
  }

  const clearAll = () => {
    // 캔버스 초기화
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // 현재 이미지 다시 로드
      if (currentImage) {
        ctx.drawImage(currentImage, 0, 0)
      }
    }
    
    // 선택 레이어 초기화
    if (selectionRef.current) {
      const ctx = selectionRef.current.getContext('2d')
      ctx.clearRect(0, 0, selectionRef.current.width, selectionRef.current.height)
    }
    
    // 모든 상태 초기화
    setSelectedAreas([])
    setSelectedImageDatas([])
    setCurrentArea(null)
    setDrawingHistory([])
  }

  return (
    <CanvasContainer>
      <ToolBar
        tool={tool}
        setTool={handleToolChange}
        colors={['red', 'blue', 'green', 'yellow', 'black']}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onClearAll={clearAll}
        onUndo={undoLastAction}
        onPrevious={handlePrevious}
        onNext={handleNext}
        currentImageIndex={currentImageIndex}
        totalImages={images.length}
      />
      <div style={{ position: 'relative', flex: 1 }}>
        {showCompletion ? (
          <CompletionMessage>
            <h1>끝!</h1>
          </CompletionMessage>
        ) : (
          <>
      <Canvas
        ref={canvasRef}
              tool={tool}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <SelectionLayer
              ref={selectionRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
              }}
            />
          </>
        )}
      </div>
    </CanvasContainer>
  )
})

const CompletionMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: white;

  h1 {
    font-size: 4rem;
    color: #4f46e5;
    margin: 0;
    text-align: center;
  }
`

const SendButton = styled.button`
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;

  &:hover {
    background: #4338CA;
  }
`

export default DrawingCanvas 