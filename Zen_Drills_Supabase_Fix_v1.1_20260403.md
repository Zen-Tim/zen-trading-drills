# Zen Drills Supabase Fix v1.1 · 20260403

Paste into Claude Code. Fixes the infinite loading spinner after Supabase integration.

---

## Pre-Flight (YOU do this in Vercel dashboard BEFORE running the prompt)

The anon key env var is missing. Vercel created `NEXT_PUBLIC_VITE_SUPABASE_SUPABASE_ANON_KEY` but Vite only reads vars starting with `VITE_`. The code expects `VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY` which doesn't exist.

1. Go to **Vercel > zen-trading-drills > Settings > Environment Variables**
2. Click `NEXT_PUBLIC_VITE_SUPABASE_SUPABASE_ANON_KEY` — copy its value
3. Click **Add New** — name: `VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY`, paste value, All Environments
4. Save

Do NOT redeploy yet — run the Claude Code prompt below first so everything is fixed in one deploy.

---

## Fix — Infinite Spinner + Timer API Errors

```
There are 3 bugs causing the app to show an infinite loading spinner after the Supabase integration. Fix all three.

BUG 1 — useSupabaseProgress loading state never resolves when no user (CRITICAL)

File: src/hooks/useSupabaseProgress.js

The hook starts with loading = true. The useEffect that calls setLoading(false) has an early return when userId is falsy:

  if (!userId) return   // bails out, never calls setLoading(false)

In App.jsx, the spinner shows when (authLoading || loading). Even after auth resolves with user=null (not logged in), loading from useSupabaseProgress is still true. The Auth login screen NEVER appears.

FIX: Add another useEffect that sets loading to false when there's no userId:

  useEffect(() => {
    if (!userId) {
      setLoading(false)
    }
  }, [userId])

Put this BEFORE the existing data-loading useEffect. This way:
- If user is null -> loading becomes false immediately -> Auth screen shows
- If user exists -> the data-loading useEffect runs and sets loading false when done


BUG 2 — useTimer.js still calls old /api/progress endpoint

File: src/hooks/useTimer.js

The timer hook still does:
- A GET fetch to /api/progress on mount (to load persisted timer data)
- A POST fetch to /api/progress every 30 seconds (to save timer data)

The old Vercel KV credentials are gone, so every call returns 500/400. This creates a stream of errors in the Vercel runtime logs.

FIX: Replace the /api/progress fetch calls with localStorage persistence. The timer data is not critical enough to need server persistence — it's a convenience feature.

Change the mount useEffect from:
  fetch(`/api/progress?token=${token}&type=timer&date=${date}`)
    .then(...)

To:
  try {
    const raw = localStorage.getItem(`zen-timer-${date}`)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.sessionSeconds) setSessionSeconds(data.sessionSeconds)
      if (data.items) setItemTimes(data.items)
    }
  } catch {}

Change the saveTimer function from POSTing to /api/progress to:
  const saveTimer = useCallback(() => {
    try {
      let items = { ...itemTimes }
      if (activeItemId && itemStartRef.current) {
        const elapsed = Math.round((Date.now() - itemStartRef.current) / 1000)
        items[activeItemId] = (items[activeItemId] || 0) + elapsed
      }
      localStorage.setItem(`zen-timer-${date}`, JSON.stringify({ sessionSeconds, items }))
    } catch {}
  }, [date, sessionSeconds, itemTimes, activeItemId])

Remove the token dependency from saveTimer since we no longer need it for API calls.

This eliminates all calls to the old /api/progress endpoint from the timer.


BUG 3 — Supabase client needs error handling for missing env vars

File: src/lib/supabase.js

If the env vars are undefined, createClient(undefined, undefined) causes getSession() to hang or throw, creating another path to the infinite spinner.

FIX: Add a guard with a clear console error:

  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase env vars.',
      'VITE_SUPABASE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING',
      'VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY:', supabaseAnonKey ? 'set' : 'MISSING'
    )
  }

  export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

And in src/hooks/useAuth.js, wrap getSession in a try/catch so it doesn't hang:

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Auth session check failed:', err)
        setUser(null)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])


SUMMARY OF CHANGES:
- src/hooks/useSupabaseProgress.js — add useEffect to set loading=false when no userId
- src/hooks/useTimer.js — replace /api/progress fetches with localStorage
- src/lib/supabase.js — add env var guard with console.error
- src/hooks/useAuth.js — add .catch() to getSession() call

Do NOT change any other files. These are surgical fixes.
```

---

## After Deploy Checklist

1. Open zen-trading-drills.vercel.app in browser
2. You should see the Google sign-in button (not the spinner)
3. Open browser DevTools console — check for any red errors
4. If you see "Missing Supabase env vars" in console, the Vercel env var wasn't added correctly
5. Try signing in with Google
6. If sign-in works, drill a few items, close browser, reopen — check progress persists
7. Check Vercel runtime logs — the stream of 500/400 errors on /api/progress should be gone

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Fix infinite spinner: useSupabaseProgress loading state, useTimer old API calls, Supabase env var guard |
| v1.1 | 20260403 | Added pre-flight env var fix: VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY missing from Vercel (only NEXT_PUBLIC_ version exists which Vite ignores) |
