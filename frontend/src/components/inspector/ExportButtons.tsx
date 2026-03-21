'use client'

import { getExportUrl } from '@/lib/api'

interface ExportButtonsProps {
  conversationId: string
}

export function ExportButtons({ conversationId }: ExportButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <button
        onClick={() => window.open(getExportUrl(conversationId, 'excel'), '_blank')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#574335]/30 py-3 text-sm font-bold text-on-surface hover:bg-white/5 transition-colors"
      >
        <span className="material-symbols-outlined text-lg">grid_on</span>
        Export Excel
      </button>
      <button
        onClick={() => window.open(getExportUrl(conversationId, 'pdf'), '_blank')}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3 text-sm font-bold text-on-primary shadow-lg hover:shadow-primary-container/20 transition-all"
      >
        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
        Export PDF
      </button>
    </div>
  )
}
