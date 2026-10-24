// Elements dropped with everything inside them: they run scripts, embed other documents, or animate a link into one.
const DROPPED = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
  "handler",
  "listener",
]);
const LINKS = new Set(["href", "xlink:href", "src"]);
const TAG =
  /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[^\s"'=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;
const ATTRIBUTE = /([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const SKIPPED = /<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/giy;
const CDATA = /<!\[CDATA\[[\s\S]*?\]\]>/y;

// CSS allows identifier characters to be escaped as a backslash followed by up to six hex digits (and optional
// whitespace), or by a single escaped character. Match both forms so an escaped `@import` cannot load a stylesheet.
const cssChar = (char: string) => `(?:${char}|\\\\(?:[0-9a-f]{1,6}\\s*|[^\\r\\n]))`;
const CSS_IMPORT = new RegExp(
  `@${cssChar("i")}${cssChar("m")}${cssChar("p")}${cssChar("o")}${cssChar("r")}${cssChar("t")}[^;]*(?:;|$)`,
  "gi",
);
const stripCssImports = (css: string) => css.replace(CSS_IMPORT, "");

// A link may jump within the drawing or open a web page, and nothing else: no `javascript:` or `data:`.
// Browsers drop spaces and control characters from a URL before reading its scheme, so the check does too.
const safeLink = (value: string) =>
  /^(?:#|https?:\/\/)/i.test(value.replace(/[^\x21-\u{10FFFF}]/gu, ""));

function attributes(source: string) {
  let out = "";
  for (const [, name = "", double, single, bare] of source.matchAll(ATTRIBUTE)) {
    const key = name.toLowerCase();
    const value = double ?? single ?? bare ?? "";
    if (key.startsWith("on") || (LINKS.has(key) && !safeLink(value))) continue;
    out += ` ${name}="${value.replaceAll('"', "&quot;")}"`;
  }
  return out;
}

/**
 * Keeps an SVG drawing and drops what could run: scripts, event handlers, embedded documents, animations, links that
 * aren't to the web or within the drawing, and `@import` in its styles. The XML prolog, doctype, and comments go too,
 * since they don't belong inside HTML. Text is kept as the drawing escaped it, and anything that isn't a tag is escaped.
 */
export function sanitizeSvg(svg: string): string {
  let out = "";
  // The dropped element being skipped, and how deep it nests within itself.
  let dropping: { name: string; depth: number } | undefined;
  let at = 0;
  while (at < svg.length) {
    const lt = svg.indexOf("<", at);
    const text = svg.slice(at, lt === -1 ? svg.length : lt);
    if (!dropping) out += text.replace(/>/g, "&gt;");
    if (lt === -1) break;
    at = lt;
    SKIPPED.lastIndex = at;
    if (SKIPPED.exec(svg)) {
      at = SKIPPED.lastIndex;
      continue;
    }
    CDATA.lastIndex = at;
    const cdata = CDATA.exec(svg);
    if (cdata) {
      if (!dropping) out += stripCssImports(cdata[0]);
      at = CDATA.lastIndex;
      continue;
    }
    TAG.lastIndex = at;
    const tag = TAG.exec(svg);
    if (!tag) {
      if (!dropping) out += "&lt;";
      at++;
      continue;
    }
    at = TAG.lastIndex;
    const [, closing, name = "", rest = "", selfClosing] = tag;
    const key = name.toLowerCase();
    if (dropping) {
      if (key === dropping.name && !selfClosing) dropping.depth += closing ? -1 : 1;
      if (dropping.depth === 0) dropping = undefined;
      continue;
    }
    if (DROPPED.has(key)) {
      if (!closing && !selfClosing) dropping = { name: key, depth: 1 };
      continue;
    }
    out += closing ? `</${name}>` : `<${name}${attributes(rest)}${selfClosing ? "/" : ""}>`;
  }
  // A style's text is CSS, where `@import` loads from anywhere.
  return out
    .replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_, open: string, css: string, close: string) => open + stripCssImports(css) + close,
    )
    .trim();
}
