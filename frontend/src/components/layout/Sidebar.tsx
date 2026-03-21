'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, X } from 'lucide-react'
import { createConversation, deleteConversation } from '@/lib/api'
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

      <aside
        className="flex h-full w-[260px] shrink-0 flex-col bg-[#131313]"
        style={{ boxShadow: '1px 0 0 0 rgba(87,67,53,0.15)' }}
      >
        {/* Logo + close button */}
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary text-xl font-black shadow-lg font-headline">
              S+
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-[#FF8400] font-headline leading-none">S+</span>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Smartify Plus</span>
            </div>
          </div>
          {onClose && (
            /* 44×44 touch target */
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant active:bg-surface-container-high active:text-on-surface"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className="px-3 pb-3">
          <button
            onClick={handleNewChat}
            className="h-12 w-full rounded-xl bg-primary-container text-on-primary font-headline font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Chat
          </button>
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
                    ? 'bg-[#20201F] text-[#FF8400] font-semibold border-l-2 border-[#FF8400]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-[#20201F]'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{conv.title}</p>
                  <p className="text-xs text-on-surface-variant">{formatTime(conv.updated_at)}</p>
                </div>
                {/* 44×44 delete button — proper element, not nested button */}
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  onTouchEnd={(e) => handleDelete(e, conv.id)}
                  className="flex h-11 w-11 shrink-0 touch-show items-center justify-center rounded-xl text-on-surface-variant opacity-0 group-hover:opacity-100 active:text-red-400"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
        </ScrollArea>

        {/* User / Settings */}
        <div className="flex items-center gap-3 border-t border-[#574335]/10 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface text-sm font-medium">
            D
          </div>
          <span className="flex-1 text-sm text-on-surface-variant">Demo User</span>
          {/* 44×44 settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface active:bg-surface-container-high"
            aria-label="Open settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </aside>
    </>
  )
}
