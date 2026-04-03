import { useState, useRef, useEffect } from 'react'
import ProgressBar from './ProgressBar'
import { ItemTimer } from './Timer'

export default function DrillFlashcard({ section, items, isDone, markDone, incrementRep, getRepCount, onBack, onNewRound, startItem, stopItem, getItemElapsed, initialIndex, onIndexChange }) {
  const [index, setIndex] = useState(initialIndex || 0)
  const [, setTick] = useState(0)
  const [showAgain, setShowAgain] = useState(false)
  const [plusOneKey, setPlusOneKey] = useState(0)
  const touchStart = useRef(null)
  const againTimer = useRef(null)

  // Report index changes to parent for session persistence
  useEffect(() => {
    onIndexChange?.(index)
  }, [index, onIndexChange])

  const current = items[index]
  const doneCount = items.filter((item) => isDone(section.id, item.id)).length
  const allDone = doneCount === items.length && items.length > 0
  const currentIsDone = current ? isDone(section.id, current.id) : false
  const currentReps = current ? getRepCount(section.id, current.id) : 0

  // Start timer for current item
  useEffect(() => {
    if (current) startItem(current.id)
  }, [current, startItem])

  // Tick every second to update displayed item time
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Clear again timer on unmount or card change
  useEffect(() => {
    return () => {
      if (againTimer.current) clearTimeout(againTimer.current)
    }
  }, [index])

  function showAgainButton() {
    setShowAgain(true)
    if (againTimer.current) clearTimeout(againTimer.current)
    againTimer.current = setTimeout(() => setShowAgain(false), 3000)
  }

  function hideAgain() {
    setShowAgain(false)
    if (againTimer.current) clearTimeout(againTimer.current)
  }

  function next() {
    hideAgain()
    if (index < items.length - 1) setIndex(index + 1)
  }

  function prev() {
    hideAgain()
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

  function handleAgain() {
    incrementRep(section.id, current.id)
    setPlusOneKey((k) => k + 1)
    hideAgain()
  }

  // All done state — show New Round
  if (allDone && !current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-medium text-gray-800 mb-4">All items drilled!</p>
        <button
          onClick={onNewRound}
          className="w-full max-w-xs h-14 rounded-full bg-gray-900 text-white font-medium text-base active:scale-[0.97] transition-all"
        >
          New Round
        </button>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Top bar */}
      <div className="px-4 pt-1 pb-1 flex items-center gap-2">
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
        <ItemTimer seconds={getItemElapsed(current.id)} />
        <span className="text-xs text-gray-400 tabular-nums ml-1">{index + 1}/{items.length}</span>
      </div>

      {/* Progress */}
      <div className="px-4 pb-2">
        <ProgressBar done={doneCount} total={items.length} />
      </div>

      {/* Card area */}
      <div
        className="flex-1 flex items-center justify-center px-4 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`w-full p-5 rounded-2xl border text-center transition-all relative
          ${currentIsDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/30'}`}
        >
          {/* Rep count badge */}
          {currentReps > 1 && (
            <span className="absolute top-3 right-3 text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
              x{currentReps}
            </span>
          )}

          <p className="text-lg font-medium text-gray-800 leading-relaxed">{current.text}</p>

          {currentIsDone && (
            <span className="inline-block mt-2 text-xs font-medium text-emerald-500 uppercase tracking-wide">Done</span>
          )}

          {/* +1 animation */}
          {plusOneKey > 0 && (
            <span key={plusOneKey} className="plus-one absolute top-3 left-1/2 -translate-x-1/2 text-sm font-semibold text-emerald-500">
              +1
            </span>
          )}
        </div>
      </div>

      {/* Again button (appears after marking done) */}
      <div className="h-10 flex items-center justify-center">
        {showAgain && currentIsDone && (
          <button
            onClick={handleAgain}
            className="again-btn px-4 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Again
          </button>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="min-w-[56px] h-14 flex items-center justify-center gap-1 rounded-full border border-gray-100 disabled:opacity-30 active:bg-gray-50 px-3"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm text-gray-500">Prev</span>
        </button>

        {allDone ? (
          <button
            onClick={() => {
              stopItem()
              onNewRound()
              setIndex(0)
            }}
            className="flex-1 h-14 rounded-full font-medium text-base transition-all active:scale-[0.97] bg-gray-900 text-white"
          >
            New Round
          </button>
        ) : (
          <button
            onClick={() => {
              if (!currentIsDone) {
                markDone(section.id, current.id)
                showAgainButton()
              } else {
                stopItem()
                next()
              }
            }}
            className={`flex-1 h-14 rounded-full font-medium text-base transition-all active:scale-[0.97]
              ${currentIsDone
                ? 'bg-gray-100 text-gray-500'
                : 'bg-gray-900 text-white'
              }`}
          >
            {currentIsDone ? 'Next' : 'Mark Done'}
          </button>
        )}

        <button
          onClick={next}
          disabled={index === items.length - 1}
          className="min-w-[56px] h-14 flex items-center justify-center gap-1 rounded-full border border-gray-100 disabled:opacity-30 active:bg-gray-50 px-3"
        >
          <span className="text-sm text-gray-500">Next</span>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
