import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function getToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export function useSupabaseProgress(user) {
  const [progress, setProgress] = useState({})
  const [streak, setStreak] = useState({ current: 0, lastDate: null })
  const [heatmap, setHeatmap] = useState({})
  const [loading, setLoading] = useState(true)

  const date = getToday()
  const userId = user?.id

  // Load all data on mount
  useEffect(() => {
    if (!userId) return
    async function load() {
      try {
        // Load today's progress
        const { data: progressRows } = await supabase
          .from('drill_progress')
          .select('section_id, item_id, rep_count')
          .eq('user_id', userId)
          .eq('drill_date', date)

        const progressData = {}
        if (progressRows) {
          for (const row of progressRows) {
            if (!progressData[row.section_id]) progressData[row.section_id] = {}
            progressData[row.section_id][row.item_id] = row.rep_count
          }
        }
        setProgress(progressData)

        // Load streak
        const { data: streakRow } = await supabase
          .from('drill_streak')
          .select('current_streak, last_date')
          .eq('user_id', userId)
          .single()

        if (streakRow) {
          setStreak({ current: streakRow.current_streak, lastDate: streakRow.last_date })
        }

        // Load heatmap
        const { data: heatmapRows } = await supabase
          .from('drill_heatmap')
          .select('drill_date, total_reps')
          .eq('user_id', userId)
          .order('drill_date')

        const heatmapData = {}
        if (heatmapRows) {
          for (const row of heatmapRows) {
            heatmapData[row.drill_date] = row.total_reps
          }
        }
        setHeatmap(heatmapData)
      } catch (err) {
        console.error('Failed to load Supabase progress:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, date])

  // Update streak after a rep
  const updateStreak = useCallback(async () => {
    if (!userId) return
    try {
      const { data: existing } = await supabase
        .from('drill_streak')
        .select('current_streak, last_date')
        .eq('user_id', userId)
        .single()

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`

      let newStreak
      if (!existing) {
        newStreak = { current_streak: 1, last_date: date }
      } else if (existing.last_date === date) {
        // Already updated today
        return
      } else if (existing.last_date === yesterdayStr) {
        newStreak = { current_streak: existing.current_streak + 1, last_date: date }
      } else {
        newStreak = { current_streak: 1, last_date: date }
      }

      await supabase
        .from('drill_streak')
        .upsert({ user_id: userId, ...newStreak }, { onConflict: 'user_id' })

      setStreak({ current: newStreak.current_streak, lastDate: newStreak.last_date })
    } catch (err) {
      console.error('Failed to update streak:', err)
    }
  }, [userId, date])

  // Update heatmap after a rep
  const updateHeatmap = useCallback(async () => {
    if (!userId) return
    try {
      await supabase
        .from('drill_heatmap')
        .upsert(
          { user_id: userId, drill_date: date, total_reps: 1 },
          { onConflict: 'user_id,drill_date', ignoreDuplicates: false }
        )

      // For the upsert increment, we need raw SQL or an RPC. Use a simpler approach:
      // Read current value and write back
      const { data: existing } = await supabase
        .from('drill_heatmap')
        .select('total_reps')
        .eq('user_id', userId)
        .eq('drill_date', date)
        .single()

      if (existing) {
        // The upsert above set it to 1 if new, but if it existed we need to increment
        // Re-read to get current count from progress table
        const { count } = await supabase
          .from('drill_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('drill_date', date)

        // Sum all reps for today
        const { data: todayRows } = await supabase
          .from('drill_progress')
          .select('rep_count')
          .eq('user_id', userId)
          .eq('drill_date', date)

        const totalReps = todayRows
          ? todayRows.reduce((sum, r) => sum + r.rep_count, 0)
          : 1

        await supabase
          .from('drill_heatmap')
          .upsert(
            { user_id: userId, drill_date: date, total_reps: totalReps },
            { onConflict: 'user_id,drill_date' }
          )

        setHeatmap((prev) => ({ ...prev, [date]: totalReps }))
      }
    } catch (err) {
      console.error('Failed to update heatmap:', err)
    }
  }, [userId, date])

  const incrementRep = useCallback(
    async (sectionId, itemId) => {
      if (!userId) return

      // Optimistic local update
      setProgress((prev) => {
        const sectionItems = prev[sectionId] || {}
        return {
          ...prev,
          [sectionId]: { ...sectionItems, [itemId]: (sectionItems[itemId] || 0) + 1 },
        }
      })

      // Upsert to Supabase - increment rep_count
      try {
        const { data: existing } = await supabase
          .from('drill_progress')
          .select('rep_count')
          .eq('user_id', userId)
          .eq('drill_date', date)
          .eq('section_id', sectionId)
          .eq('item_id', itemId)
          .single()

        const newCount = existing ? existing.rep_count + 1 : 1

        await supabase
          .from('drill_progress')
          .upsert(
            {
              user_id: userId,
              drill_date: date,
              section_id: sectionId,
              item_id: itemId,
              rep_count: newCount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,drill_date,section_id,item_id' }
          )

        // Update streak and heatmap in background
        updateStreak()
        updateHeatmap()
      } catch (err) {
        console.error('Failed to increment rep:', err)
      }
    },
    [userId, date, updateStreak, updateHeatmap]
  )

  const markDone = useCallback(
    (sectionId, itemId) => {
      incrementRep(sectionId, itemId)
    },
    [incrementRep]
  )

  const unmarkDone = useCallback(
    async (sectionId, itemId) => {
      if (!userId) return

      // Optimistic local update
      setProgress((prev) => {
        const sectionItems = { ...(prev[sectionId] || {}) }
        delete sectionItems[itemId]
        return { ...prev, [sectionId]: sectionItems }
      })

      try {
        await supabase
          .from('drill_progress')
          .delete()
          .eq('user_id', userId)
          .eq('drill_date', date)
          .eq('section_id', sectionId)
          .eq('item_id', itemId)

        updateHeatmap()
      } catch (err) {
        console.error('Failed to unmark:', err)
      }
    },
    [userId, date, updateHeatmap]
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

  const totalDone = Object.values(progress).reduce(
    (sum, section) => sum + Object.values(section || {}).reduce((s, c) => s + c, 0),
    0
  )

  const refetch = useCallback(async () => {
    if (!userId) return
    try {
      const [streakRes, heatmapRes] = await Promise.all([
        supabase
          .from('drill_streak')
          .select('current_streak, last_date')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('drill_heatmap')
          .select('drill_date, total_reps')
          .eq('user_id', userId)
          .order('drill_date'),
      ])

      if (streakRes.data) {
        setStreak({ current: streakRes.data.current_streak, lastDate: streakRes.data.last_date })
      }

      if (heatmapRes.data) {
        const heatmapData = {}
        for (const row of heatmapRes.data) {
          heatmapData[row.drill_date] = row.total_reps
        }
        setHeatmap(heatmapData)
      }
    } catch (err) {
      console.error('Failed to refetch Supabase data:', err)
    }
  }, [userId])

  return {
    token: userId,
    progress,
    streak,
    heatmap,
    analytics: { sectionCounts: {}, itemLastDrilled: {} },
    timerData: { sessionSeconds: 0, items: {} },
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
    refetch,
  }
}
