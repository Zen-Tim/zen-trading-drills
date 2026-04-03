# Zen Drills - Claude Code Build Prompts v2.0 - 20260403

Paste these into Claude Code one at a time. Wait for each phase to complete, review in GitHub Desktop, push, confirm Vercel deploy works, then move to the next phase.

Before starting: the README.md has been updated to v1.5 with the multi-rep spec.

---

## Phase 7 -- Multi-Rep Data Model

```
Read the README.md in this repo. It contains the full project spec (Zen Drills v1.5).

This phase: change the progress data model from binary (done/not done) to count-based (number of reps per item). No UI changes yet -- just the data layer.

1. Update useProgress.js:
   - Change the internal data structure from arrays to count maps. Old format: { "htf": ["htf-001", "htf-003"] }. New format: { "htf": { "htf-001": 2, "htf-003": 1 } }
   - Add auto-migration: when loading data, detect the old array format and convert it. Each ID in the array becomes count 1. Write the converted format back to KV immediately so migration only happens once.
   - Add an incrementRep(sectionId, itemId) function that increments the count for an item (or sets it to 1 if not present).
   - The existing markDone function should now call incrementRep internally (first completion = count 1).
   - Add a getRepCount(sectionId, itemId) function that returns the current count (0 if not drilled).
   - Add a getUniqueCount(sectionId) function that returns how many distinct items have count >= 1.
   - Update the heatmap count to use total reps (sum of all counts across all sections) not unique items.

2. Update api/progress.js:
   - The serverless function should accept the new count map format on POST.
   - On GET, return whatever format is stored (the hook handles migration).
   - No other changes needed -- it's just storing/retrieving JSON.

3. Do NOT change any UI components yet. The existing UI should still work because markDone still exists -- it just writes counts internally now. Progress display might temporarily show wrong numbers if it was reading array lengths -- that's fine, we'll fix in the next phase.

Test: after this phase, the app should still work. Drilling an item should write a count map to KV. Refreshing should load it back correctly. If there was old array-format data in KV, it should auto-migrate on first load.
```

**After:** push and deploy. Open the app, drill a few items, check Vercel KV in the dashboard to confirm the new count map format is being written.

---

## Phase 8 -- Multi-Rep UI

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: add the multi-rep UI elements. The data layer (count maps, incrementRep) already works from Phase 7.

1. DrillFlashcard.jsx -- "Drill Again" button:
   - After marking an item done, show a small secondary "Again" button. It should appear with a subtle fade-in, stay visible for about 3 seconds, then fade out.
   - While visible, tapping "Again" calls incrementRep for that item, shows a brief "+1" animation or count update, and keeps the item in the queue for another pass later in the shuffle.
   - If the user advances to the next card (swipe/tap), the Again button disappears. Normal flow is uninterrupted -- Again is opt-in.
   - If an item has been drilled more than once, show a small rep count badge (e.g. "x2") in the corner of the card.

2. DrillChecklist.jsx -- Rep count on completed items:
   - Completed items show a small count badge on the right side (e.g. "x2", "x3"). Items done once show no badge (x1 is implied by the checkmark).
   - Tapping a completed item increments its rep count (does NOT uncheck it). The badge updates immediately.
   - Visual: the badge should be subtle -- small, muted colour, doesn't compete with the checklist flow.

3. "New Round" button:
   - When all items in the current shuffle are completed, show a "New Round" button prominently (this replaces the "all done" state). Tapping it reshuffles all items and resets their visual state to unchecked for this round. Rep counts carry over -- items done in round 1 still have their counts, and doing them again in round 2 increments further.
   - Also make "New Round" available in the section header/menu at any time, not just when all items are done. This lets the user start a fresh round even if they skipped some items.

4. SectionPicker.jsx -- Progress display:
   - Section tiles should show unique items done / total items (not total reps). Use getUniqueCount. "12/17 items" means 12 distinct items done at least once today.
   - If total reps > unique items (meaning some items were drilled multiple times), show a small secondary indicator like "24 reps" below the main progress. Keep it subtle.

5. Update the overall progress bar on the home screen to use unique items done / total items across all sections.

Design: all multi-rep elements should be visually secondary to the main drill flow. The primary experience (mark done, advance) should feel exactly the same as before. Multi-rep is an opt-in layer on top.
```

**After:** push and deploy. Test on phone: drill items, use Again, start a new round, verify counts persist.

---

## Phase 9 -- Session Resume

```
Read the README.md in this repo (Zen Drills v1.5).

This phase: when the user closes and reopens the app mid-session, resume where they left off instead of dumping them back to the home screen.

1. Save session state to localStorage whenever it changes:
   - Which section is currently active (sectionId)
   - Which mode (flashcard or checklist)
   - Current position in the shuffle (index)
   - The shuffle order itself (so items don't reshuffle on reopen)
   - Which items are marked done in this round

2. On app load, check for saved session state:
   - If there's an active session from today (check the date), show a "Resume" prompt on the home screen: "Continue [Section Name]? 8/17 done" with Resume and Start Fresh buttons.
   - If the session is from a previous day, discard it silently (day has reset).
   - If there's no saved session, show the normal home screen.

3. Clear the saved session state when:
   - The user completes all items and doesn't start a new round
   - The user explicitly navigates back to the home screen (back button)
   - The day rolls past midnight

Keep it lightweight -- localStorage only, no KV writes for session state. This is purely a convenience feature for the single device you're actively using.
```

**After:** push and deploy. Test: open app, drill half a section, close the app (or switch to another app), reopen -- should offer to resume.

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

## Phase 12 -- Pro Upgrade: Basic Tests

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

## Phase 13 -- Pro Upgrade: CI Pipeline

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

## Phase 14 -- Pro Upgrade: Error Tracking

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

- Phases 7-8 are the multi-rep feature (do these together, they're one logical unit)
- Phases 9-11 are functional polish (each is independent, do in any order)
- Phases 12-14 are professional upgrades (do 12 before 13, as CI runs the tests from 12)
- Each phase is still a standalone deployable increment
- Always push and deploy-test between phases

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260402 | Initial build prompts for 7-phase Claude Code build |
| v2.0 | 20260403 | Added Phase 7-8 (multi-rep A+D), Phase 9-11 (session resume, haptics, focus mode), Phase 12-14 (tests, CI, Sentry) |
