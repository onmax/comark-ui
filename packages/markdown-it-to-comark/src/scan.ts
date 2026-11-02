import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseSync,
  visitorKeys,
  type Node,
  type PropertyKey,
  type StringLiteral,
} from "oxc-parser";
import { glob } from "tinyglobby";
import { mapPlugin, type Mapping } from "./map.ts";
import { lineOffset, scriptBlocks } from "./sfc.ts";

/**
 * Who owns a markdown-it setup: code the project owns (`markdown-it`), a framework that hands the project its instance
 * (VitePress, VuePress, Slidev and other Vite Markdown plugins, Eleventy, VS Code), or a function of the project's
 * that configures an instance someone else passes in.
 */
export type Host =
  | "markdown-it"
  | "vitepress"
  | "vuepress"
  | "slidev"
  | "vite"
  | "eleventy"
  | "vscode"
  | "function";

export interface FoundPlugin {
  /** The package the plugin comes from, or the local name when it isn't imported. */
  name: string;
  line: number;
  /** Source text of the options after the plugin, if any, comma-separated as written. */
  options?: string;
  /** The identifier the plugin is written as (`footnote` in `.use(footnote)`), when it is one. */
  local?: string;
  mapping: Mapping & { known: boolean };
}

export interface Render {
  method: "render" | "renderInline" | "parse" | "parseInline";
  line: number;
  /** The call expression, which a rewrite replaces. */
  start: number;
  end: number;
  input?: string;
  /** Source text of the arguments after the input (`env`). */
  extra?: number;
}

export interface Setup {
  file: string;
  line: number;
  host: Host;
  /** `"commonmark"` or `"zero"` when the setup starts from a preset. */
  preset?: string;
  /** Each option as source text, from the constructor and `.set()` calls. */
  options: Record<string, string>;
  plugins: FoundPlugin[];
  /** `enable` and `disable` calls, with their arguments as source text. */
  rules: { method: "enable" | "disable"; args: string; line: number }[];
  /** Changes made to the instance by hand: renderer rules, ruler pushes, `validateLink`. */
  customized: { what: string; line: number }[];
  /** Calls that render with this instance. */
  renders: Render[];
  /** Why part of the setup can't be read (options in a variable, an instance passed on). */
  unresolved?: string;
  /** A function that configures an instance it's given: its name, so a hook elsewhere that names it finds it. */
  name?: string;
  /** A hook written as a name (`markdownItSetup: configureMarkdown`): the function it names, and where it's from. */
  delegate?: { name: string; from?: string };
  /** For an instance the project creates: where the creating expression is, and its binding. */
  creation?: {
    start: number;
    end: number;
    binding?: string;
    /** The whole declaration statement, when the binding is declared alone. */
    statement?: { start: number; end: number };
    /** Lines where the instance leaves the file's sight: returned, passed, exported, or stored. */
    escapes: number[];
    /** Offsets of statements that only configure the instance (`md.use(x);`), which a rewrite removes. */
    statements: { start: number; end: number }[];
    /** Lines where the instance is configured somewhere a rewrite can't move to its creation: in a branch, a
     * function, or an expression. */
    scattered: number[];
    /** Lines that read the instance's helpers (`md.utils`), which Comark's options don't have. */
    reads: number[];
  };
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
  for (const [key, value] of Object.entries(node)) if (key !== "type") walk(value, visit, node);
}

const isString = (node: Extract<Node, { type: "Literal" }>): node is StringLiteral =>
  /^["']/.test(node.raw ?? "");

export const keyName = (key: PropertyKey): string | undefined =>
  key.type === "Identifier"
    ? key.name
    : key.type === "Literal" && isString(key)
      ? key.value
      : undefined;

const MARKDOWN_IT = /^markdown-it(?:\/(?:index|dist\/.*|lib\/index)(?:\.[cm]?js)?)?$/;
const CONFIG = ["use", "set", "enable", "disable", "configure"] as const;
const RENDER = ["render", "renderInline", "parse", "parseInline"] as const;
const isConfig = (method: string | undefined): method is (typeof CONFIG)[number] =>
  CONFIG.some((name) => name === method);
const isRender = (method: string | undefined): method is Render["method"] =>
  RENDER.some((name) => name === method);
const HARMLESS = new Set(["utils", "helpers", "options"]);
// Hooks frameworks call with their markdown-it instance, by the property or method they're written as.
const HOOKS = new Map<string, Host>([
  ["extendMarkdown", "vuepress"],
  ["extendsMarkdown", "vuepress"],
  ["chainMarkdown", "vuepress"],
  ["markdownItSetup", "vite"],
  ["extendMarkdownIt", "vscode"],
]);

function hostOfFile(file: string): Host | undefined {
  if (/(^|\/)\.vitepress\//.test(file)) return "vitepress";
  if (/(^|\/)\.vuepress\//.test(file)) return "vuepress";
  if (/(^|\/)setup\/markdown-it\.[cm]?[jt]s$/.test(file)) return "slidev";
  if (/(^|\/)(\.eleventy|eleventy\.config)\.[cm]?[jt]s$/.test(file)) return "eleventy";
  return undefined;
}

/** Finds every markdown-it setup in one JavaScript, TypeScript, or component file. */
export function scanSource(source: string, file: string): Setup[] {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return scanScript(source, file);
  return blocks.flatMap((block) => {
    const offset = lineOffset(source, block);
    // Offsets stay relative to the block: only rewriteSource reads them, and it rewrites block by block.
    return scanScript(block.code, block.name).map((setup) => ({
      ...setup,
      file,
      line: setup.line + offset,
      plugins: setup.plugins.map((plugin) => ({ ...plugin, line: plugin.line + offset })),
      rules: setup.rules.map((rule) => ({ ...rule, line: rule.line + offset })),
      customized: setup.customized.map((item) => ({ ...item, line: item.line + offset })),
      renders: setup.renders.map((render) => ({ ...render, line: render.line + offset })),
      creation: setup.creation && {
        ...setup.creation,
        escapes: setup.creation.escapes.map((line) => line + offset),
      },
    }));
  });
}

function scanScript(source: string, file: string): Setup[] {
  const { program } = parseSync(file, source);
  const lineOf = (offset: number) => source.slice(0, offset).split("\n").length;
  const text = (node: Node) => source.slice(node.start, node.end);
  const imports = new Map<string, string>();
  // Names bound by `const x = require("y")`, which count as declarations too.
  const required = new Set<string>();
  const parents = new Map<Node, Node>();
  const declarations = new Map<string, number>();
  const declare = (name: string) => declarations.set(name, (declarations.get(name) ?? 0) + 1);
  // The name each import binding has in its module.
  const exported = new Map<string, string>();
  walk(program, (node, parent) => {
    if (parent) parents.set(node, parent);
    if (node.type === "ImportDeclaration")
      for (const specifier of node.specifiers) {
        imports.set(specifier.local.name, node.source.value);
        // `import { correct as configure }` names `correct` in the module it comes from.
        exported.set(
          specifier.local.name,
          specifier.type === "ImportDefaultSpecifier"
            ? "default"
            : specifier.type === "ImportSpecifier"
              ? specifier.imported.type === "Identifier"
                ? specifier.imported.name
                : String(specifier.imported.value)
              : "*",
        );
      }
    if (node.type === "VariableDeclarator") for (const name of patternNames(node.id)) declare(name);
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier") {
      const match = /^(?:require|\(?\s*await\s+import)\(\s*["'`]([^"'`]+)["'`]\s*\)/.exec(
        node.init ? text(node.init) : "",
      );
      if (match) {
        imports.set(node.id.name, match[1]!);
        required.add(node.id.name);
      }
    }
    // Every name a parameter binds, with defaults and destructuring: `(MarkdownIt = Custom)` shadows the import too.
    if (
      (node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression") &&
      node.params
    )
      for (const param of node.params) for (const name of patternNames(param)) declare(name);
    if ((node.type === "ClassDeclaration" || node.type === "FunctionDeclaration") && node.id)
      declare(node.id.name);
    if (node.type === "CatchClause" && node.param)
      for (const name of patternNames(node.param)) declare(name);
  });
  const up = (node: Node): Node | undefined => {
    let parent = parents.get(node);
    while (
      parent &&
      (parent.type === "ParenthesizedExpression" ||
        parent.type === "TSAsExpression" ||
        parent.type === "TSNonNullExpression" ||
        parent.type === "TSSatisfiesExpression")
    )
      parent = parents.get(parent);
    return parent;
  };
  const isMarkdownIt = (node: Node): boolean => {
    if (node.type === "Identifier") return MARKDOWN_IT.test(imports.get(node.name) ?? "");
    if (node.type === "ParenthesizedExpression") return isMarkdownIt(node.expression);
    if (node.type === "MemberExpression")
      return (
        !node.computed &&
        node.property.type === "Identifier" &&
        node.property.name === "default" &&
        isMarkdownIt(node.object)
      );
    if (node.type === "CallExpression")
      return (
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments[0]?.type === "Literal" &&
        MARKDOWN_IT.test(String(node.arguments[0].value))
      );
    return false;
  };
  const moduleOf = (node: Node): string | undefined => {
    switch (node.type) {
      case "Identifier":
        return imports.get(node.name) ?? node.name;
      case "Literal":
        return isString(node) ? node.value : undefined;
      case "ParenthesizedExpression":
      case "TSAsExpression":
        return moduleOf(node.expression);
      case "AwaitExpression":
        return moduleOf(node.argument);
      case "ImportExpression":
        return moduleOf(node.source);
      case "MemberExpression":
        return moduleOf(node.object);
      case "CallExpression":
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments[0]
        )
          return moduleOf(node.arguments[0]);
        return undefined;
    }
    return undefined;
  };
  const plugin = (args: Node[]): FoundPlugin => {
    const [expression, ...rest] = args;
    const name = expression ? moduleOf(expression) : undefined;
    const line = lineOf(expression?.start ?? 0);
    const found: FoundPlugin = name
      ? {
          name,
          line,
          mapping: mapPlugin(
            name,
            expression?.type !== "Identifier" || imports.has(expression.name),
          ),
        }
      : {
          name: !expression
            ? "nothing"
            : /Function|Arrow/.test(expression.type)
              ? "an inline plugin function"
              : text(expression).replace(/\s+/g, " ").slice(0, 60),
          line,
          mapping: mapPlugin("an expression", false),
        };
    if (rest.length) found.options = rest.map(text).join(", ");
    if (expression?.type === "Identifier") found.local = expression.name;
    return found;
  };
  const readOptions = (setup: Setup, node: Node | undefined) => {
    if (!node) return;
    if (node.type !== "ObjectExpression") {
      setup.unresolved ??= `its options are \`${text(node).slice(0, 40)}\`, which the scan can't read`;
      return;
    }
    for (const property of node.properties) {
      const key =
        property.type === "Property" && !property.computed ? keyName(property.key) : undefined;
      if (!key || property.type !== "Property") {
        setup.unresolved ??= "its options spread or compute a key the scan can't read";
        continue;
      }
      setup.options[key] = text(property.value);
    }
  };
  // `.use(a).set(b)` written on an instance or on the expression that creates it.
  const configure = (setup: Setup, call: Node, method: (typeof CONFIG)[number]) => {
    if (call.type !== "CallExpression") return;
    const args = call.arguments;
    if (method === "use") setup.plugins.push(plugin(args));
    else if (method === "set") readOptions(setup, args[0]);
    else if (method === "configure") {
      const [preset] = args;
      // A preset resets the rules, so plugins registered before it lose theirs; Comark's options apply it first.
      if (setup.plugins.length || setup.rules.length)
        setup.unresolved ??=
          "calls `configure()` after registering plugins or rules, which resets them";
      if (preset?.type === "Literal" && isString(preset)) setup.preset = preset.value;
      else setup.unresolved ??= "it calls `configure()` with a preset the scan can't read";
      // A preset replaces every option set before it with its own.
      setup.options = {};
    } else
      setup.rules.push({
        method,
        args: args.map(text).join(", "),
        line: lineOf(call.start),
      });
  };
  const methodOf = (member: Node | undefined) =>
    member?.type === "MemberExpression" && !member.computed && member.property.type === "Identifier"
      ? member.property.name
      : undefined;

  /**
   * Follows what's done to an instance from `start`: chained config calls, render calls, changes to its renderer and
   * rulers. Returns the expression the chain ends in, so the caller can see where the instance goes next.
   */
  const follow = (setup: Setup, start: Node): Node => {
    let current = start;
    for (;;) {
      const member = up(current);
      const method = methodOf(member);
      if (
        member?.type !== "MemberExpression" ||
        current.start < member.object.start ||
        current.end > member.object.end
      )
        return current;
      const call = up(member);
      if (isConfig(method) && call?.type === "CallExpression" && call.callee === member) {
        configure(setup, call, method);
        current = call;
        continue;
      }
      if (isRender(method) && call?.type === "CallExpression" && call.callee === member) {
        const [input, ...extra] = call.arguments;
        const render: Render = {
          method,
          line: lineOf(call.start),
          start: call.start,
          end: call.end,
          extra: extra.length,
        };
        if (input) render.input = text(input);
        setup.renders.push(render);
        return call;
      }
      if (method && HARMLESS.has(method)) {
        // Reading `md.utils` or `md.options` changes nothing; writing `md.options.x` does.
        const assigned = up(member);
        if (
          method === "options" &&
          assigned?.type === "MemberExpression" &&
          up(assigned)?.type === "AssignmentExpression"
        )
          setup.customized.push({ what: text(assigned), line: lineOf(assigned.start) });
        return member;
      }
      // The whole path that's changed: `md.renderer.rules.fence`, not just `md.renderer`.
      let path: Node = member;
      for (
        let outer = up(path);
        outer?.type === "MemberExpression" && outer.object === path;
        outer = up(path)
      )
        path = outer;
      setup.customized.push({ what: text(path).slice(0, 60), line: lineOf(member.start) });
      return member;
    }
  };

  const setups: Setup[] = [];
  const empty = (line: number, host: Host): Setup => ({
    file,
    line,
    host,
    options: {},
    plugins: [],
    rules: [],
    customized: [],
    renders: [],
  });
  const fileHost = hostOfFile(file);

  walk(program, (node) => {
    // new MarkdownIt(preset?, options?), markdownit(...), require("markdown-it")(...)
    if (
      (node.type === "NewExpression" || node.type === "CallExpression") &&
      isMarkdownIt(node.callee)
    ) {
      const setup = empty(lineOf(node.start), fileHost ?? "markdown-it");
      // A parameter or variable with the import's name may be another constructor altogether.
      const callee = node.callee.type === "MemberExpression" ? node.callee.object : node.callee;
      if (
        callee.type === "Identifier" &&
        (declarations.get(callee.name) ?? 0) > (required.has(callee.name) ? 1 : 0)
      )
        setup.unresolved = `uses \`${callee.name}\`, which is also bound locally, so it may not be markdown-it`;
      const [first, second] = node.arguments;
      if (first?.type === "Literal" && isString(first)) {
        setup.preset = first.value;
        readOptions(setup, second);
      } else readOptions(setup, first);
      const end = follow(setup, node);
      // Eleventy renders .md files with the library it's given.
      const parent = up(end);
      if (
        parent?.type === "CallExpression" &&
        methodOf(parent.callee) === "setLibrary" &&
        parent.arguments[1] === end
      )
        setup.host = "eleventy";
      const creation: NonNullable<Setup["creation"]> = {
        start: node.start,
        end: end.end,
        escapes: [],
        statements: [],
        scattered: [],
        reads: [],
      };
      const declarator =
        parent?.type === "VariableDeclarator" && parent.init === end ? parent : undefined;
      if (declarator?.id.type === "Identifier") {
        const name = declarator.id.name;
        creation.binding = name;
        const statement = parents.get(declarator);
        if (statement?.type === "VariableDeclaration" && statement.declarations.length === 1) {
          const exported = parents.get(statement)?.type === "ExportNamedDeclaration";
          if (exported) creation.escapes.push(lineOf(statement.start));
          creation.statement = { start: statement.start, end: statement.end };
        }
        if ((declarations.get(name) ?? 0) > 1)
          setup.unresolved ??= `\`${name}\` is declared more than once in the file, so which instance each call uses can't be known`;
        // Every later read of the binding.
        walk(program, (reference, owner) => {
          if (
            reference.type !== "Identifier" ||
            reference.name !== name ||
            reference === declarator.id
          )
            return;
          if (owner?.type === "MemberExpression" && owner.property === reference && !owner.computed)
            return;
          if (owner?.type === "Property" && owner.key === reference && !owner.shorthand) return;
          const last = follow(setup, reference);
          const holder = up(last);
          if (last === reference) {
            creation.escapes.push(lineOf(reference.start));
            return;
          }
          if (last.type === "MemberExpression" && HARMLESS.has(methodOf(last) ?? "")) {
            creation.reads.push(lineOf(reference.start));
            return;
          }
          if (last.type !== "CallExpression" || isRender(methodOf(last.callee))) return;
          // `md.use(x);` beside the declaration runs once, right after it, so the plugins can move into Comark's
          // options; anywhere else it may run later, or not at all.
          // A change after a render would reach that render too once it moves to the options.
          if (
            holder?.type === "ExpressionStatement" &&
            statement &&
            parents.get(holder) === parents.get(statement) &&
            holder.start > statement.end &&
            !setup.renders.some((render) => render.start < holder.start)
          )
            creation.statements.push({ start: holder.start, end: holder.end });
          else creation.scattered.push(lineOf(reference.start));
        });
      } else if (
        parent?.type === "AssignmentExpression" ||
        parent?.type === "ReturnStatement" ||
        parent?.type === "ExportDefaultDeclaration" ||
        parent?.type === "CallExpression" ||
        parent?.type === "Property" ||
        parent?.type === "PropertyDefinition"
      ) {
        if (!(end.type === "CallExpression" && isRender(methodOf(end.callee))))
          creation.escapes.push(lineOf(end.start));
      }
      setup.creation = creation;
      setups.push(setup);
      return;
    }
    // A framework hook that names a function written elsewhere: `markdownItSetup: configureMarkdown`.
    if (node.type === "Property" && node.value.type === "Identifier") {
      const key = keyName(node.key);
      const holder = up(node);
      const markdown = holder && up(holder);
      const inMarkdown =
        key === "config" && markdown?.type === "Property" && keyName(markdown.key) === "markdown";
      const host = (key ? HOOKS.get(key) : undefined) ?? (inMarkdown ? "vitepress" : undefined);
      if (!host || holder?.type !== "ObjectExpression") return;
      const setup = empty(lineOf(node.start), host);
      setup.delegate = {
        name: exported.get(node.value.name) ?? node.value.name,
        from: imports.get(node.value.name),
      };
      // The options beside it: VitePress' `markdown: { html }`, vite-plugin-md's `markdownItOptions: { html }`.
      for (const property of holder.properties) {
        if (property.type !== "Property" || property.computed || property === node) continue;
        const name = keyName(property.key);
        if (name === "markdownItOptions" && property.value.type === "ObjectExpression")
          readOptions(setup, property.value);
        else if (inMarkdown && name) setup.options[name] = text(property.value);
      }
      setups.push(setup);
      return;
    }
    // A function that configures an instance it's given: a framework hook, or the project's own helper.
    if (
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionDeclaration"
    ) {
      const [param] = node.params;
      if (param?.type !== "Identifier") return;
      const owner = up(node);
      const key =
        owner?.type === "Property" || owner?.type === "MethodDefinition"
          ? keyName(owner.key)
          : node.type === "FunctionDeclaration"
            ? node.id?.name
            : undefined;
      const grand = owner && up(owner);
      const property = grand && up(grand);
      const inMarkdown =
        key === "config" &&
        grand?.type === "ObjectExpression" &&
        property?.type === "Property" &&
        keyName(property.key) === "markdown";
      const amend =
        owner?.type === "CallExpression" &&
        methodOf(owner.callee) === "amendLibrary" &&
        owner.arguments[1] === node;
      let host: Host | undefined =
        (key ? HOOKS.get(key) : undefined) ??
        (inMarkdown ? "vitepress" : amend ? "eleventy" : undefined);
      const setup = empty(lineOf(node.start), host ?? "function");
      // VitePress reads the options beside its hook: `markdown: { html: false, config(md) {} }`.
      if (inMarkdown && grand?.type === "ObjectExpression")
        for (const property of grand.properties)
          if (property.type === "Property" && !property.computed && property.value !== node) {
            const name = keyName(property.key);
            if (name && name !== "config") setup.options[name] = text(property.value);
          }
      let uses = false;
      walk(node.body, (reference, holder) => {
        if (reference.type !== "Identifier" || reference.name !== param.name) return;
        if (
          holder?.type === "MemberExpression" &&
          holder.property === reference &&
          !holder.computed
        )
          return;
        const before = setup.plugins.length;
        follow(setup, reference);
        if (setup.plugins.length > before) uses = true;
      });
      // A function counts only when it's a known hook, or when it registers a markdown-it plugin on its parameter.
      if (!host && !setup.plugins.some((found) => /^(?:@[\w.-]+\/)?markdown-it/.test(found.name)))
        return;
      if (!host && !uses) return;
      host ??= fileHost && fileHost !== "eleventy" ? fileHost : "function";
      setup.host = host;
      setup.renders = [];
      const declarator = owner?.type === "VariableDeclarator" ? owner : undefined;
      setup.name =
        owner?.type === "ExportDefaultDeclaration"
          ? "default"
          : node.type === "FunctionDeclaration"
            ? node.id?.name
            : declarator?.id.type === "Identifier"
              ? declarator.id.name
              : undefined;
      setups.push(setup);
    }
  });
  // A framework config with no hook still renders Markdown with the framework's own setup.
  if (
    fileHost &&
    /(^|\/)config\.[cm]?[jt]s$/.test(file) &&
    !setups.some((setup) => setup.host === fileHost)
  ) {
    const setup = empty(1, fileHost);
    walk(program, (node) => {
      if (
        node.type !== "Property" ||
        keyName(node.key) !== "markdown" ||
        node.value.type !== "ObjectExpression"
      )
        return;
      setup.line = lineOf(node.start);
      for (const property of node.value.properties)
        if (property.type === "Property" && !property.computed) {
          const key = keyName(property.key);
          if (key) setup.options[key] = text(property.value);
        }
    });
    setups.push(setup);
  }
  return setups;
}

/** Scans a project's JavaScript and TypeScript for markdown-it setups. */
export async function scan(root: string): Promise<Setup[]> {
  const files = await glob(["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}"], {
    cwd: root,
    dot: true,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/*.d.ts",
      "**/test/**",
      "**/tests/**",
      "**/__tests__/**",
      "**/*.{test,spec}.*",
      "**/.git/**",
    ],
  });
  const setups: Setup[] = [];
  for (const path of files.sort()) {
    const source = readFileSync(join(root, path), "utf8");
    if (!mentions(source, path)) continue;
    try {
      setups.push(...scanSource(source, path));
    } catch {
      // A file oxc can't parse is reported by the project's own build; scanning goes on.
    }
  }
  return setups;
}

/** Whether a file could hold a markdown-it setup, before parsing it. */
export const mentions = (source: string, file: string) =>
  /markdown-?it|MarkdownIt|extendMarkdown|extendsMarkdown|markdownItSetup|amendLibrary|setLibrary/i.test(
    source,
  ) || hostOfFile(file) !== undefined;

/** Every name a binding pattern declares: `a`, `{ a, b: c }`, `[a = 1, ...d]`. */
function patternNames(pattern: Node | null | undefined): string[] {
  if (!pattern) return [];
  switch (pattern.type) {
    case "Identifier":
      return [pattern.name];
    case "AssignmentPattern":
      return patternNames(pattern.left);
    case "RestElement":
      return patternNames(pattern.argument);
    case "TSParameterProperty":
      return patternNames(pattern.parameter);
    case "ArrayPattern":
      return pattern.elements.flatMap((item) => patternNames(item));
    case "ObjectPattern":
      return pattern.properties.flatMap((item) =>
        patternNames(item.type === "RestElement" ? item.argument : item.value),
      );
  }
  return [];
}
