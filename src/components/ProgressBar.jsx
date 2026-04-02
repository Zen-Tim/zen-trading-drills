export default function ProgressBar({ done, total, className = '' }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="h-full bg-emerald-400 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
