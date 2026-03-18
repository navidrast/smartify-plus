'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AgentEvent } from '@/types'

export function useWebSocket(conversationId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<AgentEvent | null>(null)

  const connect = useCallback(() => {
    if (!conversationId || typeof window === 'undefined') return

    // Connect through the same origin as the page — works behind Cloudflare/ZT
    // The Next.js custom server proxies /ws/* to the backend internally
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/${conversationId}`)
    wsRef.current = ws

    ws.addEventListener('open', () => setIsConnected(true))

    ws.addEventListener('message', (evt) => {
      try {
        const event: AgentEvent = JSON.parse(evt.data)
        setEvents((prev) => [...prev, event])
        setLastMessage(event)
      } catch {
        // ignore non-JSON messages
      }
    })

    ws.addEventListener('close', () => {
      setIsConnected(false)
      wsRef.current = null
    })

    ws.addEventListener('error', () => {
      ws.close()
    })
  }, [conversationId])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const clearEvents = useCallback(() => setEvents([]), [])

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  return { events, isConnected, lastMessage, clearEvents, send }
}
