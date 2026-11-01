import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import type { PeleConfig } from "comark-pele";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type MermaidOptions = PeleConfig & {
  /** How many diagrams a document draws. The ones after show their source as a code block. */
  maxDiagrams?: number;
  /** How many characters of Mermaid source a document draws, over all its diagrams. A diagram past it shows its source. */
  maxSource?: number;
};

type Meta = { issues: string[]; issueRules: Record<string, string> };

function diagramsOf(nodes: Node[], found: ElementNode[] = []) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "pele") found.push(node);
    else diagramsOf(childrenOf(node), found);
  }
  return found;
}

/**
 * Turns the diagrams past a document's limits back into code blocks, before comark-code reads them, so a host that
 * renders other people's documents bounds the time Pele spends drawing. Each one it turns back is a `meta.issues` entry.
 */
export default defineComarkPlugin<MermaidOptions, Meta>(
  ({ maxDiagrams = Infinity, maxSource = Infinity } = {}) => ({
    name: "comark-ui-mermaid-limits",
    post({ tree }) {
      const issues: [string, string][] = [];
      let drawn = 0;
      let source = 0;
      for (const [n, node] of diagramsOf(tree.nodes).entries()) {
        // SAFETY: comark-pele writes the fence's text on every node as `content`.
        const content = node[1].content as string;
        const why =
          drawn >= maxDiagrams
            ? [
                "comark/mermaid/too-many-diagrams",
                `a document draws at most ${maxDiagrams} Mermaid diagrams. Move it to another document`,
              ]
            : source + content.length > maxSource
              ? [
                  "comark/mermaid/source-too-long",
                  `a document draws at most ${maxSource} characters of Mermaid. Shorten it or move it to another document`,
                ]
              : undefined;
        if (!why) {
          drawn++;
          source += content.length;
          continue;
        }
        // SAFETY: comark-pele writes the fence's language on every node as a string.
        const language = (node[1].language as string | undefined) ?? "mermaid";
        node.splice(0, node.length, "pre", { language }, [
          "code",
          { class: `language-${language}` },
          content.replace(/\n$/, ""),
        ]);
        issues.push([
          why[0],
          `Mermaid diagram ${n + 1} shows its source as code, because ${why[1]}.`,
        ]);
      }
      if (!issues.length) return;
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map(([, message]) => message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map(([rule, message]) => [message, rule])),
      };
    },
  }),
);
