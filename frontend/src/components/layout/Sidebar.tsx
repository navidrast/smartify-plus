'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Settings, FileText, Trash2, X } from 'lucide-react'
import { createConversation, deleteConversation } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { SettingsModal } from '@/components/SettingsModal'
import type { Conversation } from '@/types'
import { clsx } from 'clsx'

interface SidebarProps {
  activeConversationId: string | null
  conversations: Conversation[]
  onConversationsChange: () => void
  onClose?: () => void
}

export function Sidebar({ activeConversationId, conversations, onConversationsChange, onClose }: SidebarProps) {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)

  const handleNewChat = async () => {
    const conv = await createConversation()
    onConversationsChange()
    router.push(`/chat/${conv.id}`)
    onClose?.()
  }

  const handleDelete = async (e: React.MouseEvent | React.TouchEvent, convId: string) => {
    e.stopPropagation()
    e.preventDefault()
    await deleteConversation(convId)
    onConversationsChange()
    if (convId === activeConversationId) router.push('/chat')
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo + close button */}
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S+
          </span>
          <span className="flex-1 text-base font-semibold text-text-primary">Smartify</span>
          {onClose && (
            /* 44×44 touch target */
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className="px-3 pb-3">
          <Button onClick={handleNewChat} className="h-12 w-full gap-2 text-sm" size="md">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations — div+role replaces nested button-in-button (invalid HTML) */}
        <ScrollArea className="flex-1 px-2">
          {conversations
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  router.push(`/chat/${conv.id}`)
                  onClose?.()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/chat/${conv.id}`)
                    onClose?.()
                  }
                }}
                className={clsx(
                  'group flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-3.5 text-left transition-colors',
                  conv.id === activeConversationId
                    ? 'border-l-2 border-accent bg-sidebar-active'
                    : 'active:bg-sidebar-active'
                )}
              >
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{conv.title}</p>
                  <p className="text-xs text-text-muted">{formatTime(conv.updated_at)}</p>
                </div>
                {/* 44×44 delete button — proper element, not nested button */}
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  onTouchEnd={(e) => handleDelete(e, conv.id)}
                  className="flex h-11 w-11 shrink-0 touch-show items-center justify-center rounded-xl text-text-muted opacity-0 group-hover:opacity-100 active:text-red-400"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
        </ScrollArea>

        {/* User / Settings */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-alt text-sm font-medium text-text-secondary">
            D
          </div>
          <span className="flex-1 text-sm text-text-secondary">Demo User</span>
          {/* 44×44 settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  )
}
