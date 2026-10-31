import { parseSync } from "oxc-parser";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { glob as globFiles } from "tinyglobby";
import type { Pluggable } from "unified";
import { migrateContent } from "./content.ts";
import type { Code } from "./diagnostics.ts";
import { rewriteSource } from "./rewrite.ts";
import { keyName, scanSource, walk, type Host, type Setup } from "./scan.ts";

export interface Finding {
  code: Code;
  params: Record<string, unknown> & { at: string };
  file: string;
  line: number;
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

type Format = "mdx" | "md" | "detect" | "unresolved";

/** `markdown.format` in a Docusaurus config, read from its AST so comments and look-alike keys don't count. */
function docusaurusFormat(source: string, file: string): Format {
  let format: Format = "mdx";
  try {
    walk(parseSync(file, source).program, (node) => {
      if (
        node.type !== "Property" ||
        keyName(node.key) !== "markdown" ||
        node.value.type !== "ObjectExpression"
      )
        return;
      const property = node.value.properties.find(
        (item) => item.type === "Property" && keyName(item.key) === "format",
      );
      if (property?.type !== "Property") return;
      const literal = property.value;
      const text =
        literal.type === "Literal"
          ? literal.value
          : literal.type === "TemplateLiteral" && !literal.expressions.length
            ? literal.quasis[0]?.value.cooked
            : undefined;
      format = text === "mdx" || text === "md" || text === "detect" ? text : "unresolved";
    });
  } catch {
    return "unresolved";
  }
  return format;
}

/** A file's own `mdx.format` in its frontmatter, which Docusaurus puts above the site's setting. */
function frontmatterFormat(source: string): Format | undefined {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
  const match =
    frontmatter &&
    /^mdx:\s*(?:\{[^}]*?format:\s*["']?(\w+)|\r?\n[ \t]+format:\s*["']?(\w+))/m.exec(frontmatter);
  const format = match ? (match[1] ?? match[2]) : undefined;
  return format === "mdx" || format === "md" || format === "detect" ? format : undefined;
}

export interface MdxSplit {
  /** Markdown and MDX files that compile as MDX, which the migration leaves alone. */
  mdx: Set<string>;
  /** Of those, the .md files a Docusaurus site compiles as MDX, and the ones whose config format couldn't be read. */
  docusaurus: Set<string>;
  unresolved: Set<string>;
}

/**
 * Which files compile as MDX. Docusaurus v3 compiles .md as MDX unless the nearest site config sets `markdown.format`
 * to "detect" or "md", and a file's frontmatter `mdx.format` overrides that. An unreadable setting counts as MDX.
 */
export async function splitMdx(reader: ProjectReader, files: string[]): Promise<MdxSplit> {
  const sites: { dir: string; format: Format }[] = [];
  for (const config of await reader.glob("**/docusaurus.config.{js,mjs,cjs,ts,mts,cts}")) {
    sites.push({
      dir: config.includes("/") ? config.slice(0, config.lastIndexOf("/") + 1) : "",
      format: docusaurusFormat(reader.read(config) ?? "", config),
    });
  }
  sites.sort((a, b) => b.dir.length - a.dir.length);
  const split: MdxSplit = { mdx: new Set(), docusaurus: new Set(), unresolved: new Set() };
  for (const file of files) {
    const site = sites.find((candidate) => file.startsWith(candidate.dir));
    const own = site ? frontmatterFormat(reader.read(file) ?? "") : undefined;
    const format = own ?? site?.format ?? "detect";
    const isMdx =
      format === "mdx" || format === "unresolved" || (format === "detect" && file.endsWith(".mdx"));
    if (!isMdx) continue;
    split.mdx.add(file);
    if (file.endsWith(".md")) split.docusaurus.add(file);
    if (format === "unresolved") split.unresolved.add(file);
  }
  return split;
}

const ALERTS =
  /^(remark-github-blockquote-alert|remark-github-alerts|remark-gfm-alerts|@r4ai\/remark-callout)$/;
const SYNTAX = /^remark-(directive|math|mdc)$/;

// Syntax plugins change which text remark reads as text, so the content check parses with the project's own copies.
async function syntaxPlugins(
  root: string,
  names: string[],
  missing: string[] = [],
): Promise<Pluggable[]> {
  const plugins: Pluggable[] = [];
  const require = createRequire(resolve(root, "package.json"));
  for (const name of names.filter((item) => SYNTAX.test(item))) {
    // The project's copy, else the one bundled here: parsing without it would escape the syntax it adds (`$x_{i}$`).
    const local = (() => {
      try {
        return require.resolve(name);
      } catch {
        return undefined;
      }
    })();
    // SAFETY: remark syntax plugins are ES modules whose default export is the plugin.
    const module = ((local && (await import(local).catch(() => undefined))) ??
      (await import(name).catch(() => undefined))) as { default: Pluggable } | undefined;
    if (module) plugins.push(module.default);
    else missing.push(name);
  }
  return plugins;
}

export interface ContentSetup {
  remarkPlugins: Pluggable[];
  alerts: boolean;
  emoji: boolean;
  /** Whether the owning setup reads GFM. */
  gfm: boolean;
  /** Syntax plugins the project uses that couldn't be loaded, so content would escape the syntax they add. */
  missing: string[];
  /** Conflicting setups in this scope: the document's renderer can't be determined safely. */
  reason?: string;
}

function contentProfile(setups: Setup[], code = "") {
  const names = setups.flatMap((setup) => setup.plugins.map((plugin) => plugin.name));
  // Code `rewrite` already moved to Comark still says what the Markdown holds: its plugins replace remark's.
  if (/["'](?:@comark\/html|comark)\/plugins\/math["']/.test(code)) names.push("remark-math");
  // Astro, Docusaurus, Gatsby, and Nuxt Content read GFM on their own; a bare unified chain or react-markdown doesn't.
  const gfmByDefault = setups.some((setup) =>
    ["astro", "docusaurus", "gatsby", "nuxt"].includes(setup.host),
  );
  const comarkGfm = /comarkOptions\((?![^)]*gfm:\s*false)/.test(code);
  const syntax = [...new Set(names.filter((name) => SYNTAX.test(name)))].sort();
  return {
    names: syntax,
    options: syntax.map((name) => {
      const options = setups.flatMap((setup) =>
        setup.plugins
          .filter((plugin) => plugin.name === name)
          .map((plugin) => plugin.options ?? ""),
      );
      return [...new Set(options.length ? options : [""])].sort();
    }),
    alerts:
      names.some((name) => ALERTS.test(name)) ||
      /["']comark\/plugins\/alert["']|["']comark-github["']/.test(code),
    emoji:
      names.some((name) => /^remark-(gemoji|emoji)$/.test(name)) ||
      /["']comark\/plugins\/emoji["']/.test(code),
    gfm:
      (!setups.length && !/comarkOptions\(/.test(code)) ||
      gfmByDefault ||
      comarkGfm ||
      names.includes("remark-gfm"),
  };
}

/** How one site's content must be parsed. Differing renderers are ambiguous, so never union their syntax. */
export async function contentSetup(
  root: string,
  setups: Setup[],
  sources: string[] = [],
): Promise<ContentSetup> {
  const groups: Setup[][] = [];
  const configs = new Map<string, Setup[]>();
  for (const setup of setups) {
    if (["unified", "react-markdown", "component"].includes(setup.host)) groups.push([setup]);
    else {
      const config = configs.get(setup.file) ?? [];
      config.push(setup);
      configs.set(setup.file, config);
    }
  }
  groups.push(...configs.values());
  const profiles = groups.map((group) => contentProfile(group));
  for (const source of sources) {
    if (
      /["'](?:remark-to-comark\/setup|(?:@comark\/html|comark)\/plugins\/math|comark\/plugins\/(?:alert|emoji)|comark-github)["']/.test(
        source,
      )
    )
      profiles.push(contentProfile([], source));
  }
  const profile = profiles[0] ?? contentProfile([]);
  if (profiles.some((other) => JSON.stringify(other) !== JSON.stringify(profile)))
    return {
      remarkPlugins: [],
      alerts: false,
      emoji: false,
      gfm: false,
      missing: [],
      reason:
        "The Markdown setups in this site or package disagree about syntax, and the document's owning renderer is ambiguous.",
    };
  const missing: string[] = [];
  return {
    remarkPlugins: await syntaxPlugins(root, profile.names, missing),
    alerts: profile.alerts,
    emoji: profile.emoji,
    gfm: profile.gfm,
    missing,
  };
}

type ScannedFile = { file: string; source: string; setups: Setup[] };
const SITE_CONFIG =
  "**/{astro.config,next.config,contentlayer.config,docusaurus.config,gatsby-config,velite.config,nuxt.config}.{js,mjs,cjs,ts,mts,cts}";

/** Resolve content by its nearest package or framework config, keeping sibling sites and rewritten code apart. */
export async function contentSetups(
  root: string,
  reader: ProjectReader,
  scanned: ScannedFile[],
): Promise<(file: string) => Promise<ContentSetup>> {
  const boundaries = [
    "",
    ...new Set(
      (await Promise.all([reader.glob("**/package.json"), reader.glob(SITE_CONFIG)]))
        .flat()
        .map((file) => (dirname(file) === "." ? "" : `${dirname(file)}/`)),
    ),
  ].sort((a, b) => b.length - a.length);
  const owner = (file: string) => boundaries.find((dir) => file.startsWith(dir))!;
  const byScope = new Map<string, ScannedFile[]>();
  for (const entry of scanned) {
    const scope = owner(entry.file);
    const entries = byScope.get(scope) ?? [];
    entries.push(entry);
    byScope.set(scope, entries);
  }
  const cache = new Map<string, Promise<ContentSetup>>();
  return (file) => {
    const scope = owner(file);
    let setup = cache.get(scope);
    if (!setup) {
      const entries = byScope.get(scope) ?? [];
      setup = contentSetup(
        resolve(root, scope),
        entries.flatMap((entry) => entry.setups),
        entries.map((entry) => entry.source),
      );
      cache.set(scope, setup);
    }
    return setup;
  };
}

/** Every remark setup in the project's code. */
export async function scanProject(reader: ProjectReader): Promise<ScannedFile[]> {
  const files = [];
  for (const file of (
    await reader.glob("**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte,astro}")
  ).sort()) {
    if (/\.d\.[cm]?ts$/.test(file)) continue;
    const source = reader.read(file);
    if (!source || !/remark|rehype|unified/.test(source)) continue;
    try {
      files.push({ file, source, setups: scanSource(source, file) });
    } catch {
      // A file oxc can't parse is reported by the project's own build.
    }
  }
  return files;
}

/**
 * Everything the migration finds in a project: remark setups and what each plugin becomes, unified chains and whether
 * they can be rewritten, Markdown that Comark would read differently, and MDX it leaves alone. `display` is the root as
 * the caller wrote it, so paths and commands in the findings work from where the check ran.
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
  for (const { file: path, source, setups: found } of scanned) {
    const file = shown(path);
    for (const setup of found) {
      const at = `${file}:${setup.line}`;
      const owned = setup.host !== "unified";
      if (owned)
        findings.push({
          code: "RTC0101",
          params: { at, host: hostName(setup.host) },
          file,
          line: setup.line,
        });
      for (const plugin of setup.plugins) {
        const where = { at: `${file}:${plugin.line}`, plugin: plugin.name };
        const { kind, note, ui, use } = plugin.mapping;
        const call =
          use && plugin.mapping.call
            ? `\`${plugin.mapping.call.replace("($options)", "()")}\` from ${use.from}`
            : undefined;
        const finding = (code: Code, params: Record<string, unknown> = {}) =>
          findings.push({ code, params: { ...where, ...params }, file, line: plugin.line });
        if (ui)
          finding("RTC0102", {
            ui,
            ...(kind === "port" && use
              ? { port: `\`${use.name}()\`` }
              : kind === "plugin"
                ? { comark: call }
                : {}),
          });
        else if (kind === "port" && use) finding("RTC0104", { port: `${use.name}()` });
        else if (kind === "custom") finding("RTC0105");
        else if (kind === "unsupported") finding("RTC0106", { note: note ?? "" });
        else if (kind === "lint") finding("RTC0107");
        else if (kind !== "pipeline")
          finding("RTC0103", {
            how: note ?? (call ? `${call}.` : "comarkOptions() reads it the way remark does."),
            owned,
          });
      }
    }
    for (const rewrite of rewriteSource(source, path).rewrites) {
      const at = `${file}:${rewrite.line}`;
      findings.push(
        rewrite.rewritten
          ? { code: "RTC0202", params: { at }, file, line: rewrite.line }
          : {
              code: "RTC0201",
              params: { at, reason: rewrite.reason ?? "" },
              file,
              line: rewrite.line,
            },
      );
    }
  }

  const setupFor = await contentSetups(root, reader, scanned);
  const documents = (await reader.glob("**/*.{md,mdx}")).sort();
  const split = await splitMdx(reader, documents);
  for (const path of documents) {
    if (split.mdx.has(path)) continue;
    const source = reader.read(path);
    if (source === undefined) continue;
    const file = shown(path);
    const setup = await setupFor(path);
    if (setup.reason) {
      findings.push({
        code: "RTC0303",
        params: { at: `${file}:1`, reason: setup.reason },
        file,
        line: 1,
      });
      continue;
    }
    const { changes, skipped } = migrateContent(source, setup);
    if (skipped.length)
      findings.push({
        code: "RTC0303",
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
      code: "RTC0302",
      params: {
        at: `${file}:${lines[0]}`,
        count: changes.length,
        lines: `${lines.slice(0, 8).join(", ")}${lines.length > 8 ? ", …" : ""}`,
        missing: setup.missing.join(", "),
      },
      file,
      line: lines[0]!,
    });
  }
  const mdx = [...split.mdx].sort().map(shown);
  if (mdx.length) {
    findings.push({
      code: "RTC0301",
      params: {
        at: `${mdx.slice(0, 3).join(", ")}${mdx.length > 3 ? `, and ${mdx.length - 3} more` : ""}`,
        count: mdx.length,
        docusaurus: split.docusaurus.size,
        unresolved: split.unresolved.size,
        files: mdx,
      },
      file: mdx[0]!,
      line: 1,
    });
  }
  return findings;
}

const HOSTS = new Map<Host, string>([
  ["astro", "Astro"],
  ["next", "Next.js"],
  ["contentlayer", "Contentlayer"],
  ["docusaurus", "Docusaurus"],
  ["gatsby", "Gatsby"],
  ["velite", "Velite"],
  ["nuxt", "Nuxt"],
  ["react-markdown", "react-markdown"],
  ["component", "A component"],
  ["config", "A framework config"],
]);
const hostName = (host: Host) => HOSTS.get(host) ?? host;
