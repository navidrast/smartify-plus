'use client'

import { type FC, useState, useCallback } from 'react'
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  useMessage,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PaperclipIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  UploadIcon,
  FileSpreadsheetIcon,
  MessageSquareIcon,
} from 'lucide-react'
import { AgentCard } from '@/components/chat/AgentCard'
import { AgentProgress } from '@/components/chat/AgentProgress'
import type { AgentEvent, AgentType } from '@/types'

// ─── Thread (main container) ──────────────────────────────────
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
    <ThreadPrimitive.Root
      className="aui-root flex h-full flex-1 flex-col bg-background"
      style={{
        ['--thread-max-width' as string]: '44rem',
        ['--composer-radius' as string]: '24px',
      }}
    >
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-scroll scroll-smooth px-4 pt-4">
        <ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
            Message: AssistantMessage,
          }}
        />

        <PipelineStatus
          agents={agents}
          isPipelineRunning={isPipelineRunning}
          isWaiting={isWaiting}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-[var(--composer-radius)] bg-background pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <Composer onFileClick={onFileClick} isUploading={isUploading} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

// ─── Welcome Screen ───────────────────────────────────────────
const ThreadWelcome: FC = () => (
  <div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] grow flex-col">
    <div className="flex w-full grow flex-col items-center justify-center">
      <div className="flex size-full flex-col justify-center px-4">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white shadow-lg shadow-accent/25">
          S+
        </div>
        <h1 className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both text-2xl font-semibold text-text-primary duration-200">
          Hello there!
        </h1>
        <p className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both text-xl text-text-muted delay-75 duration-200">
          How can I help you today?
        </p>
      </div>
    </div>
    <div className="grid w-full grid-cols-1 gap-2 pb-4 sm:grid-cols-2">
      <SuggestionButton text="Upload a receipt or invoice" icon={<UploadIcon className="h-4 w-4" />} />
      <SuggestionButton text="Import an Excel spreadsheet" icon={<FileSpreadsheetIcon className="h-4 w-4" />} />
      <SuggestionButton text="Ask about GST rules" icon={<MessageSquareIcon className="h-4 w-4" />} />
      <SuggestionButton text="Help with BAS preparation" icon={<SparklesIcon className="h-4 w-4" />} />
    </div>
  </div>
)

const SuggestionButton: FC<{ text: string; icon: React.ReactNode }> = ({ text, icon }) => (
  <button className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex h-auto w-full items-center gap-3 rounded-3xl border border-border bg-background px-4 py-3 text-left text-sm text-text-secondary transition-colors duration-200 hover:bg-card-alt">
    <span className="text-text-muted">{icon}</span>
    <span>{text}</span>
  </button>
)

// ─── Composer ─────────────────────────────────────────────────
interface ComposerProps {
  onFileClick: () => void
  isUploading: boolean
}

const Composer: FC<ComposerProps> = ({ onFileClick, isUploading }) => (
  <ComposerPrimitive.Root className="relative flex w-full flex-col">
    <div className="flex w-full flex-col gap-2 rounded-[var(--composer-radius)] border border-border bg-background p-2.5 transition-shadow focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20">
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className="max-h-32 min-h-10 w-full resize-none bg-transparent px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
        rows={1}
        autoFocus
        style={{ fontSize: '16px' }}
      />
      <div className="relative flex items-center justify-between">
        <button
          onClick={onFileClick}
          disabled={isUploading}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-card-alt hover:text-text-secondary disabled:opacity-40"
          aria-label="Attach file"
        >
          <PaperclipIcon className="h-4 w-4" />
        </button>
        <ComposerPrimitive.Send
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent/90 disabled:opacity-30 disabled:hover:bg-accent"
          aria-label="Send message"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </ComposerPrimitive.Send>
      </div>
    </div>
  </ComposerPrimitive.Root>
)

// ─── User Message ─────────────────────────────────────────────
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="animate-in fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150"
      data-role="user"
    >
      <div className="relative col-start-2 min-w-0">
        <div className="rounded-2xl bg-card-alt px-4 py-2.5 text-sm text-text-primary break-words">
          <MessagePrimitive.Content components={{ Text: UserTextContent }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

const UserTextContent: FC<{ text: string }> = ({ text }) => (
  <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
)

// ─── Assistant Message ────────────────────────────────────────
const AssistantMessage: FC = () => {
  const message = useMessage()
  const custom = message.metadata?.custom as {
    originalRole?: string
    agentType?: AgentType | null
    agentMetadata?: Record<string, unknown> | null
  } | undefined

  const isRunning = message.status?.type === 'running'

  // Agent messages render as AgentCard
  if (custom?.originalRole === 'agent' && custom?.agentType) {
    const textContent = message.content.find((p) => p.type === 'text')
    return (
      <MessagePrimitive.Root
        className="animate-in fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-[var(--thread-max-width)] py-3 duration-150"
        data-role="assistant"
      >
        <div className="px-2">
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
    <MessagePrimitive.Root
      className="animate-in fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-[var(--thread-max-width)] py-3 duration-150"
      data-role="assistant"
    >
      <div className="break-words px-2 text-sm leading-relaxed text-text-primary">
        <MessagePrimitive.Content components={{ Text: AssistantTextContent }} />
        {isRunning && <StreamingCursor />}
      </div>

      <div className="mt-1 ml-2 flex min-h-6 items-center">
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  )
}

const AssistantTextContent: FC = () => (
  <MarkdownTextPrimitive
    className="[&>p]:my-1.5 [&>p]:leading-relaxed [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline [&_strong]:text-text-primary [&_code]:text-accent [&_code]:text-[0.9em] [&_code]:before:content-none [&_code]:after:content-none [&_pre]:my-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_pre]:text-xs [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_table]:my-3 [&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-card [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_hr]:my-4 [&_hr]:border-border"
  />
)

// ─── Streaming Cursor ─────────────────────────────────────────
const StreamingCursor: FC = () => (
  <span className="ml-1 inline-block h-4 w-[3px] animate-pulse rounded-sm bg-accent" />
)

// ─── Action Bar (Copy) ────────────────────────────────────────
const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="-ml-1 flex gap-1 text-text-muted"
    >
      <ActionBarPrimitive.Copy asChild>
        <CopyActionButton />
      </ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
  )
}

const CopyActionButton: FC<{ onClick?: () => void }> = (props) => {
  const [copied, setCopied] = useState(false)
  const handleClick = useCallback(() => {
    props.onClick?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [props])

  return (
    <button
      {...props}
      onClick={handleClick}
      className="flex h-6 w-6 items-center justify-center rounded-md p-1 text-text-muted transition-colors hover:bg-card-alt hover:text-text-secondary"
      aria-label="Copy message"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-gst-10" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Scroll to Bottom ─────────────────────────────────────────
const ThreadScrollToBottom: FC = () => (
  <ThreadPrimitive.ScrollToBottom className="absolute -top-12 z-10 flex h-10 w-10 items-center justify-center self-center rounded-full border border-border bg-background text-text-muted shadow-md transition-colors hover:bg-card-alt hover:text-text-primary disabled:invisible">
    <ArrowDownIcon className="h-4 w-4" />
  </ThreadPrimitive.ScrollToBottom>
)

// ─── Pipeline Progress ────────────────────────────────────────
interface PipelineStatusProps {
  agents: Record<string, AgentEvent>
  isPipelineRunning: boolean
  isWaiting: boolean
}

const PipelineStatus: FC<PipelineStatusProps> = ({ agents, isPipelineRunning, isWaiting }) => {
  if (isWaiting) {
    return (
      <div className="animate-in fade-in mx-auto w-full max-w-[var(--thread-max-width)] px-2 py-3 duration-200">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent/70 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-accent/40 [animation-delay:300ms]" />
          </span>
          <span className="text-xs">Thinking...</span>
        </div>
      </div>
    )
  }

  if (isPipelineRunning) {
    return (
      <div className="mx-auto w-full max-w-[var(--thread-max-width)] px-2">
        <AgentProgress agents={agents} />
      </div>
    )
  }

  return null
}
