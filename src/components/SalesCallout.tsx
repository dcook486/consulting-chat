interface Props {
  text: string
}

export function SalesCallout({ text }: Props) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 animate-fade-in flex items-start gap-1.5">
      <span className="shrink-0 mt-0.5">✨</span>
      <span className="leading-relaxed font-medium">{text}</span>
    </div>
  )
}
