'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { Upload } from 'lucide-react'
import { getMessages } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { AgentProgress } from '@/components/chat/AgentProgress'
import { InputBar } from '@/components/chat/InputBar'
import { UploadZone } from '@/components/chat/UploadZone'
import { ScrollArea } from '@/components/ui/ScrollArea'
import type { Message, ExtractedRecord, AgentEvent } from '@/types'

interface ChatAreaProps {
  conversationId: string | null
  onRecordSelect: (record: ExtractedRecord) => void
}

export function ChatArea({ conversationId, onRecordSelect }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)

  const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    () => getMessages(conversationId!)
  )

  const { events, send, clearEvents } = useWebSocket(conversationId)

  // Track active agents from events
  const activeAgents = events.reduce<Record<string, AgentEvent>>((acc, ev) => {
    if (ev.agent) {
      acc[ev.agent] = ev
    }
    return acc
  }, {})

  const isPipelineRunning = events.length > 0 && !events.some((e) => e.type === 'pipeline_done')

  // When pipeline_done or a message event arrives, stop the waiting indicator
  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done' || e.type === 'message')) {
      setIsWaiting(false)
    }
  }, [events])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, events])

  // Refresh messages when pipeline completes
  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done')) {
      mutateMessages()
    }
  }, [events, mutateMessages])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setShowDrop(true)
  }, [])

  const handleDragLeave = useCallback(() => setShowDrop(false), [])

  if (!conversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background">
        <Upload className="mb-4 h-12 w-12 text-text-muted" />
        <h2 className="mb-2 text-lg font-medium text-text-primary">
          Upload a receipt or invoice to get started
        </h2>
        <p className="text-sm text-text-muted">
          Create a new chat to begin extracting data from your documents
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-1 flex-col bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {showDrop && (
        <UploadZone
          conversationId={conversationId}
          onDone={() => {
            setShowDrop(false)
            mutateMessages()
          }}
        />
      )}

      <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
        {messages?.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRecordSelect={onRecordSelect}
          />
        ))}

        {isWaiting && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-2xl bg-card px-4 py-3">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        {isPipelineRunning && !isWaiting && <AgentProgress agents={activeAgents} />}
      </ScrollArea>

      <InputBar
        conversationId={conversationId}
        onSend={(payload) => { clearEvents(); setIsWaiting(true); send(payload) }}
        onMessageSent={() => mutateMessages()}
      />
    </div>
  )
}
