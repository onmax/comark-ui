---
title: Accessibility
description: How the blocks work with a keyboard, a screen reader, and reduced motion.
keywords: a11y, WAI-ARIA, ARIA, keyboard, screen reader, focus, reduced motion, alt text
tagline: The blocks render native HTML where it exists, follow the WAI-ARIA patterns where it doesn't, and read without a script.
---

## Reads without a script

Every block's HTML reads top to bottom before any script runs. Scripts only add behavior: switching tabs, zooming, changing slides, copying code. A reader with scripts off, a feed reader, or an agent fetching the page gets every word.

## Native elements first

Each block uses the HTML element made for its job:

| Block | Renders |
| --- | --- |
| [Details](/details/) | `<details>` with a real `<summary>`, so it opens with no script |
| [Definition lists](/deflist/) | `<dl>`, `<dt>`, and `<dd>` |
| [Figure](/figure/) | `<figure>` with a `<figcaption>` |
| [Keys](/keys/) | A `<kbd>` for each key |
| [Mark](/mark/) | `<mark>` and `<sup>` |
| [Critic](/critic/) | `<ins>`, `<del>`, and `<mark>` |

## WAI-ARIA patterns

When no element fits, a block follows the matching [WAI-ARIA pattern](https://www.w3.org/WAI/ARIA/apg/patterns/). Each block's page lists its keys under Accessibility.

| Block | Pattern | Keys |
| --- | --- | --- |
| [Tabs](/tabs/) | [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | `ArrowLeft`, `ArrowRight`, `Home`, `End` |
| [Carousel](/carousel/) | [Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) | `ArrowLeft`, `ArrowRight` |
| [Zoom](/zoom/) | [Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | `Enter`, `Space`, `Escape`, `ArrowLeft`, `ArrowRight` |
| [Annotate](/annotate/)'s compare slider | [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) | Arrow keys, `Home`, `End`, `PageUp` (+25%), `PageDown` (−25%) |

Status messages, such as "Copied" from a code block or a quiz's result, go in a live region that screen readers announce.

## Focus

- Anything that opens something, such as a zoomable image, is a tab stop, and focus returns to it on close.
- A dialog keeps focus inside while open.
- Every focusable part shows a ring in `--comark-ring`. [Theming](/guide/theming/) sets its color.

## Reduced motion

With reduced motion on, zoom skips its open and close animations, and carousels scroll instantly. Tabs fade the indicator over 150 ms instead of sliding it. Some blocks keep other transitions.

## Links

- A link card is one link, named after its title rather than the card's whole text.
- [Links](/links/) can mark external links that open in a new tab, with a warning before they do.

## What you write

The blocks only pass on what you write:

- Give every image `alt` text that says what it shows. [comark-linter](/lint/) reports images without it.
- Give zoomed blocks, comparisons, and carousels a `title` so a screen reader can name them.
- Keep headings in order. The table of contents and heading links follow them.
