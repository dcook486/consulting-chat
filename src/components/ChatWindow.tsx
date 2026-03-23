import { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { QuickReplies } from './QuickReplies'
import type { ChatConfig, QuickReply } from '../types'

const QUICK_REPLIES: QuickReply[] = [
  { label: '📋 Services', message: 'What services does Cook Systems offer?' },
  { label: '💼 Staffing', message: 'Tell me about your IT staffing solutions.' },
  { label: '🛠 Custom Dev', message: 'I need custom software development.' },
  { label: '📞 Contact', message: 'How can I speak with a consultant?' },
]

interface Props {
  config: ChatConfig
  onClose: () => void
}

export function ChatWindow({ config, onClose }: Props) {
  const { messages, isTyping, sendMessage } = useChat(config)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    sendMessage(text)
  }

  const greeting = config.greeting || "Hi! How can I help you today?"
  const showQuickReplies = messages.length === 0

  return (
    <div className="animate-slide-up flex flex-col w-[380px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-[#1B3A5C] text-white px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            CS
          </div>
          <div>
            <div className="font-semibold text-sm">Cook Systems Consulting</div>
            <div className="text-xs text-white/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
              Online
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close chat"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Greeting */}
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white text-xs font-bold shrink-0">
            CS
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 leading-relaxed max-w-[80%]">
            {greeting}
          </div>
        </div>

        {showQuickReplies && (
          <QuickReplies replies={QUICK_REPLIES} onSelect={sendMessage} />
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 text-sm px-4 py-2.5 rounded-full bg-gray-100 border-none outline-none focus:ring-2 focus:ring-[#1B3A5C]/30"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center hover:bg-[#254B73] disabled:opacity-40 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9M14 2l-5 12-2-5-5-2 12-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400">
            Powered by <a href="https://harborworks.ai" target="_blank" rel="noopener" className="hover:text-gray-500">Harbor Works</a>
          </span>
        </div>
      </div>
    </div>
  )
}
