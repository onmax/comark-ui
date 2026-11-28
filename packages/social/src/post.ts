import type { ElementNode, Node } from "comark";
import { resolveAttributes } from "comark/render";
import { describeTime } from "comark-time";
import type { FetchedMedia, FetchedPost } from "./fetch.ts";
import {
  COUNTS,
  PLATFORM,
  PLATFORMS,
  countWord,
  isPlatform,
  platformOf,
  type Count,
  type Platform,
} from "./platforms.ts";
import { readBody, readText, type Linking } from "./text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { scalar, text } from "../../../shared/text.ts";

export type Rule = `comark/social/${string}`;
export type Issue = { rule: Rule; message: string };
export type Data = Parameters<typeof resolveAttributes>[1];

/** A post as the card draws it: what was written, with what a fetch found filling the rest. */
export interface Post {
  /** The block's name in its issues. */
  name: string;
  platform: Platform;
  /** Whether `platform` was written, so a fetched post doesn't change it. */
  platformWritten: boolean;
  /** The post's server, which a Mastodon `@user` belongs to. */
  host: string;
  url?: string;
  author?: string;
  handle?: string;
  avatar?: string;
  time?: string;
  counts: Partial<Record<Count, number>>;
  text: Node[];
  media: ElementNode[];
  quote?: Post;
}

export type TimeOptions = {
  locale?: string;
  timeZone?: string;
  now?: Date | string | number;
};

const POST_PROPS = ["platform", "url", "author", "handle", "avatar", "time", ...COUNTS];
const list = (items: readonly string[]) =>
  new Intl.ListFormat("en", { type: "disjunction" }).format(items.map((item) => `\`${item}\``));

const SUFFIX = new Map([
  ["k", 1e3],
  ["m", 1e6],
  ["b", 1e9],
]);

/** A count as written: `1234`, `1,234`, `1.2K`, or `3M`. */
export function readCount(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  const match = /^(\d+(?:\.\d+)?)\s*([kmb])?$/i.exec((scalar(value) ?? "").replace(/[,_\s]/g, ""));
  if (!match) return undefined;
  return Math.round(Number(match[1]) * (SUFFIX.get(match[2]?.toLowerCase() ?? "") ?? 1));
}

const webUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
};

/** A block's props, with an issue for each one it doesn't read. */
export function props(
  node: ElementNode,
  name: string,
  block: string,
  known: readonly string[],
  data: Data,
  issues: Issue[],
) {
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!known.includes(prop) && prop !== "id" && prop !== "class" && prop !== "$")
      issues.push({
        rule: "comark/social/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`${block}\`, so it's ignored. Use ${list(known)}.`,
      });
  }
  return resolveAttributes(node[1], data, { parseJson: true });
}

const isTemplate = (node: Node): node is ElementNode => isElement(node) && node[0] === "template";
/** A block's content, with a `#default` slot's opened. */
export const contentOf = (node: ElementNode) =>
  childrenOf(node).flatMap((child) => (isTemplate(child) ? childrenOf(child) : [child]));

/** Reads a written `::post` or `:::post`, and its quoted post, into what the card draws. */
export function readPost(
  node: ElementNode,
  name: string,
  data: Data,
  issues: Issue[],
  /** The post that quotes this one, whose platform it shares unless it names its own. */
  quoting?: { platform: Platform; host: string },
): Post {
  const quoted = Boolean(quoting);
  const attrs = props(node, name, "::post", POST_PROPS, data, issues);
  const url = text(attrs.url);
  const address = url ? webUrl(url) : undefined;
  if (url && !address)
    issues.push({
      rule: "comark/social/invalid-url",
      message: `${name}: \`url\` is "${url}", which isn't an http or https address, so the card links nowhere. Write the post's full address, such as https://x.com/jack/status/20.`,
    });
  const writtenAvatar = text(attrs.avatar);
  // A path is a picture saved with the document; any scheme but the web's and an image data URI could run or leak.
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(writtenAvatar)?.[1]?.toLowerCase();
  const avatarOk =
    !scheme || scheme === "http" || scheme === "https" || writtenAvatar.startsWith("data:image/");
  const avatar = avatarOk ? writtenAvatar : "";
  if (!avatarOk)
    issues.push({
      rule: "comark/social/invalid-url",
      message: `${name}: \`avatar\` is "${writtenAvatar}", which isn't a picture's address, so the card shows the author's initial. Write an https address, a path, or a \`data:image/\` URI.`,
    });
  const written = text(attrs.platform).toLowerCase();
  if (written && !isPlatform(written))
    issues.push({
      rule: "comark/social/unknown-platform",
      message: `${name}: \`platform\` is "${written}", which comark-social doesn't know, so the card reads it from \`url\`. Write ${list(PLATFORMS)}, or leave it out.`,
    });
  const platform: Platform = isPlatform(written)
    ? written
    : address
      ? platformOf(address)
      : (quoting?.platform ?? "generic");
  const counts: Post["counts"] = {};
  for (const count of COUNTS) {
    const value = attrs[count];
    if (value === undefined || value === "") continue;
    const parsed = readCount(value);
    if (parsed === undefined)
      issues.push({
        rule: "comark/social/invalid-count",
        message: `${name}: \`${count}\` is "${scalar(value) ?? JSON.stringify(value)}", which isn't a count, so it doesn't show. Write a number such as 1234, 1,234, or 1.2K.`,
      });
    else counts[count] = parsed;
  }
  const time = text(attrs.time);
  if (time && !describeTime(time))
    issues.push({
      rule: "comark/social/invalid-time",
      message: `${name}: \`time\` is "${time}", which isn't a date, so it shows as written. Write an ISO date such as 2026-11-28 or 2026-11-28T09:30:00Z.`,
    });
  const host = address?.host ?? quoting?.host ?? "";
  const content = contentOf(node);
  const quotes = content.filter(
    (child): child is ElementNode => isElement(child) && child[0] === "post",
  );
  if (quotes.length > (quoted ? 0 : 1))
    issues.push({
      rule: "comark/social/extra-quote",
      message: quoted
        ? `${name} quotes a post of its own, which a quoted post can't show, so it's left out. Move that \`::::post\` out of the quote.`
        : `${name} holds ${quotes.length} \`:::post\` blocks, and a post quotes one, so only the first shows. Move the others out of it.`,
    });
  const body = readBody(
    content.filter((child) => !isElement(child) || child[0] !== "post"),
    { platform, host },
  );
  const quote =
    !quoted && quotes[0]
      ? readPost(quotes[0], `${name}'s quoted post`, data, issues, { platform, host })
      : undefined;
  return {
    name,
    platform,
    platformWritten: isPlatform(written),
    host,
    ...(address ? { url: address.href } : {}),
    ...(text(attrs.author) ? { author: text(attrs.author) } : {}),
    ...(text(attrs.handle) ? { handle: text(attrs.handle) } : {}),
    ...(avatar ? { avatar } : {}),
    ...(time ? { time } : {}),
    counts,
    text: body.text,
    media: body.media,
    ...(quote ? { quote } : {}),
  };
}

const mediaNode = (item: FetchedMedia): ElementNode => {
  const image: ElementNode = [
    "img",
    {
      src: item.src,
      alt: item.alt ?? (item.video ? "Video" : ""),
      ...(item.width && item.height
        ? { width: String(item.width), height: String(item.height) }
        : {}),
    },
  ];
  return item.video ? ["span", { class: "csl-video" }, image] : image;
};

/** Fills in what a post leaves out from its fetched copy. What's written wins. */
export function merge(post: Post, fetched: FetchedPost): Post {
  const platform = post.platformWritten ? post.platform : fetched.platform;
  let host = post.host;
  try {
    host = new URL(fetched.url).host;
  } catch {}
  const linking: Linking = { platform, host };
  const quote = post.quote
    ? post.quote
    : fetched.quote
      ? merge(
          {
            name: `${post.name}'s quoted post`,
            platform,
            platformWritten: false,
            host,
            counts: {},
            text: [],
            media: [],
          },
          fetched.quote,
        )
      : undefined;
  return {
    ...post,
    platform,
    host,
    url: post.url ?? fetched.url,
    author: post.author ?? fetched.author,
    handle: post.handle ?? fetched.handle,
    ...((post.avatar ?? fetched.avatar) ? { avatar: post.avatar ?? fetched.avatar } : {}),
    time: post.time ?? fetched.time,
    counts: { ...fetched.counts, ...post.counts },
    text: post.text.length ? post.text : readText(fetched.text, linking),
    media: post.media.length ? post.media : fetched.media.map(mediaNode),
    ...(quote ? { quote } : {}),
  };
}

export type Look = TimeOptions & {
  /** Whether comark-chips runs, which leaves the card's links and handles as they are. */
  chips?: boolean;
  /** Whether comark-github's references run, which leave the card's handles as they are. */
  references?: boolean;
  /** A quoted post: smaller, with no counts. */
  quote?: boolean;
};

const formatters = new Map<string, Intl.NumberFormat>();
const formatNumber = (value: number, locale: string | undefined, compact: boolean) => {
  const key = `${locale} ${compact}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat(
      locale ?? "en-US",
      compact ? { notation: "compact", maximumFractionDigits: 1 } : {},
    );
    formatters.set(key, format);
  }
  return format.format(value);
};

/** The time of a post: a short date on the card, and the full date and time in its tooltip. */
export function timeNode(value: string, look: Look): ElementNode {
  let described: ReturnType<typeof describeTime>;
  try {
    described = describeTime(value, {
      now: look.now,
      locale: look.locale,
      timeZone: look.timeZone,
      threshold: "0s",
    });
  } catch {
    described = undefined;
  }
  if (!described) return ["span", { class: "csl-time" }, value];
  const dateOnly = described.datetime.length === 10;
  const at = dateOnly ? new Date(`${described.datetime}T00:00:00Z`) : new Date(described.datetime);
  const long = new Intl.DateTimeFormat(look.locale ?? "en-US", {
    dateStyle: "long",
    ...(dateOnly ? { timeZone: "UTC" } : { timeStyle: "short", timeZone: look.timeZone }),
  }).format(at);
  return [
    "time",
    { class: "csl-time", datetime: described.datetime, title: long },
    described.label,
  ];
}

const graphemes = new Intl.Segmenter();
const initial = (post: Post) => {
  const name = (post.author ?? post.handle ?? "?").replace(/^@/, "");
  return graphemes.segment(name)[Symbol.iterator]().next().value?.segment.toUpperCase() ?? "?";
};

/** The handle as the platform shows it: with its `@`, except on LinkedIn and other sites, where it's a headline. */
const handleOf = (post: Post) =>
  !post.handle
    ? undefined
    : post.platform === "linkedin" || post.platform === "generic" || post.handle.startsWith("@")
      ? post.handle
      : `@${post.handle}`;

function counts(post: Post, look: Look): ElementNode | undefined {
  const { order } = PLATFORM[post.platform];
  const kinds = [...order, ...COUNTS.filter((count) => !order.includes(count))].filter(
    (count) => post.counts[count] !== undefined,
  );
  if (!kinds.length) return undefined;
  return [
    "div",
    { class: "csl-counts" },
    ...kinds.map((kind): ElementNode => {
      const value = post.counts[kind] ?? 0;
      const words = `${formatNumber(value, look.locale, false)} ${countWord(post.platform, kind, value)}`;
      return [
        "span",
        { class: "csl-count", "data-count": kind, title: words },
        ["span", { "aria-hidden": "true" }, formatNumber(value, look.locale, true)],
        ["span", { class: "csl-sr" }, words],
      ];
    }),
  ];
}

/** Draws a post as plain elements inside one `post` node. */
export function drawPost(post: Post, look: Look): ElementNode {
  const info = PLATFORM[post.platform];
  const who = post.author ?? handleOf(post);
  const handle = post.author ? handleOf(post) : undefined;
  const label = `Post${who ? ` by ${who}` : ""}${post.platform === "generic" ? "" : ` on ${info.name}`}`;
  const size = look.quote ? "20" : "40";
  const avatar: ElementNode = post.avatar
    ? [
        "img",
        {
          class: "csl-avatar",
          src: post.avatar,
          alt: "",
          width: size,
          height: size,
          "data-zoom": "false",
        },
      ]
    : ["span", { class: "csl-avatar", "aria-hidden": "true" }, initial(post)];
  const logo: ElementNode = post.url
    ? [
        "a",
        {
          class: "csl-logo",
          href: post.url,
          "aria-label": `View on ${post.platform === "generic" ? new URL(post.url).host : info.name}`,
        },
      ]
    : ["span", { class: "csl-logo", role: "img", "aria-label": info.name }];
  const meta: Node[] = [];
  if (handle) meta.push(["span", { class: "csl-handle" }, handle]);
  if (post.time) meta.push(timeNode(post.time, look));
  const head: ElementNode = [
    "div",
    { class: "csl-head" },
    avatar,
    [
      "div",
      { class: "csl-who" },
      ...(who ? [["span", { class: "csl-name" }, who] satisfies ElementNode] : []),
      ...(meta.length ? [["span", { class: "csl-meta" }, ...meta] satisfies ElementNode] : []),
    ],
    ...(look.quote ? [] : [logo]),
  ];
  const children: Node[] = [head];
  if (post.text.length) children.push(["div", { class: "csl-text" }, ...post.text]);
  if (post.media.length)
    children.push([
      "div",
      { class: "csl-media", "data-count": String(Math.min(post.media.length, 4)) },
      ...post.media,
    ]);
  if (post.quote) children.push(drawPost(post.quote, { ...look, quote: true }));
  const bar = look.quote ? undefined : counts(post, look);
  if (bar) children.push(bar);
  return [
    "post",
    {
      platform: post.platform,
      label,
      ...(look.quote ? { quote: "" } : {}),
      // The card shows links and handles as its platform does, so comark-chips and comark-github leave it alone.
      ...(look.chips && !look.quote ? { chip: "false" } : {}),
      ...(look.references && !look.quote ? { references: "false" } : {}),
    },
    ...children,
  ];
}
