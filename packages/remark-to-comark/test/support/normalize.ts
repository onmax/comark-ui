import type { Element, Nodes, Properties } from "hast";
import { fromHtml } from "hast-util-from-html";
import { find, html } from "property-information";
import { canonicalize } from "./equivalence.ts";

// Tags whose surrounding whitespace never renders, so their text neighbours are trimmed.
const BLOCK = new Set(
  "address article aside blockquote body caption dd details dialog div dl dt figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr html li main nav ol p pre section summary table tbody td tfoot th thead tr ul br".split(
    " ",
  ),
);
const VERBATIM = new Set(["pre", "textarea", "script", "style"]);
const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));
// HTML collapses these; a no-break space is content.
const COLLAPSIBLE = /[ \t\n\r\f]+/g;

/**
 * Attributes Comark adds that remark doesn't, as `tag[attr]`: heading ids, and a code block's language, filename,
 * and highlighted lines. They are ignored on the Comark side unless the reference has the same attribute with the
 * same value, so an authored id that changes still shows.
 */
export const BENIGN = new Set([
  ...["h1", "h2", "h3", "h4", "h5", "h6"].map((tag) => `${tag}[id]`),
  ...["language", "data-language", "highlights", "filename", "meta"].map(
    (attribute) => `pre[${attribute}]`,
  ),
  "input[class]",
]);

export type Token = string;

export interface NormalizeOptions {
  /** Attributes to drop, as `tag[attr]`. */
  benign?: Set<string>;
  /** `tag[attr]=value` pairs that are kept even when benign, because the reference has them. */
  keep?: Set<string>;
  /** Collects every `tag[attr]=value` pair seen, to build `keep` for the other side. */
  seen?: Set<string>;
  /** remark's side: mdast-util-to-hast ends every code block with a newline that Comark doesn't add. */
  codeNewline?: boolean;
}

function style(value: string): string {
  return value
    .split(";")
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon < 0) return declaration.trim();
      const property = declaration.slice(0, colon).trim();
      // Custom properties (`--X`) are case-sensitive; standard ones aren't.
      return `${property.startsWith("--") ? property : property.toLowerCase()}:${declaration
        .slice(colon + 1)
        .replace(COLLAPSIBLE, " ")
        .trim()}`;
    })
    .filter(Boolean)
    .join(";");
}

function attributes(element: Element, options: NormalizeOptions): string {
  const properties: Properties = { ...element.properties };
  // remark-rehype aligns table cells with `align`, Comark with a style; on a cell both draw the same.
  if (
    (element.tagName === "td" || element.tagName === "th") &&
    typeof properties.align === "string"
  ) {
    properties.style = `text-align:${properties.align}${properties.style ? `;${properties.style}` : ""}`;
    delete properties.align;
  }
  const out: string[] = [];
  for (const [key, raw] of Object.entries(properties)) {
    let name = find(html, key).attribute;
    let value: unknown = raw;
    // MDC binds `:name="json"`; `:autoplay="true"` and a bare `autoplay` mean the same.
    if (name.startsWith(":") && typeof value === "string") {
      name = name.slice(1);
      try {
        const parsed: unknown = JSON.parse(value);
        value = typeof parsed === "string" || typeof parsed === "boolean" ? parsed : value;
      } catch {}
    }
    if (value === false || value == null) continue;
    // `x=""` and a bare `x` are the same attribute in HTML.
    let text: string | true;
    if (value === true || value === "") text = true;
    else if (Array.isArray(value))
      text = (
        name === "class"
          ? [...value].map((item) => `${item as string}`).sort()
          : value.map((item) => `${item as string}`)
      ).join(" ");
    else text = name === "style" ? style(String(value as string)) : String(value as string);
    const pair = `${element.tagName}[${name}]=${String(text)}`;
    options.seen?.add(pair);
    if (options.benign?.has(`${element.tagName}[${name}]`) && !options.keep?.has(pair)) continue;
    // JSON quoting keeps a value holding `"` from reading as two attributes.
    out.push(text === true ? name : `${name}=${JSON.stringify(text)}`);
  }
  return out
    .sort()
    .map((attribute) => ` ${attribute}`)
    .join("");
}

function walk(node: Nodes, tokens: Token[], verbatim: boolean, options: NormalizeOptions) {
  if (node.type === "root") {
    for (const child of node.children) walk(child, tokens, verbatim, options);
  } else if (node.type === "element") {
    tokens.push(`<${node.tagName}${attributes(node, options)}>`);
    const children =
      node.tagName === "template" && node.content ? node.content.children : node.children;
    for (const child of children)
      walk(child, tokens, verbatim || VERBATIM.has(node.tagName), options);
    if (!VOID.has(node.tagName)) tokens.push(`</${node.tagName}>`);
  } else if (node.type === "text") {
    tokens.push(verbatim ? `=${node.value}` : `#${node.value}`);
  }
}

const tagOf = (token: Token) => /^<\/?([\w-]+)/.exec(token)?.[1];

/** HTML as a list of tokens that compare equal when the two documents render the same. */
export function normalize(source: string, options: NormalizeOptions = {}): Token[] {
  const tree = fromHtml(source, { fragment: true });
  canonicalize(tree);
  const raw: Token[] = [];
  walk(tree, raw, false, options);
  // Text split by a comment or by the parser is one run of text.
  const merged: Token[] = [];
  for (const token of raw) {
    const last = merged.at(-1);
    const text = token[0] === "#" || token[0] === "=";
    if (text && last?.[0] === token[0]) merged[merged.length - 1] = last + token.slice(1);
    else merged.push(token);
  }
  // Whitespace renders as one space, and not at all at the start or end of a line box.
  const out: Token[] = [];
  let lineStart = true;
  let lastSpace = false;
  let lastText = -1;
  for (const [index, token] of merged.entries()) {
    if (token[0] === "=") {
      // Only a Markdown code block (`<pre><code>`) gets remark's newline; raw `<pre>` is passed through as written.
      const closesPre = merged[index + 1] === "</code>" && merged[index + 2] === "</pre>";
      const text =
        options.codeNewline && closesPre ? token.slice(1).replace(/\n$/, "") : token.slice(1);
      if (text) out.push(`=${text}`);
      lineStart = false;
      lastSpace = false;
      lastText = -1;
      continue;
    }
    if (token[0] === "#") {
      let text = token.slice(1).replace(COLLAPSIBLE, " ");
      if (lineStart || lastSpace) text = text.replace(/^ /, "");
      if (!text) continue;
      out.push(`#${text}`);
      lastText = out.length - 1;
      lineStart = false;
      lastSpace = text.endsWith(" ");
      continue;
    }
    const name = tagOf(token) ?? "";
    if (BLOCK.has(name)) {
      if (lastText >= 0) {
        const trimmed = out[lastText]!.replace(/ $/, "");
        if (trimmed === "#") out.splice(lastText, 1);
        else out[lastText] = trimmed;
      }
      lastText = -1;
      lineStart = true;
      lastSpace = false;
    } else if (VOID.has(name) || token[1] !== "/") {
      // An image or input is content: the spaces around it render. An inline open tag doesn't end a text run.
      if (VOID.has(name)) {
        lineStart = false;
        lastSpace = false;
        lastText = -1;
      }
    }
    out.push(token);
  }
  // The end of the document ends a line box too.
  if (lastText >= 0) {
    const trimmed = out[lastText]!.replace(/ $/, "");
    if (trimmed === "#") out.splice(lastText, 1);
    else out[lastText] = trimmed;
  }
  return out;
}
