# Zen Drills - Hotfix: Kill Random Tokens - 20260403

Paste this into Claude Code. One simple fix.

---

## Hotfix -- Hardcode Token

```
Read the README.md in this repo.

URGENT FIX: The random token system is a design flaw. This is a single-user app. There should be no random tokens, no token generation, no token entry UI.

Make these changes:

1. In src/hooks/useProgress.js:
   - Delete the generateToken() function entirely
   - Change getToken() to simply return the string 'zen-tim' — no localStorage read, no generation, no conditionals. Just: return 'zen-tim'
   - Delete the setToken export
   - Keep writing to localStorage as well for any code that might read it: localStorage.setItem('zen-drills-token', 'zen-tim')

2. Remove ALL token-related UI:
   - Any settings screen, modal, or dialog that shows the token or lets the user enter a token — delete it
   - Any settings icon or gear icon that only existed for token management — delete it
   - If there's a settings view that has other useful settings besides token, keep the view but remove the token section

3. That's it. Don't change the API, don't change the KV key structure, don't change anything else. The only change is that getToken() returns a constant string instead of reading from localStorage.

The app works exactly the same as before — it just uses a fixed key prefix instead of a random one. Every device, every refresh, every reinstall will always read and write to the same KV keys.
```

**After:** push and deploy. Open the app on your phone and desktop. Both see the same data. Token problem permanently solved — you will never think about this again.
