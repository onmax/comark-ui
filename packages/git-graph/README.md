# comark-git-graph

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=comark-git-graph&icon=npm)](https://npmx.dev/package/comark-git-graph)
[![npm downloads](https://comark-ui.onmax.me/badge.svg?source=npm-downloads&package=comark-git-graph&period=month&icon=npm)](https://npmx.dev/package/comark-git-graph)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/comark-git-graph)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/git-graph)

Commit graphs from pasted git output: branches, merges, tags, and which branches have each fix. A [Comark](https://comark.dev) plugin for HTML, Vue, React, and Svelte.

```sh
pnpm add comark comark-git-graph
```

```ts
import { createHtmlRenderer } from "@comark/html";
import gitGraph, { components } from "comark-git-graph/html";

const render = createHtmlRenderer({ plugins: [gitGraph()], components });
```

Run `git log --graph --oneline --decorate --parents` and paste what it prints inside the block:

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

Forks and merges come from the parent hashes, branch pills and tags from `--decorate`. For a backport, paste the whole terminal: `git cherry -v <branch> main` marks the fixes a branch already has, and a `git cherry-pick` dry run marks each pick clean or in conflict, with the files. `reverse` shows the oldest commit first and `max-count` keeps the newest commits, as `git log --reverse` and `git log -n` do. The page shows the graph with no script.

The plugin adds every problem to `meta.issues`, so a host can reject a document before publishing it: no `git log` output, a log without `--parents`, a branch or commit the log doesn't show, and a bad `max-count`. Each issue names the block and says how to fix it.

## Renderers

| Renderer | Import |
| --- | --- |
| `@comark/html` | `comark-git-graph/html`: the styles are inlined |
| `@comark/vue` | `comark-git-graph/vue` |
| `@comark/react` | `comark-git-graph/react` |
| `@comark/svelte` | `comark-git-graph/svelte` |

Each entry exports the parse plugin as `default` and the renderer's `components`. The Vue, React, and Svelte components add the styles when they mount; import `comark-git-graph/style.css` with your styles so a server-rendered page doesn't shift. The styles read the shared `--comark-*` tokens and sit in a `comark` CSS layer, so any plain rule of your own wins.
