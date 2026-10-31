import { lineOffset, scriptBlocks } from "./sfc.ts";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  parseSync,
  visitorKeys,
  type MemberExpression,
  type Node,
  type PropertyKey,
  type StringLiteral,
} from "oxc-parser";
import { glob } from "tinyglobby";
import { mapPlugin, type Mapping } from "./map.ts";

/** Where a remark setup lives: a unified chain the project owns, or a framework's plugin lists. */
export type Host =
  | "unified"
  | "astro"
  | "next"
  | "contentlayer"
  | "docusaurus"
  | "gatsby"
  | "velite"
  | "nuxt"
  | "react-markdown"
  | "component"
  | "config";

export interface FoundPlugin {
  /** The package the plugin comes from, or the local name when it isn't imported. */
  name: string;
  line: number;
  /** Source text of the options, if any. */
  options?: string;
  /** The identifier the plugin is written as in the file (`gfm` in `.use(gfm)`), when it is one. */
  local?: string;
  mapping: Mapping & { known: boolean };
}

export interface Setup {
  file: string;
  line: number;
  host: Host;
  plugins: FoundPlugin[];
  /** A plugin list whose runtime contents couldn't be enumerated, so it can't define a content parser. */
  unresolved?: string;
  /** For unified chains: the whole expression and its offsets, which the rewrite replaces. */
  chain?: {
    start: number;
    end: number;
    root: string;
    rootLocal?: string;
    method?: string;
    input?: string;
    inputType?: string;
    inputStart?: number;
    args?: number;
    calls?: string[];
  };
}

const PLUGIN_LISTS = new Set([
  "remarkPlugins",
  "rehypePlugins",
  "beforeDefaultRemarkPlugins",
  "beforeDefaultRehypePlugins",
]);
const PLUGIN_PACKAGE = /^(?:remark|rehype|@[\w.-]+\/(?:remark|rehype)|gatsby-remark)(?:-|$|\/)/;
const PROCESSOR_ROOTS = new Set(["unified", "remark", "rehype"]);

const NODE_TYPES = new Set<unknown>(Object.keys(visitorKeys));
const isNode = (value: unknown): value is Node =>
  value instanceof Object && "type" in value && NODE_TYPES.has(value.type);

export function walk(node: unknown, visit: (node: Node, parent?: Node) => void, parent?: Node) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, parent);
    return;
  }
  if (!isNode(node)) return;
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key !== "type") walk(value, visit, node);
  }
}

// A string literal is the only one written in quotes.
const isString = (node: Extract<Node, { type: "Literal" }>): node is StringLiteral =>
  /^["']/.test(node.raw ?? "");

// `resolve` and `"resolve"` both name a property.
export const keyName = (key: PropertyKey): string | undefined =>
  key.type === "Identifier"
    ? key.name
    : key.type === "Literal" && isString(key)
      ? key.value
      : undefined;

// The name a member call's method is written as: `use` in `x.use()`, `x[use]()`, or `x.#use()`.
const propertyName = (property: Node): string | undefined =>
  property.type === "Identifier" || property.type === "PrivateIdentifier"
    ? property.name
    : undefined;

function hostOf(file: string): Host {
  if (/astro\.config\./.test(file)) return "astro";
  if (/next\.config\./.test(file)) return "next";
  if (/contentlayer\.config\./.test(file)) return "contentlayer";
  if (/docusaurus\.config\./.test(file)) return "docusaurus";
  if (/gatsby-config\./.test(file)) return "gatsby";
  if (/velite\.config\./.test(file)) return "velite";
  if (/nuxt\.config\./.test(file)) return "nuxt";
  return "config";
}

/** Finds every remark setup in one JavaScript or TypeScript file. */
export function scanSource(source: string, file: string): Setup[] {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return scanScript(source, file);
  // A Svelte module script's imports are in scope in the instance script, so every block sees them all.
  const shared = new Map<string, string>();
  for (const block of blocks)
    for (const [name, from] of importsOf(block.code, block.name)) shared.set(name, from);
  const inScripts = blocks.flatMap((block) => {
    const offset = lineOffset(source, block);
    // Offsets stay relative to the block: only rewriteSource reads them, and it rewrites block by block.
    return scanScript(block.code, block.name, shared).map((setup) => ({
      ...setup,
      file,
      line: setup.line + offset,
      plugins: setup.plugins.map((plugin) => ({ ...plugin, line: plugin.line + offset })),
    }));
  });
  return [...inScripts, ...scanMarkup(source, file, blocks, shared)];
}

/**
 * Plugin lists passed in a component's markup: `remarkPlugins={[math]}` in Svelte and Astro, `:remark-plugins="[math]"`
 * in Vue. Each expression is scanned with the scripts' imports in scope, so `math` resolves to remark-math.
 */
function scanMarkup(
  source: string,
  file: string,
  blocks: { start: number; code: string }[],
  shared: Map<string, string>,
): Setup[] {
  let markup = source;
  for (const block of [...blocks].sort((a, b) => b.start - a.start))
    markup =
      markup.slice(0, block.start) +
      " ".repeat(block.code.length) +
      markup.slice(block.start + block.code.length);
  const setups: Setup[] = [];
  const pattern =
    /(?:\b(remarkPlugins|rehypePlugins)=\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|:(remark-plugins|rehype-plugins|remarkPlugins|rehypePlugins)="([^"]*)")/g;
  for (const match of markup.matchAll(pattern)) {
    const expression = match[2] ?? match[4] ?? "";
    const line = source.slice(0, match.index).split("\n").length;
    try {
      for (const setup of scanScript(
        `const props = { remarkPlugins: ${expression} };`,
        `${file}.ts`,
        shared,
      ))
        setups.push({
          ...setup,
          file,
          line,
          host: "component",
          plugins: setup.plugins.map((plugin) => ({ ...plugin, line })),
        });
    } catch {
      // An expression oxc can't read stays unscanned, like a script it can't parse.
    }
  }
  return setups;
}

/** The module each imported name comes from, in one script. */
export function importsOf(source: string, file: string): Map<string, string> {
  const imports = new Map<string, string>();
  try {
    for (const node of parseSync(file, source).program.body) {
      if (node.type !== "ImportDeclaration") continue;
      for (const specifier of node.specifiers) imports.set(specifier.local.name, node.source.value);
    }
  } catch {}
  return imports;
}

function scanScript(source: string, file: string, shared?: Map<string, string>): Setup[] {
  const { program } = parseSync(file, source);
  const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
  const text = (node: Node) => source.slice(node.start, node.end);
  const imports = new Map<string, string>(shared);
  walk(program, (node) => {
    if (node.type === "ImportDeclaration") {
      const from = node.source.value;
      for (const specifier of node.specifiers) imports.set(specifier.local.name, from);
    }
    // const x = require("y"), and const x = (await import("y")).default
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init) {
      const match = /^(?:require|\(?\s*await\s+import)\(\s*["'`]([^"'`]+)["'`]\s*\)/.exec(
        text(node.init),
      );
      if (match) imports.set(node.id.name, match[1]!);
    }
  });

  // The package an expression names: `x` imported from it, "x", `x`, require("x"), (await import("x")).default.
  const moduleOf = (node: Node): string | undefined => {
    switch (node.type) {
      case "Identifier":
        return imports.get(node.name) ?? node.name;
      case "Literal":
        return isString(node) ? node.value : undefined;
      case "TemplateLiteral":
        return node.expressions.length ? undefined : (node.quasis[0]?.value.cooked ?? undefined);
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
        return moduleOf(node.expression);
      case "AwaitExpression":
        return moduleOf(node.argument);
      case "ImportExpression":
        return moduleOf(node.source);
      case "MemberExpression":
        return moduleOf(node.object);
      case "CallExpression": {
        const { callee } = node;
        const [argument] = node.arguments;
        if (callee.type === "Identifier" && callee.name === "require" && argument)
          return moduleOf(argument);
        return moduleOf(callee);
      }
    }
    return undefined;
  };

  // A plugin defined in the file itself: `myPlugin`, or `makePlugin(...)` where neither is imported.
  const isLocal = (node: Node): boolean => {
    if (node.type === "Identifier") return !imports.has(node.name);
    if (node.type === "MemberExpression") return isLocal(node.object);
    if (node.type !== "CallExpression") return false;
    const { callee } = node;
    return callee.type === "Identifier" && callee.name !== "require" && !imports.has(callee.name);
  };

  const found = (expression: Node, options?: Node): FoundPlugin | undefined => {
    const name = moduleOf(expression);
    // An expression the scan can't follow (a ternary, a call result) is reported as the project's own, so a rewrite
    // never drops it silently.
    if (!name) {
      const label = /Function|Arrow/.test(expression.type)
        ? "an inline plugin function"
        : expression.type === "ObjectExpression"
          ? "a settings object"
          : text(expression).replace(/\s+/g, " ").slice(0, 60);
      return { name: label, line: lineOf(expression.start), mapping: mapPlugin(label, false) };
    }
    // plugin(options) called in place carries its options as the first argument.
    if (!options && expression.type === "CallExpression") {
      const { callee } = expression;
      if (!(callee.type === "Identifier" && callee.name === "require"))
        options = expression.arguments[0];
    }
    const callee = expression.type === "CallExpression" ? expression.callee : expression;
    const plugin: FoundPlugin = {
      name,
      line: lineOf(expression.start),
      mapping: mapPlugin(name, !isLocal(expression)),
    };
    if (options) plugin.options = text(options);
    if (callee.type === "Identifier") plugin.local = callee.name;
    return plugin;
  };

  // Arrays bound to a const in this file, so `remarkPlugins: shared` and `[...shared, x]` can be followed.
  const arrays = new Map<string, Node>();
  walk(program, (node) => {
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "Identifier" &&
      node.init?.type === "ArrayExpression"
    ) {
      arrays.set(node.id.name, node.init);
    }
  });
  const list = (node: Node, seen = new Set<string>()): FoundPlugin[] => {
    if (node.type === "Identifier" && arrays.has(node.name) && !seen.has(node.name)) {
      return list(arrays.get(node.name)!, new Set([...seen, node.name]));
    }
    if (node.type !== "ArrayExpression") return [found(node)!];
    return node.elements.flatMap((item) => {
      if (!item) return [];
      if (item.type === "SpreadElement") return list(item.argument, seen);
      const plugin = element(item);
      return plugin ? [plugin] : [];
    });
  };

  // What a plugin-list property can hold: an array, or a name for one. Calls and member chains are left out, so a
  // config schema (`remarkPlugins: z.array(…)`) or a destructuring default (`{ remarkPlugins = [] }`) isn't read as plugins.
  const isList = (node: Node): boolean =>
    node.type === "ArrayExpression" || node.type === "Identifier";

  const completeList = (node: Node, seen = new Set<string>()): boolean => {
    if (node.type === "Identifier") {
      const array = arrays.get(node.name);
      return !!array && !seen.has(node.name) && completeList(array, new Set([...seen, node.name]));
    }
    return (
      node.type === "ArrayExpression" &&
      node.elements.every(
        (item) => !item || item.type !== "SpreadElement" || completeList(item.argument, seen),
      )
    );
  };

  // One plugin-list element: `plugin`, `[plugin, options]`, `"gatsby-remark-x"`, or `{ resolve, options }`.
  const element = (node: Node): FoundPlugin | undefined => {
    if (node.type === "ArrayExpression") {
      const [plugin, options] = node.elements;
      return plugin ? found(plugin, options ?? undefined) : undefined;
    }
    if (node.type === "ObjectExpression") {
      const properties = node.properties.filter((property) => property.type === "Property");
      const resolve = properties.find((property) => keyName(property.key) === "resolve");
      const options = properties.find(
        (property) => property.key.type === "Identifier" && property.key.name === "options",
      );
      if (resolve) return found(resolve.value, options?.value);
      // A unified preset (`{ plugins, settings }`): what it does can't be read here, so it blocks a rewrite.
      return {
        name: "a preset object",
        line: lineOf(node.start),
        mapping: mapPlugin("a preset object", false),
      };
    }
    return found(node);
  };

  const setups: Setup[] = [];
  const gatsbyLists = new Set<Node>();
  const chained = new WeakSet<Node>();
  const host = hostOf(file);
  walk(program, (node, parent) => {
    // processor.use(a).use(b, options)...process(input)
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
      const method = propertyName(node.callee.property);
      if (
        method !== "use" &&
        method !== "process" &&
        method !== "processSync" &&
        method !== "run" &&
        method !== "parse"
      )
        return;
      // Only the outermost call of a chain starts a setup.
      if (chained.has(node)) return;
      const plugins: FoundPlugin[] = [];
      let current: Node = node;
      let root: string | undefined;
      let tail: {
        method?: string;
        input?: string;
        inputType?: string;
        inputStart?: number;
        args?: number;
      } = {};
      const calls: string[] = [];
      while (current.type === "CallExpression" && current.callee.type === "MemberExpression") {
        chained.add(current);
        const callee: MemberExpression = current.callee;
        const name = propertyName(callee.property);
        const args = current.arguments;
        const [input] = args;
        if (name === "use" && input) {
          // `.use([a, [b, options]])` is a list of plugins, each a plugin or a `[plugin, options]` tuple.
          const isArray =
            input.type === "ArrayExpression" ||
            (input.type === "Identifier" && arrays.has(input.name));
          plugins.unshift(...(isArray ? list(input) : [found(input, args[1])!]));
        } else if (name && current === node) {
          tail = { method: name, args: args.length };
          if (input) {
            tail.input = text(input);
            tail.inputType = input.type;
            tail.inputStart = input.start;
          }
        } else if (name) {
          // `.data(…)`, `.freeze()`: calls between `use`s that change what the chain does.
          calls.unshift(name);
        }
        current = callee.object;
      }
      let rootLocal: string | undefined;
      if (current.type === "CallExpression" && current.callee.type === "Identifier") {
        rootLocal = current.callee.name;
        root = imports.get(rootLocal) ?? rootLocal;
      } else if (current.type === "Identifier") {
        rootLocal = current.name;
        root = imports.get(rootLocal);
      }
      const rooted = root !== undefined && (PROCESSOR_ROOTS.has(root) || PLUGIN_PACKAGE.test(root));
      if (!rooted || !plugins.length) return;
      if (root && root !== "unified")
        plugins.unshift({ name: root, line: lineOf(current.start), mapping: mapPlugin(root) });
      setups.push({
        file,
        line: lineOf(node.start),
        host: "unified",
        plugins,
        chain: { start: node.start, end: node.end, root: root!, rootLocal, calls, ...tail },
      });
      return;
    }
    // gatsby-transformer-remark's options.plugins
    if (node.type === "ObjectExpression") {
      const properties = node.properties.filter((item) => item.type === "Property");
      const property = (name: string) => properties.find((item) => keyName(item.key) === name);
      const resolve = property("resolve");
      if (!resolve || moduleOf(resolve.value) !== "gatsby-transformer-remark") return;
      const options = property("options")?.value;
      const inner =
        options?.type === "ObjectExpression"
          ? options.properties.find(
              (item) =>
                item.type === "Property" &&
                item.key.type === "Identifier" &&
                item.key.name === "plugins",
            )
          : undefined;
      if (inner?.type === "Property") {
        gatsbyLists.add(inner.value);
        const plugins = list(inner.value);
        if (plugins.length)
          setups.push({ file, line: lineOf(inner.start), host: "gatsby", plugins });
      }
      return;
    }
    // remarkPlugins: [...], remarkPlugins: shared
    if (node.type === "Property") {
      const key = keyName(node.key);
      const { value } = node;
      if (
        !key ||
        !PLUGIN_LISTS.has(key) ||
        gatsbyLists.has(value) ||
        node.shorthand ||
        parent?.type === "ObjectPattern"
      )
        return;
      // Nuxt Content: `remarkPlugins: { "remark-gfm": {}, "remark-emoji": { options } }`.
      if (value.type === "ObjectExpression") {
        const plugins = value.properties.flatMap((item) =>
          item.type === "Property" && item.key.type === "Literal" && isString(item.key)
            ? [found(item.key, item.value.type === "ObjectExpression" ? item.value : undefined)!]
            : [],
        );
        if (plugins.length || host !== "config")
          setups.push({ file, line: lineOf(node.start), host, plugins });
        return;
      }
      if (!isList(value)) return;
      const plugins = list(value);
      if (plugins.length || host !== "config")
        setups.push({ file, line: lineOf(node.start), host, plugins });
      return;
    }
    // Keep each element's remark and rehype props together. ReactMarkdown renders even with empty or absent lists.
    if (node.type === "JSXOpeningElement") {
      const owner =
        node.name.type === "JSXIdentifier" && imports.get(node.name.name) === "react-markdown"
          ? "react-markdown"
          : "component";
      let unresolved: string | undefined;
      const unresolvedList = `${file}:${lineOf(node.start)} has a plugin list that can't be statically enumerated. Write its plugins as an explicit array before migrating this site's content.`;
      const plugins = node.attributes.flatMap((attribute) => {
        if (attribute.type === "JSXSpreadAttribute") {
          if (owner === "react-markdown") unresolved = unresolvedList;
          return [];
        }
        if (
          attribute.type !== "JSXAttribute" ||
          attribute.name.type !== "JSXIdentifier" ||
          !PLUGIN_LISTS.has(attribute.name.name)
        )
          return [];
        if (attribute.value?.type !== "JSXExpressionContainer") {
          unresolved = unresolvedList;
          return [];
        }
        const value = attribute.value.expression;
        if (!completeList(value)) unresolved = unresolvedList;
        return isList(value) ? list(value) : [];
      });
      if (plugins.length || unresolved || owner === "react-markdown")
        setups.push({ file, line: lineOf(node.start), host: owner, plugins, unresolved });
    }
  });
  return setups;
}

/** Scans a project's JavaScript and TypeScript for remark setups. */
export async function scan(root: string): Promise<Setup[]> {
  const files = await glob(["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte,astro}"], {
    cwd: root,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/*.d.ts",
      "**/test/**",
      "**/__tests__/**",
    ],
  });
  const setups: Setup[] = [];
  for (const path of files.sort()) {
    const source = readFileSync(join(root, path), "utf8");
    if (!/remark|rehype|unified|react-markdown/.test(source)) continue;
    try {
      setups.push(...scanSource(source, relative(root, join(root, path))));
    } catch {
      // A file oxc can't parse is reported by the project's own build; scanning goes on.
    }
  }
  return setups;
}
