import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'zen-drills-session'

function getToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    // Discard if from a different day
    if (session.date !== getToday()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function useSessionResume() {
  const [savedSession, setSavedSession] = useState(() => loadSession())
  const debounceRef = useRef(null)

  // Check for midnight rollover — clear stale session
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const current = loadSession()
      if (!current && savedSession) setSavedSession(null)
    }, 60000) // check every minute
    return () => clearInterval(checkMidnight)
  }, [savedSession])

  const saveSession = useCallback((state) => {
    // Debounce writes to avoid hammering localStorage on every card advance
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const session = { ...state, date: getToday() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    }, 300)
  }, [])

  const clearSession = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    localStorage.removeItem(STORAGE_KEY)
    setSavedSession(null)
  }, [])

  const consumeSession = useCallback(() => {
    const session = savedSession
    setSavedSession(null)
    return session
  }, [savedSession])

  return { savedSession, saveSession, clearSession, consumeSession }
}
