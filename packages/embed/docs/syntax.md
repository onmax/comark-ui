---
title: Syntax
description: The links embed reads and its props.
---

```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds" start=30}
::
```

Close the block with `::` on the next line; anything inside it is dropped.

| Prop | What it does |
| --- | --- |
| `url` | Required. An `https://` link. |
| `title` | Names the player for screen readers and is the text of the link under it. Without it the link shows the host. |
| `start` | Seconds into a YouTube or Vimeo video to start at. A YouTube link's own `t=` works too. |

| Provider | Links it reads | Player |
| --- | --- | --- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` | YouTube's privacy-enhanced mode, `youtube-nocookie.com`. Shorts are tall. |
| Vimeo | `vimeo.com/<number>`, unlisted links with their hash, `player.vimeo.com/video/` | With `dnt=1`, so Vimeo doesn't track the session. |
| Loom | `loom.com/share/<id>`, `/embed/<id>` | Loom's embed player. |
| Spotify | `open.spotify.com/` track, album, playlist, episode, show, and artist links | A compact player for a track or an episode, a full one for the rest. |
| CodePen | `codepen.io/<user>/pen/<id>` (also `full`, `details`, or `embed`) | The pen's result. |
| StackBlitz | `stackblitz.com/edit/<project>`, `stackblitz.com/github/<owner>/<repo>` | The project, keeping options such as `file` and `view`. |
| Figma | `figma.com/design`, `file`, `proto`, `board`, `slides`, and `deck` links | Figma's embed, keeping `node-id`. |

The parser checks the path as well as the hostname. A link with a supported host but the wrong path becomes a link card and adds a problem, so it stays followable without pretending to be a player.

| Input | Result |
| --- | --- |
| `https://stackblitz.com/edit/typescript?file=index.ts` | StackBlitz player. Query options such as `file` stay on the player URL. |
| `https://www.figma.com/file/<key>/Example` | Figma player. `/file/` is the older spelling of `/design/`. |
| `https://open.spotify.com/artist/<id>` | Spotify list player. |
| `https://stackblitz.com/edit/typescript/extra` | Link card and a `meta.issues` entry. Extra path segments are not a StackBlitz project URL. |
| `https://example.com/docs` | Link card. Add `title` so the card names the page instead of using `example.com`. |
| `http://example.com/docs`, `javascript:...`, or a URL with `user:password@` | Nothing is rendered. The parser reports the unsafe URL. |

A StackBlitz project that runs in WebContainers, such as a Node or Vite starter, needs a cross-origin-isolated embedding page and a supported browser/runtime configuration ([WebContainers browser support](https://developer.stackblitz.com/platform/webcontainers/browser-support) and [browser configuration](https://developer.stackblitz.com/platform/webcontainers/browser-config)); without those requirements, its embedded preview may fail with “Unable to run Embedded Project”. A project that runs in the browser alone, such as the `typescript` starter, does not need WebContainer isolation, but it still depends on StackBlitz’s [supported embedding environments](https://developer.stackblitz.com/guides/integration/embedding).

Any other `https://` link renders as a card with its `title` and host. Cards don't fetch the page's title yet, so give each one a `title`.

The plugin adds every problem to `meta.issues`, as [Validation](/guide/validation/) describes: a missing `url`, one that isn't `https://` (it renders nothing), a provider's link it can't read an ID from (it renders as a card), a card without a `title`, a `start` that isn't whole seconds or is set on a player that can't seek, and content inside the block. Each issue names its block and says how to fix it.
