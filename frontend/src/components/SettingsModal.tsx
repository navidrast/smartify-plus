'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { type Theme, getSavedTheme, saveTheme } from '@/lib/theme'

interface SettingsModalProps {
  onClose: () => void
}

type TabId = 'general' | 'account' | 'about'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'about', label: 'About', icon: 'info' },
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [tab, setTab] = useState<TabId>('general')

  useEffect(() => {
    setTheme(getSavedTheme())
  }, [])

  const handleTheme = (t: Theme) => {
    setTheme(t)
    saveTheme(t)
  }

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
    { value: 'auto', label: 'Auto', icon: 'desktop_windows' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl h-[600px] rounded-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-[#574335]/20"
        style={{ background: '#131313', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left panel */}
        <div className="w-full md:w-64 shrink-0 flex flex-col p-6" style={{ background: '#0E0E0E' }}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline font-extrabold text-xl text-on-surface">Settings</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  tab === t.id
                    ? 'bg-primary-container text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-8" style={{ background: '#131313' }}>
          {tab === 'general' && (
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                  Interface Theme
                </h3>
                <div className="grid grid-cols-3 p-1 bg-surface-container-low rounded-xl ring-1 ring-[#574335]/20 gap-1">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleTheme(opt.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg py-3 text-xs font-semibold transition-colors ${
                        theme === opt.value
                          ? 'bg-surface-container-high text-primary-container shadow-sm ring-1 ring-white/5'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                  Display Language
                </h3>
                <select
                  className="w-full bg-surface-container-low border border-[#574335]/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/30 cursor-pointer"
                >
                  <option value="en-AU">English (Australia)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>

              {/* Predictive interface info card */}
              <div
                className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low"
                style={{ borderLeft: '3px solid #FF8400' }}
              >
                <span className="material-symbols-outlined text-[24px] text-primary-container mt-0.5 shrink-0">auto_awesome</span>
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-1">Predictive Interface</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Smartify Plus learns from your accounting patterns to surface the most relevant actions and suggestions automatically.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="bg-primary-container text-on-primary px-8 py-2.5 rounded-lg font-bold text-sm transition-transform active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {tab === 'account' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface text-2xl font-bold">
                  D
                </div>
                <div>
                  <p className="text-base font-semibold text-on-surface">Demo User</p>
                  <p className="text-sm text-on-surface-variant">demo@smartifyplus.com.au</p>
                </div>
              </div>
              <div
                className="flex items-start gap-4 p-4 rounded-xl bg-surface-container-low"
                style={{ borderLeft: '3px solid #FF8400' }}
              >
                <span className="material-symbols-outlined text-[24px] text-primary-container mt-0.5 shrink-0">lock</span>
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-1">Phase One Feature</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Account management, multi-tenancy, and user authentication are scheduled for Phase One.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary text-2xl font-black"
                  style={{ boxShadow: '0 0 32px -4px rgba(255,132,0,0.3)' }}
                >
                  S+
                </div>
                <div>
                  <p className="text-base font-semibold text-on-surface">Smartify Plus</p>
                  <p className="text-sm text-on-surface-variant">Phase Zero — AI Extraction Engine</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <div className="flex justify-between py-3 border-b border-[#574335]/10">
                  <span>Version</span>
                  <span className="font-mono text-on-surface">0.1.0</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[#574335]/10">
                  <span>Stack</span>
                  <span className="font-mono text-on-surface">Next.js 15 · Python 3.12 · Ollama</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[#574335]/10">
                  <span>AI Model</span>
                  <span className="font-mono text-on-surface">qwen2.5-vl:7b</span>
                </div>
                <div className="flex justify-between py-3">
                  <span>Region</span>
                  <span className="font-mono text-on-surface">Australia (ATO GST rules)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
