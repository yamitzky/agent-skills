import type { ClientModule } from 'claude-code'

import type { EditorState } from '../types'

// キーの名前で来る特別なキー。これ以外の文字列は打った文字としてそのまま入れる(IME の確定や貼り付けは複数文字で来る)
const SPECIAL = new Set(['up', 'down', 'left', 'right', 'return', 'tab', 'backspace', 'delete', 'home', 'end', 'pageup', 'pagedown', 'escape'])

const fromText = (text: string): EditorState => {
  const lines = text.split('\n')
  // 開いたときは末尾から書き足せるように、カーソルを最後に置く
  return { lines, row: lines.length - 1, col: lines.at(-1)!.length, top: 0 }
}

const clampCol = (s: EditorState, col: number) => Math.max(0, Math.min(col, s.lines[s.row]!.length))

const insert = (s: EditorState, typed: string): EditorState => {
  const line = s.lines[s.row]!
  const pieces = (line.slice(0, s.col) + typed + line.slice(s.col)).split('\n')
  const lastLen = pieces.at(-1)!.length - (line.length - s.col)
  const lines = [...s.lines.slice(0, s.row), ...pieces, ...s.lines.slice(s.row + 1)]
  return { ...s, lines, row: s.row + pieces.length - 1, col: pieces.length === 1 ? s.col + typed.length : lastLen }
}

const backspace = (s: EditorState): EditorState => {
  if (s.col > 0) {
    const line = s.lines[s.row]!
    const lines = s.lines.with(s.row, line.slice(0, s.col - 1) + line.slice(s.col))
    return { ...s, lines, col: s.col - 1 }
  }
  if (s.row === 0) return s
  const prev = s.lines[s.row - 1]!
  const lines = [...s.lines.slice(0, s.row - 1), prev + s.lines[s.row]!, ...s.lines.slice(s.row + 1)]
  return { ...s, lines, row: s.row - 1, col: prev.length }
}

const del = (s: EditorState): EditorState => {
  const line = s.lines[s.row]!
  if (s.col < line.length) return { ...s, lines: s.lines.with(s.row, line.slice(0, s.col) + line.slice(s.col + 1)) }
  if (s.row === s.lines.length - 1) return s
  const lines = [...s.lines.slice(0, s.row), line + s.lines[s.row + 1]!, ...s.lines.slice(s.row + 2)]
  return { ...s, lines }
}

const moveRow = (s: EditorState, by: number): EditorState => {
  const row = Math.max(0, Math.min(s.lines.length - 1, s.row + by))
  return clampState({ ...s, row })
}
const clampState = (s: EditorState): EditorState => ({ ...s, col: clampCol(s, s.col) })

export const apply = (s: EditorState, key: string, ctrl: boolean, page: number): EditorState => {
  if (ctrl) {
    // ターミナルでおなじみの行頭・行末・行末まで削除だけ受ける
    if (key === 'a') return { ...s, col: 0 }
    if (key === 'e') return { ...s, col: s.lines[s.row]!.length }
    if (key === 'k') return { ...s, lines: s.lines.with(s.row, s.lines[s.row]!.slice(0, s.col)) }
    return s
  }
  switch (key) {
    case 'return':
      return insert(s, '\n')
    case 'tab':
      return insert(s, '  ')
    case 'backspace':
      return backspace(s)
    case 'delete':
      return del(s)
    case 'left':
      if (s.col > 0) return { ...s, col: s.col - 1 }
      return s.row > 0 ? { ...s, row: s.row - 1, col: s.lines[s.row - 1]!.length } : s
    case 'right':
      if (s.col < s.lines[s.row]!.length) return { ...s, col: s.col + 1 }
      return s.row < s.lines.length - 1 ? { ...s, row: s.row + 1, col: 0 } : s
    case 'up':
      return moveRow(s, -1)
    case 'down':
      return moveRow(s, 1)
    case 'pageup':
      return moveRow(s, -page)
    case 'pagedown':
      return moveRow(s, page)
    case 'home':
      return { ...s, col: 0 }
    case 'end':
      return { ...s, col: s.lines[s.row]!.length }
  }
  return SPECIAL.has(key) ? s : insert(s, key.replace(/\r\n?/g, '\n'))
}

// カーソルの行が見える範囲に入るように先頭の行をずらす。行の折り返しは数えていないので、長い行が続くと少しずれる
const scrolled = (s: EditorState, rows: number): EditorState => {
  if (s.row < s.top) return { ...s, top: s.row }
  if (s.row >= s.top + rows) return { ...s, top: s.row - rows + 1 }
  return s
}

const Editor: ClientModule<{ text: string }, EditorState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const rows = Math.max(1, surface.rows || 10)
  if (surface.state === undefined) {
    surface.setState(scrolled(fromText(props.text), rows))
    surface.onKey(event => {
      const now = surface.state ?? fromText(props.text)
      const next = scrolled(apply(now, event.key, event.ctrl === true, rows), rows)
      if (next === now) return
      surface.setState(next)
      if (next.lines !== now.lines) surface.post({ text: next.lines.join('\n') })
    })
  }
  const s = surface.state ?? scrolled(fromText(props.text), rows)

  return (
    <Box flexDirection="column">
      {s.lines.slice(s.top, s.top + rows).map((line, i) => {
        const row = s.top + i
        if (row !== s.row) return <Text key={`l-${row}`}>{line === '' ? ' ' : line}</Text>
        return (
          <Text key={`l-${row}`}>
            {line.slice(0, s.col)}
            <Text inverse>{line[s.col] ?? ' '}</Text>
            {line.slice(s.col + 1)}
          </Text>
        )
      })}
    </Box>
  )
}

export default Editor
