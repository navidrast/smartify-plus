import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-xl font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-accent text-white hover:bg-accent/90 active:bg-accent/80': variant === 'primary',
            'bg-card-alt text-text-primary hover:bg-sidebar-active active:bg-sidebar-active': variant === 'secondary',
            'text-text-secondary hover:text-text-primary hover:bg-card-alt active:bg-card-alt': variant === 'ghost',
          },
          {
            'h-9 px-3 text-xs': size === 'sm',
            'h-11 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
