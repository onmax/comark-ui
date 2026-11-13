---
title: Git graph
description: A commit graph in Markdown, drawn from pasted git output.
keywords: git, git log, graph, branches, merge, cherry-pick, backport, release branch, stacked PRs, rebase, tags
tagline: A commit graph drawn from what git printed, with branches, merges, tags, and which branches have each fix.
group: Review blocks
icon: git-graph
blurb: Branches and backports from git log
credits: 'Laid out like <a href="https://sapling-scm.com/docs/addons/isl/">Sapling''s smartlog</a>: the graph is a narrow gutter and the commit text owns the row.'
---

::examples
:::example{label="History"}
````md
::git-graph{title="How 1.5 shipped"}
```
$ git log --all --graph --oneline --decorate --parents
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
$ git cherry -v main release/1.5
- 1f298c4cb9c1a6bc84e8b227fc3e79d07046be11 Fix the RC's broken migration
```
::
````
:::

:::example{label="Backport"}
````md
::git-graph{title="Backport the January fixes" reverse}
```
$ git log --graph --oneline --decorate --parents main release/2.4 release/2.3-enterprise-bundle release/2.2
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
$ git cherry -v release/2.4 main
- db5f4512c9c358eb843b736d3aa3063ade681869 Alert links keep their filters (#812)
- 8ca9d7ef7a2b98a2c470ff5d4873c4f45dce3adf Stop polling closed flows (#815)
+ fe1aa79cdf483fe0ef3def6a8a07ca77a2854836 Quiet expected 4xx errors (#818)
+ a94037cbb17286cfedcad6a92232970fd8af6a7b Empty replacement no longer crashes the table (#821)
+ d73449fafcc0d981eea22a5170adf6c1e0c453b8 Release memory after a long session (#826)
+ 5595de735b843dd7542e2142a950148045807fa9 Engine 422s name the field (#827)
$ git switch release/2.4
Switched to branch 'release/2.4'
$ git cherry-pick fe1aa79 a94037c d73449f 5595de7
[release/2.4 3e0d819] Quiet expected 4xx errors (#818)
 Date: Mon Jan 5 01:00:00 2026 +0000
 1 file changed, 1 insertion(+)
[release/2.4 4a566e1] Empty replacement no longer crashes the table (#821)
 Date: Mon Jan 5 03:00:00 2026 +0000
 1 file changed, 1 insertion(+)
 create mode 100644 src/replace.ts
Auto-merging src/Table.vue
CONFLICT (content): Merge conflict in src/Table.vue
error: could not apply d73449f... Release memory after a long session (#826)
hint: After resolving the conflicts, mark them with
hint: "git add/rm <pathspec>", then run
hint: "git cherry-pick --continue".
hint: You can instead skip this commit with "git cherry-pick --skip".
hint: To abort and get back to the state before "git cherry-pick",
hint: run "git cherry-pick --abort".
hint: Disable this message with "git config set advice.mergeConflict false"
$ git cherry-pick --skip
[release/2.4 cfa1496] Engine 422s name the field (#827)
 Date: Mon Jan 5 06:00:00 2026 +0000
 1 file changed, 1 insertion(+)
 create mode 100644 src/engine.ts
$ git switch release/2.3-enterprise-bundle
Switched to branch 'release/2.3-enterprise-bundle'
$ git cherry-pick 8ca9d7e fe1aa79 d73449f 5595de7
[release/2.3-enterprise-bundle 8525458] Stop polling closed flows (#815)
 Date: Mon Jan 5 00:00:00 2026 +0000
 1 file changed, 1 insertion(+)
 create mode 100644 src/flows.ts
[release/2.3-enterprise-bundle 8b348a3] Quiet expected 4xx errors (#818)
 Date: Mon Jan 5 01:00:00 2026 +0000
 1 file changed, 1 insertion(+)
[release/2.3-enterprise-bundle bd84b61] Release memory after a long session (#826)
 Date: Mon Jan 5 04:00:00 2026 +0000
 2 files changed, 2 insertions(+)
[release/2.3-enterprise-bundle 3e52a07] Engine 422s name the field (#827)
 Date: Mon Jan 5 06:00:00 2026 +0000
 1 file changed, 1 insertion(+)
 create mode 100644 src/engine.ts
$ git switch release/2.2
Switched to branch 'release/2.2'
$ git cherry-pick 8ca9d7e fe1aa79 d73449f
[release/2.2 b086e43] Stop polling closed flows (#815)
 Date: Mon Jan 5 00:00:00 2026 +0000
 1 file changed, 1 insertion(+)
 create mode 100644 src/flows.ts
Auto-merging src/errors.ts
CONFLICT (content): Merge conflict in src/errors.ts
error: could not apply fe1aa79... Quiet expected 4xx errors (#818)
hint: After resolving the conflicts, mark them with
hint: "git add/rm <pathspec>", then run
hint: "git cherry-pick --continue".
hint: You can instead skip this commit with "git cherry-pick --skip".
hint: To abort and get back to the state before "git cherry-pick",
hint: run "git cherry-pick --abort".
hint: Disable this message with "git config set advice.mergeConflict false"
$ git cherry-pick --skip
Auto-merging src/settings.ts
CONFLICT (content): Merge conflict in src/settings.ts
error: could not apply d73449f... Release memory after a long session (#826)
hint: After resolving the conflicts, mark them with
hint: "git add/rm <pathspec>", then run
hint: "git cherry-pick --continue".
hint: You can instead skip this commit with "git cherry-pick --skip".
hint: To abort and get back to the state before "git cherry-pick",
hint: run "git cherry-pick --abort".
hint: Disable this message with "git config set advice.mergeConflict false"
$ git cherry-pick --skip
```
::
````
:::

:::example{label="Stack"}
````md
::git-graph{title="Sign-in, as a stack of three PRs"}
```
$ git log --all --graph --oneline --decorate --parents
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
:::
::

## Features

- Reads what git printed, pasted as is: `git log --graph --oneline --decorate --parents`, then `git cherry -v` and a `git cherry-pick` dry run for a backport.
- Draws forks and merges from the parent hashes, not from git's ASCII drawing, so lanes stay in their columns.
- Puts each branch's name at its tip and each tag on its commit, as `--decorate` does. A branch that was merged and deleted gets its name from the merge's message.
- Shows a cherry-pick on its source's row, numbered in the order it was picked, with the files of a conflict.
- Draws with no script, and says every pick in words for screen readers.

## Usage

Run `git log --graph --oneline --decorate --parents` and paste what it prints in a fence inside `::git-graph`.

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
::
````
::

Add `--all`, or name the branches to show, such as `git log --graph --oneline --decorate --parents main release/2.4`. A transcript that starts each command with `$ git` works too, so you can paste a terminal as it is.

### Title

Use the `title` prop to name the graph in its header. It also names the figure for screen readers. A `#title` slot takes Markdown instead.

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

### Footer

Use the `#footer` slot to write Markdown under the graph, such as the steps after a backport.

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

### Backport fixes to release branches

Run the backport as a dry run, and paste the whole terminal: `git log` for the branches, `git cherry -v <branch> main` for the fixes a branch already has, then `git switch` and `git cherry-pick` for each branch, with `git cherry-pick --skip` after a conflict.

```sh
git log --graph --oneline --decorate --parents main release/2.4 release/2.3
git cherry -v release/2.4 main
git switch release/2.4
git cherry-pick cc4127a 378f25e 978ebb9
git cherry-pick --skip
```

Each fix on `main` gets one row. A pick that applied is a green dot in the branch's lane, a conflict an amber one, numbered in the order you picked, and the conflicting files show under the commit. A `-` from `git cherry` is a ring: the branch already has that change, so its own copy folds into the fix's row. Reset the branches afterwards; the graph keeps what the dry run printed.

### A stack of pull requests

`git log` on a stack shows one line of commits with a branch name at each tip. The block splits it into one lane per branch, all in one column, so each pull request reads as its own colored segment.

### History before a release

`git log --all` shows feature branches that forked, grew beside `main`, took `main` back in, and merged. Each merge draws as a curve into the branch it joined, and a branch that was deleted after its merge keeps its name, read from the merge message, with a dashed pill.

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `title` | — | Shown in the header, and names the figure for screen readers. |
| `reverse` | `false` | Shows the oldest commit first, as `git log --reverse` does. |
| `max-count` | — | Keeps the newest commits, as `git log -n` does, and folds the rest into one row. A whole number from 1. |

### Slots

| Slot | Description |
| --- | --- |
| `title` | Markdown for the header, in place of the `title` prop. |
| `footer` | Markdown under the graph, such as the steps after a backport. |

### What it reads

- **`git log`**, with `--parents`: each commit, its parents, and the `(…)` labels `--decorate` prints for branches and tags. `--oneline` or the long format, with or without `--graph`. A local branch wins over its `origin/` copy.
- **`git cherry -v <branch> <source>`**: each `-` line marks a commit `<branch>` already has.
- **`git switch` or `git checkout`**, then **`git cherry-pick`**: `[branch sha] subject` is a pick that applied, and `CONFLICT … in <file>` followed by `error: could not apply <sha>…` a conflict in those files. A pick finished with `--continue` stays a conflict. Git's messages in another language read too.

Lanes come from the branch tips: `main`, `master`, or `trunk` first, then each branch back along its first parents until it meets a commit another lane owns. What git doesn't print isn't drawn, such as a branch's place before a rebase.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation) describes:

- A block with no `git log` output.
- `git log` output without `--parents`. It draws the commits in one line.
- A branch or a commit, named by `git switch`, `git cherry`, or `git cherry-pick`, that the `git log` above doesn't show.
- A `max-count` that isn't a whole number from 1.
- Text beside the fence. The block drops it.
- A prop it doesn't read. It's ignored.

Each issue names the block and the fix, and has its own rule in [Doctor](/doctor):

```txt
`::git-graph` 1's `git log` was run without `--parents`, so it shows the commits in one line and draws no merges. Run `git log --graph --oneline --decorate --parents` again and paste that.
`::git-graph` 2: `git switch release/9` names `release/9`, a branch the `git log` above doesn't show. Add the branch to the `git log` command, or add `--all`.
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

The graph sits in a bordered card with a quiet header, like [Diff](/diff). Each branch keeps one of seven colors down its lane, on its pill too; the trunk's is neutral. Picks use the status colors. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The graph reads these [shared tokens](/guide/theming):

| Token | Used for |
| --- | --- |
| `--comark-background` | The card, and the ring around each dot |
| `--comark-foreground` | The commit text, mixed into the trunk's color |
| `--comark-muted` | Hashes, PR numbers, notes, and the legend |
| `--comark-border` | The card's edge, the header, and the branch pills |
| `--comark-accent` | The header, tags, and a hovered row |
| `--comark-success` | A pick that applied |
| `--comark-warning` | A pick with a conflict |
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
| `.cgg-row` | A commit's row; `[data-notes]` on one with a line of notes |
| `.cgg-branch` | A branch's pill; `[data-lane]` picks its color and `[data-deleted]` dashes it |
| `.cgg-tag` | A tag |
| `.cgg-note` | A pick's note; `[data-status]` is `clean`, `conflict`, or `has` |
| `.cgg-legend`, `.cgg-footer` | The legend, and the `#footer` slot |

```css
.cgg {
  --cgg-l1: oklch(0.65 0.17 50);
}
```
