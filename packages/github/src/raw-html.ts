import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import comarkHtml from "comark/plugins/html";
import { isElement } from "../../../shared/nodes.ts";

// GitHub's allowlist, from its html-pipeline sanitization filter, plus the `picture` and `source` it allows for
// light and dark images.
const TAGS = new Set(
  (
    "a abbr b bdo blockquote br caption cite code dd del details dfn div dl dt em figcaption figure h1 h2 h3 h4 h5 " +
    "h6 hr i img ins kbd li mark ol p picture pre q rp rt ruby s samp small source span strike strong sub summary " +
    "sup table tbody td tfoot th thead time tr tt ul var wbr"
  ).split(" "),
);
const ATTRIBUTES = new Set(
  (
    "abbr accept accept-charset accesskey action align alt aria-describedby aria-hidden aria-label " +
    "aria-labelledby axis border cellpadding cellspacing char charoff charset checked clear color cols colspan " +
    "compact coords datetime dir disabled enctype for frame headers height hreflang hspace ismap itemprop label " +
    "lang maxlength media method multiple name nohref noshade nowrap open progress prompt readonly rel rev role " +
    "rows rowspan rules scope selected shape size span start summary tabindex target title type usemap valign " +
    "value vspace width"
  ).split(" "),
);
const TAG_ATTRIBUTES = new Map([
  ["a", ["href"]],
  ["blockquote", ["cite"]],
  ["del", ["cite"]],
  ["div", ["itemscope", "itemtype"]],
  ["img", ["src", "srcset", "longdesc"]],
  ["ins", ["cite"]],
  ["q", ["cite"]],
  ["source", ["srcset"]],
]);
// Removed with their content, which would otherwise show as text.
const DROPPED = new Set(["script", "style"]);
const SCHEME = /^([a-z][a-z\d+.-]*):/i;
const URLS = new Set(["href", "src", "srcset", "cite", "longdesc"]);

// Relative URLs and http(s) pass everywhere, and links may also be mailto. Browsers skip tabs and newlines inside a
// scheme, so `java\nscript:` is read as `javascript:`.
function allowed(name: string, value: unknown) {
  const text = String(value);
  const urls =
    name === "srcset" ? text.split(",").map((part) => part.trim().split(/\s+/)[0] ?? "") : [text];
  return urls.every((url) => {
    const scheme = SCHEME.exec(url.replace(/[\t\n\r]/g, "").trim())?.[1]?.toLowerCase();
    return (
      !scheme || scheme === "http" || scheme === "https" || (name === "href" && scheme === "mailto")
    );
  });
}

function clean(tag: string, attributes: ElementNode[1]): ElementNode[1] {
  const kept: ElementNode[1] = { $: attributes.$ };
  for (const [key, value] of Object.entries(attributes)) {
    // Comark writes a boolean attribute such as `open` as the binding `:open`.
    const name = (key.startsWith(":") ? key.slice(1) : key).toLowerCase();
    if (!ATTRIBUTES.has(name) && !TAG_ATTRIBUTES.get(tag)?.includes(name)) continue;
    if (URLS.has(name) && !allowed(name, value)) continue;
    kept[key] = value;
  }
  return kept;
}

function sanitize(nodes: Node[], start: number) {
  for (let index = nodes.length - 1; index >= start; index--) {
    const node = nodes[index];
    if (!isElement(node)) continue;
    // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
    sanitize(node as Node[], 2);
    if (!node[1].$?.html) continue;
    const [name, attributes, ...children] = node;
    const tag = name.toLowerCase();
    if (DROPPED.has(tag)) nodes.splice(index, 1);
    else if (!TAGS.has(tag)) nodes.splice(index, 1, ...children);
    else node[1] = clean(tag, attributes);
  }
}

/**
 * Raw HTML as GitHub renders it: its allowed tags and attributes stay, `script` and `style` go with their content,
 * any other tag gives way to its content, and a URL must be relative, http, https, or (for links) mailto. It is named
 * `html`, so it takes the place of Comark's built-in html plugin. Components written as Markdown aren't touched.
 */
export const html = /* @__PURE__ */ defineComarkPlugin(() => ({
  ...comarkHtml(),
  name: "html",
  post(state) {
    sanitize(state.tree.nodes, 0);
  },
}));
