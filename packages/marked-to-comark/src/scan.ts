import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  parseSync,
  visitorKeys,
  type Node,
  type PropertyKey,
  type StringLiteral,
} from "oxc-parser";
import { glob } from "tinyglobby";
import { mapExtension, mapOption, mapOverride, type Mapping } from "./map.ts";
import { lineOffset, scriptBlocks } from "./sfc.ts";

/**
 * Where a marked setup lives: the module's shared `marked` (its `use` and `setOptions` reach every call in the
 * project), an instance from `new Marked()`, or a framework or component that owns marked's options.
 */
export type Host = "marked" | "instance" | "component" | "config";

export interface FoundPlugin {
  /** The extension's package, the option's name, or the override (`renderer`, `walkTokens`). */
  name: string;
  /** An option (`breaks`), an extension (`marked-highlight`), or an override of marked's own code (`renderer`). */
  type: "option" | "extension" | "override";
  line: number;
  /** Source text of the extension's options or the option's value, if any. */
  options?: string;
  /** The identifier the extension is written as in the file, when it is one. */
  local?: string;
  /** For a `renderer` or `tokenizer` override: the methods it replaces, when the scan can list them. */
  methods?: string[];
  mapping: Mapping & { known: boolean };
}

/** One call that renders Markdown: `marked(md)`, `marked.parse(md)`, `parseInline(md)`, `instance.parse(md)`. */
export interface Call {
  line: number;
  /** Offsets of the call expression, which the rewrite replaces. */
  start: number;
  end: number;
  /** `tokens` reads or renders marked's tokens (`lexer`, `parser`, `new Lexer()`), which Comark's tree replaces. */
  method: "parse" | "parseInline" | "tokens";
  /** Source text of the Markdown argument. */
  input?: string;
  /** Source text of options passed to this call alone. */
  options?: string;
  args: number;
}

export interface Setup {
  file: string;
  line: number;
  host: Host;
  plugins: FoundPlugin[];
  /** The calls that render with this setup. */
  calls: Call[];
  /** Options or extensions held in code the scan can't follow, so what the setup does can't be read. */
  unresolved?: string;
  /** How the module was loaded: `require()` is CommonJS, which the rewrite doesn't emit. */
  commonjs?: boolean;
  /** For an instance: the binding it's assigned to. */
  binding?: string;
}

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

export const keyName = (key: PropertyKey): string | undefined =>
  key.type === "Identifier"
    ? key.name
    : key.type === "Literal" && isString(key)
      ? key.value
      : undefined;

const MARKED = /^marked(?:\/lib\/marked(?:\.esm|\.cjs|\.umd)?(?:\.js)?)?$/;
// Keys of `marked.use({ … })` that hand marked the project's own code rather than settings.
const OVERRIDES = new Set(["renderer", "tokenizer", "walkTokens", "hooks", "extensions"]);

/** What a name bound to the marked package is: the module, the `marked` function, or one of its exports. */
type Binding = { kind: "module" } | { kind: "export"; name: string };

/** Finds every marked setup in one JavaScript or TypeScript file. */
export function scanSource(source: string, file: string): Setup[] {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return scanScript(source, file);
  // A Svelte module script's imports are in scope in the instance script, so every block sees them all.
  const shared = new Map<string, string>();
  for (const block of blocks)
    for (const [name, from] of importsOf(block.code, block.name)) shared.set(name, from);
  return blocks.flatMap((block) => {
    const offset = lineOffset(source, block);
    return scanScript(block.code, block.name, shared).map((setup) => ({
      ...setup,
      file,
      line: setup.line + offset,
      plugins: setup.plugins.map((plugin) => ({ ...plugin, line: plugin.line + offset })),
      calls: setup.calls.map((call) => ({ ...call, line: call.line + offset })),
    }));
  });
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

/** A script's AST; a `.js` file that only parses as JSX, as React projects write them, is read as JSX. */
export function parseScript(file: string, source: string) {
  const parsed = parseSync(file, source);
  if (parsed.errors.length && /\.[cm]?js$/.test(file)) {
    const jsx = parseSync(file, source, { lang: "jsx" });
    if (!jsx.errors.length) return jsx;
  }
  return parsed;
}

function scanScript(source: string, file: string, shared?: Map<string, string>): Setup[] {
  const { program } = parseScript(file, source);
  const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
  const text = (node: Node) => source.slice(node.start, node.end);
  // Every imported name and the module it's from, and the names bound to marked itself.
  const imports = new Map<string, string>(shared);
  const marked = new Map<string, Binding>();
  let commonjs = false;
  for (const [name, from] of shared ?? [])
    if (MARKED.test(from))
      marked.set(name, { kind: name === "marked" ? "module" : "export", name });

  // `require("marked")`, `require("marked").marked`, `(await import("marked")).marked`.
  const markedModule = (node: Node | null | undefined): Binding | undefined => {
    if (!node) return undefined;
    if (node.type === "ParenthesizedExpression" || node.type === "AwaitExpression")
      return markedModule(node.type === "AwaitExpression" ? node.argument : node.expression);
    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "require" &&
      node.arguments[0]?.type === "Literal" &&
      isString(node.arguments[0]) &&
      MARKED.test(node.arguments[0].value)
    ) {
      commonjs = true;
      return { kind: "module" };
    }
    if (
      node.type === "ImportExpression" &&
      node.source.type === "Literal" &&
      isString(node.source) &&
      MARKED.test(node.source.value)
    )
      return { kind: "module" };
    if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
      const inner = markedModule(node.object);
      if (inner?.kind === "module")
        return node.property.name === "marked" || node.property.name === "default"
          ? { kind: "module" }
          : { kind: "export", name: node.property.name };
    }
    return undefined;
  };

  walk(program, (node) => {
    if (node.type === "ImportDeclaration") {
      const from = node.source.value;
      for (const specifier of node.specifiers) {
        imports.set(specifier.local.name, from);
        if (!MARKED.test(from)) continue;
        if (specifier.type === "ImportSpecifier") {
          const imported =
            specifier.imported.type === "Identifier"
              ? specifier.imported.name
              : specifier.imported.value;
          marked.set(
            specifier.local.name,
            imported === "marked" || imported === "default"
              ? { kind: "module" }
              : { kind: "export", name: imported },
          );
        } else marked.set(specifier.local.name, { kind: "module" });
      }
    }
    if (node.type === "VariableDeclarator" && node.init) {
      const bound = markedModule(node.init);
      if (bound && node.id.type === "Identifier") marked.set(node.id.name, bound);
      // const { marked, Marked } = require("marked")
      if (bound?.kind === "module" && node.id.type === "ObjectPattern")
        for (const property of node.id.properties) {
          if (property.type !== "Property" || property.value.type !== "Identifier") continue;
          const name = keyName(property.key);
          if (name)
            marked.set(
              property.value.name,
              name === "marked" || name === "default"
                ? { kind: "module" }
                : { kind: "export", name },
            );
        }
      // const x = require("marked-highlight")
      const required = /^(?:require|\(?\s*await\s+import)\(\s*["'`]([^"'`]+)["'`]\s*\)/.exec(
        text(node.init),
      );
      if (required) {
        if (node.id.type === "Identifier") imports.set(node.id.name, required[1]!);
        else if (node.id.type === "ObjectPattern")
          for (const property of node.id.properties)
            if (property.type === "Property" && property.value.type === "Identifier")
              imports.set(property.value.name, required[1]!);
      }
    }
  });
  if (!marked.size && !/["'`]marked["'`]/.test(source)) return [];

  // The package an expression names: `x` imported from it, `x(...)`, `x.default`, require("x").
  const moduleOf = (node: Node): string | undefined => {
    switch (node.type) {
      case "Identifier":
        return imports.get(node.name);
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
        return moduleOf(node.expression);
      case "AwaitExpression":
        return moduleOf(node.argument);
      case "MemberExpression":
        return moduleOf(node.object);
      case "CallExpression": {
        const { callee } = node;
        const [argument] = node.arguments;
        if (
          callee.type === "Identifier" &&
          callee.name === "require" &&
          argument?.type === "Literal" &&
          isString(argument)
        )
          return argument.value;
        return moduleOf(callee);
      }
    }
    return undefined;
  };

  const plugin = (
    type: FoundPlugin["type"],
    name: string,
    node: Node,
    options?: Node,
    mapping = mapOption(name, options ? text(options) : undefined),
  ): FoundPlugin => {
    const found: FoundPlugin = { name, type, line: lineOf(node.start), mapping };
    if (options) found.options = text(options);
    return found;
  };

  // The methods a renderer or tokenizer override replaces: an object's keys, or `renderer.link = …` assignments to a name.
  const methodsOf = (value: Node): string[] | undefined => {
    if (value.type === "ObjectExpression")
      return value.properties.flatMap((property) =>
        property.type === "Property" && keyName(property.key) ? [keyName(property.key)!] : [],
      );
    if (value.type !== "Identifier") return undefined;
    const names = new Set<string>();
    walk(program, (node) => {
      if (
        node.type === "AssignmentExpression" &&
        node.left.type === "MemberExpression" &&
        !node.left.computed &&
        node.left.object.type === "Identifier" &&
        node.left.object.name === value.name &&
        node.left.property.type === "Identifier"
      )
        names.add(node.left.property.name);
      if (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        node.id.name === value.name &&
        node.init?.type === "ObjectExpression"
      )
        for (const property of node.init.properties)
          if (property.type === "Property" && keyName(property.key))
            names.add(keyName(property.key)!);
    });
    return names.size ? [...names] : undefined;
  };

  // The settings of an options object: each key an option, or an override of marked's own code.
  const settings = (object: Node, into: Setup) => {
    if (object.type !== "ObjectExpression") {
      into.unresolved ??= `${file}:${lineOf(object.start)} passes marked options held in \`${text(object).slice(0, 40)}\`, which the scan can't read; write them as an object literal.`;
      into.plugins.push(
        plugin(
          "option",
          text(object).replace(/\s+/g, " ").slice(0, 40),
          object,
          undefined,
          mapOverride("options"),
        ),
      );
      return;
    }
    for (const property of object.properties) {
      if (property.type !== "Property" || property.computed) {
        into.unresolved ??= `${file}:${lineOf(property.start)} spreads or computes marked options, which the scan can't read.`;
        into.plugins.push(
          plugin(
            "option",
            text(property).slice(0, 40),
            property,
            undefined,
            mapOverride("options"),
          ),
        );
        continue;
      }
      const name = keyName(property.key);
      if (!name) continue;
      if (OVERRIDES.has(name)) {
        const methods =
          name === "renderer" || name === "tokenizer" ? methodsOf(property.value) : undefined;
        const found = plugin(
          "override",
          name,
          property,
          property.value,
          mapOverride(name, methods),
        );
        if (methods?.length) found.methods = methods;
        into.plugins.push(found);
      } else into.plugins.push(plugin("option", name, property, property.value));
    }
  };

  // One argument of `use()` or `new Marked()`: an extension package's factory call, an imported extension, or an
  // object of options and overrides.
  const extension = (node: Node, into: Setup) => {
    if (node.type === "ObjectExpression") return settings(node, into);
    if (node.type === "SpreadElement") {
      into.unresolved ??= `${file}:${lineOf(node.start)} spreads a list of extensions, which the scan can't read.`;
      into.plugins.push(
        plugin(
          "extension",
          text(node).slice(0, 40),
          node,
          undefined,
          mapExtension(text(node), false),
        ),
      );
      return;
    }
    const from = moduleOf(node);
    const options = node.type === "CallExpression" ? node.arguments[0] : undefined;
    if (from) {
      const found = plugin("extension", from, node, options, mapExtension(from));
      const callee = node.type === "CallExpression" ? node.callee : node;
      if (callee.type === "Identifier") found.local = callee.name;
      into.plugins.push(found);
      return;
    }
    const label = /Function|Arrow/.test(node.type)
      ? "an inline extension"
      : text(node).replace(/\s+/g, " ").slice(0, 40);
    into.plugins.push(plugin("extension", label, node, options, mapExtension(label, false)));
  };

  const global: Setup = { file, line: 0, host: "marked", plugins: [], calls: [], commonjs };
  const instances = new Map<string, Setup>();
  const anonymous: Setup[] = [];

  // What a callee or object is: the shared marked, a named export, or an instance.
  const target = (node: Node): { setup: Setup; method?: string } | undefined => {
    if (node.type === "ParenthesizedExpression") return target(node.expression);
    if (node.type === "Identifier") {
      const binding = marked.get(node.name);
      if (binding?.kind === "module") return { setup: global };
      if (binding?.kind === "export") return { setup: global, method: binding.name };
      const instance = instances.get(node.name);
      if (instance) return { setup: instance };
      return undefined;
    }
    const bound = markedModule(node);
    if (bound) return { setup: global, method: bound.kind === "export" ? bound.name : undefined };
    if (node.type === "NewExpression") {
      // `new Lexer(options).lex(md)` and `new Parser().parse(tokens)` work on tokens.
      const callee = node.callee;
      const made = callee.type === "Identifier" ? marked.get(callee.name) : markedModule(callee);
      if (made?.kind === "export" && /^(Lexer|Parser)$/.test(made.name))
        return { setup: global, method: made.name };
      return newInstance(node) ? { setup: newInstance(node)! } : undefined;
    }
    // `this.md = new Marked()`, then `this.md.parse(text)`.
    if (node.type === "MemberExpression") {
      const instance = instances.get(text(node));
      if (instance) return { setup: instance };
    }
    return undefined;
  };

  const created = new Map<Node, Setup>();
  const newInstance = (node: Extract<Node, { type: "NewExpression" }>): Setup | undefined => {
    if (created.has(node)) return created.get(node);
    const callee = node.callee;
    const name = callee.type === "Identifier" ? marked.get(callee.name) : markedModule(callee);
    if (!name || name.kind !== "export" || name.name !== "Marked") return undefined;
    const setup: Setup = {
      file,
      line: lineOf(node.start),
      host: "instance",
      plugins: [],
      calls: [],
      commonjs,
    };
    for (const argument of node.arguments) extension(argument, setup);
    created.set(node, setup);
    anonymous.push(setup);
    return setup;
  };

  // Instances bound to a name or a member, so later `x.parse()` and `x.use()` reach them.
  walk(program, (node) => {
    if (
      node.type === "AssignmentExpression" &&
      node.left.type === "MemberExpression" &&
      node.right.type === "NewExpression"
    ) {
      const setup = newInstance(node.right);
      if (setup) {
        setup.binding = text(node.left);
        instances.set(text(node.left), setup);
      }
    }
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "Identifier" &&
      node.init?.type === "NewExpression"
    ) {
      const setup = newInstance(node.init);
      if (setup) {
        setup.binding = node.id.name;
        instances.set(node.id.name, setup);
      }
    }
  });

  walk(program, (node) => {
    if (node.type === "NewExpression") newInstance(node);
    if (node.type !== "CallExpression") return;
    const { callee } = node;
    let found: { setup: Setup; method?: string } | undefined;
    if (
      callee.type === "MemberExpression" &&
      !callee.computed &&
      callee.property.type === "Identifier"
    ) {
      const owner = target(callee.object);
      if (owner && !owner.method) found = { setup: owner.setup, method: callee.property.name };
      // `Lexer.lex(md)`, `new Lexer().lex(md)`, `new Parser().parse(tokens)`.
      else if (owner && /^(Lexer|Parser)$/.test(owner.method ?? ""))
        found = { setup: owner.setup, method: "tokens" };
    } else found = target(callee);
    if (!found) return;
    // `marked(md)` and `marked.marked(md)` are parse.
    const method = found.method ?? "parse";
    const { setup } = found;
    if (setup.line === 0) setup.line = lineOf(node.start);
    if (method === "use") for (const argument of node.arguments) extension(argument, setup);
    else if (method === "setOptions" || method === "options") {
      if (node.arguments[0]) settings(node.arguments[0], setup);
    } else if (method === "walkTokens") {
      setup.plugins.push(
        plugin("override", "walkTokens", node, undefined, mapOverride("walkTokens")),
      );
    } else if (/^(lexer|parser|lexInline|tokens)$/.test(method)) {
      const [input] = node.arguments;
      const call: Call = {
        line: lineOf(node.start),
        start: node.start,
        end: node.end,
        method: "tokens",
        args: node.arguments.length,
      };
      if (input) call.input = text(input);
      setup.calls.push(call);
    } else if (method === "parse" || method === "parseInline" || method === "marked") {
      const [input, options] = node.arguments;
      const call: Call = {
        line: lineOf(node.start),
        start: node.start,
        end: node.end,
        method: method === "parseInline" ? "parseInline" : "parse",
        args: node.arguments.length,
      };
      if (input) call.input = text(input);
      if (options) {
        call.options = text(options);
        // An options object on one call applies to that call alone; it's listed with the setup all the same.
        settings(options, setup);
      }
      setup.calls.push(call);
    }
  });

  return [global, ...anonymous]
    .filter((setup) => setup.calls.length || setup.plugins.length)
    .map((setup) => ({ ...setup, plugins: dedupe(setup.plugins) }));
}

// An option set twice (`setOptions` then `parse(md, { … })`) is listed once per place it's written.
const dedupe = (plugins: FoundPlugin[]) =>
  plugins.filter(
    (plugin, index) =>
      plugins.findIndex(
        (other) =>
          other.name === plugin.name &&
          other.line === plugin.line &&
          other.options === plugin.options,
      ) === index,
  );

/** Scans a project's JavaScript and TypeScript for marked setups. */
export async function scan(root: string): Promise<Setup[]> {
  const files = await glob(["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte,astro}"], {
    cwd: root,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/*.d.ts",
      "**/*.min.js",
      "**/test/**",
      "**/__tests__/**",
    ],
  });
  const setups: Setup[] = [];
  for (const path of files.sort()) {
    const source = readFileSync(join(root, path), "utf8");
    if (!/marked/.test(source)) continue;
    try {
      setups.push(...scanSource(source, relative(root, join(root, path))));
    } catch {
      // A file oxc can't parse is reported by the project's own build; scanning goes on.
    }
  }
  return setups;
}
