import { useState, useRef, useEffect } from 'react'
import ProgressBar from './ProgressBar'

export default function DrillChecklist({ section, items, isDone, markDone, unmarkDone, incrementRep, getRepCount, onBack, onNewRound }) {
  const getSid = (item) => item.section_id || section.id

  const doneCount = items.filter((item) => isDone(getSid(item), item.id)).length
  const allDone = doneCount === items.length && items.length > 0

  const [lastAction, setLastAction] = useState(null)
  const undoTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(undoTimerRef.current), [])

  function handleItemClick(item) {
    const sid = getSid(item)
    if (isDone(sid, item.id)) {
      incrementRep(sid, item.id)
      setLastAction({ type: 'incrementRep', sectionId: sid, itemId: item.id, timestamp: Date.now() })
    } else {
      markDone(sid, item.id)
      setLastAction({ type: 'markDone', sectionId: sid, itemId: item.id, timestamp: Date.now() })
    }
    clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setLastAction(null), 3000)
  }

  function handleUndo() {
    if (!lastAction) return
    unmarkDone(lastAction.sectionId, lastAction.itemId)
    setLastAction(null)
    clearTimeout(undoTimerRef.current)
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <button
          onClick={onBack}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 -ml-2"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-gray-900 truncate">{section.icon} {section.title}</div>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{doneCount} / {items.length}</span>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <ProgressBar done={doneCount} total={items.length} />
      </div>

      {/* Item list */}
      <div className="px-4 pb-12">
        <ul className="space-y-1">
          {items.map((item) => {
            const done = isDone(getSid(item), item.id)
            const reps = getRepCount(getSid(item), item.id)

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-4 min-h-[56px] rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]
                    ${done ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Checkbox */}
                  <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${done ? 'bg-emerald-400 border-emerald-400' : 'border-gray-200'}`}
                  >
                    {done && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>

                  {/* Thumbnail */}
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                  )}

                  {/* Text */}
                  <span className={`flex-1 text-base leading-snug transition-all
                    ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                  >
                    {item.text}
                  </span>

                  {/* Rep count badge (only show x2+) */}
                  {reps > 1 && (
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
                      x{reps}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {/* New Round button — always visible */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onNewRound}
            className={`w-full max-w-xs h-14 rounded-full font-medium text-base active:scale-[0.97] transition-all
              ${allDone
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 text-gray-500'
              }`}
          >
            New Round
          </button>
        </div>
      </div>

      {/* Undo toast */}
      {lastAction && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg active:scale-[0.97] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
