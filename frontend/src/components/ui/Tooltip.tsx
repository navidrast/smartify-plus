'use client'

import { useState, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      className={clsx('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-card-alt px-2 py-1 text-xs text-text-secondary shadow-lg">
          {content}
        </div>
      )}
    </div>
  )
}
