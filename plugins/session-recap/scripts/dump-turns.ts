// mod からは jsonl を読めない($.fs.read は 4 MiB まで)ので、host の node でターンに分けて渡す。
// 使い方: node dump-turns.ts <sessionId> <fromIndex>
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseTurns, renderTurn } from './turns.ts'

const [sessionId, from = '0'] = process.argv.slice(2)
const projects = join(homedir(), '.claude', 'projects')
const path = readdirSync(projects)
  .map(dir => join(projects, dir, `${sessionId}.jsonl`))
  .find(p => existsSync(p))
if (!path) {
  console.log(JSON.stringify({ total: 0, turns: [] }))
  process.exit(0)
}
const turns = parseTurns(readFileSync(path, 'utf8'))
// recap には直近ターンの発言と最後の返答を全文で渡す。ツール呼び出しは大きいので渡さない
const out = turns.slice(Number(from)).map(t => ({
  index: t.index,
  uuid: t.uuid,
  at: t.timestamp,
  text: renderTurn(t),
  prompt: t.prompt.trim(),
  answer: t.lastSaid,
}))
console.log(JSON.stringify({ total: turns.length, turns: out }))
