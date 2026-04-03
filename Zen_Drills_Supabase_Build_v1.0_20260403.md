# Zen Drills Supabase Build Prompt v1.0 · 20260403

Paste into Claude Code. This is the Supabase integration — adds Google sign-in and replaces Vercel KV with a proper database.

---

## Supabase Integration — Auth + Database

```
Read the README.md and understand the current app structure. This prompt adds Supabase auth (Google sign-in) and replaces Vercel KV with Supabase Postgres for progress storage.

CRITICAL RULES:
- Do NOT delete any existing Vercel KV code yet. We're building alongside it.
- The app must still compile and work after this change.
- Test nothing in this prompt — just build it. We test manually after deploy.

STEP 1: Install Supabase client library

npm install @supabase/supabase-js

STEP 2: Create src/lib/supabase.js

Initialize the Supabase client using these exact environment variable names (they have double "SUPABASE" because of how Vercel named them — this is correct):

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

STEP 3: Create src/components/Auth.jsx

Simple auth component:
- If not signed in: show a centered screen with the app name "Zen Drills" and a single "Sign in with Google" button. Clean, minimal, matches the existing light theme. The button should be large and easy to tap (min-height 56px).
- Use supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
- No email/password fields. Just the one Google button.

STEP 4: Create src/hooks/useAuth.js

Hook that:
- Calls supabase.auth.getSession() on mount to check if user is signed in
- Listens to supabase.auth.onAuthStateChange() for sign-in/sign-out events
- Returns { user, loading, signOut }
- signOut calls supabase.auth.signOut()

STEP 5: Create src/hooks/useSupabaseProgress.js

This is a NEW hook that replaces useProgress.js functionality but reads/writes Supabase Postgres instead of Vercel KV. It should export the same interface as useProgress.js so the rest of the app doesn't need to change.

The hook needs the user object (from useAuth) to get the user_id.

Database operations:

a) Load today's progress on mount:
   - SELECT section_id, item_id, rep_count FROM drill_progress WHERE user_id = {user.id} AND drill_date = {today}
   - Build the same shape as before: { "htf": { "htf-001": 2, "htf-003": 1 }, ... }

b) incrementRep(sectionId, itemId):
   - UPSERT into drill_progress: INSERT ... ON CONFLICT (user_id, drill_date, section_id, item_id) DO UPDATE SET rep_count = rep_count + 1, updated_at = now()
   - This is the key difference from KV: it updates ONE ROW, not the entire blob. It cannot destroy other data.
   - Update local React state optimistically (same as current code)

c) unmarkDone(sectionId, itemId):
   - DELETE FROM drill_progress WHERE user_id = {user.id} AND drill_date = {today} AND section_id = {sectionId} AND item_id = {itemId}

d) Load streak:
   - SELECT current_streak, last_date FROM drill_streak WHERE user_id = {user.id}
   - If no row, return { current: 0, lastDate: null }

e) Update streak (call after incrementRep):
   - UPSERT into drill_streak with the same logic as the current api/progress.js streak code

f) Load heatmap:
   - SELECT drill_date, total_reps FROM drill_heatmap WHERE user_id = {user.id} ORDER BY drill_date
   - Return as { "20260401": 12, "20260402": 8 } (same shape as before)

g) Update heatmap (call after incrementRep):
   - UPSERT into drill_heatmap: INSERT ... ON CONFLICT (user_id, drill_date) DO UPDATE SET total_reps = total_reps + 1

h) getRepCount, getUniqueCount, isDone, sectionProgress, totalDone:
   - Same logic as current useProgress.js — these are computed from the local progress state, not database calls

i) refetch:
   - Re-query streak, heatmap from Supabase (same as current refetch but hitting Supabase instead of /api/progress)

The hook should return the exact same object shape as useProgress.js:
{ token (can be user.id or user.email), progress, streak, heatmap, analytics, timerData, loading, markDone, unmarkDone, incrementRep, getRepCount, getUniqueCount, isDone, sectionProgress, totalDone, date, refetch }

For analytics and timerData: return empty defaults for now ({ sectionCounts: {}, itemLastDrilled: {} } and { sessionSeconds: 0, items: {} }). We can add those later. Don't let missing analytics block the core progress tracking.

STEP 6: Update App.jsx

Wrap the app in an auth gate:

import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'

In the App component:
- Call useAuth() to get { user, loading: authLoading, signOut }
- If authLoading, show the existing loading spinner
- If no user, show <Auth />
- If user exists, show the existing app (but use useSupabaseProgress instead of useProgress)

Change the useProgress() call to useSupabaseProgress(user) — pass the user object in.

Add a small sign-out button somewhere unobtrusive — maybe in the bottom nav area or as a small icon on the home screen. Just needs to exist, doesn't need to be prominent.

STEP 7: Add Supabase URL to the Authorized Redirect

In the Supabase client initialization (src/lib/supabase.js), no special redirect handling is needed — the Supabase JS client handles OAuth redirects automatically by reading the URL hash on page load.

But make sure the Auth component's signInWithOAuth uses:
redirectTo: window.location.origin

This ensures after Google sign-in, the user comes back to the app (not the Supabase default page).

STEP 8: Do NOT change these files:
- src/data/drills.json (drill content stays the same)
- src/components/SectionPicker.jsx
- src/components/DrillFlashcard.jsx
- src/components/DrillChecklist.jsx
- src/components/Heatmap.jsx
- src/components/Analytics.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js

These components receive progress data as props — they don't care where it comes from. Don't touch them.

STEP 9: Keep the old files (don't delete):
- src/hooks/useProgress.js (old KV hook — keep it, we might need to switch back)
- api/progress.js (old KV API — keep it)
- api/backup.js (old KV backup — keep it)

Summary of new files:
- src/lib/supabase.js
- src/hooks/useAuth.js
- src/hooks/useSupabaseProgress.js
- src/components/Auth.jsx

Summary of modified files:
- App.jsx (add auth gate, switch to useSupabaseProgress)
- package.json (add @supabase/supabase-js)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Supabase integration: auth + database, replaces Vercel KV for progress |
