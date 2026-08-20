---
description: Start a visible Herdr Gardener session for a long-running or parallel task.
argument-hint: <task to orchestrate>
agent: gardener
---

Orchestrate this request through Herdr: `$ARGUMENTS`

Verify `HERDR_ENV=1`, inspect the current Herdr layout, and create named sibling
panes or tabs with `herdr` for specialists as needed. Keep the current pane
focused. Use the `specialist` agent for delegated OpenCode work. Wait on
lifecycle events with `herdr agent wait <name> --until done` without an
arbitrary timeout, read and record every report, then explicitly interrupt,
verify terminal state, release agent authority, and close only panes created
by this run. `agent wait` observes lifecycle state rather than a prompt turn;
do not equate a quiet pane or `idle` with a collected report. Finish with
verification and a concise status of any intentionally retained panes.
