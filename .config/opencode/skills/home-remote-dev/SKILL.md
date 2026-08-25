---
name: home-remote-dev
description: Use when configuring or auditing a persistent home development host with Tailscale SSH, HerdR sessions, Cloudflare Tunnel/Access previews, and localhost-only devshare routing.
compatibility: Linux, systemd, Tailscale, cloudflared, HerdR, Docker, Cloudflare DNS
---

# Home Remote Development

Configure a home development machine for two separate paths:

```text
Personal devices -> Tailscale -> SSH/HerdR administration
Browser-only devices -> Cloudflare Access -> Cloudflare Tunnel -> localhost preview
```

## Non-negotiable constraints

- Inspect before changing anything.
- Never expose SSH, databases, Docker, HerdR, or arbitrary TCP services through Cloudflare.
- Prefer development servers bound to `127.0.0.1`.
- Preserve existing HerdR projects, sessions, shell configuration, Docker stacks, and reverse proxies.
- Never install tmux or screen when HerdR already provides persistence.
- Never print API tokens, connector tokens, credentials, `.env` values, or private keys.
- Never use a credential pasted into chat; require local rotation and local storage.
- Never create router port forwarding.
- Do not rename a Tailscale host until an IP fallback is documented and verified.
- Do not claim Cloudflare Access is configured until an external request returns an Access redirect.

## Discovery checklist

Inspect, without mutation:

1. OS, kernel, chassis, hostname, user, shell, and privilege capabilities.
2. SSH daemon configuration, Tailscale SSH state, MagicDNS, and current Tailscale IP.
3. Firewall rules, router assumptions, listening sockets, and route owners.
4. Existing cloudflared installation, service, token-file permissions, and tunnel health.
5. HerdR version, status, sessions, config, API snapshot, and logs.
6. Docker, Compose, container ports, restart policies, databases, and existing proxies.
7. Runtimes, package managers, `devshare`, and shell conventions.
8. System services, user services, lingering, power/lid behavior, and update automation.

Keep discovery output sanitized. Record unknowns and blockers instead of guessing.

## Preferred architecture

Use one named Cloudflare Tunnel and a localhost-only reverse proxy for dynamic previews.
Use a single-level wildcard hostname when possible:

```text
myapp-dev.example.com -> Cloudflare Access -> Tunnel -> 127.0.0.1:8787 -> 127.0.0.1:3000
```

Avoid nested wildcard names such as `*.dev.example.com` unless the zone has a suitable
Advanced Certificate. Single-level names such as `myapp-dev.example.com` normally avoid
that complication.

Use explicit project/port mappings as the reliable interface. Random names may be added
only when wildcard DNS, tunnel routing, and Access policy cover them.

## Cloudflare workflow

1. Require the user to complete browser-only account/domain authorization.
2. Create or use a named remotely managed tunnel.
3. Create a wildcard DNS record pointing to the tunnel target.
4. Configure the tunnel route to the localhost-only proxy.
5. Create an Access application covering the same hostname pattern.
6. Allow only the chosen identity and require MFA.
7. Verify an external request returns an Access redirect before testing an app.

If API automation is requested, use a locally stored, least-privilege token. Prefer:

```text
Zone: DNS Edit, Zone Read, restricted to the specific zone
Account: Cloudflare Tunnel Edit, restricted to the specific account
```

Never request administrator-wide permissions. Read credentials from a local protected
file or environment without printing them.

## Local service workflow

Use systemd for unattended infrastructure:

- `tailscaled.service`: enabled and running.
- `cloudflared.service`: enabled, restart-on-failure, token file protected by root.
- `devshare-proxy.service`: user service, localhost-only, enabled, and user lingering enabled.

Use HerdR for persistent interactive work. Do not create a second session manager.

## Verification gates

Before completion, verify:

- Tailscale is running and SSH is enabled.
- `ssh <hostname>` or the documented Tailscale IP fallback works.
- HerdR is running and its session survives SSH disconnect.
- cloudflared has registered connections and no ingress errors.
- The proxy listens only on `127.0.0.1`.
- A temporary local HTTP service can be routed by `devshare`.
- The public hostname resolves and returns a Cloudflare Access redirect.
- Databases remain localhost-only.
- Docker socket is not published.
- No router changes were made.
- Reboot and logout behavior is documented.

## Required output

Provide a concise runbook containing:

- Architecture and hostname convention.
- Exact SSH, HerdR, devshare, service, log, and restart commands.
- How to start, list, inspect, and stop previews.
- Recovery procedures for Tailscale, cloudflared, HerdR, sleep, network loss, and reboot.
- Manual Cloudflare/Tailscale/router actions still required.
- Security findings and residual risks.
