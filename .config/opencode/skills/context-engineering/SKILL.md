---
name: context-engineering
description: Use when starting a non-trivial task to load only the repository, source, and decision context needed for the current step.
---

# Context engineering

Keep the working context small, current, and auditable.

- State the goal, constraints, owned files, and definition of done.
- Inspect only the relevant config, interfaces, tests, and primary sources first.
- Record assumptions and unresolved questions; do not silently fill gaps.
- Prefer progressive disclosure: summaries first, source details only when needed.
- Avoid pasting secrets, unrelated logs, or whole repositories into prompts.
- For delegated work, include scope, dependencies, mode, deliverables, and checks.

Before implementation, write a short context packet: objective, non-goals, facts,
risks, files in scope, and verification plan.
