import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { hash, text } from "../../../shared/text.ts";
import { describeTime } from "./describe.ts";

export { describeTime } from "./describe.ts";
export type { DescribeTimeOptions, TimeDescription } from "./describe.ts";

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
  /** How far from now a date stops reading as relative, as a number and a unit (`3w`), or `none`. Default `3w`. */
  threshold?: string;
  /** A BCP 47 tag for the words and the date format. Default `en-US`. */
  locale?: string;
  /**
   * An IANA zone for the time of day and for which day is today. Defaults to the runtime's zone.
   * Local times in a clock gap are invalid; repeated times use the earlier instant.
   */
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
  locale?: string;
  threshold?: string;
};

/** The tag a `:time` becomes, so a `<time>` that another plugin or the author writes never reaches its components. */
export const TIME_TAG = "relative-time";

type Issue = { rule: `comark/time/${string}`; message: string };
type Data = Parameters<typeof resolveAttributes>[1];

const PROPS = ["threshold"];
const DURATION = /^(?:none|never|\d+(?:\.\d+)?\s*(?:s|m|h|d|w|mo|y))$/i;

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
  const fallback = settings.threshold ?? "3w";
  const configuredNow = settings.now === undefined ? undefined : new Date(settings.now).getTime();
  // A bad `threshold`, `now`, `locale`, or `timeZone` throws here, where the developer sees it, rather than in the
  // middle of a document.
  describeTime(0, { ...settings, now: settings.now === undefined ? 0 : configuredNow });

  return {
    name: "comark-time",
    post(state) {
      const { tree } = state;
      const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
      const now = configuredNow ?? Date.now();
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
        if (wanted && !DURATION.test(wanted))
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
        const threshold = wanted && DURATION.test(wanted) ? wanted : fallback;
        const time = describeTime(shown, {
          now,
          threshold,
          locale: settings.locale,
          timeZone: settings.timeZone,
        });
        if (!time) {
          issues.push({
            rule: "comark/time/invalid-date",
            message: `${name}: "${shown}" isn't a date, so it's shown as written. Write it as \`2026-10-12\` or \`2026-10-12T14:03:00Z\`.`,
          });
          return asWritten(node, shown);
        }
        node.splice(0, node.length, TIME_TAG, {
          id: `${prefix}-${count}`,
          ...time,
          locale: settings.locale ?? "en-US",
          threshold,
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
