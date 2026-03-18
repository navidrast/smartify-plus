'use client'

import { MessageSquare } from 'lucide-react'

interface AgentNotesProps {
  notes: string
}

export function AgentNotes({ notes }: AgentNotesProps) {
  if (!notes) return null

  const items = notes.split(';').map((n) => n.trim()).filter(Boolean)

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Agent Notes
      </h3>
      <div className="space-y-2">
        {items.map((note, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg bg-background p-3">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <p className="text-sm text-text-secondary">{note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
