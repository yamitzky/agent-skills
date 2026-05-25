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
| [`deep-explain`](skills/deep-explain/) | `/deep-explain` で、対象を「その応答だけで完結・前提知識ゼロ・ルー語/専門用語の禁止」の3原則に従って説明し直させる skill。差分だけの説明やジャーゴンまみれの要約への逃げを禁止する。 |

## skill の追加方法

各 skill は `skills/<name>/` ディレクトリに置き、最低限 `SKILL.md`（frontmatter に `name` と `description`）を含めます。

```
skills/
└── <name>/
    └── SKILL.md
```
