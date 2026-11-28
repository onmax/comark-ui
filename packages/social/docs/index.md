---
title: Social
description: Posts from X, Bluesky, Mastodon, Threads, and LinkedIn as static cards, and direct messages as a chat, written in Markdown.
keywords: social, post, tweet, direct message, DM, chat, conversation, X, Twitter, Bluesky, Mastodon, Threads, LinkedIn, quote post, static embed, social card, feedback
tagline: A post from X, Bluesky, Mastodon, Threads, LinkedIn, or any site, as a static card with its counts.
group: Review blocks
icon: message-circle
blurb: Posts as cards, with no iframe
---

::examples
:::example{label="X"}
```md
::post{url="https://x.com/miraokafor/status/1856000000000000000" author="Mira Okafor" handle="miraokafor" time="2026-11-20T09:30:00Z" replies="48" reposts="312" likes="2.4K" views="98K" bookmarks="120"}
The new parser shipped today, and our docs build went from 41s to 9s. Thanks @tlin for the review #buildtools

![The build dashboard after the upgrade](/dashboard.png)
::
```
:::

:::example{label="Bluesky quote"}
```md
::post{url="https://bsky.app/profile/tlin.bsky.social/post/3lxyz" author="Theo Lin" handle="tlin.bsky.social" time="2026-11-21T14:05:00Z" replies="6" reposts="21" likes="140"}
This is the bug report every maintainer wants: a repro, the version, and what they expected.

:::post{author="Mira Okafor" handle="miraokafor.bsky.social" time="2026-11-21"}
Links with a trailing slash 404 on 0.14.2. Repro: https://example.com/repro/slash
:::
::
```
:::

:::example{label="Mastodon"}
```md
::post{url="https://mastodon.example/@sana/113000000000000001" author="Sana Ruiz" handle="sana@mastodon.example" time="2026-11-18" replies="4" reposts="37" likes="96"}
Reminder: the meetup moved to Thursday. Bring your laptop if you want help with #rust setups.
::
```
:::

:::example{label="Conversation"}
```md
::conversation{me="Mira" platform="x" request}
:::message{from="Theo Lin" avatar="/pond.svg" time="2026-11-27T16:02:00Z"}
Hi! I maintain the docs theme you forked. Would you send the Safari fix upstream?
:::

:::message{from="Theo Lin"}
Happy to review it this week.
:::

:::message{from="Mira" time="2026-11-27T16:20:00Z"}
Sure, I'll open a PR tonight.
:::
::
```
:::
::

## Features

- One card for every platform, in the shadcn/ui style of the other blocks, with the platform's logo in the corner linking to the post.
- The counts in the platform's order and words: Mastodon's boosts and favourites, LinkedIn's reactions and comments.
- No iframe, no script, and no request when the page opens, so a quoted post stays as it was even after it's deleted.
- `@handles` and `#tags` link to the platform, a nested `:::post` is the quoted post, and images in a paragraph of their own are a grid.
- With the `fetch` option, `::post{url="…"}` alone is filled from X, Bluesky, or Mastodon while parsing, with its pictures inlined.
- `::conversation` draws direct messages as a chat: your messages on the right in the primary color, everyone else's on the left by their avatar.
- A screen reader hears "Post by Mira Okafor on X", the full date, and each count in words.

## Usage

Write the post's props and its text inside `::post`:

::example
```md
::post{platform="x" author="Mira Okafor" handle="miraokafor" likes="12"}
Shipped it.
::
```
::

### Platform

Use the `url` prop to link the card to the post. The platform comes from the address: x.com and twitter.com, bsky.app, threads.com, linkedin.com, and any server with a Mastodon address such as `/@user/1234`. Use the `platform` prop when there's no address, or to override it: `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`.

::example
```md
::post{platform="threads" author="Theo Lin" handle="tlin" likes="58" replies="7" reposts="3"}
Day 3 of moving the blog to Comark. Tables are the hard part.
::

::post{url="https://www.linkedin.com/posts/sana-ruiz_activity-1" author="Sana Ruiz" handle="Engineering manager at Pondworks" likes="214" replies="18"}
We're hiring two frontend engineers. #hiring
::
```
::

A `generic` post shows a globe for its logo and leaves `@handles` and `#tags` as text. On LinkedIn and generic posts, `handle` is shown as written, so it can be a headline.

### Author

Use the `author`, `handle`, and `avatar` props to say who wrote it. `handle` shows with an `@` on platforms that have one; a Mastodon handle on another server keeps its `@server`. Without `avatar`, the card shows the author's initial.

::example
```md
::post{platform="bluesky" author="Theo Lin" handle="tlin.bsky.social" avatar="/pond.svg"}
Testing the new avatar.
::
```
::

### Time

Use the `time` prop for when it was posted, as an ISO date or instant. The card shows a short date, and the full date and time on hover.

::example
```md
::post{platform="x" author="Mira Okafor" time="2026-03-02T18:45:00Z"}
Spring release notes are up.
::
```
::

### Counts

Use the `replies`, `reposts`, `quotes`, `likes`, `views`, and `bookmarks` props for the counts, as `1234`, `1,234`, or `1.2K`. Each platform shows its own in its own order, with the others after them; the names are the same for every platform.

::example
```md
::post{platform="mastodon" author="Sana Ruiz" handle="sana@mastodon.example" replies="4" reposts="37" likes="96"}
Mastodon calls them boosts and favourites.
::
```
::

### Pictures

Put images in a paragraph of their own to show them in a grid under the text, up to four in view. With `fetch`, a video shows its thumbnail with a play badge.

::example
```md
::post{platform="x" author="Mira Okafor" handle="miraokafor"}
Before and after.

![Before](/before.png)
![After](/after.png)
::
```
::

### Quoted post

Put a `:::post` inside to show the post it quotes, smaller and without counts. It shares the outer post's platform unless it has its own `url` or `platform`.

::example
```md
::post{platform="x" author="Theo Lin" handle="tlin"}
Agreed, and the fix is already in main.

:::post{author="Mira Okafor" handle="miraokafor" time="2026-11-19"}
The sidebar flickers on Safari 27.1 when it opens.
:::
::
```
::

### Conversation

Write direct messages as `:::message` blocks inside `::conversation`, each with who sent it in `from`. The messages whose `from` is the conversation's `me` sit on the right in the primary color; the others sit on the left by their sender's avatar, or initial. One sender's messages in a row are grouped, with the avatar by the last one. In a group chat or a conversation with a custom title, the incoming sender's name appears above the first message in each run.

::example
```md
::conversation{me="Ada" platform="bluesky"}
:::message{from="Grace" avatar="/pond.svg" time="2026-11-28T09:30:00Z"}
Did the release go out?
:::

:::message{from="Ada" time="2026-11-28T09:41:00Z"}
It did, this morning.
:::

:::message{from="Ada"}
The changelog is on the docs site.
:::
::
```
::

The header shows `title`, or the names of the others in the conversation, and the platform's logo. Use `request` to show the "Message request" pill a platform shows on a message from someone you don't follow. With three people or more, each run of messages on the left starts with its sender's name.

::example
```md
::conversation{me="Ada" title="Release crew" platform="x"}
:::message{from="Grace"}
Tagging v0.15 now.
:::

:::message{from="Linus"}
Docs are deployed.
:::

:::message{from="Ada"}
Thanks both!
:::
::
```
::

A message's text is Markdown, and images in a paragraph of their own show in the bubble. `avatar` and `time` read like a post's: one message's avatar shows by all of that sender's messages, and a time with the time of day shows it after the date.

## Examples

### Fill a post from its link

Turn on `fetch` and write only the address. The parse fills the author, handle, avatar, time, text, pictures, counts, and quoted post from the platform's public API. It also tries to inline the avatar and fetched pictures.

```ts
import social from "comark-social";

const plugins = [social({ fetch: true })];
```

```md
::post{url="https://bsky.app/profile/tlin.bsky.social/post/3lxyz"}
::
```

What you write wins over what's fetched, so you can correct a count or shorten the text. Threads and LinkedIn have no public API, so their posts are written by hand.

By default, server-side fetching is limited to the HTTPS origins `api.fxtwitter.com` and `public.api.bsky.app` for posts, and `pbs.twimg.com` and `cdn.bsky.app` for images. The same restrictions apply on redirects. Disallowed requests report an issue; a picture that cannot be inlined may still load in the reader's browser. Leave `fetch` off if parsing must make no requests.

To fetch federated Mastodon posts or images from other origins, supply a trusted `request(url, init)` transport to `social()` or `fetchPost()`. It replaces the default allowlist and handles every API and image request, including each redirect hop. Honor `init.redirect: "manual"` and the abort signal; enforce your egress rules at connection time, using a trusted proxy or a transport that validates and pins the actual destination IP. A URL or DNS precheck alone does not prevent DNS rebinding. Do not use an unrestricted transport with untrusted Markdown or provider responses. Requests through a custom transport are not shared in the default cache.

### Quote feedback in a pull request

Put the post that reported a bug in the PR's evidence, so a reviewer reads it without leaving the page, even after the post is gone.

```md
## Why

Reported by a user on Bluesky:

::post{url="https://bsky.app/profile/miraokafor.bsky.social/post/3lxyz" author="Mira Okafor" handle="miraokafor.bsky.social" time="2026-11-21"}
Links with a trailing slash 404 on 0.14.2.
::
```

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `url` | — | The post's address. The logo links to it, and it picks the platform. |
| `platform` | from `url`, else `generic` | `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`. |
| `author` | — | The name the platform shows. |
| `handle` | — | The account, with or without its `@`. On LinkedIn and generic posts, any text, such as a headline. |
| `avatar` | — | The author's picture: an https address, a path, or a `data:image/` URI. |
| `time` | — | When it was posted, as an ISO date or instant. |
| `replies` | — | Replies, or comments on LinkedIn. |
| `reposts` | — | Reposts, or boosts on Mastodon. |
| `quotes` | — | Quote posts. |
| `likes` | — | Likes, favourites on Mastodon, or reactions on LinkedIn. |
| `views` | — | Views. |
| `bookmarks` | — | Bookmarks. |

### Conversation props

| Prop | Default | Description |
| --- | --- | --- |
| `me` | — | The `from` of your own messages, which sit on the right. |
| `platform` | `generic` | The logo in the header: `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`. |
| `title` | the others' names | The header's title. |
| `request` | `false` | Shows a "Message request" pill in the header. |

### Message props

| Prop | Default | Description |
| --- | --- | --- |
| `from` | — | Who sent it. |
| `avatar` | — | The sender's picture: an https address, a path, or a `data:image/` URI. |
| `time` | — | When it was sent, as an ISO date or instant. |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `fetch` | `false` | Fills each post with a `url` on X, Bluesky, or Mastodon from the platform while parsing, and inlines its avatar and pictures. |
| `request` | built-in allowlist | A host-provided HTTPS transport that enforces egress policy and does not follow redirects itself. Required for federated Mastodon hosts. |
| `maxImageSize` | `500000` | The largest picture, in bytes, a fetch inlines. A larger one keeps its address. |
| `locale` | `en-US` | A BCP 47 tag for the dates and counts. |
| `timeZone` | the runtime's | An IANA zone for the time of day. |
| `now` | the moment of parsing | The moment a date leaves its year out from, when it's the same year. |

### Functions

| Function | Description |
| --- | --- |
| `fetchPost(url, { signal, request })` | Returns a post's `platform`, `url`, `author`, `handle`, `avatar`, `time`, `text`, `counts`, `media`, and `quote` from X, Bluesky, or Mastodon. Default requests without a caller-supplied signal are cached per process. It throws a `FetchPostError` for another platform or a failed request. |

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation) describes:

- A prop it doesn't read, such as `boosts`. It's ignored.
- A `platform` it doesn't know. The card reads the platform from `url`.
- A count that isn't a number. It doesn't show.
- A `url` that isn't an http or https address, or an `avatar` with another scheme. It's dropped.
- A `time` that isn't a date. It shows as written.
- A post with no `author` or `handle`.
- More than one `:::post` in a post, or a post inside a quoted post. Only the first quote shows.
- A block in a `::conversation` other than a `:::message`, which is left out, a conversation with no messages, and a message with no `from`.
- With `fetch`, a post or a picture that couldn't be fetched, and a picture larger than `maxImageSize`.

Each issue names the block and the fix, and has its own rule in [Doctor](/doctor):

```txt
`::post` 1: `likes` is "about 300", which isn't a count, so it doesn't show. Write a number such as 1234, 1,234, or 1.2K.
`::post` 2 has no `author` or `handle`, so the card names no one. Write `author`, or give it a `url` and turn on the `fetch` option.
```

### Package

comark-ui installs and registers `comark-social`. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-social
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import social, { components } from "comark-social/html";

const render = createHtmlRenderer({ plugins: [social()], components });
```

For Vue, React, or Svelte, import from `comark-social/vue`, `comark-social/react`, or `comark-social/svelte`. The components add the styles on mount. Import `comark-social/style.css` with your styles so a server-rendered page doesn't shift. Register it before comark-chips, which then leaves the card's links and handles alone. [Renderers](/guide/renderers) covers using it with other plugins.

## Theme

The post sits in a bordered card like [Cards](/cards), with the platform's logo in the text color, so it matches the page rather than the platform. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

The card reads these [shared tokens](/guide/theming):

| Token | Used for |
| --- | --- |
| `--comark-background` | The card |
| `--comark-foreground` | The text and the logo |
| `--comark-muted` | The handle, the date, and the counts |
| `--comark-border` | The card's edge, the quoted post, and the gaps in the grid |
| `--comark-accent` | The initial's circle, code, a picture still loading, and the others' messages |
| `--comark-primary` | Links, `@handles`, `#tags`, and your own messages |
| `--comark-ring` | The focus ring |
| `--comark-radius` | The corners |
| `--comark-font` | The text |

### Classes

| Class | Element |
| --- | --- |
| `.csl` | The card, an `<article>`; `[data-platform]` names the platform and `[data-quote]` marks a quoted post |
| `.csl-head`, `.csl-avatar`, `.csl-who` | The header, the avatar or initial, and the name block |
| `.csl-name`, `.csl-handle`, `.csl-time` | The author, the handle, and the date |
| `.csl-logo` | The platform's logo, a link to the post when it has a `url` |
| `.csl-text` | The text |
| `.csl-media` | The pictures; `[data-count]` is how many show, up to 4 |
| `.csl-counts`, `.csl-count` | The counts; `[data-count]` names each one |
| `.csl-chat` | A conversation's card; `[data-platform]` names the platform and `[data-request]` marks a message request |
| `.csl-chat-head`, `.csl-chat-title`, `.csl-request` | The header, its title, and the "Message request" pill |
| `.csl-messages`, `.csl-message` | The list of messages and each one; `[data-me]` marks yours, `[data-start]` and `[data-end]` the first and last of a run |
| `.csl-bubble`, `.csl-from` | A message's bubble and its visible sender name, when shown |

```css
.csl {
  max-width: 32rem;
}
```
