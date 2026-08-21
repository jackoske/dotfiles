---
description: Start a visible Herdr Gardener session for a long-running or parallel task.
argument-hint: <task to orchestrate>
agent: gardener
---

Orchestrate this request through Herdr: `$ARGUMENTS`

Before any Herdr control, run the hard pre-flight gate: verify
`test "${HERDR_ENV:-}" = 1`, inspect the installed Herdr/OpenCode help and
capabilities, then record `herdr pane current`, `herdr pane layout`, and
`herdr agent list` as the baseline. If the environment check fails, do not
split panes or spawn agents. Never mix the built-in `task` tool with Herdr
delegation.

Follow the full flow: brainstorm, obtain design approval, record acceptance
criteria, plan bite-sized tasks, delegate independent scopes, then run separate
spec and quality reviews before final verification. Every Herdr child start
must include `-- --agent <role>` in that same invocation, with `task: deny`
active from boot; never retrofit the role or permissions.

Keep a visible child registry with `name`, exact `pane_id`, `objective`,
`scope`, `mode`, `dependencies`, `status`, `result`, and `created_resources`.
Update it at every lifecycle transition. After every spawn, prompt, and phase
boundary, inspect `herdr agent list/get/read`; classify children as working,
reportable, blocked, failed, or terminal. Quiet/idle is not completion, and a
disappeared child is terminal until reconciled. Herdr is the only coordinator;
children do not spawn grandchildren.

When applicable, serialize phases as `backend || analysis` (parallel and
disjoint) → ingestion wiring → UI contract → React Flow rebuild (sequential
shared-component work) → read-only reviewers → final verification. Reuse a
released pane for reviewers before splitting a new one, and preserve the root
focus.

Read and record every report. Before creating a pane, reuse a safely released
or idle pane when it satisfies the new scope. After verification, explicitly
interrupt live children, confirm terminal state, release agent authority, and
close each created child pane by default. Use the exact recorded pane ID and
never target the root pane or any pre-existing pane. The safe order is:
collect report → interrupt only if the child is still alive → re-check
`herdr agent list/get` → release the child pane's agent authority →
`herdr pane close <created-child-pane-id>`. Retain a pane only when the
registry records an explicit immediate-reuse reason. Do not equate a quiet
pane or `idle` with a collected report. Finish with exact checks and a concise
status of every closed or retained pane. Do not report completion until
`herdr agent list` contains no live/orphan child from this run and the final
layout is accounted for with the root pane focused.
