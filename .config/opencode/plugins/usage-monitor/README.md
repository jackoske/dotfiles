# Local Usage Monitor Override

This TUI bundle is based on `opencode-usage-monitor` 2.0.1.

Local adjustments:

- Apply the configured provider-collapsed state after asynchronous refresh data arrives.
- Present the OpenAI provider as ChatGPT and format a weekly window as `7d`.
- Keep the reset time in the collapsed provider summary.
- Keep only the plan in the normal detail view; credit metadata is not useful for a ChatGPT subscription quota.
