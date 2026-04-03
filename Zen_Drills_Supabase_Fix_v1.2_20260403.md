# Zen Drills Supabase Fix v1.2 · 20260403

Paste the code block below into Claude Code.

---

## Fix — Infinite Spinner + Timer API Errors

```
There are 2 bugs after the Supabase integration. Fix both.

BUG 1 — useSupabaseProgress loading state never resolves when no user (CRITICAL — causes infinite spinner)

File: src/hooks/useSupabaseProgress.js

The hook starts with loading = true. The useEffect that calls setLoading(false) has an early return when userId is falsy:

  if (!userId) return   // bails out, never calls setLoading(false)

In App.jsx, the spinner shows when (authLoading || loading). Even after auth resolves with user=null (not logged in), loading from useSupabaseProgress is still true. The Auth login screen NEVER appears — just an infinite spinner.

FIX: Add a useEffect BEFORE the existing data-loading useEffect that handles the no-user case:

  useEffect(() => {
    if (!userId) {
      setLoading(false)
    }
  }, [userId])

Also add a .catch() to the getSession() call in src/hooks/useAuth.js so a failed session check doesn't hang forever:

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

And add a guard in src/lib/supabase.js so missing env vars produce a clear console error instead of a silent hang:

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase env vars.',
      'VITE_SUPABASE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING',
      'VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY:', supabaseAnonKey ? 'set' : 'MISSING'
    )
  }
  export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')


BUG 2 — useTimer.js still calls old /api/progress endpoint (causes 500 errors in logs)

File: src/hooks/useTimer.js

The timer hook still fetches from /api/progress (the old Vercel KV endpoint). KV credentials are gone so every call returns 500. This floods the runtime logs with errors.

FIX: Replace the /api/progress calls with localStorage.

On mount, change the fetch to:
  try {
    const raw = localStorage.getItem(`zen-timer-${date}`)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.sessionSeconds) setSessionSeconds(data.sessionSeconds)
      if (data.items) setItemTimes(data.items)
    }
  } catch {}

Change saveTimer to write to localStorage instead of POSTing:
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

Remove the token parameter from saveTimer's dependencies since it's no longer needed.


FILES TO CHANGE:
- src/hooks/useSupabaseProgress.js — add useEffect for no-user loading state
- src/hooks/useAuth.js — add .catch() to getSession()
- src/lib/supabase.js — add env var guard
- src/hooks/useTimer.js — replace /api/progress with localStorage

Do NOT change any other files.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial fix prompt |
| v1.1 | 20260403 | Added incorrect env var pre-flight (retracted) |
| v1.2 | 20260403 | Cleaned up: removed incorrect env var advice, kept the two real bugs only |
