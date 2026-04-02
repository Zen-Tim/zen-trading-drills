import { useState, useMemo } from 'react'

const CELL_SIZE = 13
const CELL_GAP = 3
const CELL_STEP = CELL_SIZE + CELL_GAP
const WEEKS = 26 // ~180 days
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dateToStr(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function strToDate(s) {
  return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
}

function getColor(count, max) {
  if (count === 0) return '#ebedf0'
  const ratio = count / max
  if (ratio <= 0.25) return '#9be9a8'
  if (ratio <= 0.5) return '#40c463'
  if (ratio <= 0.75) return '#30a14e'
  return '#216e39'
}

export default function Heatmap({ heatmap, onBack }) {
  const [tooltip, setTooltip] = useState(null)

  const { grid, monthLabels, maxCount, totalDays, totalItems } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find the Sunday that starts our grid (WEEKS weeks before the current week's Sunday)
    const todayDay = today.getDay() // 0=Sun
    const endSunday = new Date(today)
    endSunday.setDate(today.getDate() - todayDay) // go back to this week's Sunday
    const startDate = new Date(endSunday)
    startDate.setDate(endSunday.getDate() - (WEEKS - 1) * 7)

    let max = 0
    let days = 0
    let items = 0
    const cells = []
    const months = []
    let lastMonth = -1

    for (let week = 0; week < WEEKS; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + week * 7 + day)
        if (d > today) continue

        const key = dateToStr(d)
        const count = heatmap[key] || 0
        if (count > max) max = count
        if (count > 0) { days++; items += count }

        cells.push({ week, day, date: d, dateStr: key, count })

        // Track month labels
        if (d.getMonth() !== lastMonth && day === 0) {
          months.push({ week, month: d.getMonth() })
          lastMonth = d.getMonth()
        }
      }
    }

    return { grid: cells, monthLabels: months, maxCount: max || 1, totalDays: days, totalItems: items }
  }, [heatmap])

  const LEFT_PAD = 32
  const TOP_PAD = 20
  const svgWidth = LEFT_PAD + WEEKS * CELL_STEP
  const svgHeight = TOP_PAD + 7 * CELL_STEP

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
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Activity</h1>
          <p className="text-xs text-gray-400">Past {WEEKS * 7} days</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{totalDays}</div>
          <div className="text-[11px] text-gray-400">Active days</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{totalItems}</div>
          <div className="text-[11px] text-gray-400">Items drilled</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{totalDays > 0 ? Math.round(totalItems / totalDays) : 0}</div>
          <div className="text-[11px] text-gray-400">Avg / day</div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <svg width={svgWidth} height={svgHeight + 8} className="block">
          {/* Month labels */}
          {monthLabels.map(({ week, month }, i) => (
            <text
              key={i}
              x={LEFT_PAD + week * CELL_STEP}
              y={12}
              className="fill-gray-400"
              fontSize={10}
            >
              {MONTH_NAMES[month]}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label && (
              <text
                key={i}
                x={0}
                y={TOP_PAD + i * CELL_STEP + CELL_SIZE - 2}
                className="fill-gray-400"
                fontSize={9}
              >
                {label}
              </text>
            )
          ))}

          {/* Cells */}
          {grid.map(({ week, day, dateStr, count, date }) => (
            <rect
              key={dateStr}
              x={LEFT_PAD + week * CELL_STEP}
              y={TOP_PAD + day * CELL_STEP}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={getColor(count, maxCount)}
              className="cursor-pointer"
              onMouseEnter={() => setTooltip({ dateStr, count, x: LEFT_PAD + week * CELL_STEP, y: TOP_PAD + day * CELL_STEP })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => setTooltip(tooltip?.dateStr === dateStr ? null : { dateStr, count, x: LEFT_PAD + week * CELL_STEP, y: TOP_PAD + day * CELL_STEP })}
            />
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">
            {formatDateStr(tooltip.dateStr)}: <span className="font-medium text-gray-700">{tooltip.count} items</span>
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-gray-400">
        <span>Less</span>
        {['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'].map((color) => (
          <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function formatDateStr(s) {
  const d = strToDate(s)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
