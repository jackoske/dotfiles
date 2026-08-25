#!/usr/bin/env python3
"""Validate the Herdr orchestrator skill's hand-authored eval cases."""

import argparse
import json
import sys
from pathlib import Path


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"cannot read valid JSON from {path}: {error}"]

    if document.get("skill_name") != "herdr-orchestrator":
        errors.append("skill_name must be herdr-orchestrator")
    cases = document.get("evals")
    if not isinstance(cases, list) or not cases:
        return errors + ["evals must be a non-empty list"]

    ids: set[int] = set()
    for index, case in enumerate(cases, start=1):
        prefix = f"evals[{index}]"
        case_id = case.get("id") if isinstance(case, dict) else None
        if not isinstance(case_id, int) or isinstance(case_id, bool):
            errors.append(f"{prefix}.id must be an integer")
        elif case_id in ids:
            errors.append(f"{prefix}.id is duplicated: {case_id}")
        else:
            ids.add(case_id)
        for field in ("prompt", "expected_output"):
            if not isinstance(case.get(field), str) or not case[field].strip():
                errors.append(f"{prefix}.{field} must be non-empty text")
        assertions = case.get("assertions")
        if not isinstance(assertions, list) or not assertions:
            errors.append(f"{prefix}.assertions must be a non-empty list")
        elif any(not isinstance(item, str) or not item.strip() for item in assertions):
            errors.append(f"{prefix}.assertions must contain non-empty text")

    if ids and ids != set(range(1, len(cases) + 1)):
        errors.append("eval ids must be consecutive starting at 1")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "evals" / "evals.json",
        help="path to evals.json (default: this skill's evals/evals.json)",
    )
    args = parser.parse_args()
    errors = validate(args.path)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"OK: validated {len(json.loads(args.path.read_text(encoding='utf-8'))['evals'])} eval cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
