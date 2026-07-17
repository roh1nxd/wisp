'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  gap?: number
  pixelSize?: number
  // Hex colors corresponding to design tokens:
  // var(--accent) => #C85C39
  // var(--text-muted) => #7E796E
  // var(--text-secondary) => #4E4B42
  colors?: string[]
}

export function PixelCard({
  children,
  className,
  gap = 6,
  pixelSize = 4,
  colors = ['#C85C39', '#E69175', '#7E796E', '#4E4B42', '#FAF9F6']
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const mouseRef = useRef({ x: 0, y: 0 })
  const pixelsRef = useRef<{ x: number; y: number; color: string; alpha: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Add a pixel on hover at cursor coordinates
      if (isHovered) {
        const mouseX = mouseRef.current.x
        const mouseY = mouseRef.current.y

        // Align to pixel grid
        const gridX = Math.floor(mouseX / gap) * gap
        const gridY = Math.floor(mouseY / gap) * gap

        // Avoid adding duplicates in the same frame
        const alreadyExists = pixelsRef.current.some(
          (p) => p.x === gridX && p.y === gridY && p.alpha > 0.8
        )

        if (!alreadyExists && Math.random() < 0.4) {
          const color = colors[Math.floor(Math.random() * colors.length)]
          pixelsRef.current.push({ x: gridX, y: gridY, color, alpha: 1.0 })
        }
      }

      // Update and draw existing pixels
      pixelsRef.current = pixelsRef.current.filter((pixel) => {
        pixel.alpha -= 0.035 // Fade out over time
        if (pixel.alpha <= 0) return false

        ctx.fillStyle = pixel.color
        ctx.globalAlpha = pixel.alpha
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
        return true
      })

      ctx.globalAlpha = 1.0
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
    }
  }, [isHovered, gap, pixelSize, colors])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all duration-300 shadow-sm hover:shadow-md",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
      <div className="relative z-0 h-full w-full">
        {children}
      </div>
    </div>
  )
}
