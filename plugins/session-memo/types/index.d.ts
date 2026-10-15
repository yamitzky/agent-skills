// メモの本文。改行を含むふつうのテキスト
export type MemoText = string

// メモ欄(Client)の手元の状態。カーソルは行と列、top は表示している先頭の行
export type EditorState = { lines: string[]; row: number; col: number; top: number }

declare module 'claude-code' {
  interface PluginState {
    'session-memo': { text: MemoText }
  }
}
