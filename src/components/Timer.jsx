function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SessionTimer({ seconds }) {
  return (
    <span className="text-xs text-gray-400 tabular-nums">
      {formatTime(seconds)}
    </span>
  )
}

export function ItemTimer({ seconds }) {
  return (
    <span className="text-[11px] text-gray-400 tabular-nums">
      {formatTime(seconds)}
    </span>
  )
}
