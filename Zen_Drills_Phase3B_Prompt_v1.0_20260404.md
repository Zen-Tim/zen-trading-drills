# Zen Drills Phase 3B Prompt v1.0 · 20260404

Read the README.md and understand the current app. This prompt adds section creation, editing, deletion, and reordering on the home screen. It also fixes two bugs.

CRITICAL RULES:
- The "Recent" section (id: 'recent') is VIRTUAL. It must NEVER show edit/delete/reorder controls. Skip it in all edit mode UI.
- Deleting a section must also clean up orphaned drill_progress rows for that section.
- The app must compile and work after this change.
- Match the existing design language.

## STEP 0A: Fix reorderItems upsert bug in src/hooks/useDrillContent.js

The existing reorderItems function has a wrong onConflict value. The drill_items table has a composite primary key (id, user_id) but the upsert uses onConflict: 'id'. Fix it:

Change this line:
  const { error: reorderErr } = await supabase
    .from('drill_items')
    .upsert(updates, { onConflict: 'id' })

To:
  const { error: reorderErr } = await supabase
    .from('drill_items')
    .upsert(updates, { onConflict: 'id,user_id' })

This is a one-line fix.

## STEP 0B: Hide "New Round" when drilling the Recent section

The Recent section is a virtual mirror of items from other sections. "New Round" (reshuffle) doesn't make sense here. Hide it in three places:

1. In the DrillView component in App.jsx: the "New Round" button in the top mode-toggle bar should be hidden when isRecent is true. The isRecent prop is already available on DrillView.

2. In DrillChecklist.jsx: the "New Round" button at the bottom of the list should be hidden when isRecent is true. The isRecent prop is already available.

3. In DrillFlashcard.jsx: the "New Round" button in the bottom controls AND the "New Round" button in the all-done summary screen should both be hidden when isRecent is true. Currently DrillFlashcard does NOT receive an isRecent prop — add it. Pass it through from DrillView (which already has it) and from DrillSession. In the all-done screen, when isRecent just show the "Done" button (which calls onBack), not the "New Round" button.

## STEP 1: Add functions to src/hooks/useDrillContent.js

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

## STEP 2: Create src/components/SectionForm.jsx

A bottom sheet (same style as AddItemForm.jsx / EditItemForm.jsx):
- Title input (text, required)
- Subtitle input (text, optional)
- Icon picker: a grid of ~20 relevant emoji options. Preselect a few rows of common ones: 📋 📊 📈 📉 🎯 🔍 💡 📐 ⚡ 🧠 📝 🔑 ⭐ 🏷️ 📌 🔒 🎓 💹 🗂️ ✏️. User taps one to select. Selected icon gets a visible border/highlight.
- "Save" button
- If editing (section prop provided): pre-populate fields, show "Delete Section" button at bottom in red. Delete requires a confirmation step: tap "Delete Section" → shows "This will delete all X items in this section. Are you sure?" with "Cancel" and "Delete" buttons.
- If creating: empty fields, no delete button

Props: { section?, onSave, onDelete?, onClose }
- For create: onSave = createSection
- For edit: onSave = updateSection, onDelete = deleteSection

## STEP 3: Add edit mode to SectionPicker.jsx

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

## STEP 4: Wire it all up in App.jsx

Pass the new functions from useDrillContent to SectionPicker:
- createSection, updateSection, deleteSection, reorderSections

Add state for the SectionForm overlay (similar to how AddItemForm is handled — addingToSection pattern). Add editingSectionId and creatingSectionMode states.

After deleteSection succeeds, if we were in that section's drill view, go back to home.

## STEP 5: Do NOT change these files
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

## Summary of new files
- src/components/SectionForm.jsx

## Summary of modified files
- src/hooks/useDrillContent.js (fix reorderItems onConflict, add createSection, updateSection, deleteSection, reorderSections)
- src/components/SectionPicker.jsx (edit mode with reorder, edit, add section)
- src/components/DrillChecklist.jsx (hide New Round when isRecent)
- src/components/DrillFlashcard.jsx (add isRecent prop, hide New Round when isRecent)
- src/App.jsx (pass isRecent to DrillFlashcard, pass new section functions, add section form overlay state)
