import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smartify Plus',
  description: 'AI-powered receipt and invoice extraction for Australian accounting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('smartify-theme') || 'dark';
            var r = t === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
            document.documentElement.classList.add(r === 'light' ? 'light' : 'dark');
          })();
        `}} />
      </head>
      <body className="h-screen w-screen overflow-hidden">{children}</body>
    </html>
  )
}
