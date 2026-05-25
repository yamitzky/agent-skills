# agent-skills

yamitzky の公開 agent skill 集です。[skills](https://github.com/vercel-labs/skills) エコシステムに対応しており、`npx skills add` で各種 AI コーディングエージェント（Claude Code / Codex / Cursor など）に簡単にインストールできます。

## インストール

```bash
# リポジトリ内のすべての skill をインストール
npx skills add yamitzky/agent-skills

# 特定の skill だけインストール
npx skills add https://github.com/yamitzky/agent-skills/tree/main/skills/deep-explain
```

インストール先のエージェントは対話的に選択できます。

## 収録 skill

| skill | 概要 |
|-------|------|
| [`deep-explain`](skills/deep-explain/) | `/deep-explain` で、対象を「その応答だけで完結・前提知識ゼロ・ルー語/専門用語の禁止」の3原則に従って説明し直させる skill。差分だけの説明やジャーゴンまみれの要約への逃げを禁止する。 |

## skill の追加方法

各 skill は `skills/<name>/` ディレクトリに置き、最低限 `SKILL.md`（frontmatter に `name` と `description`）を含めます。

```
skills/
└── <name>/
    └── SKILL.md
```
