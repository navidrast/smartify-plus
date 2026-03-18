'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { ChevronLeft, FileSearch, X } from 'lucide-react'
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
  onClose?: () => void
}

export function Inspector({ conversationId, onClose }: InspectorProps) {
  const [selected, setSelected] = useState<ExtractedRecord | null>(null)

  const { data: records = [] } = useSWR<ExtractedRecord[]>(
    conversationId ? `/api/conversations/${conversationId}/records` : null,
    () => getRecords(conversationId!),
    { refreshInterval: 3000 }
  )

  useEffect(() => {
    setSelected(null)
  }, [conversationId])

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex min-h-[56px] items-center gap-1 border-b border-border px-2">
        {/* Close or back — 44×44 */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
            aria-label="Close inspector"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-muted active:bg-sidebar-active active:text-text-primary"
            aria-label="Back to records"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="flex-1 px-1 text-sm font-semibold text-text-primary">
          {selected ? 'Record Detail' : 'Inspector'}
        </h2>
        {!selected && records.length > 0 && (
          <span className="mr-2 rounded-full bg-background px-2 py-0.5 text-xs text-text-muted">
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
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <FileSearch className="mb-3 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            {!conversationId
              ? 'Open a conversation to see extracted records'
              : 'Upload a receipt or invoice to extract records'}
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            {records.map((record) => (
              /* Each record row is a large touch target — min 56px tall */
              <button
                key={record.id}
                onClick={() => setSelected(record)}
                className="w-full border-b border-border px-4 py-4 text-left active:bg-sidebar-active"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
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
