# Zen Drills v1.3 · 20260402

## What It Is

A personal daily practice app for PA trading drills. Pick a section, shuffle the items, work through them in flashcard or checklist mode, track daily progress.

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
      drills.json          # All sections and items
    components/
      SectionPicker.jsx    # Landing screen with section tiles
      DrillFlashcard.jsx   # One-at-a-time card mode
      DrillChecklist.jsx   # Full shuffled list, rapid-tap mode
      Heatmap.jsx          # GitHub-style calendar heatmap
      Analytics.jsx        # Section frequency, time patterns, trends
      Timer.jsx            # Session + per-item stopwatch
      ProgressBar.jsx      # Reusable progress bar
    hooks/
      useProgress.js       # Read/write daily progress to Vercel KV
      useShuffle.js        # Shuffle logic + state
      useTimer.js          # Session and per-item timing
    App.jsx                # Router between views
    main.jsx               # Vite entry
  api/
    progress.js            # Vercel serverless function (KV read/write)
    backup.js              # Vercel cron: snapshot KV data to repo
  public/
    manifest.json          # PWA manifest (name, icons, theme)
    sw.js                  # Service worker for offline caching
    icon-192.png           # PWA icon
    icon-512.png           # PWA icon
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

Each item gets a stable ID so progress tracking doesn't break when items are reordered or renamed.

---

## Data: Progress (Vercel KV)

Keyed by a simple user token (no auth system -- just a self-generated ID stored in localStorage, synced across devices by entering it once).

```
Key:    drills:progress:{userToken}:{YYYYMMDD}
Value:  { "htf": ["htf-001", "htf-003"], "open": ["open-002"] }

Key:    drills:streak:{userToken}
Value:  { "current": 5, "lastDate": "20260402" }

Key:    drills:heatmap:{userToken}
Value:  { "20260401": 12, "20260402": 8 }   # date -> items drilled count

Key:    drills:timer:{userToken}:{YYYYMMDD}
Value:  { "sessionSeconds": 1320, "items": { "htf-001": 45, "htf-003": 62 } }
```

One serverless API route (`/api/progress`) handles GET and POST.

---

## Multi-Device Sync

No login system. On first use the app generates a short token (e.g. `zen-7f3k`). You note it down. On a second device, enter the same token in settings. Both devices read/write to the same KV key.

Simple, no auth infrastructure, good enough for a single user.

---

## Edit Workflow

1. Open Claude Code in the repo
2. Edit `drills.json` (add item, move between sections, reorder)
3. Review in GitHub Desktop
4. Push to main
5. Vercel auto-deploys (~30 seconds)

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

1. **Home** -- Section tiles with today's progress per section, overall progress bar, streak counter, session timer running
2. **Drill (Flashcard)** -- One item at a time, swipe/tap to advance, mark done button, per-item timer visible
3. **Drill (Checklist)** -- Full shuffled list, tap items to check off, per-item time logged on completion
4. **Heatmap** -- GitHub-style calendar grid showing daily drill activity over past 90-180 days, colour intensity by item count
5. **Analytics** -- Section frequency breakdown, average time per item, neglected items (not drilled in 30+ days), day-of-week patterns, trends over time
6. Toggle between flashcard/checklist modes within a section. Shuffle/reshuffle button available in both.

---

## Decisions Locked

1. **Design:** Clean minimal light theme
2. **PWA:** Yes -- installable on phone home screen, offline-capable via service worker
3. **Item data:** Text only, no metadata
4. **Timer:** Both -- session timer (total time drilling today) and per-item stopwatch (time spent on each item)
5. **History:** GitHub-style calendar heatmap showing drill activity by day
6. **Analytics:** Full dashboard -- section frequency, per-item time patterns, neglected items, trends over time
7. **Drill lifecycle:** Items never retire -- repetition is the point
8. **Day reset:** Midnight local time (automatic)
9. **Offline:** Online-only (simple, may lose progress if no connection)
10. **Multi-device conflicts:** Last write wins (one person, mostly phone)
11. **Editing drills:** When items are renamed/merged/deleted, progress history migrates automatically to new IDs
12. **Backup:** Automatic -- daily snapshot of KV progress data committed to repo via Vercel cron job

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260402 | Initial architecture sketch |
| v1.1 | 20260402 | Locked all decisions: light theme, PWA, text-only items, no timer, heatmap history. Added PWA files and Heatmap component to structure. Added heatmap KV key. |
| v1.2 | 20260402 | Reshaped as project README. Added full setup guide with Vercel KV step-by-step. |
| v1.3 | 20260402 | Added session + per-item timer, full analytics dashboard, automatic backup via cron, ID migration on drill edits, midnight reset, last-write-wins sync. Updated repo structure, KV schema, views. |
