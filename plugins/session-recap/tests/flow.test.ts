import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const DIR = '/home/.claude/session-recap/sid'
const START = { cwd: '/w', surface: null, isInteractive: true }

// jsonl・ファイル・モデルを記憶の中で差し替え、2 ターン分のセッションを用意する
const world = (on: On, turnCount: number, recapText?: string) => {
  const files = new Map<string, string>()
  const calls: { model: string; prompt: string }[] = []
  mock.env(on, { HOME: '/home' })
  // テストの engine には画面がないので、パネルの開閉だけを記憶の中で持つ
  let isPaneOpen = false
  on('ui.open', () => {
    isPaneOpen = true
    return { value: { isPlaced: true as const } }
  })
  on('ui.panes', () => ({
    value: isPaneOpen ? [{ id: 'session-recap', title: 'Session recap', isShown: true, isFocused: false, isPlaced: true }] : [],
  }))
  on('session.id', () => ({ value: 'sid' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('fs.read', ($, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', ($, e) => {
    const from = Number(e.argv[3])
    const turns = Array.from({ length: turnCount }, (_, i) => ({ index: i, uuid: `u${i}`, at: 't', text: `ターン${i}の本文`, prompt: `発言${i}`, answer: `返答${i}` }))
    return { value: { exitCode: 0, stdout: JSON.stringify({ total: turnCount, turns: turns.slice(from) }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('model.complete', ($, e) => {
    calls.push({ model: e.model, prompt: e.prompt })
    const text = e.system?.includes('"kinds"')
      ? JSON.stringify({ kinds: ['依頼'], rel: '続き', ref: [], marks: [], user: `頼んだ${calls.length}`, claude: `https://x.example やった${calls.length}` })
      : (recapText ?? `出力${calls.length}`)
    const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
    return { value: { isAnswered: true, text, usage } }
  })
  return { files, calls }
}

const PANE_PROPS = { title: 'Session recap', isFocused: true, bodyColumns: 80, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 30 }, view: {} }

// 流れと recap はパネルが出ているときだけ作るので、追記を見るテストは先にコマンドでパネルを開く
const openPane = ($: any) => $.command.run({ command: 'session-recap', args: '' })

const settle = async (clock: { advance: (ms: number) => Promise<void> }, done: () => boolean) => {
  for (let i = 0; i < 50 && !done(); i++) await clock.advance(1500)
}

test('ターンが終わるたびに未記録のターンだけを Haiku で 1 件ずつ追記する', async ($, on) => {
  const clock = mock.clock(on)
  const { files, calls } = world(on, 2)
  await $.session.start(START)
  await openPane($)

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await settle(clock, () => files.has(`${DIR}/recap.md`))

  const flow = files.get(`${DIR}/flow.jsonl`)!.trim().split('\n').map(l => JSON.parse(l))
  expect(flow.map(f => f.turn)).toEqual([0, 1])
  expect(calls.map(c => c.model)).toEqual(['haiku', 'haiku', 'haiku'])
  expect(flow[1]).toMatchObject({ kinds: ['依頼'], user: '頼んだ2', claude: 'やった2', prompt: '発言1', answer: '返答1' })
})

test('既に記録したターンは書き換えず、新しいターンだけ足す', async ($, on) => {
  const clock = mock.clock(on)
  const { files, calls } = world(on, 3)
  const existing = { turn: 0, uuid: 'u0', at: 't', kinds: ['事実の質問'], rel: '新規', ref: [], marks: [], user: '既存', claude: '既存' }
  files.set(`${DIR}/flow.jsonl`, JSON.stringify(existing) + '\n')
  await $.session.start(START)
  await openPane($)

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await settle(clock, () => files.has(`${DIR}/recap.md`))

  const flow = files.get(`${DIR}/flow.jsonl`)!.trim().split('\n').map(l => JSON.parse(l))
  expect(flow.map(f => f.user)).toEqual(['既存', '頼んだ1', '頼んだ2'])
  expect(calls.length).toBe(3)
})

test('サブエージェントのターン終了では追記しない', async ($, on) => {
  const clock = mock.clock(on)
  const { files, calls } = world(on, 2)
  const done = (i: number) => ({ turn: i, uuid: `u${i}`, at: 't', kinds: ['依頼'], rel: '続き', ref: [], marks: [], user: `済${i}`, claude: `済${i}` })
  files.set(`${DIR}/flow.jsonl`, [done(0), done(1)].map(x => JSON.stringify(x)).join('\n') + '\n')
  await $.session.start(START)
  await openPane($)
  await clock.advance(1500 * 5)
  calls.length = 0

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', agentId: 'a1' })
  await clock.advance(1500 * 5)

  expect(calls.length).toBe(0)
})

test('古い 1 行形式の記録が残っていたら、最初のターンから作り直す', async ($, on) => {
  const clock = mock.clock(on)
  const { files } = world(on, 2)
  files.set(`${DIR}/flow.jsonl`, JSON.stringify({ turn: 0, uuid: 'u0', at: 't', line: '旧形式' }) + '\n')
  await $.session.start(START)
  await openPane($)

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await settle(clock, () => files.has(`${DIR}/recap.md`))

  const flow = files.get(`${DIR}/flow.jsonl`)!.trim().split('\n').map(l => JSON.parse(l))
  expect(flow.map(f => f.user)).toEqual(['頼んだ1', '頼んだ2'])
})

test('流れのタブでは、番号と種類の絵文字の右にユーザーと Claude の要約を強弱で分けて並べ、要るときだけ印を添える', async ($, on) => {
  mock.clock(on)
  const { files } = world(on, 0)
  const entry = { turn: 57, uuid: 'u57', at: 't', kinds: ['反論・訂正'], rel: 'やり直し', ref: [52], marks: ['不満'], user: '表の案には問題があると反論', claude: '問題ありと前言撤回', prompt: 'え、問題あるでしょ。', answer: 'おっしゃるとおりです。' }
  files.set(`${DIR}/flow.jsonl`, JSON.stringify(entry) + '\n')
  await $.session.start(START)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-recap', surface, component: 'Pane', props: PANE_PROPS, requestId: 'session-recap' })
    await ui.press({ key: 'tab-flow' })
    expect(await ui.find({ key: 'f-57' })).toMatchObject({ children: [{ children: [
        { props: { width: 4, flexShrink: 0 }, children: [{ children: ['57'] }] },
        { props: { width: 3, flexShrink: 0 }, children: [{ children: ['🙅'] }] },
        {
          children: [
            { type: 'Button', props: { key: 'open-57', plain: true }, children: ['表の案には問題があると反論', { children: [' 🔄💢'] }] },
            { props: { dimColor: true }, children: ['問題ありと前言撤回'] },
          ],
        },
      ] }] })
    expect(await ui.find({ type: 'Text', text: /反論・訂正/ })).toBeUndefined()

    // 押すと元の発言と返答が開き、もう一度押すと閉じる
    await ui.press({ key: 'open-57' })
    expect(await ui.find({ type: 'Text', text: '[ユーザー]' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'え、問題あるでしょ。' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '[Claude]' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'おっしゃるとおりです。' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '🙅 反論・訂正 / やり直し' })).toBeDefined()
    expect(await ui.find({ key: 'jump-57-52' })).toBeDefined()
    await ui.press({ key: 'open-57' })
    expect(await ui.find({ type: 'Text', text: 'え、問題あるでしょ。' })).toBeUndefined()
    await ui.unmount()
  }
})

test('参照先の番号を押すか番号を入れると、その件を開いて表示の範囲をそこへ移す', async ($, on) => {
  mock.clock(on)
  const { files } = world(on, 0)
  const entries = Array.from({ length: 30 }, (_, i) => ({ turn: i, uuid: `u${i}`, at: 't', kinds: ['依頼'], rel: '続き', ref: i === 29 ? [3] : [], marks: [], user: `頼んだ${i}`, claude: `やった${i}`, prompt: `発言${i}`, answer: `返答${i}` }))
  files.set(`${DIR}/flow.jsonl`, entries.map(x => JSON.stringify(x)).join('\n') + '\n')
  await $.session.start(START)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-recap', surface, component: 'Pane', props: PANE_PROPS, requestId: 'session-recap' })
    await ui.press({ key: 'tab-flow' })
    // 最初は末尾だけが見えていて、3 は範囲の外
    expect(await ui.find({ key: 'f-3' })).toBeUndefined()

    await ui.press({ key: 'open-29' })
    await ui.press({ key: 'jump-29-3' })
    expect(await ui.find({ type: 'Text', text: '発言3' })).toBeDefined()

    await ui.press({ key: 'latest' })
    expect(await ui.find({ key: 'f-3' })).toBeUndefined()

    await ui.input({ key: 'jump-to', text: '12' })
    expect(await ui.find({ type: 'Text', text: '発言12' })).toBeDefined()
    await ui.press({ key: 'latest' })
    await ui.unmount()
  }
})

test('recap のタブでは、見出しを記号なしの太字で、箇条書きを「・」の右にそろえて描く', async ($, on) => {
  mock.clock(on)
  const { files } = world(on, 0)
  files.set(`${DIR}/recap.md`, '# このセッションのメモ\n\n## いま\n- **流れ**の表示を直している\n')
  await $.session.start(START)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'session-recap', surface, component: 'Pane', props: PANE_PROPS, requestId: 'session-recap' })
    await ui.press({ key: 'tab-recap' })
    expect(await ui.find({ type: 'Text', text: 'いま' })).toMatchObject({ props: { bold: true } })
    expect(await ui.find({ type: 'Text', text: '流れの表示を直している' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#|\*\*/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('読み込み直された直後は、ターンの終わりを待たずに未記録のターンへ追いつく', async ($, on) => {
  const clock = mock.clock(on)
  const { files } = world(on, 2)
  await $.session.start(START)
  await openPane($)
  await settle(clock, () => files.has(`${DIR}/recap.md`))

  const flow = files.get(`${DIR}/flow.jsonl`)!.trim().split('\n').map(l => JSON.parse(l))
  expect(flow.map(f => f.turn)).toEqual([0, 1])
})

test('モデルが ```markdown で囲んで返した recap は、囲みを外して保存する', async ($, on) => {
  const clock = mock.clock(on)
  const { files } = world(on, 1, '```markdown\n## いま\n- 作業中\n```')
  await $.session.start(START)
  await openPane($)
  await settle(clock, () => files.has(`${DIR}/recap.md`))

  expect(files.get(`${DIR}/recap.md`)).toBe('## いま\n- 作業中')
})

test('パネルが閉じているあいだは Haiku を呼ばず、開いたときにたまったターンへまとめて追いつく', async ($, on) => {
  const clock = mock.clock(on)
  const { files, calls } = world(on, 3)
  await $.session.start(START)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(1500 * 5)
  expect(calls.length).toBe(0)

  await openPane($)
  await settle(clock, () => files.has(`${DIR}/recap.md`))
  const flow = files.get(`${DIR}/flow.jsonl`)!.trim().split('\n').map(l => JSON.parse(l))
  expect(flow.map(f => f.turn)).toEqual([0, 1, 2])
  // 3 ターン分の流れと、最後に 1 回だけ recap
  expect(calls.map(c => c.model)).toEqual(['haiku', 'haiku', 'haiku', 'haiku'])
})

