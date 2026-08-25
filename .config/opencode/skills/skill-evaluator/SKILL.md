---
name: skill-evaluator
description: Evaluate and improve an Agent Skill using realistic test cases, assertions, clean-context baselines, execution traces, and deterministic validators. Trigger when asked to evaluate, test, benchmark, audit, or improve a skill.
---

# Skill evaluator

Evaluate whether a skill reliably improves agent behavior, not merely whether
its prose sounds good. Keep the target skill's scope narrow and preserve a
working baseline before editing it.

## Workflow

1. **Inspect the target.** Read its `SKILL.md`, frontmatter, referenced files,
   scripts, and repository conventions. Identify the behavior the skill adds,
   the mistakes it prevents, and anything the model already knows without it.
2. **Check activation and scope.** Confirm the description says what the skill
   does and when it triggers. Remove generic advice, duplicated platform
   knowledge, and unrelated procedures. Keep core instructions concise; move
   conditional detail into referenced files.
3. **Create 2–3 realistic evals first.** Store them in the target skill's
   `evals/evals.json`. Vary wording and formality, include real input paths when
   useful, and include at least one malformed, ambiguous, or boundary case.
4. **Add observable assertions.** Prefer checks such as valid JSON, required
   files, exact counts, preserved invariants, or a required safety step. Avoid
   vague assertions such as “the answer is good” and brittle exact wording.
5. **Snapshot and run a baseline.** Run each case in a clean context without
   the skill, or against the previous version. Then run it with the candidate
   skill. Save outputs, timing/token data when available, assertion evidence,
   and full traces in separate iteration directories.
6. **Grade with evidence.** Use scripts for mechanical checks. Use human or
   model review for judgment-heavy qualities, preferably blind to which version
   produced each output. Remove assertions that always pass or always fail.
7. **Improve from causes.** Read traces, not just final answers. Add a concise
   gotcha when the same mistake recurs; bundle repeated deterministic work in
   `scripts/`; delete instructions that cause wasted work or false triggers.
8. **Re-run and report.** Compare pass rate, failures, time, and tokens against
   the baseline. Report remaining gaps and whether the skill's improvement is
   worth its context cost. Do not claim success from a single anecdotal run.

## Eval file shape

Use this minimal format:

```json
{
  "skill_name": "target-name",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user request",
      "expected_output": "Observable description of success",
      "files": ["evals/files/input.txt"],
      "assertions": [
        "The output file exists",
        "The output preserves the required invariant"
      ]
    }
  ]
}
```

Keep candidate and baseline outputs isolated:

```text
<skill>-workspace/iteration-1/eval-name/
├── with_skill/outputs/
├── without_skill/outputs/
└── grading.json
```

Record `timing.json` when the runtime provides token or duration data. Keep
execution transcripts available for diagnosis, but do not put secrets in eval
fixtures or reports.

## Scripts

Use a bundled script when agents repeatedly reinvent parsing, validation, or
benchmark aggregation. Scripts must:

- accept all input through flags or arguments; never prompt interactively;
- provide concise `--help` text and useful error messages;
- emit machine-readable results on stdout and diagnostics on stderr;
- use meaningful exit codes, safe defaults, and idempotent behavior;
- pin dependencies or declare them inline when external dependencies are needed;
- support `--dry-run` for destructive or stateful operations.

Run target validators before human grading. If no validator exists, add one for
the most objective assertion before adding more prose to the skill.

## Final report

Return:

- target skill and version/baseline used;
- eval cases and input fixtures;
- assertion pass/fail results with concrete evidence;
- with-skill versus baseline pass-rate, time, and token deltas;
- trace-derived failure patterns and changes made;
- remaining risks, skipped cases, and the next iteration.

Source guidance: Agent Skills “Best practices for skill creators”, “Evaluating
skill output quality”, and “Using scripts in skills” at agentskills.io.
