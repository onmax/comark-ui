import type { Element, ElementContent, Root, RootContent } from "hast";

/**
 * Comark draws some features as components that each renderer styles, where remark plugins write the final markup.
 * Each rule rewrites both sides of a comparison into one canonical element, so the harness compares what the reader
 * gets (the formula, the alert type and body) rather than two markups for it.
 */
type Rule = (node: Element) => Element | undefined;

const classes = (node: Element): string[] => {
  const value: unknown = node.properties.className;
  return Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(" ")
      : [];
};

const text = (node: ElementContent | RootContent): string =>
  node.type === "text" ? node.value : "children" in node ? node.children.map(text).join("") : "";

function find(node: Element, test: (node: Element) => boolean): Element | undefined {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (test(child)) return child;
    const found = find(child, test);
    if (found) return found;
  }
  return undefined;
}

const canonical = (
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[],
): Element => ({ type: "element", tagName, properties, children });

const rules: Rule[] = [
  // rehype-katex: <span class="katex-display"><span class="katex">…<annotation>tex</annotation>…
  (node) => {
    const display = classes(node).includes("katex-display");
    if (!display && !classes(node).includes("katex")) return undefined;
    const annotation = find(node, (child) => child.tagName === "annotation");
    return canonical("x-math", { display: display ? "block" : "inline" }, [
      { type: "text", value: annotation ? text(annotation).trim() : "" },
    ]);
  },
  // Comark math: <math class="math inline" content="tex">
  (node) => {
    if (node.tagName !== "math" || !classes(node).includes("math")) return undefined;
    return canonical("x-math", { display: classes(node).includes("block") ? "block" : "inline" }, [
      { type: "text", value: String(node.properties.content ?? text(node)).trim() },
    ]);
  },
  // remark-github-blockquote-alert: <div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">…
  (node) => {
    const type = classes(node).find(
      (name) => name.startsWith("markdown-alert-") && name !== "markdown-alert-title",
    );
    if (node.tagName !== "div" || !type) return undefined;
    const body = node.children.filter(
      (child) => !(child.type === "element" && classes(child).includes("markdown-alert-title")),
    );
    return canonical("x-alert", { type: type.slice("markdown-alert-".length) }, body);
  },
  // remark-mdc slots: <component-slot v-slot:name>; Comark: <template name="name">
  (node) => {
    const slot = Object.keys(node.properties).find((key) => /^v-?slot:/i.test(key));
    if (node.tagName === "component-slot" && slot)
      return canonical("x-slot", { name: slot.replace(/^v-?slot:/i, "") }, node.children);
    // hast keeps a template's children in `content`.
    if (node.tagName === "template" && typeof node.properties.name === "string")
      return canonical(
        "x-slot",
        { name: node.properties.name },
        (node.content?.children as ElementContent[] | undefined) ?? node.children,
      );
    return undefined;
  },
  // Comark alert: <blockquote as="note">
  (node) =>
    node.tagName === "blockquote" && typeof node.properties.as === "string"
      ? canonical("x-alert", { type: node.properties.as.toLowerCase() }, node.children)
      : undefined,
];

export function canonicalize(tree: Root | Element): void {
  if (tree.type === "element" && tree.tagName === "template" && tree.content)
    canonicalize(tree.content as unknown as Root);
  tree.children = tree.children.map((child) => {
    if (child.type !== "element") return child;
    for (const rule of rules) {
      const replaced = rule(child);
      if (replaced) {
        canonicalize(replaced);
        return replaced;
      }
    }
    canonicalize(child);
    return child;
  }) as typeof tree.children;
}
