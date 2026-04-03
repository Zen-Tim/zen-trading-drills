# Zen Drills Fix Prompts v1.1 · 20260403

Paste into Claude Code. This is a critical data safety fix.

---

## Fix 5 — Prevent Progress Wipe on Failed Load (CRITICAL)

```
Read this carefully. There is a critical data loss bug in useProgress.js.

THE BUG:
When the service worker reloads the page after a deploy, the initial fetch to /api/progress can fail (network error during SW transition). When it fails:
1. The catch block sets loading = false, but progress remains {}
2. The user sees empty tiles and thinks their data is gone
3. If they tap anything, incrementRep spreads prev={} and POSTs the entire (now empty) progress object to KV
4. KV does kv.set() which is a FULL OVERWRITE — all real progress is destroyed

THE FIX (implement all of these):

A) Add a loadSuccess ref to useProgress.js. It starts as false. Only set it to true when the initial load() fetch succeeds. If load() catches an error, leave it false.

B) When loadSuccess is false, show an error state instead of the normal UI. NOT the empty tiles. Show something like "Couldn't connect — tap to retry" with a retry button that calls load() again. The user must NEVER see empty tiles after a failed load.

C) Guard ALL write functions (incrementRep, markDone, unmarkDone) — if loadSuccess is false, do NOT write to KV. Just update local state. This prevents an empty state from overwriting real data.

D) Add retry logic to the initial load: if the fetch fails, automatically retry 3 times with a 1-second delay between attempts before showing the error state. The SW transition is brief — a retry will usually succeed.

E) In the API route (api/progress.js), add a safety check on POST for the default progress type: if the incoming data object is empty ({} or has zero items across all sections), reject the write and return an error. Real progress data is never empty once drilling has started. This is a server-side backstop.

F) Change the POST endpoint to use a MERGE strategy instead of full overwrite for progress data. When receiving progress, read the existing KV data first, merge the incoming sections on top (incoming values win), then write. This way even if the client sends partial data, it won't destroy other sections.

Test by: deploy the fix, open the app, confirm your data appears. Then simulate a failed load by temporarily breaking the API URL in useProgress — confirm you see the error state, not empty tiles.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Four fix prompts: touch targets, Again button, live data updates, SW staleness |
| v1.1 | 20260403 | CRITICAL: prevent progress wipe on failed initial load. Added loadSuccess guard, retry logic, error state, server-side empty check, merge-on-write. |
