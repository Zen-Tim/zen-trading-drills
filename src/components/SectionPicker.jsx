import ProgressBar from './ProgressBar'
import { SessionTimer } from './Timer'

export default function SectionPicker({ sections, sectionProgress, totalDone, totalReps, totalItems, streak, onSelectSection, sessionSeconds, getRepCount, getUniqueCount, savedSession, savedSectionObj, onResume, onStartFresh, onAddItem }) {
  return (
    <div className="min-h-screen bg-white px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Zen Drills</h1>
        <p className="text-sm text-gray-400 mt-1">Daily PA practice</p>
      </div>

      {/* Resume banner */}
      {savedSession && savedSectionObj && (() => {
        const doneCount = getUniqueCount(savedSectionObj.id)
        const totalCount = savedSectionObj.items.length
        return (
          <div className="mb-6 p-4 rounded-2xl border border-blue-100 bg-blue-50/50">
            <p className="text-sm font-medium text-gray-800 mb-1">
              Continue {savedSectionObj.icon} {savedSectionObj.title}?
            </p>
            <p className="text-xs text-gray-500 mb-3">
              {doneCount}/{totalCount} done · {savedSession.mode === 'flashcard' ? 'Cards' : 'List'} mode
            </p>
            <div className="flex gap-2">
              <button
                onClick={onResume}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium active:scale-[0.97] transition-all"
              >
                Resume
              </button>
              <button
                onClick={onStartFresh}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium active:scale-[0.97] transition-all"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )
      })()}

      {/* Streak + Session timer */}
      <div className="mb-6 flex items-center gap-3 text-sm text-gray-500">
        {streak.current > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-orange-400 text-lg">🔥</span>
            <span>{streak.current} day streak</span>
          </div>
        )}
        {sessionSeconds > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-gray-300">⏱</span>
            <SessionTimer seconds={sessionSeconds} />
          </div>
        )}
      </div>

      {/* Overall progress (unique items) */}
      <div className="mb-8">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Today</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-400">{totalDone} / {totalItems}</span>
            {totalReps > totalDone && (
              <span className="text-[11px] text-gray-300">{totalReps} reps</span>
            )}
          </div>
        </div>
        <ProgressBar done={totalDone} total={totalItems} />
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => {
          const { done, total } = sectionProgress(section.id, section.items.length)
          const complete = done === total && total > 0

          // Calculate total reps for this section
          const sectionReps = section.items.reduce((sum, item) => sum + getRepCount(section.id, item.id), 0)

          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section)}
              className={`relative text-left p-5 rounded-2xl border transition-all active:scale-[0.97] min-h-[120px]
                ${complete
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
              {/* Add item button */}
              {onAddItem && (
                <span
                  onClick={(e) => { e.stopPropagation(); onAddItem(section.id) }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              )}
              <div className="text-2xl mb-2">{section.icon}</div>
              <div className="text-base font-medium text-gray-900 leading-tight">{section.title}</div>
              <div className="text-sm text-gray-400 mt-0.5">{section.subtitle}</div>
              <div className="text-xs text-gray-300 mt-0.5">{section.items.length} items</div>

              <div className="mt-3 flex items-center gap-2">
                <ProgressBar done={done} total={total} className="flex-1" />
                <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                  {done}/{total}
                </span>
              </div>
              {sectionReps > done && (
                <div className="mt-1 text-[11px] text-gray-300 text-right">{sectionReps} reps</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
