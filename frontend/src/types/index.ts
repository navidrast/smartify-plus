export type Role = 'user' | 'assistant' | 'agent'

export type AgentType =
  | 'extraction'
  | 'gst'
  | 'abn'
  | 'reconciliation'
  | 'reporting'
  | 'compliance'

export type GSTCode = '10%' | '0%' | 'unknown'

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface Message {
  id: string
  conversation_id: string
  role: Role
  agent_type?: AgentType
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ExtractedRecord {
  id: string
  document_id: string
  conversation_id: string
  date: string | null
  amount: number | null
  vendor: string | null
  description: string | null
  gst_code: GSTCode
  confidence: number
  notes: string
  source_page: string
  created_at: string
}

export interface AgentEvent {
  type:
    | 'agent_start'
    | 'agent_progress'
    | 'agent_complete'
    | 'agent_error'
    | 'pipeline_done'
    | 'message'
    | 'title_update'
  agent?: AgentType
  message?: string
  data?: unknown
  error?: string
  summary?: unknown
  title?: string
  role?: string
  content?: string
}
