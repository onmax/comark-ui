// Renders a cell the gallery's editor changed, in the browser, with the plugins docs/build.ts renders its example
// with. It loads with the first edit, since it carries every plugin and Shiki.
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { highlighted, sitePlugins, withoutFor } from "./example-plugins.ts";
import { components } from "./plugins.ts";

// One list per package, since Comark caches a parser per list of plugins. A browser may not download another site's
// images, so chips and badges load theirs as links.
const listFor = (group: string) => {
  const without = withoutFor(group);
  return highlighted(
    sitePlugins(false, { download: false }).filter((plugin) => !without.includes(plugin.name)),
  );
};
const lists = new Map<string, ReturnType<typeof listFor>>();
const pluginsFor = (group: string) => {
  const list = lists.get(group) ?? listFor(group);
  lists.set(group, list);
  return list;
};

export async function render(source: string, group: string) {
  try {
    const document = await parseMarkdown(source, { plugins: pluginsFor(group) });
    return {
      html: await renderHtmlFromDocument(document, { components }),
      issues: document.meta.issues,
    };
  } catch (error) {
    return { html: "", issues: [error instanceof Error ? error.message : String(error)] };
  }
}
