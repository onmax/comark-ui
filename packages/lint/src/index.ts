import { resolve } from "node:path";
import type { ComarkPlugin, ElementNode, HeadingIdsOption, MarkdownDocument, Node } from "comark";
import { parseMarkdown } from "comark";
import { htmlTags } from "./html-tags.ts";
import {
  checkLinks,
  checkPending,
  type Context,
  type Files,
  type Link,
  type LinkOptions,
  type Pending,
} from "./links.ts";
import { catalog } from "./rules/index.ts";
import { find, findAny, read, type Source } from "./source.ts";
import { closest, decode, listIds } from "./words.ts";

export { defineConfig, resolveConfig, type Config } from "./config.ts";
export type { LinkOptions, Pattern, Routes } from "./links.ts";
export type { UrlOptions } from "./urls.ts";

/** Every rule: the core ones, then one per kind of issue each comark-ui package reports. */
export type Rule = keyof typeof catalog;

/** Every rule, with what it checks. */
// SAFETY: built from every entry of the catalog, whose keys are exactly the rules.
export const rules = Object.fromEntries(
  Object.entries(catalog).map(([rule, { title }]) => [rule, title]),
) as Record<Rule, string>;

export type Diagnostic = {
  rule: Rule;
  /** 1-based, counting the frontmatter. */
  line: number;
  /** 1-based, when the spot is known. Components inside a paragraph are found by searching its lines. */
  column?: number;
  /** What is wrong, naming the block. */
  message: string;
  /** How to fix it. */
  fix: string;
  /** The original exception when parsing or a rule failed. */
  cause?: unknown;
};

export type LintOptions = {
  /**
   * The parse plugins the document is rendered with. Each of their `meta.issues` is reported under the rule the plugin
   * names for it in `meta.issueRules`, or as `comark/plugin-issue` when it names none.
   */
  // oxlint-disable-next-line no-explicit-any -- each plugin types its own meta, as in Comark's ParserOptions.
  plugins?: readonly ComarkPlugin<any, any>[];
  /**
   * The components map you pass to the renderer, or a list of component names. HTML elements are
   * always known. Without it, `comark/unknown-component` is off, since any name could be valid.
   */
  components?: Record<string, unknown> | readonly string[];
  /**
   * The document's path, absolute or from `root`. Relative links resolve from it; without it, links to files
   * aren't checked.
   */
  file?: string;
  /** Where root-relative links and the URL cache resolve from. Default the working directory. */
  root?: string;
  /** Reads a file by absolute path, or returns undefined when it can't. Default node:fs. */
  read?(path: string): string | undefined | Promise<string | undefined>;
  /** Whether a file or folder exists, by absolute path. Default node:fs. */
  exists?(path: string): boolean | Promise<boolean>;
  /** The names in a folder, for "did you mean" on a missing file. Default node:fs. */
  list?(path: string): readonly string[] | undefined | Promise<readonly string[] | undefined>;
  /** The `headingIds` you render with, so anchors are checked against the ids readers get. Default Comark's. */
  headingIds?: HeadingIdsOption;
  /** How links to files and other sites are checked. */
  links?: LinkOptions;
};

/** One file's result from `lintFiles()`. */
export type LintedFile = {
  /** The path as given. */
  file: string;
  /** Its text, or undefined when it couldn't be read. */
  text?: string;
  diagnostics: Diagnostic[];
};

type Token = {
  type: string;
  tag: string;
  map: [number, number] | null;
  content: string;
  children: Token[] | null;
};

type Block = { name: string; line: number; column: number };

/** Checks a Comark document and returns every problem, sorted by position. It never throws. */
export async function lint(markdown: string, options: LintOptions = {}): Promise<Diagnostic[]> {
  const [result] = await lintAll([{ path: options.file, text: markdown }], options);
  return result!.diagnostics;
}

/**
 * Checks many documents in one run: each is read and parsed once, links between them share one heading index, and
 * each external URL is requested once. A file that can't be read comes back with no `text`. It never throws.
 */
export async function lintFiles(
  paths: readonly string[],
  options: Omit<LintOptions, "file"> = {},
): Promise<LintedFile[]> {
  const results = await lintAll(
    paths.map((path) => ({ path })),
    options,
  );
  return results.map(({ path, text, diagnostics }) => ({ file: path!, text, diagnostics }));
}

type Parsed = { document: MarkdownDocument; tokens: Token[]; offset: number };

type Document = { file?: string; source: Source; found: Diagnostic[]; parsed?: Parsed };

const sorted = (found: Diagnostic[]) =>
  found.sort((a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0));

async function lintAll(
  inputs: readonly { path?: string; text?: string }[],
  options: LintOptions,
): Promise<{ path?: string; text?: string; diagnostics: Diagnostic[] }[]> {
  const context = createContext(options);
  // Every document is parsed before any link is checked, so a link to another one finds its ids in the index.
  const documents = await Promise.all(
    inputs.map(async ({ path, text }) => {
      const file = path === undefined ? undefined : resolve(context.root, path);
      const markdown = text ?? (file === undefined ? undefined : await context.files.read(file));
      if (markdown === undefined) return undefined;
      const document = await prepare(markdown, options);
      if (file !== undefined && document.parsed)
        context.index.set(file, Promise.resolve(idsOf(document.parsed.document.nodes)));
      return { ...document, file, markdown };
    }),
  );
  const pending: Pending[] = [];
  for (const document of documents) {
    if (!document) continue;
    checkDocument(document, options);
    if (!document.parsed) continue;
    const { nodes } = document.parsed.document;
    try {
      await checkLinks(
        linksOf(nodes, document.source),
        document.file,
        context,
        document.found,
        pending,
      );
    } catch (error) {
      document.found.push(crashed("comark/broken-link", error));
    }
  }
  const { urls } = context.links;
  if (urls)
    try {
      await checkPending(pending, urls, context.root);
    } catch (error) {
      documents.find(Boolean)?.found.push(crashed("comark/dead-url", error));
    }
  return inputs.map(({ path }, index) => {
    const document = documents[index];
    return { path, text: document?.markdown, diagnostics: document ? sorted(document.found) : [] };
  });
}

function createContext(options: LintOptions): Context & {
  index: Map<string, Promise<Set<string> | undefined>>;
} {
  const root = resolve(options.root ?? process.cwd());
  const disk = import("node:fs/promises");
  const remember = <T>(get: (path: string) => Promise<T>) => {
    const seen = new Map<string, Promise<T>>();
    return (path: string) => {
      let value = seen.get(path);
      if (!value) seen.set(path, (value = get(path)));
      return value;
    };
  };
  const files: Files = {
    read: remember(async (path) =>
      options.read
        ? await options.read(path)
        : (await disk).readFile(path, "utf8").catch(() => undefined),
    ),
    exists: remember(async (path) =>
      options.exists
        ? await options.exists(path)
        : (await disk).access(path).then(
            () => true,
            () => false,
          ),
    ),
    list: remember(async (path) =>
      options.list ? await options.list(path) : (await disk).readdir(path).catch(() => undefined),
    ),
  };
  const index = new Map<string, Promise<Set<string> | undefined>>();
  return {
    root,
    files,
    links: options.links ?? {},
    index,
    ids(path) {
      let ids = index.get(path);
      if (!ids) {
        ids = files.read(path).then(async (markdown) => {
          if (markdown === undefined) return undefined;
          const { parsed } = await prepare(markdown, options);
          return parsed && idsOf(parsed.document.nodes);
        });
        index.set(path, ids);
      }
      return ids;
    },
  };
}

async function prepare(markdown: string, options: LintOptions): Promise<Document> {
  const source = read(markdown);
  const found: Diagnostic[] = [];
  const parsed = await parse(source, options, found);
  return { source, found, parsed };
}

function checkDocument({ source, found, parsed }: Document, options: LintOptions): void {
  const check = (rule: Rule, run: () => Diagnostic[]) => {
    try {
      found.push(...run());
    } catch (error) {
      found.push(crashed(rule, error));
    }
  };
  const raw = parsed ? rawLines(parsed.tokens, parsed.offset) : new Set<number>();
  check("comark/unclosed-block", () => unclosedBlocks(source, raw));
  check("comark/malformed-attributes", () => malformedAttributes(source, raw));
  if (parsed) {
    const { document, tokens, offset } = parsed;
    const blocks = () => blockComponents(tokens, offset, source);
    const { components } = options;
    if (components)
      check("comark/unknown-component", () =>
        unknownComponents(tokens, offset, source, blocks(), components),
      );
    check("comark/broken-anchor", () => brokenAnchors(document.nodes, source));
    check("comark/unsafe-url", () => unsafeUrls(document.nodes, source));
    check("comark/duplicate-id", () => duplicateIds(document.nodes, source, options.headingIds));
    check("comark/missing-alt", () => missingAlts(document.nodes, source));
    check("comark/empty-link", () => emptyLinks(document.nodes, source));
    check("comark/plugin-issue", () => pluginIssues(document.meta, source, blocks()));
  }
}

async function parse(
  source: Source,
  { plugins = [], headingIds }: LintOptions,
  found: Diagnostic[],
): Promise<Parsed | undefined> {
  let tokens: Token[] = [];
  const probe: ComarkPlugin = {
    name: "lint-comark",
    post(state) {
      // SAFETY: Comark parses with markdown-exit, whose tokens have this shape; it types them as unknown.
      tokens = state.tokens as Token[];
    },
  };
  const run = async (markdown: string, offset: number) => ({
    document: await parseMarkdown(markdown, { plugins: [...plugins, probe], headingIds }),
    tokens,
    offset,
  });
  try {
    // Comark strips the frontmatter up to the closing `---`, so token line 0 is that line.
    // Its own `parsedLines` miscounts when the YAML starts on the first line.
    return await run(source.lines.join("\n"), source.frontmatter?.end ?? 0);
  } catch (error) {
    if (!source.frontmatter || !(error instanceof Error) || error.name !== "YAMLException") {
      found.push(couldNotParse(error));
      return undefined;
    }
    // SAFETY: js-yaml's YAMLException carries the reason and the 0-based position in the frontmatter.
    const { reason, mark } = error as Error & {
      reason?: string;
      mark?: { line: number; column: number };
    };
    found.push({
      rule: "comark/invalid-frontmatter",
      cause: error,
      line: source.frontmatter.start + 1 + (mark?.line ?? 0),
      column: mark ? mark.column + 1 : undefined,
      message: `The frontmatter is not valid YAML: ${reason ?? error.message}.`,
      fix: "Indent nested keys evenly, and quote any value that contains `: ` or starts with `*`, `&`, `!`, `[`, or `{`.",
    });
    try {
      // Blank lines in place of the frontmatter keep every line number, so the rest is still checked.
      return await run(
        source.lines.map((line, index) => (index < source.body ? "" : line)).join("\n"),
        0,
      );
    } catch (again) {
      found.push(couldNotParse(again));
      return undefined;
    }
  }
}

const couldNotParse = (error: unknown): Diagnostic => ({
  rule: "comark/plugin-issue",
  cause: error,
  line: 1,
  message: `Comark could not parse this document: ${error instanceof Error ? error.message : String(error)}`,
  fix: "Fix what the error names; a plugin that throws stops the whole document from rendering.",
});

const crashed = (rule: Rule, error: unknown): Diagnostic => ({
  rule,
  cause: error,
  line: 1,
  message: `lint-comark crashed while checking \`${rule}\`: ${error instanceof Error ? error.message : String(error)}.`,
  fix: "The other rules still ran. Report this with the document at https://github.com/onmax/comark-ui/issues.",
});

// Comark reads code, comments, and `<pre>`, `<script>`, `<style>`, and `<textarea>` blocks as text, so a `::` or `{`
// there opens nothing. Every other HTML block holds Markdown. A raw block reaches the tokens as a paragraph that starts
// with its tag.
const RAW_HTML = /^\s*(?:<!--|<(?:pre|script|style|textarea)(?:[\s/>]|$))/i;

function rawLines(tokens: Token[], offset: number): Set<number> {
  const lines = new Set<number>();
  for (const { type, map, content } of tokens) {
    const raw =
      type === "code_block" || type === "fence" || (type === "inline" && RAW_HTML.test(content));
    if (!map || !raw) continue;
    for (let line = map[0]; line < map[1]; line++) lines.add(line + offset);
  }
  return lines;
}

function unclosedBlocks(source: Source, raw: Set<number>): Diagnostic[] {
  const open: (Block & { colons: string })[] = [];
  const unclosed: typeof open = [];
  for (const [index, line] of source.prose.entries()) {
    if (raw.has(index)) continue;
    const opener = /^ {0,3}(:{2,})([A-Za-z][\w-]*)/.exec(line);
    if (opener) {
      open.push({
        colons: opener[1]!,
        name: opener[2]!,
        line: index + 1,
        column: line.indexOf(":") + 1,
      });
      continue;
    }
    const colons = /^ {0,3}(:{2,})\s*$/.exec(line)?.[1];
    if (!colons) continue;
    const match = open.findLastIndex((block) => block.colons === colons);
    // A closer also closes every block opened after its own, which then never got a closer.
    if (match !== -1) unclosed.push(...open.splice(match).slice(1));
  }
  return [...unclosed, ...open].map((block) => ({
    rule: "comark/unclosed-block",
    line: block.line,
    column: block.column,
    message: `\`${block.colons}${block.name}\` opened on line ${block.line} is never closed.`,
    fix: `Add a line with \`${block.colons}\` after its last child.`,
  }));
}

function malformedAttributes(source: Source, raw: Set<number>): Diagnostic[] {
  const found: Diagnostic[] = [];
  // Attributes follow a component name, a `[span]`, or a link or image's `(url)`.
  const opener =
    /(?:^ {0,3}(:{2,}[A-Za-z][\w-]*)|(?<![\w:])(:[A-Za-z][\w-]*)(?:\[[^\]]*\])?|[\])])\{/g;
  for (const [index, line] of source.prose.entries()) {
    if (raw.has(index)) continue;
    for (const match of line.matchAll(opener)) {
      const name = match[1]?.trim() ?? match[2];
      const owner = name ? `\`${name}\`` : "The `{…}` attributes";
      const start = match.index + match[0].length - 1;
      const end = scan(line, start + 1, (char, depth) => char === "}" && !depth);
      if (end === -1) {
        found.push({
          rule: "comark/malformed-attributes",
          line: index + 1,
          column: start + 1,
          message: `${owner} on line ${index + 1} ${name ? "opens its attributes with `{` and never closes them" : "open with `{` and never close"}.`,
          fix: "Add `}` after the last attribute. Comark reads the rest of the line as attributes.",
        });
        continue;
      }
      const seen = new Set<string>();
      const attributes = line.slice(start + 1, end);
      for (let at = 0; at < attributes.length; at++) {
        if (/\s/.test(attributes[at]!)) continue;
        const from = at;
        at = scan(attributes, at, (char, depth) => !depth && /\s/.test(char));
        if (at === -1) at = attributes.length;
        const attribute = attributes.slice(from, at);
        if (/^["'=.]/.test(attribute)) continue;
        const key = attribute.startsWith("#")
          ? "id"
          : attribute.split("=")[0]!.replace(/^(?::|v-bind:)/, "");
        if (!seen.has(key)) {
          seen.add(key);
          continue;
        }
        found.push({
          rule: "comark/malformed-attributes",
          line: index + 1,
          column: start + 2 + from,
          message: `${owner} on line ${index + 1} ${name ? "sets" : "set"} \`${key}\` twice.`,
          fix: `Keep one \`${key}\`. Comark uses the last one and drops the others.`,
        });
      }
    }
  }
  return found;
}

// Values can hold quotes with `\` escapes and nested `{…}` or `[…]`, as in `{data={"a":"}"}}`, so
// a `}` or a space only counts outside them.
function scan(text: string, from: number, stop: (char: string, depth: number) => boolean): number {
  let quote = "";
  let depth = 0;
  for (let at = from; at < text.length; at++) {
    const char = text[at]!;
    if (quote) {
      if (char === "\\") at++;
      else if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (stop(char, depth)) return at;
    else if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") depth--;
  }
  return -1;
}

function blockComponents(tokens: Token[], offset: number, source: Source): Block[] {
  return tokens.flatMap((token) => {
    const opens = ["mdc_block_open", "mdc_block_shorthand_open", "mdc_block_shorthand"].includes(
      token.type,
    );
    if (!opens || !token.map) return [];
    const line = token.map[0] + offset + 1;
    return [{ name: token.tag, line, column: (source.lines[line - 1]?.indexOf(":") ?? 0) + 1 }];
  });
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function unknownComponents(
  tokens: Token[],
  offset: number,
  source: Source,
  blocks: Block[],
  components: NonNullable<LintOptions["components"]>,
): Diagnostic[] {
  const names = [
    ...new Set((Array.isArray(components) ? components : Object.keys(components)).map(kebab)),
  ].sort();
  const known = new Set([...names, ...htmlTags]);
  const used: { name: string; written: string; line: number; column?: number }[] = blocks.map(
    (block) => ({
      ...block,
      written: `${source.lines[block.line - 1]?.trim().match(/^:+/)?.[0] ?? "::"}${block.name}`,
    }),
  );
  let range: [number, number] | null = null;
  for (const token of tokens) {
    // The inline content of a `:name[…]` line has no map of its own, so it takes its block's.
    range = token.map ?? range;
    if (token.type !== "inline" || !range) continue;
    const counts = new Map<string, number>();
    for (const child of token.children ?? []) {
      if (child.type !== "mdc_inline_component_open" && child.type !== "mdc_inline_component")
        continue;
      const nth = counts.get(child.tag) ?? 0;
      counts.set(child.tag, nth + 1);
      const at = find(source, `:${child.tag}`, {
        nth,
        from: range[0] + offset,
        to: range[1] + offset,
      });
      used.push({
        name: child.tag,
        written: `:${child.tag}`,
        line: at?.line ?? range[0] + offset + 1,
        column: at?.column,
      });
    }
  }
  return used.flatMap((component) => {
    if (known.has(kebab(component.name))) return [];
    const guess = closest(kebab(component.name), [...names, ...htmlTags]);
    const list = names.length ? `Known: ${names.map((name) => `\`${name}\``).join(", ")}.` : "";
    return [
      {
        rule: "comark/unknown-component" as const,
        line: component.line,
        column: component.column,
        message: `\`${component.written}\` on line ${component.line} is not a known component.`,
        fix: guess
          ? `Did you mean \`${guess}\`? ${list}`.trim()
          : `${list} If it is yours, add it to the components you give lint-comark.`.trim(),
      },
    ];
  });
}

// Comark text nodes are strings, elements are arrays, and comments are arrays with a null tag.
const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;

// Attribute values and meta entries arrive as strings, numbers, or booleans; anything else is no text.
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);

function* elements(nodes: Node[]): Generator<ElementNode> {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    yield node;
    const [, , ...children] = node;
    yield* elements(children);
  }
}

// Repeated values are matched in order, so the second bad link is placed on the second one in the source.
type Location = { line: number; column: number };

type NeedleNode = { next: Map<string, number>; fail: number; outputs: number[] };

/**
 * Indexes the needles a rule will look up in one pass over prose. Rules often locate hundreds of links or issues;
 * calling `find` for each one would rescan the same source from the beginning each time.
 */
function locations(
  source: Source,
  needles: readonly string[],
  attribute: boolean,
): Map<string, Location[]> {
  const unique = [...new Set(needles)].filter(Boolean).sort((a, b) => b.length - a.length);
  const found = new Map(unique.map((needle): [string, Location[]] => [needle, []]));
  if (!unique.length) return found;

  const trie: NeedleNode[] = [{ next: new Map(), fail: 0, outputs: [] }];
  for (const [index, needle] of unique.entries()) {
    let node = 0;
    for (let at = 0; at < needle.length; at++) {
      const char = needle[at]!;
      const next = trie[node]!.next.get(char);
      if (next === undefined) {
        trie[node]!.next.set(char, trie.length);
        trie.push({ next: new Map(), fail: 0, outputs: [] });
        node = trie.length - 1;
      } else node = next;
    }
    trie[node]!.outputs.push(index);
  }
  const queue: number[] = [];
  for (const child of trie[0]!.next.values()) queue.push(child);
  for (let at = 0; at < queue.length; at++) {
    const node = queue[at]!;
    for (const [char, child] of trie[node]!.next) {
      let fallback = trie[node]!.fail;
      while (fallback && !trie[fallback]!.next.has(char)) fallback = trie[fallback]!.fail;
      trie[child]!.fail = trie[fallback]!.next.get(char) ?? 0;
      queue.push(child);
    }
  }

  for (let index = source.body; index < source.prose.length; index++) {
    const line = source.prose[index]!;
    let node = 0;
    for (let at = 0; at < line.length; at++) {
      const char = line[at]!;
      while (node && !trie[node]!.next.has(char)) node = trie[node]!.fail;
      node = trie[node]!.next.get(char) ?? 0;
      for (let match = node; match; match = trie[match]!.fail)
        for (const needleIndex of trie[match]!.outputs) {
          const needle = unique[needleIndex]!;
          const start = at - needle.length + 1;
          if (/[\w-]/.test(line[at + 1] ?? "") && /[\w-]$/.test(needle)) continue;
          if (attribute && !/["'=(<]/.test(line[start - 1] ?? "")) continue;
          found.get(needle)!.push({ line: index + 1, column: start + 1 });
        }
    }
  }
  return found;
}

function locator(source: Source, attribute = false, needles: readonly string[] = []) {
  const indexed = locations(source, needles, attribute);
  const counts = new Map<string, number>();
  return (...needles: string[]) => {
    for (const needle of needles) {
      const nth = counts.get(needle) ?? 0;
      const at =
        indexed.get(needle)?.[nth] ?? find(source, needle, { nth, from: source.body, attribute });
      if (!at) continue;
      counts.set(needle, nth + 1);
      return at;
    }
    return { line: source.body + 1, column: undefined };
  };
}

function brokenAnchors(nodes: Node[], source: Source): Diagnostic[] {
  const ids = new Set<string>();
  const links: string[] = [];
  for (const [, attributes] of elements(nodes)) {
    const id = text(attributes.id);
    if (id) ids.add(id);
    const href = text(attributes.href);
    if (href.startsWith("#") && href.length > 1) links.push(href);
  }
  const locate = locator(
    source,
    true,
    links.flatMap((href) => [href, decode(href.slice(1)) && `#${decode(href.slice(1))}`]),
  );
  const available = listIds(ids, "Ids here", "This document has no headings or ids.");
  return links.flatMap((href) => {
    const fragment = decode(href.slice(1));
    if (ids.has(fragment) || ids.has(href.slice(1))) {
      locate(href, `#${fragment}`);
      return [];
    }
    const { line, column } = locate(href, `#${fragment}`);
    const guess = closest(fragment, [...ids]);
    return [
      {
        rule: "comark/broken-anchor",
        line,
        column,
        message: `The link to \`#${fragment}\` on line ${line} matches no heading or id in this document.`,
        fix: `${guess ? `Did you mean \`#${guess}\`? ` : ""}${available} To link somewhere else, add \`{#${fragment}}\` after the element it should point at.`,
      },
    ];
  });
}

// A plugin can leave a tree the walk can't read; then other documents' anchors into this one go unchecked.
function idsOf(nodes: Node[]): Set<string> | undefined {
  try {
    const ids = new Set<string>();
    for (const [, attributes] of elements(nodes)) {
      const id = text(attributes.id);
      if (id) ids.add(id);
    }
    return ids;
  } catch {
    return undefined;
  }
}

// A plugin can derive a URL the writer never wrote, such as an embed's player or a chip's avatar; those aren't
// found in the source and aren't checked. A web URL is matched in prose too, since Comark links a bare one.
function linksOf(nodes: Node[], source: Source): Link[] {
  const counts = new Map<string, number>();
  const links: Link[] = [];
  for (const [, attributes] of elements(nodes))
    for (const key of ["href", "src"]) {
      const value = text(attributes[key]);
      if (!value || value.startsWith("#") || value.startsWith("data:")) continue;
      const attribute = !/^https?:/i.test(value);
      for (const needle of new Set([value, decode(value)])) {
        const nth = counts.get(needle) ?? 0;
        const at = find(source, needle, { nth, from: source.body, attribute });
        if (!at) continue;
        counts.set(needle, nth + 1);
        links.push({ key, value, ...at });
        break;
      }
    }
  return links;
}

// A browser reads a reference past U+10FFFF as U+FFFD.
const character = (code: number) => (code <= 0x10ffff ? String.fromCodePoint(code) : "\uFFFD");

const ENTITIES = new Map([
  ["colon", ":"],
  ["tab", "\t"],
  ["newline", "\n"],
]);

const references = (text: string, names: Map<string, string>) =>
  text
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => character(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => character(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => names.get(name.toLowerCase()) ?? entity);

// A local copy of the idea behind Comark's internal isUnsafeUrlValue: decode what a browser decodes, then read the scheme.
function unsafeScheme(value: string): string | undefined {
  let url = decode(value);
  for (let pass = 0; pass < 5; pass++) {
    const next = references(url, ENTITIES);
    if (next === url) break;
    url = next;
  }
  // Browsers skip whitespace and control characters inside a scheme, so `java\tscript:` still runs.
  url = url.replace(/[\s\p{Cc}]/gu, "").toLowerCase();
  const scheme = /^(javascript|vbscript|data):/.exec(url)?.[0];
  return scheme === "data:" && url.startsWith("data:image/") ? undefined : scheme;
}

const REFERENCES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ...ENTITIES,
]);

// Comark decodes character references in HTML attributes, so `jav&#x61;script:` reaches the tree as `javascript:`,
// which the source doesn't contain. These are the quoted values in the source that decode to it.
function written(source: Source, value: string): string[] {
  const found = new Set<string>();
  for (const line of source.prose.slice(source.body))
    for (const [, , quoted] of line.matchAll(/=\s*(["'])(.*?)\1/g)) {
      if (quoted !== value && references(quoted!, REFERENCES) === value) found.add(quoted!);
    }
  return [...found];
}

function unsafeUrls(nodes: Node[], source: Source): Diagnostic[] {
  const locate = locator(source, true);
  const found: Diagnostic[] = [];
  for (const [tag, attributes] of elements(nodes)) {
    for (const key of ["href", "src"]) {
      const value = text(attributes[key]);
      if (!value) continue;
      const scheme = unsafeScheme(value);
      if (!scheme) continue;
      const { line, column } = locate(value, ...written(source, value));
      found.push({
        rule: "comark/unsafe-url",
        line,
        column,
        message: `The \`${key}\` of \`${tag}\` on line ${line} is a \`${scheme}\` URL.`,
        fix: "Use an https: or relative URL. A `javascript:`, `vbscript:`, or non-image `data:` URL can run script when it's clicked or loaded.",
      });
    }
  }
  return found;
}

function duplicateIds(nodes: Node[], source: Source, headingIds?: HeadingIdsOption): Diagnostic[] {
  const tagged = [...elements(nodes)].flatMap(([tag, attributes]) => {
    const id = text(attributes.id);
    return id ? [{ tag, id }] : [];
  });
  const seen = new Map<string, number>();
  const found: Diagnostic[] = [];
  const locations = (id: string): { line: number; column: number }[] => {
    const matches: { line: number; column: number }[] = [];
    const explicit = [
      `{#${id}`,
      `{id="${id}"}`,
      `{id='${id}'}`,
      `{id=${id}}`,
      `id="${id}"`,
      `id='${id}'`,
      `id=${id}`,
    ];
    let ancestors: { level: number; text: string }[] = [];
    const slug = (value: string) => {
      const clean = value
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/`([^`]*)`/g, "$1")
        .replace(/[*_~]/g, "")
        .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      return /^\d/.test(clean) ? `_${clean}` : clean;
    };
    for (let line = source.body; line < source.prose.length; line++) {
      const value = source.prose[line]!;
      for (const needle of explicit) {
        const at = value.indexOf(needle);
        if (at !== -1) matches.push({ line: line + 1, column: at + 1 });
      }
      const heading = /^( {0,3})(#{1,6})\s+(.+?)\s*$/.exec(value);
      if (!heading) continue;
      const level = heading[2]!.length;
      const explicitId = /\s+\{#([^}]+)\}\s*$/.exec(heading[3]!)?.[1];
      const content = heading[3]!.replace(/\s+\{#[^}]+\}\s*$/, "");
      while (ancestors.at(-1) && ancestors.at(-1)!.level >= level) ancestors.pop();
      let headingText = content;
      if (headingIds === "nested" && level >= 3) {
        const parts: string[] = [];
        for (const item of ancestors) {
          if (item.level >= 2) parts.push(item.text);
        }
        parts.push(content);
        headingText = parts.join(" ");
      }
      const generated = slug(headingText);
      // An explicit heading label is the parser's sole source for this ID when it
      // matches the generated slug; do not count that heading twice.
      if (generated === id && explicitId !== id)
        matches.push({ line: line + 1, column: heading[0].indexOf(heading[3]!) + 1 });
      ancestors.push({ level, text: content });
    }
    return matches.sort((a, b) => a.line - b.line || a.column - b.column);
  };
  const byId = new Map<string, { line: number; column: number }[]>();
  for (const { tag, id } of tagged) {
    const index = seen.get(id) ?? 0;
    seen.set(id, index + 1);
    if (!index) continue;
    // IDs may come from heading labels, Comark attributes, or raw HTML. Keep all forms in
    // source order so a mixed document points at the duplicate element itself.
    const at = (byId.get(id) ?? (byId.set(id, locations(id)), byId.get(id)!))[index];
    const { line, column } = at ?? { line: source.body + 1, column: undefined };
    found.push({
      rule: "comark/duplicate-id",
      line,
      column,
      message: `The \`${tag}\` on line ${line} has the id \`${id}\`, which an element before it already has, so links to \`#${id}\` go to that one.`,
      fix: `Give it an id of its own, such as \`{#${id}-2}\`.`,
    });
  }
  return found;
}

function missingAlts(nodes: Node[], source: Source): Diagnostic[] {
  const locate = locator(source);
  const found: Diagnostic[] = [];
  const occurrences = new Map<string, number>();
  for (const [tag, attributes] of elements(nodes)) {
    const src = text(attributes.src);
    const nth = occurrences.get(src) ?? 0;
    if (src) occurrences.set(src, nth + 1);
    // An empty `alt`, written `{alt=""}` or in HTML, marks an image as decoration on purpose.
    if (tag !== "img" || !src || attributes.alt !== undefined) continue;
    const at = findAny(source, [`](${src}`, `src="${src}"`, `src='${src}'`, `src=${src}`], { nth });
    const { line, column } = at ?? locate(`](${src}`, src);
    found.push({
      rule: "comark/missing-alt",
      line,
      column,
      message: `The image \`${src}\` on line ${line} has no alt text, so screen readers skip it or read its file name.`,
      fix: `Describe what it shows between the brackets, as in \`![Pigeons on the roof](${src})\`, or add \`{alt=""}\` after it if it's only decoration.`,
    });
  }
  return found;
}

function emptyLinks(nodes: Node[], source: Source): Diagnostic[] {
  const locate = locator(source);
  const found: Diagnostic[] = [];
  const occurrences = new Map<string, number>();
  for (const [tag, attributes, ...children] of elements(nodes)) {
    const href = text(attributes.href);
    const nth = occurrences.get(href) ?? 0;
    if (href) occurrences.set(href, nth + 1);
    const named = text(attributes["aria-label"]);
    if (tag !== "a" || !href || named || children.some((child) => isElement(child) || text(child)))
      continue;
    const at = findAny(source, [`](${href}`, `href="${href}"`, `href='${href}'`, `href=${href}`], {
      nth,
    });
    const { line, column } = at ?? locate(`](${href}`, href);
    found.push({
      rule: "comark/empty-link",
      line,
      column,
      message: `The link to \`${href}\` on line ${line} has no text, so readers can't see it and screen readers read out its URL.`,
      fix: `Write what it links to between the brackets, as in \`[The pigeon census](${href})\`.`,
    });
  }
  return found;
}

function pluginIssues(
  meta: Record<string, unknown>,
  source: Source,
  blocks: Block[],
): Diagnostic[] {
  const issues = Array.isArray(meta.issues)
    ? meta.issues.flatMap((issue) => text(issue) || [])
    : [];
  const named: Record<string, unknown> =
    meta.issueRules instanceof Object ? { ...meta.issueRules } : {};
  const locate = locator(source);
  return issues.map((issue) => {
    const rule = text(named[issue]);
    const known = Object.hasOwn(catalog, rule);
    const { line, column } = place(issue, blocks, locate);
    const sentences = issue.split(/(?<=[.!?])\s+(?=[A-Z`])/);
    return {
      // A rule this version doesn't know, from a newer plugin, still reports.
      // SAFETY: `known` says the catalog, whose keys are exactly the rules, has it.
      rule: known ? (rule as Rule) : "comark/plugin-issue",
      line,
      column,
      message: sentences.length > 1 ? sentences.slice(0, -1).join(" ") : issue,
      fix: sentences.length > 1 ? sentences.at(-1)! : "Change the block as the message says.",
    };
  });
}

// Plugins name their block in prose, such as `compare 2`, `` `::chart` 2 ``, or `screenshot "before.png"`, so that is what
// gets searched for.
function place(
  issue: string,
  blocks: Block[],
  locate: ReturnType<typeof locator>,
): { line: number; column?: number } {
  const numbered = /^`?(?:::)?([a-z][\w-]*)`? (\d+)\b/.exec(issue);
  const block =
    numbered &&
    blocks.filter((candidate) => candidate.name === numbered[1])[Number(numbered[2]) - 1];
  if (block) return block;
  const quoted = /"((?:[^"\\]|\\.)+)"/.exec(issue)?.[1];
  if (quoted) {
    const at = locate(unescape(quoted));
    if (at.column) return at;
  }
  const named = /^([a-z][\w-]*)\b/.exec(issue)?.[1];
  return blocks.find((candidate) => candidate.name === named) ?? { line: 1 };
}

function unescape(quoted: string): string {
  try {
    return String(JSON.parse(`"${quoted}"`));
  } catch {
    return quoted;
  }
}
