import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
import type { MarkedExtension, MarkedOptions } from "marked";
import { glob as globFiles } from "tinyglobby";
import { migrateContent } from "./content.ts";
import type { Code } from "./diagnostics.ts";
import { rewriteSource } from "./rewrite.ts";
import { scanSource, type Setup } from "./scan.ts";

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
  return { start, end: before.length - tail, text: after.slice(start, after.length - tail) };
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
];

export const nodeReader = (root: string): ProjectReader => ({
  glob: (pattern) => globFiles(pattern, { cwd: root, ignore: IGNORE }),
  read: (file) => {
    try {
      return readFileSync(join(root, file), "utf8");
    } catch {
      return undefined;
    }
  },
});

const CODE = "**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte,astro}";
const MARKDOWN = "**/*.{md,markdown}";

export type ScannedFile = { file: string; source: string; setups: Setup[] };

/** Every marked setup in the project's code. */
export async function scanProject(reader: ProjectReader): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  for (const file of (await reader.glob(CODE)).sort()) {
    if (/\.d\.[cm]?ts$|\.min\.js$/.test(file)) continue;
    const source = reader.read(file);
    if (!source || !/marked/.test(source)) continue;
    try {
      const setups = scanSource(source, file);
      if (setups.length) files.push({ file, source, setups });
    } catch {
      // A file oxc can't parse is reported by the project's own build.
    }
  }
  return files;
}

/** The marked range each package declares, by the package's folder (`""` for the root); pnpm catalogs resolved. */
export async function declaredVersions(reader: ProjectReader): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  // `marked: catalog:` points at pnpm-workspace.yaml: `catalog:` or a named list under `catalogs:`.
  const workspace = reader.read("pnpm-workspace.yaml") ?? "";
  const catalog = (name: string) => {
    const section = name
      ? new RegExp(`^  ${name}:\\s*$([\\s\\S]*?)(?=^  \\S|^\\S|$(?![\\s\\S]))`, "m").exec(
          workspace.slice(workspace.search(/^catalogs:/m) + 1),
        )?.[1]
      : /^catalog:\s*$([\s\S]*?)(?=^\S|$(?![\s\S]))/m.exec(workspace)?.[1];
    return /^\s+["']?marked["']?:\s*["']?([^"'\s#]+)/m.exec(section ?? "")?.[1];
  };
  for (const file of await reader.glob("**/package.json")) {
    try {
      const json = JSON.parse(reader.read(file) ?? "{}") as Record<
        string,
        Record<string, string> | undefined
      >;
      let range = ["dependencies", "devDependencies", "peerDependencies"]
        .map((key) => json[key]?.marked)
        .find(Boolean);
      if (range?.startsWith("catalog:")) range = catalog(range.slice(8).trim()) ?? range;
      if (range) versions.set(dirname(file) === "." ? "" : `${dirname(file)}/`, range);
    } catch {}
  }
  return versions;
}

/** The marked range that governs a file: its nearest package that declares marked. */
const versionOf = (versions: Map<string, string>, file: string) =>
  [...versions]
    .filter(([dir]) => file.startsWith(dir))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

/**
 * Folders whose Markdown the project's marked code reads: a string literal in a file with a marked setup
 * (`"posts"`, `path.join(__dirname, "../content")`, `"docs/**\/*.md"`) that names a folder holding Markdown. Strings
 * rendered at runtime (chat replies, CMS fields) leave no trace, so for most projects this is empty.
 */
export function markedFolders(scanned: ScannedFile[], documents: string[]): string[] {
  return [...readers(scanned, documents).keys()].sort();
}

/** Each folder the project's marked code names, with the files that name it. */
function readers(scanned: ScannedFile[], documents: string[]): Map<string, string[]> {
  const folders = new Set<string>();
  for (const path of documents)
    for (let dir = dirname(path); dir !== "."; dir = dirname(dir)) folders.add(`${dir}/`);
  const found = new Map<string, string[]>();
  for (const { file, source } of scanned) {
    // A whole literal (`"posts"`), or the folder a template starts with (`` `posts/${slug}.md` ``).
    for (const match of source.matchAll(
      /["'`]((?:\.{0,2}\/)?[\w@.-]+(?:\/[\w@.*-]+)*\/?)(?:["'`]|\/\$\{)/g,
    )) {
      const literal = match[1]!.replace(
        /\/?\*\*.*$|\/\*\.[\w{},]+$|\/[\w*-]*\.(?:md|markdown)$/,
        "",
      );
      if (
        !literal ||
        /^(\.|\.\/|src|lib|node_modules|dist|test|tests)\/?$/.test(literal) ||
        /\.(js|ts|json|css|html|png|svg)$/.test(literal)
      )
        continue;
      for (const base of [normalize(literal), normalize(join(dirname(file), literal))]) {
        const dir = `${base.replace(/^\.\/|\/$/g, "")}/`;
        if (dir.startsWith("..") || !folders.has(dir)) continue;
        const files = found.get(dir) ?? [];
        if (!files.includes(file)) files.push(file);
        found.set(dir, files);
      }
    }
  }
  return found;
}

// Extensions that change which text marked reads as text, so the content check parses with the project's copies.
const SYNTAX =
  /^marked-(katex-extension|extended-latex|footnote|directive|custom-heading-id|extended-tables|alert|emoji)$/;

export interface ContentSetup {
  options: MarkedOptions;
  extensions: MarkedExtension[];
  /** The project's own marked, rendering with the same options and extensions, when it could be loaded. */
  render?: (markdown: string) => string;
  alerts: boolean;
  emoji: boolean;
  /** Syntax extensions the project uses that couldn't be loaded, so content would escape the syntax they add. */
  missing: string[];
  /** Why the document's parser can't be determined safely, if it can't. */
  reason?: string;
}

type MarkedModule = ((markdown: string, options?: object) => string) & {
  marked?: (markdown: string, options?: object) => string;
  Marked?: new (...extensions: unknown[]) => {
    parse: (markdown: string, options?: object) => string;
  };
};

/** A value written in source, when it is a literal the content setup can apply. */
const literal = (text: string | undefined): unknown => {
  const value = text?.trim();
  return value === "true" ? true : value === "false" ? false : undefined;
};

/**
 * How one package's Markdown must be read: the options its marked setups agree on, and its syntax extensions loaded
 * from the project. Setups that disagree, options set in code, or the project's own tokenizers leave it undetermined.
 */
export async function contentSetup(
  root: string,
  setups: Setup[],
  version?: string,
): Promise<ContentSetup> {
  const empty = { options: {}, extensions: [], alerts: false, emoji: false, missing: [] };
  const unresolved = setups.find((setup) => setup.unresolved)?.unresolved;
  if (unresolved) return { ...empty, reason: unresolved };
  const tokenizer = setups
    .flatMap((setup) => setup.plugins)
    .find((plugin) => plugin.type === "override" && /^(tokenizer|extensions)$/.test(plugin.name));
  if (tokenizer)
    return {
      ...empty,
      reason: `The project's own marked ${tokenizer.name === "tokenizer" ? "tokenizer" : "extensions"} (line ${tokenizer.line}) change what marked reads as text, and the check can't run them.`,
    };
  const profiles = setups.map((setup) => {
    const options: Record<string, unknown> = {};
    for (const plugin of setup.plugins)
      // `breaks` only turns newlines into `<br>`; what's text stays text.
      if (plugin.type === "option" && /^(gfm|pedantic)$/.test(plugin.name)) {
        const value = literal(plugin.options);
        if (value === undefined) return undefined;
        options[plugin.name] = value;
      }
    const syntax = [
      ...new Set(
        setup.plugins
          .filter((plugin) => plugin.type === "extension" && SYNTAX.test(plugin.name))
          .map((plugin) => plugin.name),
      ),
    ].sort();
    return { options, syntax };
  });
  if (profiles.some((profile) => !profile))
    return {
      ...empty,
      reason:
        "`gfm` or `pedantic` is set in code, so how marked reads this Markdown can't be known.",
    };
  const unique = [...new Set(profiles.map((profile) => JSON.stringify(profile)))];
  if (unique.length > 1)
    return {
      ...empty,
      reason:
        "The marked setups in this package disagree about syntax, and which one renders this document can't be told.",
    };
  const profile = (profiles[0] ?? { options: {}, syntax: [] }) as {
    options: MarkedOptions;
    syntax: string[];
  };
  const require = createRequire(resolve(root, "package.json"));
  const load = async (name: string): Promise<unknown> => {
    try {
      return await import(require.resolve(name));
    } catch {
      return undefined;
    }
  };
  const missing: string[] = [];
  const extensions: MarkedExtension[] = [];
  for (const name of profile.syntax.filter(
    (item) => item !== "marked-alert" && item !== "marked-emoji",
  )) {
    // SAFETY: marked extension packages export a factory that returns the extension, as default or as their only export.
    const module = (await load(name)) as
      | Record<string, (options?: unknown) => MarkedExtension>
      | undefined;
    const factory =
      module &&
      (module.default ?? Object.values(module).find((value) => typeof value === "function"));
    if (typeof factory === "function") extensions.push(factory());
    else missing.push(name);
  }
  // The project's own marked judges the edits, at its own version; the bundled one when it isn't installed.
  // SAFETY: every marked version exports a parse function, as the module itself (before v4) or as `marked`.
  const own = (await load("marked")) as ({ default?: MarkedModule } & MarkedModule) | undefined;
  let render: ContentSetup["render"];
  const module = own?.Marked ? own : (own?.default ?? own);
  if (module) {
    // mangle hides emails behind random entities, so two renders only compare equal without it.
    const options = { ...profile.options, mangle: false } as object;
    if (module.Marked) {
      const instance = new module.Marked(...extensions);
      render = (markdown) => quiet(() => instance.parse(markdown, { ...options, async: false }));
    } else if (!extensions.length) {
      const parse = module.marked ?? module;
      render = (markdown) => quiet(() => parse(markdown, options));
    }
  }
  void version;
  return {
    options: profile.options,
    extensions,
    render,
    alerts: profile.syntax.includes("marked-alert"),
    emoji: profile.syntax.includes("marked-emoji"),
    missing,
  };
}

// marked 5 to 7 warn about deprecated defaults on every parse; the check's output isn't the place for them.
function quiet<T>(run: () => T): T {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return run();
  } finally {
    console.warn = warn;
  }
}

/**
 * How each document must be read: by the setups in the files that name its folder, else by those of its nearest
 * package, keeping sibling packages' setups apart.
 */
export async function contentSetups(
  root: string,
  reader: ProjectReader,
  scanned: ScannedFile[],
): Promise<(file: string) => Promise<ContentSetup>> {
  const boundaries = [
    "",
    ...new Set(
      (await reader.glob("**/package.json")).map((file) =>
        dirname(file) === "." ? "" : `${dirname(file)}/`,
      ),
    ),
  ].sort((a, b) => b.length - a.length);
  const owner = (file: string) => boundaries.find((dir) => file.startsWith(dir))!;
  const byScope = new Map<string, Setup[]>();
  for (const entry of scanned) {
    const scope = owner(entry.file);
    byScope.set(scope, [...(byScope.get(scope) ?? []), ...entry.setups]);
  }
  const named = readers(scanned, await reader.glob(MARKDOWN));
  const versions = await declaredVersions(reader);
  const cache = new Map<string, Promise<ContentSetup>>();
  return (file) => {
    const folder = [...named.keys()]
      .filter((dir) => file.startsWith(dir))
      .sort((a, b) => b.length - a.length)[0];
    const scope = owner(file);
    const key = folder ? `folder:${folder}` : `scope:${scope}`;
    let setup = cache.get(key);
    if (!setup) {
      // A package without a setup of its own reads like the nearest one above it that has one.
      const near = boundaries
        .filter((dir) => scope.startsWith(dir) && byScope.has(dir))
        .sort((a, b) => b.length - a.length)[0];
      const setups = folder
        ? scanned
            .filter((entry) => named.get(folder)!.includes(entry.file))
            .flatMap((entry) => entry.setups)
        : (byScope.get(near ?? scope) ?? []);
      setup = contentSetup(resolve(root, scope), setups, versionOf(versions, file));
      cache.set(key, setup);
    }
    return setup;
  };
}

/** The files besides `file` that configure or call the shared `marked`, which a rewrite of `file` must account for. */
export function sharedElsewhere(scanned: ScannedFile[], file: string): string[] {
  return scanned
    .filter((entry) => entry.file !== file && entry.setups.some((setup) => setup.host === "marked"))
    .map((entry) => entry.file);
}

/**
 * Everything the migration finds in a project: marked setups and what each option and extension becomes, calls and
 * whether they can be rewritten, and Markdown that Comark would read differently. `display` is the root as the caller
 * wrote it, so paths and commands in the findings work from where the check ran.
 */
export async function check(
  root: string,
  reader: ProjectReader = nodeReader(root),
  options: { display?: string } = {},
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const shown = (file: string) =>
    options.display && options.display !== "." ? join(options.display, file) : file;
  const scanned = await scanProject(reader);
  const versions = await declaredVersions(reader);
  for (const { file: path, source, setups } of scanned) {
    const file = shown(path);
    for (const setup of setups) {
      if (setup.unresolved)
        findings.push({
          code: "MKC0101",
          params: { at: `${file}:${setup.line}`, reason: setup.unresolved.replace(/^\S+ /, "") },
          file,
          line: setup.line,
        });
      const seen = new Set<string>();
      for (const plugin of setup.plugins) {
        const key = `${plugin.name}:${plugin.options ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const label =
          plugin.type === "option"
            ? `\`${plugin.name}${plugin.options ? `: ${plugin.options.replace(/\s+/g, " ").slice(0, 40)}` : ""}\``
            : plugin.name;
        const where = { at: `${file}:${plugin.line}`, plugin: label };
        const { kind, note, ui, use } = plugin.mapping;
        const call =
          use && plugin.mapping.call
            ? `\`${plugin.mapping.call.replace("($options)", "()")}\` from ${use.from}`
            : undefined;
        const finding = (code: Code, params: Record<string, unknown> = {}) =>
          findings.push({ code, params: { ...where, ...params }, file, line: plugin.line });
        if (ui) finding("MKC0102", { ui, ...(kind === "plugin" ? { comark: call } : {}) });
        else if (kind === "custom") finding("MKC0105", { note: note ?? "" });
        else if (kind === "unsupported") finding("MKC0106", { note: note ?? "" });
        else if (kind !== "pipeline")
          finding("MKC0103", {
            how: note
              ? `${note}${plugin.mapping.setting ? ` (\`comarkOptions({ ${plugin.mapping.setting} })\`)` : ""}`
              : call
                ? `${call}.`
                : "Comark reads it the way marked does.",
          });
      }
    }
    const result = rewriteSource(source, path, {
      version: versionOf(versions, path),
      shared: sharedElsewhere(scanned, path),
    });
    const rewritten = result.code === source ? undefined : edit(source, result.code);
    for (const rewrite of result.rewrites) {
      const at = `${file}:${rewrite.line}`;
      findings.push(
        rewrite.rewritten
          ? { code: "MKC0202", params: { at }, file, line: rewrite.line, edit: rewritten }
          : {
              code: "MKC0201",
              params: { at, reason: rewrite.reason ?? "" },
              file,
              line: rewrite.line,
            },
      );
    }
  }

  const documents = (await reader.glob(MARKDOWN)).sort();
  const folders = markedFolders(scanned, documents);
  const read = documents.filter((path) => folders.some((dir) => path.startsWith(dir)));
  const setupFor = await contentSetups(root, reader, scanned);
  for (const path of read) {
    const source = reader.read(path);
    if (source === undefined) continue;
    const file = shown(path);
    const setup = await setupFor(path);
    if (setup.reason) {
      findings.push({
        code: "MKC0303",
        params: { at: `${file}:1`, reason: setup.reason },
        file,
        line: 1,
      });
      continue;
    }
    const { markdown, changes, skipped } = migrateContent(source, setup);
    if (skipped.length)
      findings.push({
        code: "MKC0303",
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
      code: "MKC0302",
      params: {
        at: `${file}:${lines[0]}`,
        count: changes.length,
        lines: `${lines.slice(0, 8).join(", ")}${lines.length > 8 ? ", …" : ""}`,
        missing: setup.missing.join(", "),
      },
      file,
      line: lines[0]!,
      // `content --write` refuses while a syntax extension is missing, since the escapes would break its syntax.
      edit: setup.missing.length ? undefined : edit(source, markdown),
    });
  }
  const unread = documents.filter((path) => !read.includes(path)).map(shown);
  if (unread.length)
    findings.push({
      code: "MKC0304",
      params: {
        at: `${unread.slice(0, 3).join(", ")}${unread.length > 3 ? `, and ${unread.length - 3} more` : ""}`,
        count: unread.length,
        files: unread,
      },
      file: unread[0]!,
      line: 1,
    });
  return findings;
}
