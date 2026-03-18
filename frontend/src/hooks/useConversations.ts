'use client'

import useSWR from 'swr'
import { getConversations } from '@/lib/api'
import type { Conversation } from '@/types'

export function useConversations() {
  const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
    '/api/conversations',
    getConversations,
    { refreshInterval: 5000 }
  )

  return {
    conversations: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
