import type { ElementNode, Node } from "comark";
import { PLATFORM, type Platform } from "./platforms.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

// What a post's body holds as blocks; anything else is inline and goes in a paragraph. A `disclosure` is a
// `:::details` that comark-details read first.
const BLOCKS = new Set(
  "blockquote details disclosure div dl figure h1 h2 h3 h4 h5 h6 hr ol p pre table ul".split(" "),
);
// Text in these is a link or code already, so its words stay as written.
const SKIP = new Set(["a", "code", "pre", "kbd", "script", "style"]);

export type Linking = {
  platform: Platform;
  /** The post's server, for a Mastodon `@user` without one. */
  host: string;
};

const URL_PATTERN = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]}'’”]/g;
const MENTION = /(^|[^\w@/.])@([A-Za-z0-9_](?:[\w.-]*[A-Za-z0-9_])?(?:@[\w-]+(?:\.[\w-]+)+)?)/g;
const HASHTAG = /(^|[^\p{L}\p{N}_&/#])#(\p{L}[\p{L}\p{N}_]*)/gu;

const link = (href: string, words: Node[]): ElementNode => ["a", { href }, ...words];

// A link as the platforms show it: no scheme or `www.`, and cut after 30 characters.
const display = (href: string) => {
  const short = href.replace(/^https?:\/\/(www\.)?/, "");
  return short.length > 30 ? `${short.slice(0, 29)}…` : short;
};

type Found = { at: number; length: number; node: ElementNode };

// The links, `@handles`, and `#tags` in one run of text, as the platform links them, with each line break a `br`.
function words(value: string, linking: Linking, urls: boolean): Node[] {
  const info = PLATFORM[linking.platform];
  const found: Found[] = [];
  if (urls)
    for (const match of value.matchAll(URL_PATTERN))
      found.push({
        at: match.index,
        length: match[0].length,
        node: link(match[0], [display(match[0])]),
      });
  const taken = (at: number) => found.some((item) => at >= item.at && at < item.at + item.length);
  if (info.mention)
    for (const match of value.matchAll(MENTION)) {
      const at = match.index + match[1].length;
      const href = info.mention(match[2], linking.host);
      if (href && !taken(at))
        found.push({ at, length: match[2].length + 1, node: link(href, [`@${match[2]}`]) });
    }
  if (info.tag)
    for (const match of value.matchAll(HASHTAG)) {
      const at = match.index + match[1].length;
      if (!taken(at))
        found.push({
          at,
          length: match[2].length + 1,
          node: link(info.tag(match[2], linking.host), [`#${match[2]}`]),
        });
    }
  found.sort((a, b) => a.at - b.at);
  const out: Node[] = [];
  const lines = (text: string) =>
    text.split("\n").forEach((line, index) => {
      if (index) out.push(["br", {}]);
      if (line) out.push(line);
    });
  let at = 0;
  for (const item of found) {
    lines(value.slice(at, item.at));
    out.push(item.node);
    at = item.at + item.length;
  }
  lines(value.slice(at));
  return out;
}

function inline(nodes: Node[], linking: Linking): Node[] {
  return nodes.flatMap((node): Node[] => {
    if (typeof node === "string") return words(node, linking, false);
    if (!isElement(node)) return [node];
    const [tag, attrs, ...children] = node;
    if (SKIP.has(tag)) return [node];
    // SAFETY: an element node is [tag, attributes, ...children]; its children are nodes.
    return [[tag, attrs, ...inline(children as Node[], linking)] as ElementNode];
  });
}

const blank = (node: Node) => typeof node === "string" && !node.trim();
const isMedia = (node: Node) => isElement(node) && (node[0] === "img" || node[0] === "media");

/**
 * Splits a post's written body into its text, as blocks with each line break kept and its `@handles` and `#tags`
 * linked, and its pictures: every image or video in a paragraph of nothing else.
 */
export function readBody(nodes: Node[], linking: Linking): { text: Node[]; media: ElementNode[] } {
  const text: Node[] = [];
  const media: ElementNode[] = [];
  let run: Node[] = [];
  const paragraph = (children: Node[]) => {
    const content = children.filter((child) => !blank(child));
    if (content.length && content.every(isMedia)) {
      // SAFETY: isMedia passed for every node, so each is an element.
      media.push(...(content as ElementNode[]));
      return;
    }
    // Comark leaves the line breaks at a paragraph's ends, which would draw an empty line.
    const trimmed = [...children];
    while (trimmed.length && blank(trimmed[0])) trimmed.shift();
    while (trimmed.length && blank(trimmed.at(-1) ?? "")) trimmed.pop();
    if (trimmed.length) text.push(["p", {}, ...inline(trimmed, linking)]);
  };
  for (const node of nodes) {
    if (isElement(node) && BLOCKS.has(node[0])) {
      paragraph(run);
      run = [];
      if (node[0] === "p") paragraph(childrenOf(node));
      else if (node[0] === "pre") text.push(node);
      else text.push(...inline([node], linking));
    } else run.push(node);
  }
  paragraph(run);
  return { text, media };
}

/** A fetched post's plain text as paragraphs, with its links, `@handles`, and `#tags` linked. */
export function readText(value: string, linking: Linking): Node[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): ElementNode => ["p", {}, ...words(part, linking, true)]);
}
