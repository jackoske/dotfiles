---
name: interaction-contract
description: Define native question, approval, todo, progress, checkpoint, and handoff behavior for supervised OpenCode work.
---

# Interaction contract

Use this contract for work that needs explicit decisions, visible progress, or
durable continuity. Keep interaction concise and truthful.

## Questions and approval

- Use the native `question` tool for a real product, safety, scope, or data
  decision. Provide a short header, one clear question, selectable options, and
  allow a custom answer.
- Do not ask routine status questions or revisit a decision already approved.
- Before implementation, state the chosen approach and acceptance criteria.
  Treat implementation as approved only after the user confirms the choice.
- If the request is ambiguous or a new material tradeoff appears, pause and ask;
  do not infer approval from silence.

## Visible progress

- Use `todowrite` for a multi-step plan. Keep items specific and actionable,
  with exactly one item `in_progress` while work remains.
- Mark work complete only after its checks pass. Keep blocked work in progress
  and record the blocker or follow-up.
- Give concise updates at meaningful phase boundaries: current state, next
  step, and blocker/risk if any. Do not narrate every tool call or claim hidden
  state.

## Checkpoints and handoffs

- A checkpoint or handoff summary must distinguish confirmed facts, decisions,
  completed work, remaining work, verification, risks, and the next action.
- Never claim to have read unavailable panes, agents, logs, files, or history.
  Say what was inspected and what remains unknown.
- Do not write a checkpoint file merely because `/checkpoint` was invoked. First
  obtain user approval for the exact path, or propose the project-local default
  `docs/checkpoints/<checkpoint-name>.md` and ask for approval. Only then write.
- Prefer project-local documentation paths and preserve existing project naming
  conventions. A handoff may be returned in chat unless the user approves a
  file path.

## Roles and delegation

- The Gardener owns approval, synthesis, visible todos, final verification, and
  cleanup. Reviewers are read-only. Specialists own only their assigned scope.
- Children receive `task: deny` and must not spawn grandchildren. An attempted
  delegation is a protocol violation to report and stop, not an invitation to
  create another coordinator.

## Discoverability

The companion commands `/status`, `/handoff`, `/workflows`, and `/checkpoint`
provide concise entry points for these behaviors. They summarize available
conversation and inspected evidence only; they do not invent runtime state.
