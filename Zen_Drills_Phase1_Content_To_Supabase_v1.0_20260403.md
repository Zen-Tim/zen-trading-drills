# Zen Drills Phase 1 — Content to Supabase v1.0 · 20260403

Paste into Claude Code.

---

## Phase 1 — Read Drill Content from Supabase Instead of JSON

```
Read the README.md and understand the current app structure.

This prompt moves drill content (sections and items) from the static drills.json import to Supabase database tables. The tables (drill_sections, drill_items) already exist in Supabase — they were created manually.

CRITICAL RULES:
- The app must still compile and work after this change.
- drills.json stays in the repo as a seed source and backup — do NOT delete it.
- Do NOT touch any progress/heatmap/streak/timer code.
- Do NOT touch DrillFlashcard.jsx, DrillChecklist.jsx, Heatmap.jsx, Analytics.jsx, Timer.jsx, ProgressBar.jsx, useShuffle.js, useTimer.js, useSessionResume.js.
- SectionPicker.jsx should NOT be modified — it receives sections as props.

STEP 1: Create src/hooks/useDrillContent.js

This hook reads sections and items from Supabase. On first sign-in (when the tables are empty for this user), it seeds from drills.json automatically.

Import the supabase client from '../lib/supabase'.
Import drillsData from '../data/drills.json' (for seeding only).

The hook takes the user object as a parameter: useDrillContent(user)

State:
- sections: array of section objects (same shape as drills.json sections, each with an items array)
- loading: boolean
- error: string or null

On mount (when user.id is available):

a) Load sections:
   SELECT * FROM drill_sections WHERE user_id = {user.id} ORDER BY sort_order

b) If sections result is empty — this is first login, run the seed:
   - For each section in drillsData.sections, INSERT into drill_sections:
     { id: section.id, title: section.title, subtitle: section.subtitle, icon: section.icon, sort_order: index, user_id: user.id }
   - For each item in each section, INSERT into drill_items:
     { id: item.id, section_id: section.id, text: item.text, sort_order: itemIndex, user_id: user.id }
   - Use batch inserts (pass arrays to .insert()) for efficiency
   - After seeding, re-query to load the data

c) If sections exist, load items:
   SELECT * FROM drill_items WHERE user_id = {user.id} ORDER BY sort_order

d) Assemble into the same shape as drills.json:
   sections.map(s => ({
     ...s,
     items: items.filter(i => i.section_id === s.id).sort((a, b) => a.sort_order - b.sort_order)
   }))

e) Set loading = false

Error handling:
- If any Supabase call fails, set error to the error message, set loading = false
- Do NOT show a blank screen on error — show the error message

The hook returns: { sections, loading, error }

Handle the no-user case: if no user, set loading = false immediately (same pattern as useSupabaseProgress).

STEP 2: Update App.jsx

Remove this line:
  import drillsData from './data/drills.json'

Remove this line:
  const totalItems = drillsData.sections.reduce((sum, s) => sum + s.items.length, 0)

Add import for the new hook:
  import { useDrillContent } from './hooks/useDrillContent'

Inside the App component, after the useAuth() call, add:
  const { sections: drillSections, loading: contentLoading, error: contentError } = useDrillContent(user)

Compute totalItems from the hook data (inside the component, not outside):
  const totalItems = drillSections.reduce((sum, s) => sum + s.items.length, 0)

Update the loading check to include contentLoading:
  if (authLoading || loading || contentLoading) { ... show spinner ... }

Add an error state after the loading check:
  if (contentError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium mb-2">Failed to load drills</p>
          <p className="text-gray-400 text-xs">{contentError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">Retry</button>
        </div>
      </div>
    )
  }

Replace EVERY reference to drillsData.sections with drillSections:

1. The uniqueDone calculation:
   const uniqueDone = drillSections.reduce((sum, s) => sum + getUniqueCount(s.id), 0)

2. The savedSectionObj lookup:
   const savedSectionObj = savedSession ? drillSections.find((s) => s.id === savedSession.sectionId) : null

3. The handleResume function:
   const section = drillSections.find((s) => s.id === session.sectionId)

4. The SectionPicker prop:
   <SectionPicker sections={drillSections} ... />

5. The Analytics prop:
   <Analytics sections={drillSections} ... />

Make sure there are ZERO remaining references to drillsData anywhere in App.jsx. Search the file for "drillsData" after editing — there should be none.

STEP 3: Verify no other files import drills.json directly

Search the entire src/ directory for any file that imports drills.json. The ONLY file that should import it after this change is src/hooks/useDrillContent.js (for seeding). If any component imports it directly, update that component to receive the data as props instead.

STEP 4: Summary of changes

New files:
- src/hooks/useDrillContent.js

Modified files:
- src/App.jsx (remove static import, use useDrillContent hook)

NOT modified:
- src/data/drills.json (stays as seed source)
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/components/* (all receive data as props, no changes needed)
- src/lib/supabase.js
- src/components/Auth.jsx
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Phase 1: move drill content from drills.json to Supabase with auto-seed |
