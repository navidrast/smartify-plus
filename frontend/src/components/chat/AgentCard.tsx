'use client'

import { clsx } from 'clsx'
import { Bot } from 'lucide-react'
import { AGENT_COLORS, AGENT_LABELS } from '@/lib/constants'
import type { AgentType } from '@/types'

interface AgentCardProps {
  agentType: AgentType
  content: string
  metadata?: Record<string, unknown>
  status?: 'complete' | 'processing' | 'error'
  processingTime?: number
}

export function AgentCard({
  agentType,
  content,
  metadata,
  status = 'complete',
  processingTime,
}: AgentCardProps) {
  const color = AGENT_COLORS[agentType]
  const label = AGENT_LABELS[agentType]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4" style={{ color }} />
        <span className="text-sm font-medium" style={{ color }}>
          {label}
        </span>
        {processingTime != null && (
          <span className="text-xs text-text-muted">{processingTime}ms</span>
        )}
        <span
          className={clsx(
            'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
            {
              'bg-gst-10-bg text-gst-10': status === 'complete',
              'bg-gst-unknown-bg text-gst-unknown': status === 'processing',
              'bg-gst-error-bg text-gst-error': status === 'error',
            }
          )}
        >
          {status === 'processing' && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {status === 'complete' ? 'Complete' : status === 'processing' ? 'Processing...' : 'Error'}
        </span>
      </div>

      {/* Body */}
      <div className="text-sm text-text-secondary">
        <p className="whitespace-pre-wrap">{content}</p>
        {metadata && (
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs text-text-muted">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
