import { useState, useEffect, useCallback } from 'react'
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

  const load = useCallback(async () => {
    if (!userId) return

    try {
      // Load sections
      const { data: sectionRows, error: secErr } = await supabase
        .from('drill_sections')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order')

      if (secErr) throw secErr

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

      // Assemble into drills.json shape
      let assembled = sectionRows.map((s) => ({
        ...s,
        items: (itemRows || [])
          .filter((i) => i.section_id === s.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }))

      // Build virtual "Recent" section from non-seeded items
      const allItems = assembled.flatMap((s) => s.items)
      if (allItems.length > 0) {
        const timestamps = allItems
          .map((i) => i.created_at ? new Date(i.created_at).getTime() : 0)
          .filter((t) => t > 0)

        if (timestamps.length > 0) {
          const earliest = Math.min(...timestamps)
          const cutoff = earliest + 60000 // 60 seconds after earliest = after seed batch

          const recentItems = allItems
            .filter((i) => i.created_at && new Date(i.created_at).getTime() > cutoff)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((i) => ({ ...i })) // shallow copy

          if (recentItems.length > 0) {
            assembled = [
              {
                id: 'recent',
                title: 'Recent',
                subtitle: 'Recently added',
                icon: '\u{1F195}',
                sort_order: -1,
                items: recentItems,
              },
              ...assembled,
            ]
          }
        }
      }

      setSections(assembled)
      setLoading(false)
    } catch (err) {
      setError(err.message || String(err))
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    load()
  }, [userId, load])

  const addItem = useCallback(async (sectionId, text, imageFile) => {
    try {
      const itemId = sectionId + '-' + Date.now()
      let imageUrl = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${userId}/${itemId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('drill-images')
          .upload(path, imageFile)

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('drill-images')
          .getPublicUrl(path)

        imageUrl = urlData.publicUrl
      }

      // Find max sort_order for this section
      const currentSection = sections.find((s) => s.id === sectionId)
      const maxOrder = currentSection?.items?.length
        ? Math.max(...currentSection.items.map((i) => i.sort_order))
        : -1

      const newItem = {
        id: itemId,
        section_id: sectionId,
        text,
        image_url: imageUrl,
        sort_order: maxOrder + 1,
        user_id: userId,
      }

      const { error: insertErr } = await supabase
        .from('drill_items')
        .insert([newItem])

      if (insertErr) throw insertErr

      // Update local state
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, items: [...s.items, newItem] }
            : s
        )
      )

      return { success: true, item: newItem }
    } catch (err) {
      return { success: false, error: err.message || String(err) }
    }
  }, [userId, sections])

  const deleteItem = useCallback(async (sectionId, itemId) => {
    try {
      // Find the item to check for image
      const section = sections.find((s) => s.id === sectionId)
      const item = section?.items?.find((i) => i.id === itemId)

      const { error: delErr } = await supabase
        .from('drill_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId)

      if (delErr) throw delErr

      // Delete image from storage if exists
      if (item?.image_url) {
        const path = `${userId}/${itemId}.${item.image_url.split('.').pop()}`
        await supabase.storage.from('drill-images').remove([path])
      }

      // Update local state
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
            : s
        )
      )

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || String(err) }
    }
  }, [userId, sections])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    load()
  }, [load])

  return { sections, loading, error, addItem, deleteItem, refetch }
}
