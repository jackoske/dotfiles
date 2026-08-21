---
name: herdr-orchestrator
description: Use Herdr to run multi-agent OpenCode work as a supervised Gardener. Trigger for Herdr, orchestration, parallel agents, background work, gardener/coordinator requests, or keeping the main session free.
---

# Herdr Orchestrator

## Purpose

This skill defines a Gardener: the first OpenCode agent is the long-lived,
top-level supervisor for the task. The Gardener keeps the user's pane usable,
delegates meaningful work to visible Herdr child agents, integrates their
results, verifies the complete result, and owns cleanup.

## Gardener contract

The Gardener MUST:

1. inspect and decompose the request;
2. identify independent workstreams and explicit ownership boundaries;
3. fan out immediately when safe parallel work exists;
4. maintain a task graph, agent registry, dependencies, results, and created
   Herdr resources (a todo list is suitable);
5. supervise every child through a terminal state;
6. reconcile conflicts and create follow-up/replacement agents when useful;
7. perform final verification itself; and
8. terminate children and clean only resources created by this run.

The Gardener SHOULD avoid specialist implementation itself when that work can
be safely delegated. It remains responsible for integration and final checks.
Children MUST NOT spawn grandchildren unless explicitly instructed.

## Environment and capability discovery

Before controlling layout, run:

```bash
test "${HERDR_ENV:-}" = 1
```

If it fails, do not manipulate Herdr; explain that the process is not in a
Herdr-managed pane. Otherwise inspect the current layout and focus before
creating anything:

```bash
herdr pane current
herdr pane layout
herdr agent list
```

Do not invent flags or lifecycle commands. When syntax is uncertain, inspect:

```bash
herdr --help
herdr agent --help
herdr pane --help
opencode --help
```

In particular, discover the installed mechanism for auto-accept/non-
interactive execution, waiting, termination, pane IDs, and agent startup.
Use it for children when supported. For example, current OpenCode versions
may support `--auto`, but the Gardener MUST verify this before using it. If no
such mechanism exists, continue with ordinary prompts and handle permission
blocks explicitly. Auto-accept never authorizes destructive work outside the
assigned scope.

Preserve `$PWD`. Use `--no-focus` whenever supported so the user's pane stays
focused. Never close layout that existed before this run.

## Decomposition and parallelism

Parallelism is the default:

> If two or more meaningful tasks can run without conflicting writes or
> unresolved dependencies, the Gardener MUST spawn multiple agents and run
> them in parallel rather than processing them serially itself.

Look for separate subsystems, independent files, research, implementation,
tests, frontend/backend work, documentation, bug hypotheses, reproduction,
static analysis, and API/schema investigation. Do not spawn for trivial work
where orchestration costs more than execution. Do not parallelize conflicting
writes to the same file; serialize, refine ownership, or make one task
read-only.

Prefer sibling panes for one or two related children, a deliberate grid for
three or four, tabs for larger independent fan-outs, and separate workspaces
only for genuine isolation or another checkout. Fan out early, but do not
create redundant agents.

### Pane layout rules

Pane layout is part of orchestration, not an accidental side effect of agent
creation. Before splitting, record the current pane as `root`. For a 2x2
layout, split explicit pane IDs rather than repeatedly splitting `--current`:

```text
root --right--> right_top
root --down---> left_bottom
right_top --down--> right_bottom
```

Keep `root` focused for the Gardener and start children in the returned pane
IDs. This produces a predictable layout and avoids the common failure mode of
three nested panes on one side and one full-height pane on the other. If the
number of children does not fit cleanly, prefer a tab over increasingly thin
panes.

Every split creates an owned resource immediately. If agent startup fails,
startup returns no agent, or a pane is not needed after decomposition, close
that pane before continuing. Never leave an unassigned shell pane behind.

## Agent creation and ownership

Every child MUST have a unique name, one objective, one ownership boundary,
expected deliverables, an explicit read-only/write mode, dependencies, and
completion criteria. Track at least:

```text
name, pane_id, objective, scope, mode, dependencies,
status (starting|running|blocked|done|failed|terminating), result,
created_resources
```

Assign one writer per file or subsystem wherever possible. Read-only agents
may inspect overlapping files. Record the exact pane ID returned by Herdr;
never guess or refer to a pane by position.

Use a prompt shaped like this:

```text
You own <scope>.

Objective: <exact goal>
Ownership: <files/subsystem>
Mode: read-only | may edit
Dependencies: <none or named prerequisite>

Do: <specific actions>
Do not: <unrelated/conflicting scope>

Return:
- discoveries or changes
- files touched
- tests/checks run
- failures or blockers
- integration notes for the Gardener
```

Create and start children without focusing them. Parse each split response and
retain the returned pane ID; do not infer pane IDs from position:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
herdr agent start api-review --kind opencode --pane <returned-pane-id> -- --agent specialist --auto
# Wait until the start response (or `herdr agent get`) reports
# `interactive_ready:true`; do not prompt a pane that is still booting.
herdr agent get api-review
herdr agent prompt api-review "<specific prompt>"
```

For multiple children, target the saved IDs explicitly. Do not issue several
`herdr pane split --current` commands, because the focused pane may be the
newly created child and produce an unbalanced nested layout.

The `--auto` example is valid only after capability discovery confirms it;
otherwise omit it or use the installed equivalent. Start all independent
children before waiting on any one of them.

## Supervision and dynamic fan-out

Continuously supervise active children with the installed equivalents of:

```bash
herdr agent list
herdr agent get <name>
herdr agent read <name>
```

Do not use `herdr agent wait --until done` as the normal completion mechanism
for interactive OpenCode children. They commonly finish their requested turn
by becoming `idle`, while the Herdr lifecycle remains attached to the pane;
waiting for `done` can therefore block forever. Completion is a supervised
protocol: read the terminal output, inspect `get`/`list`, and decide whether
the child is reportable (`idle` with a final report), blocked, failed, or still
working. A bounded wait may be used only as a diagnostic safety timeout, never
as proof of completion.

A pane existing or becoming quiet does not prove completion. For every child,
determine `done`, `blocked`, `failed`, `stalled`, or `terminated`. If blocked
or stalled, read its output, identify whether it is waiting, confused, or
dead, then correct the prompt, retry a transient issue, or replace it. Preserve
useful findings and avoid infinite retries. If `--until` is unsupported, use
the installed event/state subscription equivalent or poll `get`/`list` only
as a compatibility fallback. Do not treat quiet output, an existing pane, or
an `idle` state as a collected report.

Parallelism may grow during the run. Spawn a follow-up when a child discovers
a separable subproblem, a blocker can be investigated independently, tests
reveal an unrelated defect, or an independent verification is useful. Keep the
Gardener as the sole top-level coordinator and avoid uncontrolled recursion.

Do not wait on one child while unrelated children can make progress. Poll or
inspect whichever finishes first, and serialize only actual dependency chains.

## Integration and verification

Collect every required report with `read` before integrating. Reconcile
ownership conflicts deliberately; never silently overwrite another child's
work. For substantial changes, consider read-only verification children for
tests, regressions, security, type checking/builds, code review, or checking
requirements against the implementation. Verification agents should not edit
unless explicitly assigned repairs.

The Gardener MUST run final verification itself: relevant tests, builds,
linters, type checks, and repository status/diff review. Completion requires
implementation or investigation to be finished, child results reconciled,
failures understood or disclosed, and verification recorded.

## Lifecycle, cleanup, and failure handling

The Gardener owns the entire child lifecycle:

```text
decompose → spawn → supervise → integrate → verify →
terminate children → clean resources → report
```

Before reporting completion, the Gardener MUST:

1. retrieve and preserve every child report before termination;
2. after the report is collected, terminate any child still alive with the
   canonical interrupt syntax (`herdr agent send-keys <name> C-c`), then
   re-check `herdr agent get/list` until that named child disappears or is
   explicitly terminal. Do not send an unrecognised `ctrl-c` token;
3. once the child is no longer alive, release lifecycle authority when
   required with `herdr pane release-agent <pane_id> --source <source>
   --agent <label>`, then close the exact owned pane with
   `herdr pane close <pane_id>`. Pane closure is the final cleanup action and
   is expected to kill the pane's OpenCode process; it is safe only after the
   report is collected and the pane ID is confirmed to belong to this run;
4. verify no orphan agent/process from this run remains and that the original
   root pane is still focused. Never close a pre-existing pane.

Use the exact recorded pane IDs and ownership registry for cleanup. Never
close a pane merely because it is done, and never close a pane or process
that predates the current run.

If graceful termination fails, inspect the process and escalate only against
that owned resource. Never kill unrelated processes. If cleanup cannot be
completed, explicitly report the resource, state, and reason. Intentionally
retained resources require a clear stated reason.

## Worked fan-out example

For a request to add a search feature, the Gardener might run this sequence:

```bash
# 1. Verify environment and inspect existing layout.
test "${HERDR_ENV:-}" = 1
herdr pane current
herdr pane layout
herdr agent list

# 2. Discover supported startup/auto-accept and lifecycle syntax.
herdr agent --help
herdr pane --help
opencode --help

# 3. Create three owned child panes as a predictable 2x2 layout.
# Save the current pane as root, then target returned IDs explicitly.
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# response => pane_id=w7:p2 (right_top)
herdr pane split --pane w7:p1 --direction down --cwd "$PWD" --no-focus
# response => pane_id=w7:p3 (left_bottom)
herdr pane split --pane w7:p2 --direction down --cwd "$PWD" --no-focus
# response => pane_id=w7:p4 (right_bottom)

# 4. Start independent children in parallel. Add --auto only if help confirmed it.
herdr agent start search-api --kind opencode --pane w7:p2 -- --agent specialist --auto
herdr agent start search-ui --kind opencode --pane w7:p3 -- --agent specialist --auto
herdr agent start search-tests --kind opencode --pane w7:p4 -- --agent specialist --auto
herdr agent prompt search-api "Own src/server/search/**; may edit only that scope..."
herdr agent prompt search-ui "Own src/ui/search/**; may edit only that scope..."
herdr agent prompt search-tests "Own tests/search/**; may edit only that scope..."

# 5. Monitor all children, then collect reports.
herdr agent list
herdr agent get search-api
herdr agent read search-api
herdr agent wait search-api --until done --timeout 120000
herdr agent wait search-ui --until done --timeout 120000
herdr agent wait search-tests --until done --timeout 120000

# 6. Fan out a read-only follow-up review after integration.
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# response => pane_id=w7:p5
herdr agent start search-review --kind opencode --pane w7:p5 -- --agent specialist --auto
herdr agent prompt search-review "Read-only review of the integrated search changes against the request; report gaps only."
herdr agent wait search-review --until done --timeout 120000
herdr agent read search-review

# 7. The Gardener runs final checks, then discovers termination syntax and cleans
# only p2, p3, p4, and p5 (resources recorded above).
herdr agent --help
herdr pane --help
herdr agent list
```

The commands above illustrate fan-out; in a real run, replace placeholder
flags and lifecycle commands with the syntax actually discovered. The
Gardener integrates the three reports, addresses review findings, runs final
verification itself, terminates all four named children, closes only the four
created panes, and confirms the original pane remains focused.

## Completion checklist

Before claiming completion, confirm:

- [ ] `HERDR_ENV=1` was verified before layout control.
- [ ] The current layout and focus were recorded.
- [ ] Independent meaningful work was fanned out in parallel, or the reason
      parallelism was inappropriate is recorded.
- [ ] Every child has unique ownership, mode, dependencies, and criteria.
- [ ] Every child reached a terminal state and its report was read.
- [ ] Dynamic follow-ups/replacements were considered.
- [ ] Results and conflicts were reconciled.
- [ ] The Gardener performed final verification.
- [ ] Every created child/resource was terminated or intentionally retained
      with a reason; pre-existing resources were not touched.
- [ ] No orphan processes remain and the user's pane is still focused.
