'use client'

import { useEffect, useRef } from 'react'

interface KineticGridProps {
  dotColor?: string
  lineColor?: string
  trailColor?: string
  dotRadius?: number
  gridGap?: number
  magneticRadius?: number
}

export function KineticGrid({
  dotColor = 'rgba(200, 92, 57, 0.1)', // var(--accent) at low opacity
  lineColor = 'rgba(200, 92, 57, 0.05)',
  trailColor = 'rgba(200, 92, 57, 0.3)',
  dotRadius = 1.5,
  gridGap = 30,
  magneticRadius = 120
}: KineticGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    // Track mouse on window to ensure it works through any overlapping content or overlays
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    // Animation Loop
    const drawGrid = () => {
      ctx.clearRect(0, 0, width, height)

      const cols = Math.floor(width / gridGap) + 1
      const rows = Math.floor(height / gridGap) + 1
      const mouse = mouseRef.current

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const originalX = c * gridGap
          const originalY = r * gridGap

          let drawX = originalX
          let drawY = originalY

          if (mouse.active) {
            const dx = mouse.x - originalX
            const dy = mouse.y - originalY
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < magneticRadius) {
              // Calculate pull/push factor
              const force = (magneticRadius - dist) / magneticRadius
              // Shift the dot slightly away from the mouse cursor
              drawX = originalX - dx * force * 0.15
              drawY = originalY - dy * force * 0.15

              // Draw faint trail line from dot to cursor
              ctx.beginPath()
              ctx.moveTo(drawX, drawY)
              ctx.lineTo(mouse.x, mouse.y)
              ctx.strokeStyle = trailColor
              ctx.lineWidth = 0.5 * force
              ctx.stroke()
            }
          }

          // Draw the dot
          ctx.beginPath()
          ctx.arc(drawX, drawY, dotRadius, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.fill()

          // Draw lines connecting to right and bottom neighbors
          if (c < cols - 1) {
            ctx.beginPath()
            ctx.moveTo(drawX, drawY)
            ctx.lineTo((c + 1) * gridGap, r * gridGap)
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
          if (r < rows - 1) {
            ctx.beginPath()
            ctx.moveTo(drawX, drawY)
            ctx.lineTo(c * gridGap, (r + 1) * gridGap)
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(drawGrid)
    }

    drawGrid()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationId)
    }
  }, [dotColor, lineColor, trailColor, dotRadius, gridGap, magneticRadius])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block"
      style={{ opacity: 0.95 }}
    />
  )
}
