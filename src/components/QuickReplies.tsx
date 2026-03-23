import type { QuickReply } from '../types'

interface Props {
  replies: QuickReply[]
  onSelect: (message: string) => void
}

export function QuickReplies({ replies, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {replies.map((reply) => (
        <button
          key={reply.label}
          onClick={() => onSelect(reply.message)}
          className="text-xs px-3 py-1.5 rounded-full border border-[#1B3A5C] text-[#1B3A5C] hover:bg-[#1B3A5C] hover:text-white transition-colors cursor-pointer"
        >
          {reply.label}
        </button>
      ))}
    </div>
  )
}
