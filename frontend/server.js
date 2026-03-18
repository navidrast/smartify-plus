'use strict'

/**
 * Custom Next.js standalone server with WebSocket proxy.
 *
 * Next.js rewrites handle HTTP /api/* → backend.
 * This server adds WebSocket upgrade handling: /ws/* → backend.
 * Both flows go through a single port (3000) so Cloudflare Tunnel
 * only needs one ingress rule and Zero Trust works end-to-end.
 */

const fs = require('fs')
const path = require('path')
const { createServer } = require('http')
const httpProxy = require('http-proxy')

const port = parseInt(process.env.PORT || '3000', 10)
const hostname = process.env.HOSTNAME || '0.0.0.0'
const backendUrl = process.env.BACKEND_URL || 'http://smartify-backend:8000'

// Required by Next.js standalone to load config
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(
  require('./.next/required-server-files.json').config
)
process.chdir(__dirname)

const NextServer = require('./node_modules/next/dist/server/next-server').default

// Proxy WebSocket /ws/* connections to backend
const wsProxy = httpProxy.createProxyServer({
  target: backendUrl,
  ws: true,
  changeOrigin: true,
})
wsProxy.on('error', (err, _req, socket) => {
  console.error('[ws-proxy error]', err.message)
  if (socket && typeof socket.destroy === 'function') socket.destroy()
})

const MIME = {
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

// Serve /_next/static/* directly from .next/static/ (Next.js
// standalone's NextServer handler sometimes misses these in custom-server mode)
function serveNextStatic(req, res) {
  const relPath = req.url.replace(/^\/(_next\/static\/)/, '$1')
  const filePath = path.join(__dirname, '.next', 'static', relPath.replace(/^_next\/static\//, ''))
  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) return false
    const ext = path.extname(filePath)
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.statusCode = 200
    fs.createReadStream(filePath).pipe(res)
    return true
  })
  return null // async — we return null to signal "maybe"
}

let reqHandler

const server = createServer(async (req, res) => {
  try {
    // Fast-path: serve _next/static files before handing off to Next.js
    if (req.url && req.url.startsWith('/_next/static/')) {
      const relPath = req.url.replace(/^\/(_next\/static\/)/, '').replace(/^_next\/static\//, '')
      const filePath = path.join(__dirname, '.next', 'static', relPath)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.statusCode = 200
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    await reqHandler(req, res)
  } catch (err) {
    console.error('[server error]', err)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

// Intercept WebSocket upgrade requests and proxy them to the backend
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/ws/')) {
    wsProxy.ws(req, socket, head)
  } else {
    socket.destroy()
  }
})

server.listen(port, hostname, (err) => {
  if (err) throw err

  const addr = server.address()
  const actualPort = typeof addr === 'object' && addr ? addr.port : port

  reqHandler = new NextServer({
    hostname,
    port: actualPort,
    dir: path.join(__dirname),
    dev: false,
    customServer: false,
    conf: require('./.next/required-server-files.json').config,
  }).getRequestHandler()

  console.log(`> Ready on http://${hostname}:${actualPort}`)

  if (!process.env.NEXT_MANUAL_SIG_HANDLE) {
    process.on('SIGTERM', () => { server.close(); process.exit(0) })
    process.on('SIGINT', () => { server.close(); process.exit(0) })
  }
})
