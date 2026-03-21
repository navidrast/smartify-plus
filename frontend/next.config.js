/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  async rewrites() {
    // Server-side proxy: browser calls /api/* → Next.js → backend service
    // Works on any host without baking in a URL at build time
    const backendUrl = process.env.BACKEND_URL || 'http://smartify-backend:8000'
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ]
  },
  async headers() {
    return [
      {
        // HTML pages must never be served stale — JS chunks change hash on every build
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Static assets have content hashes — safe to cache long-term
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
