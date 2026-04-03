# Zen Drills Phase 3 + Phase 4 Build v1.0 · 20260404

## Overview

Two phases, three Claude Code prompts:

- **Phase 3A** — Item management (edit, delete, reorder items within a section)
- **Phase 3B** — Section management (create, rename, delete, reorder sections)
- **Phase 4** — Smart practice (flag weak items, last_drilled tracking, weighted shuffle)

Run them in order. Push and test between each one.

---

## Known Issues Addressed

These were identified from source code review before writing prompts:

1. **Cross-hook bridge (Phase 4):** `markDone` lives in `useSupabaseProgress` but `last_drilled` is a column on `drill_items` managed by `useDrillContent`. Solution: `useDrillContent` exposes an `updateLastDrilled(itemId)` function. `App.jsx` wraps `markDone` to also call it.

2. **Recent section is virtual (Phase 3):** The "Recent" section has no database row — it's built in memory. All edit/delete/reorder UI must skip it. Items shown in Recent should edit against their *home* section using `item.section_id`.

3. **Orphaned progress on section delete (Phase 3):** `drill_progress` has no foreign key to `drill_sections`. Deleting a section leaves orphan rows. Solution: `deleteSection` also deletes matching progress, heatmap adjusts.

4. **Batch sort_order writes (Phase 3):** Reordering can touch many rows. Solution: update all sort_order values in a single Promise.all batch, not sequential awaits.

5. **No move-between-sections:** Intentionally left out. If you put an item in the wrong section, delete and re-add it. Keeps the UI simple.

---

## Phase 3A — Item Management

Paste into Claude Code:

```
Read the README.md and understand the current app. This prompt adds item editing, deletion, and reordering within a section.

CRITICAL RULES:
- The "Recent" section (id: 'recent') is VIRTUAL — it has no database row. Never try to update/delete/reorder it as a section. Items displayed in Recent have a real section_id on them — always use item.section_id for database operations, not 'recent'.
- The app must compile and work after this change.
- Match the existing design language — clean, minimal, light theme, 44px+ touch targets.

STEP 1: Add functions to src/hooks/useDrillContent.js

Add these functions to the hook (keep all existing functions):

a) updateItem(itemId, updates) — updates text and/or image on a drill_items row

  async function:
  - updates = { text?: string, imageFile?: File | null, removeImage?: boolean }
  - If removeImage is true: delete the old image from Supabase Storage (path: {userId}/{itemId}.{ext}), set image_url to null
  - If imageFile is provided: upload to Supabase Storage at {userId}/{itemId}.{ext} (delete old image first if one exists), get public URL, set image_url
  - If text is provided: update the text column
  - UPSERT to drill_items with updated fields + updated_at = now()
  - Update local state optimistically
  - Return { success: true } or { success: false, error }

b) reorderItems(sectionId, orderedItemIds) — takes a section ID and a new array of item IDs in the desired order

  async function:
  - Build an array of { id, sort_order } where sort_order = index in the array
  - Update ALL items in a single Promise.all — one supabase update per item, all fired simultaneously
  - Update local state to reflect new order
  - Return { success: true } or { success: false, error }
  - GUARD: if sectionId === 'recent', return immediately (do nothing)

STEP 2: Create src/components/EditItemForm.jsx

A bottom sheet (same style as AddItemForm.jsx — copy its layout and animation):
- Pre-populated with the item's current text and image
- Text input (textarea, same styling as AddItemForm)
- Image section: if item has an image, show it with a "Remove" button. "Change Image" button to pick a new one. "Add Image" button if no image exists.
- "Save" button — calls updateItem with the changes
- "Delete" button — red text, at the bottom. On tap, shows an inline confirmation: "Delete this item?" with "Cancel" and "Delete" buttons. On confirm, calls deleteItem(sectionId, itemId) from useDrillContent and closes the form.
- "Cancel" / X button to close without saving

Props: { item, sectionId, onUpdate, onDelete, onClose }
- onUpdate = useDrillContent.updateItem
- onDelete = useDrillContent.deleteItem

STEP 3: Add edit controls to DrillChecklist.jsx

Each item in the list gets a small edit icon (pencil) on the right side, AFTER the rep count badge. The icon should be subtle — gray-300, small (w-4 h-4), with a 44px touch target wrapper.

Tapping the edit icon opens EditItemForm for that item. The main item tap still works as before (marks done / increments rep).

Add state for editingItem. When set, render <EditItemForm> as an overlay.

After a successful edit or delete, the form closes and the list updates.

IMPORTANT: use item.section_id (not section.id) when the current section is 'recent'. This ensures edits go to the item's real home section in the database. Fall back to section.id if item.section_id is not set.

STEP 4: Add edit button to DrillFlashcard.jsx

Add a small edit icon button in the top-right area of the card (inside the card border, near the rep count badge area). Same subtle styling — gray-300 pencil icon, 44px touch target.

Tapping opens EditItemForm for the current item.

Same section_id logic as checklist: use item.section_id for Recent items.

After a successful delete, advance to the next card (or go back to section picker if it was the last item).

STEP 5: Add reorder controls to DrillChecklist.jsx

Add a "Manage" toggle button in the top bar (next to the back button area). When toggled on:
- Each item shows up/down arrow buttons on the left side (before the checkbox)
- The checkbox and "mark done" tap behavior are DISABLED in manage mode (so you don't accidentally drill while reordering)
- Up arrow moves the item one position up in the list. Down arrow moves one position down.
- First item has no up arrow. Last item has no down arrow.
- Each move calls reorderItems with the new order

When "Manage" is toggled off, normal drill mode resumes.

GUARD: If section.id === 'recent', hide the Manage button entirely (can't reorder a virtual section).

STEP 6: Wire it all up in App.jsx

Pass the new functions from useDrillContent through to the drill components:
- updateItem and deleteItem already exist on useDrillContent — just pass them down
- reorderItems is new — pass it to DrillChecklist

Update the DrillView and DrillSession components to forward these props.

After a deleteItem call succeeds, also call refetchContent() to rebuild the Recent section correctly.

STEP 7: Do NOT change these files:
- src/data/drills.json
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/hooks/useAuth.js
- src/lib/supabase.js
- src/components/Analytics.jsx
- src/components/Heatmap.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/Auth.jsx

Summary of new files:
- src/components/EditItemForm.jsx

Summary of modified files:
- src/hooks/useDrillContent.js (add updateItem, reorderItems)
- src/components/DrillChecklist.jsx (edit icon per item, manage mode with reorder arrows)
- src/components/DrillFlashcard.jsx (edit icon on card)
- src/App.jsx (pass new props through)
```

**After Phase 3A:** Push, deploy, test on phone:
- Open a section in checklist mode, tap the edit icon on an item, change its text, save. Confirm it persists.
- Edit an item's image (add, change, remove). Confirm in flashcard mode.
- Delete an item. Confirm it's gone after reopen.
- Toggle "Manage" mode, move items up and down. Close manage mode, confirm new order persists.
- If you have a Recent section, edit an item from Recent — confirm it updates the item in its home section too.

---

## Phase 3B — Section Management

Paste into Claude Code:

```
Read the README.md and understand the current app. This prompt adds section creation, editing, deletion, and reordering on the home screen.

CRITICAL RULES:
- The "Recent" section (id: 'recent') is VIRTUAL. It must NEVER show edit/delete/reorder controls. Skip it in all edit mode UI.
- Deleting a section must also clean up orphaned drill_progress rows for that section.
- The app must compile and work after this change.
- Match the existing design language.

STEP 1: Add functions to src/hooks/useDrillContent.js

Add these functions (keep all existing ones):

a) createSection(title, subtitle, icon) — creates a new section

  async function:
  - Generate id: slugify the title (lowercase, replace spaces with hyphens, remove special chars) + '-' + Date.now() to ensure uniqueness
  - sort_order: max existing sort_order + 1 (excluding the Recent section which has sort_order -1)
  - INSERT into drill_sections
  - Update local state — append new section (but keep Recent at position 0 if it exists)
  - Return { success: true, section } or { success: false, error }

b) updateSection(sectionId, updates) — updates title, subtitle, icon

  async function:
  - updates = { title?: string, subtitle?: string, icon?: string }
  - UPDATE drill_sections SET ... WHERE id = sectionId AND user_id = userId
  - Update local state
  - GUARD: if sectionId === 'recent', return immediately
  - Return { success: true } or { success: false, error }

c) deleteSection(sectionId) — deletes a section and all its items + orphaned progress

  async function:
  - GUARD: if sectionId === 'recent', return immediately
  - Show nothing — the confirmation UI is in the component, this function just executes
  - Step 1: Get all item IDs in this section from local state
  - Step 2: Delete images from Supabase Storage for any items that have image_url (fire all deletes in parallel, don't fail if some images are missing)
  - Step 3: DELETE FROM drill_progress WHERE user_id = userId AND section_id = sectionId (cleans up orphaned progress)
  - Step 4: DELETE FROM drill_sections WHERE id = sectionId AND user_id = userId (cascades to drill_items automatically)
  - Update local state — remove the section
  - Return { success: true } or { success: false, error }

d) reorderSections(orderedSectionIds) — reorder sections on home screen

  async function:
  - Filter out 'recent' from the array (it's virtual, always stays at top)
  - Build array of { id, sort_order } where sort_order = index
  - Update ALL sections in a single Promise.all
  - Update local state to reflect new order (keep Recent at top if it exists)
  - Return { success: true } or { success: false, error }

STEP 2: Create src/components/SectionForm.jsx

A bottom sheet (same style as AddItemForm.jsx / EditItemForm.jsx):
- Title input (text, required)
- Subtitle input (text, optional)
- Icon picker: a grid of ~20 relevant emoji options. Preselect a few rows of common ones: 📋 📊 📈 📉 🎯 🔍 💡 📐 ⚡ 🧠 📝 🔑 ⭐ 🏷️ 📌 🔒 🎓 💹 🗂️ ✏️. User taps one to select. Selected icon gets a visible border/highlight.
- "Save" button
- If editing (item prop provided): pre-populate fields, show "Delete Section" button at bottom in red. Delete requires a confirmation step: tap "Delete Section" → shows "This will delete all X items in this section. Are you sure?" with "Cancel" and "Delete" buttons.
- If creating: empty fields, no delete button

Props: { section?, onSave, onDelete?, onClose }
- For create: onSave = createSection
- For edit: onSave = updateSection, onDelete = deleteSection

STEP 3: Add edit mode to SectionPicker.jsx

Add an "Edit" button in the header area (top right, near "Zen Drills" title). Small, subtle — text button saying "Edit" / "Done".

When edit mode is ON:
- Each section tile (EXCEPT Recent) shows:
  - A small pencil icon in the top-left corner — tapping opens SectionForm in edit mode for that section
  - Up/down arrow buttons along the right edge for reordering
  - First real section (after Recent) has no up arrow. Last section has no down arrow.
- The "+" (add item) buttons on tiles are hidden in edit mode
- Tapping a tile in edit mode does NOT enter the drill — it opens the section edit form instead
- An "Add Section" card appears at the bottom of the grid — a dashed-border tile with a "+" icon and "New Section" text. Tapping opens SectionForm in create mode.

When edit mode is OFF:
- Everything looks exactly as it does now (no edit controls visible)
- The "Add Section" card is hidden

GUARD: The Recent section tile never shows edit/reorder controls regardless of edit mode.

STEP 4: Wire it all up in App.jsx

Pass the new functions from useDrillContent to SectionPicker:
- createSection, updateSection, deleteSection, reorderSections

Add state for the SectionForm overlay (similar to how AddItemForm is handled — addingToSection pattern). Add editingSectionId and creatingSectionMode states.

After deleteSection succeeds, if we were in that section's drill view, go back to home.

STEP 5: Do NOT change these files:
- src/data/drills.json
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/hooks/useAuth.js
- src/lib/supabase.js
- src/components/Analytics.jsx
- src/components/Heatmap.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/Auth.jsx
- src/components/AddItemForm.jsx

Summary of new files:
- src/components/SectionForm.jsx

Summary of modified files:
- src/hooks/useDrillContent.js (add createSection, updateSection, deleteSection, reorderSections)
- src/components/SectionPicker.jsx (edit mode with reorder, edit, add section)
- src/App.jsx (pass new props, add section form overlay state)
```

**After Phase 3B:** Push, deploy, test on phone:
- Tap "Edit" on home screen. Confirm edit controls appear on all sections except Recent.
- Reorder sections with arrows. Toggle "Done". Confirm order persists after refresh.
- Tap a section tile in edit mode. Change title and icon. Save. Confirm it updates.
- Tap "New Section" card. Create a section with title, subtitle, icon. Confirm it appears.
- Add items to the new section. Drill them. Confirm progress works.
- Delete the test section. Confirm it's gone, items are gone, and progress data doesn't inflate your heatmap.
- The Recent section should be completely untouched through all of this.

---

## Phase 4 — Smart Practice

Paste into Claude Code:

```
Read the README.md and understand the current app. This prompt adds flag-weak-items, last_drilled tracking, and weighted shuffle so problem areas come up first.

CRITICAL RULES:
- The app must compile and work after this change.
- The flag and last_drilled columns already exist on drill_items (flagged boolean default false, last_drilled date). If they don't exist in the database yet, I'll create them — but check first.
- Match the existing design language.

STEP 1: Verify columns exist

Check if drill_items has flagged and last_drilled columns. If the app is reading these fields and getting null/undefined, they exist. If you're not sure, they were created in the Phase 1 SQL. The code should handle null values gracefully for both fields.

STEP 2: Add functions to src/hooks/useDrillContent.js

a) toggleFlag(itemId, currentFlagState) — toggles the flagged boolean on a drill_items row

  async function:
  - UPDATE drill_items SET flagged = !currentFlagState, updated_at = now() WHERE id = itemId AND user_id = userId
  - Update local state optimistically (flip the flag on the matching item in all sections, including Recent if it appears there)
  - Return { success: true } or { success: false, error }

b) updateLastDrilled(itemId) — sets last_drilled to today's date

  async function:
  - UPDATE drill_items SET last_drilled = CURRENT_DATE, updated_at = now() WHERE id = itemId AND user_id = userId
  - Update local state optimistically
  - Fire-and-forget — don't block the UI or show errors for this. It's a background update.
  - No return value needed

STEP 3: Bridge markDone to updateLastDrilled in App.jsx

The problem: markDone lives in useSupabaseProgress, but last_drilled lives on drill_items managed by useDrillContent. They're separate hooks.

Solution: Create a wrapper function in App.jsx:

const wrappedMarkDone = useCallback((sectionId, itemId) => {
  markDone(sectionId, itemId)
  updateLastDrilled(itemId)
}, [markDone, updateLastDrilled])

Pass wrappedMarkDone instead of markDone to DrillSession, DrillView, DrillFlashcard, DrillChecklist.

Do the same for incrementRep — also call updateLastDrilled when a rep is added:

const wrappedIncrementRep = useCallback((sectionId, itemId) => {
  incrementRep(sectionId, itemId)
  updateLastDrilled(itemId)
}, [incrementRep, updateLastDrilled])

STEP 4: Add flag toggle to DrillChecklist.jsx

Each item gets a small flag icon button on the right side, BEFORE the edit icon (if edit icon exists from Phase 3A). Position: between the rep count badge and the edit pencil.

- Unflagged state: outline flag icon, gray-300, subtle
- Flagged state: filled flag icon, amber-500 (or orange-400), clearly visible

Tapping the flag calls toggleFlag(item.id, item.flagged). The tap target should be 44px minimum but the icon itself small (w-4 h-4).

The flag toggle should NOT trigger markDone or any progress action — it's independent.

STEP 5: Add flag toggle to DrillFlashcard.jsx

Add a flag icon button on the card, positioned near the top-left of the card (opposite corner from the edit icon). Same styling rules as checklist — outline when unflagged, filled amber when flagged.

Tapping calls toggleFlag.

STEP 6: Update useShuffle.js — weighted shuffle

Replace the simple Fisher-Yates with a weighted shuffle. The function signature changes:

export function useShuffle(items, initialOrder)

Keep the initialOrder/resume logic the same. Change the default shuffle logic:

function weightedShuffle(items) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]  // YYYY-MM-DD format

  function daysSinceLastDrilled(item) {
    if (!item.last_drilled) return 999  // never drilled = maximally stale
    const last = new Date(item.last_drilled)
    const diffMs = now - last
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  // Sort into tiers
  const flagged = []
  const stale14 = []
  const stale7 = []
  const rest = []

  for (const item of items) {
    const days = daysSinceLastDrilled(item)
    if (item.flagged) {
      flagged.push(item)
    } else if (days >= 14) {
      stale14.push(item)
    } else if (days >= 7) {
      stale7.push(item)
    } else {
      rest.push(item)
    }
  }

  // Shuffle within each tier
  return [
    ...fisherYates(flagged),
    ...fisherYates(stale14),
    ...fisherYates(stale7),
    ...fisherYates(rest),
  ]
}

Where fisherYates is the existing shuffle function (rename the current shuffle to fisherYates, keep it as a helper).

IMPORTANT: Items that are BOTH flagged AND stale go into the flagged tier (flagged takes priority). This is handled by the if/else chain above.

STEP 7: Add flagged count to SectionPicker.jsx

On each section tile, if the section has any flagged items, show a small amber dot or count badge near the section icon or title.

Calculate from the section's items array: section.items.filter(i => i.flagged).length

If count > 0, show a small pill: amber background, white text, e.g. "3 flagged" or just the number. Keep it small and unobtrusive — it's informational, not alarming.

STEP 8: Do NOT change these files:
- src/data/drills.json
- src/hooks/useSupabaseProgress.js (except that App.jsx wraps its functions — the hook itself is unchanged)
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/hooks/useAuth.js
- src/lib/supabase.js
- src/components/Analytics.jsx
- src/components/Heatmap.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/Auth.jsx
- src/components/AddItemForm.jsx
- src/components/SectionForm.jsx (if it exists from Phase 3B)
- src/components/EditItemForm.jsx (if it exists from Phase 3A)

Summary of new files:
- None

Summary of modified files:
- src/hooks/useDrillContent.js (add toggleFlag, updateLastDrilled)
- src/hooks/useShuffle.js (weighted shuffle replacing pure random)
- src/components/DrillChecklist.jsx (flag toggle per item)
- src/components/DrillFlashcard.jsx (flag toggle on card)
- src/components/SectionPicker.jsx (flagged count indicator)
- src/App.jsx (wrappedMarkDone and wrappedIncrementRep bridging progress to content)
```

**After Phase 4:** Push, deploy, test on phone:
- Open a section. Flag a few items using the flag icon. Confirm they turn amber.
- Reshuffle / new round. Confirm flagged items appear at the top of the shuffled order.
- Unflag them. Reshuffle. They should mix back into the normal pool.
- Drill some items today, then check: items you just drilled should appear later in the shuffle. Items you haven't drilled in a while should appear earlier.
- Check the home screen: sections with flagged items should show a small indicator.
- Flag items from both checklist and flashcard modes. Confirm the flag persists across views and after closing/reopening the app.

---

## Supabase SQL — Run Before Phase 4 (if needed)

The `flagged` and `last_drilled` columns should already exist from the Phase 1 SQL. Verify in Supabase dashboard by checking the `drill_items` table structure. If they're missing, run this:

```sql
-- Only run if these columns don't exist yet
ALTER TABLE drill_items ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;
ALTER TABLE drill_items ADD COLUMN IF NOT EXISTS last_drilled date;
```

---

## Execution Order

1. Phase 3A prompt → push → test item edit/delete/reorder
2. Phase 3B prompt → push → test section create/edit/delete/reorder
3. Check drill_items columns in Supabase (run SQL above if needed)
4. Phase 4 prompt → push → test flag/weighted shuffle
5. Update project state doc

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260404 | Phase 3 (item + section management) and Phase 4 (smart practice) — plan and Claude Code prompts |
