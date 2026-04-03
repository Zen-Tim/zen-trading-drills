import { useState } from 'react'
import ProgressBar from './ProgressBar'
import { SessionTimer } from './Timer'

export default function SectionPicker({ sections, sectionProgress, totalDone, totalReps, totalItems, streak, onSelectSection, sessionSeconds, getRepCount, getUniqueCount, savedSession, savedSectionObj, onResume, onStartFresh, onAddItem, onEditSection, onCreateSection, onReorderSections }) {
  const [editMode, setEditMode] = useState(false)

  // Get real (non-recent) sections for reorder logic
  const realSections = sections.filter((s) => s.id !== 'recent')

  function handleMoveUp(sectionId) {
    const idx = realSections.findIndex((s) => s.id === sectionId)
    if (idx <= 0) return
    const ids = realSections.map((s) => s.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    onReorderSections(ids)
  }

  function handleMoveDown(sectionId) {
    const idx = realSections.findIndex((s) => s.id === sectionId)
    if (idx < 0 || idx >= realSections.length - 1) return
    const ids = realSections.map((s) => s.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    onReorderSections(ids)
  }

  function handleTileClick(section) {
    if (editMode && section.id !== 'recent') {
      onEditSection(section)
    } else {
      onSelectSection(section)
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-6 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Zen Drills</h1>
          <p className="text-sm text-gray-400 mt-1">Daily PA practice</p>
        </div>
        <button
          onClick={() => setEditMode((m) => !m)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            editMode ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Resume banner */}
      {!editMode && savedSession && savedSectionObj && (() => {
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
      {!editMode && (
        <div className="mb-6 flex items-center gap-3 text-sm text-gray-500">
          {streak.current > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-orange-400 text-lg">{'\u{1F525}'}</span>
              <span>{streak.current} day streak</span>
            </div>
          )}
          {sessionSeconds > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-gray-300">{'\u23F1'}</span>
              <SessionTimer seconds={sessionSeconds} />
            </div>
          )}
        </div>
      )}

      {/* Overall progress (unique items) */}
      {!editMode && (
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
      )}

      {/* Section grid */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => {
          const isRecent = section.id === 'recent'
          const { done, total } = sectionProgress(section.id, section.items.length)
          const complete = done === total && total > 0
          const sectionReps = section.items.reduce((sum, item) => sum + getRepCount(section.id, item.id), 0)

          const realIdx = realSections.findIndex((s) => s.id === section.id)
          const isFirst = realIdx === 0
          const isLast = realIdx === realSections.length - 1

          return (
            <button
              key={section.id}
              onClick={() => handleTileClick(section)}
              className={`relative text-left p-5 rounded-2xl border transition-all active:scale-[0.97] min-h-[120px]
                ${complete && !editMode
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : editMode && !isRecent
                    ? 'border-gray-200 bg-gray-50/50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
            >
              {/* Edit mode: pencil icon (not on Recent) */}
              {editMode && !isRecent && (
                <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </span>
              )}

              {/* Edit mode: reorder arrows (not on Recent) */}
              {editMode && !isRecent && (
                <div className="absolute top-3 right-3 flex flex-col gap-0.5">
                  <span
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(section.id) }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer
                      ${isFirst ? 'opacity-20 pointer-events-none' : 'bg-gray-200 text-gray-500 hover:bg-gray-300 active:bg-gray-400'}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(section.id) }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer
                      ${isLast ? 'opacity-20 pointer-events-none' : 'bg-gray-200 text-gray-500 hover:bg-gray-300 active:bg-gray-400'}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              )}

              {/* Add item button (normal mode only, not edit mode) */}
              {!editMode && onAddItem && (
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
              {!editMode && (() => {
                const flaggedCount = section.items.filter((i) => i.flagged).length
                return flaggedCount > 0 ? (
                  <div className="text-[11px] text-amber-500 font-medium mt-0.5">{flaggedCount} flagged</div>
                ) : null
              })()}

              {!editMode && (
                <>
                  <div className="mt-3 flex items-center gap-2">
                    <ProgressBar done={done} total={total} className="flex-1" />
                    <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                      {done}/{total}
                    </span>
                  </div>
                  {sectionReps > done && (
                    <div className="mt-1 text-[11px] text-gray-300 text-right">{sectionReps} reps</div>
                  )}
                </>
              )}
            </button>
          )
        })}

        {/* Add Section card (edit mode only) */}
        {editMode && (
          <button
            onClick={onCreateSection}
            className="relative text-left p-5 rounded-2xl border-2 border-dashed border-gray-200 transition-all active:scale-[0.97] min-h-[120px] flex flex-col items-center justify-center hover:border-gray-300 hover:bg-gray-50"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">New Section</span>
          </button>
        )}
      </div>
    </div>
  )
}
