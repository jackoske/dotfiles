---
description: Prepare a checkpoint and write it only after path approval.
---

Prepare a concise checkpoint for the current request containing objective,
approved decisions and acceptance criteria, completed work, current todo state,
files changed, checks and exact results, risks/blockers, and next action.

Do not write anything on the first pass. Propose the project-local default path
`docs/checkpoints/<checkpoint-name>.md` (or use a path supplied by the user) and
ask the user to approve that exact path with the native structured question
tool. Write only after approval, and report the path and result. If no path is
approved, return the checkpoint in chat and leave files unchanged. Never claim
to include unavailable pane, agent, process, or repository state.
