import { parseMarkdown } from "comark";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";
import { toHtml } from "./serialize.ts";
import type { ComarkSetup } from "../../src/setup.ts";

export type { ComarkSetup };

export interface RemarkSetup {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
}

/** The HTML a remark site renders: GFM and frontmatter, raw HTML passed through, plus the site's own plugins. */
export async function remarkHtml(
  markdown: string,
  setup: RemarkSetup = {},
  path?: string,
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .use(setup.remarkPlugins ?? [])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(setup.rehypePlugins ?? [])
    .use(rehypeStringify)
    // Plugins that resolve relative files read the path from the VFile.
    .process(path ? { value: markdown, path } : markdown);
  return String(file);
}

/** Comark's parse tree as HTML: what every Comark renderer draws from. */
export async function comarkHtml(
  markdown: string,
  setup: Partial<ComarkSetup> = {},
): Promise<string> {
  const document = await parseMarkdown(markdown, {
    ...setup.options,
    plugins: setup.plugins ?? [],
  });
  return toHtml(document.nodes);
}
