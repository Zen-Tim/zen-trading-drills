import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import drillsData from '../data/drills.json'

export function useDrillContent(user) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const userId = user?.id

  // Handle no-user case
  useEffect(() => {
    if (!userId) {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function load() {
      try {
        // Load sections
        const { data: sectionRows, error: secErr } = await supabase
          .from('drill_sections')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order')

        if (secErr) throw secErr
        if (cancelled) return

        // If empty — first login, seed from drills.json
        if (!sectionRows || sectionRows.length === 0) {
          const seedSections = drillsData.sections.map((s, i) => ({
            id: s.id,
            title: s.title,
            subtitle: s.subtitle,
            icon: s.icon,
            sort_order: i,
            user_id: userId,
          }))

          const { error: seedSecErr } = await supabase
            .from('drill_sections')
            .insert(seedSections)

          if (seedSecErr) throw seedSecErr

          const seedItems = []
          drillsData.sections.forEach((s) => {
            s.items.forEach((item, itemIndex) => {
              seedItems.push({
                id: item.id,
                section_id: s.id,
                text: item.text,
                sort_order: itemIndex,
                user_id: userId,
              })
            })
          })

          const { error: seedItemErr } = await supabase
            .from('drill_items')
            .insert(seedItems)

          if (seedItemErr) throw seedItemErr
          if (cancelled) return

          // Re-query after seeding
          return load()
        }

        // Load items
        const { data: itemRows, error: itemErr } = await supabase
          .from('drill_items')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order')

        if (itemErr) throw itemErr
        if (cancelled) return

        // Assemble into drills.json shape
        const assembled = sectionRows.map((s) => ({
          ...s,
          items: (itemRows || [])
            .filter((i) => i.section_id === s.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        }))

        setSections(assembled)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || String(err))
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { sections, loading, error }
}
