// jsonl の文字列をユーザー発言ごとのターンに分ける。mod 側($.fs で読んだ文字列)でも使い回す。

export type Turn = {
  index: number
  uuid: string
  timestamp: string
  prompt: string
  steps: string[]
  // 切らずに残した Claude の最後の発言。recap に全文で渡す
  lastSaid: string
}

type Block = { type: string; text?: string; name?: string; input?: Record<string, unknown> }

// 省いた箇所は Haiku が「回答が途中で切れた」と読まないよう、記録側で省いたと明記する
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…(記録係が省略)' : s)

const summarizeToolUse = (b: Block): string => {
  const i = b.input ?? {}
  const pick = (i.description ?? i.file_path ?? i.command ?? i.query ?? i.skill ?? i.action ?? '') as unknown
  return `[${b.name}] ${clip(String(pick).replace(/\s+/g, ' '), 120)}`
}

// ユーザーが打った発言だけを区切りにする。ツール結果・メタ行・タスク通知・compact の要約は区切りにしない。
// Claude の作業中にユーザーが送った発言は、user 行ではなく queued_command の添付として残る。
// タスク通知など人以外が積んだものも同じ形で来るので、origin が human のものだけを拾う
const queuedPromptOf = (d: any): unknown => {
  const a = d.attachment
  if (d.type !== 'attachment' || a?.type !== 'queued_command' || a.origin?.kind !== 'human') return undefined
  return a.prompt
}

const promptOf = (d: any): string | undefined => {
  const queued = queuedPromptOf(d)
  if (queued === undefined && (d.type !== 'user' || d.isMeta || d.isCompactSummary)) return undefined
  const c = queued ?? d.message?.content
  const text =
    typeof c === 'string'
      ? c
      : Array.isArray(c) && c.every((b: Block) => b.type === 'text' || b.type === 'image')
        ? c.filter((b: Block) => b.type === 'text').map((b: Block) => b.text).join('\n')
        : undefined
  if (text === undefined || text.trimStart().startsWith('<')) return undefined
  if (text.startsWith('[Request interrupted')) return undefined
  // 他のエージェントから届いたメッセージはユーザーの発言ではない
  if (text.startsWith('--- Orchestration Messages')) return undefined
  return text
}

const parseRows = (jsonl: string): any[] =>
  jsonl.split('\n').flatMap(line => {
    try {
      return line.trim() ? [JSON.parse(line)] : []
    } catch {
      return []
    }
  })

// rewind すると捨てた枝も jsonl に残る。最後の行から親をたどり、実際に通った枝だけを使う。
// compact の境界は parentUuid が null なので logicalParentUuid で越える。
const activeChain = (rows: any[]): Set<string> => {
  const byId = new Map(rows.filter(r => r.uuid).map(r => [r.uuid as string, r]))
  const chain = new Set<string>()
  let cur = [...rows].reverse().find(r => r.type === 'user' || r.type === 'assistant')
  while (cur && !chain.has(cur.uuid)) {
    chain.add(cur.uuid)
    cur = byId.get(cur.parentUuid ?? cur.logicalParentUuid)
  }
  return chain
}

export const parseTurns = (jsonl: string): Turn[] => {
  const rows = parseRows(jsonl)
  const chain = activeChain(rows)
  const turns: Turn[] = []
  for (const d of rows) {
    if (!chain.has(d.uuid)) continue
    const prompt = promptOf(d)
    if (prompt !== undefined) {
      // 中断して打ち直した発言は、Claude が何もしないうちに次の発言が来る。前のものは捨てて 1 ターンにまとめる
      if (turns.at(-1)?.steps.length === 0) turns.pop()
      turns.push({ index: turns.length, uuid: d.uuid, timestamp: d.timestamp, prompt, steps: [], lastSaid: '' })
      continue
    }
    const cur = turns[turns.length - 1]
    if (!cur || d.type !== 'assistant') continue
    for (const b of (d.message?.content ?? []) as Block[]) {
      if (b.type === 'text' && b.text?.trim()) {
        cur.steps.push(`[発言] ${clip(b.text.trim(), 2500)}`)
        cur.lastSaid = b.text.trim()
      }
      if (b.type === 'tool_use') cur.steps.push(summarizeToolUse(b))
    }
  }
  return turns
}

// Haiku に渡す 1 ターン分のテキスト。長いターンは頭と末尾を残して中を省く。
export const renderTurn = (t: Turn, budget = 12000): string => {
  const head = `## ユーザー\n${clip(t.prompt, 1500)}\n\n## アシスタント\n`
  let body = t.steps.join('\n')
  if (body.length > budget) body = body.slice(0, budget / 2) + '\n…(記録係が中略)…\n' + body.slice(-budget / 2)
  return head + body
}
