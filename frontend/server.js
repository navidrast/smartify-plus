'use strict'

/**
 * Custom Next.js standalone server with WebSocket proxy.
 *
 * Next.js rewrites handle HTTP /api/* → backend.
 * This server adds WebSocket upgrade handling: /ws/* → backend.
 * Both flows go through a single port (3000) so Cloudflare Tunnel
 * only needs one ingress rule and Zero Trust works end-to-end.
 */

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

let reqHandler

const server = createServer(async (req, res) => {
  try {
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
