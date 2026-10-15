import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PATH = '/home/.claude/session-memo/sid.md'
const START = { cwd: '/w', surface: null, isInteractive: true }
const PANE_PROPS = { title: 'Memo', isFocused: true, bodyColumns: 80, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }
const PANE = { component: 'Pane' as const, props: PANE_PROPS, requestId: 'session-memo' }

// ファイルを記憶の中で差し替える
const world = (on: On) => {
  const files = new Map<string, string>()
  mock.env(on, { HOME: '/home' })
  on('session.id', () => ({ value: 'sid' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  return files
}

const type = async (ui: { key: (e: { key: string; in?: string }) => Promise<void> }, keys: string[]) => {
  for (const key of keys) await ui.key({ key, in: 'editor' })
}

test('複数行で書けて、打つたびにファイルへ残る', async ($, on) => {
  const files = world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ plugin: 'session-memo', surface: 'terminal', ...PANE })
  await type(ui, ['あ', 'い', 'return', 'う'])
  expect(files.get(PATH)).toBe('あい\nう\n')

  // 上の行へ移ると列はそのまま(あ と い の間)。そこへ入れて、下の行頭で Backspace して行をつなげる
  await type(ui, ['up', 'X', 'down', 'home', 'backspace'])
  expect(files.get(PATH)).toBe('あXいう\n')
  await ui.unmount()

  // desktop でも同じメモ欄で、続きから書ける
  const desk = await $.ui.mount({ plugin: 'session-memo', surface: 'desktop', ...PANE })
  await type(desk, ['!'])
  expect(files.get(PATH)).toBe('あXいう!\n')
  await desk.unmount()
})

test('貼り付けのように複数行がまとめて来ても、行に分けて入れる', async ($, on) => {
  const files = world(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'session-memo', surface: 'terminal', ...PANE })
  await type(ui, ['一行目\n二行目', 'return', '三'])
  expect(files.get(PATH)).toBe('一行目\n二行目\n三\n')
  await ui.unmount()
})

test('始まったときに前のメモを読み込み、その末尾から書き足せる', async ($, on) => {
  const files = world(on)
  files.set(PATH, '前に書いたこと\n')
  await $.session.start(START)

  const ui = await $.ui.mount({ plugin: 'session-memo', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /前に書いたこと/, in: 'editor' })).toBeDefined()
  await type(ui, ['。'])
  expect(files.get(PATH)).toBe('前に書いたこと。\n')
  await ui.unmount()
})

test('メモ欄のない mobile では、本文を読むだけにする', async ($, on) => {
  const files = world(on)
  files.set(PATH, '読むだけ\n')
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: 'session-memo', surface: 'mobile', ...PANE })
  expect(await ui.find({ type: 'Text', text: '読むだけ' })).toBeDefined()
  await ui.unmount()
})
