import { useState } from 'react'
import drillsData from './data/drills.json'
import { useProgress } from './hooks/useProgress'
import { useShuffle } from './hooks/useShuffle'
import { useTimer } from './hooks/useTimer'
import SectionPicker from './components/SectionPicker'
import DrillFlashcard from './components/DrillFlashcard'
import DrillChecklist from './components/DrillChecklist'
import Heatmap from './components/Heatmap'
import Analytics from './components/Analytics'
import { SessionTimer } from './components/Timer'

const totalItems = drillsData.sections.reduce((sum, s) => sum + s.items.length, 0)

function DrillView({ section, mode, setMode, isDone, markDone, unmarkDone, onBack, onReshuffle, shuffledItems, stopItem, startItem, getItemElapsed, sessionSeconds }) {
  const isFlashcard = mode === 'flashcard'

  return (
    <div className={isFlashcard ? 'h-dvh flex flex-col bg-white' : 'min-h-dvh bg-white'}>
      {/* Mode toggle + reshuffle bar */}
      <div className="max-w-lg mx-auto px-4 pt-2 pb-1 flex items-center gap-2 bg-white sticky top-0 z-20">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setMode('flashcard')}
            className={`px-4 py-2 min-h-[36px] rounded-md transition-all ${
              mode === 'flashcard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setMode('checklist')}
            className={`px-4 py-2 min-h-[36px] rounded-md transition-all ${
              mode === 'checklist' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            List
          </button>
        </div>

        <SessionTimer seconds={sessionSeconds} />

        <button
          onClick={onReshuffle}
          className="ml-auto w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-50 active:bg-gray-100"
          title="Reshuffle"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20l5-5M20 4l-5 5" />
          </svg>
        </button>
      </div>

      {isFlashcard ? (
        <DrillFlashcard
          section={section}
          items={shuffledItems}
          isDone={isDone}
          markDone={markDone}
          onBack={onBack}
          startItem={startItem}
          stopItem={stopItem}
          getItemElapsed={getItemElapsed}
        />
      ) : (
        <DrillChecklist
          section={section}
          items={shuffledItems}
          isDone={isDone}
          markDone={markDone}
          unmarkDone={unmarkDone}
          onBack={onBack}
        />
      )}
    </div>
  )
}

function DrillSession({ section, isDone, markDone, unmarkDone, onBack, startItem, stopItem, getItemElapsed, sessionSeconds }) {
  const [mode, setMode] = useState('flashcard')
  const { shuffled, reshuffle } = useShuffle(section.items)

  return (
    <DrillView
      section={section}
      mode={mode}
      setMode={setMode}
      isDone={isDone}
      markDone={markDone}
      unmarkDone={unmarkDone}
      onBack={onBack}
      onReshuffle={reshuffle}
      shuffledItems={shuffled}
      startItem={startItem}
      stopItem={stopItem}
      getItemElapsed={getItemElapsed}
      sessionSeconds={sessionSeconds}
    />
  )
}

function BottomNav({ view, onNavigate }) {
  const tabs = [
    { id: 'home', label: 'Drills', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )},
    { id: 'heatmap', label: 'Activity', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'analytics', label: 'Analytics', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 min-h-[48px] py-2.5 transition-colors ${
              view === tab.id ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { token, sectionProgress, totalDone, streak, heatmap, analytics, timerData, loading, isDone, markDone, unmarkDone } = useProgress()
  const timer = useTimer(token)
  const [activeSection, setActiveSection] = useState(null)
  const [view, setView] = useState('home')

  function enterSection(section) {
    timer.startSession()
    setActiveSection(section)
  }

  function leaveSection() {
    timer.stopItem()
    timer.pauseSession()
    timer.saveTimer()
    setActiveSection(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (activeSection) {
    return (
      <DrillSession
        key={activeSection.id}
        section={activeSection}
        isDone={isDone}
        markDone={markDone}
        unmarkDone={unmarkDone}
        onBack={leaveSection}
        startItem={timer.startItem}
        stopItem={timer.stopItem}
        getItemElapsed={timer.getItemElapsed}
        sessionSeconds={timer.sessionSeconds}
      />
    )
  }

  return (
    <>
      <div className="pb-20">
        {view === 'home' && (
          <SectionPicker
            sections={drillsData.sections}
            sectionProgress={sectionProgress}
            totalDone={totalDone}
            totalItems={totalItems}
            streak={streak}
            onSelectSection={enterSection}
            sessionSeconds={timer.sessionSeconds}
          />
        )}
        {view === 'heatmap' && (
          <Heatmap heatmap={heatmap} />
        )}
        {view === 'analytics' && (
          <Analytics
            sections={drillsData.sections}
            heatmap={heatmap}
            analytics={analytics}
            timerData={timerData}
          />
        )}
      </div>
      <BottomNav view={view} onNavigate={setView} />
    </>
  )
}
