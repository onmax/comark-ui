import type { Node } from "comark";

const VOID = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

const escapeText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttribute = (text: string) => escapeText(text).replace(/"/g, "&quot;");

function attribute(name: string, value: unknown): string {
  if (value === false || value == null) return "";
  if (value === true) return ` ${name}`;
  const text =
    typeof value === "string"
      ? value
      : Array.isArray(value) && name === "class"
        ? value.join(" ")
        : JSON.stringify(value);
  return ` ${name}="${escapeAttribute(text)}"`;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Comark's tree as plain HTML. The harness compares the tree every renderer starts from, so a formatting bug in one
 * renderer (see UPSTREAM.md) doesn't hide or fake a parser difference.
 */
export function toHtml(nodes: Node[]): string {
  return nodes
    .map((node) => {
      if (typeof node === "string") return escapeText(node);
      if (node[0] === null) return `<!--${node[2]}-->`;
      const [tag, attributes, ...children] = node;
      const { $: _meta, ...rest } = attributes;
      const open = `<${tag}${Object.entries(rest)
        // `:name` props hold JSON, so `:disabled="true"` is the boolean attribute.
        .map(([name, value]) =>
          name.startsWith(":")
            ? attribute(name.slice(1), parseJson(value))
            : attribute(name, value),
        )
        .join("")}>`;
      if (VOID.has(tag)) return open;
      return `${open}${toHtml(children as Node[])}</${tag}>`;
    })
    .join("");
}
