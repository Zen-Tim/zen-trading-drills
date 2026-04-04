import { useState, useRef, useEffect } from 'react'
import ProgressBar from './ProgressBar'
import { ItemTimer } from './Timer'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

export default function DrillFlashcard({ section, items, isDone, markDone, unmarkDone, incrementRep, getRepCount, onBack, onNewRound, startItem, stopItem, getItemElapsed, initialIndex, onIndexChange, sessionSeconds, onEditItem, isRecent, toggleFlag }) {
  const getSid = (item) => item.section_id || section.id
  const [index, setIndex] = useState(initialIndex || 0)
  const [, setTick] = useState(0)
  const [showAgain, setShowAgain] = useState(false)
  const [plusOneKey, setPlusOneKey] = useState(0)
  const [undoItem, setUndoItem] = useState(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const touchStart = useRef(null)
  const againTimer = useRef(null)
  const undoTimerRef = useRef(null)

  // Report index changes to parent for session persistence
  useEffect(() => {
    onIndexChange?.(index)
  }, [index, onIndexChange])

  // Close lightbox when card changes
  useEffect(() => { setLightboxUrl(null) }, [index])

  const current = items[index]
  const doneCount = items.filter((item) => isDone(getSid(item), item.id)).length
  const allDone = doneCount === items.length && items.length > 0
  const currentIsDone = current ? isDone(getSid(current), current.id) : false
  const currentReps = current ? getRepCount(getSid(current), current.id) : 0

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

  // Clear undo timer on unmount
  useEffect(() => () => clearTimeout(undoTimerRef.current), [])

  function showAgainButton() {
    setShowAgain(true)
    if (againTimer.current) clearTimeout(againTimer.current)
    againTimer.current = setTimeout(() => setShowAgain(false), 3000)
  }

  function hideAgain() {
    setShowAgain(false)
    if (againTimer.current) clearTimeout(againTimer.current)
  }

  function showUndoToast(sectionId, itemId) {
    setUndoItem({ sectionId, itemId })
    clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 3000)
  }

  function handleUndo() {
    if (!undoItem) return
    unmarkDone(undoItem.sectionId, undoItem.itemId)
    setUndoItem(null)
    clearTimeout(undoTimerRef.current)
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
    incrementRep(getSid(current), current.id)
    setPlusOneKey((k) => k + 1)
    hideAgain()
  }

  // All done state — show completion summary
  if (allDone && index >= items.length - 1) {
    const totalReps = items.reduce((sum, item) => sum + getRepCount(getSid(item), item.id), 0)

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
        </div>

        {/* Progress */}
        <div className="px-4 pb-2">
          <ProgressBar done={doneCount} total={items.length} />
        </div>

        {/* Summary */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-xl font-semibold text-gray-800 mb-2">All items drilled!</p>
          <p className="text-sm text-gray-500 mb-1">
            {doneCount}/{items.length} done{totalReps > doneCount ? ` · ${totalReps} reps` : ''}
          </p>
          {sessionSeconds > 0 && (
            <p className="text-sm text-gray-400 mb-8">{formatTime(sessionSeconds)}</p>
          )}

          {!isRecent && (
            <button
              onClick={() => {
                stopItem()
                onNewRound()
                setIndex(0)
              }}
              className="w-full max-w-xs h-14 rounded-full bg-gray-900 text-white font-medium text-base active:scale-[0.97] transition-all mb-3"
            >
              New Round
            </button>
          )}
          <button
            onClick={onBack}
            className={`w-full max-w-xs h-14 rounded-full font-medium text-base active:scale-[0.97] transition-all ${
              isRecent ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'
            }`}
          >
            Done
          </button>
        </div>
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
          {/* Flag + Edit + Rep count badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {currentReps > 1 && (
              <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                x{currentReps}
              </span>
            )}
            {toggleFlag && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFlag(current.id) }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                style={{ minWidth: 44, minHeight: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg className={`w-5 h-5 ${current.flagged ? 'text-amber-500' : 'text-gray-400'}`} fill={current.flagged ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-18m0 0l2.5 1.5L8 3l2.5 1.5L13 3l2.5 1.5L18 3v12l-2.5 1.5L13 15l-2.5 1.5L8 15l-2.5 1.5L3 15" />
                </svg>
              </button>
            )}
            {onEditItem && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditItem(current) }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>

          {current.image_url && (
            <img
              src={current.image_url}
              alt=""
              className="max-h-48 mx-auto rounded-lg mb-3 object-contain cursor-pointer active:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(current.image_url) }}
            />
          )}
          <p className="text-lg font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{current.text}</p>

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

        {allDone && !isRecent ? (
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
                markDone(getSid(current), current.id)
                showAgainButton()
                showUndoToast(getSid(current), current.id)
              } else {
                incrementRep(getSid(current), current.id)
                setPlusOneKey((k) => k + 1)
                stopItem()
                setTimeout(() => next(), 400)
              }
            }}
            className={`flex-1 h-14 rounded-full font-medium text-base transition-all active:scale-[0.97]
              ${currentIsDone
                ? 'bg-gray-100 text-gray-500'
                : 'bg-gray-900 text-white'
              }`}
          >
            {currentIsDone ? '+1 Rep' : 'Mark Done'}
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

      {/* Undo toast */}
      {undoItem && (
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

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20 transition-colors"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            x
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
