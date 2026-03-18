'use client'

import { GSTBadge } from '@/components/ui/Badge'
import { clsx } from 'clsx'
import type { ExtractedRecord } from '@/types'

interface RecordDetailProps {
  record: ExtractedRecord
}

export function RecordDetail({ record }: RecordDetailProps) {
  const confidenceColor =
    record.confidence >= 0.85
      ? 'bg-gst-10'
      : record.confidence >= 0.7
        ? 'bg-gst-unknown'
        : 'bg-gst-error'

  const fields = [
    { label: 'Date', value: record.date ?? 'N/A' },
    { label: 'Amount', value: record.amount != null ? `$${record.amount.toFixed(2)}` : 'N/A' },
    { label: 'Vendor', value: record.vendor ?? 'N/A' },
    { label: 'Description', value: record.description ?? 'N/A' },
    { label: 'Source Page', value: record.source_page || 'N/A' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Record Details
      </h3>

      <div className="space-y-3">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
          </div>
        ))}
      </div>

      {/* GST */}
      <div>
        <dt className="mb-1 text-xs text-text-muted">GST Code</dt>
        <GSTBadge code={record.gst_code} />
      </div>

      {/* Confidence */}
      <div>
        <dt className="mb-1 text-xs text-text-muted">
          Confidence: {(record.confidence * 100).toFixed(0)}%
        </dt>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className={clsx('h-full rounded-full transition-all', confidenceColor)}
            style={{ width: `${record.confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
