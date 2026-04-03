import { useState, useEffect, useRef, useCallback } from 'react'

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function useTimer(token) {
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [itemTimes, setItemTimes] = useState({})
  const [activeItemId, setActiveItemId] = useState(null)
  const itemStartRef = useRef(null)
  const sessionRef = useRef(null)
  const date = getToday()

  // Load persisted timer data on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`zen-timer-${date}`)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.sessionSeconds) setSessionSeconds(data.sessionSeconds)
        if (data.items) setItemTimes(data.items)
      }
    } catch {}
  }, [date])

  // Session timer: tick every second while in a drill section
  const startSession = useCallback(() => {
    if (sessionRef.current) return
    sessionRef.current = setInterval(() => {
      setSessionSeconds((s) => s + 1)
    }, 1000)
  }, [])

  const pauseSession = useCallback(() => {
    if (sessionRef.current) {
      clearInterval(sessionRef.current)
      sessionRef.current = null
    }
  }, [])

  // Per-item: start timing an item (flashcard mode only)
  const startItem = useCallback((itemId) => {
    if (activeItemId && itemStartRef.current) {
      const elapsed = Math.round((Date.now() - itemStartRef.current) / 1000)
      setItemTimes((prev) => ({
        ...prev,
        [activeItemId]: (prev[activeItemId] || 0) + elapsed,
      }))
    }
    setActiveItemId(itemId)
    itemStartRef.current = Date.now()
  }, [activeItemId])

  // Stop timing current item
  const stopItem = useCallback(() => {
    if (activeItemId && itemStartRef.current) {
      const elapsed = Math.round((Date.now() - itemStartRef.current) / 1000)
      setItemTimes((prev) => ({
        ...prev,
        [activeItemId]: (prev[activeItemId] || 0) + elapsed,
      }))
    }
    setActiveItemId(null)
    itemStartRef.current = null
  }, [activeItemId])

  // Get elapsed seconds for the currently active item (live)
  const getItemElapsed = useCallback((itemId) => {
    const stored = itemTimes[itemId] || 0
    if (itemId === activeItemId && itemStartRef.current) {
      return stored + Math.round((Date.now() - itemStartRef.current) / 1000)
    }
    return stored
  }, [itemTimes, activeItemId])

  // Persist timer data to localStorage
  const saveTimer = useCallback(() => {
    try {
      let items = { ...itemTimes }
      if (activeItemId && itemStartRef.current) {
        const elapsed = Math.round((Date.now() - itemStartRef.current) / 1000)
        items[activeItemId] = (items[activeItemId] || 0) + elapsed
      }
      localStorage.setItem(`zen-timer-${date}`, JSON.stringify({ sessionSeconds, items }))
    } catch {}
  }, [date, sessionSeconds, itemTimes, activeItemId])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveTimer, 30000)
    return () => clearInterval(interval)
  }, [saveTimer])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) clearInterval(sessionRef.current)
    }
  }, [])

  return {
    sessionSeconds,
    itemTimes,
    startSession,
    pauseSession,
    startItem,
    stopItem,
    getItemElapsed,
    saveTimer,
  }
}
