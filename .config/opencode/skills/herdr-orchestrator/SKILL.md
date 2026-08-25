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
creation. Before splitting, record `herdr pane current`, `herdr pane layout`,
and `herdr agent list` as the pre-run baseline; record the current pane as
`root`. For a 2x2
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

#### Reuse before split

Before splitting, check whether the approved next phase explicitly calls for a
released pane to be reused. Reuse it only when it has no live owner and its
scope is safe. Otherwise create the required pane and close it after cleanup.

Every split creates an owned resource immediately. If agent startup fails,
startup returns no agent, or a pane is not needed after decomposition, close
that newly created pane only when it cannot be safely retained or reused. Any
retained pane must have an explicit registry entry, ownership/state record, and
retention reason; never leave an unassigned shell pane behind.

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
retain the returned pane ID; do not infer pane IDs from position.

### Atomic child startup

Do not manually sleep, open OpenCode in the shell, inspect terminal text for a
prompt, and then type the first request. `herdr agent start` is the startup
barrier: it launches the requested OpenCode integration in the already-created
shell pane and waits for the integration to become interactive. Pass the
initial request to OpenCode with its supported `--prompt` option in that same
startup invocation. (`-i` is not an installed OpenCode option.) Set a bounded
`--timeout` when the default is unsuitable. A successful start response (and
the corresponding structured `herdr agent get`) is sufficient to confirm the
child started; terminal `read` is not a boot-readiness mechanism.

The startup invocation must select the child role at process start and apply
the configured `task: deny` policy from boot. Never start a generic OpenCode
process and retrofit the role or delegation policy afterward:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
herdr agent start api-review --kind opencode --pane <returned-pane-id> --timeout 30000 -- --agent specialist --auto --prompt "<specific prompt>"
# The successful start response is the readiness gate; confirm structured
# state without a manual pane read or delay.
herdr agent list
herdr agent get api-review
herdr agent read api-review
```

If startup fails or times out, do not type into the pane. Inspect the
structured agent/pane state, diagnose the failure, and close or retry only the
owned pane. After the prompt, perform the normal list/get/read supervision
check; `read` is required there for report preservation or blocker diagnosis,
not for deciding whether OpenCode has booted.

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

Use `herdr api snapshot` plus `herdr agent list/get` as the structured source of
truth for lifecycle classification and termination. Never infer lifecycle state
by guessing from terminal-output lines. Use `herdr agent read` for report
preservation and blocker diagnosis only.

Parallelism may grow during the run. Assign a follow-up to a safely released
pane before splitting a new one. Spawn a follow-up when a child discovers a
separable subproblem, a blocker can be investigated independently, tests reveal
an unrelated defect, or an independent verification is useful. Keep the
Gardener as the sole top-level coordinator and avoid uncontrolled recursion.

Do not wait on one child while unrelated children can make progress. Poll or
inspect whichever finishes first, and serialize only actual dependency chains.

### Non-negotiable supervision loop

The Gardener must not perform integration or answer the user while children are
unaccounted for. After every prompt and at each work phase boundary:

1. run `herdr agent list` and compare it with the owned registry;
2. inspect each owned child with `get` and `read` (including idle children);
3. classify it as working, reportable, blocked, failed, or protocol-violating;
4. stop/release/close protocol-violating or abandoned children and record why;
5. repeat until every owned child is reportable or terminal.

Children are not allowed to use the `task` tool or spawn grandchildren. Start
delegated agents with a permission policy denying `task`; `subagent_depth` is a
defense-in-depth setting, not a cleanup substitute. A child-created pane is an
orphan until it is explicitly added to the registry, reported, and cleaned.

Before the final user-facing response, run both `herdr agent list` and
`herdr pane layout`. Completion is invalid if any owned child, unknown child
created during the run remains alive or orphaned. Retained panes are valid when
their IDs, state, ownership, and reuse/retention reason are recorded. Restore
the recorded root focus and include final zero-orphans and accounted-layout
evidence in the report.

## Development assets

Use these assets when refining this skill rather than relying on anecdotal
success:

- `evals/evals.json` — lifecycle scenarios and observable assertions covering
  reportable, terminal, stuck, orphan, and environment-gate behavior.
- `scripts/validate_evals.py` — deterministic schema and assertion validation.
  Run `python3 scripts/validate_evals.py` from this skill directory.

Run each eval with a clean context, compare against a no-skill or prior-version
baseline, and record objective assertion evidence before changing the skill.

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
2. after the report is collected, verify the child is reportable or terminal;
   do not interrupt a normally completing child. Never target the root agent
   or root pane;
3. release lifecycle authority with the exact recorded pane ID when required:
   `herdr pane release-agent <pane_id> --source <source> --agent <label>`.
   For panes created by this run, close the exact child pane directly by
   default with `herdr pane close <pane_id>`. Treat pane closure as the normal
   termination mechanism. Use the canonical interrupt syntax
   (`herdr agent send-keys <name> C-c`) only as a bounded fallback if direct
   closure fails or the child is demonstrably stuck. Do not close the root or
   any pre-existing pane.
   Retain a released child pane only when the registry records an explicit
   reuse/retention reason. Record the reason for every closure and every
   intentionally retained pane;
4. verify no live or orphan agent/process from this run remains and that the
   layout is accounted for. Restore the recorded root focus. Never close a
   pre-existing pane.

Use the exact recorded pane IDs and ownership registry for cleanup. Before
closing, confirm the target is a created child pane, the child is
terminal/disappeared, and the recorded root pane ID is different. Never close
a pane or process that predates the current run. If the pane identity is
uncertain, retain it and report the blocker rather than risking the root
OpenCode process.

If graceful termination fails, inspect the process and escalate only against
that owned resource, using a bounded timeout and only a canonical Herdr
escalation supported by capability discovery. Never kill unrelated processes.
If cleanup cannot be completed, explicitly report the resource, state, and
reason. Intentionally retained resources require a clear stated reason.

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
# Inspect get/read and classify each child as reportable or terminal; do not
# use `wait --until done` as proof of completion for interactive children.

# 6. Fan out a read-only follow-up review after integration. Reuse a released
# child pane when available; split only if no suitable pane exists.
herdr pane split --current --direction right --cwd "$PWD" --no-focus
# response => pane_id=w7:p5 (only when reuse is unavailable)
herdr agent start search-review --kind opencode --pane w7:p5 -- --agent specialist --auto
herdr agent prompt search-review "Read-only review of the integrated search changes against the request; report gaps only."
herdr agent get search-review
herdr agent read search-review

# 7. The Gardener runs final checks, releases child authority, and closes
# completed child panes. Retain a pane only for an explicitly planned reuse.
herdr agent --help
herdr pane --help
herdr agent list
```

The commands above illustrate fan-out; in a real run, replace placeholder
flags and lifecycle commands with the syntax actually discovered. The
Gardener integrates the three reports, addresses review findings, runs final
verification itself, releases child authority, closes completed child panes,
and confirms the original pane remains focused.

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
- [ ] Every created child/resource was terminated and its pane closed, or
      intentionally retained with a reason; pre-existing resources were not
      touched.
- [ ] No orphan processes remain and the user's pane is still focused.
