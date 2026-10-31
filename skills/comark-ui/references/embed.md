# Players and link cards

comark-embed turns `::embed` into the provider's player, with the link under it, for YouTube, Vimeo, Loom, Spotify, CodePen, StackBlitz, Figma, and X, and into a link card for any other https page. It reads the player's address from the link alone and fetches nothing. Use it for a screen recording of a bug, a design file, or a live reproduction.

## Syntax

```md
::embed{url="https://youtu.be/KCrXgy8qtjM" title="Watch before standup: Vite in 100 Seconds" start=30}
::
```

| Prop | What it does |
| --- | --- |
| `url` | Required. An `https://` link; any other renders nothing. |
| `title` | Names the player for screen readers and is the text of the link under it. Without it, the link shows the host. |
| `start` | Whole seconds into a YouTube or Vimeo video. A YouTube link's own `t=`, like `t=1m30s`, works too. |

Close the block with `::` on the next line. It drops anything inside and reports it.

| Provider | Links it reads |
| --- | --- |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/` (drawn tall), `/embed/`, and `/live/`, played from `youtube-nocookie.com` |
| Vimeo | `vimeo.com/<number>`, an unlisted link with its hash, and `player.vimeo.com/video/`, played with `dnt=1` |
| Loom | `loom.com/share/<id>` |
| Spotify | `open.spotify.com` track, album, playlist, episode, show, and artist links; a track or an episode gets the compact player |
| CodePen | `codepen.io/<user>/pen/<id>` |
| StackBlitz | `stackblitz.com/edit/<project>` and `stackblitz.com/github/<owner>/<repo>`, keeping options such as `file` and `view` |
| Figma | `figma.com/design`, `file`, `proto`, `board`, `slides`, and `deck` links, keeping `node-id` |
| X | `x.com/<user>/status/<id>` and `twitter.com` links, `mobile.` ones too; the post grows to its own height |

Any other `https://` link renders as a card with its `title` and host. A provider's link it can't read an ID from renders as a card too, and is reported. A link with a user name or password renders nothing.

## Pick what to embed

- Give every card a `title`. A card fetches nothing, so without one it shows only the host, and the plugin reports it.
- For a live reproduction, embed a StackBlitz project that runs in the browser alone, such as one from the `typescript` starter. A project that runs in WebContainers, such as a Node or Vite starter, needs a cross-origin-isolated page and a supported browser, and otherwise shows "Unable to run Embedded Project". Nothing reports it.

## Register

- In `comark-ui`: on.
- Alone: `pnpm add comark @comark/html comark-embed`, then `createHtmlRenderer({ plugins: [embed()], components })` with both from `comark-embed/html`. It takes no options. Only an X post needs a script, which the HTML renderer inlines and the components start on mount. `comark-embed/vue`, `/react`, and `/svelte` render it too.
