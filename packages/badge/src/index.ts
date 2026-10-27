import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import { liveKey, resolveLive, ttls, type LiveResult } from "./live.ts";
import { badgeKeys, badgeParams, badgeSvg, readBadge, type BadgeSpec } from "./svg.ts";

export type BadgeOptions = {
  endpoint?: string;
  /**
   * Live badges fetch their npm or GitHub data while parsing and are drawn into the document, so a page loads no badge.
   * `false` links them to `endpoint` instead, which stays current but costs each reader a request.
   */
  download?: boolean;
};

export type BadgeMeta = {
  /** One readable sentence per problem with a `:badge`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/badge/${string}`; message: string };

/** Nuxt UI's colors. */
export const colors = [
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "error",
  "neutral",
] as const;

export type BadgeColor = (typeof colors)[number];

/** What a `:badge` or `::badge` becomes: its color, `primary` unless it sets a known one, around its content. */
export type BadgeAttributes = { color?: BadgeColor; src?: string; label?: string };

type Data = Parameters<typeof resolveAttributes>[1];
type Live = { node: ElementNode; spec: BadgeSpec };

const svgSrc = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

// Keep at most 256 successful results across parses. Pending requests are separate so eviction
// never starts a second request for a badge that's still being fetched.
const cacheLimit = 256;
const fetched = new Map<string, { result: LiveResult; expires: number }>();
const pending = new Map<string, Promise<LiveResult>>();

function fetchLive(spec: BadgeSpec) {
  const key = liveKey(spec);
  const stored = fetched.get(key);
  if (stored && stored.expires > Date.now()) return Promise.resolve(stored.result);
  fetched.delete(key);
  const ongoing = pending.get(key);
  if (ongoing) return ongoing;
  const result = resolveLive(spec).then((value) => {
    pending.delete(key);
    if (!value.unavailable) {
      fetched.set(key, { result: value, expires: Date.now() + ttls[spec.source] * 1000 });
      if (fetched.size > cacheLimit) {
        const oldest = fetched.keys().next().value;
        if (oldest !== undefined) fetched.delete(oldest);
      }
    }
    return value;
  });
  pending.set(key, result);
  return result;
}

const isElement = (node: Node | undefined): node is ElementNode =>
  Array.isArray(node) && node[0] !== null;
// Comments render nothing, so they aren't content a badge would show.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
// SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
const childrenOf = (node: ElementNode) => node.slice(2) as Node[];
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const clip = (value: string) => {
  const words = value.trim().replace(/\s+/g, " ");
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
};
const isColor = (value: string): value is BadgeColor => colors.some((color) => color === value);

function badge(
  node: ElementNode,
  number: number,
  data: Data,
  issues: Issue[],
  options: BadgeOptions,
  live: Live[],
) {
  // A block badge's content is a paragraph, which a badge, drawn inline, can't hold.
  const content = childrenOf(node)
    .filter(isContent)
    .flatMap((child) => (isElement(child) && child[0] === "p" ? childrenOf(child) : [child]));
  const words = clip(textContent(["span", {}, ...content]));
  const name = `\`:badge\` ${number}${words ? ` ("${words}")` : ""}`;
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const image = badgeKeys.some((key) => key !== "color" && Object.hasOwn(attrs, key));
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!badgeKeys.some((key) => key === prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/badge/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`:badge\`, so it's ignored. Use \`color\`.`,
      });
  }
  if (image) {
    const parsed = readBadge({
      ...attrs,
      value: attrs.value ?? textContent(["span", {}, ...content]),
    });
    if (!parsed.ok) {
      issues.push({ rule: "comark/badge/invalid-image", message: `${name}: ${parsed.error}` });
      node.splice(1, node.length - 1, { color: "neutral" }, ...content);
      return;
    }
    const spec = parsed.value;
    let src: string;
    if (spec.source === "static") src = svgSrc(badgeSvg(spec));
    else {
      try {
        const endpoint = new URL(options.endpoint ?? "https://comark-ui.onmax.me/badge.svg");
        if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password)
          throw new Error("Invalid endpoint");
        endpoint.search = badgeParams(spec).toString();
        endpoint.hash = "";
        src = endpoint.href;
      } catch {
        issues.push({
          rule: "comark/badge/invalid-image",
          message: `${name}: Set the badge plugin's endpoint to an HTTPS URL without credentials.`,
        });
        node.splice(1, node.length - 1, { color: "neutral" }, ...content);
        return;
      }
    }
    const label =
      spec.source === "static"
        ? `${spec.label ? `${spec.label}: ` : ""}${spec.value}`
        : `${spec.label}: ${spec.package || `${spec.repository} / ${spec.workflow}`}`;
    node.splice(1, node.length - 1, { src, label });
    if (spec.source !== "static") live.push({ node, spec });
    return;
  }
  const written = text(attrs.color);
  let color: BadgeColor = "primary";
  if (isColor(written)) color = written;
  else if (written)
    issues.push({
      rule: "comark/badge/invalid-color",
      message: `${name}: \`color\` is "${clip(written)}", so it shows as primary. Write one of ${colors.join(", ")}.`,
    });
  if (!content.length)
    issues.push({
      rule: "comark/badge/empty-badge",
      message: `${name} is empty. Write its text in brackets: \`:badge[New]\`.`,
    });
  node.splice(1, node.length - 1, { color }, ...content);
}

/**
 * Turns inline `:badge[New]{color="success"}` and Nuxt UI's block `::badge` into badges in one of Nuxt UI's colors.
 * Problems, such as an unknown color, are added to `meta.issues`.
 */
export default defineComarkPlugin<BadgeOptions, BadgeMeta>((options = {}) => ({
  name: "comark-badge",
  async post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    const live: Live[] = [];
    let count = 0;
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node)) continue;
        if (node[0] === "badge") badge(node, ++count, data, issues, options, live);
        walk(childrenOf(node));
      }
    };
    walk(tree.nodes);
    // Data that's unavailable keeps the endpoint's image, which the reader's browser may still load.
    if (options.download !== false)
      await Promise.all(
        live.map(async ({ node, spec }) => {
          const result = await fetchLive(spec);
          if (!result.unavailable)
            node[1].src = svgSrc(
              badgeSvg({ ...spec, ...result, color: result.color ?? spec.color }),
            );
        }),
      );
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
