# OpenCode steering rules

Before proposing or executing a command with irreversible impact, give a
brief advisory warning naming the risk and, when practical, offer a dry run,
backup, or narrower alternative. This includes destructive filesystem and
database operations, hard resets, force pushes, resource deletion, broad
permission changes, and commands that could expose secrets.

Do not print secret values. Keep warnings concise, and do not use them to
override explicit user approval or the native permission system.
