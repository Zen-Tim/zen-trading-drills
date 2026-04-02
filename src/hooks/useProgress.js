import { useState, useEffect, useCallback, useRef } from 'react'
import drillsData from '../data/drills.json'

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

// Apply migrations to a progress object: remap old IDs to new IDs, remove deleted IDs
function migrateProgress(progressData, migrations) {
  if (!migrations || Object.keys(migrations).length === 0) return { data: progressData, changed: false }

  let changed = false
  const migrated = {}

  for (const sectionId in progressData) {
    const items = progressData[sectionId]
    const newItems = []
    for (const itemId of items) {
      if (itemId in migrations) {
        changed = true
        const newId = migrations[itemId]
        // null means deleted — drop it; otherwise remap
        if (newId !== null && !newItems.includes(newId)) {
          newItems.push(newId)
        }
      } else {
        if (!newItems.includes(itemId)) {
          newItems.push(itemId)
        }
      }
    }
    migrated[sectionId] = newItems
  }

  return { data: migrated, changed }
}

// Apply migrations to analytics data
function migrateAnalytics(analyticsData, migrations) {
  if (!migrations || Object.keys(migrations).length === 0) return { data: analyticsData, changed: false }

  let changed = false
  const migrated = { ...analyticsData, itemLastDrilled: { ...analyticsData.itemLastDrilled } }

  for (const oldId in migrations) {
    if (oldId in migrated.itemLastDrilled) {
      const newId = migrations[oldId]
      const oldDate = migrated.itemLastDrilled[oldId]
      delete migrated.itemLastDrilled[oldId]
      changed = true

      if (newId !== null) {
        // Keep the more recent date if new ID already has an entry
        const existing = migrated.itemLastDrilled[newId]
        if (!existing || oldDate > existing) {
          migrated.itemLastDrilled[newId] = oldDate
        }
      }
    }
  }

  return { data: migrated, changed }
}

// Apply migrations to timer data
function migrateTimer(timerData, migrations) {
  if (!migrations || Object.keys(migrations).length === 0) return { data: timerData, changed: false }

  let changed = false
  const migrated = { ...timerData, items: { ...timerData.items } }

  for (const oldId in migrations) {
    if (oldId in migrated.items) {
      const newId = migrations[oldId]
      const oldTime = migrated.items[oldId]
      delete migrated.items[oldId]
      changed = true

      if (newId !== null) {
        migrated.items[newId] = (migrated.items[newId] || 0) + oldTime
      }
    }
  }

  return { data: migrated, changed }
}

export function useProgress() {
  const [token] = useState(getToken)
  const [progress, setProgress] = useState({})
  const [streak, setStreak] = useState({ current: 0, lastDate: null })
  const [heatmap, setHeatmap] = useState({})
  const [analytics, setAnalytics] = useState({ sectionCounts: {}, itemLastDrilled: {} })
  const [timerData, setTimerData] = useState({ sessionSeconds: 0, items: {} })
  const [loading, setLoading] = useState(true)
  const migratedRef = useRef(false)

  const date = getToday()
  const migrations = drillsData.migrations || {}

  // Fetch progress, streak, and heatmap on mount
  useEffect(() => {
    async function load() {
      try {
        const [progressRes, streakRes, heatmapRes, analyticsRes, timerRes] = await Promise.all([
          fetch(`/api/progress?token=${token}&date=${date}`),
          fetch(`/api/progress?token=${token}&type=streak`),
          fetch(`/api/progress?token=${token}&type=heatmap`),
          fetch(`/api/progress?token=${token}&type=analytics`),
          fetch(`/api/progress?token=${token}&type=timer&date=${date}`),
        ])
        let [progressData, streakData, heatmapData, analyticsData, timerDataRes] = await Promise.all([
          progressRes.json(),
          streakRes.json(),
          heatmapRes.json(),
          analyticsRes.json(),
          timerRes.json(),
        ])

        // Apply ID migrations if any exist
        if (Object.keys(migrations).length > 0 && !migratedRef.current) {
          migratedRef.current = true

          const progResult = migrateProgress(progressData, migrations)
          const analyticsResult = migrateAnalytics(analyticsData, migrations)
          const timerResult = migrateTimer(timerDataRes, migrations)

          if (progResult.changed) {
            progressData = progResult.data
            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, date, data: progressData }),
            }).catch((err) => console.error('Failed to save migrated progress:', err))
          }

          if (analyticsResult.changed) {
            analyticsData = analyticsResult.data
            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, type: 'analytics', data: analyticsData }),
            }).catch((err) => console.error('Failed to save migrated analytics:', err))
          }

          if (timerResult.changed) {
            timerDataRes = timerResult.data
            fetch('/api/progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, type: 'timer', date, data: timerDataRes }),
            }).catch((err) => console.error('Failed to save migrated timer:', err))
          }
        }

        setProgress(progressData)
        setStreak(streakData)
        setHeatmap(heatmapData)
        setAnalytics(analyticsData)
        setTimerData(timerDataRes)
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
    analytics,
    timerData,
    loading,
    markDone,
    unmarkDone,
    isDone,
    sectionProgress,
    totalDone,
    date,
  }
}
