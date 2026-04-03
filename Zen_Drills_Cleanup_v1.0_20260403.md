# Zen Drills Repo Cleanup v1.0 · 20260403

Paste into Claude Code.

---

## Cleanup — Remove Superseded Files

```
Remove these files from the repo. They are old/superseded and no longer needed:

DELETE these files:
- Zen_Drills_Fix_Prompts_v1.0_20260403.md (old KV fix prompts, superseded by Supabase migration)
- Zen_Drills_Fix_Prompts_v1.1_20260403.md (old KV fix prompts, superseded by Supabase migration)
- Zen_Drills_Supabase_Fix_v1.1_20260403.md (superseded by v1.2)
- Zen_Drills_Supabase_Plan_v1.0_20260403.md (superseded by v1.1)

KEEP these files:
- README.md
- Zen_Drills_Build_Prompts_v2.2_20260403.md (build reference)
- Zen_Drills_Supabase_Plan_v1.1_20260403.md (migration plan — current)
- Zen_Drills_Supabase_Build_v1.0_20260403.md (build prompt — reference)
- Zen_Drills_Supabase_Fix_v1.2_20260403.md (fix prompt — reference)

Also delete the old KV files that are no longer used:
- src/hooks/useProgress.js (old KV hook, replaced by useSupabaseProgress.js)
- api/progress.js (old KV API route, no longer called)
- api/backup.js (old KV backup cron, no longer needed)

Do NOT delete any other files.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 20260403 | Initial cleanup: remove superseded plan/fix docs and old KV code |
