# Zen Drills — Project State v1.2 · 20260403

## Current Status

App is live at zen-trading-drills.vercel.app. Fully functional with Google sign-in, Supabase backend, and content management from within the app.

## What Was Done Today (20260403)

1. **Cleanup:** Removed old Vercel KV code and superseded docs
2. **Phase 1 — Content to Supabase:** Drill sections and items now live in Supabase tables (drill_sections, drill_items), auto-seeded from drills.json on first login
3. **Phase 2 — Add Items + Images:** "+" button on each section tile, AddItemForm with text + optional image upload to Supabase Storage, images display in flashcard (large) and checklist (thumbnail) modes
4. **Undo toast:** Checklist and flashcard modes both have 3-second undo pill after marking done
5. **Recent section:** Virtual section auto-populates with items added after initial seed. Progress tracks against home section.
6. **+1 Rep fix:** Flashcard mode now adds a rep on already-done items instead of just skipping. Shows +1 animation with 400ms delay.

## Next Session — Phase 3 + Phase 4

### Phase 3: Full Content Management

Edit, reorder, and delete drill content entirely from within the app. No more touching the repo for content changes.

**What to build:**
- **Edit items:** Tap an item to edit its text or change/remove its image
- **Delete items:** Swipe or long-press to delete, with confirmation
- **Reorder items:** Move items up/down within a section (up/down arrow buttons — simpler than drag on mobile)
- **Create sections:** "Add Section" button on home screen with title, subtitle, icon picker
- **Rename sections:** Edit section title, subtitle, icon
- **Delete sections:** With confirmation dialog (destructive — deletes all items in section)

**Files likely to change:**
- useDrillContent.js — add updateItem, updateSection, createSection, deleteSection, reorderItem functions
- SectionPicker.jsx — edit mode for sections (long-press or edit button)
- DrillChecklist.jsx — edit/delete/reorder controls per item
- DrillFlashcard.jsx — edit button on current card
- New component: EditItemForm.jsx (similar to AddItemForm but pre-populated)
- New component: SectionForm.jsx (create/edit section)
- App.jsx — wire up new forms and edit flows

### Phase 4: Smart Practice

Flag weak items and weight the shuffle so problem areas come up first.

**What to build:**
- **Flag toggle:** Small flag icon on each item in both drill modes. Tap to mark as "needs work"
- **Flagged state:** Saves to drill_items.flagged column (already exists in the table)
- **last_drilled date:** Updates drill_items.last_drilled when item is marked done
- **Weighted shuffle:** Items sorted into tiers before shuffling:
  1. Flagged items (shuffled)
  2. Items not drilled in 14+ days (shuffled)
  3. Items not drilled in 7+ days (shuffled)
  4. Everything else (shuffled)
- **Visual indicator:** Sections with flagged items show a dot or count on home screen

**Files likely to change:**
- useDrillContent.js — add toggleFlag function
- useSupabaseProgress.js or useDrillContent.js — update last_drilled on markDone
- useShuffle.js — weighted shuffle algorithm
- DrillFlashcard.jsx — flag toggle button
- DrillChecklist.jsx — flag toggle button
- SectionPicker.jsx — flagged count indicator

## Technical Notes

- Vite + React SPA hosted on Vercel, auto-deploys from GitHub main branch
- Auth: Supabase Google OAuth with row-level security
- Progress: useSupabaseProgress.js → drill_progress, drill_heatmap, drill_streak tables
- Content: useDrillContent.js → drill_sections, drill_items tables (seeded from drills.json)
- Images: Supabase Storage bucket 'drill-images' (public, user-folder policy)
- Timer: localStorage only (per-device)
- Env vars: VITE_SUPABASE_SUPABASE_URL, VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY

## Repo Docs

| File | Status |
|------|--------|
| Zen_Drills_Content_Management_Plan_v1.0_20260403.md | Master plan (Phases 1-4) |
| Zen_Drills_Phase1_Content_To_Supabase_v1.0_20260403.md | Done |
| Zen_Drills_Phase2_Add_Items_v1.0_20260403.md | Done |
| Zen_Drills_Undo_Recent_v1.0_20260403.md | Done |
| Zen_Drills_NewRound_Fix_v1.0_20260403.md | Done |
| Zen_Drills_Cleanup_v1.0_20260403.md | Done |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial project state after Supabase migration |
| v1.1 | 20260403 | Updated after Phase 0 (cleanup) and Phase 1 (content to Supabase) |
| v1.2 | 20260403 | End of session: Phases 1-2 done, undo, Recent section, +1 Rep fix. Briefed Phases 3-4 for next session. |
