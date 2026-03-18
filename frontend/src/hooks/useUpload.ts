'use client'

import { useState, useCallback } from 'react'
import { uploadFile } from '@/lib/api'

export function useUpload(conversationId: string | null) {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File) => {
      if (!conversationId) return null
      setIsUploading(true)
      setError(null)
      setProgress(0)
      try {
        const result = await uploadFile(conversationId, file, setProgress)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [conversationId]
  )

  return { upload, progress, isUploading, error }
}
