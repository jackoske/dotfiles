# Local secrets

Keep credentials outside the dotfiles repository. Prefer a system keyring or
secret manager; otherwise place narrowly scoped local files in this directory.

Do not commit real values. Commit only `*.example` templates containing variable
names, required shape, and setup notes. Load secrets at runtime through the

If a credential is ever committed, revoke or rotate it first. This repository
does not rewrite history automatically, so historical exposure must be handled
as a separate incident.
