import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";

/** Reads a file by its POSIX path relative to `root`, such as `bench/results.csv`. Returns undefined when it doesn't exist. */
export type TableReader = (path: string) => string | undefined | Promise<string | undefined>;

export interface TableOptions {
  /** The folder a `src` can't leave, and where a `src` that starts with `/` starts. Default `"."`, the working directory. */
  root?: string;
  /** The document's folder relative to `root`, where relative paths start. Default `""`, the root itself. */
  base?: string;
  /**
   * Reads a file under `root`. Default reads from disk and refuses symlinks that lead out of `root`, so browsers and
   * edge runtimes pass their own, as with comark-include.
   */
  read?: TableReader;
  /** Turn ` ```csv ` and ` ```tsv ` fences outside `::table` into tables. Default `true`. */
  fences?: boolean;
}

export type TableMeta = {
  /** One readable sentence per problem with a `::table` or a data fence. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/table/${string}`; message: string };

/**
 * What a `::table` or a data fence becomes: a `data-table` node around a plain `table`. `sort` makes the headers
 * buttons, and `copy` shows the Copy CSV and Copy Markdown buttons.
 */
export type TableAttributes = { sort?: boolean; copy?: boolean };

/** The tag the plugin's tables carry, since `::table` shares its name with every Markdown table. */
export const TABLE_TAG = "data-table";

type Data = Parameters<typeof resolveAttributes>[1];
type Format = "csv" | "tsv" | "json";

const FORMATS = new Set<string>(["csv", "tsv", "json"]);
const NUMBER = /^[+-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)(?:\s*\S{1,4})?$/;

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const textOf = (node: Node): string =>
  !Array.isArray(node) ? node : isElement(node) ? childrenOf(node).map(textOf).join("") : "";
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean).trim();
const on = (value: unknown) => value !== undefined && value !== false && text(value) !== "false";
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const isMarkdownTable = (node: ElementNode) =>
  node[0] === "table" && childrenOf(node).some((child) => isElement(child) && child[0] === "thead");
const PROPS = ["src", "format", "sort", "copy"];
// Comark unwraps a lone Markdown table into `::table`, so the block is told apart by its props.
const isBlock = (node: ElementNode) =>
  node[0] === "table" &&
  (!isMarkdownTable(node) ||
    Object.keys(node[1]).some((key) => PROPS.includes(key.replace(/^:/, ""))));

// The colors comark-badge uses, as tints, so a cell's text keeps its color and reads in light and dark themes.
const TONES = {
  success: "var(--ui-success,#16a34a)",
  warning: "var(--ui-warning,#ca8a04)",
  error: "var(--ui-error,var(--destructive,#dc2626))",
  info: "var(--ui-info,#2563eb)",
};
type Tone = keyof typeof TONES;
const isKnownTone = (tone: string): tone is Tone => Object.hasOwn(TONES, tone);
// A data cell can't hold Markdown, so a whole cell written as a tone span is read here.
const TONED = /^\[(.*)\]\{\s*tone=(?:"([^"]*)"|'([^']*)'|([^\s}]*))\s*\}$/;
const isTone = (node: Node): node is ElementNode =>
  isElement(node) && node[0] === "span" && Object.hasOwn(node[1], "tone");
const cellNode = (cell: string): Node => {
  const toned = TONED.exec(cell);
  return toned ? ["span", { tone: toned[2] ?? toned[3] ?? toned[4] }, toned[1] ?? ""] : cell;
};
const cellText = (cell: string) => TONED.exec(cell)?.[1] ?? cell;

/** RFC 4180: quoted cells may hold the separator, line breaks, and `""` for a quote. */
function delimited(source: string, separator: string): string[][] | undefined {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (source[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = false;
    } else if (char === '"' && !cell.trim()) {
      quoted = true;
      cell = "";
    } else if (char === separator) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (quoted) return undefined;
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((cells) => cells.some(Boolean));
}

/** TSV is tab-separated text without CSV's quote syntax; quotes are data. */
function tsv(source: string): string[][] {
  return source
    .split("\n")
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean));
}

const value = (item: unknown) =>
  item === null || item === undefined
    ? ""
    : item instanceof Object
      ? JSON.stringify(item)
      : text(item);

/** The header and rows of a file or a fence, or why there are none. */
function rowsOf(source: string, format: Format): { rows: string[][] } | { issue: Issue } {
  if (format === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      return {
        issue: {
          rule: "comark/table/invalid-json",
          message: `its JSON doesn't parse: ${errorText(error)}. Fix the JSON.`,
        },
      };
    }
    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => item instanceof Object && !Array.isArray(item))
    )
      return {
        issue: {
          rule: "comark/table/json-not-rows",
          message:
            'its JSON must be an array of objects, one per row, such as `[{"name": "a", "size": 1}]`.',
        },
      };
    // SAFETY: every item was checked above to be a plain object.
    const items = parsed as Record<string, unknown>[];
    const columns = [...new Set(items.flatMap((item) => Object.keys(item)))];
    return {
      rows: [columns, ...items.map((item) => columns.map((column) => value(item[column])))],
    };
  }
  const normalized = source.replace(/\r\n?/g, "\n");
  const rows = format === "tsv" ? tsv(normalized) : delimited(normalized, ",");
  return rows
    ? { rows }
    : {
        issue: {
          rule: "comark/table/unclosed-quote",
          message:
            'a quoted cell never ends. Close it with `"`, and write a quote inside one as `""`.',
        },
      };
}

function build(
  rows: string[][],
  sort: boolean,
  name: string,
  issues: Issue[],
): ElementNode | undefined {
  const [header = [], ...body] = rows;
  if (!header.length || !body.length) {
    issues.push({
      rule: "comark/table/no-rows",
      message: `${name} has no rows. Give it a header row and at least one row of data.`,
    });
    return undefined;
  }
  const uneven = body.findIndex((row) => row.length !== header.length);
  if (uneven !== -1)
    issues.push({
      rule: "comark/table/uneven-row",
      message: `${name}: row ${uneven + 1} has ${body[uneven]?.length} cells, but the header has ${header.length}. Give every row one cell per column.`,
    });
  // Numbers line up on the right, as a spreadsheet shows them.
  const numeric = header.map((_, column) =>
    body.every((row) => !row[column] || NUMBER.test(cellText(row[column]))),
  );
  const style = (column: number) => (numeric[column] ? { style: "text-align:right" } : {});
  const table: ElementNode = [
    "table",
    {},
    [
      "thead",
      {},
      [
        "tr",
        {},
        ...header.map((label, column): ElementNode => ["th", style(column), cellNode(label)]),
      ],
    ],
    [
      "tbody",
      {},
      ...body.map((row): ElementNode => [
        "tr",
        {},
        ...header.map((_, column): ElementNode => [
          "td",
          style(column),
          cellNode(row[column] ?? ""),
        ]),
      ]),
    ],
  ];
  color(table, name, issues);
  if (sort) sortable(table);
  return table;
}

/** Takes `tone` off every span under `node`, unwrapping a span it leaves bare, and returns those spans. */
function takeTones(node: ElementNode): ElementNode[] {
  const spans: ElementNode[] = [];
  const children = childrenOf(node).flatMap((child): Node[] => {
    if (!isElement(child)) return [child];
    spans.push(...takeTones(child));
    if (!isTone(child)) return [child];
    spans.push(child);
    const { tone: _, ...rest } = child[1];
    return Object.keys(rest).length ? [[child[0], rest, ...childrenOf(child)]] : childrenOf(child);
  });
  node.splice(2, node.length - 2, ...children);
  return spans;
}

/**
 * Tints each cell that is one `[text]{tone="error"}` span, and each row whose first cell is, so the span itself never
 * renders. The tint goes on every cell rather than the row, since a page's striped rows paint their cells.
 */
function color(table: ElementNode, name: string, issues: Issue[]) {
  let index = 0;
  for (const section of childrenOf(table)) {
    if (!isElement(section) || (section[0] !== "thead" && section[0] !== "tbody")) continue;
    for (const row of childrenOf(section)) {
      if (!isElement(row) || row[0] !== "tr") continue;
      const where = section[0] === "thead" ? `${name}, header row` : `${name}, row ${++index}`;
      const cells = childrenOf(row).filter(
        (cell): cell is ElementNode => isElement(cell) && (cell[0] === "td" || cell[0] === "th"),
      );
      const tones = cells.map((cell) => {
        const content = childrenOf(cell).filter(isContent);
        const [only] = content;
        const filling = content.length === 1 && only && isTone(only) ? only : undefined;
        let found: Tone | undefined;
        let invalid = false;
        for (const span of takeTones(cell)) {
          const tone = text(span[1].tone);
          if (span !== filling) {
            invalid = true;
            issues.push({
              rule: "comark/table/partial-tone",
              message: `${where}: the \`tone\` span "[${textOf(span)}]" doesn't fill its cell, so the cell isn't colored. Put the whole cell in the brackets, as \`[${textOf(cell)}]{tone="${tone}"}\`, or drop \`{tone}\`.`,
            });
          } else if (!isKnownTone(tone)) {
            invalid = true;
            issues.push({
              rule: "comark/table/unknown-tone",
              message: `${where}: "${tone}" isn't a tone, so the cell isn't colored. Use \`success\`, \`warning\`, \`error\`, or \`info\`.`,
            });
          } else found = tone;
        }
        return invalid ? null : found;
      });
      cells.forEach((cell, column) => {
        const tone = tones[column] === undefined ? tones[0] : tones[column];
        if (!tone) return;
        const tint = `background-color:color-mix(in srgb,${TONES[tone]} 20%,transparent)`;
        cell[1] = { ...cell[1], style: [text(cell[1].style), tint].filter(Boolean).join(";") };
      });
    }
  }
}

/** Makes a Markdown table's headers sort buttons. */
function sortable(table: ElementNode) {
  for (const section of childrenOf(table))
    if (isElement(section) && section[0] === "thead")
      for (const row of childrenOf(section))
        if (isElement(row))
          for (const th of childrenOf(row))
            if (isElement(th) && th[0] === "th")
              th.splice(2, th.length - 2, [
                "button",
                { type: "button", class: "ctb-sort" },
                ...childrenOf(th),
              ]);
}

// Paths are joined as strings, so the root check runs the same in Node, browsers, and edge runtimes.
function resolvePath(folder: string, src: string) {
  const parts = folder ? folder.split("/") : [];
  for (const part of src.split(/[/\\]/)) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return undefined;
  }
  return parts.join("/");
}

class OutsideRoot extends Error {}

const isMissing = (error: unknown) =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "ENOENT" || error.code === "ENOTDIR");

function diskReader(root: string): TableReader {
  const folder = (root || ".").replace(/[/\\]+$/, "");
  return async (path) => {
    // Imported on first read, so the plugin loads in runtimes without node:fs when they pass their own `read`.
    const { readFile, realpath } = await import("node:fs/promises");
    const paths = await import("node:path");
    try {
      // The string check can't see symlinks, so the real target must sit under the real root too.
      const [base, target] = await Promise.all([realpath(folder), realpath(`${folder}/${path}`)]);
      const inside = paths.relative(base, target);
      if (inside === ".." || inside.startsWith(`..${paths.sep}`) || paths.isAbsolute(inside))
        throw new OutsideRoot();
      return await readFile(target, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  };
}

interface Run {
  read: TableReader;
  base: string;
  issues: Issue[];
}

async function fromFile(
  src: string,
  name: string,
  run: Run,
): Promise<{ source: string; format: string } | undefined> {
  const fail = (rule: Issue["rule"], issue: string) =>
    void run.issues.push({ rule, message: `${name}: ${issue}` });
  if (/^[a-z][a-z\d+.-]*:/i.test(src))
    return fail("comark/table/remote-src", "`src` must be a local file; a table can't read a URL.");
  const path = resolvePath(src.startsWith("/") ? "" : run.base, src);
  const leaves = "the path leaves the root. Move the file under the root or widen `root`.";
  if (path === undefined) return fail("comark/table/path-outside-root", leaves);
  let source: string | undefined;
  try {
    source = await run.read(path);
  } catch (error) {
    if (error instanceof OutsideRoot) return fail("comark/table/path-outside-root", leaves);
    return fail(
      "comark/table/read-failed",
      `reading "${path}" failed: ${errorText(error)}. Check the file or the \`read\` option.`,
    );
  }
  if (source === undefined)
    return fail(
      "comark/table/file-not-found",
      `file not found. It resolved to "${path}" under the root; check the path or \`base\`.`,
    );
  return { source, format: path.slice(path.lastIndexOf(".") + 1).toLowerCase() };
}

async function block(node: ElementNode, number: number, data: Data, run: Run): Promise<Node> {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const src = text(attrs.src);
  const name = `\`::table\` ${number}${src ? ` ("${src}")` : ""}`;
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      run.issues.push({
        rule: "comark/table/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::table\`, so it's ignored. Use \`src\`, \`format\`, \`sort\`, or \`copy\`.`,
      });
  }
  const sort = on(attrs.sort);
  const result = (table: ElementNode | undefined): Node =>
    table
      ? [TABLE_TAG, { sort, copy: attrs.copy === undefined || on(attrs.copy) }, table]
      : ["div", {}];
  if (!src && isMarkdownTable(node)) {
    const inner: ElementNode = ["table", {}, ...childrenOf(node)];
    if (sort) sortable(inner);
    return result(inner);
  }
  const content = childrenOf(node).filter(isContent);
  if (src && content.length)
    run.issues.push({
      rule: "comark/table/content-dropped",
      message: `${name} drops what's inside it, since it reads \`src\`. Use one or the other.`,
    });
  let source: string;
  let format = text(attrs.format).toLowerCase();
  if (src) {
    const file = await fromFile(src, name, run);
    if (!file) return result(undefined);
    source = file.source;
    format ||= file.format;
  } else {
    const [inner] = content;
    const fence =
      content.length === 1 && isElement(inner) && inner[0] === "pre" ? inner : undefined;
    if (!fence) {
      run.issues.push({
        rule: "comark/table/empty-block",
        message: `${name} has nothing to show. Give it \`src="data.csv"\`, or put one Markdown table or one csv, tsv, or json fence inside it.`,
      });
      return result(undefined);
    }
    source = textOf(fence);
    format ||= text(fence[1].language).toLowerCase();
  }
  if (!FORMATS.has(format)) {
    run.issues.push({
      rule: "comark/table/unknown-format",
      message: `${name}: can't read ${format ? `"${format}"` : "data without a format"}. Use a .csv, .tsv, or .json file or fence, or set \`format\`.`,
    });
    return result(undefined);
  }
  // SAFETY: FORMATS holds exactly the three formats.
  const read = rowsOf(source, format as Format);
  if ("issue" in read) {
    run.issues.push({ rule: read.issue.rule, message: `${name}: ${read.issue.message}` });
    return result(undefined);
  }
  return result(build(read.rows, sort, name, run.issues));
}

/**
 * Turns `::table{src="bench.csv"}`, a `::table` around a csv, tsv, or json fence or a Markdown table, and every bare
 * ` ```csv ` or ` ```tsv ` fence into a table while parsing, with buttons that copy it as CSV or Markdown and, with
 * `sort`, headers that sort it. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<TableOptions | undefined, TableMeta>((options = {}) => ({
  name: "comark-table",
  async post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const base = resolvePath("", options.base ?? "");
    const run: Run = {
      read: options.read ?? diskReader(options.root ?? "."),
      base: base ?? "",
      issues: [],
    };
    if (base === undefined)
      run.issues.push({
        rule: "comark/table/base-outside-root",
        message: `table: \`base\` "${options.base ?? ""}" leaves the root. Set it to the document's folder under \`root\`.`,
      });
    let tables = 0;
    const tint = (nodes: Node[]) => {
      for (const node of nodes) {
        if (!isElement(node) || node[0] === "pre" || node[0] === "code") continue;
        if (isMarkdownTable(node)) color(node, `Markdown table ${++tables}`, run.issues);
        else tint(childrenOf(node));
      }
    };
    tint(tree.nodes);
    const count = { block: 0, fence: 0 };
    const walk = async (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        const [tag, attrs] = node;
        const language = text(attrs.language).toLowerCase();
        if (isBlock(node)) nodes[index] = await block(node, ++count.block, data, run);
        else if (
          tag === "pre" &&
          options.fences !== false &&
          (language === "csv" || language === "tsv")
        ) {
          const name = `The \`\`\`${language} fence ${++count.fence}`;
          const read = rowsOf(textOf(node), language);
          if ("issue" in read)
            run.issues.push({ rule: read.issue.rule, message: `${name}: ${read.issue.message}` });
          const table = "issue" in read ? undefined : build(read.rows, false, name, run.issues);
          // A fence that can't be read stays code, so nothing the author wrote is lost.
          if (table) nodes[index] = [TABLE_TAG, { sort: false, copy: true }, table];
        } else if (tag !== "pre" && tag !== "code")
          // SAFETY: an element node is [tag, attributes, ...children], so its children start at index 2.
          await walk(node as Node[], 2);
      }
    };
    await walk(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...run.issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(run.issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
