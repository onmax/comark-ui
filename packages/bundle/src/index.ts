import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { resolveAttributes } from "comark/render";
import { card } from "./draw.ts";
import { loads } from "./model.ts";
import {
  fromFolder,
  Unreadable,
  type Build,
  type BundleLister,
  type BundleReader,
} from "./read.ts";
import { errorText, text } from "../../../shared/text.ts";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import { OutsideRoot, diskReader, isMissing, resolvePath } from "../../../shared/disk.ts";

export type { BundleLister, BundleReader } from "./read.ts";

export interface BundleOptions {
  /** The folder a path can't leave, and where a path that starts with `/` starts. Default `"."`, the working directory. */
  root?: string;
  /** The document's folder relative to `root`, where relative paths start. Default `""`, the root itself. */
  base?: string;
  /**
   * Reads a file under `root`. Default reads from disk and refuses symlinks that lead out of `root`, so browsers and
   * edge runtimes pass their own, as with comark-include.
   */
  read?: BundleReader;
  /**
   * Lists a build folder's files under `root`, so the block can measure them. Default lists from disk. Measuring
   * also needs Node's zlib, so a runtime without them gets an issue instead of a report.
   */
  list?: BundleLister;
}

export type BundleMeta = {
  /** One readable sentence per problem with a `::bundle` block. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

/**
 * What a `::bundle` becomes. `label` names the figure for screen readers. Its children are plain elements: the
 * title, the two numbers, a bar per build, the packages behind a `<details>`, and a footer that says how it measured.
 */
export type BundleAttributes = { label?: string };

type Rule = `comark/bundle/${string}`;
type Issue = { rule: Rule; message: string };
type Data = Parameters<typeof resolveAttributes>[1];

const PROPS = ["before", "after", "src", "title"];

interface Run {
  read: BundleReader;
  list: BundleLister;
  base: string;
  issues: Issue[];
}

const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");

function diskLister(root: string): BundleLister {
  const folder = (root || ".").replace(/[/\\]+$/, "");
  return async (path) => {
    const { readdir, realpath } = await import("node:fs/promises");
    const paths = await import("node:path");
    try {
      const [base, target] = await Promise.all([realpath(folder), realpath(`${folder}/${path}`)]);
      const inside = paths.relative(base, target);
      if (inside === ".." || inside.startsWith(`..${paths.sep}`) || paths.isAbsolute(inside))
        throw new OutsideRoot();
      const entries = await readdir(target, { recursive: true, withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
          paths
            .relative(target, paths.join(entry.parentPath, entry.name))
            .split(paths.sep)
            .join("/"),
        );
    } catch (error) {
      if (
        isMissing(error) ||
        (error instanceof Error && "code" in error && error.code === "ENOTDIR")
      )
        return undefined;
      throw error;
    }
  };
}

async function load(src: string, name: string, run: Run): Promise<Build | undefined> {
  const fail = (rule: Rule, issue: string) =>
    void run.issues.push({ rule, message: `${name}: ${issue}` });
  if (/^[a-z][a-z\d+.-]*:/i.test(src))
    return fail(
      "comark/bundle/remote-src",
      `"${src}" is a URL. Point it at a build folder on disk.`,
    );
  const path = resolvePath(src.startsWith("/") ? "" : run.base, src);
  const leaves = `"${src}" leaves the root. Move the build under the root or widen \`root\`.`;
  if (path === undefined) return fail("comark/bundle/outside-root", leaves);
  try {
    const build = await fromFolder(path, run.read, run.list);
    if (build) return build;
    return fail(
      "comark/bundle/not-found",
      `"${src}" doesn't exist. It resolved to "${path}" under the root; check the path or \`base\`.`,
    );
  } catch (error) {
    if (error instanceof OutsideRoot) return fail("comark/bundle/outside-root", leaves);
    if (error instanceof Unreadable)
      return fail("comark/bundle/unreadable", `"${src}" can't be read: ${error.message}.`);
    return fail(
      "comark/bundle/unreadable",
      `reading "${src}" failed: ${errorText(error)}. Check the files or the \`read\` option.`,
    );
  }
}

async function block(node: ElementNode, number: number, data: Data, run: Run): Promise<Node> {
  const attrs = resolveAttributes(node[1], data, { parseJson: true });
  const [before, after, src, title] = PROPS.map((prop) => text(attrs[prop]).trim());
  const name = `\`::bundle\` ${number}`;
  const issue = (rule: Rule, message: string) =>
    run.issues.push({ rule, message: `${name}: ${message}` });
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (!PROPS.includes(prop) && prop !== "id" && prop !== "class")
      issue(
        "comark/bundle/unknown-prop",
        `\`${prop}\` isn't a prop of \`::bundle\`, so it's ignored. Use \`before\` and \`after\`, or \`src\`, and \`title\`.`,
      );
  }
  if (childrenOf(node).some(isContent))
    issue(
      "comark/bundle/content-dropped",
      "it drops what's inside it, since it reads the builds from its props. Write the text outside the block.",
    );
  const empty: ElementNode = ["div", {}];
  if (!before && !after && !src) {
    issue(
      "comark/bundle/missing-build",
      'it has no build to read. Write `::bundle{before=".bundle/main" after="dist"}`, or `::bundle{src="dist"}` for one build.',
    );
    return empty;
  }
  if (src && (before || after)) {
    issue(
      "comark/bundle/mixed-props",
      "it has `src` and `before` or `after`. Use `before` and `after` to compare two builds, or `src` alone for one.",
    );
    return empty;
  }
  if (!src && (!before || !after)) {
    issue(
      "comark/bundle/missing-side",
      `it has \`${before ? "before" : "after"}\` but no \`${before ? "after" : "before"}\`. Give both builds, or use \`src\` for one.`,
    );
    return empty;
  }
  const builds = await Promise.all(
    (src ? [src] : [before!, after!]).map((path) => load(path, name, run)),
  );
  const [first, second] = builds;
  if (!first || (!src && !second)) return empty;
  const a = loads(first);
  const b = second ? loads(second) : undefined;
  const packages = first.packages && (!second || second.packages);
  const unmapped = Math.max(first.unmapped, second?.unmapped ?? 0);
  const tool = `gzip -9 · brotli 11${packages && unmapped ? ` · ${unmapped} ${unmapped === 1 ? "chunk" : "chunks"} without a sourcemap` : ""}`;
  const label = title || "Bundle size";
  return [
    "bundle",
    { label },
    ["div", { class: "cbr-head" }, ["span", { class: "cbr-title" }, label]],
    ...card(b ? a : undefined, b ?? a, packages, tool),
  ];
}

/**
 * Turns `::bundle{before after}` into what changed between two build folders: what every page loads and what loads
 * later, before and after, a bar per build with the packages that changed marked, and a treemap of the new build
 * behind a `<details>`. `::bundle{src}` shows one build. Chunks are measured with gzip -9 and brotli 11. Problems are
 * added to `meta.issues`.
 */
export default defineComarkPlugin<BundleOptions | undefined, BundleMeta>((options = {}) => ({
  name: "comark-bundle",
  async post(state) {
    const { tree } = state;
    const data: Data = { frontmatter: tree.frontmatter, meta: tree.meta, data: {}, props: {} };
    const run: Run = {
      read: options.read ?? diskReader(options.root ?? "."),
      list: options.list ?? diskLister(options.root ?? "."),
      base: resolvePath("", options.base ?? "") ?? "",
      issues: [],
    };
    let count = 0;
    const walk = async (nodes: Node[], start: number) => {
      for (let index = start; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node || !isElement(node)) continue;
        if (node[0] === "bundle") {
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
