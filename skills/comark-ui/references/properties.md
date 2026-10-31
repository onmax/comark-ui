# A properties box from the frontmatter

comark-properties shows chosen frontmatter keys, such as a review's status, pull request, author, date, and tags, as a box of properties on the page. Use it when a reviewer should scan those facts first, and a script should read them from the frontmatter too.

## Syntax

```md
---
status: Ready for review
pr: https://github.com/onmax/comark-ui/pull/111
author: onmax
date: 2026-10-23
tags: [colors, docs]
---

# Palette page

::properties
::

The palette page now shows every token of the theme.
```

- The box shows the host's `keys`, by default `status`, `pr`, `author`, `date`, and `tags`, in that order. A key that's missing or empty is skipped, and the rest of the frontmatter, such as a layout or a slug, stays off the page.
- The box goes first in the document. To put it somewhere else, such as under the title, write `::properties` there and close it with `::` on the next line. It takes no props and no content; choosing keys is the host's job.
- Text, a number, `true`, and `false` show as written, and so does a date such as `2026-10-23`. A GitHub or GitLab pull request, merge request, or issue link shows as `owner/repo#123`, any other http(s) link as its host and path, and a list as one badge per item. An object or a list of lists doesn't show, and is reported.
- Each label is its key capitalized, with dashes and underscores as spaces, `pr` as PR, and `url` as URL, unless the host names it.

## Register

- In `comark-ui`: on, with the default keys, so a document whose frontmatter has any of them gets the box at the top. `properties: { keys: ["status", "owner", "due"], labels: { due: "Due date" } }` picks the keys and their order and names their labels. `top: false` shows the box only where `::properties` sits.
- Alone: `pnpm add comark @comark/html comark-properties`, then `createHtmlRenderer({ plugins: [properties()], components })` with both from `comark-properties/html`. It takes the same options. `comark-properties/vue`, `/react`, and `/svelte` render it too.
