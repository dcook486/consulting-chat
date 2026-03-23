interface Props {
  onClick: () => void
}

export function ChatBubble({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full bg-[#1B3A5C] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
      aria-label="Open chat"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
          fill="currentColor"
        />
      </svg>
    </button>
  )
}
