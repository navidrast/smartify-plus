/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#111111',
        card: '#1A1A1A',
        'card-alt': '#222222',
        sidebar: '#18181b',
        'sidebar-active': '#2a2a30',
        border: '#2E2E2E',
        accent: '#FF8400',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B8B9B6',
        'text-muted': '#666666',
        'gst-10': '#4ade80',
        'gst-10-bg': '#222924',
        'gst-unknown': '#FF8400',
        'gst-unknown-bg': '#291C0F',
        'gst-error': '#FF5C33',
        'gst-error-bg': '#24100B',
        agent: {
          extraction: '#FF8400',
          gst: '#4ade80',
          abn: '#B2B2FF',
          reconciliation: '#FF8400',
          reporting: '#4ade80',
          compliance: '#FF5C33',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
