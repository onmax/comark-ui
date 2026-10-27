# ETags stop lost updates

After this lesson you can predict what a server does when two people save the same record, with and without `If-Match`.

## Why it matters

Ana and Ben open the same help article. Ana fixes a typo and saves. Ben adds a paragraph and saves a minute later. Ben's save carries the article as he loaded it, typo included, so Ana's fix is gone and nobody is told. That's a **lost update**.

## The idea

An **ETag** is a version label the server sends with a resource, such as `"v7"`. A client that wants to change the resource sends the label back in `If-Match`. The server applies the change only if the label still matches the current version; otherwise it refuses with `412 Precondition Failed`, and nothing is overwritten.

## Worked example

::steps
### Both load version 7

Ana and Ben each `GET /articles/42`, and both get `ETag: "v7"`.

### Ana saves first

```http
PUT /articles/42
If-Match: "v7"
```

The article is still at `"v7"`, so the server saves it and answers `200 OK` with `ETag: "v8"`.

### Ben saves second

```http
PUT /articles/42
If-Match: "v7"
```

The article is now at `"v8"`. The labels differ, so the server answers `412 Precondition Failed` and Ana's fix stays.

### Ben reloads and merges

Ben's editor fetches `"v8"`, shows him Ana's change next to his, and he saves again with `If-Match: "v8"`.
::

## Check yourself

::question{#etag-no-if-match}
Ben's editor is older and sends his `PUT` with no `If-Match` header. The article is at `"v8"`. What happens?

- [x] The server saves Ben's version and Ana's fix is lost
  > Without `If-Match` there's no condition to fail, so the server overwrites. This is the lost update again.
- [ ] The server refuses the save with a 412 status code
  > A 412 needs a condition that failed. Ben sent none, so there's nothing to compare.
- [ ] The server merges Ben's paragraph into version 8
  > HTTP servers don't merge bodies. Merging is the client's job after a 412.

#explain
`If-Match` is opt-in. The protection only exists when the client sends the version it started from, which is why an API can require it and answer `428 Precondition Required` when it's missing.
::

::recall{#etag-412}
What does a server answer when `If-Match` names an old version?

#answer
`412 Precondition Failed`, and it leaves the resource unchanged.
::

## Read next

[RFC 9110, section 13.1.1](https://www.rfc-editor.org/rfc/rfc9110#name-if-match) defines `If-Match` in a page. Next lesson: weak ETags, and why `W/"v7"` never matches `If-Match`.
