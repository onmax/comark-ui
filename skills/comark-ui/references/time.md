# Dates as relative time

comark-time draws `:time[2026-11-02]` as the words a reader would say, such as "2 days ago" or "in 3 weeks", and past a threshold as a date, such as "Sep 30". Hover or focus opens a tooltip with the full date and time. Use it where a document says when something happened or will: when a pull request opened, when a benchmark ran, when a deadline falls. Write the date in ISO form and leave the words to the plugin.

## Syntax

```md
Opened :time[2026-11-02], last run :time[2026-11-04T11:59:56Z], due :time[2026-11-25].

The first sighting was :time[2026-09-30]{threshold="8w"}.
```

- The date goes in the brackets: `2026-11-02`, or with a time of day, `2026-11-02T09:30:00Z`. A date alone counts whole days, so it reads "today", "yesterday", "2 days ago", or "in 3 days", never hours. A time with no offset is in the `timeZone` option's zone.
- `threshold` sets how far from now it stops reading as relative: a number and `s`, `m`, `h`, `d`, `w`, `mo`, or `y`, such as `3w`. The default is `4w`. `none` keeps it relative at any distance.
- Past the threshold the text is "Sep 30", or "Sep 30, 2025" in another year, and the tooltip shows how far away it is. Before it, the tooltip shows the full date, with the time and zone when the date has one.
- No script runs. The words are worked out while parsing and are fixed in rendered HTML, so "2 days ago" stays that until the document is parsed again.

## Write the dates

- Write the exact date from the source: the pull request's `createdAt`, the report's timestamp. Never write "yesterday" or "last week" in prose for a date a reader may look up.
- A zone-less date and time is read in the host's zone, which the reader can't see. Give a time an offset, such as `Z`, unless it is the author's local time.
- A date the plugin can't read, such as `next friday` or `2026-02-31`, is shown as written and reported. Fix it to ISO.
- Leave the threshold alone unless a date is better read as one or the other: `threshold="none"` for a date that must always read relative, a short one such as `1w` for a date that is better absolute within a month.

## Register

- In `comark-ui`: on. `comarkUi({ time: { now, threshold, locale, timeZone } })` passes its options; `now` pins the moment every date is measured from, which a host that caches rendered HTML should do. `time: false` turns it off.
- Alone: `pnpm add comark @comark/html comark-time`, then `createHtmlRenderer({ plugins: [time()], components })` with both from `comark-time/html`. `comark-time/vue`, `/react`, and `/svelte` render it too. It has no script.
