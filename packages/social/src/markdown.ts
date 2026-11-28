import type { FetchedMedia } from "./fetch.ts";
import { COUNTS, platformOf, type Count, type Platform } from "./platforms.ts";
import { display, URL_PATTERN } from "./text.ts";

/**
 * A post to write as `::post` Markdown: what `fetchPost()` returns, or the same shape written by hand. Every field may
 * be left out.
 */
export interface PostData {
  platform?: Platform;
  url?: string;
  author?: string;
  handle?: string;
  avatar?: string;
  time?: string;
  /** Plain text, as `fetchPost()` returns it. It's written so Comark reads it as text, never as Markdown. */
  text?: string;
  /** Numbers, or counts as written, such as `1.2K`. */
  counts?: Partial<Record<Count, number | string>>;
  media?: FetchedMedia[];
  /** The quoted post. Its own quote is left out, as the card leaves it out. */
  quote?: PostData;
}

/** A picture `postMarkdown()` is about to write: the author's avatar, or one of the post's pictures, from 0. */
export interface PostPicture {
  kind: "avatar" | "media";
  index: number;
  /** The post it belongs to, which is the quoted post for its pictures. */
  post: PostData;
}

export interface PostMarkdownOptions {
  /**
   * The address to write for each picture, such as `./avatar-ada.jpg` for a file saved with the document. Return
   * `undefined` to keep the picture's own address.
   */
  src?: (url: string, picture: PostPicture) => string | undefined | Promise<string | undefined>;
  /** How many colons open the block, for a post inside another block. Default 2, `::post`. */
  colons?: number;
}

// The card shows four pictures at most, so the others aren't written (or saved).
const MAX_MEDIA = 4;

/**
 * A prop as Comark reads it back exactly: double quotes, else single quotes, else a JSON string bound with `:`, whose
 * escapes carry any quote, backslash, or line break.
 */
function prop(key: string, value: string) {
  if (!/["\\\r\n]/.test(value)) return `${key}="${value}"`;
  if (!/['\\\r\n]/.test(value)) return `${key}='${value}'`;
  return `:${key}='${JSON.stringify(value).replace(/'/g, "\\u0027")}'`;
}

// Characters Comark, or a plugin comark-ui registers, reads as syntax anywhere in a line. `@` after a character would
// otherwise make an email link, `:` before a name an inline component, and `://` a link linkify reads from the source.
// A backslash and a `[` are written as entities, since comark-mathml reads `\[` as display math.
const INLINE = /[\\`*_{}[\]<>|~^$&]|[=+](?=[=+])|(?<=\S)@|:(?=[a-z$:]|\/\/)/gi;
const escapeInline = (value: string) =>
  value.replace(INLINE, (char) => (char === "\\" ? "&#92;" : char === "[" ? "&#91;" : `\\${char}`));

// What would start a heading, list, quote, definition, setext underline, or table at the start of a line.
const lineStart = (line: string) =>
  line.replace(/^(?:[#\-+=:]|(\d{1,9})(?=[.)]))/, (start, digits?: string) =>
    digits ? `${digits}\\` : `\\${start}`,
  );

// Whitespace Markdown would drop at a line's ends inside a paragraph, as numeric references it keeps.
const keepSpace = (value: string) =>
  value.replace(/\s/gu, (char) => `&#x${char.codePointAt(0)!.toString(16)};`);

/** A link's destination: in `<…>` when it holds a parenthesis, with what Comark would read as an escape or entity escaped. */
function destination(url: string) {
  const escaped = url.replace(/\\|&(?=#|\w+;)/g, "\\$&");
  return /[()\s<>]/.test(escaped) ? `<${escaped.replace(/[<>]/g, "\\$&")}>` : escaped;
}

/** One line of a paragraph, with each address linked the way the card links it from fetched text. */
function line(value: string) {
  let out = "";
  let at = 0;
  for (const match of value.matchAll(URL_PATTERN)) {
    out += escapeInline(value.slice(at, match.index)).replace(/!$/, "\\!");
    out += `[${escapeInline(display(match[0]))}](${destination(match[0])})`;
    at = match.index + match[0].length;
  }
  return lineStart(out + escapeInline(value.slice(at)));
}

/** Plain text as Markdown Comark reads back as the same text, split into paragraphs as the card splits fetched text. */
export function textMarkdown(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part
        .split("\n")
        .map((text, index, lines) => {
          const [, lead = "", body = "", trail = ""] = /^(\s*)(.*?)(\s*)$/s.exec(text) ?? [];
          return (
            (index > 0 ? keepSpace(lead) : "") +
            (lead && !body ? "" : line(body)) +
            (index < lines.length - 1 ? keepSpace(trail) : "")
          );
        })
        .join("\n"),
    )
    .join("\n\n");
}

async function picture(
  url: string,
  info: PostPicture,
  options: PostMarkdownOptions,
): Promise<string> {
  return (await options.src?.(url, info)) ?? url;
}

async function block(
  post: PostData,
  colons: number,
  options: PostMarkdownOptions,
  quoted: boolean,
) {
  const fence = ":".repeat(colons);
  const props: string[] = [];
  let address: URL | undefined;
  try {
    address = post.url ? new URL(post.url) : undefined;
  } catch {}
  if (post.platform && (!address || platformOf(address) !== post.platform))
    props.push(prop("platform", post.platform));
  for (const key of ["url", "author", "handle"] as const) {
    const value = post[key];
    if (value) props.push(prop(key, value));
  }
  if (post.avatar)
    props.push(
      prop("avatar", await picture(post.avatar, { kind: "avatar", index: 0, post }, options)),
    );
  if (post.time) props.push(prop("time", post.time));
  for (const count of COUNTS) {
    const value = post.counts?.[count];
    if (value !== undefined && value !== "") props.push(prop(count, String(value)));
  }
  const head = `${fence}post${props.length ? `{${props.join(" ")}}` : ""}`;
  const parts: string[] = [];
  const body = textMarkdown(post.text ?? "");
  if (body) parts.push(body);
  const media = await Promise.all(
    (post.media ?? []).slice(0, MAX_MEDIA).map(async (item, index) => {
      const src = await picture(item.src, { kind: "media", index, post }, options);
      const alt = item.alt ?? (item.video ? "Video" : "");
      const label = /^[\p{L}\p{M}\p{N} .,!?'-]+$/u.test(alt) ? alt : "";
      const attrs = [
        ...(label ? [] : [prop("alt", alt)]),
        ...(item.video ? ["video"] : []),
        ...(item.width && item.height ? [`width="${item.width}"`, `height="${item.height}"`] : []),
      ];
      return `![${label}](${destination(src)}){${attrs.join(" ")}}`.replace(/\{\}$/, "");
    }),
  );
  if (media.length) parts.push(media.join("\n"));
  if (post.quote && !quoted) parts.push(await block(post.quote, colons + 1, options, true));
  return [head, ...(parts.length ? [parts.join("\n\n")] : []), fence].join("\n");
}

/**
 * Writes a post as `::post` Markdown, so a script that fetched it with `fetchPost()` can put it in a document that's
 * rendered without fetching. Props are quoted so Comark reads them back exactly, the text is escaped so it reads as
 * text, its links show as the card shows a fetched post's, and the quoted post is a `:::post` inside.
 */
export function postMarkdown(post: PostData, options: PostMarkdownOptions = {}): Promise<string> {
  return block(post, Math.max(2, options.colons ?? 2), options, false);
}

export interface ThreadMarkdownOptions extends PostMarkdownOptions {
  /** Whether the last post shows larger. Default `true`; `false` writes `focal="false"`. */
  focal?: boolean;
}

/**
 * Writes a thread's posts, from the root down, as `::thread` Markdown, each one a `:::post` as `postMarkdown()` writes
 * it. `src` sees each post's pictures numbered from 0, with the post they belong to.
 */
export async function threadMarkdown(
  posts: PostData[],
  options: ThreadMarkdownOptions = {},
): Promise<string> {
  const colons = Math.max(2, options.colons ?? 2);
  const fence = ":".repeat(colons);
  const blocks = await Promise.all(posts.map((post) => block(post, colons + 1, options, false)));
  const head = `${fence}thread${options.focal === false ? '{focal="false"}' : ""}`;
  return [head, ...(blocks.length ? [blocks.join("\n\n")] : []), fence].join("\n");
}
