# Zen Drills — Neglected Section v1.0 · 20260405

## What This Does

Adds a virtual "Neglected" section to the home screen that pulls items from across all sections where `last_drilled` is null or 30+ days ago. Same pattern as the existing "Recent" virtual section — items are shallow copies that keep their original `section_id`, so progress tracks against the home section.

Also renames the `isRecent` prop to `isVirtual` across all components so both Recent and Neglected share the same behaviour (no New Round, no reorder/delete, no add-item button).

## Claude Code Prompt

```
Read the existing source files listed below before making any changes. This prompt adds a virtual "Neglected" section and generalises the isRecent prop to isVirtual.

Files to read first:
- src/hooks/useDrillContent.js
- src/App.jsx
- src/components/SectionPicker.jsx
- src/components/DrillFlashcard.jsx
- src/components/DrillChecklist.jsx

NO database changes needed. The drill_items table already has the last_drilled column.

---

STEP 1: Add Neglected virtual section in useDrillContent.js

After building the "Recent" virtual section (the existing code block that filters items by created_at cutoff), add a NEW block that builds a "Neglected" virtual section.

Logic (add this AFTER the Recent section block, BEFORE setSections):

const NEGLECTED_DAYS = 30
const neglectedCutoff = new Date()
neglectedCutoff.setHours(0, 0, 0, 0)
neglectedCutoff.setDate(neglectedCutoff.getDate() - NEGLECTED_DAYS)

// Collect neglected items from REAL sections only (not from Recent)
const neglectedItems = []
for (const section of assembled.filter(s => s.id !== 'recent')) {
  for (const item of section.items) {
    const lastDate = item.last_drilled ? new Date(item.last_drilled + 'T00:00:00') : null
    if (!lastDate || lastDate < neglectedCutoff) {
      neglectedItems.push({ ...item }) // shallow copy, keeps original section_id
    }
  }
}

// Sort: never-drilled first, then oldest last_drilled first
neglectedItems.sort((a, b) => {
  if (!a.last_drilled && !b.last_drilled) return 0
  if (!a.last_drilled) return -1
  if (!b.last_drilled) return 1
  return a.last_drilled.localeCompare(b.last_drilled)
})

if (neglectedItems.length > 0) {
  // Find where to insert: after Recent (index 1) if Recent exists, otherwise at index 0
  const insertIndex = assembled.length > 0 && assembled[0].id === 'recent' ? 1 : 0
  assembled.splice(insertIndex, 0, {
    id: 'neglected',
    title: 'Neglected',
    subtitle: 'Not drilled in 30+ days',
    icon: '\u{1F6A9}',  // triangular flag emoji
    sort_order: -2,
    items: neglectedItems,
  })
}

IMPORTANT: The Neglected section must be built from real sections only, never including items that are already in the Recent virtual section's source. Since we filter `assembled.filter(s => s.id !== 'recent')`, this is handled — the same item might appear in both Recent AND Neglected if it was recently added but never drilled. That's fine and correct.

---

STEP 2: Rename isRecent prop to isVirtual everywhere

This is a find-and-replace across these files. The prop name changes but the logic stays the same — it just now covers both 'recent' and 'neglected' sections.

a) In App.jsx:
   - Change the line: const isRecent = activeSection.id === 'recent'
   - To: const isVirtual = activeSection.id === 'recent' || activeSection.id === 'neglected'
   - Change all references from isRecent to isVirtual in this file
   - This includes the prop passed to DrillSession: isRecent={isRecent} becomes isVirtual={isVirtual}

b) In DrillSession component (inside App.jsx):
   - Rename the isRecent prop to isVirtual in the function signature
   - Pass isVirtual down to DrillView

c) In DrillView component (inside App.jsx):
   - Rename the isRecent prop to isVirtual in the function signature
   - Pass isVirtual down to DrillFlashcard and DrillChecklist
   - The New Round button condition changes from: {!isRecent && (...)} to {!isVirtual && (...)}

d) In DrillFlashcard.jsx:
   - Rename isRecent prop to isVirtual in the function signature/destructuring
   - Update all references from isRecent to isVirtual within the component

e) In DrillChecklist.jsx:
   - Rename isRecent prop to isVirtual in the function signature/destructuring
   - Update all references from isRecent to isVirtual within the component

---

STEP 3: Update SectionPicker.jsx to handle Neglected section

The SectionPicker currently has several places that check `section.id === 'recent'` or use the `isRecent` local variable. Update ALL of these to also handle 'neglected'.

a) Change the local variable:
   FROM: const isRecent = section.id === 'recent'
   TO:   const isVirtual = section.id === 'recent' || section.id === 'neglected'

b) Update ALL references to isRecent in this file to isVirtual. This includes:
   - The progress calculation: the isRecent branch that checks each item against item.section_id — this same logic applies to Neglected too, since neglected items also have their real section_id
   - The sectionReps calculation: same pattern
   - The edit mode pencil icon: {editMode && !isVirtual && (...)}
   - The edit mode reorder arrows: {editMode && !isVirtual && (...)}
   - The add-item button: already uses onAddItem, but currently shows on all tiles. It should NOT show on Neglected (same as Recent). The condition should be: {!editMode && onAddItem && !isVirtual && (...)}
   - The handleTileClick: {editMode && !isVirtual ? onEditSection : onSelectSection}

c) Update the realSections filter:
   FROM: const realSections = sections.filter((s) => s.id !== 'recent')
   TO:   const realSections = sections.filter((s) => s.id !== 'recent' && s.id !== 'neglected')

d) The flagged count pill should still show on the Neglected section tile — don't exclude it.

---

STEP 4: Verify the add-item button exclusion

Currently in SectionPicker.jsx, the "+" add-item button shows on every section tile including Recent. It should NOT show on virtual sections (Recent or Neglected) because you can't add items to a virtual section — they pull from real sections.

Check the current code. If the "+" button currently shows on Recent, fix it:
   {!editMode && onAddItem && !isVirtual && (...)}

If it's already excluded on Recent, extend the exclusion to also cover Neglected (which the isVirtual rename handles automatically).

---

STEP 5: Do NOT change these files:
- src/data/drills.json
- src/lib/supabase.js
- src/hooks/useAuth.js
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useSessionResume.js
- src/hooks/useTimer.js
- src/components/Auth.jsx
- src/components/Heatmap.jsx
- src/components/Analytics.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/AddItemForm.jsx
- src/components/EditItemForm.jsx
- src/components/SectionForm.jsx

Summary of modified files:
- src/hooks/useDrillContent.js (add Neglected virtual section)
- src/App.jsx (rename isRecent to isVirtual, cover both 'recent' and 'neglected')
- src/components/SectionPicker.jsx (rename isRecent to isVirtual, handle neglected in all checks)
- src/components/DrillFlashcard.jsx (rename isRecent prop to isVirtual)
- src/components/DrillChecklist.jsx (rename isRecent prop to isVirtual)
```

---

## Test After Deploy

1. Open home screen — if you have items not drilled in 30+ days (or never drilled), the Neglected section should appear
2. Position: Recent (if any) -> Neglected (if any) -> real sections
3. Tap into Neglected — items should be sorted with never-drilled first, then oldest
4. Drill an item — progress should save against the item's home section, not "neglected"
5. No New Round button in Neglected (same as Recent)
6. No "+" add-item button on Neglected tile
7. Edit mode: no pencil icon or reorder arrows on Neglected tile
8. Flag toggle should still work on items inside Neglected
9. After drilling all neglected items within the threshold, the section should disappear on next app load

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260405 | Neglected virtual section + isRecent to isVirtual rename |
