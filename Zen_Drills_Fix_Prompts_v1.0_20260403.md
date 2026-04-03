# Zen Drills Fix Prompts v1.0 · 20260403

Paste these into Claude Code one at a time. Push and deploy-test between each fix.

---

## Fix 1 — Bigger Touch Targets Everywhere

```
All interactive elements need to be significantly larger. There is plenty of screen real estate — use it.

1. "Mark Done" / "Drilled" button in flashcard mode: make it full-width, min-height 56px, larger font
2. Navigation buttons (prev/next/skip) in flashcard mode: min-height 56px, wider (not just icon-sized — include text labels too)
3. Mode toggle buttons (Cards / List): min-height 48px, larger font, more horizontal padding
4. Shuffle button: min-height 48px, wider with more padding
5. Checklist items: min-height 56px per row, larger font size (at least 16px, prefer 18px)
6. Section tiles on home screen: increase padding and min-height so they're chunkier
7. Bottom nav tabs: min-height 56px
8. Back button: min-width and min-height 48px

General rule: if a button currently has padding of p-2, make it p-3 or p-4. If text is text-sm, make it text-base. Go generous — this is a phone app used with thumbs.
```

---

## Fix 2 — "Again" Button Always Visible

```
Bug: when you complete all items in a drill section, the reshuffle/again button vanishes. It should always be visible.

Fix the drill views (DrillFlashcard.jsx and the flashcard/checklist rendering in App.jsx) so that:

1. When all items in a section are marked done, show a prominent "Again" button that reshuffles all items and unchecks them for another round
2. The Shuffle button in the mode toggle bar should always be visible regardless of completion state
3. In flashcard mode, when you reach the last card and mark it done, don't dead-end — show a completion state with "Again" button and summary (e.g. "17/17 done - 4m 32s")
4. The "Again" button should be at least as large as the "Mark Done" button — full width, easy to tap

Never hide navigation or action buttons based on completion state. The user always needs a way to reshuffle and go again.
```

---

## Fix 3 — Activity and Analytics Live Updates

```
Bug: the Activity (heatmap) and Analytics views don't show updated data after drilling. You have to close and reopen the app to see changes.

The root cause is that these components only fetch progress data on initial mount and don't re-fetch when navigated to.

Fix:

1. In useProgress.js (or wherever progress data is fetched), expose a refetch/reload function
2. When the user navigates to the Activity or Analytics tab via the bottom nav, trigger a fresh data fetch from the KV API — don't rely on cached React state
3. Use a key or dependency that changes when the active tab changes, so the components re-render with fresh data
4. Alternative approach: lift the progress data fetch to the App level and pass it down, refetching whenever the view changes to activity or analytics
5. Make sure the heatmap "today" square updates in real-time as items are drilled — it should reflect the current session count, not just what was in KV on page load

The data is already being written to KV correctly. The issue is purely on the read side — the UI components need to re-read when they become visible.
```

---

## Fix 4 — Service Worker Staleness (Desktop vs iPhone mismatch)

```
The PWA service worker is causing the iPhone app to show stale versions after deploys. Fix the service worker (public/sw.js) so that:

1. Use a versioned cache name that changes on every build (e.g. include a hash or timestamp)
2. On activate, immediately delete ALL old caches and call clients.claim() so the new version takes over without waiting
3. On fetch, use network-first for ALL requests (HTML, JS, CSS) — only fall back to cache if offline
4. Add a mechanism so the app detects when a new service worker is waiting, and auto-reloads the page (no user prompt, just reload)
5. In main.jsx, when registering the service worker, listen for the 'controllerchange' event and reload

The goal: when a new version deploys, both desktop and iPhone pick it up within seconds of opening the app, not hours later.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Four fix prompts: touch targets, Again button, live data updates, SW staleness |
