# Zen Drills v1.5 · 20260403

## Status: LIVE — Phase 7+ In Progress

Core app built and deployed (Phases 0-6). Multi-rep and polish features queued (Phases 7-14). See `Zen_Drills_Build_Prompts_v2.0_20260403.md` for build prompts.

---

## What It Is

A personal daily practice app for PA trading drills. Pick a section, shuffle the items, work through them in flashcard or checklist mode, track daily progress. Supports multiple reps per item per day.

---

## Stack

- **Framework:** Vite + React (SPA)
- **Hosting:** Vercel (auto-deploy from GitHub main branch)
- **Repo:** GitHub (managed via GitHub Desktop + Claude Code)
- **Styling:** Tailwind CSS
- **Data (drills):** JSON file in repo (`/src/data/drills.json`)
- **Data (progress):** Vercel KV (Redis) for cross-device persistence

---

## Repo Structure

```
zen-drills/
  src/
    data/
      drills.json          # All sections and items (145 items, 8 sections)
    components/
      SectionPicker.jsx    # Landing screen with section tiles
      DrillFlashcard.jsx   # One-at-a-time card mode (with Drill Again)
      DrillChecklist.jsx   # Full shuffled list, rapid-tap mode (with rep counts)
      Heatmap.jsx          # GitHub-style calendar heatmap
      Analytics.jsx        # Section frequency, time patterns, trends
      Timer.jsx            # Session + per-item stopwatch
      ProgressBar.jsx      # Reusable progress bar
    hooks/
      useProgress.js       # Read/write daily progress to Vercel KV
      useShuffle.js        # Shuffle logic + state (supports new rounds)
      useTimer.js          # Session and per-item timing
    App.jsx                # Router between views + bottom tab bar
    main.jsx               # Vite entry + service worker registration
  api/
    progress.js            # Vercel serverless function (KV read/write)
    backup.js              # Vercel cron: daily snapshot of KV data
  public/
    manifest.json          # PWA manifest (name, icons, theme)
    sw.js                  # Service worker (network-first, app shell caching)
    icon-192.png           # PWA icon (gray circle, white Z)
    icon-512.png           # PWA icon (gray circle, white Z)
  index.html
  package.json
  vite.config.js
  vercel.json              # Includes cron config for daily backup
  tailwind.config.js
```

---

## Data: drills.json

Single flat JSON file. Each section has an id, display info, and ordered array of items. To add/remove/reorder items, edit this file and push.

```json
{
  "migrations": {},
  "sections": [
    {
      "id": "htf",
      "title": "HTF Analysis",
      "subtitle": "Higher Time Frame",
      "icon": "chart",
      "items": [
        { "id": "htf-001", "text": "Monthly" },
        { "id": "htf-002", "text": "Weekly" }
      ]
    }
  ]
}
```

Each item gets a stable ID so progress tracking doesn't break when items are reordered or renamed. The `migrations` field handles ID remapping when items are renamed/merged/deleted.

---

## Data: Progress (Vercel KV)

Keyed by a simple user token (no auth system -- just a self-generated ID stored in localStorage, synced across devices by entering it once).

```
Key:    drills:progress:{userToken}:{YYYYMMDD}
Value:  { "htf": { "htf-001": 2, "htf-003": 1 }, "open": { "open-002": 1 } }
        # section -> { itemId: repCount }
        # repCount >= 1 means done, value = number of times drilled today
        # (v1.4 used arrays — auto-migrated on first load)

Key:    drills:streak:{userToken}
Value:  { "current": 5, "lastDate": "20260402" }

Key:    drills:heatmap:{userToken}
Value:  { "20260401": 12, "20260402": 8 }   # date -> total reps count

Key:    drills:timer:{userToken}:{YYYYMMDD}
Value:  { "sessionSeconds": 1320, "items": { "htf-001": 45, "htf-003": 62 } }

Key:    drills:analytics:{userToken}
Value:  { section counts, per-item last-drilled dates }

Key:    backup:{YYYYMMDD}
Value:  { snapshot of all drills:* keys, rolling 30-day retention }
```

**Migration from v1.4 array format:** The progress value changed from arrays (sets of done IDs) to objects (count maps). On first load, useProgress detects the old array format and auto-converts: each ID in the array becomes `{ id: 1 }`. No manual migration needed.

One serverless API route (`/api/progress`) handles GET and POST.

---

## Multi-Rep System

Items can be drilled more than once per day. Two mechanisms:

### A -- Drill Again (individual item)

In **flashcard mode**: after marking an item done, a small "Again" button appears briefly (2-3 seconds, then fades). Tapping it increments the rep count for that item and keeps it in the current queue for another pass.

In **checklist mode**: completed items show a small rep count badge (e.g. "x2"). Tapping a completed item increments its count (not unchecks it). The item stays visually completed but the badge updates.

### D -- New Round (section level)

A "New Round" button appears at the section level once all items in the current shuffle are done (or at any time via the section menu). Tapping it reshuffles all items and starts a fresh pass. All items appear undone in the new round, but rep counts carry over -- an item done once in round 1 and once in round 2 shows x2.

### Progress counting

- **Section tile progress** on home screen shows unique items done / total items (not reps). "12/17 items" means 12 distinct items have been drilled at least once.
- **Heatmap** counts total reps across all sections (incentivises volume).
- **Analytics** shows both: unique coverage and total reps.

---

## Multi-Device Sync

No login system. On first use the app generates a short token (e.g. `zen-7f3k`). You note it down. On a second device, enter the same token in settings. Both devices read/write to the same KV key.

Simple, no auth infrastructure, good enough for a single user.

---

## Edit Workflow

1. Open Claude Code in the repo
2. Edit `drills.json` (add item, move between sections, reorder)
3. If renaming/merging/deleting items, add entries to the `migrations` field
4. Review in GitHub Desktop
5. Push to main
6. Vercel auto-deploys (~30 seconds)
7. On next app load, migrations are applied automatically to progress data

No database migrations, no CMS, no admin panel. The JSON file IS the database.

---

## Setup Guide

### 1. Create the repo

```bash
mkdir zen-drills && cd zen-drills
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss @tailwindcss/vite
git init
```

### 2. Connect to GitHub

Open GitHub Desktop, add the local repo, publish to GitHub (private or public -- your call).

### 3. Connect to Vercel

Go to vercel.com/new, import the GitHub repo. Vercel auto-detects Vite and sets the build config. Every push to `main` triggers a deploy from here on.

### 4. Add Vercel KV (Redis)

This is the cross-device progress store. One-time setup:

1. Go to your project in the Vercel dashboard
2. Click **Storage** tab (left sidebar)
3. Click **Create Database** -> select **KV (Redis)**
4. Name it `zen-drills-kv`, pick the free tier, select your region
5. Click **Create**
6. Vercel auto-injects these environment variables into your project:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

For local development:

```bash
npm install @vercel/kv
npx vercel link          # links local folder to Vercel project
npx vercel env pull      # pulls KV env vars into .env.local
```

Now `api/progress.js` can import `@vercel/kv` and the credentials are automatic -- no manual env var wiring.

### 5. PWA setup

The `public/manifest.json` and service worker handle installability. After first deploy, visit the app on your phone in Safari/Chrome, tap "Add to Home Screen". It behaves like a native app from then on.

### 6. Daily use

Open the app on any device. First time generates a sync token. Enter the same token on other devices via the settings icon. Drill away.

---

## Views

1. **Home** -- Section tiles with today's progress per section (unique items done / total), overall progress bar, streak counter, session timer visible when running. Subtle rep count shown if total reps > unique items.
2. **Drill (Flashcard)** -- One item at a time, swipe/tap to advance, mark done button, "Again" button appears briefly after marking done, per-item timer visible, rep count badge if item done more than once
3. **Drill (Checklist)** -- Full shuffled list, tap items to check off, tap completed items to add reps, rep count badge on completed items (no per-item timing in this mode)
4. **Heatmap** -- GitHub-style calendar grid showing daily drill activity over past ~180 days, colour intensity by total rep count
5. **Analytics** -- Section frequency breakdown, average time per item, neglected items (not drilled in 30+ days), day-of-week patterns, 30-day trend, unique coverage vs total reps
6. **Bottom nav** -- Fixed tab bar: Drills (home), Activity (heatmap), Analytics. Hidden during drill sessions.
7. Toggle between flashcard/checklist modes within a section. Shuffle/reshuffle button available in both. "New Round" button available when all items in current shuffle are done.

---

## Timer Behaviour

- **Session timer:** Starts automatically when entering any drill section. Pauses when navigating back to home. Resumes when entering another section. Accumulates total time across all sections for the day. Resets at midnight.
- **Per-item timer:** Flashcard/card mode only. Starts when card appears, stops on mark done or advance. No per-item timing in checklist/list mode.
- **No idle timeout, no auto-pause.** User controls it by navigating back to home.
- Auto-saves to KV every 30 seconds + on unmount.

---

## Decisions Locked

1. **Design:** Clean minimal light theme, mobile-first
2. **PWA:** Yes -- installable on phone home screen, network-first service worker
3. **Item data:** Text only, no metadata
4. **Timer:** Session timer (auto on section enter/leave) + per-item stopwatch (card mode only)
5. **History:** GitHub-style calendar heatmap showing drill activity by day
6. **Analytics:** Full dashboard -- section frequency, per-item time patterns, neglected items, day-of-week, trends
7. **Drill lifecycle:** Items never retire -- repetition is the point
8. **Day reset:** Midnight local time (automatic)
9. **Offline:** Online-only (simple, may lose progress if no connection)
10. **Multi-device conflicts:** Last write wins (one person, mostly phone)
11. **Editing drills:** When items are renamed/merged/deleted, progress history migrates automatically via migrations field in drills.json
12. **Backup:** Automatic daily snapshot via Vercel cron (06:00 UTC), rolling 30-day retention
13. **Multi-rep:** Items can be drilled multiple times per day. "Drill Again" on individual items, "New Round" to reshuffle entire section. Progress tiles show unique coverage, heatmap counts total reps.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260402 | Initial architecture sketch |
| v1.1 | 20260402 | Locked all decisions: light theme, PWA, text-only items, no timer, heatmap history. Added PWA files and Heatmap component to structure. Added heatmap KV key. |
| v1.2 | 20260402 | Reshaped as project README. Added full setup guide with Vercel KV step-by-step. |
| v1.3 | 20260402 | Added session + per-item timer, full analytics dashboard, automatic backup via cron, ID migration on drill edits, midnight reset, last-write-wins sync. Updated repo structure, KV schema, views. |
| v1.4 | 20260402 | BUILD COMPLETE. All 6 phases deployed. Timer fix: session timer pauses on home (not stops), per-item timer card mode only, no idle timeout. Compacted flashcard view for mobile. Added Timer Behaviour section. |
| v1.5 | 20260403 | Multi-rep system: progress data model changed from array to count map, added "Drill Again" button on items, "New Round" button at section level, rep count badges. Auto-migration from v1.4 array format. Added session resume, haptics, focus mode, tests, CI, Sentry to roadmap. |
