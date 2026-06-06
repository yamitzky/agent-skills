# agent-skills

my agent skills.

## インストール

```bash
# Install all skills
npx skills add yamitzky/agent-skills

# Install a specific skill
npx skills add https://github.com/yamitzky/agent-skills/tree/main/skills/deep-explain
```

## skill一覧

| skill | 概要 |
|-------|------|
| [`deep-explain`](skills/deep-explain/) | 「その応答だけ読めばわかる」「ルー語/造語禁止」の原則に従って説明し直させる skill。差分だけの説明やジャーゴンまみれの要約を禁止する。 |
| [`cmux`](skills/cmux/) | cmux を CLI で操作する skill。タブ（surface）/ペイン/ワークスペースの作成・操作、別ターミナルへのコマンド送信、出力読み取り、ブラウザ表示など。 |
| [`zellij`](skills/zellij/) | Zellij を CLI で操作する skill。タブ/ペインの作成・管理、ペインへのコマンド・キー送信、画面ダンプの読み取りなど。 |

## skill の追加方法

各 skill は `skills/<name>/` ディレクトリに置き、最低限 `SKILL.md`（frontmatter に `name` と `description`）を含めます。

```
skills/
└── <name>/
    └── SKILL.md
```
