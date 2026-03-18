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

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
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
        {/* Logo + optional close button */}
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S+
          </span>
          <span className="flex-1 text-base font-semibold text-text-primary">Smartify</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className="px-3 pb-3">
          <Button onClick={handleNewChat} className="w-full gap-2" size="md">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1 px-2">
          {conversations
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  router.push(`/chat/${conv.id}`)
                  onClose?.()
                }}
                className={clsx(
                  'group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                  conv.id === activeConversationId
                    ? 'border-l-2 border-accent bg-sidebar-active'
                    : 'hover:bg-sidebar-active'
                )}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{conv.title}</p>
                  <p className="text-xs text-text-muted">{formatTime(conv.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-opacity"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
        </ScrollArea>

        {/* User */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card-alt text-sm font-medium text-text-secondary">
            D
          </div>
          <span className="flex-1 text-sm text-text-secondary">Demo User</span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-text-muted hover:text-text-secondary p-1"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  )
}
