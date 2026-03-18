'use client'

import { useState, useEffect } from 'react'
import { X, Monitor, Sun, Moon } from 'lucide-react'
import { type Theme, getSavedTheme, saveTheme } from '@/lib/theme'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    setTheme(getSavedTheme())
  }, [])

  const handleTheme = (t: Theme) => {
    setTheme(t)
    saveTheme(t)
  }

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'auto', label: 'Auto', icon: <Monitor className="h-4 w-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-80 rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Appearance</div>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTheme(opt.value)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs transition-colors ${
                theme === opt.value
                  ? 'border-accent bg-card-alt text-accent'
                  : 'border-border text-text-muted hover:border-accent/50 hover:text-text-secondary'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4 text-center text-[10px] text-text-muted">
          Smartify Plus · Phase One
        </div>
      </div>
    </div>
  )
}
