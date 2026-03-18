'use client'

import { Bot } from 'lucide-react'
import { AGENT_COLORS, AGENT_LABELS } from '@/lib/constants'
import type { AgentType, AgentEvent } from '@/types'
import { clsx } from 'clsx'

interface AgentProgressProps {
  agents: Record<string, AgentEvent>
}

const AGENT_ORDER: AgentType[] = [
  'extraction',
  'gst',
  'abn',
  'reconciliation',
  'reporting',
  'compliance',
]

export function AgentProgress({ agents }: AgentProgressProps) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Pipeline Progress
      </h3>
      <div className="space-y-2">
        {AGENT_ORDER.map((agentType) => {
          const event = agents[agentType]
          const status = !event
            ? 'pending'
            : event.type === 'agent_complete'
              ? 'done'
              : event.type === 'agent_error'
                ? 'error'
                : 'running'

          return (
            <div key={agentType} className="flex items-center gap-3">
              <span
                className={clsx('h-2 w-2 rounded-full', {
                  'bg-text-muted': status === 'pending',
                  'animate-pulse bg-gst-unknown': status === 'running',
                  'bg-gst-10': status === 'done',
                  'bg-gst-error': status === 'error',
                })}
              />
              <Bot
                className="h-3.5 w-3.5"
                style={{ color: AGENT_COLORS[agentType] }}
              />
              <span className="text-sm text-text-secondary">
                {AGENT_LABELS[agentType]}
              </span>
              {event?.message && (
                <span className="ml-auto text-xs text-text-muted">{event.message}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
