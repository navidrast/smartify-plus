'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { Inspector } from './Inspector'
import { useConversations } from '@/hooks/useConversations'
import type { ExtractedRecord } from '@/types'

interface AppShellProps {
  conversationId: string | null
}

export function AppShell({ conversationId }: AppShellProps) {
  const [selectedRecord, setSelectedRecord] = useState<ExtractedRecord | null>(null)
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
        onRecordSelect={setSelectedRecord}
        onTitleUpdate={handleTitleUpdate}
      />
      <Inspector
        conversationId={conversationId}
        record={selectedRecord}
      />
    </div>
  )
}
