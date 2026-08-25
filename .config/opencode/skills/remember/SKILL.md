---
name: remember
description: Capture durable OpenCode memories safely; use when the user invokes /remember or asks to remember a preference, decision, or reusable workflow fact.
---

# Durable memory

Use memory sparingly for stable, reusable information: preferences, approved
workflow decisions, project conventions, or recurring environment facts.

## Safety rules

- Never store API keys, passwords, tokens, cookies, private keys, or sensitive
  personal information.
- Never store transient task status, speculative conclusions, or unapproved
  product decisions.
- Keep entries short, factual, and actionable.
- Before writing, show the exact text and path (`~/.config/opencode/MEMORY.md`)
  and obtain approval with the native `question` tool.
- If approval is absent or denied, do not write anything.

## Entry format

Append entries under a dated category heading:

```markdown
## 2026-08-26 — workflow
- The user prefers concise progress updates at phase boundaries.
```

Read the existing file before appending so entries are not duplicated. Do not
rewrite or delete prior memories unless the user explicitly requests it.
