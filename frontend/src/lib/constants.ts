import type { AgentType, GSTCode } from '@/types'

export const AGENT_COLORS: Record<AgentType, string> = {
  extraction: '#FF8400',
  gst: '#4ade80',
  abn: '#B2B2FF',
  reconciliation: '#FF8400',
  reporting: '#4ade80',
  compliance: '#FF5C33',
}

export const AGENT_LABELS: Record<AgentType, string> = {
  extraction: 'Extraction Agent',
  gst: 'GST Agent',
  abn: 'ABN Agent',
  reconciliation: 'Reconciliation Agent',
  reporting: 'Reporting Agent',
  compliance: 'Compliance Agent',
}

export const GST_STYLES: Record<GSTCode, { text: string; bg: string; label: string }> = {
  '10%': { text: 'text-tertiary border-tertiary/20', bg: 'bg-tertiary-container/20', label: '10% GST' },
  '0%': { text: 'text-on-surface-variant border-outline-variant/20', bg: 'bg-surface-variant', label: '0% GST' },
  unknown: { text: 'text-primary-container border-primary-container/20', bg: 'bg-primary-container/10', label: 'GST Unknown' },
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
