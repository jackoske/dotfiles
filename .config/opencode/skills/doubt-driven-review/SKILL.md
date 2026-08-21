---
name: doubt-driven-review
description: Use after a design or implementation to force a fresh adversarial review of assumptions, edge cases, and failure modes.
---

# Doubt-driven review

Assume the current design has a hidden flaw. Ask a fresh reviewer to challenge:

- the problem framing and rejected alternatives;
- source/version assumptions and compatibility;
- boundary cases, concurrency, recovery, and data loss;
- security, permissions, supply-chain, and prompt-injection exposure;
- observability, rollback, and operational cost.

Separate confirmed findings from hypotheses. Prioritize actionable blockers,
accept low-risk tradeoffs explicitly, and re-verify after repairs.
