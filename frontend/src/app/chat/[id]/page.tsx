'use client'

import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'

export default function ConversationPage() {
  const params = useParams()
  const id = params.id as string

  return <AppShell conversationId={id} />
}
