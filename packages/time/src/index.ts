import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { hash, text } from "../../../shared/text.ts";

export type TimeMeta = {
  /** One readable sentence per problem with a `:time`. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

export type TimeOptions = {
  /**
   * When parsing starts, as a date, an ISO string, or milliseconds. Every `:time` in a document is measured against
   * it, so the output is the same each time it's rendered. Defaults to the moment the document is parsed.
   */
  now?: Date | string | number;
  /** How far from now a date stops reading as relative, as a number and a unit (`3w`), or `none`. Default `4w`. */
  threshold?: string;
  /** A BCP 47 tag for the words and the date format. Defaults to the runtime's locale. */
  locale?: string;
  /** An IANA zone for the time of day and for which day is today. Defaults to the runtime's zone. */
  timeZone?: string;
};

/**
 * What a `:time` becomes. `datetime` is the ISO date (or the UTC instant, with a time), `label` what the page shows,
 * `tip` the text of the tooltip, and `mode` whether `label` is relative or a date.
 */
export type TimeAttributes = {
  id?: string;
  datetime?: string;
  mode?: "relative" | "absolute";
  label?: string;
  tip?: string;
};

/** The tag a `:time` becomes, so a `<time>` that another plugin or the author writes never reaches its components. */
export const TIME_TAG = "relative-time";

type Issue = { rule: `comark/time/${string}`; message: string };
type Data = Parameters<typeof resolveAttributes>[1];
type Moment = { at: number; wall: boolean };

const DAY = 864e5;
const UNITS = {
  s: 1e3,
  m: 6e4,
  h: 36e5,
  d: DAY,
  w: 7 * DAY,
  mo: 30 * DAY,
  y: 365 * DAY,
} as const;
const THRESHOLD = /^(\d+(?:\.\d+)?)\s*(s|m|h|d|w|mo|y)$/i;
const DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i;
const PROPS = ["threshold"];

/** `3w` or `12h` in milliseconds, `Infinity` for `none`, and `undefined` for anything else. */
function duration(value: string): number | undefined {
  if (/^(none|never)$/i.test(value)) return Number.POSITIVE_INFINITY;
  const [, amount, unit] = THRESHOLD.exec(value) ?? [];
  const per = new Map<string, number>(Object.entries(UNITS)).get(unit?.toLowerCase() ?? "");
  return amount && per ? Number(amount) * per : undefined;
}

const parts = (zone: string, at: number) => {
  const found = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(at)
      .map((part) => [part.type, Number(part.value)]),
  );
  // SAFETY: the formatter above asks for exactly these six numeric fields, so each is present.
  return found as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
};

/** How far `zone` is ahead of UTC at `at`, in milliseconds. */
function offsetAt(zone: string, at: number): number {
  const p = parts(zone, at);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1e3) * 1e3
  );
}

/** A date or date and time as written. A date alone is a calendar day (`wall`), and a time with no offset is `zone`'s. */
function moment(value: string, zone: string): Moment | undefined {
  const match = DATE.exec(value);
  if (!match) return undefined;
  const field = (at: number) => Number(match[at] ?? 0);
  const [year, month, day, hour, minute, second] = [
    field(1),
    field(2),
    field(3),
    field(4),
    field(5),
    field(6),
  ];
  const stamp = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(stamp);
  // Date.UTC rolls 31 February into March, so a date that doesn't come back as written isn't one.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return undefined;
  if (match[4] === undefined) return { at: Math.floor(stamp / DAY) * DAY, wall: true };
  const offset = match[7];
  if (offset?.toUpperCase() === "Z") return { at: stamp, wall: false };
  if (offset) {
    const digits = offset.replace(/\D/g, "");
    const minutes = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2));
    return { at: stamp - (offset.startsWith("-") ? -1 : 1) * minutes * 6e4, wall: false };
  }
  return { at: stamp - offsetAt(zone, stamp - offsetAt(zone, stamp)), wall: false };
}

const iso = (when: Moment) =>
  when.wall
    ? new Date(when.at).toISOString().slice(0, 10)
    : new Date(when.at).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Every formatter, built once when the plugin is created: a bad `locale` or `timeZone` throws there, where the
 * developer sees it, rather than in the middle of a document. A date alone is formatted in UTC, so no zone moves its day.
 */
function formatters(locale: string | undefined, zone: string) {
  const date = (timeZone: string, extra: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone, ...extra });
  const both = (extra: Intl.DateTimeFormatOptions) => ({
    wall: date("UTC", extra),
    zoned: date(zone, extra),
  });
  const short = { day: "numeric", month: "short" } as const;
  return {
    relative: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
    short: both(short),
    shortYear: both({ ...short, year: "numeric" }),
    day: date("UTC", { weekday: "short", ...short, year: "numeric" }),
    full: date(zone, {
      weekday: "short",
      ...short,
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    clock: date(zone, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
  };
}

/** The distance to `ms` from now in the largest unit it fills, rounded toward now: "2 days ago", "in 3 weeks". */
function ago(relative: Intl.RelativeTimeFormat, ms: number, wall: boolean): string {
  // A date alone is never closer than today, so it reads "today", not "now".
  const size = wall ? Math.max(Math.abs(ms), DAY) : Math.abs(ms);
  const [unit, per]: [Intl.RelativeTimeFormatUnit, number] =
    size < UNITS.m
      ? ["second", UNITS.s]
      : size < UNITS.h
        ? ["minute", UNITS.m]
        : size < DAY
          ? ["hour", UNITS.h]
          : size < UNITS.w
            ? ["day", DAY]
            : size < UNITS.mo
              ? ["week", UNITS.w]
              : size < UNITS.y
                ? ["month", UNITS.mo]
                : ["year", UNITS.y];
  return relative.format(Math.trunc(ms / per) || 0, unit);
}

function props(node: ElementNode, name: string, issues: Issue[]) {
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/time/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`:time\`, so it's ignored. Use \`threshold\`.`,
      });
  }
}

const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";

/**
 * Turns `:time[2026-10-12]` into a `relative-time` node that reads "3 days ago" and, from `threshold` on, "Oct 12" or
 * "Oct 12, 2025", with the full date as its tooltip. Everything is worked out against one `now` per document, so
 * rendering twice gives the same words. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<TimeOptions, TimeMeta>((settings = {}) => {
  const zone = settings.timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const format = formatters(settings.locale, zone);
  const fallback = duration(settings.threshold ?? "4w");
  if (fallback === undefined)
    throw new RangeError(
      `comark-time: threshold "${settings.threshold}" isn't a duration. Write a number and a unit, such as "3w", or "none".`,
    );

  return {
    name: "comark-time",
    post(state) {
      const { tree } = state;
      const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
      const now = settings.now === undefined ? Date.now() : new Date(settings.now).getTime();
      const today = Math.floor((now + offsetAt(zone, now)) / DAY);
      const year = parts(zone, now).year;
      const issues: Issue[] = [];
      const prefix = `ctm-${hash(state.markdown)}`;
      let count = 0;

      // A date it can't draw becomes a span of the text as written, in place, since a child list can't be replaced from here.
      const asWritten = (node: ElementNode, shown: string) =>
        void node.splice(0, node.length, "span", {}, ...(shown ? [shown] : []));

      const read = (node: ElementNode): void => {
        const name = `\`:time\` ${++count}`;
        const shown = textOf(node).trim();
        props(node, name, issues);
        const attrs = resolveAttributes(node[1], data, { parseJson: true });
        const wanted = text(attrs.threshold);
        const limit = wanted ? duration(wanted) : fallback;
        if (limit === undefined)
          issues.push({
            rule: "comark/time/invalid-threshold",
            message: `${name}: \`threshold="${wanted}"\` isn't a duration. Write a number and a unit, such as \`threshold="3w"\`, or \`none\` to keep it relative.`,
          });
        if (!shown) {
          issues.push({
            rule: "comark/time/missing-date",
            message: `${name} has no date. Write the date in brackets, such as \`:time[2026-10-12]\`.`,
          });
          return asWritten(node, "");
        }
        const when = moment(shown, zone);
        if (!when) {
          issues.push({
            rule: "comark/time/invalid-date",
            message: `${name}: "${shown}" isn't a date, so it's shown as written. Write it as \`2026-10-12\` or \`2026-10-12T14:03:00Z\`.`,
          });
          return asWritten(node, shown);
        }
        // A date alone counts whole days from today, whatever the time of day.
        const distance = when.wall ? (when.at / DAY - today) * DAY : when.at - now;
        const relative = ago(format.relative, distance, when.wall);
        const absolute = Math.abs(distance) >= (limit ?? fallback!);
        const sameYear =
          (when.wall ? new Date(when.at).getUTCFullYear() : parts(zone, when.at).year) === year;
        const label = absolute
          ? (sameYear ? format.short : format.shortYear)[when.wall ? "wall" : "zoned"].format(
              when.at,
            )
          : relative;
        const tip = !absolute
          ? (when.wall ? format.day : format.full).format(when.at)
          : when.wall
            ? relative
            : `${relative} · ${format.clock.format(when.at)}`;
        node.splice(0, node.length, TIME_TAG, {
          id: `${prefix}-${count}`,
          datetime: iso(when),
          mode: absolute ? "absolute" : "relative",
          label,
          tip,
        });
      };

      const walk = (nodes: Node[]) => {
        for (const node of nodes) {
          if (!isElement(node) || node[1].$?.html) continue;
          if (node[0] === "time" && node[1].datetime === undefined) read(node);
          else walk(childrenOf(node));
        }
      };
      walk(tree.nodes);
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
