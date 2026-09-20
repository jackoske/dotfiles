# OpenCode configuration

The global `opencode.json` is the normal, DRY base. The `god/` custom config
directory is a small model-only overlay for high-capability work:

```sh
OPENCODE_CONFIG_DIR="$HOME/.config/opencode/god" opencode
```

OpenCode merges config sources; it has no `extends`/`base` key. The custom
config directory is loaded after the global config and is the supported
override mechanism. Agent prompts and permissions
live in `agents/`; model selection lives in the two JSON layers so normal and
god mode cannot drift.

Herdr owns pane/session identity and lifecycle state through its installed
integration (`herdr-agent-state.js` and `herdr-tui-session.js`). The local
`herdr-final-report.js` adds only the last assistant message at `session.idle`;
it intentionally does not duplicate lifecycle state or claim termination.

Normal mode uses `gpt-5.6-luna-fast` for Explore/Scout/General and Luna for
coordination, review, and specialist roles. God mode upgrades the roles that
benefit from deeper reasoning while keeping Explore/Scout fast and read-only.

Selective phase-1 flow conventions use `.opencode/flow/<slug>/goal.md`,
`plan.md`, and append-only `evidence.md` for project-local continuity. Invoke
them through `/goal`, `/resume`, and `/evidence`. Hierarchical `AGENTS.md` files
provide scoped context and instructions; they are not permission boundaries and
cannot override supervisor policy. This convention introduces no new
orchestrator, plugin, provider, MCP, telemetry, or permission behavior.
