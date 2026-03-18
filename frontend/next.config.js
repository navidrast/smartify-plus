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
}
