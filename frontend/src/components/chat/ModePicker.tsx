'use client'

import { useState, useEffect, useRef, type FC } from 'react'
import { Brain, Lightbulb, Zap, ChevronUp } from 'lucide-react'

export interface ChatModes {
  memory: boolean
  thinking: boolean
  fast: boolean
}

const STORAGE_KEY = 'smartify_chat_modes'

const defaultModes: ChatModes = { memory: true, thinking: false, fast: false }

export function useChatModes() {
  const [modes, setModes] = useState<ChatModes>(() => {
    if (typeof window === 'undefined') return defaultModes
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...defaultModes, ...JSON.parse(raw) } : defaultModes
    } catch {
      return defaultModes
    }
  })

  const toggle = (key: keyof ChatModes) => {
    setModes((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      // Fast and Thinking are mutually exclusive
      if (key === 'fast' && next.fast) next.thinking = false
      if (key === 'thinking' && next.thinking) next.fast = false
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { modes, toggle }
}

interface ModePickerProps {
  modes: ChatModes
  onToggle: (key: keyof ChatModes) => void
}

const MODES = [
  {
    key: 'memory' as const,
    icon: Brain,
    label: 'Memory',
    description: 'Remembers context across conversations — references previous documents and past GST decisions',
  },
  {
    key: 'thinking' as const,
    icon: Lightbulb,
    label: 'Extended Thinking',
    description: 'Shows reasoning chain before answering. Slower but more accurate for complex GST and compliance questions',
  },
  {
    key: 'fast' as const,
    icon: Zap,
    label: 'Fast Mode',
    description: 'Skips deep agent pipeline for quick answers. Best for simple lookups, not document extraction',
  },
]

export const ModePicker: FC<ModePickerProps> = ({ modes, onToggle }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const activeCount = Object.values(modes).filter(Boolean).length

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors"
        style={{
          color: open ? '#FF8400' : '#DEC1AF',
          background: open ? 'rgba(255,132,0,0.1)' : 'transparent',
        }}
        aria-label="Chat modes"
        aria-expanded={open}
      >
        <Zap className="h-3.5 w-3.5" style={{ color: activeCount > 1 || modes.fast ? '#FF8400' : 'inherit' }} />
        <span className="hidden sm:inline">Modes</span>
        {activeCount > 0 && (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: '#FF8400', color: '#4F2500' }}
          >
            {activeCount}
          </span>
        )}
        <ChevronUp
          className="h-3 w-3 transition-transform"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 w-72 rounded-xl p-1 z-50"
          style={{
            background: '#2A2A2A',
            border: '1px solid rgba(87,67,53,0.25)',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.6)',
          }}
        >
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Chat Modes
          </p>
          {MODES.map(({ key, icon: Icon, label, description }) => {
            const active = modes[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                style={{
                  background: active ? 'rgba(255,132,0,0.08)' : 'transparent',
                }}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: active ? 'rgba(255,132,0,0.15)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: active ? '#FF8400' : '#DEC1AF' }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: active ? '#E5E2E1' : '#DEC1AF' }}
                    >
                      {label}
                    </span>
                    {/* Toggle pill */}
                    <div
                      className="flex h-5 w-9 shrink-0 items-center rounded-full transition-all"
                      style={{
                        background: active ? '#FF8400' : '#353535',
                        justifyContent: active ? 'flex-end' : 'flex-start',
                        padding: '2px',
                      }}
                    >
                      <div className="h-3.5 w-3.5 rounded-full bg-white" />
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                    {description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
