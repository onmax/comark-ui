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

A `#footer` slot puts Markdown under the graph, such as a task list.

## Show a backport

Run it as a dry run and paste the whole terminal, then reset the branches. Start each command after the `git log` output with `$ git`, as a terminal shows it:

```sh
git log --graph --oneline --decorate --parents main release/2.4 release/2.3
git cherry -v release/2.4 main          # "-" lines: release/2.4 already has that fix
git switch release/2.4
git cherry-pick cc4127a 378f25e 978ebb9  # in the order you'd pick them
git cherry-pick --skip                   # after a conflict, to try the rest
```

Each fix gets one row on `main`. A pick that applied is a numbered green dot in the branch's lane, a conflict an amber one with its files under the commit, and a fix the branch already has a ring. Add `reverse` so the plan reads oldest first.

- `--parents` is required: without it the graph is one line, and the plugin reports it.
- Name every branch the transcript switches to or picks onto in the `git log` command, or the plugin reports it and leaves its picks out.
- In `::git-graph`, write explanations outside the block or in `#footer`; text beside the fence is dropped.
- What git doesn't print isn't drawn: a pick you haven't tried, or where a branch was before a rebase.

## Register

- In `comark-ui`: on, under the key `gitGraph`.
- Alone: `pnpm add comark @comark/html comark-git-graph`, then `createHtmlRenderer({ plugins: [gitGraph()], components })` with both from `comark-git-graph/html`. It takes no options and needs no script. `comark-git-graph/vue`, `/react`, and `/svelte` render it too.
