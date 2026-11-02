import { parseMarkdown, type ComarkPlugin, type ParserOptions } from "comark";
import { Marked, type MarkedExtension, type MarkedOptions } from "marked";
import { toHtml } from "./serialize.ts";

/** The HTML marked renders with its defaults, the given options, and extensions, synchronously. */
export function markedHtml(
  markdown: string,
  options: MarkedOptions = {},
  extensions: MarkedExtension[] = [],
): string {
  return new Marked(...extensions).parse(markdown, { ...options, async: false });
}

export interface ComarkSetup {
  plugins?: ComarkPlugin[];
  options?: Omit<ParserOptions, "plugins">;
}

/** Comark's parse tree as HTML: what every Comark renderer draws from. */
export async function comarkHtml(markdown: string, setup: ComarkSetup = {}): Promise<string> {
  const document = await parseMarkdown(markdown, {
    ...setup.options,
    plugins: setup.plugins ?? [],
  });
  return toHtml(document.nodes);
}
