import type { ComarkParseTokensState, ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { measure } from "comark-zoom/size";
import { text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type MediaMeta = {
  /** One readable sentence per problem with a video, audio, or PDF file. Empty when the document has none. Other plugins add theirs too. */
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
  /**
   * Give videos their `width` and `height` while parsing. By default only data URIs are measured. `true` also
   * fetches remote URLs, including redirects, so enable it only for trusted documents. `false` disables measurement.
   */
  size?: boolean;
};

/**
 * What a media file becomes, and all its renderers read. `kind` is `video`, `audio`, or `pdf`; `label` is the image's
 * alt. A PDF has only `src` and `label`. `width` and `height` are a video's size in pixels, as written or read from the
 * file. `native` marks a file that keeps the browser's controls. The flags are only present when set.
 */
export type MediaAttributes = {
  kind?: "video" | "audio" | "pdf";
  src?: string;
  label?: string;
  poster?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  native?: boolean;
};

type Data = Parameters<typeof resolveAttributes>[1];
type Issue = { message: string; rule: `comark/media/${string}` };

const VIDEO = /\.(?:mp4|webm|mov|m4v)$/i;
const AUDIO = /\.(?:mp3|wav|ogg|m4a)$/i;
const PDF = /\.pdf$/i;
// GitHub plays an uploaded video when its link sits alone in a paragraph; the address has no extension.
const ATTACHMENT = /^https:\/\/github\.com\/user-attachments\/assets\/[\w-]+\/?(?:[?#].*)?$/;
const FLAGS = ["autoplay", "loop", "muted"] as const;
const SIDES = ["width", "height"] as const;
// How the issues name each video written as an image. A GitHub attachment link takes no props, so it has no name here.
const names = new WeakMap<MediaAttributes, string>();
const KNOWN = new Set<string>(["src", "alt", "kind", "poster", ...FLAGS]);
const PDF_IMAGE = "!media-pdf";
const LINKED_PDF_IMAGE = "!media-pdf-in-link";

type Token = ComarkParseTokensState["tokens"][number];

function plainAlt(tokens: Token[] | null): string {
  return (tokens ?? [])
    .map((token) => {
      switch (token.type) {
        case "text":
        case "text_special":
        case "code_inline":
          return token.content;
        case "softbreak":
        case "hardbreak":
          return " ";
        case "image":
          return plainAlt(token.children);
        default:
          return "";
      }
    })
    .join("");
}

function isPdfLink(src: string): boolean {
  if (!src) return false;
  try {
    const { protocol } = new URL(src, "https://example.invalid/");
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

const kindOf = (src: string) => {
  const path = src.replace(/[?#].*$/, "");
  return VIDEO.test(path)
    ? "video"
    : AUDIO.test(path)
      ? "audio"
      : PDF.test(path)
        ? "pdf"
        : undefined;
};
const on = (value: unknown) => value !== undefined && value !== false && text(value) !== "false";

/**
 * Turns media images and GitHub attachment links into `media` tokens. It runs on the tokens, before any plugin's `post`,
 * so comark-zoom never makes a video or a PDF zoom and comark-chips never makes a GitHub attachment a chip, whatever the order.
 */
function convert(tokens: ComarkParseTokensState["tokens"]) {
  for (const token of tokens) {
    const inline = token.children;
    if (token.type !== "inline" || !inline) continue;
    let inLink = false;
    for (const child of inline) {
      if (child.type === "link_open") inLink = true;
      if (child.type === "link_close") inLink = false;
      const kind = child.type === "image" ? kindOf(child.attrGet("src") ?? "") : undefined;
      if (!kind) continue;
      child.type = "mdc_inline_component";
      if (kind === "pdf") {
        child.tag = inLink ? LINKED_PDF_IMAGE : PDF_IMAGE;
        child.attrSet("alt", plainAlt(child.children));
      } else {
        child.tag = "media";
        child.attrSet("kind", kind);
        child.attrSet("alt", child.content);
      }
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
  const sourceKind = kindOf(src);
  const pdfImage = node[0] === PDF_IMAGE || node[0] === LINKED_PDF_IMAGE;
  const kind = pdfImage || sourceKind === "pdf" ? "pdf" : text(attrs.kind) || sourceKind;
  const name =
    attrs.alt === undefined ? `The ${kind || "media"} link ${src}` : `\`![${alt}](${src})\``;
  if (kind !== "video" && kind !== "audio" && kind !== "pdf") {
    issues.push({
      rule: "comark/media/unplayable-src",
      message: `${name}: \`src\` must end in .mp4, .webm, .mov, .m4v, .mp3, .wav, .ogg, .m4a, or .pdf.`,
    });
    return {};
  }
  if (kind === "pdf" && !isPdfLink(src)) {
    issues.push({
      rule: "comark/media/unplayable-src",
      message: `${name}: use a relative, HTTP, or HTTPS URL for the PDF.`,
    });
    return {};
  }
  const result: MediaAttributes = { kind, src };
  if (alt) result.label = alt;
  else if (attrs.alt !== undefined)
    issues.push({
      rule: "comark/media/missing-label",
      message:
        kind === "pdf"
          ? `${name} has no label. Describe the PDF in the brackets, like \`![The signed contract](${src})\`.`
          : `${name} has no label. Describe the ${kind} in the brackets, like \`![Signing in with a passkey](${src})\`.`,
    });
  if (kind === "pdf") {
    const unknown = Object.keys(attrs).filter(
      (key) => key !== "src" && key !== "alt" && (key !== "kind" || pdfImage),
    );
    if (unknown.length)
      issues.push({
        rule: "comark/media/unknown-prop",
        message: `${name}: ${unknown.map((key) => `\`${key}\``).join(", ")} ${unknown.length === 1 ? "isn't a PDF option, so it was" : "aren't PDF options, so they were"} dropped. A PDF takes only its label, in the brackets.`,
      });
    return result;
  }
  for (const flag of FLAGS) if (on(attrs[flag])) result[flag] = true;
  const poster = text(attrs.poster);
  if (poster && kind === "audio")
    issues.push({
      rule: "comark/media/poster-on-audio",
      message: `${name}: audio has no picture, so \`poster\` was dropped. Remove it.`,
    });
  else if (poster) result.poster = poster;
  const sides = kind === "video" ? SIDES.filter((side) => attrs[side] !== undefined) : [];
  // A size written wrong is reported as invalid-size, so missing-size only reports one never written.
  if (kind === "video" && attrs.alt !== undefined && !sides.length) names.set(result, name);
  if (sides.length) {
    const [width = 0, height = 0] = SIDES.map((side) => Number(text(attrs[side])));
    if (Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0) {
      result.width = width;
      result.height = height;
    } else
      issues.push({
        rule: "comark/media/invalid-size",
        message: `${name}: \`width\` and \`height\` are the video's size in pixels and go together, like \`{width=1280 height=720}\`, so ${sides.length === 1 ? "it was" : "they were"} dropped. Supply both sides.`,
      });
  }
  if (options.controls === "native") result.native = true;
  if (result.autoplay && !result.muted)
    issues.push({
      rule: "comark/media/autoplay-without-muted",
      message: `${name}: browsers only start ${kind === "video" ? "a video" : "audio"} by itself when it's muted. Add \`muted\`, or remove \`autoplay\`.`,
    });
  const unknown = Object.keys(attrs).filter(
    (key) => !KNOWN.has(key) && !(kind === "video" && SIDES.some((side) => side === key)),
  );
  if (unknown.length)
    issues.push({
      rule: "comark/media/unknown-prop",
      message: `${name}: ${unknown.map((key) => `\`${key}\``).join(", ")} ${unknown.length === 1 ? `isn't ${kind === "audio" ? "an" : "a"}` : "aren't"} ${kind} option${unknown.length === 1 ? "" : "s"}, so ${unknown.length === 1 ? "it was" : "they were"} dropped. Use ${kind === "video" ? "autoplay, loop, muted, poster, width, or height" : "autoplay, loop, or muted"}.`,
    });
  return result;
}

/**
 * Plays an image whose `src` ends in .mp4, .webm, .mov, or .m4v as a video, and .mp3, .wav, .ogg, or .m4a as audio,
 * with the alt as its label, as GitLab does. One that ends in .pdf becomes a `pdf` that renders as a link, so a host
 * can draw it its own way. A GitHub `user-attachments` link alone in a paragraph plays too, as on
 * GitHub. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<MediaOptions | undefined, MediaMeta>((options = {}) => ({
  name: "comark-media",
  markdownItPost(state) {
    convert(state.tokens);
  },
  async post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    const videos: MediaAttributes[] = [];
    const walk = (node: Node, inLink: boolean): Node => {
      if (!isElement(node)) return node;
      const [tag] = node;
      if (tag !== "media" && tag !== PDF_IMAGE && tag !== LINKED_PDF_IMAGE) {
        for (const [index, child] of childrenOf(node).entries()) {
          node[index + 2] = walk(child, inLink || tag === "a");
        }
        return node;
      }
      const attributes = read(node, data, issues, options);
      if (tag === LINKED_PDF_IMAGE || (inLink && attributes.kind === "pdf"))
        return attributes.label || attributes.src || "";
      node[0] = "media";
      node.splice(1, node.length - 1, attributes);
      if (attributes.kind === "video" && !attributes.width) videos.push(attributes);
      return node;
    };
    tree.nodes = tree.nodes.map((node) => walk(node, false));
    if (options.size !== false)
      await Promise.all(
        videos.map(async (video) => {
          // SAFETY: `read` only returns a video with its `src`.
          const size = await measure(video.src as string, { remote: options.size === true });
          if (size) Object.assign(video, size);
        }),
      );
    for (const video of videos) {
      const name = names.get(video);
      if (name && !video.width)
        issues.push({
          rule: "comark/media/missing-size",
          message: `${name} has no size, so the page holds a 16:9 box until it loads and moves if the video isn't 16:9. Add its \`width\` and \`height\` in pixels, like \`{width=1280 height=720}\`.`,
        });
    }
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
