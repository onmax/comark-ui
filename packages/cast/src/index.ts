import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { textContent } from "comark/utils";
import { Terminal, toNodes } from "./term.ts";

/** Reads a file by its POSIX path relative to `root`, such as `demos/test.cast`. Returns undefined when it doesn't exist. */
export type CastReader = (path: string) => string | undefined | Promise<string | undefined>;

export interface CastOptions {
  /** The folder casts are read from and can't leave. Default `"."`, the working directory. */
  root?: string;
  /**
   * Reads a file under `root`. Default reads from disk and refuses symlinks that lead out of `root`, so browsers and
   * edge runtimes pass their own.
   */
  read?: CastReader;
}

export type CastMeta = {
  /** One readable sentence per problem with a `::cast`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/cast/${string}`; message: string };

/** What a `::cast` becomes, and all its renderers read. Its children are the terminal's text and colored spans. */
export type CastAttributes = { mode?: "screen" | "log"; title?: string };

type Data = Parameters<typeof resolveAttributes>[1];

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;
const childrenOf = ([, , ...rest]: ElementNode): Node[] => rest;
const scalar = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? undefined
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);
const text = (value: unknown) => scalar(value)?.trim() ?? "";
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const isObject = (value: unknown): value is Record<string, unknown> =>
  value instanceof Object && !Array.isArray(value);
const size = (value: unknown, fallback: number) =>
  Number.isInteger(value) && Number(value) > 0 && Number(value) <= 1000 ? Number(value) : fallback;

const PROPS = ["src", "mode", "title"];

class OutsideRoot extends Error {}

// Paths are joined as strings, so the root check runs the same in Node, browsers, and edge runtimes.
function resolve(src: string) {
  const parts: string[] = [];
  for (const part of src.split(/[/\\]/)) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return;
  }
  return parts.join("/");
}

function diskReader(root: string): CastReader {
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
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      )
        return undefined;
      throw error;
    }
  };
}

/** Replays a cast's output, or says what's wrong with it. */
function replay(source: string, name: string, log: boolean): { nodes: Node[] } | { issue: Issue } {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  // asciinema v3 allows comment lines starting with `#`.
  const isEvent = (line: string) => line.trim() && !line.startsWith("#");
  const start = lines.findIndex(isEvent);
  let header: unknown;
  try {
    header = JSON.parse(lines[start] ?? "");
  } catch {
    // Reported below.
  }
  const version = isObject(header) ? header.version : undefined;
  if (!isObject(header) || (version !== 2 && version !== 3))
    return {
      issue: {
        rule: "comark/cast/invalid-header",
        message: `${name} isn't an asciinema cast: its first line must be a JSON header with \`"version": 2\` or \`3\`. Record it with \`asciinema rec\`.`,
      },
    };
  const term = isObject(header.term) ? header.term : {};
  const terminal = new Terminal(
    size(version === 2 ? header.width : term.cols, 80),
    size(version === 2 ? header.height : term.rows, 24),
  );
  let output = 0;
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index]!;
    if (!isEvent(line)) continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      // Reported below.
    }
    const [, code, data] = Array.isArray(event) ? event.map(scalar) : [];
    if (code === undefined || data === undefined)
      return {
        issue: {
          rule: "comark/cast/invalid-event",
          message: `${name}: line ${index + 1} isn't an event like \`[0.5, "o", "text"]\`. Fix it or remove it.`,
        },
      };
    if (code === "o") {
      terminal.write(data);
      output++;
    } else if (code === "r") {
      const [, cols, rows] = /^(\d+)x(\d+)$/.exec(data) ?? [];
      if (cols && rows) terminal.resize(size(Number(cols), 80), size(Number(rows), 24));
    }
  }
  if (!output)
    return {
      issue: {
        rule: "comark/cast/no-output",
        message: `${name} has no output events, so there's nothing to show.`,
      },
    };
  return { nodes: toNodes(terminal.text(log)) };
}

async function cast(
  node: ElementNode,
  number: number,
  data: Data,
  read: CastReader,
): Promise<{ attrs: CastAttributes; nodes: Node[]; issues: Issue[] }> {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const src = text(attrs.src);
  const mode = text(attrs.mode) || "screen";
  const title = text(attrs.title);
  const name = `\`::cast\` ${number}${src ? ` "${src}"` : ""}`;
  const issues: Issue[] = [];
  const fail = (rule: Issue["rule"], message: string) => ({
    attrs: {},
    nodes: [],
    issues: [...issues, { rule, message }],
  });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/cast/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::cast\`, so it's ignored. Use \`src\`, \`mode\`, or \`title\`.`,
      });
  }
  if (mode !== "screen" && mode !== "log")
    issues.push({
      rule: "comark/cast/invalid-mode",
      message: `${name}: \`mode\` must be \`screen\` or \`log\`; it shows the screen.`,
    });
  const pre = childrenOf(node).find(
    (child): child is ElementNode => isElement(child) && child[0] === "pre",
  );
  if (src && pre)
    issues.push({
      rule: "comark/cast/src-and-code",
      message: `${name} has both \`src\` and a code block; it shows the file. Remove one of them.`,
    });
  let source: string | undefined;
  if (src) {
    if (/^[a-z][a-z\d+.-]*:/i.test(src))
      return fail("comark/cast/remote-file", `${name}: only local files can be read.`);
    const path = resolve(src);
    const leaves = `${name}: the path leaves the root. Move the file under the root or widen \`root\`.`;
    if (path === undefined) return fail("comark/cast/path-outside-root", leaves);
    try {
      source = await read(path);
    } catch (error) {
      if (error instanceof OutsideRoot) return fail("comark/cast/path-outside-root", leaves);
      return fail(
        "comark/cast/read-failed",
        `${name}: reading "${path}" failed: ${errorText(error)}. Check the file or the \`read\` option.`,
      );
    }
    if (source === undefined)
      return fail(
        "comark/cast/file-not-found",
        `${name}: file not found. It resolved to "${path}" under the root; check the path or \`root\`.`,
      );
  } else if (pre) source = textContent(pre);
  else
    return fail(
      "comark/cast/missing-cast",
      `\`::cast\` ${number} needs a cast: write \`::cast{src="demo.cast"}\`, or put the cast in a code block inside it.`,
    );
  const result = replay(source, name, mode === "log");
  if ("issue" in result) return fail(result.issue.rule, result.issue.message);
  return {
    attrs: { mode: mode === "log" ? "log" : "screen", ...(title && { title }) },
    nodes: result.nodes,
    issues,
  };
}

/**
 * Turns `::cast{src="demo.cast"}`, an asciinema v2 or v3 recording, into the terminal's final screen as colored text,
 * or with `mode="log"` everything it printed. No player and no script. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<CastOptions, CastMeta>((options = {}) => ({
  name: "comark-cast",
  async post(state) {
    const { tree } = state;
    const read = options.read ?? diskReader(options.root ?? ".");
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const issues: Issue[] = [];
    let count = 0;
    const walk = async (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] !== "cast") {
          // SAFETY: an element node is [tag, attributes, ...children], so its items from index 2 are nodes.
          await walk(node as Node[], 2);
          continue;
        }
        const found = await cast(node, ++count, data, read);
        issues.push(...found.issues);
        nodes[index] = ["cast", found.attrs, ...found.nodes];
      }
    };
    await walk(tree.nodes, 0);
    tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
    tree.meta.issueRules = {
      ...tree.meta.issueRules,
      ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
    };
  },
}));
