import { useMemo } from 'react'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateToStr(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function strToDate(s) {
  return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
}

function Bar({ label, value, max, color = 'bg-emerald-400' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-500 text-right shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-8 text-gray-400 text-right tabular-nums">{value}</span>
    </div>
  )
}

export default function Analytics({ sections, heatmap, analytics, timerData, onBack }) {
  const { sectionFreq, maxSectionFreq } = useMemo(() => {
    const counts = analytics.sectionCounts || {}
    const freq = sections.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      count: counts[s.id] || 0,
    })).sort((a, b) => b.count - a.count)
    const max = freq.length > 0 ? Math.max(...freq.map((f) => f.count)) : 0
    return { sectionFreq: freq, maxSectionFreq: max }
  }, [sections, analytics])

  const avgTimePerItem = useMemo(() => {
    const items = timerData.items || {}
    const entries = Object.entries(items)
    if (entries.length === 0) return 0
    const total = entries.reduce((sum, [, secs]) => sum + secs, 0)
    return Math.round(total / entries.length)
  }, [timerData])

  const neglectedItems = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = dateToStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30))
    const lastDrilled = analytics.itemLastDrilled || {}

    const allItems = []
    for (const section of sections) {
      for (const item of section.items) {
        const last = lastDrilled[item.id]
        if (!last || last < thirtyDaysAgo) {
          allItems.push({
            id: item.id,
            text: item.text,
            sectionIcon: section.icon,
            sectionTitle: section.title,
            lastDate: last || null,
          })
        }
      }
    }
    return allItems.sort((a, b) => {
      if (!a.lastDate && !b.lastDate) return 0
      if (!a.lastDate) return -1
      if (!b.lastDate) return 1
      return a.lastDate.localeCompare(b.lastDate)
    })
  }, [sections, analytics])

  const dayOfWeek = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const [dateStr, count] of Object.entries(heatmap)) {
      const d = strToDate(dateStr)
      counts[d.getDay()] += count
    }
    return counts
  }, [heatmap])
  const maxDow = Math.max(...dayOfWeek, 1)

  const { trend, trendMax } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = dateToStr(d)
      days.push({ date: d, count: heatmap[key] || 0 })
    }
    const max = Math.max(...days.map((d) => d.count), 1)
    return { trend: days, trendMax: max }
  }, [heatmap])

  return (
    <div className="min-h-screen bg-white px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 active:bg-gray-100"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
      </div>

      {/* Avg time per item */}
      {avgTimePerItem > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Average Time Per Item (today)</h2>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-semibold text-gray-900">{formatSeconds(avgTimePerItem)}</div>
            <div className="text-xs text-gray-400 mt-1">per item</div>
          </div>
        </div>
      )}

      {/* Section frequency */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Section Frequency</h2>
        <div className="space-y-2">
          {sectionFreq.map((s) => (
            <Bar key={s.id} label={`${s.icon} ${s.title}`} value={s.count} max={maxSectionFreq} />
          ))}
        </div>
        {maxSectionFreq === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No data yet</p>
        )}
      </div>

      {/* Day-of-week patterns */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Day of Week</h2>
        <div className="space-y-2">
          {dayOfWeek.map((count, i) => (
            <Bar key={i} label={DAY_NAMES[i]} value={count} max={maxDow} color="bg-blue-400" />
          ))}
        </div>
      </div>

      {/* Trend - items per day over 30 days */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Last 30 Days</h2>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-end gap-[3px] h-20">
            {trend.map(({ date, count }, i) => {
              const h = trendMax > 0 ? (count / trendMax) * 100 : 0
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-emerald-400 transition-all"
                  style={{ height: `${Math.max(h, 2)}%`, opacity: count === 0 ? 0.15 : 1 }}
                  title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${count} items`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{trend[0]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Neglected items */}
      <div className="mb-8">
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Neglected Items
          <span className="text-gray-300 font-normal ml-1">({neglectedItems.length})</span>
        </h2>
        {neglectedItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">All items drilled within the last 30 days</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {neglectedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-sm">{item.sectionIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{item.text}</div>
                  <div className="text-[10px] text-gray-400">
                    {item.lastDate ? `Last: ${formatDateStrShort(item.lastDate)}` : 'Never drilled'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatSeconds(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function formatDateStrShort(s) {
  const d = strToDate(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
