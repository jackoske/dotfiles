# dotfiles

My personal dotfiles managed with a bare git repo — no symlinks, files stay in place.

## What's tracked

| Config | Path |
|--------|------|
| Neovim (LazyVim) | `~/.config/nvim/` |
| Hyprland | `~/.config/hypr/` |
| Waybar | `~/.config/waybar/` |
| Ghostty | `~/.config/ghostty/` |
| Mako | `~/.config/mako/` |
| Walker | `~/.config/walker/` |
| Lazygit | `~/.config/lazygit/` |
| Tmux | `~/.config/tmux/` |
| Omarchy | `~/.config/omarchy/` |
| Starship | `~/.config/starship.toml` |
| Zsh | `~/.zshrc` |

## Restoring on a new machine

```bash
# Clone the bare repo
git clone --bare git@github.com:jackoske/dotfiles.git $HOME/.dotfiles

# Set up the alias
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'

# Hide untracked files
dotfiles config status.showUntrackedFiles no

# Check out the files
dotfiles checkout
```

> If checkout fails due to existing files, back them up or delete them first.

Add the alias to your `.zshrc` so it persists:

```bash
echo "alias dotfiles='git --git-dir=\$HOME/.dotfiles/ --work-tree=\$HOME'" >> ~/.zshrc
```

## Day-to-day usage

The safe default is one command from any directory. It stages only files that
are already tracked, so phone backups and other unrelated home-directory files
are not included:

```bash
dotfiles-backup
```

For a new config file, explicitly add it once before running the backup:

```bash
dotfiles status
dotfiles add ~/.config/nvim/somefile.lua
dotfiles-backup
```

## OpenCode workflow modes

OpenCode uses named agents and commands as modes. Switching modes selects a
different prompt, permission policy, and model configuration for the current
request; it does not replace `opencode.json` or require config-file swapping.
Restart OpenCode after changing agent or command files.

| Command | Mode | Purpose | Writes files? |
|---------|------|---------|--------------|
| `/herdr-orchestrate <task>` | Gardener | Supervised Herdr planning, delegation, integration, and verification | Yes, when assigned |
| `/debate <question>` | Debate | Choose 2–5 currently available models, then run independent positions, rebuttals, and explicit tradeoffs | No |
| `/collaborate <task>` | Collaborate | Proposals → validated DAG → delegated execution → single-writer integration | Yes, when assigned |
| `/review-fusion <change>` | Review Fusion | Independent spec, quality, and security reviews fused into one report | No |

### Safety invariants

- Herdr control requires `HERDR_ENV=1` and capability discovery first.
- Children start with `task: deny`; they cannot create grandchildren.
- File ownership is explicit; shared work has a single writer at a time.
- Lifecycle state comes from Herdr’s structured API/list/get state, not guessed
  terminal-output lines.
- Reports are preserved before child panes are released and closed.
- Direct pane closure is normal; C-c is only a bounded fallback for failed
  closure or a demonstrably stuck child.
- Debate and Review Fusion are read-only and do not silently make decisions.

### Debate model selection

Debate does not hard-code a model roster. The facilitator checks the current
catalog with:

```bash
opencode models
```

It then asks you to select 2–5 provider/model IDs and a number of rounds. This
makes free or newly available models usable without editing agent files. A
custom model ID is allowed, but it must be authenticated and visible to the
current OpenCode installation. Selected models are passed to each child at
startup with `--model`; the `debate-participant` role remains the stable
read-only behavior contract. Participants receive explicit names and model IDs
and see complete, labeled prior-round responses from the other participants.
The same child sessions are reused across rounds, so the debate is cumulative
rather than a sequence of unrelated one-shot answers.
