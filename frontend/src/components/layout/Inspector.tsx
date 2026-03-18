'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { ChevronLeft, FileSearch } from 'lucide-react'
import { getRecords } from '@/lib/api'
import { RecordDetail } from '@/components/inspector/RecordDetail'
import { AgentNotes } from '@/components/inspector/AgentNotes'
import { ExportButtons } from '@/components/inspector/ExportButtons'
import { GSTBadge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { clsx } from 'clsx'
import type { ExtractedRecord } from '@/types'

interface InspectorProps {
  conversationId: string | null
}

export function Inspector({ conversationId }: InspectorProps) {
  const [selected, setSelected] = useState<ExtractedRecord | null>(null)

  const { data: records = [] } = useSWR<ExtractedRecord[]>(
    conversationId ? `/api/conversations/${conversationId}/records` : null,
    () => getRecords(conversationId!),
    { refreshInterval: 3000 }
  )

  // Reset selection when conversation changes
  useEffect(() => {
    setSelected(null)
  }, [conversationId])

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="mr-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Back to records"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h2 className="flex-1 text-sm font-semibold text-text-primary">
          {selected ? 'Record Detail' : 'Inspector'}
        </h2>
        {!selected && records.length > 0 && (
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text-muted">
            {records.length}
          </span>
        )}
      </div>

      {/* Detail view */}
      {selected ? (
        <ScrollArea className="flex-1 px-4 py-4">
          <RecordDetail record={selected} />
          <AgentNotes notes={selected.notes} />
          {conversationId && (
            <div className="mt-6">
              <ExportButtons conversationId={conversationId} />
            </div>
          )}
        </ScrollArea>
      ) : !conversationId || records.length === 0 ? (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <FileSearch className="mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            {!conversationId
              ? 'Open a conversation to see extracted records'
              : 'Upload a receipt or invoice to extract records'}
          </p>
        </div>
      ) : (
        /* Records list */
        <>
          <ScrollArea className="flex-1">
            {records.map((record) => (
              <button
                key={record.id}
                onClick={() => setSelected(record)}
                className="group w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-background"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="truncate text-sm text-text-primary">
                    {record.vendor || 'Unknown vendor'}
                  </span>
                  <GSTBadge code={record.gst_code} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{record.date || 'No date'}</span>
                  <span
                    className={clsx(
                      'text-xs font-medium',
                      record.amount != null ? 'text-text-secondary' : 'text-text-muted'
                    )}
                  >
                    {record.amount != null ? `$${record.amount.toFixed(2)}` : '—'}
                  </span>
                </div>
                {record.confidence < 0.85 && (
                  <div className="mt-1 text-[10px] text-amber-500">
                    Low confidence — {(record.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </button>
            ))}
          </ScrollArea>

          {/* Export always visible at bottom when records exist */}
          {conversationId && (
            <div className="border-t border-border px-4 py-4">
              <ExportButtons conversationId={conversationId} />
            </div>
          )}
        </>
      )}
    </aside>
  )
}
