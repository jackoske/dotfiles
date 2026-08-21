---
description: Start a visible Herdr Gardener session for a long-running or parallel task.
argument-hint: <task to orchestrate>
agent: gardener
---

Orchestrate this request through Herdr: `$ARGUMENTS`

Follow the full flow: brainstorm, obtain design approval, plan bite-sized tasks,
delegate independent scopes, then run separate spec and quality reviews before
final verification. Verify `HERDR_ENV=1`, record `herdr pane current`,
`herdr pane layout`, and `herdr agent list` as the pre-run baseline, and create
named sibling panes or tabs with `herdr` as needed. Keep the current pane
focused. Herdr is the only coordinator; children do not spawn grandchildren.

Read and record every report. Before creating a pane, reuse a safely released
or idle pane when it satisfies the new scope. After verification, explicitly
interrupt live children, confirm terminal state, release agent authority, and
retain reusable panes by default. Close only newly created panes that are
unassigned, unsafe, explicitly no longer useful, required to restore the
pre-run layout, or explicitly requested. Do not equate a quiet pane or `idle`
with a collected report. Finish with exact checks and a concise status of every
retained or closed pane. Do not report completion until `herdr agent list`
contains no live/orphan child from this run and the final layout is accounted
for with the root pane focused.
