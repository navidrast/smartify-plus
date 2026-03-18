import type { Conversation, Message, ExtractedRecord } from '@/types'

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  // Use relative URLs — Next.js server proxies /api/* to the backend
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function getConversations(): Promise<Conversation[]> {
  return fetchJSON<Conversation[]>('/api/conversations')
}

export async function getConversation(id: string): Promise<Conversation> {
  return fetchJSON<Conversation>(`/api/conversations/${id}`)
}

export async function createConversation(): Promise<Conversation> {
  return fetchJSON<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await fetchJSON(`/api/conversations/${id}`, { method: 'DELETE' })
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return fetchJSON<Message[]>(`/api/conversations/${conversationId}/messages`)
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  return fetchJSON<Message>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function getRecords(conversationId: string): Promise<ExtractedRecord[]> {
  return fetchJSON<ExtractedRecord[]>(`/api/conversations/${conversationId}/records`)
}

export async function uploadFile(
  conversationId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ document_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/upload`)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Upload network error')))

    const form = new FormData()
    form.append('file', file)
    form.append('conversation_id', conversationId)
    xhr.send(form)
  })
}

export function getExportUrl(conversationId: string, format: 'excel' | 'pdf'): string {
  return `/api/conversations/${conversationId}/export/${format}`
}
