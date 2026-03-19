'use client'

import { useMemo, useCallback } from 'react'
import { useExternalStoreRuntime } from '@assistant-ui/react'
import type { Message } from '@/types'

/**
 * Bridges our backend Message[] + WebSocket events to assistant-ui's
 * external store runtime. This lets assistant-ui own the chat UI while
 * we keep our existing data fetching and WebSocket protocol.
 */

interface UseSmartifyRuntimeOptions {
  messages: Message[] | undefined
  isRunning: boolean
  onSend: (payload: { message: string; document_ids: string[] }) => void
  streamingText?: string
}

export function useSmartifyRuntime({
  messages,
  isRunning,
  onSend,
  streamingText,
}: UseSmartifyRuntimeOptions) {
  const backendMessages = useMemo(() => {
    const msgs = [...(messages ?? [])]

    // If we have streaming text, add a virtual in-progress assistant message
    if (isRunning && streamingText) {
      msgs.push({
        id: '__streaming__',
        conversation_id: '',
        role: 'assistant',
        content: streamingText,
        created_at: new Date().toISOString(),
      })
    }

    return msgs
  }, [messages, isRunning, streamingText])

  const handleNew = useCallback(
    async (message: { content: Array<{ type: string; text?: string }> }) => {
      const textParts = message.content.filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text'
      )
      const text = textParts.map((p) => p.text).join('\n')
      if (text.trim()) {
        onSend({ message: text.trim(), document_ids: [] })
      }
    },
    [onSend]
  )

  const runtime = useExternalStoreRuntime<Message>({
    messages: backendMessages,
    isRunning,
    onNew: handleNew as any,
    convertMessage: (msg: Message) => ({
      id: msg.id,
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: [{ type: 'text' as const, text: msg.content }],
      createdAt: new Date(msg.created_at),
      status: msg.id === '__streaming__'
        ? { type: 'running' as const }
        : { type: 'complete' as const, reason: 'stop' as const },
      metadata: {
        custom: {
          originalRole: msg.role,
          agentType: msg.agent_type ?? null,
          agentMetadata: msg.metadata ?? null,
        },
      },
    }),
  })

  return runtime
}
