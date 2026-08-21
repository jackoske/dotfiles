---
name: architecture-principles
description: Apply compact, practical architecture principles for design, refactoring, and review.
license: MIT
compatibility: opencode
metadata:
  source: ciembor/agent-rules-books
  mode: on-demand
---

# Architecture principles

Use these as decision criteria, not as a reason to redesign unrelated code.

- Prefer deep modules with small, stable interfaces and information hiding.
- Keep domain policy independent from transport, storage, frameworks, and vendors.
- Name bounded contexts and ownership explicitly; do not confuse DTOs with domain models.
- Choose consistency, durability, and delivery semantics deliberately.
- Make schema evolution, failure behavior, and operational ownership visible.
- Refactor in small, behavior-preserving steps backed by tests.
- For legacy code, first create characterization tests and identify a seam.
- Prefer the simplest design that meets current requirements; record deferred complexity.

When principles conflict, state the tradeoff and ask Architect for a focused review.
For current framework or vendor behavior, use Scout rather than embedding stale facts.
