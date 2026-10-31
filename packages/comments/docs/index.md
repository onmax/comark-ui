---
title: Comments
description: Suggested edits and comment threads in Markdown, with each note in a card in the margin beside its line.
keywords: suggestions, suggest edits, suggesting mode, track changes, redline, review comments, margin comments, google docs comments, word comments, copy review, proofreading
tagline: Suggested edits and comments on a span of text, each with its note in a card in the margin, level with its line.
group: Review blocks
icon: message-square-text
blurb: Suggested edits and comment threads
credits: 'Margin comments as in Google Docs and Microsoft Word. The handwriting is <a href="https://github.com/googlefonts/caveat">Caveat</a>, by Impallari Type.'
---

::examples
:::example{label="Sign-in copy review"}
```md
To :suggestion[sign in]{from="log in" by="Claude" note="The button says Sign in."}, :suggestion[]{from="simply" by="Claude" note="“Simply” tells a stuck reader it should have been easy."} enter the email you signed up with and we’ll send you a link. The link expires after :comment[15 minutes]{#ttl by="@onmax" note="Is 15 minutes enough when email is slow? Support gets tickets about expired links."} :suggestion[and works once]{by="Codex" note="People reuse old links and hit an error."}.

:suggestion[If you forget]{from="In the event that you forget" by="Claude" note="Shorter, same meaning."} which email you used, ask :comment[a workspace admin]{by="@farnabaz" note="Can we link to the list of admins here?"}.

Your session lasts 30 days on this device. Signing out on one device doesn’t sign you out on :suggestion[your other devices]{from="the others" by="Codex"}.

:comment{reply="ttl" by="Claude" note="Keeping 15. The email has a resend button, and a longer-lived link is riskier."}

:comment{reply="ttl" by="@atinux" note="Agreed. Mention the resend button in the email itself."}
```
:::

:::example{label="Pen"}
```md
To :suggestion[sign in]{from="log in" mark="pen" by="Claude" note="The button says Sign in."}, enter the email you signed up with. The link expires after 15 minutes :suggestion[and works once]{mark="pen" by="Claude" note="People reuse old links and hit an error."}.

Signing out on one device doesn’t sign you out on :suggestion[your other devices]{from="the others" mark="pen" by="Claude"}.
```
:::
::

## Features

- A suggestion strikes the old words and inserts the new ones, as a redline or in a hand-drawn pen.
- A note opens a card in the margin that starts on its anchor's line, and crowded cards stack down without opening gaps in the text.
- A reply written anywhere in the document joins its thread, and the bubble counts the messages.
- On a phone, a click on a bubble opens its card under the line. In print, the cards stay in a narrower margin.
- No script. An avatar is the image you give the author in `avatars`, or else their initial on a color from the name.
- A screen reader hears "removed" and "added" around each change, and each card is a note that starts with its author.

## Usage

Write `:suggestion` with the new text in its brackets and the old text in `from`:

::example
```md
To :suggestion[sign in]{from="log in" note="The button says Sign in."}, enter your email.
```
::

### Deletion

Use empty brackets, or none, with `from` to suggest removing words:

::example
```md
:suggestion[]{from="Simply" note="It tells a stuck reader it should have been easy."} Enter your email.
```
::

### Insertion

Leave out `from` to suggest adding words:

::example
```md
The link expires after 15 minutes :suggestion[and works once]{note="People reuse old links."}.
```
::

### Note

Use the `note` prop to say why. A suggestion with no note and no replies is only a redline, with no card and no bubble:

::example
```md
Signing out doesn’t sign you out on :suggestion[your other devices]{from="the others"}.
```
::

### Author

Use the `by` prop to name who wrote it. It shows as written, without a leading `@`, beside an avatar of its initial, or the image you give that name in the plugin's `avatars`:

::example
```md
To :suggestion[sign in]{from="log in" by="@onmax" note="The button says Sign in."}, enter your email.
```
::

### Mark

Use the `mark` prop to draw a suggestion with a hand-drawn `pen`: the old words struck through and the new ones handwritten above them. An insertion hangs over a caret.

::example
```md
To :suggestion[sign in]{from="log in" mark="pen" note="The button says Sign in."}, enter your email.
```
::

> [!NOTE]
> Pen fits short changes: both sides 24 characters or fewer, on one line, and plain text with no code or links. Any other suggestion draws as `track`.

### Comment

Write `:comment` with the words it's about in its brackets and a `note`:

::example
```md
The link expires after :comment[15 minutes]{by="@onmax" note="Is 15 minutes enough when email is slow?"}.
```
::

### Reply

Give a comment or a suggestion an `#id`, and write `:comment{reply="id"}` with a `note` anywhere in the document. The reply joins that thread, and the paragraph it leaves is dropped:

::example
```md
The link expires after :comment[15 minutes]{#ttl by="@onmax" note="Is 15 minutes enough?"}.

:comment{reply="ttl" by="Claude" note="Keeping 15. The email has a resend button."}
```
::

## Examples

### Pen for the whole document

Pass `mark` to the plugin to draw every suggestion with the pen. A suggestion's own `mark` still wins:

```ts
import comarkUi from "comark-ui/html";

const { plugins, components } = comarkUi({ comments: { mark: "pen" } });
```

### Comments or critic

[Critic](/critic/) reads CriticMarkup: plain inline marks with no notes, which a host shows, accepts, or rejects with its `mode`. Comments are authored suggestions and comment threads, each with its author and its reason in the margin. Use critic to publish an edited draft, and comments for a review someone answers.

## Accessibility

Each deletion and insertion carries hidden text, "[removed: …]" and "[added: …]", since most screen readers say nothing for `<del>` and `<ins>`. Each card has `role="note"` and starts with its author.

The bubble is a checkbox named by its thread, such as "2 comments on “15 minutes”". `Tab` reaches it, and `Space` pins the card's highlight, or on a narrow page opens the card under the line.

## API

### Props

#### Suggestion

| Prop | Default | Description |
| --- | --- | --- |
| `[new]` | — | The new text, in the brackets. Leave it empty, or leave out the brackets, for a deletion. |
| `from` | — | The text it replaces. Leave it out for an insertion. |
| `by` | — | The author, shown without a leading `@`. |
| `note` | — | Why, in plain text. Without it and without replies there is no card. |
| `mark` | `track` | How it draws: `track` or `pen`. |
| `#id` | — | The id a reply points at. |

#### Comment

| Prop | Default | Description |
| --- | --- | --- |
| `[anchor]` | — | The words it's about, in the brackets. |
| `by` | — | The author, shown without a leading `@`. |
| `note` | — | The comment, in plain text. |
| `#id` | — | The id a reply points at. |

#### Reply

| Prop | Default | Description |
| --- | --- | --- |
| `reply` | — | The `#id` of the comment or suggestion it answers. |
| `by` | — | The author, shown without a leading `@`. |
| `note` | — | The reply, in plain text. |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `mark` | `track` | How suggestions draw unless one sets its own `mark`: `track` or `pen`. |
| `avatars` | `{}` | An image URL per author, by the name in `by` without `@`, in any case: `{ onmax: "https://github.com/onmax.png" }`. |

`comments: false` in `comarkUi()` turns it off.

### Issues

The plugin adds a problem with any suggestion, comment, or reply to `meta.issues`, as [Validation](/guide/validation/) describes:

```txt
reply to "tll" matches no comment or suggestion's `#id`, so it renders nothing. Did you mean `reply="ttl"`?
```

It reports:

- A prop it doesn't know, such as `reason` for `note`.
- A suggestion with no new text and no `from`, which renders nothing.
- A suggestion whose `from` is its new text.
- A `mark` other than `track` or `pen`.
- A comment with nothing in its brackets, which renders nothing.
- A comment or a reply with no `note`.
- An `#id` two threads share. Replies go to the first.
- A `reply` that matches no `#id`. It renders nothing.
- A reply with text in its brackets. The text stays where it is.
- A comment or suggestion inside another one, or in a heading or a table cell, where it gets no card.

Each one has its own rule in [Doctor](/doctor/).

### Package

comark-ui brings `comark-comments` and registers it in `comark-ui/html`. To use it alone, install it and pass the renderer's `components`:

```sh
pnpm add comark @comark/html comark-comments
```

```ts
import { createHtmlRenderer } from "@comark/html";
import comments, { components } from "comark-comments/html";

const render = createHtmlRenderer({ plugins: [comments({ mark: "track" })], components });
```

Only the HTML renderer exists: the cards are plain HTML and CSS, so the same output works in any page. [Renderers](/guide/renderers/) covers the rest.

## Theme

The cards and bubbles follow the shared tokens in [Theming](/guide/theming/), and three variables of their own set the marks' colors. The rules sit in a `comark` CSS layer, so a plain rule of your own wins over any of them. The one exception is the margin each block leaves on a wide page, which is `!important` so a page's paragraph margins can't close it.

### Shared tokens

| Token | Used for |
| --- | --- |
| `--comark-background` | The cards and bubbles |
| `--comark-foreground` | The cards' text, and a highlighted bubble |
| `--comark-muted` | The bubbles' count |
| `--comark-border` | The cards' and bubbles' borders, and the line between replies |
| `--comark-ring` | A highlighted card or bubble, and the focus ring |
| `--comark-radius` | The cards' corners |
| `--comark-shadow` | A card while it is open beside the text |
| `--comark-font` | The cards' and bubbles' text |

### Variables

Set these on `.cr` or any ancestor, such as `:root`:

| Variable | Default | Used for |
| --- | --- | --- |
| `--cr-del` | `--comark-danger` | Deleted words, and the pen |
| `--cr-ins` | `--comark-success` | Inserted words |
| `--cr-comment` | amber | A comment's highlight |
| `--cr-icon` | a grey speech bubble | The bubble's icon, as a CSS image |

### Classes and attributes

| Selector | Is |
| --- | --- |
| `.cr` | The root around the document's blocks, when any card goes in the margin |
| `.cr-sg` | A suggestion, with `data-mark` (`track` or `pen`) and `data-kind` (`replace`, `delete`, or `insert`) |
| `.cr-cm` | A comment's anchor, a `<mark>` |
| `.cr-bub` | The bubble, a `<label>` for the hidden `.cr-tg` checkbox |
| `.cr-card` | The card |
| `.cr-entry` | One message in a card: the note, then each reply |
| `.cr-av` | An avatar |

### Example

Blue comments:

```css
:root {
  --cr-comment: #3b82f6;
}
```
