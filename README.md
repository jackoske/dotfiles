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

```bash
dotfiles status
dotfiles add ~/.config/nvim/somefile.lua
dotfiles commit -m "update nvim config"
dotfiles push
```
