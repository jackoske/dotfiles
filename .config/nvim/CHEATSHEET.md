# Neovim Navigation Cheat Sheet
### LazyVim Edition · `<leader>` = `Space`

---

## 0. Insert Mode Commands

| Key | Behavior                               |
| --- | -------------------------------------- |
| `i` | insert before cursor                   |
| `a` | insert after cursor                    |
| `I` | insert at first non-whitespace of line |
| `A` | **append at end of line** ← use this  |
| `o` | new line below, enter insert mode      |
| `O` | new line above, enter insert mode      |

> `A` = end of line. `I` = beginning. Not the other way around.

---

## 1. Code Navigation

> Move around your codebase intelligently using the LSP (Language Server).

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `gd`            | **Go to definition** — jump to where a function/var is defined |
| `gD`            | Go to declaration (useful in C/C++ headers)               |
| `gr`            | **Find all references** — see every place something is used |
| `gI`            | Go to implementation (e.g. interface → concrete class)    |
| `K`             | **Hover docs** — show documentation popup for symbol under cursor |
| `<C-o>`         | **Jump back** — return to where you came from             |
| `<C-i>`         | **Jump forward** — redo the last jump                     |
| `]d`            | Next diagnostic (error/warning)                           |
| `[d`            | Previous diagnostic                                       |
| `<leader>ca`    | **Code actions** — fix suggestions from the LSP           |
| `<leader>cr`    | Rename symbol everywhere in the project                   |

> **Tip:** `gd` then `<C-o>` is the most common workflow — jump in, look, jump back.

---

## 2. File Navigation

> Open files, search for things, and move between open buffers.

### Finding Files

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `<leader><space>` | **Find file** — fuzzy search all files in project       |
| `<leader>ff`    | Find file (same as above, explicit)                       |
| `<leader>fg`    | **Live grep** — search text content across all files      |
| `<leader>fr`    | Recent files — files you opened lately                    |
| `<leader>e`     | Toggle **file explorer** (neo-tree sidebar)               |

### Switching Buffers

> Buffers = open files. They stay loaded even when not visible.

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `<S-h>`         | **Previous buffer** (Shift + h)                           |
| `<S-l>`         | **Next buffer** (Shift + l)                               |
| `<leader>fb`    | **Pick from open buffers** — fuzzy search open files      |
| `<leader>,`     | Switch buffer (same as above, quick version)              |

### Closing Buffers

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `<leader>bd`    | **Close current buffer** (safe — won't quit Neovim)       |
| `<leader>bo`    | **Close all other buffers** — keep only this one          |
| `<leader>bD`    | Force close buffer (even if unsaved)                      |

---

## 3. Tab Navigation

> Tabs in Neovim hold window layouts. Think of them as workspaces, not browser tabs.

| Shortcut           | What It Does                                           |
|--------------------|--------------------------------------------------------|
| `<leader><tab><tab>` | **New tab**                                          |
| `<leader><tab>d`   | **Close current tab**                                  |
| `<leader><tab>l`   | Go to last used tab                                    |
| `<leader><tab>f`   | Go to first tab                                        |
| `]<tab>`           | Next tab                                               |
| `[<tab>`           | Previous tab                                           |

> **Tip:** Most people use buffers day-to-day and tabs only when they need separate workspaces (e.g. comparing two features).

---

## 4. NeoTree File Actions

> Keys that work **inside the NeoTree panel** (when your cursor is in the sidebar).

| Key      | What It Does                                              |
|----------|-----------------------------------------------------------|
| `Enter` or `l` | Open file in current window                       |
| `s`      | Open in **vertical split** (to the right) ← use this     |
| `S`      | Open in horizontal split (below)                          |
| `t`      | Open in a new tab                                         |
| `w`      | Open with window picker (choose which split)              |
| `P`      | Preview file (peek without leaving NeoTree)               |
| `a`      | Create new file/directory                                 |
| `d`      | Delete file                                               |
| `r`      | Rename file                                               |
| `q`      | Close NeoTree                                             |

> **Tip:** Press `s` on a file to open it to the right while keeping NeoTree open.

---

## 5. Splits (Bonus)

> Split your editor to view two files side by side.

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `<C-w>v`        | Split **vertically** (side by side)                       |
| `<C-w>s`        | Split **horizontally** (top and bottom)                   |
| `<C-w>h/j/k/l`  | Move focus between splits (left/down/up/right)            |
| `<C-w>q`        | Close current split                                       |
| `<leader>-`     | Split window below                                        |
| `<leader>\|`    | Split window right                                        |

---

## 6. Panic / Recovery

> Things got messy? Here's how to regain control.

### Too many buffers open

| Shortcut / Command  | What It Does                                          |
|---------------------|-------------------------------------------------------|
| `<leader>bo`        | Close all buffers **except** the current one          |
| `<leader>,`         | See all open buffers and pick one to focus            |
| `:bufdo bd`         | Close **every** open buffer (nuclear option)          |

### Accidentally in a weird mode or broken state

| Shortcut / Command  | What It Does                                          |
|---------------------|-------------------------------------------------------|
| `<Esc>`             | Return to Normal mode (press it twice if unsure)      |
| `<Esc><Esc>`        | Also closes most popups and floating windows          |
| `u`                 | **Undo** last change                                  |
| `<C-r>`             | **Redo** last undone change                           |
| `:e!`               | **Discard all unsaved changes** in current file       |
| `:wa`               | **Save all** open files at once                       |
| `:qa`               | **Quit all** — close Neovim entirely                  |
| `:qa!`              | Force quit all without saving (use carefully)         |

### Lost the file explorer or layout

| Shortcut        | What It Does                                              |
|-----------------|-----------------------------------------------------------|
| `<leader>e`     | Toggle neo-tree file explorer open/closed                 |
| `<C-w>=`        | Reset all split sizes to equal                            |
| `<leader>wd`    | Delete current window/split                               |

---

## Quick Reference Card

```
INSERT               │  FIND THINGS          │  NAVIGATE CODE        │  MANAGE BUFFERS
─────────────────────┼───────────────────────┼───────────────────────┼─────────────────────
i  before cursor     │  <leader><space> file │  gd   → definition    │  <S-h>  prev buffer
a  after cursor      │  <leader>fg  grep     │  gr   → references    │  <S-l>  next buffer
I  line start        │  <leader>fr  recent   │  K    → hover docs    │  <leader>bd  close
A  line END ← this   │  <leader>e   explorer │  <C-o> jump back      │  <leader>bo  close others
o  new line below    │                       │  <C-i> jump forward   │  <leader>,   pick buffer
O  new line above    │                       │                       │
```

---

> **Golden rule:** When lost, press `<Esc>` and reach for `<leader>` — most things live there.
