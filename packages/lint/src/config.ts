import type { LintOptions } from "./index.ts";

/** Every option but `file`, which names one document. */
export type Config = Omit<LintOptions, "file">;

/** Types a `lint-comark.config.ts`. Its plugins and components are added to the installed comark-ui packages. */
export const defineConfig = (config: Config): Config => config;

// Each one is an optional peer dependency, so a project lints with exactly the plugins it renders with. The names
// after a loader are blocks its renderer has no component for: comark-tabs turns `::code-group` into tabs while
// parsing, and renders each `:::tabs-item` inside `::tabs`.
const packages = [
  [
    "comark-ui/html",
    // comark-ui brings every package as its own dependency, which the project can't import. It comes first, since
    // Comark keeps the first plugin of each name, so a package also installed on its own doesn't run twice. Its
    // plugins get the options and blocks the entries below give their own: nothing drawn or downloaded, and files
    // read from disk.
    () =>
      import("comark-ui/html").then((module) => {
        const preset = module.default({
          cast: {},
          charts: { draw: false },
          chips: { download: false },
          badge: { download: false },
          diagrams: { draw: false },
          mermaid: false,
          github: { references: false, html: false },
          links: { external: false },
          table: {},
          tests: {},
        });
        return { default: () => preset.plugins, components: preset.components };
      }),
    [
      "code-group",
      "tabs-item",
      "stats",
      "table",
      "details",
      "accordion-item",
      "collapsible",
      "ref",
    ],
  ],
  ["comark-annotate/html", () => import("comark-annotate/html"), []],
  ["comark-carousel/html", () => import("comark-carousel/html"), []],
  ["comark-cast/html", () => import("comark-cast/html"), []],
  ["comark-code/html", () => import("comark-code/html"), []],
  ["comark-code-notes/html", () => import("comark-code-notes/html"), []],
  [
    "comark-charts/html",
    // Linting reads no drawings, so it loads no Vega.
    () =>
      import("comark-charts/html").then((module) => ({
        ...module,
        default: () => module.default({ draw: false }),
      })),
    [],
  ],
  ["comark-embed/html", () => import("comark-embed/html"), []],
  [
    "comark-footnotes",
    () => import("comark-footnotes").then((module) => ({ ...module, components: {} })),
    [],
  ],
  [
    "comark-github/html",
    // Of its plugins only callouts make blocks; references and raw HTML have nothing to lint.
    () => import("comark-github/html").then((module) => ({ ...module, default: module.callouts })),
    [],
  ],
  [
    "comark-chips/html",
    // Linting reads no images, so it downloads none.
    () =>
      import("comark-chips/html").then((module) => ({
        ...module,
        default: () => module.default({ download: false }),
      })),
    [],
  ],
  ["comark-cjk", () => import("comark-cjk").then((module) => ({ ...module, components: {} })), []],
  [
    "comark-pele",
    // Pele renders SVG directly; it has no lint components to discover.
    () => import("comark-pele").then((module) => ({ ...module, components: {} })),
    [],
  ],
  [
    "comark-diagrams/html",
    // Linting reads no drawings, so it sends no diagram to Kroki.
    () =>
      import("comark-diagrams/html").then((module) => ({
        ...module,
        default: () => module.default({ draw: false }),
      })),
    [],
  ],
  [
    "comark-critic",
    () => import("comark-critic").then((module) => ({ ...module, components: {} })),
    [],
  ],
  ["comark-colors/html", () => import("comark-colors/html"), []],
  // Syntax plugins have no components, and are loaded so their syntax isn't read as something else.
  [
    "comark-deflist",
    () => import("comark-deflist").then((module) => ({ ...module, components: {} })),
    [],
  ],
  [
    "comark-figure",
    () => import("comark-figure").then((module) => ({ ...module, components: {} })),
    [],
  ],
  ["comark-diff/html", () => import("comark-diff/html"), []],
  ["comark-icon/html", () => import("comark-icon/html"), []],
  [
    "comark-keys",
    () => import("comark-keys").then((module) => ({ ...module, components: {} })),
    [],
  ],
  ["comark-sources/html", () => import("comark-sources/html"), []],
  ["comark-properties/html", () => import("comark-properties/html"), []],
  [
    "comark-links/html",
    // Neither of its plugins makes blocks, so either one will do.
    () => import("comark-links/html").then((module) => ({ ...module, default: module.anchors })),
    [],
  ],
  ["comark-mark/html", () => import("comark-mark/html"), []],
  ["comark-mathml/html", () => import("comark-mathml/html"), []],
  ["comark-media/html", () => import("comark-media/html"), []],
  ["comark-metrics/html", () => import("comark-metrics/html"), ["stats"]],
  ["comark-steps/html", () => import("comark-steps/html"), []],
  [
    "comark-table/html",
    // `::table` shares its name with Markdown tables, which no component draws.
    () => import("comark-table/html"),
    ["table"],
  ],
  ["comark-cards/html", () => import("comark-cards/html"), []],
  [
    "comark-badge/html",
    // Linting draws no badges, so it fetches no npm or GitHub data.
    () =>
      import("comark-badge/html").then((module) => ({
        ...module,
        default: () => module.default({ download: false }),
      })),
    [],
  ],
  ["comark-qr/html", () => import("comark-qr/html"), []],
  ["comark-quiz/html", () => import("comark-quiz/html"), []],
  ["comark-fields/html", () => import("comark-fields/html"), []],
  [
    "comark-details/html",
    () => import("comark-details/html"),
    ["details", "accordion-item", "collapsible"],
  ],
  [
    "comark-reading-time",
    // It writes only `meta`, so it has no components and nothing to lint, but it runs as the host's would.
    () => import("comark-reading-time").then((module) => ({ ...module, components: {} })),
    [],
  ],
  ["comark-file-tree/html", () => import("comark-file-tree/html"), []],
  ["comark-tabs/html", () => import("comark-tabs/html"), ["code-group", "tabs-item"]],
  ["comark-tests/html", () => import("comark-tests/html"), []],
  [
    "comark-xref",
    // It draws with plain elements, so it has no components; `:ref` is replaced while parsing.
    () => import("comark-xref").then((module) => ({ ...module, components: {} })),
    ["ref"],
  ],
  ["comark-outline/html", () => import("comark-outline/html"), []],
  ["comark-zoom/html", () => import("comark-zoom/html"), []],
] as const;

const missing = (error: unknown, name: string) =>
  error instanceof Error &&
  "code" in error &&
  error.code === "ERR_MODULE_NOT_FOUND" &&
  error.message.match(/Cannot find package '([^']+)'/)?.[1] ===
    name.match(/^(@[^/]+\/)?[^/]+/)?.[0];

/** The parse plugins and components of every comark-ui package installed, plus `config`'s, and its other options. */
export async function resolveConfig(
  config: Config = {},
): Promise<Config & Required<Pick<LintOptions, "plugins" | "components">>> {
  const loaded = await Promise.all(
    packages.map(async ([name, load, blocks]) => {
      try {
        return { module: await load(), blocks };
      } catch (error) {
        if (missing(error, name)) return undefined;
        throw error;
      }
    }),
  );
  const found = loaded.filter((entry) => entry !== undefined);
  const extra = config.components ?? [];
  return {
    ...config,
    plugins: [...found.flatMap(({ module }) => module.default()), ...(config.plugins ?? [])],
    components: [
      ...found.flatMap(({ module, blocks }) => [...Object.keys(module.components), ...blocks]),
      ...(Array.isArray(extra) ? extra : Object.keys(extra)),
    ],
  };
}
