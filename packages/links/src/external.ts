import type { Node } from "comark";
import { defineComarkPlugin } from "comark";
import { rawText } from "../../../shared/text.ts";
import { isElement } from "../../../shared/nodes.ts";

export interface ExternalOptions {
  /**
   * Where external links open, such as `"_blank"` for a new tab. Default `false`: they open where the reader chooses,
   * which is why rehype-external-links v2 stopped opening new tabs by default.
   */
  target?: string | false;
  /** Words added to external links' `rel`, such as `["nofollow"]`. `noopener` is added whenever the target is `_blank`. */
  rel?: string[];
  /** Your own hosts, such as `example.com`, whose links count as internal. List each subdomain you use. */
  hosts?: string[];
  /** Whether a link is external, from its `href`. By default, an http or https URL whose host isn't in `hosts`. */
  test?: (href: string) => boolean;
  /** Draws ↗ after a link that opens a new tab. Default `true`. */
  icon?: boolean;
  /** What screen readers hear after a link that opens a new tab. Default `"(opens in a new tab)"`; `""` leaves it out. */
  label?: string;
}

/** The node that adds the styles. The plugin adds one at the end of a document with a link that opens a new tab. */
export const STYLES_TAG = "links-styles";

const SKIP = new Set(["code", "pre"]);
// The targets that stay in the reader's own tab.
const SAME_TAB = new Set(["", "_self", "_parent", "_top"]);

function hostTest(hosts: string[]) {
  // A host written as a URL still counts by its name.
  const own = new Set(
    hosts.map((host) =>
      host
        .replace(/^[a-z][\w+.-]*:\/\//i, "")
        .replace(/\/.*$/, "")
        .toLowerCase(),
    ),
  );
  return (href: string) => {
    if (!/^(?:https?:)?\/\//i.test(href)) return false;
    let url: URL;
    try {
      url = new URL(href, "https://comark.invalid");
    } catch {
      return false;
    }
    return !own.has(url.host) && !own.has(url.hostname);
  };
}

/**
 * Writes `target` and `rel` on external links while parsing, so every renderer outputs them unchanged, and keeps a
 * link's own `{target}` and `{rel}`. A link that opens a new tab gets ↗ and a warning screen readers hear before they
 * follow it, as WCAG's G201 asks.
 */
export const external = defineComarkPlugin<ExternalOptions>((options = {}) => {
  const target = options.target || "";
  const rel = options.rel ?? [];
  const test = options.test ?? hostTest(options.hosts ?? []);
  const icon = options.icon ?? true;
  const label = options.label ?? "(opens in a new tab)";
  const warning: Node[] = [];
  if (icon) warning.push(["span", { class: "cl-icon", "aria-hidden": "true" }, "↗"]);
  if (label) warning.push(["span", { class: "cl-sr" }, label]);

  function walk(nodes: Node[]): boolean {
    let warned = false;
    for (const node of nodes) {
      if (!isElement(node) || SKIP.has(node[0])) continue;
      const [tag, attrs] = node;
      const href = rawText(attrs.href);
      if (tag === "a" && href) {
        const external = test(href);
        if (external && target && attrs.target === undefined) attrs.target = target;
        const opens = rawText(attrs.target);
        const own = rawText(attrs.rel).split(/\s+/).filter(Boolean);
        const words = new Set([
          ...(external ? rel : []),
          ...own,
          ...(opens === "_blank" ? ["noopener"] : []),
        ]);
        if (words.size) attrs.rel = [...words].join(" ");
        if (!SAME_TAB.has(opens) && warning.length) {
          node.push(...structuredClone(warning));
          warned = true;
        }
        continue;
      }
      // SAFETY: an element node is [tag, attributes, ...children], so everything after index 1 is a child node.
      if (walk(node.slice(2) as Node[])) warned = true;
    }
    return warned;
  }

  return {
    name: "comark-links-external",
    post(state) {
      if (walk(state.tree.nodes)) state.tree.nodes.push([STYLES_TAG, {}]);
    },
  };
});
