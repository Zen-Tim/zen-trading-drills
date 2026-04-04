# Zen Drills Fixes v1.2 · 20260404

One bug: Recent section tile on home screen shows wrong progress counts.

---

## Bug: Recent Section Progress Mismatch

**Symptom:** Items drilled in their regular section (or even drilled from within Recent) show as "not done" on the Recent tile's progress bar on the home screen.

**Root Cause:** In `SectionPicker.jsx`, progress is looked up using `section.id` as the key. For the Recent section, that's `'recent'`. But progress is stored under each item's real `section_id` (e.g. `'htf'`, `'open'`). The drill views handle this correctly via `getSid(item) => item.section_id || section.id`, but the home screen tile doesn't.

**Fix:** When calculating progress and rep counts for the Recent tile, use each item's real `section_id` instead of `'recent'`.

---

## Claude Code Prompt

```
Read the README.md and understand the current app structure. This prompt fixes the Recent section showing wrong progress counts on the home screen.

ONE file to change: src/components/SectionPicker.jsx

In the section grid map, find these lines inside the sections.map callback:

const { done, total } = sectionProgress(section.id, section.items.length)
...
const sectionReps = section.items.reduce((sum, item) => sum + getRepCount(section.id, item.id), 0)

The problem: for the Recent section (section.id === 'recent'), these look up progress under the key 'recent', but progress is stored under each item's real section_id (e.g. 'htf', 'open').

Replace the progress calculation with logic that handles Recent correctly:

const isRecent = section.id === 'recent'

// For Recent, check each item against its real section_id
const done = isRecent
  ? section.items.filter((item) => getRepCount(item.section_id, item.id) >= 1).length
  : sectionProgress(section.id, section.items.length).done
const total = section.items.length

const sectionReps = section.items.reduce(
  (sum, item) => sum + getRepCount(isRecent ? item.section_id : section.id, item.id),
  0
)

Note: there's already an `isRecent` variable declared a few lines above for the add-item button logic. If so, remove the duplicate and reuse the existing one, or rename one of them. Make sure there's only one `const isRecent` in the map callback scope.

Do NOT change any other files.
```

---

## Test After Deploy

1. Drill a few items from a regular section (e.g. HTF Analysis)
2. Go back to home screen
3. The Recent section tile should now show the correct count matching those items' done state
4. Drill an item from within the Recent section
5. Go back — both the Recent tile and the item's home section tile should show it as done

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260404 | Three bug fixes: edit-doesn't-update, analytics empty, date format |
| v1.1 | 20260404 | Two UI improvements: line break preservation, image lightbox |
| v1.2 | 20260404 | Recent section progress mismatch fix |
