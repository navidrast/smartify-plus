'use client'

import { Search } from 'lucide-react'
import { RecordDetail } from '@/components/inspector/RecordDetail'
import { AgentNotes } from '@/components/inspector/AgentNotes'
import { ExportButtons } from '@/components/inspector/ExportButtons'
import { ScrollArea } from '@/components/ui/ScrollArea'
import type { ExtractedRecord } from '@/types'

interface InspectorProps {
  conversationId: string | null
  record: ExtractedRecord | null
}

export function Inspector({ conversationId, record }: InspectorProps) {
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Inspector</h2>
      </div>

      {!record ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <Search className="mb-3 h-8 w-8 text-text-muted" />
          <p className="text-center text-sm text-text-muted">
            Select a record to inspect
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4 py-4">
          <RecordDetail record={record} />
          <AgentNotes notes={record.notes} />
          {conversationId && <ExportButtons conversationId={conversationId} />}
        </ScrollArea>
      )}
    </aside>
  )
}
