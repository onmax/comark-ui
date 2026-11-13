import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { shikiDark } from "../../../../shared/shiki.ts";
import { addStyles } from "../../../../shared/styles.ts";
import type { ShikiHighlighter, ShikiOptions } from "../shiki.ts";

/** The preset's `shiki` option: the editor colors code with the same highlighter and themes as the page. */
export type CodeHighlightOptions = Pick<ShikiOptions, "highlighter" | "themes">;

export const codeHighlightKey = new PluginKey<DecorationSet>("comarkCodeHighlight");

/** The language a code block's `language` attribute names: its first word, as the preset reads a fence's. */
const languageOf = (node: ProseMirrorNode) =>
  String(node.attrs.language ?? "")
    .trim()
    .split(/\s/, 1)[0];

function styleOf(token: { color?: string; htmlStyle?: Record<string, string> }) {
  const style = token.htmlStyle ?? (token.color ? { color: token.color } : {});
  return Object.entries(style)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

/**
 * Colors the editor's code blocks with the page's Shiki, as decorations, so the document and its Markdown stay plain
 * and a collaborative room never sees the colors. A language loads the first time a block uses it. One the highlighter
 * doesn't have, or whose grammar fails, stays plain until the editor is created again, rather than retry on each key.
 */
export const CodeHighlight = Extension.create<CodeHighlightOptions>({
  name: "comarkCodeHighlight",
  addOptions: () => ({
    highlighter: () => undefined,
    themes: { light: "" },
  }),
  addProseMirrorPlugins() {
    const { highlighter, themes } = this.options;
    const ready = new Map<string, ShikiHighlighter>();
    const asked = new Set<string>();

    const decorate = (doc: ProseMirrorNode) => {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name !== "codeBlock") return;
        const language = languageOf(node);
        const shiki = language ? ready.get(language) : undefined;
        if (!shiki) return false;
        let tokens;
        try {
          ({ tokens } = shiki.codeToTokens(node.textContent, { lang: language, themes }));
        } catch {
          return false;
        }
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "shiki" }));
        let from = pos + 1;
        for (const line of tokens) {
          for (const token of line) {
            const style = styleOf(token);
            if (style)
              decorations.push(Decoration.inline(from, from + token.content.length, { style }));
            from += token.content.length;
          }
          from += 1;
        }
        return false;
      });
      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key: codeHighlightKey,
        state: {
          init: (_, { doc }) => decorate(doc),
          apply: (tr, previous) =>
            tr.docChanged || tr.getMeta(codeHighlightKey) ? decorate(tr.doc) : previous,
        },
        props: { decorations: (state) => codeHighlightKey.getState(state) },
        view(view) {
          addStyles("editor-highlight", `@layer comark{${shikiDark}}`);
          const load = () =>
            view.state.doc.descendants((node) => {
              if (node.type.name !== "codeBlock") return;
              const language = languageOf(node);
              if (language && !asked.has(language)) {
                asked.add(language);
                void Promise.resolve()
                  .then(() => highlighter(language))
                  .then((shiki) => {
                    if (!shiki || view.isDestroyed) return;
                    ready.set(language, shiki);
                    view.dispatch(view.state.tr.setMeta(codeHighlightKey, true));
                  })
                  .catch(() => {});
              }
              return false;
            });
          load();
          return { update: load };
        },
      }),
    ];
  },
});
