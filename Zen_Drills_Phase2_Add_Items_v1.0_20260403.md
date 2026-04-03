# Zen Drills Phase 2 — Add Items + Image Upload v1.0 · 20260403

Paste into Claude Code.

---

## Phase 2 — Add Items with Optional Image Upload

```
Read the README.md and understand the current app structure. Also read src/hooks/useDrillContent.js, src/App.jsx, src/components/SectionPicker.jsx, src/components/DrillFlashcard.jsx, and src/components/DrillChecklist.jsx to understand the current code.

This prompt adds the ability to add new drill items from within the app, with optional image upload to Supabase Storage. The Supabase Storage bucket 'drill-images' already exists and is configured.

CRITICAL RULES:
- The app must still compile and work after this change.
- Do NOT break existing progress tracking, heatmap, streak, or timer.
- Do NOT change useShuffle.js, useTimer.js, useSessionResume.js, useSupabaseProgress.js, useAuth.js, Auth.jsx.
- Match the existing minimal light theme. No new colours or style departures.
- All touch targets minimum 48px.

STEP 1: Update src/hooks/useDrillContent.js

Add two new functions to the hook's return value:

a) addItem(sectionId, text, imageFile):
   - Generate a new item ID: sectionId + '-' + Date.now() (e.g. 'classic-1712345678901')
   - If imageFile is provided:
     * Upload to Supabase Storage bucket 'drill-images' at path: {userId}/{itemId}.{extension}
     * Get the public URL using supabase.storage.from('drill-images').getPublicUrl(path)
     * Store the URL as image_url on the item
   - Calculate sort_order: find the current max sort_order for items in this section, add 1
   - INSERT into drill_items: { id, section_id: sectionId, text, image_url (or null), sort_order, user_id: userId }
   - On success, update local state: add the new item to the correct section's items array
   - Return { success: true, item } or { success: false, error: message }

b) deleteItem(sectionId, itemId):
   - DELETE FROM drill_items WHERE id = itemId AND user_id = userId
   - If the item has an image_url, also delete the file from Supabase Storage using supabase.storage.from('drill-images').remove([path])
   - On success, update local state: remove the item from the section's items array
   - Return { success: true } or { success: false, error: message }

Also add a refetch() function that re-runs the load query to refresh sections and items from the database.

The hook now returns: { sections, loading, error, addItem, deleteItem, refetch }

STEP 2: Create src/components/AddItemForm.jsx

A modal/overlay form for adding a new item to a section.

Props: { sectionId, sectionTitle, onAdd, onClose }

The form has:
- A text input (multi-line textarea, placeholder "What to drill..."). Auto-focus on mount.
- An "Add Image" button that opens a file picker (accept="image/*"). On iPad this will offer camera roll or files.
- If an image is selected, show a small preview (thumbnail, max 120px tall) with an "X" button to remove it.
- A "Save" button (full width, same style as "Mark Done" button in flashcard view — dark rounded pill).
- A "Cancel" link/button.
- While saving, show a spinner on the Save button and disable it.

Layout: slide up from bottom as a sheet/modal. White background, rounded top corners, subtle backdrop overlay. The text input should be large and easy to type into. Keep it simple — no section picker (the section is already chosen from context).

When Save is tapped:
- Call onAdd(sectionId, text, imageFile) — imageFile can be null
- If successful, close the form
- If error, show the error message inline

STEP 3: Update src/components/SectionPicker.jsx

Add a small "+" button on each section tile. Position: top-right corner of the tile.

Style: 28x28 circle, light gray background (gray-100), gray-400 "+" icon, absolute positioned. On tap it should NOT trigger the section's onSelectSection — use e.stopPropagation().

Add a new prop: onAddItem(sectionId). When "+" is tapped, call onAddItem(sectionId).

Also show the item count in a slightly different way: after the subtitle, add a small text like "51 items" so the user can see how many items are in each section.

STEP 4: Update src/components/DrillFlashcard.jsx

If the current item has an image_url, show the image above the text inside the card area.

In the card div (the rounded-2xl border div), add before the text paragraph:
- If current.image_url exists: <img src={current.image_url} alt="" className="max-h-48 mx-auto rounded-lg mb-3 object-contain" />
- The image should be contained (not cropped), max height 192px (max-h-48), centered, with rounded corners and margin below.
- If no image_url, show nothing (same as now).

STEP 5: Update src/components/DrillChecklist.jsx

If an item has an image_url, show a small thumbnail next to the text.

Inside the button for each item, between the checkbox and the text span:
- If item.image_url exists: <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
- Small square thumbnail (40x40), rounded, cover-fit, won't shrink.
- If no image_url, show nothing (same layout as now).

STEP 6: Update src/App.jsx

Import AddItemForm:
  import AddItemForm from './components/AddItemForm'

Get addItem and deleteItem from useDrillContent:
  const { sections: drillSections, loading: contentLoading, error: contentError, addItem, deleteItem, refetch: refetchContent } = useDrillContent(user)

Add state for the add-item form:
  const [addingToSection, setAddingToSection] = useState(null)

Create handler:
  const handleAddItem = async (sectionId, text, imageFile) => {
    const result = await addItem(sectionId, text, imageFile)
    return result
  }

Pass onAddItem to SectionPicker:
  <SectionPicker
    ...existing props...
    onAddItem={(sectionId) => setAddingToSection(sectionId)}
  />

Render the AddItemForm when addingToSection is set:
  {addingToSection && (
    <AddItemForm
      sectionId={addingToSection}
      sectionTitle={drillSections.find(s => s.id === addingToSection)?.title || ''}
      onAdd={handleAddItem}
      onClose={() => setAddingToSection(null)}
    />
  )}

Place this AFTER the BottomNav so it renders on top.

STEP 7: Summary of changes

New files:
- src/components/AddItemForm.jsx

Modified files:
- src/hooks/useDrillContent.js (add addItem, deleteItem, refetch)
- src/components/SectionPicker.jsx (add "+" button per section, onAddItem prop, item count)
- src/components/DrillFlashcard.jsx (show image if image_url exists)
- src/components/DrillChecklist.jsx (show thumbnail if image_url exists)
- src/App.jsx (import AddItemForm, wire up add-item flow)

NOT modified:
- src/data/drills.json
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useTimer.js
- src/hooks/useSessionResume.js
- src/components/Auth.jsx
- src/components/Heatmap.jsx
- src/components/Analytics.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/lib/supabase.js
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Phase 2: add items with optional image upload from within the app |
