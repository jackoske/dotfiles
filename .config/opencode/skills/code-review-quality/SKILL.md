---
name: code-review-quality
description: Use for a two-stage review of a change: first spec compliance, then maintainability, safety, and repository standards.
---

# Code review and quality

Run reviews in this order and keep them independent.

1. **Spec review:** map each requested behavior to evidence in the diff/tests;
   report omissions, overreach, and unclear acceptance criteria.
2. **Quality review:** inspect boundaries, naming, duplication, error handling,
   tests, security, performance, observability, and local conventions.

Review the complete change since the agreed baseline, not just the last file.
Classify findings as blocker, should-fix, or follow-up. Do not edit during a
read-only review unless the Gardener explicitly assigns a repair.
