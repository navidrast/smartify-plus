'use client'

import { type FC } from 'react'
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useMessage,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import { ArrowUp, ArrowDown, Paperclip, Upload } from 'lucide-react'
import { AgentCard } from '@/components/chat/AgentCard'
import { AgentProgress } from '@/components/chat/AgentProgress'
import type { AgentEvent, AgentType } from '@/types'

// ─── User Message ─────────────────────────────────────────────
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-4 flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-card-alt px-4 py-3 text-sm text-text-primary">
        <MessagePrimitive.Content
          components={{ Text: UserMessageText }}
        />
        <MessageTimestamp />
      </div>
    </MessagePrimitive.Root>
  )
}

const UserMessageText: FC<{ text: string }> = ({ text }) => (
  <p className="whitespace-pre-wrap">{text}</p>
)

// ─── Assistant Message ────────────────────────────────────────
const AssistantMessage: FC = () => {
  const message = useMessage()
  const custom = message.metadata?.custom as {
    originalRole?: string
    agentType?: AgentType | null
    agentMetadata?: Record<string, unknown> | null
  } | undefined

  // Agent messages render as AgentCard
  if (custom?.originalRole === 'agent' && custom?.agentType) {
    const textContent = message.content.find((p) => p.type === 'text')
    return (
      <MessagePrimitive.Root className="mb-4 flex justify-start">
        <div className="max-w-[80%]">
          <AgentCard
            agentType={custom.agentType}
            content={(textContent as { text: string })?.text ?? ''}
            metadata={custom.agentMetadata ?? undefined}
          />
        </div>
      </MessagePrimitive.Root>
    )
  }

  // Regular assistant messages
  return (
    <MessagePrimitive.Root className="mb-4 flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-card px-4 py-3 text-sm text-text-primary">
        <MessagePrimitive.Content
          components={{ Text: AssistantMarkdownText }}
        />
        <MessageTimestamp />
      </div>
    </MessagePrimitive.Root>
  )
}

const AssistantMarkdownText: FC = () => (
  <MarkdownTextPrimitive className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-background prose-pre:rounded-lg prose-pre:p-3 prose-code:text-accent prose-a:text-accent prose-headings:text-text-primary" />
)

// ─── Shared Timestamp ─────────────────────────────────────────
const MessageTimestamp: FC = () => {
  const message = useMessage()
  const createdAt = message.createdAt
  if (!createdAt) return null
  return (
    <span className="mt-1 block text-[10px] text-text-muted">
      {createdAt.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

// ─── Composer ─────────────────────────────────────────────────
interface SmartifyComposerProps {
  onFileClick?: () => void
  isUploading?: boolean
}

const SmartifyComposer: FC<SmartifyComposerProps> = ({ onFileClick, isUploading }) => {
  return (
    <div className="border-t border-border bg-background px-3 pt-3 pb-safe md:px-6 md:pt-4">
      <ComposerPrimitive.Root className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
        {onFileClick && (
          <button
            onClick={onFileClick}
            disabled={isUploading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors active:bg-sidebar-active disabled:opacity-40 md:h-9 md:w-9"
            aria-label="Attach file"
            type="button"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        )}
        <ComposerPrimitive.Input
          placeholder="Message Smartify..."
          rows={1}
          autoFocus
          style={{ fontSize: '16px' }}
          className="max-h-[140px] flex-1 resize-none bg-transparent leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none md:text-sm"
        />
        <ComposerPrimitive.Send
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity active:opacity-70 disabled:opacity-30 md:h-8 md:w-8"
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </div>
  )
}

// ─── Scroll to Bottom Button ──────────────────────────────────
const ScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom className="absolute bottom-2 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-text-muted shadow-lg transition-colors hover:bg-card-alt hover:text-text-primary">
      <ArrowDown className="h-4 w-4" />
    </ThreadPrimitive.ScrollToBottom>
  )
}

// ─── Empty State ──────────────────────────────────────────────
const EmptyState: FC = () => (
  <div className="flex flex-1 flex-col items-center justify-center px-6">
    <Upload className="mb-4 h-12 w-12 text-text-muted" />
    <h2 className="mb-2 text-center text-lg font-medium text-text-primary">
      Upload a receipt or invoice to get started
    </h2>
    <p className="text-center text-sm text-text-muted">
      Send a message or drop a document to begin extracting data
    </p>
  </div>
)

// ─── Pipeline Progress (injected as a slot) ───────────────────
interface PipelineStatusProps {
  agents: Record<string, AgentEvent>
  isPipelineRunning: boolean
  isWaiting: boolean
}

const PipelineStatus: FC<PipelineStatusProps> = ({ agents, isPipelineRunning, isWaiting }) => {
  if (isWaiting) {
    return (
      <div className="mb-4 flex justify-start px-4 md:px-6">
        <div className="rounded-2xl bg-card px-4 py-3">
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    )
  }

  if (isPipelineRunning) {
    return (
      <div className="px-4 md:px-6">
        <AgentProgress agents={agents} />
      </div>
    )
  }

  return null
}

// ─── Main Thread Component ────────────────────────────────────
interface SmartifyThreadProps {
  agents: Record<string, AgentEvent>
  isPipelineRunning: boolean
  isWaiting: boolean
  onFileClick: () => void
  isUploading: boolean
}

export const SmartifyThread: FC<SmartifyThreadProps> = ({
  agents,
  isPipelineRunning,
  isWaiting,
  onFileClick,
  isUploading,
}) => {
  return (
    <ThreadPrimitive.Root className="flex flex-1 flex-col bg-background">
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto">
        <ThreadPrimitive.Empty>
          <EmptyState />
        </ThreadPrimitive.Empty>

        <div className="flex-1 px-4 py-4 md:px-6">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
              Message: AssistantMessage,
            }}
          />
        </div>

        <PipelineStatus
          agents={agents}
          isPipelineRunning={isPipelineRunning}
          isWaiting={isWaiting}
        />

        <div className="sticky bottom-0">
          <ScrollToBottom />
        </div>
      </ThreadPrimitive.Viewport>

      <SmartifyComposer onFileClick={onFileClick} isUploading={isUploading} />
    </ThreadPrimitive.Root>
  )
}
