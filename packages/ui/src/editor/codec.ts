import type { AnyExtension, JSONContent } from "@tiptap/core";
import type { ComarkPlugin } from "comark";
import { ComarkKit, type ComarkKitOptions } from "./kit.ts";
import {
  checkMarkdown,
  fromMarkdown,
  readFrontmatter,
  type SplitMarkdown,
  toMarkdown,
  withFrontmatter,
} from "./markdown.ts";

/**
 * A schema and Markdown codec that a server and its browsers share, as a collaborative room needs: the server converts
 * the stored Markdown with it, and every editor that joins builds the same schema from `extensions()`. ViteHub
 * Realtime's `editor` option takes it as it is.
 *
 * A room holds the body as the editor's document and the frontmatter as its fields, a map of one value per key, so an
 * edit to the text never writes over the metadata. `split()` and `join()` convert between a stored file and the two.
 */
export interface EditorCodec {
  extensions(): AnyExtension[];
  /** Reads a room's body, without frontmatter. */
  fromMarkdown(markdown: string): Promise<JSONContent>;
  /** Writes a room's body, without frontmatter. */
  toMarkdown(doc: JSONContent): Promise<string>;
  /**
   * Splits a stored file into the room's body and fields. Frontmatter a save couldn't write back stays in the body,
   * where `verify()` says why the room can't save it.
   */
  split(markdown: string): SplitMarkdown;
  /** Joins a room's body and fields into the file to store. */
  join(document: SplitMarkdown): string;
  /**
   * Whether the room may save this body. `canonical` is what the first save writes for it unchanged, and `issues` says
   * why a body that still holds frontmatter can't be saved. The fields need no check: every JSON value survives YAML.
   */
  verify(
    markdown: string,
  ): Promise<{ writable: boolean; canonical?: string; issues?: { message: string }[] }>;
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
    async fromMarkdown(markdown) {
      // Comark throws on invalid YAML. `verify()` keeps such a room read-only, and it still opens with the text below.
      const frontmatter = readFrontmatter(markdown);
      return (
        await fromMarkdown(frontmatter.kind === "lost" ? (frontmatter.body ?? markdown) : markdown)
      ).doc;
    },
    toMarkdown: (doc) => toMarkdown(doc),
    split(markdown) {
      const frontmatter = readFrontmatter(markdown);
      return frontmatter.kind === "kept"
        ? { body: frontmatter.body, fields: frontmatter.fields }
        : { body: markdown, fields: {} };
    },
    join: ({ body, fields }) => withFrontmatter(body, fields),
    async verify(markdown) {
      const frontmatter = readFrontmatter(markdown);
      if (frontmatter.kind !== "none") {
        const message =
          frontmatter.kind === "lost"
            ? frontmatter.problem
            : "The frontmatter is in the room's body, where a save would drop it; open the room with the codec's `split()` so it stays in the room's fields.";
        return { writable: false, issues: [{ message }] };
      }
      const check = await checkMarkdown(markdown, { plugins: options.plugins });
      return check.editable ? { writable: true, canonical: check.markdown } : { writable: false };
    },
  };
}
