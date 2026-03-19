'use client'

import { useCallback } from 'react'
import { Upload } from 'lucide-react'

interface UploadZoneProps {
  onFiles: (files: File[]) => void
  onDismiss: () => void
}

export function UploadZone({ onFiles, onDismiss }: UploadZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer.files)
      if (files.length) onFiles(files)
      onDismiss()
    },
    [onFiles, onDismiss]
  )

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload className="mb-4 h-12 w-12 text-accent" />
      <p className="text-lg font-medium text-text-primary">Drop files here</p>
      <p className="mt-2 text-sm text-text-muted">PDF, PNG, JPG, TIFF, BMP, WebP, XLSX, XLS, CSV</p>
    </div>
  )
}
