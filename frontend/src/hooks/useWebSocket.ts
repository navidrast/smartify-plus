'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { WS_URL } from '@/lib/constants'
import type { AgentEvent } from '@/types'

export function useWebSocket(conversationId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<AgentEvent | null>(null)

  const connect = useCallback(() => {
    if (!conversationId) return

    const ws = new WebSocket(`${WS_URL}/ws/${conversationId}`)
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
