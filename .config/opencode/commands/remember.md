---
description: Capture an approved, reusable project or workflow memory.
agent: gardener
---

Use the `remember` skill. Treat `$ARGUMENTS` as the proposed memory. If it is
empty, ask the user what should be remembered. Show the exact proposed text and
target path, then use the native structured question tool for approval. Only
after approval, append the memory to `~/.config/opencode/MEMORY.md` with a date
and a short category heading. Never store secrets, credentials, tokens,
personal data, or transient task status. If the user does not approve, leave
files unchanged.
