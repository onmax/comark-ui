# ETags stop lost updates

After this lesson, you can predict how a server handles two changes to the same record with or without `If-Match`.

## Why it matters

In this example, Ana and Ben open the same help article. Ana corrects a spelling error and saves the article. Ben adds a paragraph to his older copy and saves it. His save removes Ana's correction without a warning. This is a **lost update**.

## The idea

An **ETag** is a version label, such as `"v7"`, that the server sends with a resource. To change that resource safely, the client sends the label back in the `If-Match` header. If the labels match, the server saves the change. If the labels differ, the server returns `412 Precondition Failed` and keeps the resource unchanged.

## Worked example

::steps
### Both load version 7

Ana and Ben each `GET /articles/42`, and both get `ETag: "v7"`.

### Ana saves first

```http
PUT /articles/42
If-Match: "v7"
```

The article is still at `"v7"`. The server saves Ana's change and returns `200 OK` with `ETag: "v8"`.

### Ben saves second

```http
PUT /articles/42
If-Match: "v7"
```

The article is now at `"v8"`. The labels differ, so the server returns `412 Precondition Failed`. Ana's correction stays.

### Ben reloads and merges

Ben's editor fetches `"v8"` and shows Ana's correction. Ben adds his paragraph to that version. He saves again with `If-Match: "v8"`.
::

## Check yourself

::question{#etag-no-if-match}
This API accepts requests without `If-Match`. Ben's editor sends his `PUT` without that header. The article is at `"v8"`. What happens?

- [x] The server saves Ben's version and removes Ana's correction
  > Without `If-Match`, the server has no version condition to check. The server saves Ben's version. This removes Ana's correction.
- [ ] The server refuses the save with a 412 status code
  > A 412 response requires a condition that failed. Ben sent no condition, so the server has no labels to compare.
- [ ] The server merges Ben's paragraph into version 8
  > The server does not combine the two versions. After a 412 response, the client must get the current version and combine the changes.

#explain
The client must send its original version label for `If-Match` to protect the change. An API can require that header. If the header is absent, that API can return `428 Precondition Required`.
::

::recall{#etag-412}
What does a server answer when `If-Match` names an old version?

#answer
`412 Precondition Failed`, and it leaves the resource unchanged.
::

## Read next

[RFC 9110, section 13.1.1](https://www.rfc-editor.org/rfc/rfc9110#name-if-match) defines `If-Match`.

The next lesson explains weak ETags and why `W/"v7"` never matches `If-Match`.
