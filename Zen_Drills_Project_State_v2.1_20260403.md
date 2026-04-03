# Zen Drills — Project State v2.1 · 20260403

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

## What's Built (All Phases Complete)

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
- Smart practice: flag weak items (amber toggle in both modes), weighted shuffle (flagged first, then stale 14d+, then 7-13d, then rest), last_drilled tracking on every rep

## Build History

| Date | What |
|------|------|
| 20260402 | Scaffolded app, built data layer, core UI, timer, heatmap, analytics, PWA |
| 20260403 | Replaced Vercel KV with Supabase + Google OAuth. Fixed infinite spinner and timer KV endpoint. Cleaned up old KV code. |
| 20260403 | Phase 1: Content tables + seed migration. Phase 2: Add items + image upload. Undo toast, Recent section, +1 Rep fix. |
| 20260403 | Phase 3A: Item edit/delete/reorder. Phase 3B: Section create/edit/delete/reorder. |
| 20260403 | Phase 4: Smart practice — flag toggle (toggleFlag in useDrillContent), weighted shuffle (tiered Fisher-Yates in useShuffle), last_drilled tracking, amber badges on SectionPicker. |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 20260403 | Consolidated from 15 separate docs into one. Added Phase 4 build instructions. |
| v2.1 | 20260403 | Phase 4 complete. Removed build instructions. All phases done. |
