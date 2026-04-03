# Zen Drills — Undo + Recent Section v1.0 · 20260403

Paste into Claude Code.

---

## Undo Toast + Recent Items Section

```
Read src/App.jsx, src/components/DrillChecklist.jsx, src/components/SectionPicker.jsx, and src/hooks/useDrillContent.js to understand the current code.

This prompt adds two small features:
1. An undo toast in checklist mode so accidental taps can be reverted
2. A "Recent" virtual section on the home screen that shows only recently-added items

CRITICAL RULES:
- The app must still compile and work after this change.
- Do NOT break existing progress tracking, heatmap, streak, or timer.
- Do NOT change useShuffle.js, useTimer.js, useSessionResume.js, useSupabaseProgress.js, useAuth.js, Auth.jsx, Heatmap.jsx, Analytics.jsx, Timer.jsx, ProgressBar.jsx, AddItemForm.jsx, supabase.js.
- Match the existing minimal light theme.

--- FEATURE 1: UNDO TOAST IN CHECKLIST ---

STEP 1: Update src/components/DrillChecklist.jsx

Add undo functionality:

a) Add state for the last action:
   const [lastAction, setLastAction] = useState(null)
   // lastAction shape: { type: 'markDone' | 'incrementRep', sectionId, itemId, timestamp }

b) Add a timer ref to auto-dismiss:
   const undoTimerRef = useRef(null)

c) Modify handleItemClick:
   - When marking an item done (first tap): call markDone as before, then setLastAction({ type: 'markDone', sectionId: section.id, itemId: item.id, timestamp: Date.now() })
   - When incrementing rep (already done, tapped again): call incrementRep as before, then setLastAction({ type: 'incrementRep', sectionId: section.id, itemId: item.id, timestamp: Date.now() })
   - Start a 3-second timer that clears lastAction: clearTimeout(undoTimerRef.current); undoTimerRef.current = setTimeout(() => setLastAction(null), 3000)

d) Add handleUndo function:
   - If lastAction.type === 'markDone': call unmarkDone(lastAction.sectionId, lastAction.itemId)
   - If lastAction.type === 'incrementRep': we can't easily decrement a rep, so just call unmarkDone to fully unmark it — good enough for an "oops I tapped by accident" scenario
   - Clear lastAction

e) Clean up timer on unmount:
   useEffect(() => () => clearTimeout(undoTimerRef.current), [])

f) Render the undo toast — place it at the bottom of the component, above the "New Round" button area:
   {lastAction && (
     <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
       <button
         onClick={handleUndo}
         className="flex items-center gap-2 px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg active:scale-[0.97] transition-all"
       >
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
         </svg>
         Undo
       </button>
     </div>
   )}

The toast should appear centred at the bottom, above the safe area. Dark pill with white text — matches the existing button style. Auto-dismisses after 3 seconds.

--- FEATURE 2: RECENT ITEMS SECTION ---

STEP 2: Update src/hooks/useDrillContent.js

After assembling sections from the database, create a virtual "Recent" section:

a) Track the seed timestamp. During the seed process (when tables are empty and we insert from drills.json), all items get the same created_at timestamp. Items added later through AddItemForm will have a newer created_at.

b) After assembling the sections array, compute recent items:
   - Collect ALL items across all sections
   - Filter to items where created_at is AFTER the earliest created_at + 60 seconds (this excludes seeded items which all share roughly the same timestamp)
   - Sort by created_at descending (newest first)
   - If there are any recent items, prepend a virtual section to the sections array:
     {
       id: 'recent',
       title: 'Recent',
       subtitle: 'Recently added',
       icon: '🆕',
       sort_order: -1,
       items: recentItems
     }
   - If there are no recent items, don't add the section (it only appears once you've added something)

c) The recent items should be copies (not references) so marking them done in the Recent section works independently. Each item keeps its original id and section_id — the progress system tracks by section_id + item_id, so drilling an item in the Recent section should also mark it done in its home section.

IMPORTANT: Actually, progress tracking uses section.id (the section the item is drilled FROM) and item.id. If we show an item from the 'classic' section inside the 'recent' virtual section, and the user drills it, it would record progress against section_id 'recent' — which is wrong. The progress should be recorded against the item's real section.

To handle this cleanly: each item in the Recent section should keep a property called `home_section_id` that stores its real section_id. Then in the drill views, when calling markDone/incrementRep, use item.home_section_id || section.id as the section parameter.

Wait — this would require changes to DrillFlashcard and DrillChecklist to use a different section ID per item. That's messy.

SIMPLER APPROACH: The Recent section items should use their ORIGINAL section_id for progress tracking. Override the section.id to 'recent' for display only, but pass a modified section object to DrillSession where each item carries its own section_id. Then in DrillFlashcard and DrillChecklist, when calling isDone, markDone, incrementRep, getRepCount — use item.section_id instead of section.id whenever item.section_id exists.

IMPLEMENTATION:
- In useDrillContent, when building the recent section, set each item's section_id to its ORIGINAL section_id (which it already has from the database)
- Update DrillFlashcard.jsx: everywhere it uses section.id with an item, change to (item.section_id || section.id). This applies to: isDone, markDone, incrementRep, getRepCount calls. Search for 'section.id' in the component and replace with a helper: const getSectionId = (item) => item.section_id || section.id
- Update DrillChecklist.jsx: same change — use (item.section_id || section.id) instead of section.id for all progress calls.

This way, drilling "Test item" that lives in the 'classic' section — whether drilled from the Recent section or from the Classic section — records progress against 'classic'.

STEP 3: Update DrillFlashcard.jsx

At the top of the component function, add:
  const getSid = (item) => item.section_id || section.id

Replace ALL occurrences of section.id that are used with an item for progress calls:
  - isDone(section.id, item.id) → isDone(getSid(item), item.id)
  - markDone(section.id, current.id) → markDone(getSid(current), current.id)
  - incrementRep(section.id, current.id) → incrementRep(getSid(current), current.id)
  - getRepCount(section.id, item.id) → getRepCount(getSid(item), item.id)

Keep section.id for DISPLAY purposes (the title bar showing section.icon + section.title).

STEP 4: Update DrillChecklist.jsx (already being modified for undo)

Same getSid pattern:
  const getSid = (item) => item.section_id || section.id

Replace all progress calls:
  - isDone(section.id, item.id) → isDone(getSid(item), item.id)
  - markDone(section.id, item.id) → markDone(getSid(item), item.id)
  - incrementRep(section.id, item.id) → incrementRep(getSid(item), item.id)
  - getRepCount(section.id, item.id) → getRepCount(getSid(item), item.id)
  - unmarkDone in handleUndo should also use getSid

STEP 5: Summary of changes

Modified files:
- src/hooks/useDrillContent.js (add virtual Recent section from non-seeded items)
- src/components/DrillChecklist.jsx (undo toast + getSid for progress tracking)
- src/components/DrillFlashcard.jsx (getSid for progress tracking)

NOT modified:
- src/data/drills.json
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/components/Auth.jsx
- src/components/SectionPicker.jsx
- src/components/AddItemForm.jsx
- src/components/Heatmap.jsx
- src/components/Analytics.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/App.jsx
- src/lib/supabase.js
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Undo toast in checklist mode + virtual Recent section for newly-added items |
