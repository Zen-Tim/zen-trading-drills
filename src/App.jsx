import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useDrillContent } from './hooks/useDrillContent'
import { useSupabaseProgress } from './hooks/useSupabaseProgress'
import { useShuffle } from './hooks/useShuffle'
import { useTimer } from './hooks/useTimer'
import { useSessionResume } from './hooks/useSessionResume'
import SectionPicker from './components/SectionPicker'
import DrillFlashcard from './components/DrillFlashcard'
import DrillChecklist from './components/DrillChecklist'
import Heatmap from './components/Heatmap'
import Analytics from './components/Analytics'
import Auth from './components/Auth'
import AddItemForm from './components/AddItemForm'
import EditItemForm from './components/EditItemForm'
import SectionForm from './components/SectionForm'
import { SessionTimer } from './components/Timer'

function DrillView({ section, mode, setMode, isDone, markDone, unmarkDone, incrementRep, getRepCount, onBack, onReshuffle, onNewRound, shuffledItems, stopItem, startItem, getItemElapsed, sessionSeconds, initialIndex, onIndexChange, onEditItem, onDeleteItem, onReorderItems, isRecent, toggleFlag }) {
  const isFlashcard = mode === 'flashcard'

  return (
    <div className={isFlashcard ? 'h-dvh flex flex-col bg-white' : 'min-h-dvh bg-white'}>
      {/* Mode toggle + reshuffle bar */}
      <div className="max-w-lg mx-auto px-4 pt-2 pb-1 flex items-center gap-2 bg-white sticky top-0 z-20">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm font-medium">
          <button
            onClick={() => setMode('flashcard')}
            className={`px-5 py-2.5 min-h-[48px] rounded-md transition-all ${
              mode === 'flashcard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setMode('checklist')}
            className={`px-5 py-2.5 min-h-[48px] rounded-md transition-all ${
              mode === 'checklist' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            List
          </button>
        </div>

        <SessionTimer seconds={sessionSeconds} />

        {!isRecent && (
          <button
            onClick={onNewRound}
            className="ml-auto px-4 min-h-[48px] flex items-center gap-1.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-sm font-medium text-gray-500"
            title="New Round"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20l5-5M20 4l-5 5" />
            </svg>
            New Round
          </button>
        )}
      </div>

      {isFlashcard ? (
        <DrillFlashcard
          section={section}
          items={shuffledItems}
          isDone={isDone}
          markDone={markDone}
          unmarkDone={unmarkDone}
          incrementRep={incrementRep}
          getRepCount={getRepCount}
          onBack={onBack}
          onNewRound={onNewRound}
          startItem={startItem}
          stopItem={stopItem}
          getItemElapsed={getItemElapsed}
          initialIndex={initialIndex}
          onIndexChange={onIndexChange}
          sessionSeconds={sessionSeconds}
          onEditItem={onEditItem}
          isRecent={isRecent}
          toggleFlag={toggleFlag}
        />
      ) : (
        <DrillChecklist
          section={section}
          items={shuffledItems}
          isDone={isDone}
          markDone={markDone}
          unmarkDone={unmarkDone}
          incrementRep={incrementRep}
          getRepCount={getRepCount}
          onBack={onBack}
          onNewRound={onNewRound}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          onReorderItems={onReorderItems}
          isRecent={isRecent}
          toggleFlag={toggleFlag}
        />
      )}
    </div>
  )
}

function DrillSession({ section, isDone, markDone, unmarkDone, incrementRep, getRepCount, onBack, startItem, stopItem, getItemElapsed, sessionSeconds, resumeState, onSessionChange, onEditItem, onDeleteItem, onReorderItems, isRecent, toggleFlag }) {
  const [mode, setMode] = useState(resumeState?.mode || 'flashcard')
  const { shuffled, reshuffle } = useShuffle(section.items, resumeState?.shuffleOrder, { weighted: true })
  const initialIndex = resumeState?.index || 0
  const indexRef = useRef(initialIndex)

  const handleIndexChange = useCallback((newIndex) => {
    indexRef.current = newIndex
    onSessionChange?.({ mode, index: newIndex, shuffleOrder: shuffled.map((i) => i.id) })
  }, [mode, shuffled, onSessionChange])

  // Notify parent whenever mode or shuffle changes
  useEffect(() => {
    onSessionChange?.({ mode, index: indexRef.current, shuffleOrder: shuffled.map((i) => i.id) })
  }, [mode, shuffled, onSessionChange])

  return (
    <DrillView
      section={section}
      mode={mode}
      setMode={setMode}
      isDone={isDone}
      markDone={markDone}
      unmarkDone={unmarkDone}
      incrementRep={incrementRep}
      getRepCount={getRepCount}
      onBack={onBack}
      onReshuffle={reshuffle}
      onNewRound={reshuffle}
      shuffledItems={shuffled}
      startItem={startItem}
      stopItem={stopItem}
      getItemElapsed={getItemElapsed}
      sessionSeconds={sessionSeconds}
      initialIndex={initialIndex}
      onIndexChange={handleIndexChange}
      onEditItem={onEditItem}
      onDeleteItem={onDeleteItem}
      onReorderItems={onReorderItems}
      isRecent={isRecent}
      toggleFlag={toggleFlag}
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
            className={`flex-1 flex flex-col items-center gap-0.5 min-h-[56px] py-3 transition-colors ${
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
  const { user, loading: authLoading, signOut } = useAuth()
  const { sections: drillSections, loading: contentLoading, error: contentError, addItem, deleteItem, updateItem, reorderItems, createSection, updateSection, deleteSection, reorderSections, toggleFlag, updateLastDrilled, refetch: refetchContent } = useDrillContent(user)
  const { token, progress, sectionProgress, totalDone, streak, heatmap, analytics, timerData, loading, isDone, markDone, unmarkDone, incrementRep, getRepCount, getUniqueCount, date, refetch } = useSupabaseProgress(user)

  const totalItems = drillSections.reduce((sum, s) => sum + s.items.length, 0)

  // Unique items done across all sections (for home progress bar)
  const uniqueDone = drillSections.reduce((sum, s) => sum + getUniqueCount(s.id), 0)
  const timer = useTimer(token)
  const [activeSection, setActiveSection] = useState(null)

  // Keep activeSection in sync when drillSections updates (e.g. after item edit)
  useEffect(() => {
    if (!activeSection) return
    const updated = drillSections.find((s) => s.id === activeSection.id)
    if (updated && updated !== activeSection) {
      setActiveSection(updated)
    }
  }, [drillSections, activeSection])

  const [resumeState, setResumeState] = useState(null)
  const [view, setView] = useState('home')
  const [addingToSection, setAddingToSection] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [creatingSectionMode, setCreatingSectionMode] = useState(false)
  const { savedSession, saveSession, clearSession, consumeSession } = useSessionResume()
  const sessionStateRef = useRef(null)

  const handleMarkDone = useCallback((sectionId, itemId) => {
    markDone(sectionId, itemId)
    updateLastDrilled(itemId)
  }, [markDone, updateLastDrilled])

  const handleIncrementRep = useCallback((sectionId, itemId) => {
    incrementRep(sectionId, itemId)
    updateLastDrilled(itemId)
  }, [incrementRep, updateLastDrilled])

  // Refetch KV data when switching to activity or analytics tabs
  const handleNavigate = useCallback((newView) => {
    setView(newView)
    if (newView === 'heatmap' || newView === 'analytics') {
      refetch()
    }
  }, [refetch])

  // Resolve saved session's sectionId to the actual section object
  const savedSectionObj = savedSession
    ? drillSections.find((s) => s.id === savedSession.sectionId)
    : null

  function enterSection(section, resume) {
    timer.startSession()
    if (resume) {
      setResumeState(resume)
    } else {
      setResumeState(null)
    }
    setActiveSection(section)
  }

  function handleResume() {
    const session = consumeSession()
    if (!session) return
    const section = drillSections.find((s) => s.id === session.sectionId)
    if (!section) return
    enterSection(section, {
      mode: session.mode,
      index: session.index,
      shuffleOrder: session.shuffleOrder,
    })
  }

  function handleStartFresh() {
    clearSession()
  }

  function leaveSection() {
    timer.stopItem()
    timer.pauseSession()
    timer.saveTimer()
    clearSession()
    setActiveSection(null)
    setResumeState(null)
  }

  // Save session state whenever the drill session reports changes
  const handleSessionChange = useCallback((state) => {
    sessionStateRef.current = state
    if (activeSection) {
      saveSession({
        sectionId: activeSection.id,
        mode: state.mode,
        index: state.index || 0,
        shuffleOrder: state.shuffleOrder || [],
      })
    }
  }, [activeSection, saveSession])

  if (authLoading || loading || contentLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (contentError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium mb-2">Failed to load drills</p>
          <p className="text-gray-400 text-xs">{contentError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">Retry</button>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  if (activeSection) {
    const isRecent = activeSection.id === 'recent'
    return (
      <>
        <DrillSession
          key={activeSection.id + (resumeState ? '-resume' : '')}
          section={activeSection}
          isDone={isDone}
          markDone={handleMarkDone}
          unmarkDone={unmarkDone}
          incrementRep={handleIncrementRep}
          getRepCount={getRepCount}
          onBack={leaveSection}
          startItem={timer.startItem}
          stopItem={timer.stopItem}
          getItemElapsed={timer.getItemElapsed}
          sessionSeconds={timer.sessionSeconds}
          resumeState={resumeState}
          onSessionChange={handleSessionChange}
          onEditItem={(item) => setEditingItem(item)}
          onDeleteItem={deleteItem}
          onReorderItems={reorderItems}
          isRecent={isRecent}
          toggleFlag={toggleFlag}
        />
        {editingItem && (
          <EditItemForm
            item={editingItem}
            sectionTitle={activeSection.title}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onClose={() => setEditingItem(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="pb-20">
        {view === 'home' && (
          <SectionPicker
            sections={drillSections}
            sectionProgress={sectionProgress}
            totalDone={uniqueDone}
            totalReps={totalDone}
            totalItems={totalItems}
            streak={streak}
            onSelectSection={enterSection}
            sessionSeconds={timer.sessionSeconds}
            getRepCount={getRepCount}
            getUniqueCount={getUniqueCount}
            savedSession={savedSession}
            savedSectionObj={savedSectionObj}
            onResume={handleResume}
            onStartFresh={handleStartFresh}
            onAddItem={(sectionId) => setAddingToSection(sectionId)}
            onEditSection={(section) => setEditingSection(section)}
            onCreateSection={() => setCreatingSectionMode(true)}
            onReorderSections={reorderSections}
          />
        )}
        {view === 'heatmap' && (
          <Heatmap heatmap={heatmap} todayCount={totalDone} todayKey={date} />
        )}
        {view === 'analytics' && (
          <Analytics
            sections={drillSections}
            heatmap={heatmap}
            analytics={analytics}
            timerData={timerData}
          />
        )}
      </div>
      <BottomNav view={view} onNavigate={handleNavigate} />
      <button
        onClick={signOut}
        className="fixed bottom-0 right-2 text-[10px] text-gray-300 hover:text-gray-500 transition-colors z-40 pb-1"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}
      >
        Sign out
      </button>
      {addingToSection && (
        <AddItemForm
          sectionId={addingToSection}
          sectionTitle={drillSections.find(s => s.id === addingToSection)?.title || ''}
          onAdd={addItem}
          onClose={() => setAddingToSection(null)}
        />
      )}
      {editingItem && !activeSection && (
        <EditItemForm
          item={editingItem}
          sectionTitle={drillSections.find(s => s.items.some(i => i.id === editingItem.id))?.title || ''}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      {editingSection && (
        <SectionForm
          section={editingSection}
          onSave={updateSection}
          onDelete={async (sectionId) => {
            const result = await deleteSection(sectionId)
            if (result.success && activeSection?.id === sectionId) {
              leaveSection()
            }
            return result
          }}
          onClose={() => setEditingSection(null)}
        />
      )}
      {creatingSectionMode && (
        <SectionForm
          onSave={createSection}
          onClose={() => setCreatingSectionMode(false)}
        />
      )}
    </>
  )
}
