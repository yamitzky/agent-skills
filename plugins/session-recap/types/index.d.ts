// 流れの 1 件 = ユーザー発言 1 回。kinds / rel / ref は recap 側で問いや決定を拾うための印
export type FlowEntry = {
  turn: number
  uuid: string
  at: string
  kinds: string[]
  rel: string
  ref: number[]
  marks: string[]
  user: string
  claude: string
  // 開いたときに見せる元の発言と最後の返答の抜粋。抜粋を持つ前に書いた記録にはない
  prompt?: string
  answer?: string
}

export type RecapView = {
  flow: FlowEntry[]
  recap: string
  overview: string
  status: string
}

export type RecapTab = 'flow' | 'recap' | 'overview'

declare module 'claude-code' {
  interface PluginState {
    'session-recap': { view: RecapView; tab: RecapTab; opened: number }
  }
}
