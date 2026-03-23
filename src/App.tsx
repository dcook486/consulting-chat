import { useState } from 'react'
import { ChatWindow } from './components/ChatWindow'
import { ChatBubble } from './components/ChatBubble'
import type { ChatConfig } from './types'

interface Props {
  config?: ChatConfig
}

export default function App({ config = {} }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const position = config.position || 'bottom-right'
  const positionClasses = position === 'bottom-left' ? 'left-5' : 'right-5'

  return (
    <div className={`fixed bottom-5 ${positionClasses} z-[9999] flex flex-col items-end gap-4`}>
      {isOpen && (
        <ChatWindow config={config} onClose={() => setIsOpen(false)} />
      )}
      {!isOpen && (
        <ChatBubble onClick={() => setIsOpen(true)} />
      )}
    </div>
  )
}
