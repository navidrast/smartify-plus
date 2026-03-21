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
  CopyIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { AgentCard } from '@/components/chat/AgentCard'
import { AgentProgress } from '@/components/chat/AgentProgress'
import { ModePicker, useChatModes } from '@/components/chat/ModePicker'
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
  onSuggestionClick?: (text: string) => void
}

export const SmartifyThread: FC<SmartifyThreadProps> = ({
  agents,
  isPipelineRunning,
  isWaiting,
  onFileClick,
  isStagingFiles,
  stagedFiles,
  onRemoveStagedFile,
  onSuggestionClick,
}) => {
  const { modes, toggle } = useChatModes()
  return (
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
          <ThreadWelcome onSuggestionClick={onSuggestionClick} />
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
          className="sticky bottom-0 mx-auto mt-auto flex w-full flex-col gap-4 overflow-visible bg-background pb-16 md:pb-6"
          style={{ maxWidth: 'var(--thread-max-width)' }}
        >
          <ThreadScrollToBottom />
          <Composer
            onFileClick={onFileClick}
            isStagingFiles={isStagingFiles}
            stagedFiles={stagedFiles}
            onRemoveStagedFile={onRemoveStagedFile}
            modes={modes}
            onModeToggle={toggle}
            onQuickAction={onSuggestionClick}
          />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WELCOME (empty thread state)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SUGGESTIONS = [
  { icon: 'upload_file', text: 'Upload receipt', sub: 'Process OCR & Categorize', message: 'I want to upload a receipt for extraction.' },
  { icon: 'table_chart', text: 'Import Excel', sub: 'Sync historical ledger', message: 'How do I import an Excel ledger?' },
  { icon: 'gavel', text: 'Ask GST rules', sub: 'AI Regulatory Lookup', message: 'Explain the Australian GST rules for common expense categories.' },
  { icon: 'account_balance_wallet', text: 'BAS preparation', sub: 'Draft quarterly statement', message: 'Help me prepare my quarterly BAS statement.' },
]

const ThreadWelcome: FC<{ onSuggestionClick?: (text: string) => void }> = ({ onSuggestionClick }) => (
  <div className="mx-auto my-auto flex w-full grow flex-col items-center justify-center px-4" style={{ maxWidth: 'var(--thread-max-width)' }}>
    <div className="w-full text-center space-y-8">
      <div className="flex flex-col items-center">
        <div
          className="mb-8 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary-container text-on-primary text-4xl font-black transition-transform hover:scale-105 duration-300"
          style={{ boxShadow: '0 0 40px -5px rgba(255,132,0,0.3)' }}
        >
          S+
        </div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-3">
          Hello there!
        </h1>
        <p className="text-on-surface-variant text-base font-medium max-w-md mx-auto">
          Your intelligent financial ledger is ready. How can I assist your accounting workflow today?
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
        {SUGGESTIONS.map((s) => (
          <SuggestionButton
            key={s.text}
            icon={s.icon}
            text={s.text}
            sub={s.sub}
            onClick={() => onSuggestionClick?.(s.message)}
          />
        ))}
      </div>
    </div>
  </div>
)

const SuggestionButton: FC<{ icon: string; text: string; sub: string; onClick?: () => void }> = ({ icon, text, sub, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-4 p-4 bg-surface-container border border-[#574335]/10 rounded-xl hover:bg-surface-container-high hover:border-primary-container/30 transition-all duration-200 text-left w-full"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-[#FFB784] group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-on-surface font-semibold text-sm">{text}</span>
      <span className="text-xs text-on-surface-variant font-mono truncate">{sub}</span>
    </div>
  </button>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPOSER (input bar — mirrors assistant-ui composer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const StagedFileChip: FC<{ name: string; onRemove: () => void }> = ({ name, onRemove }) => (
  <div className="flex items-center gap-1 rounded-lg border border-[#574335]/10 bg-surface-container-high px-2 py-1 text-xs text-on-surface">
    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">attach_file</span>
    <span className="max-w-[140px] truncate">{name}</span>
    <button
      onClick={onRemove}
      type="button"
      className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-on-surface-variant hover:text-on-surface"
      aria-label={`Remove ${name}`}
    >
      <span className="material-symbols-outlined text-[12px]">close</span>
    </button>
  </div>
)

const QUICK_ACTIONS = ['Generate PDF', 'Export to CSV', 'GST Summary']

const Composer: FC<{
  onFileClick?: () => void
  isStagingFiles: boolean
  stagedFiles: StagedFile[]
  onRemoveStagedFile: (documentId: string) => void
  modes: ReturnType<typeof useChatModes>['modes']
  onModeToggle: ReturnType<typeof useChatModes>['toggle']
  onQuickAction?: (text: string) => void
}> = ({ onFileClick, isStagingFiles, stagedFiles, onRemoveStagedFile, modes, onModeToggle, onQuickAction }) => (
  <>
    <ComposerPrimitive.Root
      data-slot="composer"
      className="relative flex w-full flex-col"
    >
      <div
        data-slot="composer-shell"
        className="flex w-full flex-col gap-2 rounded-[var(--composer-radius)] border border-primary-container/15 p-[var(--composer-padding)] transition-all focus-within:ring-2 focus-within:ring-primary-container/20"
        style={{ background: 'rgba(53,53,53,0.8)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}
      >
        {/* Quick action chips — only show when no staged files and not staging */}
        {stagedFiles.length === 0 && !isStagingFiles && (
          <div className="flex gap-2 overflow-x-auto px-1 pt-1 pb-0.5 no-scrollbar md:hidden">
            {QUICK_ACTIONS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onQuickAction?.(chip)}
                className="flex-none rounded-full border border-[#574335]/10 bg-surface-container-high/60 px-4 py-1.5 text-[11px] font-bold text-on-surface-variant backdrop-blur-md whitespace-nowrap active:bg-primary-container active:text-on-primary transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

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
              <div className="flex items-center gap-1.5 rounded-lg border border-[#574335]/10 bg-surface-container-high px-2 py-1 text-xs text-on-surface-variant">
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
        <div className="relative flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {onFileClick && (
              <button
                onClick={onFileClick}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-text-secondary"
                aria-label="Attach file"
              >
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
              </button>
            )}
            <ModePicker modes={modes} onToggle={onModeToggle} />
          </div>

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
    <p className="mt-2 text-center font-mono text-[10px] text-on-surface-variant/40 hidden md:block">
      AI can make mistakes. Check important financial info.
    </p>
  </>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER MESSAGE (right-aligned with muted bg)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const UserMessage: FC = () => {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  return (
    <MessagePrimitive.Root
      data-role="user"
      className="aui-animate-in mx-auto grid w-full auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3"
      style={{ maxWidth: 'var(--thread-max-width)' }}
    >
      <div className="relative col-start-2 min-w-0 flex flex-col items-end gap-1">
        <div className="break-words rounded-2xl rounded-tr-none bg-surface-container px-5 py-3.5 text-sm text-on-surface shadow-sm font-body">
          <MessagePrimitive.Content components={{ Text: UserText }} />
        </div>
        <span className="font-mono text-[10px] text-on-surface-variant px-1">{timeStr}</span>
      </div>
    </MessagePrimitive.Root>
  )
}

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
        className="aui-md break-words px-2 text-sm leading-relaxed text-text-primary font-body"
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
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-full border border-[#574335]/10 bg-surface-container-high/40 px-4 py-1.5 backdrop-blur-md">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary [animation-delay:75ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary [animation-delay:150ms]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-tertiary">Waiting for AI...</span>
          </div>
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
