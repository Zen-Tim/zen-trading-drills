import { useState, useEffect, useCallback, useRef } from 'react'
import drillsData from '../data/drills.json'

function getToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function getToken() {
  localStorage.setItem('zen-drills-token', 'zen-tim')
  return 'zen-tim'
}

// Convert old array-format progress to count-map format
// Old: { "htf": ["htf-001", "htf-003"] }
// New: { "htf": { "htf-001": 1, "htf-003": 1 } }
function migrateArrayToCountMap(progressData) {
  let changed = false
  const migrated = {}

  for (const sectionId in progressData) {
    const items = progressData[sectionId]
    if (Array.isArray(items)) {
      changed = true
      const countMap = {}
      for (const itemId of items) {
        countMap[itemId] = 1
      }
      migrated[sectionId] = countMap
    } else {
      migrated[sectionId] = items
    }
  }

  return { data: migrated, changed }
}

// Apply migrations to a progress object: remap old IDs to new IDs, remove deleted IDs
function migrateProgress(progressData, migrations) {
  if (!migrations || Object.keys(migrations).length === 0) return { data: progressData, changed: false }

  let changed = false
  const migrated = {}

  for (const sectionId in progressData) {
    const items = progressData[sectionId]
    const newItems = {}
    for (const itemId in items) {
      const count = items[itemId]
      if (itemId in migrations) {
        changed = true
        const newId = migrations[itemId]
        // null means deleted — drop it; otherwise remap
        if (newId !== null) {
          newItems[newId] = (newItems[newId] || 0) + count
        }
      } else {
        newItems[itemId] = (newItems[itemId] || 0) + count
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

        // Auto-migrate old array format to count map format
        const arrayMigration = migrateArrayToCountMap(progressData)
        if (arrayMigration.changed) {
          progressData = arrayMigration.data
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, date, data: progressData }),
          }).catch((err) => console.error('Failed to save array-to-countmap migration:', err))
        }

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

  const incrementRep = useCallback(
    (sectionId, itemId) => {
      setProgress((prev) => {
        const sectionItems = prev[sectionId] || {}
        const next = {
          ...prev,
          [sectionId]: { ...sectionItems, [itemId]: (sectionItems[itemId] || 0) + 1 },
        }

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

  const markDone = useCallback(
    (sectionId, itemId) => {
      incrementRep(sectionId, itemId)
    },
    [incrementRep]
  )

  const unmarkDone = useCallback(
    (sectionId, itemId) => {
      setProgress((prev) => {
        const sectionItems = { ...(prev[sectionId] || {}) }
        delete sectionItems[itemId]
        const next = { ...prev, [sectionId]: sectionItems }

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

  const getRepCount = useCallback(
    (sectionId, itemId) => {
      const section = progress[sectionId]
      if (!section) return 0
      return section[itemId] || 0
    },
    [progress]
  )

  const getUniqueCount = useCallback(
    (sectionId) => {
      const section = progress[sectionId]
      if (!section) return 0
      return Object.values(section).filter((c) => c >= 1).length
    },
    [progress]
  )

  const isDone = useCallback(
    (sectionId, itemId) => {
      return getRepCount(sectionId, itemId) >= 1
    },
    [getRepCount]
  )

  const sectionProgress = useCallback(
    (sectionId, totalItems) => {
      const done = getUniqueCount(sectionId)
      return { done, total: totalItems }
    },
    [getUniqueCount]
  )

  // Total reps across all sections (sum of all counts)
  const totalDone = Object.values(progress).reduce(
    (sum, section) => sum + Object.values(section || {}).reduce((s, c) => s + c, 0),
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
    incrementRep,
    getRepCount,
    getUniqueCount,
    isDone,
    sectionProgress,
    totalDone,
    date,
  }
}
