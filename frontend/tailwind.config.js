/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        card: 'var(--color-card)',
        'card-alt': 'var(--color-card-alt)',
        sidebar: 'var(--color-sidebar)',
        'sidebar-active': 'var(--color-sidebar-active)',
        border: 'var(--color-border)',
        accent: '#FF8400',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
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
  plugins: [require('@tailwindcss/typography')],
}
