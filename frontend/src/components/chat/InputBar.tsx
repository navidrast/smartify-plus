'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, ArrowUp } from 'lucide-react'
import { useUpload } from '@/hooks/useUpload'

interface InputBarProps {
  conversationId: string
  onSend: (payload: object) => void
  onMessageSent: () => void
}

export function InputBar({ conversationId, onSend, onMessageSent }: InputBarProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { upload, isUploading } = useUpload(conversationId)

  // Auto-grow textarea up to 5 lines
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [text, adjustHeight])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      onSend({ message: trimmed, document_ids: [] })
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onMessageSent()
    } finally {
      setSending(false)
    }
  }, [text, sending, onSend, onMessageSent])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await upload(file)
    if (result?.document_id) {
      onSend({ message: `Analyse this document: ${file.name}`, document_ids: [result.document_id] })
    }
    onMessageSent()
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    /* pb-safe applies env(safe-area-inset-bottom) for iPhone home bar */
    <div className="border-t border-border bg-background px-3 pt-3 pb-safe md:px-6 md:pt-4">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors active:bg-sidebar-active disabled:opacity-40 md:h-9 md:w-9"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
          onChange={handleFileChange}
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Smartify..."
          rows={1}
          style={{ fontSize: '16px' }} /* Prevents iOS auto-zoom on focus */
          className="max-h-[140px] flex-1 resize-none bg-transparent leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none md:text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity active:opacity-70 disabled:opacity-30 md:h-8 md:w-8"
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
