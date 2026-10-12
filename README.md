# agent-skills

my agent skills.

## インストール

Claude Code のプラグインとして配布しています。

```
/plugin install agent-skills --marketplace yamitzky/agent-skills
```

Claude Code 2.1.275 より前のバージョンでは、マーケットプレイスを追加してからインストールします。

```
/plugin marketplace add yamitzky/agent-skills
/plugin install agent-skills@yamitzky-agent-skills
```

`skills/` 配下の構成は Agent Skills 形式のままなので、Claude Code 以外のエージェントには従来どおり `npx skills add` でも入れられます。

```bash
npx skills add yamitzky/agent-skills
```

## skill一覧

| skill | 概要 |
|-------|------|
| [`deep-explain`](skills/deep-explain/) | 「その応答だけ読めばわかる」「ルー語/造語禁止」の原則に従って説明し直させる skill。差分だけの説明やジャーゴンまみれの要約を禁止する。 |
| [`cmux`](skills/cmux/) | cmux を CLI で操作する skill。タブ（surface）/ペイン/ワークスペースの作成・操作、別ターミナルへのコマンド送信、出力読み取り、ブラウザ表示など。 |
| [`zellij`](skills/zellij/) | Zellij を CLI で操作する skill。タブ/ペインの作成・管理、ペインへのコマンド・キー送信、画面ダンプの読み取りなど。 |

## skill の追加方法

各 skill は `skills/<name>/` ディレクトリに置き、最低限 `SKILL.md`（frontmatter に `name` と `description`）を含めます。プラグインは `skills/` 配下を自動で読み込むので、マニフェストの編集は不要です。

```
.claude-plugin/
├── plugin.json        # プラグインのマニフェスト
└── marketplace.json   # このリポジトリ自身をマーケットプレイスとして公開する
skills/
└── <name>/
    └── SKILL.md
```
