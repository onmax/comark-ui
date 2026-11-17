import type { Node } from "comark";

/** The elements Temml writes, so a host's `security` allowlist keeps a formula's MathML: `a` is a `\ref`. */
export const MATHML_TAGS = (
  "a annotation math menclose merror mfrac mglyph mi mmultiscripts mn mo mover mpadded mphantom mprescripts mroot mrow ms " +
  "mspace msqrt mstyle msub msubsup msup mtable mtd mtext mtr munder munderover none semantics"
).split(" ");
/** The elements KaTeX's `"html"` and `"htmlAndMathml"` output add to MathML's: its boxes, and its SVG for stretchy marks. */
export const KATEX_TAGS = "line path span svg".split(" ");

const ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);
const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, name: string) => {
    if (name[0] !== "#") return ENTITIES.get(name) ?? entity;
    const code =
      name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return String.fromCodePoint(code);
  });

const TOKEN = /<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+=(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTRIBUTE = /([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g;

/**
 * The typesetter's markup as Comark nodes, so a formula reaches the renderers as elements a host's `security` plugin
 * checks one by one, rather than as a string of HTML they would have to trust. Temml and KaTeX write well-formed
 * markup with quoted attributes and escaped text, which is all this reads.
 */
export function markupToNodes(markup: string): Node[] {
  type Frame = { tag: string; attrs: Record<string, string>; children: Node[] };
  const root: Node[] = [];
  const open: Frame[] = [];
  const childrenOf = () => open.at(-1)?.children ?? root;
  const close = (tag?: string) => {
    if (tag !== undefined && open.at(-1)?.tag !== tag) return;
    const frame = open.pop();
    if (frame) childrenOf().push([frame.tag, frame.attrs, ...frame.children]);
  };
  for (const [, closing, tag, attributes = "", selfClosing, text] of markup.matchAll(TOKEN)) {
    if (text !== undefined) childrenOf().push(decode(text));
    else if (closing) close(closing);
    else if (tag) {
      const attrs = Object.fromEntries(
        [...attributes.matchAll(ATTRIBUTE)].map(([, name = "", double, single]) => [
          name,
          decode(double ?? single ?? ""),
        ]),
      );
      if (selfClosing) childrenOf().push([tag, attrs]);
      else open.push({ tag, attrs, children: [] });
    }
  }
  while (open.length) close();
  return root;
}
