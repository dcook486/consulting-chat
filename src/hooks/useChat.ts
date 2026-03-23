import { useState, useCallback, useRef } from 'react'
import type { Message, ChatConfig } from '../types'

const STORAGE_KEY = 'cooksystems-chat-history'

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)))
  } catch { /* quota exceeded */ }
}

const DEFAULT_ENDPOINT = '/api/chat'

export function useChat(config: ChatConfig) {
  const [messages, setMessages] = useState<Message[]>(loadHistory)
  const [isTyping, setIsTyping] = useState(false)
  const conversationIdRef = useRef<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    setMessages(prev => {
      const next = [...prev, userMsg]
      saveHistory(next)
      return next
    })

    setIsTyping(true)

    const endpoint = config.agentEndpoint || DEFAULT_ENDPOINT

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: conversationIdRef.current,
        }),
      })
      const data = await resp.json()

      if (data.conversationId) {
        conversationIdRef.current = data.conversationId
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.response || data.message || 'Sorry, I had trouble processing that.',
        timestamp: Date.now(),
      }
      setMessages(prev => {
        const next = [...prev, assistantMsg]
        saveHistory(next)
        return next
      })
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or reach out to us directly at hello@cooksystems.com.",
        timestamp: Date.now(),
      }
      setMessages(prev => {
        const next = [...prev, errorMsg]
        saveHistory(next)
        return next
      })
    }

    setIsTyping(false)
  }, [config.agentEndpoint, config.agentId])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, isTyping, sendMessage, clearHistory }
}
