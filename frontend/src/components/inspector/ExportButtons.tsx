'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getExportUrl } from '@/lib/api'

interface ExportButtonsProps {
  conversationId: string
}

export function ExportButtons({ conversationId }: ExportButtonsProps) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Export
      </h3>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => window.open(getExportUrl(conversationId, 'excel'), '_blank')}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => window.open(getExportUrl(conversationId, 'pdf'), '_blank')}
        >
          <FileText className="h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  )
}
