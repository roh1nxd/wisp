'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DockProps {
  items: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    active?: boolean
  }[]
  className?: string
}

export function Dock({ items, className }: DockProps) {
  const mouseX = useMotionValue(Infinity)

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "flex h-16 items-end gap-4 rounded-2xl bg-[var(--bg-surface)] px-4 pb-3 border border-[var(--border-strong)] shadow-md select-none",
        className
      )}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
      }}
    >
      {items.map((item, index) => (
        <DockIcon
          key={index}
          mouseX={mouseX}
          label={item.label}
          icon={item.icon}
          onClick={item.onClick}
          active={item.active}
        />
      ))}
    </motion.div>
  )
}

function DockIcon({
  mouseX,
  label,
  icon,
  onClick,
  active
}: {
  mouseX: any
  label: string
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  // Smooth magnifying scale based on cursor distance
  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 56, 40])
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 56, 40])

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  })
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  })

  return (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-xl cursor-pointer transition-colors duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
        active && "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--accent)]/10"
      )}
      title={label}
      whileTap={{ scale: 0.9 }}
    >
      <div className="flex items-center justify-center w-6 h-6">
        {icon}
      </div>
      {active && (
        <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
      )}
    </motion.div>
  )
}
