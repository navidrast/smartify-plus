'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('overflow-y-auto overflow-x-hidden', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ScrollArea.displayName = 'ScrollArea'
