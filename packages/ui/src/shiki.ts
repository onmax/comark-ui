import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

type Token = { content: string; color?: string; htmlStyle?: Record<string, string> };

/** What the preset needs of a Shiki highlighter: a `HighlighterCore` from `shiki/core` fits it. */
export type ShikiHighlighter = {
  codeToTokens(
    code: string,
    options: { lang: string; themes: { light: string; dark?: string } },
  ): { tokens: Token[][] };
};

export type ShikiOptions = {
  /**
   * Your Shiki, with the fence's language loaded, or `undefined` to leave the block plain. It's called for every fenced
   * block with a language, so load each grammar once.
   */
  highlighter: (
    language: string,
  ) => ShikiHighlighter | undefined | Promise<ShikiHighlighter | undefined>;
  /** Theme names your highlighter has loaded. The dark one goes in `--shiki-dark`, which the typeset styles follow. */
  themes: { light: string; dark?: string };
  /** How many code blocks a document highlights. The ones after show without colors. */
  maxBlocks?: number;
  /** How many characters of code a document highlights, over all its blocks. A block past it shows without colors. */
  maxSource?: number;
};

type Meta = { issues: string[]; issueRules: Record<string, string> };

function blocksOf(nodes: Node[], found: ElementNode[] = []) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    // Raw HTML's `pre` is the author's own markup, not a fence.
    // SAFETY: Comark marks a node that came from raw HTML with `$: { html: 1 }`.
    if (node[0] === "pre" && (node[1].$ as { html?: number } | undefined)?.html !== 1)
      found.push(node);
    else blocksOf(childrenOf(node), found);
  }
  return found;
}

const spanOf = (token: Token): Node => {
  const style = Object.entries(token.htmlStyle ?? (token.color ? { color: token.color } : {}))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return style ? ["span", { style }, token.content] : token.content;
};

/**
 * Highlights fenced code with the host's own Shiki, before comark-code reads the lines, within a document's limits, so
 * a host that renders other people's documents bounds the time Shiki spends. Each block past them is a `meta.issues`
 * entry. A grammar that fails leaves its block plain.
 */
export default defineComarkPlugin<ShikiOptions, Meta>((options) => ({
  name: "comark-ui-shiki",
  async post({ tree }) {
    const { highlighter, themes, maxBlocks = Infinity, maxSource = Infinity } = options!;
    const issues: [string, string][] = [];
    let drawn = 0;
    let source = 0;
    for (const [n, pre] of blocksOf(tree.nodes).entries()) {
      const code = childrenOf(pre)[0];
      // SAFETY: Comark writes a fence's language as a string.
      const language = pre[1].language as string | undefined;
      if (!language || !isElement(code) || code[0] !== "code") continue;
      const [text, ...rest] = childrenOf(code);
      if (text === undefined || Array.isArray(text) || rest.length) continue;

      let shiki: ShikiHighlighter | undefined;
      try {
        shiki = await highlighter(language);
      } catch {}
      if (!shiki) continue;
      const why =
        drawn >= maxBlocks
          ? [
              "comark/shiki/too-many-blocks",
              `a document highlights at most ${maxBlocks} code blocks. Move it to another document`,
            ]
          : source + text.length > maxSource
            ? [
                "comark/shiki/source-too-long",
                `a document highlights at most ${maxSource} characters of code. Shorten it or move it to another document`,
              ]
            : undefined;
      if (why) {
        issues.push([why[0], `Code block ${n + 1} shows without colors, because ${why[1]}.`]);
        continue;
      }

      let tokens: Token[][];
      try {
        tokens = shiki.codeToTokens(text, { lang: language, themes }).tokens;
      } catch {
        continue;
      }
      drawn++;
      source += text.length;
      const lines = tokens.flatMap((line, index): Node[] => [
        ...(index ? ["\n"] : []),
        ["span", { class: "line" }, ...line.map(spanOf)],
      ]);
      code.splice(2, code.length - 2, ...lines);
      // SAFETY: Comark writes a fence's class as a string.
      pre[1].class = ["shiki", pre[1].class as string | undefined].filter(Boolean).join(" ");
    }
    if (!issues.length) return;
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map(([, message]) => message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map(([rule, message]) => [message, rule])),
    };
  },
}));
