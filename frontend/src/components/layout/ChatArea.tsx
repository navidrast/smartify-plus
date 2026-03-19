'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Menu, PanelRight } from 'lucide-react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { getMessages, createConversation } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useUpload } from '@/hooks/useUpload'
import { useSmartifyRuntime } from '@/lib/useSmartifyRuntime'
import { SmartifyThread } from '@/components/assistant-ui/SmartifyThread'
import { UploadZone } from '@/components/chat/UploadZone'
import type { Message, AgentEvent, Conversation } from '@/types'

interface ChatAreaProps {
  conversationId: string | null
  onTitleUpdate?: () => void
  onMenuOpen?: () => void
  onInspectorOpen?: () => void
  conversations?: Conversation[]
  onConversationsChange?: () => void
}

export type StagedFile = { name: string; documentId: string }

const PENDING_KEY = 'smartify_pending_send'

export function ChatArea({
  conversationId,
  onTitleUpdate,
  onMenuOpen,
  onInspectorOpen,
  conversations = [],
  onConversationsChange,
}: ChatAreaProps) {
  const router = useRouter()
  const [showDrop, setShowDrop] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [isStagingFiles, setIsStagingFiles] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    () => getMessages(conversationId!)
  )

  const { events, send, clearEvents, isConnected } = useWebSocket(conversationId)
  const { upload } = useUpload(conversationId)

  // Track active agents from events
  const activeAgents = events.reduce<Record<string, AgentEvent>>((acc, ev) => {
    if (ev.agent) acc[ev.agent] = ev
    return acc
  }, {})

  const isPipelineRunning = events.length > 0 && !events.some((e) => e.type === 'pipeline_done')

  // Collect streaming text from message events
  useEffect(() => {
    const msgEvents = events.filter((e) => e.type === 'message' && e.content)
    if (msgEvents.length > 0) {
      setStreamingText(msgEvents[msgEvents.length - 1].content ?? '')
    }
  }, [events])

  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done' || e.type === 'message')) {
      setIsWaiting(false)
    }
  }, [events])

  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done')) {
      mutateMessages()
      setStreamingText('')
    }
  }, [events, mutateMessages])

  useEffect(() => {
    if (events.some((e) => e.type === 'title_update')) {
      onTitleUpdate?.()
    }
  }, [events, onTitleUpdate])

  // When a real conversationId is present and WS connects, send any pending
  // message that was queued by a send from the no-conversation welcome state.
  useEffect(() => {
    if (!isConnected || !conversationId) return
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return
    sessionStorage.removeItem(PENDING_KEY)
    const payload = JSON.parse(raw) as { message: string; document_ids: string[] }
    clearEvents()
    setIsWaiting(true)
    send(payload)
    if (payload.message) {
      mutateMessages(
        (prev) => [
          ...(prev ?? []),
          {
            id: `optimistic-${Date.now()}`,
            conversation_id: conversationId,
            role: 'user' as const,
            content: payload.message,
            created_at: new Date().toISOString(),
          },
        ],
        { revalidate: false }
      )
    }
  }, [isConnected, conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Upload files and stage them (no auto-send)
  const handleDroppedFiles = useCallback(
    async (files: File[]) => {
      if (!conversationId) return
      setIsStagingFiles(true)
      try {
        const results = await Promise.all(files.map((f) => upload(f)))
        const newStaged = results.flatMap((r, i) =>
          r?.document_id ? [{ name: files[i].name, documentId: r.document_id }] : []
        )
        setStagedFiles((prev) => [...prev, ...newStaged])
      } finally {
        setIsStagingFiles(false)
      }
    },
    [conversationId, upload]
  )

  const handleRemoveStagedFile = useCallback((documentId: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.documentId !== documentId))
  }, [])

  const handleSend = useCallback(
    (payload: { message: string; document_ids: string[] }) => {
      const allDocIds = [...payload.document_ids, ...stagedFiles.map((f) => f.documentId)]
      const fullPayload = { ...payload, document_ids: allDocIds }
      setStagedFiles([])

      // No conversation yet — create one and queue the message for after WS connects
      if (!conversationId) {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(fullPayload))
        createConversation().then((conv) => {
          onConversationsChange?.()
          router.push(`/chat/${conv.id}`)
        })
        return
      }

      clearEvents()
      setIsWaiting(true)
      setStreamingText('')
      send(fullPayload)
      if (fullPayload.message) {
        mutateMessages(
          (prev) => [
            ...(prev ?? []),
            {
              id: `optimistic-${Date.now()}`,
              conversation_id: conversationId,
              role: 'user' as const,
              content: fullPayload.message,
              created_at: new Date().toISOString(),
            },
          ],
          { revalidate: false }
        )
      }
    },
    [clearEvents, send, mutateMessages, conversationId, stagedFiles, router, onConversationsChange]
  )

  const runtime = useSmartifyRuntime({
    messages,
    isRunning: isPipelineRunning || isWaiting,
    onSend: handleSend,
    streamingText: isPipelineRunning ? streamingText : undefined,
  })

  // Drag-drop only active when there is a real conversation to upload into
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!conversationId) return
      e.preventDefault()
      dragCounterRef.current++
      setShowDrop(true)
    },
    [conversationId]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setShowDrop(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !conversationId) return
    await handleDroppedFiles(files)
    if (fileRef.current) fileRef.current.value = ''
  }

  const activeTitle = conversationId
    ? (conversations.find((c) => c.id === conversationId)?.title ?? 'Chat')
    : 'Smartify'

  return (
    <div
      className="relative flex flex-1 flex-col bg-background min-w-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
    >
      {/* Mobile top bar */}
      <div className="flex items-center gap-2 border-b border-border bg-sidebar px-2 py-2 md:hidden">
        <button
          onClick={onMenuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex-1 truncate px-1 text-sm font-semibold text-text-primary">{activeTitle}</span>
        <button
          onClick={onInspectorOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
          aria-label="Open inspector"
        >
          <PanelRight className="h-5 w-5" />
        </button>
      </div>

      {showDrop && (
        <UploadZone
          onFiles={(files) => {
            dragCounterRef.current = 0
            setShowDrop(false)
            handleDroppedFiles(files)
          }}
          onDismiss={() => {
            dragCounterRef.current = 0
            setShowDrop(false)
          }}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp,.xlsx,.xls,.csv"
        onChange={handleFileChange}
      />

      <AssistantRuntimeProvider runtime={runtime}>
        <SmartifyThread
          agents={activeAgents}
          isPipelineRunning={isPipelineRunning}
          isWaiting={isWaiting}
          onFileClick={conversationId ? () => fileRef.current?.click() : undefined}
          isStagingFiles={isStagingFiles}
          stagedFiles={stagedFiles}
          onRemoveStagedFile={handleRemoveStagedFile}
        />
      </AssistantRuntimeProvider>
    </div>
  )
}
