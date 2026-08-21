# Path
export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"

# Plugins
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
  zsh-completions
  history-substring-search
)

# Extra completions
fpath+=${ZSH_CUSTOM:-${ZSH:-~/.oh-my-zsh}/custom}/plugins/zsh-completions/src

source $ZSH/oh-my-zsh.sh

# --- Bash-like behavior ---

# Emacs/bash-style keybindings (Ctrl-A, Ctrl-E, etc.)
bindkey -e

# Bash-like word movement (stop at / and other punctuation)
autoload -U select-word-style
select-word-style bash

# Bash-like tab completion (show list on first tab, cycle on subsequent)
setopt no_auto_menu
setopt bash_auto_list
setopt no_list_ambiguous

# Case-insensitive completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'

# Colored completion menu
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"

# History settings (bash-like)
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.zsh_history
setopt append_history
setopt share_history
setopt hist_ignore_dups
setopt hist_ignore_space

# fzf integration (pretty Ctrl-R history search + Ctrl-T file finder)
source /usr/share/fzf/key-bindings.zsh
source /usr/share/fzf/completion.zsh

# Up/Down arrow searches history based on what you've typed
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# --- Environment ---
export SUDO_EDITOR="$EDITOR"
export BAT_THEME=ansi

# --- Aliases (from your bash config) ---

# File system
if command -v eza &> /dev/null; then
  alias ls='eza -lh --group-directories-first --icons=auto'
  alias lsa='ls -a'
  alias lt='eza --tree --level=2 --long --icons --git'
  alias lta='lt -a'
fi

alias ff="fzf --preview 'bat --style=numbers --color=always {}'"

open() {
  xdg-open "$@" >/dev/null 2>&1 &
}

# Directories
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias bitwig='flatpak run com.bitwig.BitwigStudio'
# Tools
alias c='opencode'
opengod() { OPENCODE_CONFIG="$HOME/.config/opencode/opencode-god.json" command opencode "$@"; }
alias d='docker'
alias r='rails'
n() { if [ "$#" -eq 0 ]; then nvim .; else nvim "$@"; fi; }

# Git
alias g='git'
alias gcm='git commit -m'
alias gcam='git commit -a -m'
alias gcad='git commit -a --amend'
alias svim='sudo nvim'
# Your custom aliases
alias shh='asusctl profile set Quiet'
alias zoom='asusctl profile set Performance'
alias :q='exit'

# Zoxide (must be last)
if command -v zoxide &> /dev/null; then
  eval "$(zoxide init zsh)"
  alias cd="z"
fi

# Dotfiles bare repo
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'

# Back up tracked config changes without picking up unrelated home-directory files.
dotfiles-backup() (
  cd "$HOME" || exit 1
  dotfiles add --update
  if dotfiles diff --cached --quiet; then
    print 'No tracked dotfile changes to back up.'
    exit 0
  fi
  dotfiles diff --cached --stat
  dotfiles commit -m "Back up config $(date +%F)" && dotfiles push
)
