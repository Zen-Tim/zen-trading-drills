import { useState, useRef } from 'react'
import ProgressBar from './ProgressBar'

export default function DrillFlashcard({ section, items, isDone, markDone, onBack }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef(null)

  const current = items[index]
  const doneCount = items.filter((item) => isDone(section.id, item.id)).length
  const currentIsDone = current ? isDone(section.id, current.id) : false

  function next() {
    if (index < items.length - 1) setIndex(index + 1)
  }

  function prev() {
    if (index > 0) setIndex(index - 1)
  }

  function handleTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStart.current === null) return
    const diff = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev()
      else next()
    }
    touchStart.current = null
  }

  if (!current) return null

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 active:bg-gray-100 -ml-2"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{section.icon} {section.title}</div>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{index + 1} / {items.length}</span>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <ProgressBar done={doneCount} total={items.length} />
      </div>

      {/* Card area */}
      <div
        className="flex-1 flex items-center justify-center px-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`w-full p-8 rounded-3xl border text-center transition-all
          ${currentIsDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/30'}`}
        >
          <p className="text-lg font-medium text-gray-800 leading-relaxed">{current.text}</p>
          {currentIsDone && (
            <span className="inline-block mt-4 text-xs font-medium text-emerald-500 uppercase tracking-wide">Done</span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-8 pt-4 flex items-center gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-30 active:bg-gray-50"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => {
            if (!currentIsDone) markDone(section.id, current.id)
            next()
          }}
          className={`flex-1 h-12 rounded-full font-medium text-sm transition-all active:scale-[0.97]
            ${currentIsDone
              ? 'bg-gray-100 text-gray-500'
              : 'bg-gray-900 text-white'
            }`}
        >
          {currentIsDone ? 'Next' : 'Mark Done'}
        </button>

        <button
          onClick={next}
          disabled={index === items.length - 1}
          className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 disabled:opacity-30 active:bg-gray-50"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
