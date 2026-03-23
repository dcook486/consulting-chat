import { useState, useCallback, useRef } from 'react'
import type { Message, ChatConfig } from '../types'

const STORAGE_KEY = 'cooksystems-chat-history'
const SESSION_KEY = 'cooksystems-session-id'

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

function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

function setSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id)
}

const MOCK_RESPONSES = [
  "Thanks for reaching out! Cook Systems Consulting specializes in helping small businesses with AI-powered websites and automation. How can I help you today?",
  "We offer a range of services including AI chatbot integration, scheduling automation, and lead management. Would you like to learn more about any of these?",
  "Our team has extensive experience building solutions for clinics, dental offices, and other service-based businesses. What type of business are you running?",
  "I'd be happy to connect you with our team. Could you share a bit about your current challenges?",
  "Cook Systems helps businesses save time by automating repetitive tasks. We can set up a quick discovery call to discuss your needs.",
  "We provide ongoing support including monthly maintenance, feature updates, and training. What's the timeline for your project?",
]

export function useChat(config: ChatConfig) {
  const [messages, setMessages] = useState<Message[]>(loadHistory)
  const [isTyping, setIsTyping] = useState(false)
  const responseIndex = useRef(0)

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

    const endpoint = config.agentEndpoint || import.meta.env.VITE_API_URL

    if (endpoint) {
      try {
        const resp = await fetch(`${endpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: getSessionId(),
            referrer: document.referrer || undefined,
            userAgent: navigator.userAgent,
          }),
        })
        const data = await resp.json()

        // Store session ID for continuity
        if (data.sessionId) {
          setSessionId(data.sessionId)
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response || data.message || 'Sorry, I had trouble processing that.',
          timestamp: Date.now(),
        }
        setMessages(prev => {
          const next = [...prev, assistantMsg]
          saveHistory(next)
          return next
        })
        setIsTyping(false)
        return
      } catch {
        // Fall through to mock
      }
    }

    // Mock response with simulated delay
    const delay = 800 + Math.random() * 1200
    await new Promise(r => setTimeout(r, delay))

    const mockReply = MOCK_RESPONSES[responseIndex.current % MOCK_RESPONSES.length]
    responseIndex.current++

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: mockReply,
      timestamp: Date.now(),
    }

    setMessages(prev => {
      const next = [...prev, assistantMsg]
      saveHistory(next)
      return next
    })
    setIsTyping(false)
  }, [config.agentEndpoint])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  return { messages, isTyping, sendMessage, clearHistory }
}
