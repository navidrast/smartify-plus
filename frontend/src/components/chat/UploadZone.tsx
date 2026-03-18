'use client'

import { useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useUpload } from '@/hooks/useUpload'

interface UploadZoneProps {
  conversationId: string
  onDone: () => void
}

export function UploadZone({ conversationId, onDone }: UploadZoneProps) {
  const { upload, progress, isUploading } = useUpload(conversationId)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (!file) return
      await upload(file)
      onDone()
    },
    [upload, onDone]
  )

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className="mb-4 h-12 w-12 text-accent" />
      {isUploading ? (
        <>
          <p className="text-lg font-medium text-text-primary">Uploading...</p>
          <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-lg font-medium text-text-primary">
          Drop your file here
        </p>
      )}
      <p className="mt-2 text-sm text-text-muted">PDF, PNG, JPG, TIFF, BMP, WebP</p>
    </div>
  )
}
