'use client'

import { useCallback, useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { Inspector } from './Inspector'
import { useConversations } from '@/hooks/useConversations'

interface AppShellProps {
  conversationId: string | null
}

export function AppShell({ conversationId }: AppShellProps) {
  const { conversations, mutate: mutateConversations } = useConversations()
  const handleTitleUpdate = useCallback(() => mutateConversations(), [mutateConversations])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // Close drawers on route change
  useEffect(() => {
    setSidebarOpen(false)
    setInspectorOpen(false)
  }, [conversationId])

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (sidebarOpen || inspectorOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen, inspectorOpen])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setInspectorOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex">
        <Sidebar
          activeConversationId={conversationId}
          conversations={conversations}
          onConversationsChange={mutateConversations}
        />
      </div>

      {/* ── Mobile sidebar drawer — always in DOM, slides in/out ── */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          sidebarOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Drawer slides in from left */}
        <div
          className={`absolute left-0 top-0 h-full w-[280px] shadow-2xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            activeConversationId={conversationId}
            conversations={conversations}
            onConversationsChange={mutateConversations}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* ── Chat (always visible, full width on mobile) ── */}
      <ChatArea
        conversationId={conversationId}
        onTitleUpdate={handleTitleUpdate}
        onMenuOpen={() => setSidebarOpen(true)}
        onInspectorOpen={() => setInspectorOpen(true)}
        conversations={conversations}
        onConversationsChange={mutateConversations}
      />

      {/* ── Desktop inspector (hidden on mobile) ── */}
      <div className="hidden md:flex">
        <Inspector conversationId={conversationId} />
      </div>

      {/* ── Mobile inspector drawer — always in DOM, slides in from right ── */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          inspectorOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            inspectorOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setInspectorOpen(false)}
        />
        {/* Drawer slides in from right */}
        <div
          className={`absolute right-0 top-0 h-full w-[min(320px,100vw)] shadow-2xl transition-transform duration-300 ${
            inspectorOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <Inspector
            conversationId={conversationId}
            onClose={() => setInspectorOpen(false)}
          />
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="fixed bottom-0 w-full z-40 flex md:hidden justify-around items-center px-6 py-3 bg-[#0E0E0E]/80 backdrop-blur-xl border-t border-[#574335]/15">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-primary-container transition-colors"
        >
          <span className="material-symbols-outlined">chat_bubble</span>
          <span className="font-mono text-[10px] mt-1">CHAT</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-primary-container transition-colors">
          <span className="material-symbols-outlined">history</span>
          <span className="font-mono text-[10px] mt-1">HISTORY</span>
        </button>
        <button
          onClick={() => setInspectorOpen(true)}
          className="flex flex-col items-center justify-center bg-primary-container text-on-primary rounded-xl p-2 scale-110 shadow-lg"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
          <span className="font-mono text-[10px] mt-1">AGENTS</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-primary-container transition-colors">
          <span className="material-symbols-outlined">person</span>
          <span className="font-mono text-[10px] mt-1">USER</span>
        </button>
      </nav>
    </div>
  )
}
