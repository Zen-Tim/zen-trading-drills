import { useState, useEffect, useCallback } from 'react'

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'zen-'
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function getToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function getToken() {
  let token = localStorage.getItem('zen-drills-token')
  if (!token) {
    token = generateToken()
    localStorage.setItem('zen-drills-token', token)
  }
  return token
}

export function setToken(newToken) {
  localStorage.setItem('zen-drills-token', newToken)
}

export function useProgress() {
  const [token] = useState(getToken)
  const [progress, setProgress] = useState({})
  const [streak, setStreak] = useState({ current: 0, lastDate: null })
  const [heatmap, setHeatmap] = useState({})
  const [loading, setLoading] = useState(true)

  const date = getToday()

  // Fetch progress, streak, and heatmap on mount
  useEffect(() => {
    async function load() {
      try {
        const [progressRes, streakRes, heatmapRes] = await Promise.all([
          fetch(`/api/progress?token=${token}&date=${date}`),
          fetch(`/api/progress?token=${token}&type=streak`),
          fetch(`/api/progress?token=${token}&type=heatmap`),
        ])
        const [progressData, streakData, heatmapData] = await Promise.all([
          progressRes.json(),
          streakRes.json(),
          heatmapRes.json(),
        ])
        setProgress(progressData)
        setStreak(streakData)
        setHeatmap(heatmapData)
      } catch (err) {
        console.error('Failed to load progress:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, date])

  const markDone = useCallback(
    async (sectionId, itemId) => {
      setProgress((prev) => {
        const sectionItems = prev[sectionId] || []
        if (sectionItems.includes(itemId)) return prev

        const next = { ...prev, [sectionId]: [...sectionItems, itemId] }

        // Fire and forget the API call
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, date, data: next }),
        })
          .then((r) => r.json())
          .then(() => {
            // Refresh streak after save
            fetch(`/api/progress?token=${token}&type=streak`)
              .then((r) => r.json())
              .then(setStreak)
              .catch(() => {})
          })
          .catch((err) => console.error('Failed to save progress:', err))

        return next
      })
    },
    [token, date]
  )

  const unmarkDone = useCallback(
    async (sectionId, itemId) => {
      setProgress((prev) => {
        const sectionItems = prev[sectionId] || []
        const next = {
          ...prev,
          [sectionId]: sectionItems.filter((id) => id !== itemId),
        }

        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, date, data: next }),
        }).catch((err) => console.error('Failed to save progress:', err))

        return next
      })
    },
    [token, date]
  )

  const isDone = useCallback(
    (sectionId, itemId) => {
      return (progress[sectionId] || []).includes(itemId)
    },
    [progress]
  )

  const sectionProgress = useCallback(
    (sectionId, totalItems) => {
      const done = (progress[sectionId] || []).length
      return { done, total: totalItems }
    },
    [progress]
  )

  const totalDone = Object.values(progress).reduce(
    (sum, items) => sum + items.length,
    0
  )

  return {
    token,
    progress,
    streak,
    heatmap,
    loading,
    markDone,
    unmarkDone,
    isDone,
    sectionProgress,
    totalDone,
    date,
  }
}
