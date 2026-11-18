# Git graphs

comark-git-graph draws a commit graph from what git printed: branches with their names at their tips, merges, and tags. Use it for a PR stack, how a release came together, or a backport plan, instead of a hand-drawn diagram or a Mermaid `gitGraph`.

## Syntax

Run `git log --graph --oneline --decorate --parents`, with `--all` or the branches to show, and paste what it prints in a `git-graph` fence. Don't edit it. The bracketed label after the language is the title, which also names the figure for screen readers.

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

Leave out the `$ git log` line. Where the plugin doesn't run, as on GitHub, the fence still reads as the log.

A fence takes no other prop, since Comark drops a code block's `{…}` attributes. For these, put the fence inside `::git-graph`:

````md
::git-graph{title="Sign-in stack" reverse}
```
* 0d65aff 676e7b8 (HEAD -> main) Bump Vite to 8
| * 706c526 676e7b8 (stack/session-api) Add the session endpoint
|/  
* 676e7b8 Release 1.4
```
::
````

| Prop | What it does |
| --- | --- |
| `title` | The header, like the fence's label. A `#title` slot takes Markdown instead. |
| `reverse` | Oldest commit first, as `git log --reverse`. Without it, rows keep git's order, newest first. |
| `max-count` | Keeps the newest commits, as `git log -n`, and folds the rest into one "n more commits" row. |

A `#commit-<sha>` slot puts one line of Markdown under that commit: a review, a CI result, or whether a backport applies. Use the hash as printed in the log or a unique prefix of at least four characters. A `#footer` slot puts Markdown under the graph, such as a task list.

## Show a backport

Paste the `git log` of `main` and every release branch, with `reverse` so the plan reads oldest first. Try each fix as a dry run, reset the branches, and write the results in the fix's `#commit-<sha>` slot. The block reads only `git log`: it reports the output of `git cherry`, `git switch`, or `git cherry-pick` and doesn't draw it.

````md
::git-graph{title="Backport the January fixes" reverse}
```
* 8ca9d7e db5f451 (HEAD -> main) Stop polling closed flows (#815)
* db5f451 afb1a3b Alert links keep their filters (#812)
| * 66267ed afb1a3b (release/2.2) Retry the webhook once on a 502
|/  
* afb1a3b (tag: v2.2.14) Release 2.2.14
```

#commit-8ca9d7e
**2.2** conflict in `src/flows.ts`
::
````

- `--parents` is required: without it the graph is one line, and the plugin reports it.
- In `::git-graph`, write explanations outside the block, in a `#commit-<sha>` slot, or in `#footer`; text beside the fence is dropped.
- A note takes one line. Keep it to a few words per branch.

## Register

- In `comark-ui`: on, under the key `gitGraph`.
- Alone: `pnpm add comark @comark/html comark-git-graph`, then `createHtmlRenderer({ plugins: [gitGraph()], components })` with both from `comark-git-graph/html`. It takes no options and needs no script. `comark-git-graph/vue`, `/react`, and `/svelte` render it too.
