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

    // Derive WS URL from current browser hostname — works on any host without rebuild
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsBase = `${proto}//${window.location.hostname}:8000`
    const ws = new WebSocket(`${wsBase}/ws/${conversationId}`)
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

  return { events, isConnected, lastMessage, clearEvents }
}
