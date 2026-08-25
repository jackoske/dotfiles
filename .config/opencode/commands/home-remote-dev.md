---
description: Configure or audit a persistent home remote development host with Tailscale, HerdR, Cloudflare Access, and devshare.
agent: build
---

Use the `home-remote-dev` skill for this task.

Operate as a supervised infrastructure change:

1. Inspect the existing host and preserve working configuration.
2. Build the smallest reversible changes needed for the requested outcome.
3. Keep administration on Tailscale and previews on authenticated Cloudflare Access.
4. Use local protected credentials only; never request or print secrets in chat.
5. Verify each service and external route with fresh commands.
6. Produce the required recovery runbook and explicitly list anything requiring browser, router, or physical access.

User request:

$ARGUMENTS
