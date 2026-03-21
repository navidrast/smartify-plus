'use client'

import { getExportUrl } from '@/lib/api'

interface ExportButtonsProps {
  conversationId: string
}

export function ExportButtons({ conversationId }: ExportButtonsProps) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Export
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => window.open(getExportUrl(conversationId, 'excel'), '_blank')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#574335]/20 bg-surface-container-high px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">grid_on</span>
          Excel
        </button>
        <button
          onClick={() => window.open(getExportUrl(conversationId, 'pdf'), '_blank')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-bold text-on-primary hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          PDF
        </button>
      </div>
    </div>
  )
}
