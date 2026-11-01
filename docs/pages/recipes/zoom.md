---
title: Screenshots in a zoom group
description: Annotated screenshots spread across a page, paged through in one zoomed view.
tagline: Wrap screenshots in ::zoom blocks with one group, and the reader pages through all of them, marks and notes included, without scrolling back.
install: pnpm add comark @comark/html comark-ui
---

::example{label="Zoom group"}
```md
At 640px, moon phase and vibes push the filters onto a second row.

::zoom{group="toolbar" title="Before"}
:::screenshot{src="/before.png" alt="Filter toolbar wrapping onto a second row" viewport="640x250"}
::::annotation{x=22.4 y=50.4 w=13.3 h=20.6 mark="circle" color="red"}
**Apply** sits 6px lower than the chips.
::::
:::
::

With moon phase and vibes behind **+2 filters**, everything fits on one row.

::zoom{group="toolbar" title="After"}
:::screenshot{src="/after.png" alt="Filter toolbar on one row" viewport="640x250"}
::::annotation{x=82.5 y=33.1 w=10.9 h=16 mark="check" color="green"}
**Apply** lines up with the chips.
::::
:::
::
```
::

Click either screenshot. The zoomed view holds both, and its arrows, the strip at the bottom, or the arrow keys move between them.

## When to use it

A screenshot zooms on its own, with its notes beside it. Use a group for screenshots that belong together but have text between them, such as the steps of a bug report. For two screenshots of one view side by side, use [`::compare`](/annotate/components/compare/), which already zooms as one gallery.

## How it works

`::zoom` zooms the whole block, so the screenshot keeps its marks and numbered notes. Its `title` names the item in the zoomed view's header and strip.

Items with the same `group` share one zoomed view, in page order. A group can mix screenshots with plain images, tables, or code:

```md
::zoom{group="toolbar" title="The design"}
![Filter toolbar mockup](/mockup.png)
::
```
