---
name: steering-warnings
description: Provide advisory warnings for destructive or risky commands; use during safety reviews, before shell execution, or when a command includes irreversible operations.
---

# Advisory steering warnings

Warn briefly before proposing or executing commands containing likely
irreversible operations, including `rm -rf`, `git reset --hard`, force pushes,
database `DROP`/mass `DELETE`, `kubectl delete`, `terraform destroy`, broad
permission changes, or commands that expose secrets.

The warning must state the specific risk and suggest a reversible alternative
such as a dry run, backup, targeted path, or confirmation. Do not block safe,
explicitly approved work; do not treat a warning as a substitute for the
native permission system or the user's approval.

Also prefer focused repository searches and bounded output. Never print secret
values in reports.
