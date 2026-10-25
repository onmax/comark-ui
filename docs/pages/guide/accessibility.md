---
title: Accessibility
description: How the blocks work with a keyboard, a screen reader, and reduced motion.
keywords: a11y, WAI-ARIA, ARIA, keyboard, screen reader, focus, reduced motion, alt text
tagline: The blocks render native HTML where it exists, follow the WAI-ARIA patterns where it doesn't, and read without a script.
---

## Reads without a script

Every block renders HTML that reads top to bottom before any script runs. A script only adds behavior: switching tabs, zooming, moving between slides, copying code. A reader with scripts off, a feed reader, or an agent fetching the page still gets every word.

## Native elements first

A block uses the HTML element made for its job, so browsers and screen readers already know it:

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

Status messages, such as "Copied" after a code block's copy button or a quiz's result, go in a live region, so a screen reader announces them.

## Focus

- An item that opens something, such as a zoomable image, is a tab stop. Focus returns to it when what it opened closes.
- A dialog keeps focus inside it while it is open.
- Every focusable part shows a ring in `--comark-ring`. [Theming](/guide/theming/) sets its color.

## Reduced motion

When the reader asks for reduced motion, zoom skips its opening and closing animations, and carousels scroll instantly. Tabs replace the sliding indicator with a 150 ms opacity fade. Some blocks retain other transitions; reduced motion does not disable every animation.

## Links

- A link card is one link named after its title, so a screen reader hears one link, not the card's whole text.
- [Links](/links/) can mark external links that open in a new tab, and warns before they do.

## What you write

The blocks can only pass on what the document gives them:

- Give every image `alt` text that says what it shows. [comark-linter](/lint/) reports images without it.
- Give a zoomed block, a comparison, and a carousel a `title`, so a screen reader can name them.
- Keep headings in order. The table of contents and heading links follow them.
