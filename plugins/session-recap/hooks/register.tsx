import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { FlowEntry, RecapTab, RecapView } from '../types'
import { excerpt, FLOW_SYSTEM, stripUrls, unfence, flowPrompt, isTooLong, OVERVIEW_SYSTEM, overviewPrompt, parseFlowRecord, RECAP_SYSTEM, recapPrompt } from './prompts'

const PANE = 'session-recap'
const EMPTY: RecapView = { flow: [], recap: '', overview: '', status: '' }
const view = atom({ plugin: 'session-recap', key: 'view' } as const, EMPTY)
const tab = atom({ plugin: 'session-recap', key: 'tab' } as const, 'recap' as RecapTab)
// 流れで開いている件の番号。-1 はどれも開いていない
const opened = atom({ plugin: 'session-recap', key: 'opened' } as const, -1)

type DumpedTurn = { index: number; uuid: string; at: string; text: string; prompt: string; answer: string }

// recap に全文で渡す直近ターンの数。それより前は流れの要約と前回の recap に任せる
const RECAP_CONTEXT_TURNS = 5

// 種類を 1 文字で見分けるための絵文字。端末で幅が崩れやすい異体字セレクタ付きの絵文字(🛠️ ⚖️ ♻️)は避けている
const KIND_EMOJI: Record<string, string> = {
  依頼: '🔧',
  事実の質問: '❓',
  理解の確認: '🤔',
  判断を求める: '🧭',
  案の提示: '💡',
  報告: '📢',
  情報提供: '📎',
  分からない: '😵',
  '反論・訂正': '🙅',
  ルール: '📏',
  条件: '📌',
  決定: '✅',
  了解: '👌',
  状況確認: '👀',
  話題の切り替え: '🔀',
}
const REL_EMOJI: Record<string, string> = { 聞き直し: '🔁', やり直し: '🔄', 撤回: '↩' }
const emojiOf = (kind: string) => KIND_EMOJI[kind] ?? '・'

export const register: Register = on => {
  // $ は hook の中でしか使えない(変数に入れて持ち回せない)。
  // そのため LLM を呼ぶ処理はすべて session.start の中に置き、ほかの hook はフラグを立てるだけにする。
  let wantsRefresh = false
  let wantsReflect = false

  on('session.start', async ($, e, next) => {
    let isRunning = false

    const storeDir = async () => `${await $.env.get('HOME')}/.claude/session-recap/${await $.session.id()}`
    const readOr = (path: string) => $.fs.read(path).catch(() => '')

    const load = async (): Promise<RecapView> => {
      const dir = await storeDir()
      const parsed = (await readOr(`${dir}/flow.jsonl`))
        .split('\n')
        .filter(Boolean)
        .map((l: string) => JSON.parse(l) as FlowEntry)
      // 種類の印がない古い形式の記録は混ぜずに、最初から作り直す
      const flow = parsed.every(f => Array.isArray(f.kinds)) ? parsed : []
      return { flow, recap: await readOr(`${dir}/recap.md`), overview: await readOr(`${dir}/overview.md`), status: '' }
    }

    const setStatus = (status: string) => update($, view, (v: RecapView) => ({ ...v, status }))

    const ask = async (model: string, system: string, prompt: string) => {
      const r = await $.model.complete({ model, system, prompt, timeoutMs: 120_000 })
      if (!r.isAnswered) throw new Error(`${model}: ${r.reason}`)
      return r.text.trim()
    }

    // mod からは jsonl を読めない($.fs.read は 4 MiB まで)ので、host の node でターンに分ける
    const dumpTurns = async (from: number) => {
      const script = `${$.plugin.root}/scripts/dump-turns.ts`
      const { exitCode, stdout, stderr } = await $.process.run(['node', script, await $.session.id(), String(from)], {
        timeoutMs: 60_000,
      })
      if (exitCode !== 0) throw new Error(`dump-turns: ${stderr.slice(0, 300)}`)
      return JSON.parse(stdout) as { total: number; turns: DumpedTurn[] }
    }

    // 流れは追記だけ。既に書いた行は書き換えない。
    const appendFlow = async () => {
      const dir = await storeDir()
      const stored = await load()
      const { turns } = await dumpTurns(Math.max(0, stored.flow.length - RECAP_CONTEXT_TURNS))
      const fresh = turns.filter(t => t.index >= stored.flow.length)
      if (fresh.length === 0) return

      const flow = [...stored.flow]
      const last = fresh[fresh.length - 1]!.index + 1
      for (const t of fresh) {
        await setStatus(`流れを追記中 ${t.index + 1}/${last}`)
        const prompt = flowPrompt(flow.slice(-8), t.index, t.text)
        // Haiku はたまに JSON 以外や長すぎる要約を返すので 1 回だけ聞き直す
        const first = await ask('haiku', FLOW_SYSTEM, prompt)
          .then(parseFlowRecord)
          .catch(() => undefined)
        const record = first && !isTooLong(first) ? first : parseFlowRecord(await ask('haiku', FLOW_SYSTEM, prompt))
        flow.push({ turn: t.index, uuid: t.uuid, at: t.at, ...record, prompt: excerpt(t.prompt, 600), answer: excerpt(t.answer, 800) })
        await $.fs.write(`${dir}/flow.jsonl`, flow.map(f => JSON.stringify(f)).join('\n') + '\n')
        await update($, view, (v: RecapView) => ({ ...v, flow }))
      }

      await setStatus('recap を更新中')
      const recent = turns.slice(-RECAP_CONTEXT_TURNS).map(t => ({ index: t.index, prompt: t.prompt, answer: t.answer }))
      const recap = stripUrls(unfence(await ask('haiku', RECAP_SYSTEM, recapPrompt(stored.recap, flow, recent))))
      await $.fs.write(`${dir}/recap.md`, recap)
      await update($, view, (v: RecapView) => ({ ...v, recap }))
    }

    // 俯瞰は Opus。ボタンを押したときだけ作る。入力は流れと recap だけで、生のログは渡さない。
    const reflect = async () => {
      const { flow, recap } = await read($, view)
      if (flow.length === 0) return
      await setStatus('俯瞰を書いています(Opus)')
      const overview = stripUrls(unfence(await ask('opus', OVERVIEW_SYSTEM, overviewPrompt(flow, recap))))
      await $.fs.write(`${await storeDir()}/overview.md`, overview)
      await update($, view, (v: RecapView) => ({ ...v, overview }))
      await update($, tab, () => 'overview' as RecapTab)
    }

    // 流れと recap は、パネルが画面に出ているときだけ作る。閉じているあいだは印を残しておき、
    // 次に開いたときにたまったターンへまとめて追いつく。誰も見ていないのに Haiku を呼ばないため
    const isPaneShown = async () => (await $.ui.panes()).some(p => p.id === PANE && p.isShown && p.isPlaced)

    const work = async () => {
      if (isRunning || !(wantsRefresh || wantsReflect)) return
      if (!(await isPaneShown())) return
      isRunning = true
      try {
        while (wantsRefresh) {
          wantsRefresh = false
          await appendFlow()
        }
        if (wantsReflect) {
          wantsReflect = false
          await reflect()
        }
        await setStatus('')
      } catch (error) {
        await setStatus(`失敗: ${String(error).slice(0, 200)}`)
      } finally {
        isRunning = false
      }
    }

    await $.command.register({ name: 'session-recap', description: '会話の流れ・recap・俯瞰のパネルを開く' })
    const started = await next(e)
    const stored = await load()
    await update($, view, () => stored)
    // mod が読み込み直されると「ターンが終わった」という印が消えるので、始まったときに一度追いつかせる。
    // 新しいターンがなければ dump-turns を 1 回走らせるだけで終わる
    wantsRefresh = true
    $.clock.every(1500, () => void work())
    return started
  })

  on('command.run', { command: 'session-recap' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Session recap' })
    wantsRefresh = true
    return { text: 'Session recap を開きました。' }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) wantsRefresh = true
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    // mobile には入力欄がないので、番号を入れての移動は出さない
    const Input = 'Input' in elements ? elements.Input : undefined
    const v = await read($, view)
    const current = await read($, tab)
    const openedTurn = await read($, opened)
    const room = Math.max(5, (e.viewport?.rows ?? 30) - 8)

    // 番号と主な種類の絵文字の列を固定幅にして、折り返した本文が左に回り込まないようにする。
    // ユーザーは通常色、Claude は薄くして強弱で分ける(赤とオレンジは端末で見分けにくかった)。
    // 行には主な種類だけを出し、2 つ目以降は開いたときに見せる。
    const noteOf = (f: FlowEntry) => [REL_EMOJI[f.rel] ?? '', f.marks.includes('不満') ? '💢' : ''].join('')
    // 開いている件があればその件を先頭近くに置いた範囲を、なければ末尾を出す
    const count = Math.max(2, Math.floor(room / 3))
    const at = v.flow.findIndex((f: FlowEntry) => f.turn === openedTurn)
    const start = at < 0 ? Math.max(0, v.flow.length - count) : Math.max(0, Math.min(at - 1, v.flow.length - count))
    const shown = v.flow.slice(start, start + count)
    const numberWidth = String(shown.at(-1)?.turn ?? 0).length + 2
    const jump = (n: number) => update($, opened, () => n)

    // 開いた枠は番号の列の下にずらさず、左端から出す。参照先の番号を押すとその件へ飛ぶ
    const detailOf = (f: FlowEntry) => (
      <Box key={`d-${f.turn}`} flexDirection="column" paddingX={1} borderStyle="single" borderDimColor>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Text dimColor>{`${f.kinds.map(k => `${emojiOf(k)} ${k}`).join('  ')} / ${f.rel}`}</Text>
          {f.ref.map(r => (
            <Button key={`jump-${f.turn}-${r}`} plain onPress={() => jump(r)}>{`→${r}`}</Button>
          ))}
          {f.marks.length > 0 && <Text dimColor>{`/ ${f.marks.join('・')}`}</Text>}
        </Box>
        <Text bold>[ユーザー]</Text>
        <Text>{f.prompt ?? '(抜粋なし)'}</Text>
        <Text bold>[Claude]</Text>
        <Text dimColor>{f.answer || '(抜粋なし)'}</Text>
      </Box>
    )
    // ユーザーの行を押すと、その件の元の発言と返答をその場で開く。もう一度押すと閉じる
    const flowRows = shown.map((f: FlowEntry) => (
      <Box key={`f-${f.turn}`} flexDirection="column" rowGap={1}>
        <Box flexDirection="row">
          <Box width={numberWidth} flexShrink={0}>
            <Text dimColor>{String(f.turn)}</Text>
          </Box>
          <Box width={3} flexShrink={0}>
            <Text>{emojiOf(f.kinds[0] ?? '')}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Button key={`open-${f.turn}`} plain onPress={() => update($, opened, (cur: number) => (cur === f.turn ? -1 : f.turn))}>
              {f.user}
              {noteOf(f) !== '' && <Text>{` ${noteOf(f)}`}</Text>}
            </Button>
            <Text dimColor>{f.claude}</Text>
          </Box>
        </Box>
        {openedTurn === f.turn && detailOf(f)}
      </Box>
    ))
    const flowNav = (
      <Box flexDirection="row" columnGap={1}>
        {Input && (
          <Input
            key="jump-to"
            placeholder="番号を入れて Enter で移動"
            onSubmit={(value: string) => {
              const n = Number(value.trim())
              if (v.flow.some((f: FlowEntry) => f.turn === n)) return jump(n)
            }}
          />
        )}
        {openedTurn >= 0 && <Button key="latest" label="最新へ" onPress={() => jump(-1)} />}
      </Box>
    )

    // Markdown 要素は端末で # や - をそのまま出したので、見出しと箇条書きだけ自前で描く。
    // 箇条書きは「・」の右に本文をそろえ、折り返しが左端に回り込まないようにする
    const plain = (line: string) => line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`/g, '')
    const memoOf = (text: string, keyPrefix: string) => (
      <Box flexDirection="column">
        {text.split('\n').map((line, i) => {
          const key = `${keyPrefix}-${i}`
          const heading = line.match(/^#+\s+(.*)/)
          const bullet = line.match(/^\s*[-*]\s+(.*)/)
          if (heading) {
            return (
              <Box key={key} marginTop={i === 0 ? 0 : 1}>
                <Text bold color="suggestion">{plain(heading[1]!)}</Text>
              </Box>
            )
          }
          if (bullet) {
            return (
              <Box key={key} flexDirection="row">
                <Box width={2} flexShrink={0}>
                  <Text dimColor>・</Text>
                </Box>
                <Box flexShrink={1}>
                  <Text>{plain(bullet[1]!)}</Text>
                </Box>
              </Box>
            )
          }
          return line.trim() === '' ? null : <Text key={key}>{plain(line)}</Text>
        })}
      </Box>
    )

    const body =
      current === 'recap'
        ? v.recap || '(まだ recap がありません)'
        : v.overview || '(「俯瞰を書く」を押すと、Opus が流れと recap を読んで書きます)'

    const tabButton = (id: RecapTab, label: string) => (
      <Button key={`tab-${id}`} variant={current === id ? 'primary' : 'secondary'} label={label} onPress={() => update($, tab, () => id)} />
    )

    return (
      <Box flexDirection="column">
        <Box>
          {tabButton('flow', `流れ (${v.flow.length})`)}
          {tabButton('recap', 'recap')}
          {tabButton('overview', '俯瞰')}
          <Button key="reflect" label="俯瞰を書く" onPress={() => { wantsReflect = true }} />
          <Button key="refresh" label="更新" onPress={() => { wantsRefresh = true }} />
        </Box>
        {v.status !== '' && <Text dimColor>{v.status}</Text>}
        {current !== 'flow' ? (
          memoOf(body, current)
        ) : flowRows.length === 0 ? (
          <Text dimColor>(まだ記録がありません)</Text>
        ) : (
          <Box flexDirection="column" rowGap={1}>
            {flowNav}
            {flowRows}
          </Box>
        )}
      </Box>
    )
  })
}
