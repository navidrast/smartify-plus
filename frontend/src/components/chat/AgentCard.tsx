'use client'

import { clsx } from 'clsx'
import { AGENT_COLORS, AGENT_LABELS } from '@/lib/constants'
import type { AgentType } from '@/types'

interface AgentCardProps {
  agentType: AgentType
  content: string
  metadata?: Record<string, unknown>
  status?: 'complete' | 'processing' | 'error'
  processingTime?: number
}

// Material Symbols icon per agent (filled variant via font-variation-settings)
const AGENT_ICONS: Record<AgentType, string> = {
  extraction:     'schema',
  gst:            'account_balance',
  abn:            'business',
  reconciliation: 'account_tree',
  reporting:      'bar_chart',
  compliance:     'shield',
}

// Watermark background icon (decorative, top-right corner)
const AGENT_WATERMARK: Record<AgentType, string> = {
  extraction:     'database',
  gst:            'verified_user',
  abn:            'domain',
  reconciliation: 'merge',
  reporting:      'analytics',
  compliance:     'policy',
}

// Border colour per agent
const AGENT_BORDER: Record<AgentType, string> = {
  extraction:     'border-primary-container/40',
  gst:            'border-tertiary-container/40',
  abn:            'border-[#B2B2FF]/40',
  reconciliation: 'border-primary-container/40',
  reporting:      'border-tertiary-container/40',
  compliance:     'border-[#FF5C33]/40',
}

// Icon/accent colour per agent (text colour for icon + badge)
const AGENT_ACCENT: Record<AgentType, string> = {
  extraction:     'text-primary-container',
  gst:            'text-tertiary',
  abn:            'text-[#B2B2FF]',
  reconciliation: 'text-primary-container',
  reporting:      'text-tertiary',
  compliance:     'text-[#FF5C33]',
}

// Status badge background per agent
const AGENT_BADGE_BG: Record<AgentType, string> = {
  extraction:     'bg-primary-container/10 text-primary-container',
  gst:            'bg-tertiary-container/20 text-tertiary',
  abn:            'bg-[#B2B2FF]/10 text-[#B2B2FF]',
  reconciliation: 'bg-primary-container/10 text-primary-container',
  reporting:      'bg-tertiary-container/20 text-tertiary',
  compliance:     'bg-[#FF5C33]/10 text-[#FF5C33]',
}

export function AgentCard({
  agentType,
  content,
  metadata,
  status = 'complete',
  processingTime,
}: AgentCardProps) {
  const label = AGENT_LABELS[agentType]
  const icon = AGENT_ICONS[agentType]
  const watermark = AGENT_WATERMARK[agentType]
  const borderClass = AGENT_BORDER[agentType]
  const accentClass = AGENT_ACCENT[agentType]
  const badgeBg = AGENT_BADGE_BG[agentType]

  const statusLabel =
    status === 'complete' ? 'COMPLETE' :
    status === 'processing' ? 'PROCESSING' :
    'ERROR'

  return (
    <div className={clsx('relative overflow-hidden rounded-xl border bg-surface-container p-4 flex flex-col gap-3', borderClass)}>
      {/* Watermark background icon */}
      <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none select-none">
        <span className="material-symbols-outlined text-4xl">{watermark}</span>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={clsx('material-symbols-outlined text-[20px]', accentClass)}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
          <span className="font-headline font-bold text-sm text-on-surface">{label}</span>
        </div>
        <span className={clsx('font-mono text-[10px] px-2 py-1 rounded-md', badgeBg)}>
          {status === 'processing' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {statusLabel}
          {processingTime != null && status === 'complete' && ` · ${processingTime}ms`}
        </span>
      </div>

      {/* Content */}
      <p className="text-xs text-on-surface-variant font-medium leading-relaxed whitespace-pre-wrap">{content}</p>

      {/* Progress bar — shown for extraction agent or when processing */}
      {(agentType === 'extraction' || status === 'processing') && (
        <div className="flex gap-2">
          <div className="h-1 flex-1 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-500', {
                'bg-primary-container': agentType === 'extraction' || agentType === 'reconciliation',
                'bg-tertiary': agentType === 'gst' || agentType === 'reporting',
                'bg-[#B2B2FF]': agentType === 'abn',
                'bg-[#FF5C33]': agentType === 'compliance',
                'animate-pulse': status === 'processing',
              })}
              style={{ width: status === 'processing' ? '60%' : '100%' }}
            />
          </div>
        </div>
      )}

      {/* Action buttons — shown for GST/compliance agents */}
      {(agentType === 'gst' || agentType === 'compliance') && status === 'complete' && (
        <div className="flex items-center gap-2 mt-1">
          <button className={clsx('text-[10px] font-bold px-3 py-1 rounded-lg border', {
            'text-tertiary border-tertiary/20 bg-surface-container-high': agentType === 'gst',
            'text-[#FF5C33] border-[#FF5C33]/20 bg-surface-container-high': agentType === 'compliance',
          })}>
            {agentType === 'gst' ? 'VIEW LEDGER' : 'VIEW ISSUES'}
          </button>
          <button className="text-[10px] font-bold px-3 py-1 text-on-surface-variant">
            DISMISS
          </button>
        </div>
      )}

      {/* Metadata (raw JSON) — shown if present */}
      {metadata && (
        <pre className="mt-1 overflow-x-auto rounded bg-surface-container-highest/50 p-2 text-xs text-on-surface-variant">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  )
}
