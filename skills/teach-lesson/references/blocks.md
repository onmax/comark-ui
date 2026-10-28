# Blocks for a lesson

These blocks come with `comark-ui`, or alone with `comark-steps` and `comark-quiz`. The comark-ui skill (`npx skills add onmax/comark-ui`) documents every block in full.

## The worked example: `::steps`

````md
::steps
### Both load version 7

Ana and Ben each `GET /articles/42`, and both get `ETag: "v7"`.

### Ana saves first

```http
PUT /articles/42
If-Match: "v7"
```
::
````

Each `###` heading starts a step that holds everything up to the next one, code blocks included. Put any introduction above the block, since a paragraph before the first heading is reported. For steps of one line each, a numbered list inside `::steps` works too.

## The check: `::question`

```md
::question{#etag-no-if-match}
Ben's editor sends his `PUT` with no `If-Match` header. What happens?

- [x] The server saves Ben's version and Ana's fix is lost
  > Without `If-Match` there's no condition to fail.
- [ ] The server refuses the save with a 412 status code
  > A 412 needs a condition that failed.

#hint
What does the server compare the label against?

#explain
`If-Match` is opt-in.
::
```

- Mark the right option `[x]`. One `[x]` makes radio buttons; add `multiple` to the block for checkboxes with several right options.
- The `>` quote under an option is its rationale, shown once the reader answers.
- `#hint` is optional, shown on request; `#explain` shows after any answer.
- Options are shuffled the same way on every render; write `shuffle="false"` only when their order means something, such as numbers in order.
- Give the block an `#id` so a host can store the answer. Without one, the id comes from the question's text and changes when you edit it.

Without its script, the question and an answer disclosure still render as plain HTML.

## The fact to keep: `::recall`

```md
::recall{#etag-412}
What does a server answer when `If-Match` names an old version?

#answer
`412 Precondition Failed`, and it leaves the resource unchanged.
::
```

The reader answers in their head, then reveals `#answer`.
