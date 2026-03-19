'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { Menu, PanelRight } from 'lucide-react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { getMessages } from '@/lib/api'
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
}

export type StagedFile = { name: string; documentId: string }

export function ChatArea({ conversationId, onTitleUpdate, onMenuOpen, onInspectorOpen, conversations = [] }: ChatAreaProps) {
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

  const { events, send, clearEvents } = useWebSocket(conversationId)
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

  // When pipeline_done or a message event arrives, stop the waiting indicator
  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done' || e.type === 'message')) {
      setIsWaiting(false)
    }
  }, [events])

  // Refresh messages when pipeline completes
  useEffect(() => {
    if (events.some((e) => e.type === 'pipeline_done')) {
      mutateMessages()
      setStreamingText('')
    }
  }, [events, mutateMessages])

  // Refresh sidebar when title updates
  useEffect(() => {
    if (events.some((e) => e.type === 'title_update')) {
      onTitleUpdate?.()
    }
  }, [events, onTitleUpdate])

  // Upload files and stage them (no auto-send)
  const handleDroppedFiles = useCallback(async (files: File[]) => {
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
  }, [conversationId, upload])

  const handleRemoveStagedFile = useCallback((documentId: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.documentId !== documentId))
  }, [])

  const handleSend = useCallback((payload: { message: string; document_ids: string[] }) => {
    clearEvents()
    setIsWaiting(true)
    setStreamingText('')
    // Merge any staged file IDs into the payload
    const allDocIds = [...payload.document_ids, ...stagedFiles.map((f) => f.documentId)]
    send({ ...payload, document_ids: allDocIds })
    setStagedFiles([])
    // Optimistically show the user message immediately
    if (payload.message) {
      mutateMessages(
        (prev) => [
          ...(prev ?? []),
          {
            id: `optimistic-${Date.now()}`,
            conversation_id: conversationId!,
            role: 'user' as const,
            content: payload.message,
            created_at: new Date().toISOString(),
          },
        ],
        { revalidate: false }
      )
    }
  }, [clearEvents, send, mutateMessages, conversationId, stagedFiles])

  const runtime = useSmartifyRuntime({
    messages,
    isRunning: isPipelineRunning || isWaiting,
    onSend: handleSend,
    streamingText: isPipelineRunning ? streamingText : undefined,
  })

  // Drag counter prevents premature overlay dismiss when passing over child elements
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    setShowDrop(true)
  }, [])

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

  // Get title for mobile header
  const activeTitle = conversationId
    ? (conversations.find((c) => c.id === conversationId)?.title ?? 'Chat')
    : 'Smartify'

  if (!conversationId) {
    return (
      <div className="relative flex flex-1 flex-col bg-background min-w-0">
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
        <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-lg shadow-accent/20">
            S+
          </div>
          <h2 className="mb-2 text-center text-lg font-medium text-text-primary">
            Welcome to Smartify Plus
          </h2>
          <p className="text-center text-sm text-text-muted">
            Create a new chat to begin extracting data from your documents
          </p>
        </div>
      </div>
    )
  }

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

      {/* Hidden file input — multiple files supported */}
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
          onFileClick={() => fileRef.current?.click()}
          isStagingFiles={isStagingFiles}
          stagedFiles={stagedFiles}
          onRemoveStagedFile={handleRemoveStagedFile}
        />
      </AssistantRuntimeProvider>
    </div>
  )
}
