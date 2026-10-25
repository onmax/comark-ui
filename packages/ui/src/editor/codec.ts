import type { AnyExtension, JSONContent } from "@tiptap/core";
import type { ComarkPlugin } from "comark";
import { ComarkKit, type ComarkKitOptions } from "./kit.ts";
import { checkMarkdown, fromMarkdown, toMarkdown } from "./markdown.ts";

/**
 * A schema and Markdown codec that a server and its browsers share, as a collaborative room needs: the server converts
 * the stored Markdown with it, and every editor that joins builds the same schema from `extensions()`. ViteHub
 * Realtime's `editor` option takes it as it is.
 */
export interface EditorCodec {
  extensions(): AnyExtension[];
  fromMarkdown(markdown: string): Promise<JSONContent>;
  toMarkdown(doc: JSONContent): Promise<string>;
  /** Whether the room may save this document. `canonical` is what the first save writes for it unchanged. */
  verify(markdown: string): Promise<{ writable: boolean; canonical?: string }>;
}

export interface EditorCodecOptions {
  kit?: ComarkKitOptions;
  /** The parse plugins the page renders with, so a document only they read opens read-only. */
  plugins?: readonly ComarkPlugin<any, any>[];
}

export function createEditorCodec(options: EditorCodecOptions = {}): EditorCodec {
  // Yjs keeps the history, and each collaborator's trailing paragraph would pile up in the shared document.
  const kit = ComarkKit.configure({
    ...options.kit,
    starterKit: { undoRedo: false, trailingNode: false, ...options.kit?.starterKit },
  });
  return {
    extensions: () => [kit],
    fromMarkdown: async (markdown) => (await fromMarkdown(markdown)).doc,
    toMarkdown: (doc) => toMarkdown(doc),
    async verify(markdown) {
      // A room keeps only the body, so it would drop front matter on the first save.
      if (Object.keys((await fromMarkdown(markdown)).frontmatter).length)
        return { writable: false };
      const check = await checkMarkdown(markdown, { plugins: options.plugins });
      return check.editable ? { writable: true, canonical: check.markdown } : { writable: false };
    },
  };
}
