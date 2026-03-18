'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { Inspector } from './Inspector'
import type { ExtractedRecord } from '@/types'

interface AppShellProps {
  conversationId: string | null
}

export function AppShell({ conversationId }: AppShellProps) {
  const [selectedRecord, setSelectedRecord] = useState<ExtractedRecord | null>(null)

  return (
    <div className="flex h-screen w-screen">
      <Sidebar activeConversationId={conversationId} />
      <ChatArea
        conversationId={conversationId}
        onRecordSelect={setSelectedRecord}
      />
      <Inspector
        conversationId={conversationId}
        record={selectedRecord}
      />
    </div>
  )
}
