'use client'

import { useCallback } from 'react'
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

  return (
    <div className="flex h-screen w-screen">
      <Sidebar
        activeConversationId={conversationId}
        conversations={conversations}
        onConversationsChange={mutateConversations}
      />
      <ChatArea
        conversationId={conversationId}
        onTitleUpdate={handleTitleUpdate}
      />
      <Inspector conversationId={conversationId} />
    </div>
  )
}
