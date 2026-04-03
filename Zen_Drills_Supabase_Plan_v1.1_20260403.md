# Zen Drills Supabase Plan v1.1 · 20260403

## What We're Doing

Replacing Vercel KV (the thing that keeps losing your data) with Supabase (a proper database + Google sign-in). After this, you sign in with your Google account on any device, any browser, and your drill progress is there. No tokens, no data wipes.

## Two Risks To Test Early

**Risk A: Google sign-in might behave differently when you open the app from your home screen icon vs from Safari.** We test sign-in in the browser first, then from the home screen. If the home screen version has issues, we either fix it or you use a Safari bookmark instead — same app, just opens in Safari rather than standalone.

**Risk B: My code might have bugs (6 for 6 so far).** So we keep the old version working the whole time. The new Supabase code sits alongside it, switched off. We test it, and only switch it on when it works. If anything breaks, we switch back. You always have a working app.

---

## The Steps

### STEP 1 — You: Add Supabase Through Vercel (5 mins)

This creates your Supabase project and automatically connects it to your app — no separate account needed, no copying keys around.

1. Go to **vercel.com** and open your **zen-trading-drills** project
2. Click **Storage** in the left sidebar
3. Click **Create Database** or **Browse Marketplace**
4. Find **Supabase** and click it
5. Click **Add Integration**
6. When it asks for a project name, use **zen-drills**
7. Database password: type something and save it somewhere
8. Region: pick **Southeast Asia (Singapore)** — closest to Taipei
9. Follow the prompts to finish

Vercel automatically adds the Supabase URL and keys to your project's environment variables. You don't need to copy or paste anything.

### STEP 2 — You: Open Supabase Dashboard (1 min)

Now you need to get into the Supabase dashboard to set up Google sign-in and create the tables.

1. On the Vercel Storage page, you should see your new Supabase database listed
2. Click on it — there should be a link to **Open in Supabase** or **Supabase Studio**
3. This takes you to the Supabase dashboard for your project

Note your **Project URL** — it looks like `https://abcdefgh.supabase.co`. You'll need this in the next step.

### STEP 3 — You: Set Up Google Sign-In (10-15 mins)

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

1. Go back to your Supabase dashboard
2. Left sidebar: **Authentication** then **Providers**
3. Find **Google** in the list, click to expand it
4. Toggle it **ON**
5. Paste your **Client ID** and **Client Secret** from Google Cloud
6. Click **Save**

That's it. Google sign-in is now ready to use.

### STEP 4 — You: Create the Database Tables (2 mins)

1. In Supabase dashboard, left sidebar: **SQL Editor**
2. Click **New query**
3. Paste the SQL below (it creates the tables where your drill progress lives)
4. Click **Run**
5. You should see "Success. No rows returned" — that's correct

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

### STEP 5 — You: Check the Environment Variables (1 min)

Vercel should have added these automatically, but let's confirm.

1. Go to **vercel.com** then your zen-trading-drills project
2. Click **Settings** then **Environment Variables**
3. Look for variables that start with `SUPABASE` or `NEXT_PUBLIC_SUPABASE` — you should see a URL and at least one key
4. If they're named differently from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, tell me what they're called — I'll match the code to whatever Vercel created

### STEP 6 — You: Tell Me It's Done

Tell me it's all set up and paste me the names of the environment variables from Step 5. I'll write the Claude Code prompt.

### STEP 7 — Me: Write the Claude Code Prompt

I write one prompt that:
- Installs the Supabase library
- Adds a sign-in screen (one "Sign in with Google" button)
- Builds new progress hooks that read/write to Supabase instead of Vercel KV
- Keeps the old KV code working alongside (the switch is off by default)

You paste this into Claude Code, review in GitHub Desktop, push.

### STEP 8 — We Test Together

1. Open the app in your browser (not from home screen yet)
2. Try signing in with Google
3. If that works, drill a few items, close the browser, reopen — check your progress is still there
4. If THAT works, try from your phone browser
5. Then try from the home screen icon
6. If anything breaks at any point, tell me exactly what you see and we fix it before moving on

### STEP 9 — Me: Clean Up

Once everything works:
- I write a prompt to remove the old Vercel KV code
- You can remove the KV database from your Vercel dashboard if you want
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
| v1.0 | 20260403 | Initial Supabase plan — 10 steps via separate Supabase account |
| v1.1 | 20260403 | Simplified: create Supabase through Vercel marketplace instead of separate account. Removed manual env var steps. Cut from 10 steps to 9. |
