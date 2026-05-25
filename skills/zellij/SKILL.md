---
name: zellij
description: Zellij terminal multiplexer CLI operations. Use when the user asks to create/manage tabs or panes, send commands or text to panes, read pane output, or automate terminal workflows in Zellij. Triggers include "pane", "tab", "zellij", "terminal pane", "dump screen", "send keys", "split terminal".
metadata:
  author: yamitzky
  version: "1.0.0"
---

# Zellij

Operate Zellij terminal multiplexer via CLI. Full CLI reference: [references/cli-reference.md](references/cli-reference.md).

## Key Concepts

- **Pane ID format**: `terminal_<N>`, `plugin_<N>`, or bare integer `N` (= `terminal_N`)
- Most actions target the focused pane by default; use `-p <PANE_ID>` to target a specific pane
- `zellij action <subcommand>` sends actions to the current session
- `zellij run -- <cmd>` is a shortcut for `zellij action new-pane -- <cmd>`

## Common Recipes

### Create a tab or pane

```bash
# New tab
zellij action new-tab --name "build"

# New tab running a command
zellij action new-tab --name "server" -- npm run dev

# New pane (auto-direction)
zellij action new-pane --name "logs" -- tail -f app.log

# Floating pane
zellij action new-pane -f --name "scratch"

# Run command in new pane (shortcut)
zellij run --name "tests" -- pytest
```

### Send text/commands to a pane

```bash
# Type characters into a pane (as if typed by keyboard)
zellij action write-chars -p terminal_3 "echo hello"

# Send Enter key to execute
zellij action send-keys -p terminal_3 Enter

# Combined: type + execute
zellij action write-chars -p terminal_3 "make build" && zellij action send-keys -p terminal_3 Enter

# Send Ctrl+C to interrupt
zellij action send-keys -p terminal_3 "Ctrl c"

# Paste text (bracketed paste mode)
zellij action paste -p terminal_3 "multi-line\ntext"
```

### Read pane output

```bash
# Dump viewport to stdout
zellij action dump-screen -p terminal_3

# Dump with full scrollback
zellij action dump-screen -p terminal_3 --full

# Dump to file
zellij action dump-screen -p terminal_3 --full --path /tmp/output.txt
```

### List tabs and panes

```bash
# List panes (JSON, all fields)
zellij action list-panes -j -a

# List tabs
zellij action list-tabs -j -a

# Find pane ID by name (example)
zellij action list-panes -j -a | jq -r '.[] | select(.name == "logs") | .id'
```

### Navigate

```bash
# Go to tab by name (create if missing)
zellij action go-to-tab-name "build" --create

# Go to tab by index
zellij action go-to-tab 2

# Focus pane by direction
zellij action move-focus right
```

## Tips

- Use `--close-on-exit` to auto-close panes when a command finishes
- Use `--block-until-exit` to make `zellij run` block until the command completes (useful for scripting)
- Use `--start-suspended` to create a pane that waits for ENTER before running
- `toggle-active-sync-tab` sends input to all panes in a tab simultaneously
- For detailed options on any command, read [references/cli-reference.md](references/cli-reference.md)
