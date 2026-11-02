---
title: Getting started
description: Run the wizard, pick the libraries to move, review the diff, and check what's left.
install: npx migrate-to-comark
---

Run the wizard in a clean Git working tree, so `git diff` shows exactly what it changed.

## Run the wizard

```sh
npx migrate-to-comark
```

It lists the Markdown libraries it found and the package.json files that declare them. If it found more than one, it asks which to move. Then it checks the project with each library's migrator, summarizes what each found, and asks before writing:

```txt
◇  What each migrator found
│  remark (remark, remark-html in package.json): 14 Markdown files and 1 code file to change, 3 warnings left to you.
│    2 × RTC0101 remark-to-comark/framework (https://comark-ui.onmax.me/remark-to-comark/diagnostics#rtc0101)
│    1 × RTC0301 remark-to-comark/mdx (https://comark-ui.onmax.me/remark-to-comark/diagnostics#rtc0301)
│
◆  Write 15 files?
```

## Flags

| Flag | Does |
| --- | --- |
| `[dir]` | Migrates that directory instead of the current one. |
| `--dry-run` | Reports what would change and writes nothing. |
| `--yes` | Writes every change without asking. |
| `--json` | Prints the report as JSON for agents. With `--yes`, it also writes the changes and lists the files under `written`. |
| `--only <library>` | Moves only `remark`, `markdown-it`, or `marked`, and skips the question. Repeat it for more than one. |

When it can't ask, as in CI or an agent's shell, it reports and writes nothing unless you pass `--yes`.

## Check what's left

The wizard ends with one command per migrator that lists every finding with its fix:

```sh
npx remark-to-comark check . --verbose
```

Each migrator's docs cover what it rewrites, what it reports, and how it was tested.
