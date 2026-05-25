---
name: cmux
description: Control cmux terminal multiplexer via CLI. Use when the user asks to manage terminal tabs (surfaces), panes, workspaces, or windows in cmux. Covers creating/closing surfaces and panes, sending text or keys to terminals, reading terminal output, opening browser surfaces, viewing markdown files, browser automation, notifications, and sidebar metadata. Triggers on mentions of cmux, terminal tab management, split panes, send commands to another terminal, read terminal output, or cmux browser/markdown operations.
metadata:
  author: yamitzky
  version: "1.0.0"
---

# cmux

Control cmux via the `cmux` CLI over a Unix socket (`/tmp/cmux.sock`).

## Key Concepts

- **Window** — top-level OS window
- **Workspace** — a tab-bar-level container inside a window (like a tmux session)
- **Pane** — a rectangular split region inside a workspace
- **Surface** — a tab inside a pane (terminal or browser). Also referred to as "tab"
- **Panel** — alias for pane in some commands

IDs use short refs: `window:1`, `workspace:2`, `pane:3`, `surface:4`, `tab:5`.

Environment vars `CMUX_WORKSPACE_ID` and `CMUX_SURFACE_ID` are auto-set inside cmux terminals and used as defaults.

## Discover Current State

```bash
cmux identify          # show caller + focused context
cmux tree              # full hierarchy of current workspace
cmux tree --all        # all workspaces
cmux find-window <q>   # search by name; --content to search terminal text; --select to focus
```

## Create Surfaces (Tabs) and Panes

```bash
# New tab in current pane
cmux new-surface
cmux new-surface --type browser --url https://example.com

# New pane (split)
cmux new-pane --direction right
cmux new-split down

# New workspace
cmux new-workspace --cwd ~/project
```

## Send Input to a Terminal

```bash
# Send text (\n = Enter)
cmux send "echo hello\n"
cmux send --surface surface:5 "npm start\n"

# Send key
cmux send-key enter
cmux send-key --surface surface:5 ctrl+c
```

## Read Terminal Output

```bash
cmux read-screen                                    # visible viewport
cmux read-screen --surface surface:5 --scrollback   # with scrollback
cmux read-screen --surface surface:5 --lines 100    # last 100 lines
```

## Browser

```bash
cmux browser open https://example.com               # new browser surface
cmux browser surface:10 navigate https://google.com
cmux browser surface:10 snapshot --interactive       # DOM tree
cmux browser surface:10 click "button.submit"
cmux browser surface:10 fill "input#email" "user@example.com"
cmux browser surface:10 screenshot --out /tmp/shot.png
cmux browser surface:10 eval "document.title"
cmux browser surface:10 wait --selector ".loaded"
```

## Markdown Viewer

```bash
cmux markdown open plan.md     # live-reload formatted viewer
```

## Notifications & Sidebar

```bash
cmux notify --title "Done" --body "Build succeeded"
cmux set-status build "passing" --icon checkmark --color "#00ff00"
cmux set-progress 0.75 --label "Deploying..."
cmux log --level success "Tests passed"
```

## Full Reference

For the complete list of commands and flags, read [references/api_reference.md](references/api_reference.md).
