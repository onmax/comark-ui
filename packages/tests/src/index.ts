import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { parseXml, XmlError, type XmlElement } from "./xml.ts";

/** Reads a file by its POSIX path relative to `root`, such as `reports/junit.xml`. Returns undefined when it doesn't exist. */
export type TestsReader = (path: string) => string | undefined | Promise<string | undefined>;

export interface TestsOptions {
  /** The folder a `src` can't leave, and where a `src` that starts with `/` starts. Default `"."`, the working directory. */
  root?: string;
  /** The document's folder relative to `root`, where relative paths start. Default `""`, the root itself. */
  base?: string;
  /**
   * Reads a file under `root`. Default reads from disk and refuses symlinks that lead out of `root`, so browsers and
   * edge runtimes pass their own, as with comark-include.
   */
  read?: TestsReader;
}

export type TestsMeta = {
  /** One readable sentence per problem with a `::tests` block. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Rule = `comark/tests/${string}`;
type Issue = { rule: Rule; message: string };

/**
 * What a `::tests` block becomes: its counts, its duration, and its title. The node's children are one `<details>` per
 * failing test, with the message and the stack in a code block.
 */
export type TestsAttributes = {
  passed?: number;
  failed?: number;
  skipped?: number;
  duration?: string;
  title?: string;
};

type Data = Parameters<typeof resolveAttributes>[1];

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
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const seconds = (value: string | undefined) => {
  const number = Number(value);
  return value && Number.isFinite(number) && number >= 0 ? number : undefined;
};

/** Every element named `name` under `element`, at any depth. */
const all = (element: XmlElement, name: string): XmlElement[] =>
  element.children.flatMap((child) => (child.name === name ? [child] : all(child, name)));

function duration(total: number) {
  if (total < 1) return `${Math.round(total * 1000)} ms`;
  if (total < 60) return `${Number(total.toFixed(1))} s`;
  const minutes = Math.floor(total / 60);
  return `${minutes} min ${Math.round(total - minutes * 60)} s`;
}

/** The counts, duration, and failures of a JUnit report, or why it isn't one. */
function report(
  root: XmlElement,
): { attrs: TestsAttributes; failures: ElementNode[] } | { issue: string } {
  if (root.name !== "testsuites" && root.name !== "testsuite")
    return {
      issue: `it isn't a JUnit report: its root is \`<${root.name}>\`, not \`<testsuites>\` or \`<testsuite>\`.`,
    };
  const cases = all(root, "testcase");
  let passed = 0;
  let skipped = 0;
  const failures: ElementNode[] = [];
  for (const testcase of cases) {
    const failure = testcase.children.find(
      (child) => child.name === "failure" || child.name === "error",
    );
    if (testcase.children.some((child) => child.name === "skipped")) skipped++;
    else if (!failure) passed++;
    else {
      const { name = "", classname = "" } = testcase.attributes;
      const title = [classname, name].filter(Boolean).join(" › ") || "Unnamed test";
      const message = failure.attributes.message?.trim() ?? "";
      const stack = failure.text.replace(/^\s*\n|\s+$/g, "");
      const parts: ElementNode[] = [["summary", {}, title]];
      if (message && message !== stack) parts.push(["p", { class: "ctr-message" }, message]);
      if (stack) parts.push(["pre", { class: "ctr-stack" }, ["code", {}, stack]]);
      failures.push(["details", { class: "ctr-failure" }, ...parts]);
    }
  }
  // The runner's own total, else the suites', else the cases'.
  const suites =
    root.name === "testsuite"
      ? [root]
      : root.children.filter((child) => child.name === "testsuite");
  const total =
    seconds(root.attributes.time) ??
    (suites.length && suites.every((suite) => seconds(suite.attributes.time) !== undefined)
      ? suites.reduce((sum, suite) => sum + (seconds(suite.attributes.time) ?? 0), 0)
      : cases.reduce((sum, testcase) => sum + (seconds(testcase.attributes.time) ?? 0), 0));
  return {
    attrs: {
      passed,
      failed: failures.length,
      skipped,
      ...(total > 0 && { duration: duration(total) }),
    },
    failures,
  };
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

function diskReader(root: string): TestsReader {
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
  read: TestsReader;
  base: string;
  issues: Issue[];
}

const PROPS = ["src", "title"];

async function source(
  node: ElementNode,
  src: string,
  name: string,
  run: Run,
): Promise<string | undefined> {
  const fail = (rule: Rule, issue: string) =>
    void run.issues.push({ rule, message: `${name}: ${issue}` });
  const content = childrenOf(node).filter(isContent);
  if (!src) {
    const [fence] = content;
    if (content.length === 1 && isElement(fence) && fence[0] === "pre") return textOf(fence);
    return fail(
      "comark/tests/missing-report",
      '`src` is required. Write `::tests{src="junit.xml"}`, or put the report in an ```xml fence inside the block.',
    );
  }
  if (content.length)
    fail(
      "comark/tests/content-dropped",
      "it drops what's inside it, since it reads `src`. Use one or the other.",
    );
  if (/^[a-z][a-z\d+.-]*:/i.test(src))
    return fail(
      "comark/tests/remote-src",
      "`src` must be a local file; a report can't be read from a URL.",
    );
  const path = resolvePath(src.startsWith("/") ? "" : run.base, src);
  const leaves = "the path leaves the root. Move the report under the root or widen `root`.";
  if (path === undefined) return fail("comark/tests/outside-root", leaves);
  try {
    const text = await run.read(path);
    if (text === undefined)
      return fail(
        "comark/tests/file-not-found",
        `file not found. It resolved to "${path}" under the root; check the path or \`base\`.`,
      );
    return text;
  } catch (error) {
    if (error instanceof OutsideRoot) return fail("comark/tests/outside-root", leaves);
    return fail(
      "comark/tests/read-failed",
      `reading "${path}" failed: ${errorText(error)}. Check the file or the \`read\` option.`,
    );
  }
}

async function block(node: ElementNode, number: number, data: Data, run: Run): Promise<Node> {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const src = text(attrs.src);
  const name = `\`::tests\` ${number}${src ? ` ("${src}")` : ""}`;
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      run.issues.push({
        rule: "comark/tests/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::tests\`, so it's ignored. Use \`src\` or \`title\`.`,
      });
  }
  const xml = await source(node, src, name, run);
  if (xml === undefined) return ["div", {}];
  let root: XmlElement;
  try {
    root = parseXml(xml);
  } catch (error) {
    run.issues.push({
      rule: "comark/tests/malformed-xml",
      message:
        error instanceof XmlError
          ? `${name}: its XML is malformed at line ${error.line}: ${error.message}. Fix the report, or run the tests again to rewrite it.`
          : `${name}: its XML couldn't be read: ${errorText(error)}.`,
    });
    return ["div", {}];
  }
  const result = report(root);
  if ("issue" in result) {
    run.issues.push({ rule: "comark/tests/not-junit", message: `${name}: ${result.issue}` });
    return ["div", {}];
  }
  const title = text(attrs.title);
  return ["tests", { ...result.attrs, ...(title && { title }) }, ...result.failures];
}

/**
 * Turns `::tests{src="junit.xml"}`, or a `::tests` around an ```xml fence, into a summary of a JUnit report: how many
 * tests passed, failed, and were skipped, how long they took, and each failure as a `<details>` with its message and
 * stack. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<TestsOptions | undefined, TestsMeta>((options = {}) => ({
  name: "comark-tests",
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
        rule: "comark/tests/outside-root",
        message: `tests: \`base\` "${options.base ?? ""}" leaves the root. Set it to the document's folder under \`root\`.`,
      });
    let count = 0;
    const walk = async (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] === "tests") {
          nodes[index] = await block(node, ++count, data, run);
          continue;
        }
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
