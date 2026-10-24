import type { ComarkParseTokensState, ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";

export type MediaMeta = {
  /** One readable sentence per problem with a video or audio file. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

export type MediaOptions = {
  /**
   * `styled` gives videos and audio controls on the shared `--comark-*` tokens, which a small script runs; until it
   * does, and when the file can't play, the browser's own controls show. `native` always uses the browser's controls.
   * Default `styled`.
   */
  controls?: "styled" | "native";
};

/**
 * What a media file becomes, and all its renderers read. `kind` is `video` or `audio`; `label` is the image's alt.
 * `native` marks a file that keeps the browser's controls. The flags are only present when set.
 */
export type MediaAttributes = {
  kind?: "video" | "audio";
  src?: string;
  label?: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  native?: boolean;
};

type Data = Parameters<typeof resolveAttributes>[1];
type Issue = { message: string; rule: `comark/media/${string}` };

const VIDEO = /\.(?:mp4|webm|mov|m4v)$/i;
const AUDIO = /\.(?:mp3|wav|ogg|m4a)$/i;
// GitHub plays an uploaded video when its link sits alone in a paragraph; the address has no extension.
const ATTACHMENT = /^https:\/\/github\.com\/user-attachments\/assets\/[\w-]+\/?(?:[?#].*)?$/;
const FLAGS = ["autoplay", "loop", "muted"] as const;
const KNOWN = new Set<string>(["src", "alt", "kind", "poster", ...FLAGS]);

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const kindOf = (src: string) => {
  const path = src.replace(/[?#].*$/, "");
  return VIDEO.test(path) ? "video" : AUDIO.test(path) ? "audio" : undefined;
};
const on = (value: unknown) => value !== undefined && value !== false && text(value) !== "false";

/**
 * Turns media images and GitHub attachment links into `media` tokens. It runs on the tokens, before any plugin's `post`,
 * so comark-zoom never makes a video zoom and comark-chips never makes a GitHub attachment a chip, whatever the order.
 */
function convert(tokens: ComarkParseTokensState["tokens"]) {
  for (const token of tokens) {
    const inline = token.children;
    if (token.type !== "inline" || !inline) continue;
    for (const child of inline) {
      const kind = child.type === "image" ? kindOf(child.attrGet("src") ?? "") : undefined;
      if (!kind) continue;
      child.type = "mdc_inline_component";
      child.tag = "media";
      child.attrSet("kind", kind);
      child.attrSet("alt", child.content);
    }
    const parts = inline.filter((child) => child.type !== "text" || child.content.trim());
    const [open, label, close] = parts;
    const href = open?.attrGet("href") ?? "";
    if (
      parts.length === 3 &&
      open?.type === "link_open" &&
      label?.type === "text" &&
      label.content.trim() === href &&
      close?.type === "link_close" &&
      ATTACHMENT.test(href)
    ) {
      open.type = "mdc_inline_component";
      open.tag = "media";
      open.attrs = [
        ["src", href],
        ["kind", "video"],
      ];
      inline.splice(0, inline.length, open);
    }
  }
}

function read(
  node: ElementNode,
  data: Data,
  issues: Issue[],
  options: MediaOptions,
): MediaAttributes {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const src = text(attrs.src);
  const alt = text(attrs.alt);
  const kind = text(attrs.kind) || kindOf(src);
  const name =
    attrs.alt === undefined ? `The ${kind || "media"} link ${src}` : `\`![${alt}](${src})\``;
  if (kind !== "video" && kind !== "audio") {
    issues.push({
      rule: "comark/media/unplayable-src",
      message: `${name}: \`src\` must end in .mp4, .webm, .mov, .m4v, .mp3, .wav, .ogg, or .m4a to play.`,
    });
    return {};
  }
  const result: MediaAttributes = { kind, src };
  if (alt) result.label = alt;
  else if (attrs.alt !== undefined)
    issues.push({
      rule: "comark/media/missing-label",
      message: `${name} has no label. Describe the ${kind} in the brackets, like \`![Signing in with a passkey](${src})\`.`,
    });
  for (const flag of FLAGS) if (on(attrs[flag])) result[flag] = true;
  const poster = text(attrs.poster);
  if (poster && kind === "audio")
    issues.push({
      rule: "comark/media/poster-on-audio",
      message: `${name}: audio has no picture, so \`poster\` was dropped. Remove it.`,
    });
  else if (poster) result.poster = poster;
  if (options.controls === "native") result.native = true;
  if (result.autoplay && !result.muted)
    issues.push({
      rule: "comark/media/autoplay-without-muted",
      message: `${name}: browsers only start ${kind === "video" ? "a video" : "audio"} by itself when it's muted. Add \`muted\`, or remove \`autoplay\`.`,
    });
  const unknown = Object.keys(attrs).filter((key) => !KNOWN.has(key));
  if (unknown.length)
    issues.push({
      rule: "comark/media/unknown-prop",
      message: `${name}: ${unknown.map((key) => `\`${key}\``).join(", ")} ${unknown.length === 1 ? `isn't ${kind === "audio" ? "an" : "a"}` : "aren't"} ${kind} option${unknown.length === 1 ? "" : "s"}, so ${unknown.length === 1 ? "it was" : "they were"} dropped. Use ${kind === "video" ? "autoplay, loop, muted, or poster" : "autoplay, loop, or muted"}.`,
    });
  return result;
}

/**
 * Plays an image whose `src` ends in .mp4, .webm, .mov, or .m4v as a video, and .mp3, .wav, .ogg, or .m4a as audio,
 * with the alt as its label, as GitLab does. A GitHub `user-attachments` link alone in a paragraph plays too, as on
 * GitHub. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<MediaOptions | undefined, MediaMeta>((options = {}) => ({
  name: "comark-media",
  markdownItPost(state) {
    convert(state.tokens);
  },
  post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    const walk = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node)) continue;
        if (node[0] === "media") node.splice(1, node.length - 1, read(node, data, issues, options));
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
}));
