# cmux CLI Reference

## ID Format

All commands accept UUIDs, short refs (`window:1`, `workspace:2`, `pane:3`, `surface:4`), or indexes.
`tab-action` also accepts `tab:<n>`.
Output defaults to refs; pass `--id-format uuids` or `--id-format both` for UUIDs.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CMUX_WORKSPACE_ID` | Auto-set in cmux terminals. Default `--workspace` for all commands |
| `CMUX_SURFACE_ID` | Auto-set in cmux terminals. Default `--surface` |
| `CMUX_TAB_ID` | Optional alias for `tab-action`/`rename-tab` default `--tab` |
| `CMUX_SOCKET_PATH` | Override Unix socket path (default: `/tmp/cmux.sock`) |
| `CMUX_SOCKET_PASSWORD` | Socket auth password |

## Detection

```bash
[ -S "${CMUX_SOCKET_PATH:-/tmp/cmux.sock}" ]     # socket available
command -v cmux &>/dev/null                        # CLI present
[ -n "${CMUX_WORKSPACE_ID:-}" ]                    # inside cmux terminal
```

## Window Commands

```bash
cmux list-windows
cmux current-window
cmux new-window
cmux focus-window --window <id>
cmux close-window --window <id>
cmux rename-window [--workspace <id|ref>] <title>
cmux move-workspace-to-window --workspace <id|ref> --window <id|ref>
cmux next-window | previous-window | last-window
```

## Workspace Commands

```bash
cmux list-workspaces
cmux current-workspace
cmux new-workspace [--cwd <path>] [--command <text>]
cmux select-workspace --workspace <id|ref>
cmux close-workspace --workspace <id|ref>
cmux rename-workspace [--workspace <id|ref>] <title>
cmux reorder-workspace --workspace <id|ref|index> (--index <n> | --before <id|ref|index> | --after <id|ref|index>) [--window <id|ref|index>]
cmux workspace-action --action <name> [--workspace <id|ref|index>] [--title <text>]
```

## Pane Commands

```bash
cmux list-panes [--workspace <id|ref>]
cmux list-panels [--workspace <id|ref>]      # alias
cmux new-pane [--type <terminal|browser>] [--direction <left|right|up|down>] [--workspace <id|ref>] [--url <url>]
cmux new-split <left|right|up|down> [--workspace <id|ref>] [--surface <id|ref>] [--panel <id|ref>]
cmux focus-pane --pane <id|ref> [--workspace <id|ref>]
cmux focus-panel --panel <id|ref> [--workspace <id|ref>]
cmux resize-pane --pane <id|ref> [--workspace <id|ref>] (-L|-R|-U|-D) [--amount <n>]
cmux swap-pane --pane <id|ref> --target-pane <id|ref> [--workspace <id|ref>]
cmux break-pane [--workspace <id|ref>] [--pane <id|ref>] [--surface <id|ref>] [--no-focus]
cmux join-pane --target-pane <id|ref> [--workspace <id|ref>] [--pane <id|ref>] [--surface <id|ref>] [--no-focus]
cmux last-pane [--workspace <id|ref>]
```

## Surface (Tab) Commands

```bash
cmux new-surface [--type <terminal|browser>] [--pane <id|ref>] [--workspace <id|ref>] [--url <url>]
cmux close-surface [--surface <id|ref>] [--workspace <id|ref>]
cmux move-surface --surface <id|ref|index> [--pane <id|ref|index>] [--workspace <id|ref|index>] [--window <id|ref|index>] [--before <id|ref|index>] [--after <id|ref|index>] [--index <n>] [--focus <true|false>]
cmux reorder-surface --surface <id|ref|index> (--index <n> | --before <id|ref|index> | --after <id|ref|index>)
cmux list-pane-surfaces [--workspace <id|ref>] [--pane <id|ref>]
cmux tab-action --action <name> [--tab <id|ref|index>] [--surface <id|ref|index>] [--workspace <id|ref|index>] [--title <text>] [--url <url>]
cmux rename-tab [--workspace <id|ref>] [--tab <id|ref>] [--surface <id|ref>] <title>
cmux drag-surface-to-split --surface <id|ref> <left|right|up|down>
cmux refresh-surfaces
cmux surface-health [--workspace <id|ref>]
cmux trigger-flash [--workspace <id|ref>] [--surface <id|ref>]
```

## Input Commands

```bash
# Send text (\n = Enter, \t = Tab)
cmux send [--workspace <id|ref>] [--surface <id|ref>] <text>

# Send key event
cmux send-key [--workspace <id|ref>] [--surface <id|ref>] <key>
# Keys: enter, tab, escape, backspace, delete, up, down, left, right, ctrl+c, ctrl+d, etc.

# Send to panel
cmux send-panel --panel <id|ref> [--workspace <id|ref>] <text>
cmux send-key-panel --panel <id|ref> [--workspace <id|ref>] <key>

# Clipboard
cmux set-buffer [--name <name>] <text>
cmux list-buffers
cmux paste-buffer [--name <name>] [--workspace <id|ref>] [--surface <id|ref>]
```

## Output Commands

```bash
# Read terminal text
cmux read-screen [--workspace <id|ref>] [--surface <id|ref>] [--scrollback] [--lines <n>]

# Alias
cmux capture-pane [--workspace <id|ref>] [--surface <id|ref>] [--scrollback] [--lines <n>]

# Pipe output to external command
cmux pipe-pane --command <shell-command> [--workspace <id|ref>] [--surface <id|ref>]
```

## Tree & Discovery

```bash
cmux tree [--all] [--workspace <id|ref|index>]
cmux identify [--workspace <id|ref|index>] [--surface <id|ref|index>] [--no-caller]
cmux find-window [--content] [--select] <query>
```

## Notification Commands

```bash
cmux notify --title <text> [--subtitle <text>] [--body <text>] [--workspace <id|ref>] [--surface <id|ref>]
cmux list-notifications
cmux clear-notifications
```

## Sidebar Metadata

```bash
cmux set-status <key> <value> [--icon <name>] [--color <#hex>] [--workspace <id|ref>]
cmux clear-status <key> [--workspace <id|ref>]
cmux list-status [--workspace <id|ref>]
cmux set-progress <0.0-1.0> [--label <text>] [--workspace <id|ref>]
cmux clear-progress [--workspace <id|ref>]
cmux log [--level <level>] [--source <name>] [--workspace <id|ref>] [--] <message>
# levels: info, progress, success, warning, error
cmux clear-log [--workspace <id|ref>]
cmux list-log [--limit <n>] [--workspace <id|ref>]
cmux sidebar-state [--workspace <id|ref>]
```

## Browser Commands

```bash
# Open browser surface
cmux browser open [url] [--workspace <id|ref|index>] [--window <id|ref|index>]
cmux browser open-split [url]

# Navigation
cmux browser <surface> navigate <url> [--snapshot-after]
cmux browser <surface> back|forward|reload [--snapshot-after]
cmux browser <surface> url

# DOM inspection
cmux browser <surface> snapshot [--interactive|-i] [--cursor] [--compact] [--max-depth <n>] [--selector <css>]
cmux browser <surface> get <url|title|text|html|value|attr|count|box|styles> [--selector <css>]
cmux browser <surface> is <visible|enabled|checked> <selector>
cmux browser <surface> find <role|text|label|placeholder|alt|title|testid|first|last|nth> ...

# Interaction
cmux browser <surface> click|dblclick|hover|focus|check|uncheck|scroll-into-view <selector> [--snapshot-after]
cmux browser <surface> type <selector> <text> [--snapshot-after]
cmux browser <surface> fill <selector> [text] [--snapshot-after]
cmux browser <surface> press <key> [--snapshot-after]
cmux browser <surface> select <selector> <value> [--snapshot-after]
cmux browser <surface> scroll [--selector <css>] [--dx <n>] [--dy <n>] [--snapshot-after]
cmux browser <surface> screenshot [--out <path>]
cmux browser <surface> eval <script>

# Waiting
cmux browser <surface> wait [--selector <css>] [--text <text>] [--url-contains <text>] [--load-state <interactive|complete>] [--function <js>] [--timeout-ms <ms>]

# Dialog handling
cmux browser <surface> dialog <accept|dismiss> [text]

# Storage & cookies
cmux browser <surface> cookies <get|set|clear> [...]
cmux browser <surface> storage <local|session> <get|set|clear> [...]

# Console & errors
cmux browser <surface> console <list|clear>
cmux browser <surface> errors <list|clear>

# Other
cmux browser <surface> highlight <selector>
cmux browser <surface> state <save|load> <path>
cmux browser <surface> addinitscript|addscript <script>
cmux browser <surface> addstyle <css>
cmux browser <surface> frame <selector|main>
cmux browser <surface> tab <new|list|switch|close|<index>> [...]
cmux browser <surface> download [wait] [--path <path>] [--timeout-ms <ms>]
cmux browser identify [--surface <id|ref|index>]
```

## Markdown Viewer

```bash
cmux markdown open <path> [--workspace <id|ref|index>] [--surface <id|ref|index>] [--window <id|ref|index>]
cmux markdown <path>   # shorthand
```

Opens a formatted markdown viewer panel with live file watching. Auto-updates when file changes on disk.

## Miscellaneous

```bash
cmux version
cmux ping
cmux capabilities
cmux respawn-pane [--workspace <id|ref>] [--surface <id|ref>] [--command <cmd>]
cmux clear-history [--workspace <id|ref>] [--surface <id|ref>]
cmux wait-for [-S|--signal] <name> [--timeout <seconds>]
cmux set-hook [--list] [--unset <event>] | <event> <command>
cmux popup
cmux display-message [-p|--print] <text>
cmux set-app-focus <active|inactive|clear>
```

## Socket API

Send newline-terminated JSON to the Unix socket:

```json
{"id":"req-1","method":"workspace.list","params":{}}
```

Method names map from CLI: `list-workspaces` -> `workspace.list`, `new-workspace` -> `workspace.create`, etc.

## Global Flags

- `--socket PATH` — Custom socket path
- `--json` — JSON output
- `--password <pass>` — Socket auth
- `--window <id>` — Target window
- `--workspace <id>` — Target workspace
- `--surface <id>` — Target surface
- `--id-format refs|uuids|both` — Identifier format
