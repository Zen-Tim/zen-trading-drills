# Zen Drills Fixes v1.0 · 20260404

Three bugs found during testing. Each is independent. Run as a single Claude Code prompt.

---

## Bug 1: Edit Item Doesn't Update Immediately

**Symptom:** Edit a card's text, save — the form closes but the card still shows the old text until you leave the section and come back.

**Root Cause — two layers:**

1. **Stale `activeSection` in App.jsx.** When you enter a section, `setActiveSection(section)` stores a snapshot of the section object. When `useDrillContent` updates its state after an edit (via `setSections`), `drillSections` gets the new data, but `activeSection` still holds the old snapshot. The `DrillSession` component receives the stale section.

2. **Stale `shuffled` in useShuffle.js.** Even if the section's items were updated, `useShuffle` initializes its shuffled state once from `items` and never re-syncs when item data (text, image_url, flagged) changes. It only re-reads items on `reshuffle()`.

**Fix:**

In **App.jsx**, add a `useEffect` that keeps `activeSection` in sync with `drillSections`:

```jsx
// Keep activeSection in sync when drillSections updates (e.g. after item edit)
useEffect(() => {
  if (!activeSection) return
  const updated = drillSections.find((s) => s.id === activeSection.id)
  if (updated && updated !== activeSection) {
    setActiveSection(updated)
  }
}, [drillSections, activeSection])
```

Place this after the `activeSection` state declaration and after the `drillSections` destructuring.

In **useShuffle.js**, add a `useEffect` that updates item data in the shuffled array when the source items change, WITHOUT re-shuffling the order:

```jsx
// Sync item data (text, image_url, flagged, etc.) without changing shuffle order
useEffect(() => {
  setShuffled((prev) => {
    const itemMap = new Map(items.map((item) => [item.id, item]))
    const updated = prev.map((old) => {
      const fresh = itemMap.get(old.id)
      return fresh || old
    })
    // Also handle items that were added or removed
    if (updated.length !== items.length) {
      return weighted ? weightedShuffle(items) : fisherYates(items)
    }
    return updated
  })
}, [items])
```

Add the `useEffect` import (already imported). Place this after the `useState` initializer and before the `reshuffle` callback. Note: `items` is the prop — this fires whenever the parent re-renders with new items data.

---

## Bug 2: Analytics Tab Shows Empty Data

**Symptom:** Section frequency shows "No data yet". Neglected items list is wrong (either shows everything or nothing). Average time is always 0.

**Root Cause:** In `useSupabaseProgress.js`, the return object has hardcoded empty stubs:

```js
analytics: { sectionCounts: {}, itemLastDrilled: {} },
timerData: { sessionSeconds: 0, items: {} },
```

These were "add later" placeholders from the Supabase migration that never got wired up.

**Fix — two parts:**

**Part A: Build `sectionCounts` from progress data.**

`sectionCounts` should reflect total unique items drilled per section across ALL days (not just today). This is what the Analytics component uses for "Section Frequency".

In `useSupabaseProgress.js`, add a new state and query:

```js
const [analytics, setAnalytics] = useState({ sectionCounts: {}, itemLastDrilled: {} })
```

In the main `load()` function (inside the existing `useEffect` that loads progress, streak, heatmap), add after heatmap loading:

```js
// Load analytics: section frequency across all dates
const { data: allProgressRows } = await supabase
  .from('drill_progress')
  .select('section_id, item_id, rep_count')
  .eq('user_id', userId)

const sectionCounts = {}
if (allProgressRows) {
  for (const row of allProgressRows) {
    sectionCounts[row.section_id] = (sectionCounts[row.section_id] || 0) + row.rep_count
  }
}
```

**Part B: Build `itemLastDrilled` from `drill_items.last_drilled`.**

The `drill_items` table already stores `last_drilled` (updated every time you mark done). But `useSupabaseProgress` doesn't read it. Instead of querying drill_items again (which `useDrillContent` already loads), derive it from the sections data that's already available.

In `Analytics.jsx`, change the `neglectedItems` memo to use the items' `last_drilled` field directly from the sections data instead of `analytics.itemLastDrilled`:

```jsx
const neglectedItems = useMemo(() => {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)

  const allItems = []
  for (const section of sections) {
    for (const item of section.items) {
      const lastDate = item.last_drilled ? new Date(item.last_drilled) : null
      if (!lastDate || lastDate < thirtyDaysAgo) {
        allItems.push({
          id: item.id,
          text: item.text,
          sectionIcon: section.icon,
          sectionTitle: section.title,
          lastDate: item.last_drilled || null,
        })
      }
    }
  }
  return allItems.sort((a, b) => {
    if (!a.lastDate && !b.lastDate) return 0
    if (!a.lastDate) return -1
    if (!b.lastDate) return 1
    return a.lastDate.localeCompare(b.lastDate)
  })
}, [sections])
```

Also update `formatDateStrShort` to handle the YYYY-MM-DD format from `last_drilled` (currently it expects YYYYMMDD):

```jsx
function formatDateStrShort(s) {
  // Handle both YYYYMMDD and YYYY-MM-DD formats
  const d = s.includes('-')
    ? new Date(s + 'T00:00:00')
    : new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

Then update the return statement in `useSupabaseProgress.js`:

```js
analytics: { sectionCounts, itemLastDrilled: {} },
```

Replace the hardcoded `{ sectionCounts: {} ... }` with the computed `sectionCounts`. Keep `itemLastDrilled` empty since Analytics now reads `last_drilled` directly from sections.

Also update `setAnalytics` in the load function and include it in the return.

**Part C: Refresh analytics when navigating to the tab.**

In `refetch()` in `useSupabaseProgress.js`, also re-query the section frequency data (same query as Part A) and update the analytics state.

---

## Bug 3: (Minor) Analytics neglected items date format

**Symptom:** If `formatDateStrShort` receives a YYYY-MM-DD string (which is what `drill_items.last_drilled` stores), the existing `strToDate` parser fails because it expects YYYYMMDD.

**Fix:** Covered in Bug 2 Part B above — the updated `formatDateStrShort` handles both formats.

---

## Claude Code Prompt

```
Read the README.md and understand the current app structure. This prompt fixes 3 bugs found in testing.

NO database changes needed. No new tables or columns.

BUG 1 FIX: Edit item doesn't update card immediately

The problem is two-fold:
a) activeSection in App.jsx is a stale snapshot — when useDrillContent updates sections after an edit, activeSection doesn't reflect the change.
b) useShuffle stores a frozen copy of items and never syncs updated data.

STEP 1a: In App.jsx, add a useEffect AFTER the activeSection state declaration that keeps it in sync:

useEffect(() => {
  if (!activeSection) return
  const updated = drillSections.find((s) => s.id === activeSection.id)
  if (updated && updated !== activeSection) {
    setActiveSection(updated)
  }
}, [drillSections, activeSection])

This fires whenever drillSections changes (e.g. after item edit/add/delete). It finds the matching section by ID and updates the reference. The object identity check (updated !== activeSection) prevents infinite loops.

STEP 1b: In useShuffle.js, add a useEffect that syncs item data without re-shuffling order:

useEffect(() => {
  setShuffled((prev) => {
    const itemMap = new Map(items.map((item) => [item.id, item]))
    const updated = prev.map((old) => {
      const fresh = itemMap.get(old.id)
      return fresh || old
    })
    // If items were added or removed, do a full reshuffle
    if (updated.length !== items.length) {
      return weighted ? weightedShuffle(items) : fisherYates(items)
    }
    return updated
  })
}, [items])

Import useEffect at the top (add it to the existing import from 'react'). Place this useEffect after the useState and before the reshuffle useCallback.

This preserves shuffle order but replaces each item object with its fresh version (so updated text, image_url, flagged state appear immediately).

BUG 2 FIX: Analytics tab shows empty data

The problem: useSupabaseProgress returns hardcoded empty analytics:
  analytics: { sectionCounts: {}, itemLastDrilled: {} }

STEP 2a: In useSupabaseProgress.js, add analytics state:

Replace the existing return line:
  analytics: { sectionCounts: {}, itemLastDrilled: {} },

With a proper state variable. Add:
  const [sectionCounts, setSectionCounts] = useState({})

In the load() function, AFTER the heatmap loading block, add:

// Load analytics: section frequency across all dates
const { data: allProgressRows } = await supabase
  .from('drill_progress')
  .select('section_id, rep_count')
  .eq('user_id', userId)

const counts = {}
if (allProgressRows) {
  for (const row of allProgressRows) {
    counts[row.section_id] = (counts[row.section_id] || 0) + row.rep_count
  }
}
setSectionCounts(counts)

Update the return object to use the real data:
  analytics: { sectionCounts, itemLastDrilled: {} },

STEP 2b: In the refetch() function in useSupabaseProgress.js, also refresh section counts. Add the same query inside the Promise.all:

const [streakRes, heatmapRes, analyticsRes] = await Promise.all([
  supabase.from('drill_streak').select('current_streak, last_date').eq('user_id', userId).single(),
  supabase.from('drill_heatmap').select('drill_date, total_reps').eq('user_id', userId).order('drill_date'),
  supabase.from('drill_progress').select('section_id, rep_count').eq('user_id', userId),
])

Then after the heatmap processing:

if (analyticsRes.data) {
  const counts = {}
  for (const row of analyticsRes.data) {
    counts[row.section_id] = (counts[row.section_id] || 0) + row.rep_count
  }
  setSectionCounts(counts)
}

STEP 2c: In Analytics.jsx, fix neglected items to use drill_items.last_drilled directly from sections data instead of analytics.itemLastDrilled.

Replace the neglectedItems useMemo with:

const neglectedItems = useMemo(() => {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)

  const allItems = []
  for (const section of sections) {
    for (const item of section.items) {
      const lastDate = item.last_drilled ? new Date(item.last_drilled + 'T00:00:00') : null
      if (!lastDate || lastDate < thirtyDaysAgo) {
        allItems.push({
          id: item.id,
          text: item.text,
          sectionIcon: section.icon,
          sectionTitle: section.title,
          lastDate: item.last_drilled || null,
        })
      }
    }
  }
  return allItems.sort((a, b) => {
    if (!a.lastDate && !b.lastDate) return 0
    if (!a.lastDate) return -1
    if (!b.lastDate) return 1
    return a.lastDate.localeCompare(b.lastDate)
  })
}, [sections])

STEP 2d: Update formatDateStrShort in Analytics.jsx to handle both YYYYMMDD and YYYY-MM-DD formats:

function formatDateStrShort(s) {
  const d = s.includes('-')
    ? new Date(s + 'T00:00:00')
    : new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

STEP 3: Do NOT change these files:
- src/data/drills.json
- src/lib/supabase.js
- src/hooks/useAuth.js
- src/hooks/useDrillContent.js
- src/hooks/useSessionResume.js
- src/hooks/useTimer.js
- src/components/Auth.jsx
- src/components/Heatmap.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/AddItemForm.jsx
- src/components/EditItemForm.jsx
- src/components/SectionForm.jsx
- src/components/SectionPicker.jsx
- src/components/DrillFlashcard.jsx
- src/components/DrillChecklist.jsx

Summary of modified files:
- src/App.jsx (add useEffect to sync activeSection with drillSections)
- src/hooks/useShuffle.js (add useEffect to sync item data without re-shuffling, add useEffect import)
- src/hooks/useSupabaseProgress.js (add sectionCounts state, query all progress for analytics, refresh on refetch)
- src/components/Analytics.jsx (fix neglected items to read last_drilled from sections, fix date format helper)
```

---

## Test After Deploy

**Bug 1 — Edit updates immediately:**
1. Enter a section in flashcard mode
2. Tap edit on a card, change the text, save
3. Card should show the new text immediately — no need to leave and come back
4. Same test in checklist mode

**Bug 2 — Analytics shows real data:**
1. Drill some items across a few sections
2. Go to Analytics tab
3. Section Frequency should show bars with real counts
4. Neglected Items should show items not drilled in 30+ days with correct dates
5. Day of Week and Last 30 Days charts should reflect heatmap data (these already worked if heatmap had data)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260404 | Three bug fixes: edit-doesn't-update, analytics empty, date format |
