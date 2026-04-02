import ProgressBar from './ProgressBar'

export default function SectionPicker({ sections, sectionProgress, totalDone, totalItems, streak, onSelectSection }) {
  return (
    <div className="min-h-screen bg-white px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Zen Drills</h1>
        <p className="text-sm text-gray-400 mt-1">Daily PA practice</p>
      </div>

      {/* Streak */}
      {streak.current > 0 && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <span className="text-orange-400 text-lg">🔥</span>
          <span>{streak.current} day streak</span>
        </div>
      )}

      {/* Overall progress */}
      <div className="mb-8">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Today</span>
          <span className="text-xs text-gray-400">{totalDone} / {totalItems}</span>
        </div>
        <ProgressBar done={totalDone} total={totalItems} />
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => {
          const { done, total } = sectionProgress(section.id, section.items.length)
          const complete = done === total && total > 0

          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section)}
              className={`text-left p-4 rounded-2xl border transition-all active:scale-[0.97]
                ${complete
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
              <div className="text-2xl mb-2">{section.icon}</div>
              <div className="text-sm font-medium text-gray-900 leading-tight">{section.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{section.subtitle}</div>

              <div className="mt-3 flex items-center gap-2">
                <ProgressBar done={done} total={total} className="flex-1" />
                <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                  {done}/{total}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
