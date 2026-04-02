import { useState } from 'react'
import drillsData from './data/drills.json'
import { useProgress } from './hooks/useProgress'
import { useShuffle } from './hooks/useShuffle'
import SectionPicker from './components/SectionPicker'
import DrillFlashcard from './components/DrillFlashcard'
import DrillChecklist from './components/DrillChecklist'

const totalItems = drillsData.sections.reduce((sum, s) => sum + s.items.length, 0)

function DrillView({ section, mode, setMode, isDone, markDone, unmarkDone, onBack, onReshuffle, shuffledItems }) {
  return (
    <>
      {/* Mode toggle + reshuffle bar */}
      <div className="max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center gap-2 bg-white sticky top-0 z-20">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setMode('flashcard')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              mode === 'flashcard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setMode('checklist')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              mode === 'checklist' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            List
          </button>
        </div>

        <button
          onClick={onReshuffle}
          className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 active:bg-gray-100"
          title="Reshuffle"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20l5-5M20 4l-5 5" />
          </svg>
        </button>
      </div>

      {mode === 'flashcard' ? (
        <DrillFlashcard
          section={section}
          items={shuffledItems}
          isDone={isDone}
          markDone={markDone}
          onBack={onBack}
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
    </>
  )
}

function DrillSession({ section, isDone, markDone, unmarkDone, onBack }) {
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
    />
  )
}

export default function App() {
  const { sectionProgress, totalDone, streak, loading, isDone, markDone, unmarkDone } = useProgress()
  const [activeSection, setActiveSection] = useState(null)

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
        onBack={() => setActiveSection(null)}
      />
    )
  }

  return (
    <SectionPicker
      sections={drillsData.sections}
      sectionProgress={sectionProgress}
      totalDone={totalDone}
      totalItems={totalItems}
      streak={streak}
      onSelectSection={setActiveSection}
    />
  )
}
