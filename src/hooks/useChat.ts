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

const MOCK_RESPONSES = [
  "Thanks for reaching out! Cook Systems Consulting specializes in IT staffing, custom software development, and technology training. How can I help you today?",
  "We offer a range of services including staff augmentation, managed services, and custom application development. Would you like to learn more about any of these?",
  "Our team has extensive experience with Java, .NET, React, cloud infrastructure, and more. What technology stack are you working with?",
  "I'd be happy to connect you with one of our consultants. Could you share a bit about your project requirements?",
  "Cook Systems has been delivering technology solutions since 1988. We pride ourselves on building long-term partnerships with our clients.",
  "We provide both onshore and nearshore development teams. What's the timeline for your project?",
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

    // Mock response with simulated delay
    const delay = 800 + Math.random() * 1200
    await new Promise(r => setTimeout(r, delay))

    if (config.agentEndpoint) {
      try {
        const resp = await fetch(config.agentEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, agentId: config.agentId }),
        })
        const data = await resp.json()
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

    // Mock response
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
  }, [config.agentEndpoint, config.agentId])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, isTyping, sendMessage, clearHistory }
}
