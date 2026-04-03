# Zen Drills — New Round Fix v1.0 · 20260403

Paste into Claude Code.

---

## Fix: Allow Adding Reps on Already-Done Items in Flashcard Mode

```
Read src/components/DrillFlashcard.jsx.

PROBLEM: When an item is already marked "done", the main button says "Next" and just advances to the next card. There's no way to add another rep. This makes "New Round" useless — you reshuffle but can't practice anything.

FIX: Change the button behavior for already-done items. Instead of "Next" (skip), make it call incrementRep and then advance. The button text should say "+1 Rep" instead of "Next" when the item is already done.

Find this block in the bottom controls:

The button currently does:
- If NOT done: markDone + showAgainButton (keep this unchanged)
- If done: stopItem + next (THIS IS THE PROBLEM — change this)

Change the "already done" case to:
- If done: incrementRep(getSid(current), current.id) + stopItem + next

And change the button text from "Next" to "+1 Rep" when the item is already done.

Keep the button styling difference (gray for done, dark for not-done). Keep everything else unchanged.

That's the entire fix. One behavior change, one label change. Nothing else.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Fix flashcard "Next" button to add rep instead of just skipping |
