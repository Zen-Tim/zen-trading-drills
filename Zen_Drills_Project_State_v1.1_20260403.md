# Zen Drills — Project State v1.1 · 20260403

## Current Status

App is live at zen-trading-drills.vercel.app. Google sign-in working. Progress saves to Supabase Postgres. Drill content now reads from Supabase (auto-seeded from drills.json on first login). Core app fully functional.

## What Just Happened

- Phase 0 (Cleanup): Removed old KV code and superseded docs
- Phase 1 (Content to Supabase): Drill sections and items now live in Supabase tables (drill_sections, drill_items). App reads from database, not JSON file. drills.json kept as seed source only.

## Next Session

Phase 2 from Content Management Plan: Add items + image upload from within the app.

Before running Phase 2:
1. Create Supabase Storage bucket called `drill-images` (set to public)
2. Add storage policy: authenticated users can upload to their own folder
3. Then I write the Claude Code prompt

## Technical Notes

- Vite + React SPA hosted on Vercel, auto-deploys from GitHub main branch
- Auth: Supabase Google OAuth with row-level security
- Progress: `useSupabaseProgress.js` reads/writes drill_progress, drill_heatmap, drill_streak
- Content: `useDrillContent.js` reads drill_sections, drill_items (seeded from drills.json on first login)
- Timer: persists to localStorage only (per-device, not synced)
- Env vars use double SUPABASE naming (`VITE_SUPABASE_SUPABASE_URL` etc)
- drills.json stays in repo as seed source and backup, no longer read after first login

## Repo Docs

| File | Purpose |
|------|---------|
| Zen_Drills_Content_Management_Plan_v1.0_20260403.md | Master plan: 4 phases (content migration, images, CRUD, smart practice) |
| Zen_Drills_Phase1_Content_To_Supabase_v1.0_20260403.md | Phase 1 build prompt (completed) |
| Zen_Drills_Cleanup_v1.0_20260403.md | Cleanup prompt (completed) |
| Zen_Drills_Build_Prompts_v2.2_20260403.md | Reference: original phased build prompts |
| Zen_Drills_Supabase_Build_v1.0_20260403.md | Reference: Supabase migration build prompt |
| Zen_Drills_Supabase_Fix_v1.2_20260403.md | Reference: post-migration fix prompt |
| Zen_Drills_Supabase_Plan_v1.1_20260403.md | Reference: Supabase migration plan |

## Archive — Completed Work

**Build (20260402-03):** Scaffolded Vite + React app. Built data layer, core UI, timer, heatmap, analytics, PWA, backup cron.

**Supabase Migration (20260403):** Replaced Vercel KV with Supabase Postgres + Google OAuth. Created progress tables with RLS.

**Post-Migration Fixes (20260403):** Fixed infinite spinner, fixed useTimer KV call, added error handling.

**Cleanup (20260403):** Removed old KV code (useProgress.js, api/progress.js, api/backup.js) and superseded doc files.

**Phase 1 — Content to Supabase (20260403):** Created drill_sections and drill_items tables. Built useDrillContent.js hook with auto-seed from drills.json. Updated App.jsx to read from Supabase instead of static JSON import.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial project state document after Supabase migration |
| v1.1 | 20260403 | Updated after Phase 0 (cleanup) and Phase 1 (content to Supabase) completed |
