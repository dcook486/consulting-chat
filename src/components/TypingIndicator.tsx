export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white text-xs font-bold shrink-0">
        CS
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
        </div>
      </div>
    </div>
  )
}
