'use strict'

/**
 * Custom Next.js standalone server with WebSocket proxy + API proxy.
 *
 * Next.js rewrites do not apply reliably in custom-server mode (Next.js 14).
 * This server handles both concerns explicitly:
 *   - /_next/static/* → streamed from .next/static/ (bypasses broken static serving)
 *   - /api/*          → proxied to backend via http-proxy (bypasses broken rewrites)
 *   - /ws/*           → WebSocket upgrade proxied to backend
 *   - everything else → Next.js request handler
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

// Single proxy instance handles both HTTP /api/* and WS /ws/*
const proxy = httpProxy.createProxyServer({
  target: backendUrl,
  changeOrigin: true,
})
proxy.on('error', (err, _req, res) => {
  console.error('[proxy error]', err.message)
  if (res && typeof res.end === 'function') {
    res.statusCode = 502
    res.end('Bad Gateway')
  }
})

const MIME = {
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
}

let reqHandler

const server = createServer(async (req, res) => {
  try {
    const url = req.url || '/'

    // 1. Serve /_next/static/* directly — NextServer.getRequestHandler() does not
    //    serve static files in custom-server mode (Next.js 14 known behaviour)
    if (url.startsWith('/_next/static/')) {
      const relPath = url.slice('/_next/static/'.length)
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

    // 2. Proxy /api/* to backend — Next.js rewrites do not apply in custom-server mode
    if (url.startsWith('/api/')) {
      proxy.web(req, res)
      return
    }

    // 3. Everything else goes to Next.js (page routes, RSC, etc.)
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
    proxy.ws(req, socket, head)
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
