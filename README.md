# claude-plugins

my Claude Code plugins.

## インストール

このリポジトリは Claude Code のマーケットプレイスです。プラグイン単位でインストールします。

```
/plugin install agent-skills --marketplace yamitzky/claude-plugins
```

Claude Code 2.1.275 より前のバージョンでは、マーケットプレイスを追加してからインストールします。

```
/plugin marketplace add yamitzky/claude-plugins
/plugin install agent-skills@yamitzky-claude-plugins
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
| [`cmux`](plugins/agent-skills/skills/cmux/) | cmux を CLI で操作する skill。タブ（surface）/ペイン/ワークスペースの作成・操作、別ターミナルへのコマンド送信、出力読み取り、ブラウザ表示など。 |
| [`zellij`](plugins/agent-skills/skills/zellij/) | Zellij を CLI で操作する skill。タブ/ペインの作成・管理、ペインへのコマンド・キー送信、画面ダンプの読み取りなど。 |

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
