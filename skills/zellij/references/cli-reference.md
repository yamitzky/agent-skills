# Zellij CLI Reference

## Pane ID Format

Pane IDs use the format `terminal_<N>` or `plugin_<N>`. Bare integers (e.g., `3`) are treated as `terminal_3`.

Many actions accept `-p, --pane-id <PANE_ID>` to target a specific pane instead of the focused one.

## Tab & Pane Creation

### new-tab

```
zellij action new-tab [OPTIONS] [-- <COMMAND>...]
```

| Option | Description |
|---|---|
| `-n, --name <NAME>` | Tab name |
| `-l, --layout <LAYOUT>` | Layout file path |
| `-c, --cwd <CWD>` | Working directory |
| `--initial-plugin <PLUGIN>` | Plugin for initial pane |
| `--close-on-exit` | Close pane when command exits |
| `--start-suspended` | Start suspended, run after ENTER |
| `--block-until-exit` | Block until command exits |
| `--block-until-exit-success` | Block until exit status 0 |
| `--block-until-exit-failure` | Block until non-zero exit |

Returns: tab ID on stdout.

### new-pane

```
zellij action new-pane [OPTIONS] [-- <COMMAND>...]
```

| Option | Description |
|---|---|
| `-d, --direction <DIR>` | right, left, up, down |
| `-f, --floating` | Floating pane |
| `-n, --name <NAME>` | Pane name |
| `-c, --cwd <CWD>` | Working directory |
| `-i, --in-place` | Replace current pane |
| `-s, --start-suspended` | Start suspended |
| `--stacked` | Stacked mode |
| `-x <X>` | X position (int or percent) |
| `-y <Y>` | Y position (int or percent) |
| `--width <W>` | Width (int or percent) |
| `--height <H>` | Height (int or percent) |
| `--close-on-exit` | Close when command exits |
| `--near-current-pane` | Open near current pane |
| `-b, --blocking` | Block until pane closed |
| `--block-until-exit` | Block until command exits |
| `-p, --plugin <PLUGIN>` | Load plugin |

Returns: pane ID (e.g., `terminal_5`).

Shortcut: `zellij run [OPTIONS] -- <COMMAND>` (same options).

### edit

```
zellij action edit [OPTIONS] <FILE>
```

Opens file in `$EDITOR` in a new pane.

## Writing to Panes

### write-chars

```
zellij action write-chars [-p <PANE_ID>] <CHARS>
```

Write a string to a pane's terminal input. The text is sent as if typed.

### write

```
zellij action write [-p <PANE_ID>] [BYTES]...
```

Write raw bytes (space-separated integers). Example: `zellij action write 102 111 111` sends "foo".

### send-keys

```
zellij action send-keys [-p <PANE_ID>] <KEYS>...
```

Send key events. Examples: `"Ctrl c"`, `"Enter"`, `"Alt Shift b"`, `"F1"`.

### paste

```
zellij action paste [-p <PANE_ID>] <CHARS>
```

Paste text using bracketed paste mode (programs like shells treat it as pasted input, not commands).

## Reading Pane Output

### dump-screen

```
zellij action dump-screen [OPTIONS]
```

| Option | Description |
|---|---|
| `-p, --pane-id <PANE_ID>` | Target pane |
| `--path <PATH>` | Output file (omit for stdout) |
| `-f, --full` | Include full scrollback |
| `-a, --ansi` | Preserve ANSI escape codes |

### dump-layout

```
zellij action dump-layout
```

Outputs current layout configuration to stdout.

## Listing & Querying

### list-panes

```
zellij action list-panes [OPTIONS]
```

| Option | Description |
|---|---|
| `-j, --json` | JSON output |
| `-a, --all` | All fields |
| `-t, --tab` | Include tab info |
| `-s, --state` | Include state (focused, floating, exited) |
| `-c, --command` | Include running command |
| `-g, --geometry` | Include position/size |

### list-tabs

```
zellij action list-tabs [OPTIONS]
```

| Option | Description |
|---|---|
| `-j, --json` | JSON output |
| `-a, --all` | All fields |
| `-s, --state` | Include state (active, fullscreen, sync) |
| `-p, --panes` | Include pane counts |
| `-l, --layout` | Include layout info |
| `-d, --dimensions` | Include dimensions |

### query-tab-names

```
zellij action query-tab-names
```

### list-sessions

```
zellij list-sessions
```

Note: this is a top-level subcommand, not under `action`.

### list-clients

```
zellij action list-clients
```

## Tab Navigation

| Command | Description |
|---|---|
| `go-to-tab <INDEX>` | Jump to tab by index (1-based) |
| `go-to-tab-by-id <TAB_ID>` | Jump by stable ID |
| `go-to-tab-name <NAME> [--create]` | Jump by name, optionally create |
| `go-to-next-tab` | Next tab |
| `go-to-previous-tab` | Previous tab |
| `rename-tab <NAME>` | Rename focused tab |
| `rename-tab-by-id <TAB_ID> <NAME>` | Rename by ID |
| `move-tab [right\|left]` | Reorder tab |
| `close-tab` | Close focused tab |
| `close-tab-by-id <TAB_ID>` | Close by ID |

## Pane Management

| Command | Description |
|---|---|
| `close-pane` | Close focused pane |
| `rename-pane <NAME>` | Rename focused pane |
| `move-pane [right\|left\|up\|down]` | Move pane |
| `move-focus [right\|left\|up\|down]` | Focus direction |
| `focus-next-pane` | Focus next |
| `focus-previous-pane` | Focus previous |
| `toggle-floating-panes` | Toggle floating panes |
| `toggle-fullscreen` | Toggle fullscreen |
| `toggle-pane-embed-or-floating` | Float/embed toggle |
| `toggle-active-sync-tab` | Sync input to all panes |
| `resize [increase\|decrease] [left\|down\|up\|right]` | Resize pane |

## Session Management

| Command | Description |
|---|---|
| `zellij attach <NAME>` | Attach to session |
| `zellij kill-session <NAME>` | Kill session |
| `zellij kill-all-sessions` | Kill all |
| `zellij delete-session <NAME>` | Delete session |
| `zellij action detach` | Detach current |
| `zellij action rename-session <NAME>` | Rename |
| `zellij action switch-session <NAME>` | Switch session |
| `zellij action save-session` | Save state to disk |

## Scrolling

All accept `-p, --pane-id`:

| Command | Description |
|---|---|
| `scroll-up` / `scroll-down` | Single line |
| `page-scroll-up` / `page-scroll-down` | Full page |
| `half-page-scroll-up` / `half-page-scroll-down` | Half page |
| `scroll-to-top` / `scroll-to-bottom` | Jump to extremes |

## Other

| Command | Description |
|---|---|
| `switch-mode <MODE>` | locked, pane, tab, resize, move, search, session, tmux |
| `set-pane-color [fg\|bg] <COLOR>` | Set pane color (hex or rgb) |
| `clear` | Clear pane buffers |
| `pipe` | Send data to plugins |
