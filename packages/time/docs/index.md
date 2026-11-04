---
title: Time
description: Dates as relative time with a tooltip, written in Markdown.
keywords: relative time, time ago, timeago, date, datetime, timestamp, today, yesterday, in 3 days, Intl.RelativeTimeFormat, relative-time-element, tooltip, moment, dayjs fromNow
tagline: A date that reads "2 days ago" and turns into a date past a threshold, with the full date in a tooltip.
group: Review blocks
icon: clock
blurb: Relative dates with a full-date tooltip
credits: 'After GitHub''s <a href="https://github.com/github/relative-time-element">relative-time-element</a>, with the words from <a href="https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat">Intl.RelativeTimeFormat</a>.'
---

> [!NOTE]
> The examples on this page are measured from 4 November 2026, 12:00 UTC.

::examples
:::example{label="Relative"}
```md
Opened :time[2026-11-02], last touched :time[2026-11-04T11:59:56Z], due :time[2026-11-25].
```
:::

:::example{label="Past the threshold"}
```md
The first sighting was :time[2026-09-30], and the pigeon census is due :time[2026-12-25].
```
:::

:::example{label="Last year"}
```md
Shipped :time[2025-09-30].
```
:::

:::example{label="Threshold"}
```md
Two thresholds for one date: :time[2026-09-30] and :time[2026-09-30]{threshold="8w"}.
```
:::
::

## Features

- `:time` turns a date into the words a reader would say: "today", "yesterday", "2 days ago", "in 3 weeks".
- Past a threshold, 4 weeks by default, it shows the date instead: "Sep 30", or "Sep 30, 2025" in another year.
- Hover or focus opens a tooltip with the full date and time, or with how far away the date is once it shows as a date. It opens above the text, or below where the page has no room, and grows from the edge that touches the text.
- No script runs. The plugin works out the words, the date, and the tooltip while parsing, and the tooltip is CSS.
- Everything is measured from one `now` per document, so rendering twice gives the same words.

## Usage

Write the date in brackets.

::example
```md
The review opened :time[2026-11-02].
```
::

### Date

Write an ISO date, such as `2026-11-04`, or an ISO date and time, such as `2026-11-04T09:30:00Z`. A date alone counts whole days from today, so it never reads "5 hours ago". A time with no offset is in the `timeZone` option's zone.

Fractional seconds use one to three digits, such as `2026-11-04T09:30:00.250Z`; finer precision is reported as invalid. A local time skipped when the clocks move forward is also invalid. When the clocks move back and a local time occurs twice, the earlier instant is used. Give an explicit offset to choose the other instant.

::example
```md
:time[2026-11-04], :time[2026-11-03], :time[2026-11-02T09:30:00Z], :time[2026-11-04T11:59:56Z], :time[2026-11-05]
```
::

The words come from `Intl.RelativeTimeFormat`, so they follow the `locale` option, and a date up to a minute away counts in seconds, up to an hour in minutes, up to a day in hours, up to a week in days, and then in weeks, months, and years. A number is cut toward now, so 2.9 days reads "2 days ago".

### Threshold

Use the `threshold` prop to set how far from now a date stops reading as relative. Write a number and a unit: `s`, `m`, `h`, `d`, `w`, `mo`, or `y`. The default is `4w`.

::example
```md
:time[2026-10-20]{threshold="2w"} and :time[2026-10-20]{threshold="8w"}
```
::

Write `none` to keep a date relative at any distance, such as "3 years ago".

> [!NOTE]
> A date exactly at the threshold shows as a date.

### Tooltip

A time reads as plain text. Hover it for 300 milliseconds, or focus it with the keyboard or a tap, and a pill with the full date opens above it. Where the page has no room above, near the top of the window, it opens below. The pill scales from the edge that touches the text, starting a few pixels toward it, in 140 milliseconds, and leaves in 100.

::example
```md
Merged :time[2026-11-02T09:30:00Z], planned for :time[2026-12-25].
```
::

With a time of day, the tooltip shows it with its zone: "Mon, Nov 2, 2026, 9:30 AM UTC". Once the text is a date, the tooltip shows how far away it is.

## Examples

### Pin the clock

Pass `now` so the words don't depend on when the document is parsed. A host that caches rendered HTML should do this, or pass the moment the document was written.

```ts
import time from "comark-time";

const plugin = time({ now: "2026-11-04T12:00:00Z" });
```

> [!WARNING]
> Rendered HTML keeps the words it was parsed with. "2 days ago" stays that until you parse again, so re-render cached pages, or render in the reader's browser with Vue, React, or Svelte.

### A reader's zone and language

Use `timeZone` and `locale` to set the day that counts as today, the time shown, and the language of the words.

```ts
time({ timeZone: "Europe/Madrid", locale: "es" });
```

### A threshold for every date

Use the `threshold` option to change the default for every `:time`. A `threshold` prop still wins.

```ts
time({ threshold: "2w" });
```

## Accessibility

A time is a `<time datetime>` with `tabindex="0"`, so a keyboard reaches it and a tap focuses it. The tooltip has `role="tooltip"`, and the time points to it with `aria-describedby`, so a screen reader reads "2 days ago" and then the full date. The pill opens when the time has focus and closes when it loses it. On a touch screen, a tap opens it and a tap elsewhere closes it. The pill is not a target: it passes the pointer through to the text.

Reduced motion shows the pill without a transition.

### Keyboard interactions

| Key | Description |
| --- | --- |
| <kbd>Tab</kbd> | Focuses the time and opens its tooltip. |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves focus off the time and closes its tooltip. |

## API

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `threshold` | `4w` | How far from now the text stops being relative, as a number and a unit (`s`, `m`, `h`, `d`, `w`, `mo`, `y`), or `none`. |

The date is the content in brackets. It isn't a prop.

### Options

| Option | Default | Description |
| --- | --- | --- |
| `now` | The moment of parsing | The date, ISO string, or milliseconds every `:time` is measured from. |
| `threshold` | `4w` | The default for the `threshold` prop. |
| `locale` | The runtime's | A BCP 47 tag, such as `es`, for the words and the date format. |
| `timeZone` | The runtime's | An IANA zone, such as `Europe/Madrid`, for which day is today and for the time shown. |

A `now`, `threshold`, `locale`, or `timeZone` the runtime can't read throws when the plugin is created, not while a document renders. A configured `now` is captured then, so changing a passed `Date` later doesn't change the clock.

### Issues

The plugin adds these problems to `meta.issues`, as [Validation](/guide/validation/) describes:

- A `:time` with no date.
- A date that isn't `2026-10-12` or `2026-10-12T14:03:00Z`. The text stays as written.
- A `threshold` that isn't a number and a unit.
- A prop `:time` doesn't read.

Each issue names its block and says how to fix it, and each has its own rule in [Doctor](/doctor/):

```txt
`:time` 1: "next friday" isn't a date, so it's shown as written. Write it as `2026-10-12` or `2026-10-12T14:03:00Z`.
```

### Package

comark-ui brings `comark-time` and registers it. To use it alone, install it with Comark and a renderer:

```sh
pnpm add comark @comark/html comark-time
```

Register the plugin and pass the renderer's `components`:

```ts
import { createHtmlRenderer } from "@comark/html";
import time, { components } from "comark-time/html";

const render = createHtmlRenderer({ plugins: [time()], components });
```

For Vue, React, or Svelte, import from `comark-time/vue`, `comark-time/react`, or `comark-time/svelte`. The components add the styles when they mount. Import `comark-time/style.css` with your styles so a server-rendered page doesn't shift. [Renderers](/guide/renderers/) covers using it with other plugins.

## Theme

The tooltip is a card in the style of shadcn/ui's Tooltip, with the shared border and shadow. The rules sit in a `comark` CSS layer, so any plain rule of yours wins.

### Shared tokens

Times read these [shared tokens](/guide/theming/):

| Token | Used for |
| --- | --- |
| `--comark-accent` | The text's tint on hover and focus |
| `--comark-ring` | The focus outline |
| `--comark-background` | The tooltip's background |
| `--comark-foreground` | The tooltip's text |
| `--comark-border` | The tooltip's border |
| `--comark-shadow` | The tooltip's shadow |
| `--comark-radius` | The corner radius |
| `--comark-font` | The tooltip's text |

### Durations

Set `--ctm-enter` (140ms) and `--ctm-exit` (100ms) on a time or any ancestor to change how long the tooltip takes to open and close.
