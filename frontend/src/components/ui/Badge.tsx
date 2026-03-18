import { clsx } from 'clsx'
import type { GSTCode } from '@/types'
import { GST_STYLES } from '@/lib/constants'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  )
}

export function GSTBadge({ code }: { code: GSTCode }) {
  const style = GST_STYLES[code]
  return (
    <Badge className={clsx(style.text, style.bg)}>
      {style.label}
    </Badge>
  )
}
