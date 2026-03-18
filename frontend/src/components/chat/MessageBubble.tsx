'use client'

import { clsx } from 'clsx'
import { AgentCard } from './AgentCard'
import type { Message, ExtractedRecord } from '@/types'

interface MessageBubbleProps {
  message: Message
  onRecordSelect: (record: ExtractedRecord) => void
}

export function MessageBubble({ message, onRecordSelect }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAgent = message.role === 'agent'

  if (isAgent && message.agent_type) {
    return (
      <div className="mb-4 flex justify-start">
        <div className="max-w-[80%]">
          <AgentCard
            agentType={message.agent_type}
            content={message.content}
            metadata={message.metadata}
            onRecordSelect={onRecordSelect}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('mb-4 flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-card-alt text-text-primary'
            : 'bg-card text-text-primary'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <span className="mt-1 block text-[10px] text-text-muted">
          {new Date(message.created_at).toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
