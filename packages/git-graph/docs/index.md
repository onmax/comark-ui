---
title: Git graph
description: A commit graph in Markdown, drawn from pasted git output.
keywords: git, git log, graph, branches, merge, commit notes, backport, release branch, stacked PRs, rebase, tags
tagline: A commit graph drawn from what git printed, with branches, merges, and tags.
group: Review blocks
icon: git-graph
blurb: Branches, merges, and tags from git log
credits: 'Laid out like <a href="https://sapling-scm.com/docs/addons/isl/">Sapling''s smartlog</a>: the graph is a narrow gutter and the commit text owns the row.'
---

::examples
:::example{label="History"}
````md
```git-graph [How 1.5 shipped]
*   734e0a0 ade7d86 e148d3c (HEAD -> main) Merge pull request #97 from acme/fix/footer
|\  
| * e148d3c ade7d86 Fix a typo in the footer
|/  
| * efd3757 25ee3b2 (feat/billing) Charge in cents
| * 25ee3b2 e9f7701 Draft the pricing page
| * e9f7701 ade7d86 Add the invoices table
|/  
* ade7d86 2d2de00 Fix the RC's broken migration
* 2d2de00 c32642f Drop Node 20
| * 1f298c4 c32642f (tag: v1.5.0, release/1.5) Fix the RC's broken migration
|/  
*   c32642f 4d511f4 951f8dc (tag: v1.5.0-rc.1) Merge pull request #90 from acme/feat/search
|\  
| * 951f8dc 9b62dd1 Highlight matches
| *   9b62dd1 0a3b14a 4d511f4 Merge branch 'main' into feat/search
| |\  
| |/  
|/|   
* | 4d511f4 9b1263f Upgrade the router
| * 0a3b14a 16098db Rank by recency
| * 16098db 9b1263f Index titles
|/  
* 9b1263f 8709485 Tidy the README
* 8709485 40ce85b Retry flaky uploads
* 40ce85b b8e39b6 Split the settings page
* b8e39b6 8d269bc Log slow queries
* 8d269bc 00a0dfb Cache the font files
* 00a0dfb 27a1a3e Bump Vite to 8
* 27a1a3e (tag: v1.4.0) Release 1.4
```
````
:::

:::example{label="Release branches"}
````md
```git-graph [Release branches]
* f9c374c 5095f38 (release/2.4) Stop polling closed flows (#815)
* 5095f38 52783d7 Alert links keep their filters (#812)
* 52783d7 afb1a3b Rename the table's rows prop
| * 5595de7 d73449f (HEAD -> main) Engine 422s name the field (#827)
| * d73449f a94037c Release memory after a long session (#826)
| * a94037c fe1aa79 Empty replacement no longer crashes the table (#821)
| * fe1aa79 8ca9d7e Quiet expected 4xx errors (#818)
| * 8ca9d7e db5f451 Stop polling closed flows (#815)
| * db5f451 afb1a3b Alert links keep their filters (#812)
|/  
* afb1a3b fb4faea (tag: v2.4.3) Pin the export worker to two threads
| * ca45522 fb4faea (release/2.3-enterprise-bundle) Bundle the enterprise SKU
|/  
* fb4faea 5de6be0 (tag: v2.3.9) Read the legacy CSV dialect
| * 66267ed 5de6be0 (release/2.2) Retry the webhook once on a 502
|/  
* 5de6be0 (tag: v2.2.14) Release 2.2.14
```
````
:::

:::example{label="Stack"}
````md
```git-graph [Sign-in, as a stack of three PRs]
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
````
:::
::

## Features

- Reads what `git log` prints, pasted as is in a `git-graph` fence. On GitHub, or anywhere the plugin doesn't run, the fence still reads as the log.
- Draws forks and merges from the parent hashes, not from git's ASCII drawing, so lanes stay in their columns.
- Puts each branch's name at its tip and each tag on its commit, as `--decorate` does. A branch that was merged and deleted gets its name from the merge's message.
- Draws with no script.

## Usage

Run this in your repository:

```sh
git log --graph --oneline --decorate --parents --all
```

Paste what it prints, as is, in a fenced code block whose language is `git-graph`.

::example
````md
```git-graph
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
````
::

`--all` puts every branch in the graph. To show only some, name them instead, such as `git log --graph --oneline --decorate --parents main release/2.4`.

### Title

Write the title in brackets after the fence's language. It also names the figure for screen readers.

::example
````md
```git-graph [Sign-in stack]
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
````
::

### Props and slots

A fence takes a title and nothing else, because Comark keeps no other attribute on a code block. For the props and slots below, put the fence inside `::git-graph`. Its `title` prop works like the brackets, and a `#title` slot takes Markdown instead.

::example
````md
::git-graph{title="Sign-in stack"}
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
::
````
::

### Oldest first

Use the `reverse` prop to show the oldest commit first, as `git log --reverse` does. Without it the rows keep git's order, newest first. A plan reads better oldest first.

::example
````md
::git-graph{reverse}
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
::
````
::

### Newest commits

Use the `max-count` prop to keep the newest commits, as `git log -n` does. The rest fold into one row that says how many it left out.

::example
````md
::git-graph{max-count=4}
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
::
````
::

### Notes on commits

Use a `#commit-<sha>` slot to write Markdown under a commit, such as a review, a CI result, or whether a backport applies. Use the hash as printed in the log, or a unique prefix of at least four characters. The note takes one line, so keep it short.

::example
````md
::git-graph
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```

#commit-706c526
**Approved**, merge first

#commit-67cab57
Waiting on review
::
````
::

The slot needs the `commit-` prefix because Comark drops a slot name that starts with a digit, as many hashes do.

### Footer

Use the `#footer` slot to write Markdown under the graph, such as the next steps for a stack.

::example
````md
::git-graph
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 45a57b9 67cab57 (stack/sign-in-docs) Document signing in
| * 67cab57 8bb4fd2 (stack/sign-in-form) Remember the last email
| * 8bb4fd2 706c526 Sign-in form
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```

#footer
- [ ] Merge #101, then restack the other two
::
````
::

## Examples

### A stack of pull requests

`git log` on a stack shows one line of commits with a branch name at each tip. The block splits it into one lane per branch, all in one column, so each pull request reads as its own colored segment.

### History before a release

`git log --all` shows feature branches that forked, grew beside `main`, took `main` back in, and merged. Each merge draws as a curve into the branch it joined, and a branch that was deleted after its merge keeps its name, read from the merge message, with a dashed pill.

### Backport fixes to release branches

Paste the `git log` of `main` and the release branches, then try each fix on each branch and write what happened in its `#commit-<sha>` slot. The block reads only `git log`, so a `git cherry-pick` dry run goes in your words, not as pasted output.

```sh
git log --graph --oneline --decorate --parents main release/2.4 release/2.3-enterprise-bundle release/2.2
```

::example
````md
::git-graph{title="Backport the January fixes" reverse}
```
* f9c374c 5095f38 (release/2.4) Stop polling closed flows (#815)
* 5095f38 52783d7 Alert links keep their filters (#812)
* 52783d7 afb1a3b Rename the table's rows prop
| * 5595de7 d73449f (HEAD -> main) Engine 422s name the field (#827)
| * d73449f a94037c Release memory after a long session (#826)
| * a94037c fe1aa79 Empty replacement no longer crashes the table (#821)
| * fe1aa79 8ca9d7e Quiet expected 4xx errors (#818)
| * 8ca9d7e db5f451 Stop polling closed flows (#815)
| * db5f451 afb1a3b Alert links keep their filters (#812)
|/  
* afb1a3b fb4faea (tag: v2.4.3) Pin the export worker to two threads
| * ca45522 fb4faea (release/2.3-enterprise-bundle) Bundle the enterprise SKU
|/  
* fb4faea 5de6be0 (tag: v2.3.9) Read the legacy CSV dialect
| * 66267ed 5de6be0 (release/2.2) Retry the webhook once on a 502
|/  
* 5de6be0 (tag: v2.2.14) Release 2.2.14
```

#commit-8ca9d7e
**2.4** has it · **2.3** applies clean · **2.2** applies clean

#commit-fe1aa79
**2.4** applies clean · **2.3** applies clean · **2.2** conflict in `src/errors.ts`

#commit-a94037c
**2.4** applies clean

#commit-d73449f
**2.4** conflict in `src/Table.vue` · **2.3** applies clean · **2.2** conflict in `src/settings.ts`

#commit-5595de7
**2.4** applies clean · **2.3** applies clean
::
````
::

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `title` | — | Shown in the header, and names the figure for screen readers. |
| `reverse` | `false` | Shows the oldest commit first, as `git log --reverse` does. |
| `max-count` | — | Keeps the newest commits, as `git log -n` does, and folds the rest into one row. A whole number from 1. |

The props and slots need `::git-graph`. A `git-graph` fence takes only a title, in brackets after its language.

### Slots

| Slot | Description |
| --- | --- |
| `title` | Markdown for the header, in place of the `title` prop. |
| `commit-<sha>` | One line of Markdown under the only commit whose printed hash starts with `<sha>`. Matching uses the whole pasted log, even when `max-count` hides some rows. |
| `footer` | Markdown under the graph, such as the steps after a backport. |

### What it reads

- **`git log`**, with `--parents`: each commit, its parents, and the `(…)` labels `--decorate` prints for branches and tags. `--oneline` or the long format, with or without `--graph`. A local branch wins over its `origin/` copy.
- A pasted terminal: lines that start with `$ git log` begin more `git log` output. The output of any other command isn't read, and the plugin reports it.

Lanes come from the branch tips: `main`, `master`, or `trunk` first, then each branch back along its first parents until it meets a commit another lane owns. What git doesn't print isn't drawn, such as a branch's place before a rebase.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation) describes:

- A block or fence with no `git log` output. A fence with none stays a code block.
- `git log` output without `--parents`. It draws the commits in one line.
- Output of a command other than `git log`, such as `git cherry-pick`. It isn't drawn.
- A `#commit-<sha>` slot that matches no commits or more than one commit in the pasted log.
- A `max-count` that isn't a whole number from 1.
- Text beside the fence. The block drops it.
- A prop it doesn't read. It's ignored.

Each issue names the block and the fix, and has its own rule in [Doctor](/doctor):

```txt
The ```git-graph fence 1's `git log` was run without `--parents`, so it shows the commits in one line and draws no merges. Run `git log --graph --oneline --decorate --parents` again and paste that.
`::git-graph` 2: `#commit-9999999` names 9999999, a commit the `git log` above doesn't show. Write a hash from the log, or widen the `git log` so it includes that commit.
```

### Package

comark-ui installs and registers `comark-git-graph`. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-git-graph
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import gitGraph, { components } from "comark-git-graph/html";

const render = createHtmlRenderer({ plugins: [gitGraph()], components });
```

For Vue, React, or Svelte, import from `comark-git-graph/vue`, `comark-git-graph/react`, or `comark-git-graph/svelte`. The components add the styles on mount. Import `comark-git-graph/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers) covers using it with other plugins.

## Theme

The graph sits in a bordered card with a quiet header, like [Diff](/diff). Each branch keeps one of seven colors down its lane, on its pill too; the trunk's is neutral. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The graph reads these [shared tokens](/guide/theming):

| Token | Used for |
| --- | --- |
| `--comark-background` | The card, and the ring around each dot |
| `--comark-foreground` | The commit text, mixed into the trunk's color |
| `--comark-muted` | Hashes, PR numbers, commit notes, and the legend |
| `--comark-border` | The card's edge, the header, and the branch pills |
| `--comark-accent` | The header, tags, and a hovered row |
| `--comark-radius` | The card's corners |
| `--comark-font` | The text |

### Variables

Set them on `.cgg`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cgg-l0` to `--cgg-l6` | A neutral, then violet, blue, pink, teal, indigo, and magenta | Each lane's color, in turn |
| `--cgg-font` | `ui-monospace` | Hashes, branch names, and tags |

### Classes

| Class | Element |
| --- | --- |
| `.cgg` | The card, a `<figure>` |
| `.cgg-head`, `.cgg-title`, `.cgg-count` | The header, its title, and the counts |
| `.cgg-lines` | The lines and dots, an SVG |
| `.cgg-row` | A commit's row; `[data-notes]` on one with a note |
| `.cgg-branch` | A branch's pill; `[data-lane]` picks its color and `[data-deleted]` dashes it |
| `.cgg-tag` | A tag |
| `.cgg-note` | A `#commit-<sha>` slot's Markdown, under its commit |
| `.cgg-legend`, `.cgg-footer` | The legend, and the `#footer` slot |

```css
.cgg {
  --cgg-l1: oklch(0.65 0.17 50);
}
```
