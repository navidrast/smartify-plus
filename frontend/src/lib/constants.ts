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
  '10%': { text: 'text-gst-10', bg: 'bg-gst-10-bg', label: 'GST 10%' },
  '0%': { text: 'text-gst-10', bg: 'bg-gst-10-bg', label: 'GST Free' },
  unknown: { text: 'text-gst-unknown', bg: 'bg-gst-unknown-bg', label: 'GST Unknown' },
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
