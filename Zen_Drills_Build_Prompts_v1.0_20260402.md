# Zen Drills - Claude Code Build Prompts v1.0 - 20260402

Paste these into Claude Code one at a time. Wait for each phase to complete, review in GitHub Desktop, push, confirm Vercel deploy works, then move to the next phase.

Before starting: the repo should already exist on GitHub with `README.md` containing the full project spec (Zen Drills v1.3).

---

## Phase 0 -- Scaffold

```
Read the README.md in this repo. It contains the full project spec for a Vite + React app called Zen Drills.

For now, just scaffold the project:
- Initialise Vite with the React template in this directory
- Install dependencies: tailwindcss, @tailwindcss/vite
- Set up tailwind.config.js and vite.config.js
- Create the folder structure from the README (empty placeholder files are fine)
- Don't build any UI yet, just get the skeleton compiling with a "Hello Zen Drills" on screen

The folder structure is specified in the README under "Repo Structure". Follow it exactly.
```

**After:** push, connect to Vercel, confirm the hello world deploys.

---

## Phase 1 -- Data Layer

```
Read the README.md for the full project spec.

This phase: build the data layer only.

1. Create src/data/drills.json from the drill list in src/data/Zen_PA_Daily_Drills_v1.1_20260402.md. Follow the JSON schema from the README exactly -- each section needs an id, title, subtitle, icon (use simple emoji strings), and an items array where each item has a stable id (format: sectionid-001, sectionid-002 etc) and text. Flatten all sub-items into the main items array for their section.

2. Create api/progress.js -- the Vercel serverless function that handles GET and POST for progress data. Use @vercel/kv. Follow the KV key schema from the README exactly (progress, streak, heatmap, timer keys). Install @vercel/kv as a dependency.

3. Create src/hooks/useProgress.js -- React hook that calls the API route to read/write daily progress. Should handle the user token (generate on first use, store in localStorage, allow manual entry for multi-device sync).

4. Create src/hooks/useShuffle.js -- shuffle logic, takes an array, returns shuffled copy plus reshuffle function.

Don't build any UI components yet. Just the data layer and hooks.
```

**After:** push. You can now set up Vercel KV (follow the setup guide in README step 4).

---

## Phase 2 -- Core UI

```
Read the README.md for the full project spec.

This phase: build the core UI components and routing. The data layer (drills.json, hooks, API route) already exists from Phase 1.

1. SectionPicker.jsx -- Landing screen. Grid of section tiles. Each tile shows: emoji icon, title, subtitle, today's progress (X/Y items done), progress bar. Overall progress bar at top. Streak counter. Clean minimal light theme.

2. DrillFlashcard.jsx -- Single card view. Shows one item at a time from a shuffled list. "Mark Done" button. Swipe or tap to advance. Progress indicator (3/17). Back button to return to sections.

3. DrillChecklist.jsx -- Full shuffled list view. Tap items to check them off. Checked items get a visual strikethrough/fade. Progress bar at top.

4. ProgressBar.jsx -- Reusable progress bar component.

5. App.jsx -- Simple state-based routing between SectionPicker, DrillFlashcard, and DrillChecklist. Include a toggle to switch between flashcard/checklist modes within a drill session. Include a shuffle/reshuffle button.

6. main.jsx -- Wire everything up.

Design: clean, minimal, light theme. Lots of white space. Thin borders. Subtle shadows. Think Apple Health or Things 3 -- calm and functional. Mobile-first (this is primarily a phone app).

Use Tailwind for all styling. No external component libraries.
```

**After:** push and deploy. Test on phone -- this should be a usable drill app at this point even without timer/heatmap.

---

## Phase 3 -- Timer

```
Read the README.md for the full project spec.

This phase: add the timer system. The core app already works from Phase 2.

1. src/hooks/useTimer.js -- Two timers:
   - Session timer: starts when you enter any drill section, accumulates total time drilling today, persists across section switches, resets at midnight local time.
   - Per-item stopwatch: starts when a flashcard appears or when you tap into an item in checklist mode, stops when you mark done or advance. Records seconds per item.

2. src/components/Timer.jsx -- Display component. Shows session time on the home screen. Shows per-item time in drill views.

3. Update DrillFlashcard.jsx and DrillChecklist.jsx to integrate the per-item timer.

4. Update useProgress.js to write timer data to the KV timer key (drills:timer:{userToken}:{YYYYMMDD}).

5. Update api/progress.js to handle the timer key read/write.

Keep the timer unobtrusive -- small, visible but not dominant. The drill items are the focus, not the clock.
```

**After:** push and deploy. Test timer on phone.

---

## Phase 4 -- Heatmap + Analytics

```
Read the README.md for the full project spec.

This phase: add the heatmap and analytics views. All data already flows through useProgress.

1. src/components/Heatmap.jsx -- GitHub-style calendar heatmap. Shows past 90-180 days. Each day is a small square. Colour intensity = number of items drilled that day. Tooltip on tap showing date and count. Light colour palette (greens or blues on white).

2. src/components/Analytics.jsx -- Dashboard showing:
   - Section frequency: which sections you drill most/least (bar chart or simple ranked list)
   - Average time per item (from timer data)
   - Neglected items: items not drilled in 30+ days (highlight list)
   - Day-of-week patterns: which days you drill most
   - Trend over time: items per day over the past 30/60/90 days

3. Update App.jsx to add navigation to heatmap and analytics views. Could be tabs at bottom or a simple nav from the home screen.

Keep visualisations simple and clean. No charting libraries -- build with CSS/SVG/canvas. Match the light minimal theme.
```

**After:** push and deploy.

---

## Phase 5 -- PWA + Polish

```
Read the README.md for the full project spec.

This phase: make it installable as a PWA and final polish.

1. public/manifest.json -- App name "Zen Drills", short_name "Drills", theme_color and background_color matching the light theme, display: standalone, start_url: "/", icons array pointing to icon-192.png and icon-512.png.

2. public/sw.js -- Basic service worker. Cache the app shell (HTML, JS, CSS) for fast loading. Don't cache API responses (we're online-only for data).

3. Register the service worker in main.jsx.

4. Create simple app icons (192x192 and 512x512 PNG). Can be a minimal "Z" or circle -- just needs to exist for installability.

5. Update index.html with meta tags: viewport, theme-color, apple-mobile-web-app-capable, link to manifest.

6. Polish pass: check all views on mobile viewport, ensure touch targets are large enough (44px minimum), smooth transitions between views, no layout jumps.
```

**After:** push, deploy, install on phone via "Add to Home Screen".

---

## Phase 6 -- Backup + Migration (final)

```
Read the README.md for the full project spec.

This phase: automatic backup and ID migration for when drills are edited.

1. api/backup.js -- Vercel cron function. Reads all KV progress data and writes a JSON snapshot. This runs daily via Vercel cron.

2. Update vercel.json to add the cron schedule for the backup function (once per day).

3. ID migration logic: when drills.json is updated and item IDs change (rename, merge, delete), the app should detect orphaned IDs in progress data and migrate them. Add a simple migration map to drills.json:

{
  "migrations": {
    "old-item-id": "new-item-id",
    "deleted-item-id": null
  }
}

When useProgress loads data, it checks for migrations and applies them automatically, then cleans up the migration map on next deploy.
```

**After:** push and deploy. Done.

---

## Notes

- Each phase is designed to be a standalone, deployable increment
- If Claude Code crashes mid-phase, it can pick up from where it left off because each phase's scope is small
- The README.md in the repo is the single source of truth -- every prompt references it
- Always push and deploy-test between phases before moving on

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260402 | Initial build prompts for 7-phase Claude Code build |
