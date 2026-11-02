import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { glob as globFiles } from "tinyglobby";
import { migrateContent, type ContentOptions, type PluginUse } from "./content.ts";
import { isFunction, isRecord, isText } from "./guards.ts";
import { literal, type Literal } from "./literal.ts";
import type { RuleChange } from "./plugins/options.ts";
import type { Code } from "./diagnostics.ts";
import { rewriteSource } from "./rewrite.ts";
import { mentions, scanSource, type Host, type Setup } from "./scan.ts";
import type { SetupOptions } from "./setup.ts";

export interface Finding {
  code: Code;
  params: Record<string, unknown> & { at: string };
  file: string;
  line: number;
  /** What `rewrite --write` or `content --write` would change in the file, when it would write it. */
  edit?: Edit;
}

/** A span of the file's original text, as UTF-16 offsets, and the text that replaces it. */
export interface Edit {
  /** The exact input from which these offsets were computed. */
  source: string;
  start: number;
  end: number;
  text: string;
}

/** The one span where `after` differs from `before`, so an editor replaces only what changed. */
function edit(before: string, after: string): Edit {
  let start = 0;
  while (start < before.length && before[start] === after[start]) start++;
  let tail = 0;
  while (
    tail < before.length - start &&
    tail < after.length - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  )
    tail++;
  return {
    source: before,
    start,
    end: before.length - tail,
    text: after.slice(start, after.length - tail),
  };
}

/** How a check reads the project: the CLI uses the file system, the Vite Doctor extension its own `ctx.fs`. */
export interface ProjectReader {
  glob: (pattern: string) => string[] | Promise<string[]>;
  read: (file: string) => string | undefined;
}

/** Generated and installed files, skipped by the CLI and the Vite Doctor extension alike. */
export const IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/build/**",
  "**/.git/**",
];

export const nodeReader = (root: string): ProjectReader => ({
  glob: (pattern) => globFiles(pattern, { cwd: root, ignore: IGNORE, dot: true }),
  read: (file) => {
    try {
      return readFileSync(join(root, file), "utf8");
    } catch {
      return undefined;
    }
  },
});

type ScannedFile = { file: string; source: string; setups: Setup[] };
const CODE = "**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}";
const TESTS = /(^|\/)(test|tests|__tests__|__mocks__|fixtures?)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

/** Every markdown-it setup in the project's code, tests left out. */
export async function scanProject(reader: ProjectReader): Promise<ScannedFile[]> {
  const files = [];
  for (const file of (await reader.glob(CODE)).sort()) {
    if (/\.d\.[cm]?ts$/.test(file) || TESTS.test(file)) continue;
    const source = reader.read(file);
    if (!source || !mentions(source, file)) continue;
    try {
      const setups = scanSource(source, file);
      if (setups.length) files.push({ file, source, setups });
    } catch {
      // A file oxc can't parse is reported by the project's own build.
    }
  }
  return files;
}

/** The markdown-it options that decide how Markdown reads, from the setup's literal options. */
const READ_OPTIONS = [
  "html",
  "linkify",
  "typographer",
  "breaks",
  "quotes",
  "xhtmlOut",
  "langPrefix",
];

// What a framework's own markdown-it reads, beyond what the project registers on it: its options, and the syntax
// plugins it always loads, by package. Each is what the framework's current major version does by default.
const CONTAINERS = (names: string[]): [string, ...unknown[]][] =>
  names.map((name) => ["markdown-it-container", name]);
export const HOSTS: Partial<
  Record<
    Host,
    { options: Record<string, Literal>; plugins: [string, ...unknown[]][]; frontmatter: boolean }
  >
> = {
  vitepress: {
    options: { html: true, linkify: true },
    plugins: [
      ...CONTAINERS(["tip", "info", "warning", "danger", "details", "raw", "code-group"]),
      ["markdown-it-footnote"],
      ["markdown-it-emoji"],
      ["markdown-it-attrs"],
    ],
    frontmatter: true,
  },
  vuepress: {
    options: { html: true, linkify: true },
    plugins: [
      ...CONTAINERS(["tip", "warning", "danger", "details", "code-group"]),
      ["markdown-it-emoji"],
    ],
    frontmatter: true,
  },
  slidev: { options: { html: true, linkify: true }, plugins: [], frontmatter: true },
  vite: {
    options: { html: true, linkify: true, typographer: true },
    plugins: [],
    frontmatter: true,
  },
  eleventy: { options: { html: true }, plugins: [], frontmatter: true },
  vscode: {
    options: { html: true, linkify: true, typographer: true },
    plugins: [],
    frontmatter: false,
  },
};

export interface ContentSetup {
  /** How markdown-it reads this scope's documents, for `migrateContent()`. */
  content: ContentOptions;
  /** Other setups in the same scope: an escape is only kept when every one of them renders it the same. */
  alternatives: ContentOptions[];
  /** The Comark setup that reads them the same, without plugins (`plugins` names them). */
  comark: Omit<SetupOptions, "plugins">;
  /** The loaded plugins, for `markdownItPlugin()` on the Comark side. */
  plugins: PluginUse[];
  /** Plugins the project uses that couldn't be loaded, so content would escape the syntax they add. */
  missing: string[];
}

/** How to load a plugin by package name or path; the default resolves it from the project. */
export type Loader = (name: string, root: string) => Promise<unknown>;

// Framework sites read `::: tip` and footnotes with these; this package carries its own copies for when the
// framework keeps them out of the project's reach.
const BUNDLED = new Map<string, () => Promise<Record<string, unknown>>>([
  ["markdown-it-container", () => import("markdown-it-container")],
  ["markdown-it-footnote", () => import("markdown-it-footnote")],
]);

export const defaultLoader: Loader = async (name, root) => {
  const path = resolvePackage(name, root);
  if (!path) {
    const bundled = BUNDLED.get(name);
    if (bundled) return pluginOf(await bundled());
    throw new Error(`Cannot find ${name} from ${root}`);
  }
  // SAFETY: a markdown-it plugin module exports the plugin as its default, or as its only named export.
  return pluginOf((await import(path)) as Record<string, unknown>);
};

/**
 * The file a package's ESM import resolves to from `root`: `require.resolve` when the package allows it, else its
 * `exports` import entry, `module`, or `main`, since ESM-only packages give `require` nothing.
 */
function resolvePackage(name: string, root: string): string | undefined {
  const require = createRequire(resolve(root, "package.json"));
  try {
    return pathToFileURL(require.resolve(name)).href;
  } catch {}
  for (const base of require.resolve.paths(name) ?? []) {
    const dir = join(base, name);
    let manifest: { exports?: unknown; module?: string; main?: string };
    try {
      manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    } catch {
      continue;
    }
    const entry = (value: unknown): string | undefined =>
      isText(value)
        ? value
        : isRecord(value)
          ? entry(value["."] ?? value.import ?? value.default)
          : undefined;
    const file = entry(manifest.exports) ?? manifest.module ?? manifest.main ?? "index.js";
    return pathToFileURL(join(dir, file)).href;
  }
  return undefined;
}

/**
 * The plugin a module exports: its default, else markdown-it-emoji 3's `full`, else its only function. ESM-only
 * packages resolve through `import`, so `require.resolve` can't find them.
 */
export function pluginOf(module: Record<string, unknown>): unknown {
  if (isFunction(module.default)) return module.default;
  // A CommonJS module imported as ESM puts its exports object on `default`.
  const exports = isRecord(module.default) ? module.default : module;
  return isFunction(exports.default)
    ? exports.default
    : isFunction(exports.full)
      ? exports.full
      : Object.values(exports).find(isFunction);
}

/** One setup as markdown-it reads it: its preset, literal options, and the plugins that could be loaded. */
async function profile(
  root: string,
  setup: Setup,
  load: Loader,
): Promise<{
  content: ContentOptions;
  comark: ContentSetup["comark"];
  plugins: PluginUse[];
  missing: string[];
  unknown: ("html" | "linkify")[];
}> {
  const host = HOSTS[setup.host];
  const options: Record<string, Literal> = { ...host?.options };
  for (const name of READ_OPTIONS) {
    const text = setup.options[name];
    if (text === undefined) continue;
    const found = literal(text);
    if (found !== undefined) options[name] = found;
  }
  const uses: [string, ...unknown[]][] = [...(host?.plugins ?? [])];
  for (const plugin of setup.plugins) {
    if (plugin.mapping.kind === "setup" || plugin.mapping.kind === "unsupported") continue;
    const args = plugin.options ? literal(`[${plugin.options}]`) : [];
    uses.push([plugin.name, ...(Array.isArray(args) ? args : [])]);
  }
  const plugins: PluginUse[] = [];
  const missing: string[] = [];
  for (const [name, ...args] of uses) {
    const loaded = await load(name, root).catch(() => undefined);
    if (isFunction(loaded)) plugins.push([loaded, ...args]);
    else if (!missing.includes(name)) missing.push(name);
  }
  const names = uses.map(([name]) => name);
  const frontmatter =
    Boolean(host?.frontmatter) ||
    setup.plugins.some((plugin) => plugin.name === "markdown-it-front-matter");
  const preset =
    setup.preset === "commonmark" || setup.preset === "zero" ? setup.preset : undefined;
  // In the order the project made them: disabling a rule and enabling it again isn't the same as the reverse.
  const rules: RuleChange[] = setup.rules.map((rule) => {
    const found = literal(`[${rule.args}]`);
    return [rule.method, Array.isArray(found) ? found.flat().filter(isText) : []];
  });
  // `html` and `linkify` decide what markdown-it reads as text; when the scan can't read one, both values are tried.
  const unknown = (["html", "linkify"] as const).filter((name) =>
    setup.options[name] === undefined
      ? Boolean(setup.unresolved)
      : literal(setup.options[name]) === undefined,
  );
  const read = (key: string) => {
    const value = options[key];
    return value === true || value === false ? value : undefined;
  };
  return {
    content: {
      preset,
      // SAFETY: only markdown-it's own option names (READ_OPTIONS and the hosts') are read, as literals.
      options: options as ContentOptions["options"],
      rules,
      plugins,
      emoji: names.some((name) => /emoji/.test(name)),
      attrs: names.some((name) => /markdown-it-attrs/.test(name)),
      tasks: names.some((name) => /task-?lists?/.test(name)),
    },
    comark: {
      preset,
      html: read("html"),
      linkify: read("linkify"),
      typographer: read("typographer"),
      breaks: read("breaks"),
      rules,
      frontmatter,
    },
    plugins,
    missing,
    unknown,
  };
}

/**
 * How one scope's documents are read: the framework's setup when a framework renders them, else the project's setup
 * with the most plugins. The others are kept as alternatives, so an escape is only kept when all of them agree.
 */
export async function contentSetup(
  root: string,
  setups: Setup[],
  options: { load?: Loader } = {},
): Promise<ContentSetup> {
  const load = options.load ?? defaultLoader;
  // A `zero` instance renders a fragment (a title, a commit message), rarely a whole document.
  const rank = (setup: Setup) =>
    (setup.host !== "markdown-it" && setup.host !== "function" ? 2 : 0) +
    (setup.preset === "zero" ? 0 : 1);
  const ordered = [...setups].sort(
    (a, b) => rank(b) - rank(a) || b.plugins.length - a.plugins.length,
  );
  const profiles = await Promise.all(ordered.map((setup) => profile(root, setup, load)));
  const [primary] = profiles;
  if (!primary) return { content: {}, alternatives: [], comark: {}, plugins: [], missing: [] };
  const seen = new Set([JSON.stringify(primary.content, keyOf)]);
  const alternatives: ContentOptions[] = [];
  const add = (content: ContentOptions) => {
    const key = JSON.stringify(content, keyOf);
    if (seen.has(key)) return;
    seen.add(key);
    alternatives.push(content);
  };
  for (const [index, item] of profiles.entries()) {
    if (index) add(item.content);
    // An option the scan couldn't read could be either value.
    for (const name of item.unknown)
      add({
        ...item.content,
        options: { ...item.content.options, [name]: !item.content.options?.[name] },
      });
  }
  return {
    content: primary.content,
    alternatives,
    comark: primary.comark,
    plugins: primary.plugins,
    missing: [...new Set(profiles.flatMap((item) => item.missing))],
  };
}

// Plugins compare by their function's source, so two setups that load the same plugin are one.
const keyOf = (_key: string, item: unknown) =>
  isFunction(item) ? String(item).slice(0, 200) : item;

const SITE = /(^|\/)(\.vitepress|\.vuepress)\/config\.[cm]?[jt]s$/;

/**
 * Each hook that names a function written elsewhere (`markdownItSetup: configureMarkdown`) gets that function's
 * plugins and changes, and the function stops counting as a setup of its own: it's the hook's.
 */
function withDelegates(scanned: ScannedFile[]): ScannedFile[] {
  const used = new Set<Setup>();
  const stem = (file: string) => file.replace(/\.[cm]?[jt]sx?$/, "").replace(/\/index$/, "");
  const merged = scanned.map((entry) => ({
    ...entry,
    setups: entry.setups.map((setup) => {
      const delegate = setup.delegate;
      if (!delegate) return setup;
      const from = delegate.from;
      const target = from?.startsWith(".")
        ? stem(posix.join(posix.dirname(entry.file), from))
        : from === undefined
          ? stem(entry.file)
          : undefined;
      const found = scanned
        .filter((other) => stem(other.file) === target)
        .flatMap((other) => other.setups)
        .find((other) => other.host === "function" && other.name === delegate.name);
      if (!found) return setup;
      used.add(found);
      return {
        ...setup,
        options: { ...found.options, ...setup.options },
        plugins: found.plugins,
        rules: found.rules,
        customized: found.customized,
        unresolved: setup.unresolved ?? found.unresolved,
      };
    }),
  }));
  return merged.map((entry) => ({
    ...entry,
    setups: entry.setups.filter((setup) => !used.has(setup)),
  }));
}

/** Resolve content by its nearest package or framework site, keeping sibling sites apart. */
export async function contentSetups(
  root: string,
  reader: ProjectReader,
  scanned: ScannedFile[],
  options: { load?: Loader } = {},
): Promise<(file: string) => Promise<ContentSetup>> {
  const sites = (await reader.glob("**/{.vitepress,.vuepress}/config.{js,mjs,cjs,ts,mts,cts}")).map(
    (file) => `${dirname(dirname(file)) === "." ? "" : `${dirname(dirname(file))}/`}`,
  );
  const packages = (await reader.glob("**/package.json")).map((file) =>
    dirname(file) === "." ? "" : `${dirname(file)}/`,
  );
  const boundaries = ["", ...new Set([...sites, ...packages])].sort((a, b) => b.length - a.length);
  const owner = (file: string) => {
    // A setup in a site's `.vitepress/` belongs to the site, not to the folder it sits in.
    const site =
      SITE.test(file) || /(^|\/)\.(vitepress|vuepress)\//.test(file)
        ? file.slice(
            0,
            file.search(/(^|\/)\.(vitepress|vuepress)\//) + (file.startsWith(".") ? 0 : 1),
          )
        : undefined;
    return site ?? boundaries.find((dir) => file.startsWith(dir))!;
  };
  const byScope = new Map<string, Setup[]>();
  for (const entry of withDelegates(scanned))
    for (const setup of entry.setups) {
      const scope = owner(entry.file);
      byScope.set(scope, [...(byScope.get(scope) ?? []), setup]);
    }
  const cache = new Map<string, Promise<ContentSetup>>();
  return (file) => {
    // The nearest scope with a setup: a package without one renders with whoever renders its parent.
    const scope =
      boundaries.find((dir) => file.startsWith(dir) && byScope.has(dir)) ??
      [...byScope.keys()].sort((a, b) => b.length - a.length).find((dir) => file.startsWith(dir)) ??
      "";
    let setup = cache.get(scope);
    if (!setup) {
      setup = contentSetup(resolve(root, scope), byScope.get(scope) ?? [], options);
      cache.set(scope, setup);
    }
    return setup;
  };
}

/** `migrateContent` checked against every setup in the scope: an escape stays only where they all agree. */
export const migrateScoped = (source: string, setup: ContentSetup) => {
  // One options object per setup, so the markdown-it instances built from it are reused across files.
  let options = scoped.get(setup);
  if (!options) {
    options = { ...setup.content, alternatives: setup.alternatives };
    scoped.set(setup, options);
  }
  return migrateContent(source, options);
};
const scoped = new WeakMap<ContentSetup, ContentOptions>();

const MARKDOWN = "**/*.{md,markdown}";

/**
 * Everything the migration finds in a project: markdown-it setups and what each plugin and option becomes, setups
 * the rewrite can replace and why the others stay, and Markdown Comark would read differently. `display` is the root
 * as the caller wrote it, so paths and commands in the findings work from where the check ran.
 */
export async function check(
  root: string,
  reader: ProjectReader = nodeReader(root),
  options: { display?: string; load?: Loader } = {},
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const shown = (file: string) =>
    options.display && options.display !== "." ? join(options.display, file) : file;
  const scanned = await scanProject(reader);
  for (const { file: path, source, setups: found } of scanned) {
    const file = shown(path);
    for (const setup of found) {
      const at = `${file}:${setup.line}`;
      const owned = setup.host !== "markdown-it";
      if (owned)
        findings.push({
          code: "MIC0101",
          params: { at, host: hostName(setup.host) },
          file,
          line: setup.line,
        });
      for (const [name, text] of Object.entries(setup.options)) {
        const option = optionFinding(name, text);
        if (option)
          findings.push({
            code: option.code,
            params: { at, option: name, ...option.params },
            file,
            line: setup.line,
          });
      }
      for (const item of setup.customized)
        findings.push({
          code: "MIC0105",
          params: { at: `${file}:${item.line}`, plugin: `\`${item.what}\``, by: "hand" },
          file,
          line: item.line,
        });
      for (const plugin of setup.plugins) {
        const where = { at: `${file}:${plugin.line}`, plugin: plugin.name };
        const { kind, note, ui } = plugin.mapping;
        const finding = (code: Code, params: Record<string, unknown> = {}) =>
          findings.push({ code, params: { ...where, ...params }, file, line: plugin.line });
        if (ui && kind !== "setup") finding("MIC0102", { ui, bridged: kind === "bridge" });
        else if (kind === "bridge") finding("MIC0104", { note: note ?? "" });
        else if (kind === "custom") finding("MIC0105", { tested: plugin.mapping.known });
        else if (kind === "unsupported") finding("MIC0106", { note: note ?? "" });
        else
          finding("MIC0103", {
            how:
              note ??
              (plugin.mapping.call
                ? `\`${plugin.mapping.call}\` from ${plugin.mapping.use?.from}.`
                : ""),
            owned,
          });
      }
    }
    const result = rewriteSource(source, path);
    const rewritten = result.code === source ? undefined : edit(source, result.code);
    for (const rewrite of result.rewrites) {
      const at = `${file}:${rewrite.line}`;
      findings.push(
        rewrite.rewritten
          ? { code: "MIC0202", params: { at }, file, line: rewrite.line, edit: rewritten }
          : {
              code: "MIC0201",
              params: { at, reason: rewrite.reason ?? "" },
              file,
              line: rewrite.line,
            },
      );
    }
  }

  const setupFor = await contentSetups(root, reader, scanned, options);
  for (const path of (await reader.glob(MARKDOWN)).sort()) {
    const source = reader.read(path);
    if (source === undefined) continue;
    const file = shown(path);
    const setup = await setupFor(path);
    const { markdown, changes, skipped } = migrateScoped(source, setup);
    if (skipped.length)
      findings.push({
        code: "MIC0303",
        params: {
          at: `${file}:${skipped[0]}`,
          count: skipped.length,
          lines: `${skipped.slice(0, 8).join(", ")}${skipped.length > 8 ? ", …" : ""}`,
        },
        file,
        line: skipped[0]!,
      });
    if (!changes.length) continue;
    const lines = [...new Set(changes.map((change) => change.line))];
    findings.push({
      code: "MIC0302",
      params: {
        at: `${file}:${lines[0]}`,
        count: changes.length,
        lines: `${lines.slice(0, 8).join(", ")}${lines.length > 8 ? ", …" : ""}`,
        missing: setup.missing.join(", "),
      },
      file,
      line: lines[0]!,
      // `content --write` refuses while a syntax plugin is missing, since the escapes would break its syntax.
      edit: setup.missing.length ? undefined : edit(source, markdown),
    });
  }
  return findings;
}

/** What an option becomes: covered by `comarkOptions()`, or with no counterpart. */
function optionFinding(
  name: string,
  text: string,
): { code: Code; params: Record<string, unknown> } | undefined {
  if (["html", "linkify", "typographer", "breaks", "quotes"].includes(name))
    return literal(text) === undefined
      ? { code: "MIC0107", params: { reason: `it's \`${text.slice(0, 40)}\`, not a literal` } }
      : {
          code: "MIC0103",
          params: {
            plugin: `\`${name}\``,
            how: `\`comarkOptions({ ${name}: ${text} })\` reads it the same way.`,
            owned: false,
          },
        };
  if (name === "highlight")
    return {
      code: "MIC0107",
      params: {
        reason:
          "a highlight function runs in markdown-it's fence renderer; pass the same function to `markdownItPlugin()` as shown in the docs, or use Comark's Shiki `highlight()`",
      },
    };
  if (name === "langPrefix" || name === "xhtmlOut" || name === "maxNesting")
    return { code: "MIC0107", params: { reason: `Comark's renderers don't read \`${name}\`` } };
  return undefined;
}

const HOST_NAMES: Record<Host, string> = {
  "markdown-it": "markdown-it",
  vitepress: "VitePress",
  vuepress: "VuePress",
  slidev: "Slidev",
  vite: "A Vite Markdown plugin",
  eleventy: "Eleventy",
  vscode: "VS Code",
  function: "The caller of this function",
};
const hostName = (host: Host) => HOST_NAMES[host];
