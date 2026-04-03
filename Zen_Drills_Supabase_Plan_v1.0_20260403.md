# Zen Drills Supabase Plan v1.0 · 20260403

## What We're Doing

Replacing Vercel KV (the thing that keeps losing your data) with Supabase (a proper database + Google sign-in). After this, you sign in with your Google account on any device, any browser, and your drill progress is there. No tokens, no data wipes.

## Two Risks To Test Early

**Risk A: Google sign-in might behave differently when you open the app from your home screen icon vs from Safari.** We test sign-in in the browser first, then from the home screen. If the home screen version has issues, we either fix it or you use a Safari bookmark instead — same app, just opens in Safari rather than standalone.

**Risk B: My code might have bugs (6 for 6 so far).** So we keep the old version working the whole time. The new Supabase code sits alongside it, switched off. We test it, and only switch it on when it works. If anything breaks, we switch back. You always have a working app.

---

## The Steps

### STEP 1 — You: Create a Supabase Account (5 mins)

1. Go to **supabase.com**
2. Click **Start your project** (top right)
3. Sign in with your GitHub account (the same one you use for GitHub Desktop)
4. You'll land on the Supabase dashboard

### STEP 2 — You: Create a Supabase Project (2 mins)

1. Click **New Project**
2. Organisation: pick the one that was auto-created, or create one (any name, e.g. "Zen")
3. Project name: **zen-drills**
4. Database password: type something and save it somewhere (you won't need it often, but don't lose it)
5. Region: pick **Southeast Asia (Singapore)** — closest to Taipei
6. Click **Create new project**
7. Wait about 30 seconds for it to set up

### STEP 3 — You: Get Your Project Keys (1 min)

Once the project is created, you'll land on the project home page. You need two things from here:

1. Look for **Project URL** — it looks like `https://abcdefgh.supabase.co`
2. Look for **anon public** key — it's a long string starting with `eyJ...`

Both are on the project home page under **Project API** (or click **Settings** then **API** in the left sidebar if you don't see them).

**Copy both and paste them to me in this chat.** I'll need them for the code.

### STEP 4 — You: Set Up Google Sign-In (10-15 mins)

This is the longest step. You're creating credentials that let your app use "Sign in with Google."

**Part A — Google Cloud Console:**

1. Go to **console.cloud.google.com**
2. Sign in with your Google account
3. At the top, there's a project dropdown — click it, then click **New Project**
4. Name: **zen-drills**, then click **Create**
5. Make sure the new project is selected in the top dropdown

**Part B — Enable the Google sign-in API:**

1. In the left sidebar, click **APIs & Services** then **Library**
2. Search for **Google Identity** or just scroll — find **Google Identity Toolkit API**
3. Click it, then click **Enable**

**Part C — Configure the consent screen:**

1. Left sidebar: **APIs & Services** then **OAuth consent screen**
2. Click **Get Started** or **Configure consent screen**
3. App name: **Zen Drills**
4. User support email: your email
5. Audience: **External**
6. Contact info: your email
7. Click through and **Save** (you can skip the optional fields)

**Part D — Create credentials:**

1. Left sidebar: **APIs & Services** then **Credentials**
2. Click **+ Create Credentials** then **OAuth client ID**
3. Application type: **Web application**
4. Name: **Zen Drills**
5. Under **Authorized redirect URIs**, click **+ Add URI** and paste this:

```
https://YOUR-SUPABASE-PROJECT-ID.supabase.co/auth/v1/callback
```

Replace `YOUR-SUPABASE-PROJECT-ID` with the ID from your Supabase URL. For example, if your project URL is `https://abcdefgh.supabase.co`, the redirect URI is `https://abcdefgh.supabase.co/auth/v1/callback`

6. Click **Create**
7. A popup shows your **Client ID** and **Client Secret** — copy both

**Part E — Paste credentials into Supabase:**

1. Go back to your Supabase dashboard (supabase.com then your project)
2. Left sidebar: **Authentication** then **Providers**
3. Find **Google** in the list, click to expand it
4. Toggle it **ON**
5. Paste your **Client ID** and **Client Secret** from Google Cloud
6. Click **Save**

That's the setup done. Google sign-in is now ready to use.

### STEP 5 — You: Create the Database Table (2 mins)

1. In Supabase dashboard, left sidebar: **SQL Editor**
2. Click **New query**
3. Paste the SQL below (it creates the tables where your drill progress lives)
4. Click **Run**
5. You should see "Success. No rows returned" — that's correct, it created the tables

**The SQL (paste this exactly):**

```sql
-- Create the progress table
create table drill_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  drill_date text not null,
  section_id text not null,
  item_id text not null,
  rep_count int not null default 1,
  updated_at timestamptz not null default now(),
  unique(user_id, drill_date, section_id, item_id)
);

-- Create the heatmap table (one row per day)
create table drill_heatmap (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) not null,
  drill_date text not null,
  total_reps int not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, drill_date)
);

-- Create the streak table (one row per user)
create table drill_streak (
  user_id uuid references auth.users(id) primary key,
  current_streak int not null default 0,
  last_date text
);

-- Security: users can only see and edit their own data
alter table drill_progress enable row level security;
alter table drill_heatmap enable row level security;
alter table drill_streak enable row level security;

create policy "Users access own progress"
  on drill_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users access own heatmap"
  on drill_heatmap for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users access own streak"
  on drill_streak for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Speed up lookups
create index idx_progress_user_date on drill_progress(user_id, drill_date);
create index idx_heatmap_user on drill_heatmap(user_id);
```

### STEP 6 — You: Add Supabase Keys to Vercel (2 mins)

1. Go to **vercel.com** then your zen-trading-drills project
2. Click **Settings** then **Environment Variables**
3. Add these two:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your project URL (the `https://abcdefgh.supabase.co` one) |
| `VITE_SUPABASE_ANON_KEY` | Your anon key (the long `eyJ...` string) |

4. Make sure both are enabled for **Production**, **Preview**, and **Development**
5. Click **Save**

### STEP 7 — You: Tell Me It's Done

Paste me the Supabase project URL (not the keys — I don't need the secret ones, and the anon key is already in Vercel). I just need to know the setup is done so I can write the Claude Code prompt.

### STEP 8 — Me: Write the Claude Code Prompt

I write one prompt that:
- Installs the Supabase library
- Adds a sign-in screen (one "Sign in with Google" button)
- Builds new progress hooks that read/write to Supabase instead of Vercel KV
- Keeps the old KV code working alongside (the switch is off by default)
- Adds a simple toggle so we can test the new code

You paste this into Claude Code, review in GitHub Desktop, push.

### STEP 9 — We Test Together

1. Open the app in your browser (not from home screen yet)
2. Try signing in with Google
3. If that works, drill a few items, close the browser, reopen — check your progress is still there
4. If THAT works, try from your phone browser
5. Then try from the home screen icon
6. If anything breaks at any point, tell me exactly what you see and we fix it before moving on

### STEP 10 — Me: Clean Up

Once everything works:
- I write a prompt to remove the old Vercel KV code
- You can delete the KV database from your Vercel dashboard if you want
- Done

---

## What I'm NOT Doing

- No migration (data's gone, fresh start)
- No "rip everything out and rebuild" — old code stays working until new code is proven
- No over-engineering — one table for progress, one for heatmap, one for streak
- No new UI changes — just adding the sign-in screen, everything else stays the same
- No changes to drills.json or any of the drill UI components

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial Supabase migration plan — 10 steps, user setup + Claude Code prompts |
