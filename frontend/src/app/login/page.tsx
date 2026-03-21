'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6 font-sans"
      style={{ background: 'radial-gradient(circle at 50% 50%, #20201F 0%, #0E0E0E 100%)' }}
    >
      <div className="flex w-full max-w-[400px] flex-col items-center">

        {/* Brand */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-2xl">
            <span className="font-headline text-2xl font-black text-white">S+</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Smartify Plus
          </h1>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            AI-powered accounting for Australian firms
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8"
          style={{
            background: '#20201F',
            border: '1px solid rgba(87,67,53,0.15)',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
          }}
        >
          {/* SSO */}
          <div className="mb-8 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-high"
              style={{ borderColor: 'rgba(87,67,53,0.3)' }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-high"
              style={{ borderColor: 'rgba(87,67,53,0.3)' }}
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid rgba(87,67,53,0.1)' }} />
            </div>
            <span
              className="relative px-4 text-xs font-medium uppercase tracking-widest text-on-surface-variant"
              style={{ background: '#20201F' }}
            >
              or
            </span>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="ml-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Work Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@firm.com.au"
                autoComplete="email"
                className="w-full rounded-lg px-4 py-3 font-mono text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40"
                style={{
                  background: '#1C1B1B',
                  border: '1px solid rgba(87,67,53,0.2)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#FF8400'; e.currentTarget.style.boxShadow = '0 0 0 1px #FF8400' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(87,67,53,0.2)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
                <a href="#" className="text-[11px] font-bold text-accent hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg px-4 py-3 pr-10 font-mono text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40"
                  style={{
                    background: '#1C1B1B',
                    border: '1px solid rgba(87,67,53,0.2)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#FF8400'; e.currentTarget.style.boxShadow = '0 0 0 1px #FF8400' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(87,67,53,0.2)'; e.currentTarget.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 h-12 w-full rounded-lg font-headline font-bold text-white transition-all active:scale-[0.98]"
              style={{
                background: '#FF8400',
                boxShadow: '0 4px 24px -4px rgba(255,132,0,0.35)',
              }}
            >
              Sign in
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-on-surface-variant">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-10 flex items-center gap-6 opacity-30">
          <span className="font-mono text-[10px] uppercase tracking-tighter text-on-surface-variant">
            Smartify Plus
          </span>
          <span className="font-mono text-[10px] uppercase tracking-tighter text-on-surface-variant">
            On-Premises · ATO Compliant
          </span>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}
