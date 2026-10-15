import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { MemoText } from '../types'

const PANE = 'session-memo'
const memo = atom({ plugin: 'session-memo', key: 'text' } as const, '' as MemoText)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'memo', description: 'このセッションのメモのパネルを開く' })
    const started = await next(e)
    const path = `${await $.env.get('HOME')}/.claude/session-memo/${await $.session.id()}.md`
    const saved = await $.fs.read(path).catch(() => '')
    await update($, memo, () => saved.replace(/\n$/, ''))
    return started
  })

  on('command.run', { command: 'memo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Memo' })
    return { text: 'メモを開きました。' }
  })

  // メモ欄は打つたびに本文を送ってくる。そのたびにファイルへ書き、閉じても読み込み直しても残るようにする
  on('ui.message', async ($, e, next) => {
    if (e.requestId !== PANE || e.element !== 'editor') return next(e)
    const text = String((e.data as { text?: unknown } | null)?.text ?? '')
    await update($, memo, () => text)
    await $.fs.write(`${await $.env.get('HOME')}/.claude/session-memo/${await $.session.id()}.md`, text + '\n')
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const text = await read($, memo)
    // メモ欄(Client)は terminal と desktop にしかない。mobile では Client を置いても空の枠になるので、読むだけにする
    const Client = 'Client' in elements && (e.surface === 'terminal' || e.surface === 'desktop') ? elements.Client : undefined
    if (!Client) {
      return <Text>{text === '' ? '(まだメモがありません)' : text}</Text>
    }
    const height = Math.max(3, (e.viewport?.rows ?? 20) - 4)
    return (
      <Box flexDirection="column">
        <Text dimColor>クリックして書く。Esc で抜ける</Text>
        <Client key="editor" module="./editor.tsx" props={{ text }} height={height} />
      </Box>
    )
  })
}
