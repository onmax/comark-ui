# Social posts

comark-social draws a post, or a thread of them, from X, Bluesky, Mastodon, Threads, LinkedIn, or any site as a static card: the author, the text, the pictures, a quoted post, and the counts in the platform's order, with its logo. Use it to quote what someone posted, such as a bug report, a launch, or feedback, instead of a screenshot of the post or an embedded player. The card has no iframe and no script.

## Syntax

```md
::post{url="https://bsky.app/profile/ada.bsky.social/post/3lxyz" author="Ada Lovelace" handle="ada.bsky.social" avatar="https://example.com/ada.png" time="2026-11-20T09:30:00Z" replies="3" reposts="1.2K" likes="40"}
Shipped the new parser, thanks @grace.bsky.social #parsers

![Parse time before and after](./chart.png)

:::post{author="Grace Hopper" handle="grace.bsky.social" time="2026-11-19"}
Has anyone measured the old parser?
:::
::
```

| Prop | What it does |
| --- | --- |
| `url` | The post's address. The logo links to it, and it picks the platform. |
| `platform` | `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`, when `url` doesn't say or there is none. |
| `author` | The name the platform shows. |
| `handle` | The account, with or without its `@`. On LinkedIn and other sites, a headline such as a job title. |
| `avatar` | The author's picture: an https address, a path, or a `data:image/` URI. Without one the card shows the initial. |
| `time` | When it was posted, as an ISO date or instant. It shows as a short date with the full date on hover. |
| `replies`, `reposts`, `quotes`, `likes`, `views`, `bookmarks` | Counts as `1234`, `1,234`, or `1.2K`. Each platform shows them in its order and words: Mastodon's `reposts` are boosts and its `likes` favourites, and LinkedIn's `likes` are reactions. |

- The text is Markdown. A line break stays a line break, and `@handles` and `#tags` link to the platform.
- Images in a paragraph of their own are the pictures, in a grid of up to four.
- A `:::post` inside is the quoted post, drawn smaller and without counts. A post quotes one.
- Write the post as it was: don't shorten its text or round its counts beyond what the platform shows.

## Thread

Put posts that reply to each other in a `::thread`, from the root down. It's one card with the posts joined by a rail and the platform's logo in the corner; each post's date links to it.

```md
::thread
:::post{url="https://x.com/ada/status/1" author="Ada Lovelace" handle="ada" time="2026-11-20T09:30:00Z" likes="40"}
A thread on the new parser.
:::

:::post{url="https://x.com/ada/status/2" author="Ada Lovelace" handle="ada" time="2026-11-20T09:31:00Z" likes="12" views="9.1K"}
It's twice as fast on long documents.
:::
::
```

- A post with no `url` or `platform` takes the thread's platform, from the thread's `url` or the first post that has either.
- The last post is the focal one: larger, with its full date and views under it. `:focal="false"` draws it like the others, for a thread that goes on.
- With more than five posts above the last, all but the one it replies to fold behind "Show N earlier posts".
- Anything but a `:::post` inside is left out, with an issue.
- With `fetch`, `::thread{url="…"}` and no posts inside is fetched from that post up to the root, five posts at most.

## Conversation

Direct messages go in `::conversation`, one `:::message` per message:

```md
::conversation{me="Ada" platform="x" request}
:::message{from="Grace" avatar="https://example.com/grace.png" time="2026-11-28T09:30:00Z"}
Your docs theme breaks on Safari 27.1. Want the repro?
:::

:::message{from="Ada" time="2026-11-28T09:41:00Z"}
Yes please!
:::
::
```

| Prop | What it does |
| --- | --- |
| `me` | The `from` of your own messages. They sit on the right in the primary color; everyone else's sit on the left by their avatar. |
| `platform` | The logo in the header. Default `generic`. |
| `title` | The header's title. Defaults to the others' names. |
| `request` | Shows the "Message request" pill. |
| `from`, `avatar`, `time` on `:::message` | Who sent it, their picture, and when, as an ISO date or instant. One message's `avatar` shows by all of that sender's. |

- Every message needs `from`. Write the messages in the order they were sent; one sender's messages in a row are grouped.
- A message's text is Markdown, and images in a paragraph of their own show in the bubble. Nothing but `:::message` blocks goes inside.

## Fetch

With `social({ fetch: true })`, a post on X or Bluesky with a `url` is filled from the platform's public API while parsing. The built-in transport inlines pictures from known X and Bluesky image origins. Mastodon and other image hosts require a trusted `request` transport that checks every destination and leaves redirects to the plugin; never use unrestricted fetch with untrusted content. What's written wins. Threads and LinkedIn posts are written by hand. A post that can't be fetched renders what's written, with an issue.

## Register

- In `comark-ui`: on, with the options below under `social`. Fetching is off unless you pass `social: { fetch: true }`.
- Alone: `pnpm add comark @comark/html comark-social`, then `createHtmlRenderer({ plugins: [social()], components })` with both from `comark-social/html`. `comark-social/vue`, `/react`, and `/svelte` render it too.

`fetch` (default `false`) fills posts from their platform. `request` supplies the host's egress-enforcing transport. `maxImageSize` (default 500 KB) is the largest picture a fetch inlines. `locale`, `timeZone`, and `now` set how the dates read. `fetchPost(url, { request })` returns a post's data for a script of your own.

A script that writes a document rendered without fetching, such as a Drop page, turns that data into Markdown with `await postMarkdown(post, { src })` rather than writing the block by hand: it quotes the props, escapes the text so Comark reads it as text, writes the pictures and the quoted post, and draws the same card `fetch` would. `src(url, { kind, index, post })` returns the path to write for each avatar and picture, such as `./avatar-ada.jpg` for a file published with the document. `colons: 3` writes a `:::post` for inside another block. `textMarkdown(text)` escapes plain text alone the same way. A video's still is written `![Video](still.jpg){video}`. For a thread, `await threadMarkdown(posts, { src })` writes the posts, root first (follow each fetched post's `replyTo` up to the root), as a `::thread` of `:::post` blocks.
