import { useState, useEffect } from 'react'

export function useCanvas(canvasRef, backgroundImage) {
  const [contextRef, setContextRef] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas.parentElement
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight - 60

    const context = canvas.getContext('2d')
    context.lineCap = 'round'
    setContextRef(context)

    const handleResize = () => {
      const prevCanvas = canvas.toDataURL()
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight - 60
      
      if (backgroundImage) {
        drawBackgroundImage(backgroundImage, canvas, context)
      }
      
      const img = new Image()
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = prevCanvas
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [backgroundImage])

  return contextRef
}

export function drawBackgroundImage(imgSrc, canvas, context) {
  const img = new Image()
  img.onload = () => {
    const ratio = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    )
    const newWidth = img.width * ratio
    const newHeight = img.height * ratio
    const x = (canvas.width - newWidth) / 2
    const y = (canvas.height - newHeight) / 2
    
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(img, x, y, newWidth, newHeight)
  }
  img.src = imgSrc
} 