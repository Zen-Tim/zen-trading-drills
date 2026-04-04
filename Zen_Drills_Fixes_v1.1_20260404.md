# Zen Drills Fixes v1.1 · 20260404

Two UI improvements: preserve line breaks in drill text, and tap-to-expand images.

---

## Fix 1: Line Breaks in Drill Text

**Symptom:** If you type multiple lines in the text field (e.g. a drill item with sub-points), they display as a single run-on paragraph in both flashcard and checklist modes.

**Root Cause:** The text renders inside a `<p>` tag with default CSS whitespace handling, which collapses newlines into spaces.

**Fix:** Add `whitespace-pre-wrap` to the text display in both drill components. This preserves newlines from the textarea while still wrapping long lines.

## Fix 2: Tap Image to Expand (Lightbox)

**Symptom:** Images on drill items are shown as small thumbnails (flashcard: max-h-48, checklist: tiny thumbnail). No way to see the full image.

**Fix:** Add a simple lightbox overlay. Tap the image — it opens full-screen over a dark backdrop. Tap the backdrop or X button to close. No new component file needed — just inline state in each drill component.

---

## Claude Code Prompt

```
Read the README.md and understand the current app structure. This prompt adds two small UI improvements: line break preservation in drill text, and tap-to-expand image lightbox.

NO database changes. No new files. Just modifications to existing components.

FIX 1: Preserve line breaks in drill text

STEP 1a: In DrillFlashcard.jsx, find the paragraph that displays current.text:
  <p className="text-lg font-medium text-gray-800 leading-relaxed">{current.text}</p>

Add whitespace-pre-wrap to the className:
  <p className="text-lg font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">{current.text}</p>

STEP 1b: In DrillChecklist.jsx, find where item.text is displayed in the list rows. Add whitespace-pre-wrap to that text element's className too.

That's it for line breaks.

FIX 2: Tap-to-expand image lightbox

STEP 2a: In DrillFlashcard.jsx, add a lightbox state and overlay.

Add state at the top of the component:
  const [lightboxUrl, setLightboxUrl] = useState(null)

Make the existing image clickable — wrap or modify the existing img tag:
  {current.image_url && (
    <img
      src={current.image_url}
      alt=""
      className="max-h-48 mx-auto rounded-lg mb-3 object-contain cursor-pointer active:opacity-80 transition-opacity"
      onClick={(e) => { e.stopPropagation(); setLightboxUrl(current.image_url) }}
    />
  )}

Add the lightbox overlay at the bottom of the component's return, just before the closing </div>:

  {lightboxUrl && (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
      onClick={() => setLightboxUrl(null)}
    >
      <button
        onClick={() => setLightboxUrl(null)}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl hover:bg-white/20 transition-colors"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        x
      </button>
      <img
        src={lightboxUrl}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )}

Clear lightboxUrl when the card changes (user swipes to next item). Add to the existing useEffect that fires on index change, or add a simple one:
  useEffect(() => { setLightboxUrl(null) }, [index])

STEP 2b: In DrillChecklist.jsx, add the same lightbox.

Add state:
  const [lightboxUrl, setLightboxUrl] = useState(null)

Find where item thumbnails are displayed in checklist rows. They likely show a small image. Make them tappable:
  onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.image_url) }}
  Add cursor-pointer to the thumbnail's className.

Add the same lightbox overlay JSX at the bottom of the component's return (identical to the one in DrillFlashcard).

STEP 2c: Ensure the lightbox works well on mobile:
- The overlay should be fixed position, full screen, z-index high enough to cover everything (z-[60] or higher)
- The image should scale to fit within the viewport (max-w-full max-h-full object-contain)
- Padding around the image (p-4) so it doesn't touch edges
- The close button needs to be easily tappable (min 44px touch target)
- Tapping the dark backdrop closes the lightbox
- Tapping the image itself does NOT close (stopPropagation on img)

STEP 3: Do NOT change these files:
- src/data/drills.json
- src/lib/supabase.js
- src/hooks/useAuth.js
- src/hooks/useDrillContent.js
- src/hooks/useSupabaseProgress.js
- src/hooks/useShuffle.js
- src/hooks/useSessionResume.js
- src/hooks/useTimer.js
- src/components/Auth.jsx
- src/components/Heatmap.jsx
- src/components/Analytics.jsx
- src/components/Timer.jsx
- src/components/ProgressBar.jsx
- src/components/AddItemForm.jsx
- src/components/EditItemForm.jsx
- src/components/SectionForm.jsx
- src/components/SectionPicker.jsx
- src/App.jsx

Summary of modified files:
- src/components/DrillFlashcard.jsx (whitespace-pre-wrap on text, lightbox state + overlay, clickable image)
- src/components/DrillChecklist.jsx (whitespace-pre-wrap on text, lightbox state + overlay, clickable thumbnail)
```

---

## Test After Deploy

**Line breaks:**
1. Edit any drill item, type two lines with a blank line between them
2. Save — flashcard mode should show the line break preserved
3. Switch to checklist mode — same

**Lightbox:**
1. Find a drill item with an image
2. Tap the image — should open full-screen over dark backdrop
3. Tap backdrop — closes
4. Tap X button — closes
5. Swipe to next card — lightbox closes automatically
6. Test in checklist mode — tap thumbnail, same lightbox

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260404 | Three bug fixes: edit-doesn't-update, analytics empty, date format |
| v1.1 | 20260404 | Two UI improvements: line break preservation, image lightbox |
