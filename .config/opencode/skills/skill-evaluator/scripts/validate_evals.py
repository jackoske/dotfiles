#!/usr/bin/env python3
"""Validate a target skill's hand-authored evals/evals.json file."""

import argparse
import json
import sys
from pathlib import Path


def validate(path: Path) -> list[str]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"cannot read valid JSON from {path}: {error}"]

    errors: list[str] = []
    if not isinstance(document.get("skill_name"), str) or not document["skill_name"].strip():
        errors.append("skill_name must be non-empty text")
    cases = document.get("evals")
    if not isinstance(cases, list) or not cases:
        return errors + ["evals must be a non-empty list"]

    ids: set[int] = set()
    for number, case in enumerate(cases, start=1):
        prefix = f"evals[{number}]"
        if not isinstance(case, dict):
            errors.append(f"{prefix} must be an object")
            continue
        case_id = case.get("id")
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
        files = case.get("files", [])
        if not isinstance(files, list) or any(not isinstance(item, str) or not item.strip() for item in files):
            errors.append(f"{prefix}.files must be a list of non-empty paths")

    if ids and ids != set(range(1, len(cases) + 1)):
        errors.append("eval ids must be consecutive starting at 1")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evals", type=Path, help="path to evals/evals.json")
    args = parser.parse_args()
    errors = validate(args.evals)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    count = len(json.loads(args.evals.read_text(encoding="utf-8"))["evals"])
    print(json.dumps({"status": "ok", "eval_file": str(args.evals), "eval_count": count}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
