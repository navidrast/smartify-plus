'use client'

import { useState, useRef, useCallback } from 'react'
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
  const { upload, isUploading } = useUpload(conversationId)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      onSend({ message: trimmed, document_ids: [] })
      setText('')
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
    await upload(file)
    onMessageSent()
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      <div className="flex items-end gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50"
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or drop a file..."
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-opacity disabled:opacity-40"
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
