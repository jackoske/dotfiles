---
name: source-driven-development
description: Use when behavior depends on a framework, provider, API, tool, or version-sensitive fact; verify it from current primary sources before coding.
---

# Source-driven development

Do not rely on model memory for version-sensitive behavior.

1. Identify the exact product, version, feature, and decision affected.
2. Prefer official documentation, schema, source, changelog, or test suite.
3. Capture the URL, access date, relevant claim, and uncertainty.
4. Implement the smallest behavior supported by the evidence.
5. Add a focused check that would fail if the documented contract changes.

Treat third-party examples as leads, not authority. Never copy proprietary or
unlicensed prompts, code, or bundled content; adapt only independently derived
workflow ideas.
