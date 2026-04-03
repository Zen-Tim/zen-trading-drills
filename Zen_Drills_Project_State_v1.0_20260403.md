# Zen Drills — Project State v1.0 · 20260403

## Current Status

App is live at zen-trading-drills.vercel.app. Google sign-in working. Progress saves to Supabase Postgres. Core app fully functional.

## Next Session

1. Run cleanup prompt: `Zen_Drills_Cleanup_v1.0_20260403.md` in Claude Code — removes old KV code and superseded docs
2. Push and deploy
3. Delete the old KV database from Vercel dashboard (Storage tab) and the `REDIS_URL` env var
4. Test app from phone browser and home screen icon

## Technical Notes

- Vite + React SPA hosted on Vercel, auto-deploys from GitHub main branch
- Auth: Supabase Google OAuth. User signs in, gets a row-level-secured Postgres database
- Progress: `useSupabaseProgress.js` reads/writes directly to Supabase (no serverless API layer)
- Timer: persists to localStorage only (per-device, not synced — intentional)
- Env vars use double SUPABASE naming (`VITE_SUPABASE_SUPABASE_URL` etc) — this is how Vercel named them, it's correct
- Drill content lives in `src/data/drills.json` — edit and push to update

## Repo Docs

| File | Purpose |
|------|---------|
| Zen_Drills_Cleanup_v1.0_20260403.md | Claude Code prompt to remove old KV code and superseded docs |
| Zen_Drills_Supabase_Build_v1.0_20260403.md | Reference: the build prompt that added Supabase |
| Zen_Drills_Supabase_Fix_v1.2_20260403.md | Reference: the fix prompt that resolved the infinite spinner |
| Zen_Drills_Build_Prompts_v2.2_20260403.md | Reference: original phased build prompts |

## Archive — Completed Work

**Build (20260402-03):** Scaffolded Vite + React app. Built data layer, core UI (section picker, flashcard mode, checklist mode), timer system, heatmap, analytics dashboard, PWA setup, backup cron. Six build phases, all completed.

**Supabase Migration (20260403):** Replaced Vercel KV with Supabase Postgres + Google OAuth. Created tables (drill_progress, drill_heatmap, drill_streak) with row-level security. Built useAuth, useSupabaseProgress, Auth component. Old KV code kept as fallback during migration, now ready for removal.

**Post-Migration Fixes (20260403):** Fixed infinite spinner caused by `useSupabaseProgress` not resolving loading state when no user logged in. Fixed `useTimer` still calling dead KV endpoint — switched to localStorage. Added error handling to Supabase client init and auth session check.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial project state document after Supabase migration completion |
