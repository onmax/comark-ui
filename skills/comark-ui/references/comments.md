# Suggestions and comments

comark-comments draws suggested edits and comments on a span of prose, each with its note in a card in the margin beside its line, as in a Google Docs or Word review. Use it to review copy or a docs page, where each change needs a reason and a comment can get a reply. For marks with no notes or margin, which a host can also accept or reject, use [critic](critic.md). For a change to code, write a `::diff`.

## Syntax

```md
To :suggestion[sign in]{from="log in" by="Claude" note="The button says Sign in."}, enter your email.

:suggestion[]{from="simply" by="Claude" note="“Simply” tells a stuck reader it should have been easy."} Enter the email you signed up with.

The link expires after :comment[15 minutes]{#ttl by="@onmax" note="Is 15 minutes enough when email is slow?"}.

:comment{reply="ttl" by="Claude" note="Keeping 15. The email has a resend button."}
```

| Write | Is |
| --- | --- |
| `:suggestion[new]{from="old"}` | A replacement: `old` struck, `new` inserted |
| `:suggestion[]{from="old"}` or `:suggestion{from="old"}` | A deletion |
| `:suggestion[new]` | An insertion |
| `:comment[words]{note="…"}` | A comment on `words` |
| `:comment{reply="id" note="…"}` | A reply to the comment or suggestion with `#id` |

| Prop | On | What it does |
| --- | --- | --- |
| `from` | suggestion | The text it replaces or deletes. Plain text. |
| `by` | both, reply | The author, shown as written; a leading `@` is dropped. The avatar is the name's initial. |
| `note` | both, reply | The card's text. Plain text. A suggestion with no note and no replies is only a redline, with no card. |
| `mark` | suggestion | `track` (default): red strike, green insert. `pen`: a hand-drawn strike with the new words handwritten above. |
| `#id` | both | The id a reply points at. Comments and suggestions share one id space. |
| `reply` | reply | The `#id` of the thread it joins. |

- A reply can sit anywhere in the document; it moves into its thread, and the paragraph it leaves empty is dropped. Put replies after the paragraph, or at the end.
- Pen fits short changes only: both sides 24 characters or fewer, on one line, and plain text. Anything else draws as `track`, with no issue.
- Write suggestions and comments in paragraphs and list items. In a heading or a table cell, and inside another one, they draw without a card, and the linter reports them.
- On a page 50rem wide or more, each card sits in the right margin level with its line. On a narrow page the reader clicks a bubble to open its card under the line.
- Don't overlap two anchors. Mark the words once, and reply to the thread.

## Register

- In `comark-ui`: on, as `comments`, in `comark-ui/html` only. `comments: { mark: "pen" }` draws every suggestion with the pen unless it sets its own `mark`.
- Alone: `pnpm add comark @comark/html comark-comments`, then `createHtmlRenderer({ plugins: [comments()], components })` with `comments, { components }` from `comark-comments/html`. There are no Vue, React, or Svelte entries.
