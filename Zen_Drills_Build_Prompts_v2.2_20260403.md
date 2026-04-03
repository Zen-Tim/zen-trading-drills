# Zen Drills - Claude Code Build Prompts v2.2 - 20260403

Paste these into Claude Code one at a time. Wait for each phase to complete, review in GitHub Desktop, push, confirm Vercel deploy works, then move to the next phase.

The README.md is the single source of truth for the project spec.

---

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Scaffold | Done |
| 1 | Data Layer | Done |
| 2 | Core UI | Done |
| 3 | Timer | Done |
| 4 | Heatmap + Analytics | Done |
| 5 | PWA + Polish | Done |
| 6 | Backup + Migration | Done |
| -- | Hotfix: Kill Random Tokens | Done |
| 7 | Multi-Rep Data Model | Done |
| 8 | Multi-Rep UI | Done |
| 9 | Session Resume | Done |
| 10 | Haptic Feedback + Micro-Interactions | Next |
| 11 | Focus Mode | Queued |
| 12 | Basic Tests | Queued |
| 13 | CI Pipeline | Queued |
| 14 | Error Tracking (Sentry) | Queued |

---

## Phase 10 -- Haptic Feedback + Micro-Interactions

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: small tactile and visual polish that makes the app feel responsive and satisfying on mobile.

1. Haptic feedback (navigator.vibrate):
   - Short pulse (10ms) on marking an item done
   - Double pulse (10ms, 50ms gap, 10ms) on "Again" tap
   - Longer pulse (20ms) on completing all items in a section
   - Wrap in a check: if (navigator.vibrate) { ... } -- not all browsers support it
   - No haptics on simple navigation taps -- only on "I did something" moments

2. Completion micro-animation:
   - When marking done in flashcard mode: brief scale-up (1.02x) and fade of the card, then slide to next
   - When checking off in checklist mode: smooth strikethrough animation (line draws across, 200ms)
   - When completing all items in a section: subtle confetti or checkmark burst (keep it minimal -- 1 second max, no sound, no blocking)

3. Progress bar animations:
   - Progress bars should animate smoothly when value changes (CSS transition, 300ms ease)
   - The overall progress bar on home screen should update live when returning from a drill session

4. Touch feedback:
   - All tappable elements should have an active state (subtle background darken on press, 50ms)
   - Cards in flashcard mode should have a slight press-down effect (scale 0.98x on touch start, back to 1x on release)

Keep all animations short and non-blocking. The app should feel snappy, not sluggish. Every animation should complete in under 300ms except the section-complete celebration (1 second max). If any animation causes jank on older phones, it's better to remove it than to keep it laggy.
```

**After:** push and deploy. Test on phone -- the app should feel noticeably more polished and responsive.

---

## Phase 11 -- Focus Mode

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: add a "Focus" mode that surfaces items you haven't drilled recently, so nothing falls through the cracks over time.

1. Build a "Focus" section on the home screen (below the regular section tiles, or as a special tile at the top):
   - Title: "Focus" with subtitle "Items you haven't drilled recently"
   - It pulls items from ALL sections that haven't been drilled in the past 7 days (configurable later, hardcode 7 for now)
   - Shows count: "14 items need attention"
   - Tapping it enters a drill session (flashcard or checklist, user's last-used mode) with just those neglected items, shuffled

2. To determine "last drilled" dates:
   - useProgress already reads the daily progress keys from KV
   - Add a function getLastDrilledDate(itemId) that scans the past 30 days of progress data to find the most recent date each item was drilled
   - Cache this on load -- don't scan on every render
   - Items that have NEVER been drilled should appear first in the focus list

3. When drilling focus items:
   - Progress is recorded normally against each item's home section (not a separate "focus" section)
   - After completing a focus item, it disappears from the focus list (it's now been drilled today)
   - The focus count on the home screen updates live

4. Visual treatment:
   - Focus tile should look slightly different from section tiles -- maybe a muted amber/gold accent colour instead of the default
   - In the focus drill session, show which section each item belongs to as a small label above the item text

Design: Focus mode is a lens across all sections, not a new section. It doesn't change the data model. It's just a filtered view into existing data with a "staleness" heuristic.
```

**After:** push and deploy. Test: skip a few sections for a week, then check if Focus mode correctly surfaces them.

---

## Phase 12 -- Basic Tests

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: add a minimal test setup so we catch bugs before deploying.

1. Install Vitest:
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

2. Add vitest config to vite.config.js:
   test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' }

3. Create src/test/setup.js with @testing-library/jest-dom imports.

4. Write these specific tests (create files in src/__tests__/ or colocated as .test.js):

   a. useShuffle.test.js:
      - Shuffled array has same length as input
      - Shuffled array contains all original items (no duplicates, no missing)
      - Shuffling twice produces different orders (run 10 times, at least one should differ)
      - Empty array returns empty array
      - Single item array returns single item

   b. useProgress.test.js (unit test the logic, mock the API calls):
      - incrementRep on a new item sets count to 1
      - incrementRep on an existing item increments the count
      - getUniqueCount returns correct count of items with count >= 1
      - getRepCount returns 0 for un-drilled items
      - Auto-migration: passing old array format ["id1", "id2"] converts to { "id1": 1, "id2": 1 }

   c. drills.test.js:
      - drills.json parses without error
      - Every section has a unique id
      - Every item has a unique id (globally, not just within section)
      - Every item id follows the pattern {sectionId}-{number}
      - No empty sections (every section has at least one item)

5. Add a test script to package.json: "test": "vitest run"

6. Verify all tests pass: npm run test

Keep tests simple and focused. No snapshot tests, no complex mocks. These should run in under 5 seconds total.
```

**After:** push. Run `npm run test` locally to confirm all pass.

---

## Phase 13 -- CI Pipeline

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: add a GitHub Actions CI pipeline that runs on every push. If tests or build fail, the push is flagged.

1. Create .github/workflows/ci.yml:

   name: CI
   on: [push, pull_request]
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - run: npm ci
         - run: npm run test
         - run: npm run build

   That's it. Three checks: install, test, build. If any fail, GitHub shows a red X on the commit.

2. Add a lint step (optional but recommended):
   - Install ESLint if not already present: npm install -D eslint
   - Add a minimal ESLint config (.eslintrc.json or eslint.config.js) with the react plugin
   - Add script: "lint": "eslint src/"
   - Add "run: npm run lint" to the CI pipeline between test and build

3. Update README.md to note that CI runs on every push.

The pipeline should complete in under 2 minutes. No deployment step -- Vercel handles that separately. This is just a quality gate.
```

**After:** push and check the Actions tab on GitHub -- the pipeline should run and show green.

---

## Phase 14 -- Error Tracking (Sentry)

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: add Sentry error tracking so you know when something breaks in production.

1. Create an account at sentry.io (free tier is fine).
2. Create a new project: platform = React, name = zen-drills.
3. Install: npm install @sentry/react

4. Initialise Sentry in main.jsx (before React renders):

   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     tracesSampleRate: 0.1,
   });

5. Wrap the app in Sentry's error boundary in main.jsx:

   <Sentry.ErrorBoundary fallback={<p>Something went wrong. Refresh to try again.</p>}>
     <App />
   </Sentry.ErrorBoundary>

6. Add the DSN as a Vercel environment variable (VITE_SENTRY_DSN) rather than hardcoding it.

7. Test: temporarily add a button that throws an error, deploy, tap it, confirm the error appears in Sentry dashboard. Then remove the test button.

This is fire-and-forget setup. Once it's in, every unhandled error in production gets captured with stack trace, browser info, and breadcrumbs. You'll know about bugs before you notice them.
```

**After:** push and deploy. Confirm Sentry is receiving the test event.

---

## Notes

- Phases 10-11 are functional polish (each is independent, do in any order)
- Phases 12-14 are professional upgrades (do 12 before 13, as CI runs the tests from 12)
- Each phase is a standalone deployable increment
- Always push and deploy-test between phases

---

## Completed Work (Archive)

### Phase 0 -- Scaffold (Done 20260402)

Initialised Vite + React, installed Tailwind, created folder structure from spec. Hello world deployed to Vercel.

### Phase 1 -- Data Layer (Done 20260402)

Created drills.json (145 items, 8 sections), api/progress.js serverless function with Vercel KV, useProgress.js hook with token management, useShuffle.js.

### Phase 2 -- Core UI (Done 20260402)

Built SectionPicker, DrillFlashcard, DrillChecklist, ProgressBar. State-based routing in App.jsx. Light minimal theme, mobile-first. Usable drill app.

### Phase 3 -- Timer (Done 20260402)

Session timer (pauses on home, resumes on section enter) + per-item stopwatch (flashcard mode only). Timer data written to KV.

### Phase 4 -- Heatmap + Analytics (Done 20260402)

GitHub-style calendar heatmap (180 days). Analytics dashboard: section frequency, average time per item, neglected items, day-of-week patterns, 30-day trend.

### Phase 5 -- PWA + Polish (Done 20260402)

manifest.json, service worker (network-first), app icons (gray circle, white Z), meta tags, mobile touch target pass. Installable via Add to Home Screen.

### Phase 6 -- Backup + Migration (Done 20260402)

api/backup.js Vercel cron (daily 06:00 UTC, rolling 30-day retention). ID migration via migrations field in drills.json, auto-applied on load.

### Hotfix -- Kill Random Tokens (Done 20260403)

Hardcoded user token to `zen-tim`. Deleted generateToken(), removed token UI. Every device/refresh/reinstall hits the same KV keys.

### Phase 7 -- Multi-Rep Data Model (Done 20260403)

Progress data model changed from arrays to count maps. Added incrementRep, getRepCount, getUniqueCount. Auto-migration from v1.4 array format on first load.

### Phase 8 -- Multi-Rep UI (Done 20260403)

"Again" button in flashcard mode (3-second fade, +1 animation). Rep count badges on completed items in both modes. Tapping completed checklist items increments reps. "New Round" button reshuffles all items. Section tiles show unique coverage with subtle rep count.

### Phase 9 -- Session Resume (Done 20260403)

useSessionResume hook saves active section, mode, shuffle order, and position to localStorage. Resume prompt on home screen for same-day sessions. Auto-clears on midnight rollover.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260402 | Initial build prompts for 7-phase Claude Code build (Phases 0-6) |
| v2.0 | 20260403 | Added Phases 7-14: multi-rep, session resume, haptics, focus mode, tests, CI, Sentry |
| v2.1 | 20260403 | Consolidated into single file. Completed phases (0-6 + hotfix) archived at back. Status table added. |
| v2.2 | 20260403 | Fixed status: Phases 7-9 confirmed done from codebase. Moved to archive with summaries. Phase 10 is next. |
