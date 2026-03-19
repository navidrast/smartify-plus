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
import { TooltipIconButton } from './tooltip-icon-button'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PaperclipIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  UploadIcon,
  FileSpreadsheetIcon,
  MessageSquareIcon,
  SparklesIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { AgentCard } from '@/components/chat/AgentCard'
import { AgentProgress } from '@/components/chat/AgentProgress'
import type { AgentEvent, AgentType } from '@/types'
import type { StagedFile } from '@/components/layout/ChatArea'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THREAD (main container — mirrors assistant-ui thread.tsx)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SmartifyThreadProps {
  agents: Record<string, AgentEvent>
  isPipelineRunning: boolean
  isWaiting: boolean
  onFileClick?: () => void
  isStagingFiles: boolean
  stagedFiles: StagedFile[]
  onRemoveStagedFile: (documentId: string) => void
}

export const SmartifyThread: FC<SmartifyThreadProps> = ({
  agents,
  isPipelineRunning,
  isWaiting,
  onFileClick,
  isStagingFiles,
  stagedFiles,
  onRemoveStagedFile,
}) => (
  <ThreadPrimitive.Root
    data-slot="thread"
    className="aui-root flex h-full flex-1 flex-col bg-background"
    style={{
      ['--thread-max-width' as string]: '44rem',
      ['--composer-radius' as string]: '24px',
      ['--composer-padding' as string]: '10px',
    }}
  >
    <ThreadPrimitive.Viewport
      className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-scroll scroll-smooth px-4 pt-4"
    >
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

      <ThreadPrimitive.ViewportFooter
        className="sticky bottom-0 mx-auto mt-auto flex w-full flex-col gap-4 overflow-visible bg-background pb-4 md:pb-6"
        style={{ maxWidth: 'var(--thread-max-width)' }}
      >
        <ThreadScrollToBottom />
        <Composer
          onFileClick={onFileClick}
          isStagingFiles={isStagingFiles}
          stagedFiles={stagedFiles}
          onRemoveStagedFile={onRemoveStagedFile}
        />
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
  </ThreadPrimitive.Root>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WELCOME (empty thread state)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ThreadWelcome: FC = () => (
  <div className="mx-auto my-auto flex w-full grow flex-col" style={{ maxWidth: 'var(--thread-max-width)' }}>
    <div className="flex w-full grow flex-col items-center justify-center">
      <div className="flex size-full flex-col justify-center px-4">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white shadow-lg shadow-accent/25">
          S+
        </div>
        <h1 className="aui-animate-in text-2xl font-semibold text-text-primary">
          Hello there!
        </h1>
        <p className="aui-animate-in-delayed text-xl text-text-muted">
          How can I help you today?
        </p>
      </div>
    </div>
    <div className="grid w-full grid-cols-1 gap-2 pb-4 sm:grid-cols-2">
      <SuggestionButton icon={<UploadIcon className="h-4 w-4" />} text="Upload a receipt or invoice" />
      <SuggestionButton icon={<FileSpreadsheetIcon className="h-4 w-4" />} text="Import an Excel spreadsheet" />
      <SuggestionButton icon={<MessageSquareIcon className="h-4 w-4" />} text="Ask about GST rules" />
      <SuggestionButton icon={<SparklesIcon className="h-4 w-4" />} text="Help with BAS preparation" />
    </div>
  </div>
)

const SuggestionButton: FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <button className="aui-animate-slide flex h-auto w-full items-center gap-3 rounded-3xl border border-border bg-background px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:bg-muted">
    <span className="text-text-muted">{icon}</span>
    <span>{text}</span>
  </button>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPOSER (input bar — mirrors assistant-ui composer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const StagedFileChip: FC<{ name: string; onRemove: () => void }> = ({ name, onRemove }) => (
  <div className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-text-secondary">
    <PaperclipIcon className="h-3 w-3 shrink-0 text-text-muted" />
    <span className="max-w-[140px] truncate">{name}</span>
    <button
      onClick={onRemove}
      type="button"
      className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary"
      aria-label={`Remove ${name}`}
    >
      <XIcon className="h-3 w-3" />
    </button>
  </div>
)

const Composer: FC<{
  onFileClick?: () => void
  isStagingFiles: boolean
  stagedFiles: StagedFile[]
  onRemoveStagedFile: (documentId: string) => void
}> = ({ onFileClick, isStagingFiles, stagedFiles, onRemoveStagedFile }) => (
  <ComposerPrimitive.Root
    data-slot="composer"
    className="relative flex w-full flex-col"
  >
    <div
      data-slot="composer-shell"
      className="flex w-full flex-col gap-2 rounded-[var(--composer-radius)] border border-border bg-background p-[var(--composer-padding)] transition-shadow focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20"
    >
      {/* Staged file chips */}
      {(stagedFiles.length > 0 || isStagingFiles) && (
        <div className="flex flex-wrap gap-1.5 px-2 pt-1">
          {stagedFiles.map((f) => (
            <StagedFileChip
              key={f.documentId}
              name={f.name}
              onRemove={() => onRemoveStagedFile(f.documentId)}
            />
          ))}
          {isStagingFiles && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Uploading...
            </div>
          )}
        </div>
      )}

      <ComposerPrimitive.Input
        data-slot="composer-input"
        placeholder={stagedFiles.length > 0 ? 'Add a message or just send the files…' : 'Send a message…'}
        className="max-h-32 min-h-10 w-full resize-none bg-transparent px-2 py-1 text-sm text-text-primary outline-none placeholder:text-muted-foreground"
        rows={1}
        autoFocus
        style={{ fontSize: '16px' }}
      />
      <div className="relative flex items-center justify-between">
        {onFileClick && (
          <button
            onClick={onFileClick}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-text-secondary"
            aria-label="Attach file"
          >
            <PaperclipIcon className="h-4 w-4" />
          </button>
        )}

        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            variant="default"
            className="h-8 w-8 rounded-full"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </div>
    </div>
  </ComposerPrimitive.Root>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER MESSAGE (right-aligned with muted bg)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const UserMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="user"
    className="aui-animate-in mx-auto grid w-full auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3"
    style={{ maxWidth: 'var(--thread-max-width)' }}
  >
    <div className="relative col-start-2 min-w-0">
      <div className="break-words rounded-2xl bg-muted px-4 py-2.5 text-sm text-text-primary">
        <MessagePrimitive.Content components={{ Text: UserText }} />
      </div>
    </div>
  </MessagePrimitive.Root>
)

const UserText: FC<{ text: string }> = ({ text }) => (
  <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ASSISTANT MESSAGE (full-width markdown + action bar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AssistantMessage: FC = () => {
  const message = useMessage()
  const custom = message.metadata?.custom as {
    originalRole?: string
    agentType?: AgentType | null
    agentMetadata?: Record<string, unknown> | null
  } | undefined
  const isRunning = message.status?.type === 'running'

  // Agent messages → AgentCard
  if (custom?.originalRole === 'agent' && custom?.agentType) {
    const textContent = message.content.find((p) => p.type === 'text')
    return (
      <MessagePrimitive.Root
        data-role="assistant"
        className="aui-animate-in relative mx-auto w-full py-3"
        style={{ maxWidth: 'var(--thread-max-width)' }}
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

  // Regular assistant message
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      className="aui-animate-in relative mx-auto w-full py-3"
      style={{ maxWidth: 'var(--thread-max-width)' }}
    >
      <div
        data-status={isRunning ? 'running' : 'complete'}
        className="aui-md break-words px-2 text-sm leading-relaxed text-text-primary"
      >
        <MessagePrimitive.Content components={{ Text: AssistantMarkdown }} />
      </div>

      <div className="aui-action-bar mt-1 ml-2 flex min-h-6 items-center gap-1">
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARKDOWN (rich text rendering for assistant)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AssistantMarkdown: FC = () => (
  <MarkdownTextPrimitive
    className={cn(
      '[&>p]:my-2 [&>p]:leading-7',
      '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-accent/80',
      '[&_strong]:font-semibold [&_strong]:text-text-primary',
      '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.875em] [&_code]:text-accent [&_code]:before:content-none [&_code]:after:content-none',
      '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-card [&_pre]:p-4',
      '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-text-primary',
      '[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight',
      '[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight',
      '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
      '[&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-semibold',
      '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-8',
      '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-8',
      '[&_li]:my-1 [&_li]:leading-7',
      '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-secondary',
      '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
      '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
      '[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2',
      '[&_hr]:my-6 [&_hr]:border-border',
    )}
  />
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION BAR (Copy + Reload with tooltips)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AssistantActionBar: FC = () => (
  <ActionBarPrimitive.Root
    hideWhenRunning
    autohide="not-last"
    className="flex gap-1 text-muted-foreground"
  >
    <ActionBarPrimitive.Copy asChild>
      <CopyButton />
    </ActionBarPrimitive.Copy>
  </ActionBarPrimitive.Root>
)

const CopyButton: FC<{ onClick?: () => void }> = (props) => {
  const [copied, setCopied] = useState(false)
  const handleClick = useCallback(() => {
    props.onClick?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [props])

  return (
    <TooltipIconButton
      {...props}
      tooltip={copied ? 'Copied!' : 'Copy'}
      onClick={handleClick}
    >
      {copied
        ? <CheckIcon className="h-3.5 w-3.5 text-gst-10" />
        : <CopyIcon className="h-3.5 w-3.5" />
      }
    </TooltipIconButton>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCROLL TO BOTTOM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ThreadScrollToBottom: FC = () => (
  <ThreadPrimitive.ScrollToBottom asChild>
    <TooltipIconButton
      tooltip="Scroll to bottom"
      variant="outline"
      className="absolute -top-12 z-10 h-10 w-10 self-center rounded-full p-2 shadow-md disabled:invisible"
    >
      <ArrowDownIcon className="h-4 w-4" />
    </TooltipIconButton>
  </ThreadPrimitive.ScrollToBottom>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PIPELINE STATUS (domain-specific: waiting dots + agent progress)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PipelineStatus: FC<{
  agents: Record<string, AgentEvent>
  isPipelineRunning: boolean
  isWaiting: boolean
}> = ({ agents, isPipelineRunning, isWaiting }) => {
  if (isWaiting) {
    return (
      <div className="aui-animate-in mx-auto w-full px-2 py-3" style={{ maxWidth: 'var(--thread-max-width)' }}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
      <div className="mx-auto w-full px-2" style={{ maxWidth: 'var(--thread-max-width)' }}>
        <AgentProgress agents={agents} />
      </div>
    )
  }
  return null
}
