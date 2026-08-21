---
name: engineering-workflow
description: Run a disciplined plan-build-verify workflow with small changes, evidence, and explicit risk review.
license: MIT
compatibility: opencode
metadata:
  source: ciembor/agent-rules-books
  mode: on-demand
---

# Engineering workflow

1. Clarify the outcome, constraints, non-goals, and acceptance evidence.
2. Inspect the existing system before proposing changes; preserve local conventions.
3. Separate discovery, design, implementation, and cleanup when practical.
4. Prefer small, reversible changes with one coherent responsibility.
5. Add or update the narrowest useful test before claiming completion.
6. Review security, reliability, data, and operational consequences.
7. Verify with exact commands and report failures honestly.
8. Keep unrelated cleanup out of the change unless it is required for safety.

Use Scout for current external facts and Architect for boundary decisions. Do not
pretend a remembered API, model, dependency, or provider behavior is current.
