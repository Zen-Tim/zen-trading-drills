# Zen Drills — Project State v2.0 · 20260403

## What It Is

Personal daily practice app for PA trading drills. Pick a section, shuffle items, work through them in flashcard or checklist mode, track daily progress. Live at zen-trading-drills.vercel.app.

## Stack

- Vite + React SPA, Tailwind CSS, hosted on Vercel (auto-deploy from GitHub main)
- Auth: Supabase Google OAuth with row-level security
- Database: Supabase Postgres (drill_progress, drill_heatmap, drill_streak, drill_sections, drill_items)
- Images: Supabase Storage bucket `drill-images` (public, user-folder policy)
- Timer: localStorage only (per-device, not synced)
- Env vars: `VITE_SUPABASE_SUPABASE_URL`, `VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY` (double SUPABASE naming is correct — how Vercel named them)
- Drill content seeded from `src/data/drills.json` on first login, then managed via Supabase

## What's Built (Phases 0-3 Complete)

- Google sign-in, progress saves to Supabase Postgres
- Section picker with progress bars, streak counter, session timer
- Flashcard mode (swipe/tap, +1 rep on already-done items, 400ms animation)
- Checklist mode (tap to check, strikethrough)
- Undo toast (3-second pill) in both modes
- Heatmap (GitHub-style activity calendar)
- Analytics dashboard (section frequency, trends, neglected items)
- PWA installable (manifest, service worker, app icons)
- Content management: add/edit/delete/reorder items, create/edit/delete/reorder sections
- Image upload on items (Supabase Storage)
- Recent section (virtual, auto-populates with items added after seed)
- Session resume (save/restore shuffle order, mode, index)

## Claude Code Prompt

```
Read Zen_Drills_Project_State_v2.0_20260403.md in the repo root. Follow the Phase 4 build instructions exactly.
```

---

## What's Next — Phase 4: Smart Practice

Flag weak items and weight the shuffle so they come up first. Not spaced repetition — every item still appears every session, but flagged and stale items appear early while you're fresh.

DB columns `drill_items.flagged` and `drill_items.last_drilled` already exist from Phase 1 SQL. No migrations needed.

---

## Phase 4 Build Instructions

NO database changes needed — drill_items already has `flagged` and `last_drilled` columns.

### STEP 1: Add toggleFlag and updateLastDrilled to useDrillContent.js

a) toggleFlag(itemId):
   - Toggle drill_items.flagged for this item (flip true/false)
   - UPDATE drill_items SET flagged = NOT flagged WHERE id = {itemId} AND user_id = {userId}
   - Update local state in setSections — flip the flagged boolean for this item in all sections (including Recent mirror)
   - Return { success: true, flagged: newValue } so the UI knows the new state

b) updateLastDrilled(itemId):
   - UPDATE drill_items SET last_drilled = {today as YYYY-MM-DD} WHERE id = {itemId} AND user_id = {userId}
   - Update local state — set last_drilled on this item in all sections (including Recent mirror)
   - This is fire-and-forget — don't block UI on it, don't show errors

Return both new functions from the hook alongside existing ones.

### STEP 2: Update useShuffle.js — weighted shuffle

Change the shuffle algorithm from pure random to tiered weighted shuffle.

The hook signature changes: useShuffle(items, initialOrder, options)
- items: array of item objects (may have .flagged and .last_drilled properties)
- initialOrder: array of IDs for session resume (same as before)
- options: { weighted: boolean } — default true

When weighted is true AND no initialOrder (i.e. not resuming a session):
1. Sort items into 4 tiers:
   - Tier 1: items where flagged === true
   - Tier 2: items where last_drilled is null OR last_drilled is 14+ days ago
   - Tier 3: items where last_drilled is 7-13 days ago
   - Tier 4: everything else
2. Shuffle within each tier (Fisher-Yates on each tier separately)
3. Concatenate: [...tier1, ...tier2, ...tier3, ...tier4]
4. An item that is BOTH flagged AND stale only appears in tier 1 (flagged takes priority)

When weighted is false or initialOrder is provided: use the existing pure shuffle logic (no change).

Export the shuffle function separately too so it can be unit tested later.

For date comparison: parse last_drilled as a date string (YYYY-MM-DD format), compare against today. If last_drilled is null or undefined, treat as "never drilled" (tier 2).

The reshuffle function should also use the weighted option — so pressing New Round re-applies the tiered shuffle, not a pure random one.

### STEP 3: Wire updateLastDrilled into markDone flow

In App.jsx, create wrapped versions of markDone and incrementRep that also call updateLastDrilled:

```js
const handleMarkDone = useCallback((sectionId, itemId) => {
  markDone(sectionId, itemId)
  updateLastDrilled(itemId)
}, [markDone, updateLastDrilled])

const handleIncrementRep = useCallback((sectionId, itemId) => {
  incrementRep(sectionId, itemId)
  updateLastDrilled(itemId)
}, [incrementRep, updateLastDrilled])
```

Pass handleMarkDone and handleIncrementRep as the markDone/incrementRep props to DrillSession instead of the raw ones from useSupabaseProgress. This keeps the two hooks decoupled.

### STEP 4: Add flag toggle to DrillFlashcard.jsx

Add a small flag button in the flashcard view. Position it in the top-right area of the card or near the edit button.

- Icon: small flag SVG — outlined when not flagged, filled when flagged
- Colour: gray when not flagged, amber/orange (text-amber-500) when flagged
- Size: 44px touch target, icon ~20px
- Tap toggles immediately (optimistic UI)
- No confirmation needed

The component needs toggleFlag as a prop. Pass it down through App.jsx -> DrillSession -> DrillView -> DrillFlashcard.

### STEP 5: Add flag toggle to DrillChecklist.jsx

Same flag button on each item row. Position on the right side, before edit/reorder controls.

- Same icon/colour as flashcard
- Same toggle behaviour
- Visible and functional in both normal and manage mode
- Pass toggleFlag as a prop

### STEP 6: Add flagged count indicator to SectionPicker.jsx

On the home screen, each section tile shows a small indicator if it has flagged items.

- Count: section.items.filter(i => i.flagged).length
- If count > 0: small amber pill badge (e.g. "3 flagged") below subtitle or next to item count
- If count is 0: show nothing
- Keep it subtle — small text, amber-500 colour

### STEP 7: Update DrillSession in App.jsx

Change the useShuffle call:

```js
const { shuffled, reshuffle } = useShuffle(section.items, resumeState?.shuffleOrder, { weighted: true })
```

### STEP 8: Do NOT change these files

- src/data/drills.json
- src/lib/supabase.js
- src/hooks/useAuth.js
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

### Summary of modified files

- src/hooks/useDrillContent.js (add toggleFlag, updateLastDrilled)
- src/hooks/useShuffle.js (weighted shuffle algorithm)
- src/App.jsx (wrap markDone/incrementRep, pass toggleFlag down, update useShuffle call)
- src/components/DrillFlashcard.jsx (flag toggle button)
- src/components/DrillChecklist.jsx (flag toggle button)
- src/components/SectionPicker.jsx (flagged count indicator)

---

## Test After Deploy

1. Flag a few items via the flag icon in flashcard or checklist mode
2. Leave section and re-enter — flagged items should appear first
3. Home screen — sections with flagged items show amber badge
4. Unflag all — badge disappears
5. New Round — flagged items reshuffle to front again
6. Resume a saved session — original order preserved (weighted doesn't override resume)

---

## Build History

| Date | What |
|------|------|
| 20260402 | Scaffolded app, built data layer, core UI, timer, heatmap, analytics, PWA |
| 20260403 | Replaced Vercel KV with Supabase + Google OAuth. Fixed infinite spinner and timer KV endpoint. Cleaned up old KV code. |
| 20260403 | Phase 1: Content tables + seed migration. Phase 2: Add items + image upload. Undo toast, Recent section, +1 Rep fix. |
| 20260403 | Phase 3A: Item edit/delete/reorder (EditItemForm). Phase 3B: Section create/edit/delete/reorder (SectionForm). |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 20260403 | Consolidated from 15 separate docs into one. Added Phase 4 build instructions. |
