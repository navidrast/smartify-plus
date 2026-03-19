'use client'

import { forwardRef, type ComponentPropsWithRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/cn'

type TooltipIconButtonProps = ComponentPropsWithRef<'button'> & {
  tooltip: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  variant?: 'default' | 'outline' | 'ghost'
}

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ children, tooltip, side = 'top', variant = 'ghost', className, ...props }, ref) => (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            ref={ref}
            className={cn(
              'inline-flex items-center justify-center rounded-md p-1 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
              variant === 'ghost' && 'hover:bg-card-alt hover:text-text-primary text-text-muted',
              variant === 'outline' && 'border border-border bg-background hover:bg-card-alt text-text-muted hover:text-text-primary',
              variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
              'h-6 w-6',
              className
            )}
            {...props}
          >
            {children}
            <span className="sr-only">{tooltip}</span>
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className="z-[60] rounded-md bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            {tooltip}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
)

TooltipIconButton.displayName = 'TooltipIconButton'
