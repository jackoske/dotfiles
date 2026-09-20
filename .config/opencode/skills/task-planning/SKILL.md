---
name: task-planning
description: Use before implementation to turn an approved design into dependency-aware, bite-sized tasks with explicit ownership and verification.
---

# Planning and task breakdown

Do not plan from an ambiguous request. First brainstorm alternatives, then obtain
explicit design approval (or state that the existing decision is approved).

Produce tasks small enough for one focused turn:

- one objective and one owner;
- exact files or subsystem boundaries;
- dependencies and non-goals;
- red/green or other verification evidence;
- integration and rollback notes;
- when continuity is valuable, name the durable `.opencode/flow/<slug>/` goal,
  plan, and evidence artifacts that will carry the work across turns.

Keep Herdr as the only coordinator; do not mix Herdr orchestration with the
built-in `task` mechanism. Route work by semantic role: Scout handles current
external facts, Explore local discovery, Architect design, General broad
investigation, Specialists narrow writes, and Reviewers read-only review.
Serialize shared-file edits.

When approval or a product choice is needed, use the native `question` tool so
the user gets an interactive menu with selectable options and a custom-answer
path. Include the consequence of each choice; do not hide unresolved decisions
in a free-form status message.
