// What the tests compare with: markdown-it's HTML, Comark's tree as HTML, and the normalized diff between them.
import { parseMarkdown } from "comark";
import MarkdownIt from "markdown-it";
import { comarkSetup, type SetupOptions } from "../../src/setup.ts";
import { markdownItPlugin } from "../../src/plugins/bridge.ts";
import { toHtml } from "./serialize.ts";

export { compare, type Comparison, type Difference } from "./compare.ts";
export { normalize, BENIGN } from "./normalize.ts";

/** markdown-it with a preset, options, and plugins, and Comark set up the same way with each plugin bridged. */
export function both(
  options: Omit<SetupOptions, "plugins"> & { plugins?: [unknown, ...unknown[]][] } = {},
) {
  const { plugins = [], preset, enable, disable, ...rest } = options;
  const set = Object.fromEntries(
    (["html", "linkify", "typographer", "breaks"] as const).flatMap((name) =>
      rest[name] === undefined ? [] : [[name, rest[name]]],
    ),
  );
  const md = new MarkdownIt(preset ?? "default", set);
  if (enable?.length) md.enable(enable);
  if (disable?.length) md.disable(disable);
  // SAFETY: each entry is a markdown-it plugin and its options.
  for (const [plugin, ...args] of plugins) md.use(plugin as never, ...(args as []));
  const setup = comarkSetup({
    ...options,
    plugins: plugins.map(([plugin, ...args]) => markdownItPlugin(plugin, ...args)),
  });
  return {
    markdownIt: (markdown: string) => md.render(markdown),
    comark: async (markdown: string) =>
      toHtml((await parseMarkdown(markdown, { ...setup.options, plugins: setup.plugins })).nodes),
  };
}
