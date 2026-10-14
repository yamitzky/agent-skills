# claude-plugins

my Claude Code plugins.

## インストール

このリポジトリは Claude Code のマーケットプレイスです。プラグイン単位でインストールします。

```
/plugin install agent-skills --marketplace yamitzky/claude-plugins
/plugin install terminal-tools --marketplace yamitzky/claude-plugins
/plugin install session-recap --marketplace yamitzky/claude-plugins
```

Claude Code 2.1.275 より前のバージョンでは、マーケットプレイスを追加してからインストールします。

```
/plugin marketplace add yamitzky/claude-plugins
/plugin install agent-skills@yamitzky-claude-plugins
/plugin install terminal-tools@yamitzky-claude-plugins
/plugin install session-recap@yamitzky-claude-plugins
```

skill は Agent Skills 形式のままなので、Claude Code 以外のエージェントには `npx skills add` でも入れられます。

```bash
npx skills add yamitzky/claude-plugins
```

## プラグイン一覧

### agent-skills

| skill | 概要 |
|-------|------|
| [`deep-explain`](plugins/agent-skills/skills/deep-explain/) | 「その応答だけ読めばわかる」「ルー語/造語禁止」の原則に従って説明し直させる skill。差分だけの説明やジャーゴンまみれの要約を禁止する。 |

### terminal-tools

| skill | 概要 |
|-------|------|
| [`cmux`](plugins/terminal-tools/skills/cmux/) | cmux を CLI で操作する skill。タブ（surface）/ペイン/ワークスペースの作成・操作、別ターミナルへのコマンド送信、出力読み取り、ブラウザ表示など。 |
| [`zellij`](plugins/terminal-tools/skills/zellij/) | Zellij を CLI で操作する skill。タブ/ペインの作成・管理、ペインへのコマンド・キー送信、画面ダンプの読み取りなど。 |

### session-recap

`/session-recap` でパネルを開く mod（Claude Code の function hooks）。パネルが出ているあいだだけ、Haiku がターンごとに会話を要約していく。

| タブ | 中身 |
|------|------|
| 流れ | ユーザーの発言 1 回ごとの要約。行頭の絵文字で発言の種類を示し、押すと元の発言と Claude の返答が開く |
| recap | いま何をしていて、何が決まっていて、次に何をするかのメモ。ターンごとに Haiku が書き直す |
| 俯瞰 | ゴールまでに何が残っていて、次に何をすると近づくかの見立て。ボタンを押したときだけ Opus が書く |

記録は `~/.claude/session-recap/<セッション ID>/` に保存する。中で `node` が `.ts` を直接実行するので、Node 22.18 以降が要る。

## 追加方法

```
.claude-plugin/
└── marketplace.json        # プラグインの一覧
plugins/
└── <plugin>/
    ├── .claude-plugin/
    │   └── plugin.json     # プラグインのマニフェスト
    └── skills/
        └── <skill>/
            └── SKILL.md
```

- skill を足すとき: `plugins/<plugin>/skills/<skill>/SKILL.md` を置きます（frontmatter に `name` と `description`）。プラグインは `skills/` 配下を自動で読み込むので、マニフェストの編集は不要です。
- プラグインを足すとき: `plugins/<plugin>/.claude-plugin/plugin.json` を作り、`.claude-plugin/marketplace.json` の `plugins` に追記します。
