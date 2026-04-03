# Zen Drills Content Management Plan v1.0 · 20260403

## What We're Doing

Turning Zen Drills from a static-content app (edit JSON, push code) into a fully self-managed practice tool where you add, edit, reorder, and attach images to drill items from your iPad — no repo, no code, no desktop required. Then adding smart practice: flag weak items and weight the shuffle so they come up more often.

## Why This Is a Bigger Change Than the Supabase Migration

The Supabase migration swapped the storage engine but didn't change the app's shape. This changes the app's shape:

- Drill content moves from a JSON file in the repo to Supabase database tables
- The app gets a content management layer (add/edit/reorder/delete sections and items)
- Image upload goes through Supabase Storage
- The shuffle algorithm becomes weighted instead of random
- Every UI component that reads drills.json needs to read from Supabase instead

This is not a quick patch. It's 4-5 Claude Code prompts, each one tested and deployed before the next.

## Prerequisites

Before starting ANY of this:

1. Run the existing cleanup prompt (`Zen_Drills_Cleanup_v1.0_20260403.md`) to remove old KV code
2. Push and deploy
3. Delete the KV database from Vercel dashboard
4. Test the app works cleanly on phone
5. Confirm: app loads, Google sign-in works, progress saves, no console errors

Do not build new features on top of dead code.

---

## Phase 1 — Content Tables + Seed Migration

**What:** Create Supabase tables for sections and items. Write a one-time seed script that loads the current drills.json into those tables. Update the app to read from Supabase instead of the JSON file.

**New Supabase tables (you run this SQL in Supabase dashboard):**

```sql
-- Sections table
create table drill_sections (
  id text primary key,
  title text not null,
  subtitle text,
  icon text,
  sort_order int not null default 0,
  user_id uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Items table
create table drill_items (
  id text not null,
  section_id text references drill_sections(id) on delete cascade not null,
  text text not null,
  image_url text,
  sort_order int not null default 0,
  user_id uuid references auth.users(id) not null,
  flagged boolean default false,
  last_drilled date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- RLS
alter table drill_sections enable row level security;
alter table drill_items enable row level security;

create policy "Users manage own sections"
  on drill_sections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own items"
  on drill_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_items_section on drill_items(section_id);
create index idx_items_user on drill_items(user_id);
create index idx_sections_user on drill_sections(user_id);
```

**What changes in the app:**

- New hook: `useDrillContent.js` — reads sections and items from Supabase instead of importing drills.json
- On first sign-in (empty tables), the app seeds from drills.json automatically — so your existing drill list transfers over without manual work
- After seeding, drills.json is ignored — Supabase is the single source of truth
- SectionPicker, DrillFlashcard, DrillChecklist all receive data from the new hook instead of the JSON import

**What doesn't change:** progress tracking, heatmap, streak, timer, analytics — all untouched.

**Risk:** This is the biggest single change. If the content read fails, the app shows nothing. The seed migration needs to be bulletproof — check if tables are empty, seed, confirm, then proceed. If seed fails, show an error, not a blank screen.

**Test:** After deploy, sign in. You should see all your existing sections and items exactly as before. Drill a few items. Close and reopen. Everything should look identical to today. The change is invisible to you — it just reads from a different place.

---

## Phase 2 — Add Items + Image Upload

**What:** Add a "+" button to each section that opens a form. Type text, optionally attach a photo from your camera roll or files. Item saves to Supabase, image uploads to Supabase Storage. Available immediately in your drill list.

**Supabase Storage setup (you do this in the Supabase dashboard):**

1. Go to Storage in the left sidebar
2. Create a new bucket called `drill-images`
3. Set it to public (images need to be loadable by the app)
4. Add a policy: authenticated users can upload to their own folder (path starts with their user ID)

**What the app gets:**

- "+" button on each section tile (SectionPicker) and inside drill views
- Add Item form: text field + "Add Image" button (opens iPad photo picker)
- Image uploads to Supabase Storage at path `{user_id}/{item_id}.{ext}`
- Item row gets the public URL in `image_url`
- Flashcard mode: image shows large above the text
- Checklist mode: small thumbnail next to the text, tap to expand

**What doesn't change:** existing items, progress tracking, shuffle logic.

**Test:** Open app on iPad. Tap "+" on any section. Type "Test item with image." Attach a screenshot. Save. It should appear in the section immediately. Open flashcard mode — you should see the image. Delete the test item.

---

## Phase 3 — Section Management + Edit + Reorder

**What:** Full content management from within the app. Create new sections, edit existing items and sections, reorder items within a section, reorder sections on the home screen. Delete items and sections.

**UI approach:**

- Long-press (or edit icon) on a section tile enters "edit mode"
- Edit mode on home screen: drag to reorder sections, tap to rename, "+" to add new section
- Edit mode inside a section: drag to reorder items, tap to edit text/image, swipe to delete
- "Create Section" button at the bottom of the home screen

**What changes:** SectionPicker gets edit mode, drill views get edit mode, new reorder logic using `sort_order` column.

**Risk:** Drag-to-reorder on mobile is fiddly. We might need to fall back to up/down arrow buttons if touch-drag doesn't feel right. Claude Code can build either; we test and decide.

**Test:** Create a new section. Add items to it. Reorder them. Rename the section. Delete an item. Delete the section. Confirm everything persists across app restarts.

---

## Phase 4 — Smart Practice (Flag Weak + Weighted Shuffle)

**What:** Flag items you're struggling with. The shuffle algorithm puts flagged and neglected items first.

**How it works:**

- In flashcard or checklist mode, each item gets a small "flag" toggle (tap to mark as weak)
- Flagged state saves to `drill_items.flagged` in Supabase
- `last_drilled` date updates whenever you mark an item done (already tracked in progress, just needs to write back to the items table)
- Shuffle algorithm changes from pure random to weighted:
  1. First: flagged items (shuffled among themselves)
  2. Then: items not drilled in 14+ days (shuffled)
  3. Then: items not drilled in 7+ days (shuffled)
  4. Then: everything else (shuffled)
- On the home screen, sections with flagged items show a small indicator (dot or count)

**What this is NOT:** Full spaced repetition with intervals and scheduling. It's weighted shuffle — every item still appears every session, but weak and stale items appear first so you hit them while you're fresh. If you want full SM-2 scheduling later, this is the foundation it would build on.

**Test:** Flag a few items across different sections. Start a drill session. Flagged items should appear in the first few cards. Unflag them. They should shuffle back into the normal pool.

---

## Phase Summary

| Phase | What | Depends On | Risk Level |
|-------|------|------------|------------|
| 0 | Cleanup (KV removal) | Nothing — already written | Low |
| 1 | Content to Supabase + seed | Cleanup done | **High** — changes data source for entire app |
| 2 | Add items + image upload | Phase 1 | Medium — new UI + Storage integration |
| 3 | Edit + reorder + sections | Phase 2 | Medium — edit mode is complex UI |
| 4 | Smart practice | Phase 1 (minimum) | Low — shuffle logic change only |

Each phase: I write a Claude Code prompt, you paste it, review in GitHub Desktop, push, test on iPad. Don't start the next phase until the current one is clean.

---

## What I'm NOT Doing

- No migration of old progress data to new item IDs (progress keys reference item IDs from drills.json — those IDs stay the same after seeding, so existing progress history carries over automatically)
- No offline support for content management (you need a connection to add/edit items — same as progress tracking)
- No multi-user or sharing features
- No AI-assisted categorization of captures
- No bulk import (items added one at a time through the app)
- drills.json stays in the repo as a backup/reference but the app stops reading it after first seed

---

## Your Steps Before I Write Prompts

1. Run the cleanup prompt (remove KV code)
2. Push and deploy, delete KV database
3. Test app is clean
4. Run the Phase 1 SQL in Supabase dashboard (creates the two new tables)
5. Create the `drill-images` storage bucket in Supabase dashboard
6. Tell me it's done — I write the Phase 1 Claude Code prompt

Steps 4 and 5 can wait until after cleanup is confirmed working. I'm listing them so you know what's coming.

---

## Open Questions

1. **Image size limit:** Supabase free tier has 1GB storage. Screenshots are typically 200KB-1MB each. That's roughly 1,000-5,000 images before you'd need to think about it. Fine for now?
2. **Delete confirmation:** When deleting a section, should it require a double-tap or a confirmation dialog? (I'd say yes — accidental section deletion would be painful.)
3. **Inbox section:** Do you want a dedicated "Inbox" section that new quick-captures go into by default, so you don't have to pick a section in the moment? You can sort them later.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial content management plan — 4 phases covering content migration, image upload, CRUD UI, and smart practice |
