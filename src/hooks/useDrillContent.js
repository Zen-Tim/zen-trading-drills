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

      // Clean up orphaned progress rows for this item
      await supabase
        .from('drill_progress')
        .delete()
        .eq('user_id', userId)
        .eq('item_id', itemId)

      // Update local state — remove from real section and from Recent
      setSections((prev) =>
        prev
          .map((s) =>
            s.id === sectionId || s.id === 'recent'
              ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
              : s
          )
          .filter((s) => s.id !== 'recent' || s.items.length > 0)
      )

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || String(err) }
    }
  }, [userId, sections])

  const updateItem = useCallback(async (itemId, newText, newImageFile, removeImage) => {
    try {
      const updates = { text: newText }

      // Handle image changes
      if (removeImage) {
        // Find old image to delete from storage
        const item = sections.flatMap((s) => s.items).find((i) => i.id === itemId)
        if (item?.image_url) {
          const path = `${userId}/${itemId}.${item.image_url.split('.').pop()}`
          await supabase.storage.from('drill-images').remove([path])
        }
        updates.image_url = null
      }

      if (newImageFile) {
        // Delete old image first
        const item = sections.flatMap((s) => s.items).find((i) => i.id === itemId)
        if (item?.image_url) {
          const path = `${userId}/${itemId}.${item.image_url.split('.').pop()}`
          await supabase.storage.from('drill-images').remove([path])
        }

        const ext = newImageFile.name.split('.').pop()
        const path = `${userId}/${itemId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('drill-images')
          .upload(path, newImageFile, { upsert: true })
        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('drill-images')
          .getPublicUrl(path)
        updates.image_url = urlData.publicUrl
      }

      const { error: updateErr } = await supabase
        .from('drill_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', userId)

      if (updateErr) throw updateErr

      // Update local state — update in all sections (including Recent mirror)
      setSections((prev) =>
        prev.map((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        }))
      )

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || String(err) }
    }
  }, [userId, sections])

  const reorderItems = useCallback(async (sectionId, orderedItemIds) => {
    try {
      // Build batch of sort_order updates
      const updates = orderedItemIds.map((id, index) => ({
        id,
        user_id: userId,
        sort_order: index,
      }))

      // Batch upsert sort_order values
      const { error: reorderErr } = await supabase
        .from('drill_items')
        .upsert(updates, { onConflict: 'id' })

      if (reorderErr) throw reorderErr

      // Update local state
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s
          const itemMap = new Map(s.items.map((i) => [i.id, i]))
          const reordered = orderedItemIds
            .map((id, index) => {
              const item = itemMap.get(id)
              return item ? { ...item, sort_order: index } : null
            })
            .filter(Boolean)
          return { ...s, items: reordered }
        })
      )

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || String(err) }
    }
  }, [userId])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    load()
  }, [load])

  return { sections, loading, error, addItem, deleteItem, updateItem, reorderItems, refetch }
}
