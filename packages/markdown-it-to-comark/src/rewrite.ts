import MagicString from "magic-string";
import { parseSync, visitorKeys, type Node } from "oxc-parser";
import { literal } from "./literal.ts";
import { scanSource, type Setup } from "./scan.ts";
import { lineOffset, scriptBlocks } from "./sfc.ts";

export interface Rewrite {
  file: string;
  line: number;
  /** Whether the setup was replaced; otherwise `reason` says why it was left. */
  rewritten: boolean;
  reason?: string;
}

export interface RewriteResult {
  code: string;
  rewrites: Rewrite[];
}

// Options `comarkOptions()` takes as markdown-it does.
const OPTIONS = new Set(["html", "linkify", "typographer", "breaks", "quotes"]);
const FUNCTIONS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function children(node: Node): Node[] {
  const found: Node[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    // SAFETY: visitorKeys names, for each node type, exactly the properties that hold a child node, null, or a list of them.
    const value = Reflect.get(node, key) as Node | null | (Node | null)[];
    for (const child of Array.isArray(value) ? value : [value]) if (child) found.push(child);
  }
  return found;
}

/** Each node's parent, and every identifier name the file uses, from one parse. */
function index(program: Node) {
  const parent = new Map<Node, Node>();
  const names = new Set<string>();
  const calls = new Map<string, Node>();
  const visit = (node: Node) => {
    if (node.type === "Identifier") names.add(node.name);
    if (node.type === "CallExpression") calls.set(`${node.start}:${node.end}`, node);
    for (const child of children(node)) {
      parent.set(child, node);
      visit(child);
    }
  };
  visit(program);
  return { parent, names, calls };
}

type Index = ReturnType<typeof index>;

/** The nearest function around a node, or undefined at the top level. */
function enclosingFunction(node: Node, info: Index): Node | undefined {
  for (let up = info.parent.get(node); up; up = info.parent.get(up))
    if (FUNCTIONS.has(up.type)) return up;
  return undefined;
}

/** Why a render call can't become `await renderHtml(…)`, if it can't. */
function renderBlocker(render: Setup["renders"][number], info: Index): string | undefined {
  if (render.method !== "render")
    return `calls \`${render.method}\`, which Comark has no counterpart for: it renders whole documents to HTML`;
  if (render.extra)
    return "passes an `env` to `render`, which plugins read; Comark has no counterpart";
  if (!render.input) return "calls `render` with no input";
  const call = info.calls.get(`${render.start}:${render.end}`);
  if (!call) return "couldn't be located in the file";
  const fn = enclosingFunction(call, info);
  // SAFETY: every function node type in FUNCTIONS has an `async` flag.
  // SAFETY: every function node type in FUNCTIONS has a body; `await` is only allowed inside it, not in a default value.
  const body = fn && (fn as unknown as { body: Node | null }).body;
  if (
    !fn ||
    !(fn as unknown as { async: boolean }).async ||
    !body ||
    call.start < body.start ||
    call.end > body.end
  )
    return `renders on line ${render.line} outside an async function's body; Comark's \`renderHtml\` returns a promise, so the call needs an \`await\` that can't go there`;
  return undefined;
}

/** Why a setup can't become `comarkOptions()` and `renderHtml` without changing what it does, if it can't. */
function blocker(setup: Setup, file: string, isModule: boolean, info: Index): string | undefined {
  const creation = setup.creation;
  if (!creation) return "isn't created in this file";
  if (setup.unresolved) return setup.unresolved;
  if (setup.customized.length)
    return `changes the instance by hand (\`${setup.customized[0]!.what}\`); wrap that code in a plugin and pass it to \`markdownItPlugin()\``;
  if (creation.escapes.length)
    return `the instance leaves this file on line ${creation.escapes[0]} (returned, passed on, exported, or stored), so every caller would change`;
  if (creation.reads.length)
    return `reads the instance's helpers on line ${creation.reads[0]} (\`md.utils\`, \`md.options\`), which Comark's options don't have`;
  if (creation.scattered.length)
    return `configures the instance on line ${creation.scattered[0]} inside a branch, a function, or an expression, which may run later or not at all; move it beside the declaration`;
  if (!setup.renders.length) return "has no `render` call in this file";
  if (!creation.binding && setup.renders.length !== 1) return "isn't bound to a name";
  if (/\.c[jt]s$/.test(file) || !isModule) return "is CommonJS; the rewrite emits ES imports";
  const own = setup.plugins.filter((plugin) => plugin.mapping.kind !== "bridge");
  if (own.length)
    return `registers ${own.map((plugin) => `\`${plugin.name}\``).join(", ")}, whose output on Comark nobody has compared; wrap ${own.length > 1 ? "them" : "it"} in \`markdownItPlugin()\` by hand and compare a few pages`;
  const unnamed = setup.plugins.find((plugin) => !plugin.local);
  if (unnamed) return `registers \`${unnamed.name}\` as an expression the rewrite can't move`;
  for (const [name, text] of Object.entries(setup.options)) {
    if (!OPTIONS.has(name)) return `sets \`${name}\`, which \`comarkOptions()\` doesn't take`;
    if (literal(text) === undefined)
      return `sets \`${name}\` to \`${text.slice(0, 40)}\`, which isn't a literal`;
  }
  if (setup.preset && !["default", "commonmark", "zero"].includes(setup.preset))
    return `starts from the preset \`${setup.preset}\`, which markdown-it doesn't have`;
  for (const rule of setup.rules)
    if (literal(`[${rule.args}]`) === undefined)
      return `calls \`${rule.method}(${rule.args.slice(0, 30)})\` with rules that aren't a literal`;
  for (const render of setup.renders) {
    const reason = renderBlocker(render, info);
    if (reason) return reason;
  }
  return undefined;
}

/**
 * Replaces each markdown-it instance the file creates and only renders with (`md.render(src)` in async code) with
 * `comarkOptions()` and `await renderHtml(src, options)` from `@comark/html`: the preset, options, and rules carry over,
 * and each plugin runs through `markdownItPlugin()`. An instance whose behavior the replacement wouldn't keep is left,
 * with the reason.
 */
export function rewriteSource(source: string, file: string): RewriteResult {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return rewriteScript(source, file);
  let code = source;
  const rewrites: Rewrite[] = [];
  for (const block of [...blocks].sort((a, b) => b.start - a.start)) {
    const result = rewriteScript(block.code, block.name);
    const offset = lineOffset(source, block);
    rewrites.unshift(
      ...result.rewrites.map((rewrite) => ({ ...rewrite, file, line: rewrite.line + offset })),
    );
    code = code.slice(0, block.start) + result.code + code.slice(block.start + block.code.length);
  }
  return { code, rewrites };
}

function rewriteScript(source: string, file: string): RewriteResult {
  const setups = scanSource(source, file).filter(
    (setup) => setup.host === "markdown-it" && setup.creation,
  );
  if (!setups.length) return { code: source, rewrites: [] };
  const { program } = parseSync(file, source);
  const info = index(program);
  const imports = program.body.filter((node) => node.type === "ImportDeclaration");
  const isModule =
    imports.length > 0 || program.body.some((node) => node.type.startsWith("Export"));
  const code = new MagicString(source);
  const rewrites: Rewrite[] = [];
  const taken = new Set(info.names);
  const fresh = (name: string) => {
    let candidate = name;
    for (let suffix = 2; taken.has(candidate); suffix++) candidate = `${name}${suffix}`;
    taken.add(candidate);
    return candidate;
  };
  const wanted = new Map<string, Set<string>>();
  const want = (from: string, name: string) =>
    wanted.set(from, (wanted.get(from) ?? new Set()).add(name));
  let render: string | undefined;
  let options: string | undefined;
  let bridge: string | undefined;
  let replaced = 0;
  for (const setup of setups) {
    const reason = blocker(setup, file, isModule, info);
    if (reason) {
      rewrites.push({ file, line: setup.line, rewritten: false, reason });
      continue;
    }
    const creation = setup.creation!;
    render ??= fresh("renderHtml");
    options ??= fresh("comarkOptions");
    want("@comark/html", render === "renderHtml" ? "renderHtml" : `renderHtml as ${render}`);
    want(
      "markdown-it-to-comark/setup",
      options === "comarkOptions" ? "comarkOptions" : `comarkOptions as ${options}`,
    );
    const settings: string[] = [];
    if (setup.preset && setup.preset !== "default")
      settings.push(`preset: ${JSON.stringify(setup.preset)}`);
    for (const [name, text] of Object.entries(setup.options)) settings.push(`${name}: ${text}`);
    const rules = setup.rules.map((rule) => {
      const found = literal(`[${rule.args}]`);
      return [rule.method, Array.isArray(found) ? found.flat() : []] as const;
    });
    // One kind of change keeps its plain option; both kinds keep the order they ran in.
    const methods = new Set(rules.map(([method]) => method));
    if (methods.size > 1) settings.push(`rules: ${JSON.stringify(rules)}`);
    else
      for (const method of methods)
        settings.push(`${method}: ${JSON.stringify(rules.flatMap(([, names]) => names))}`);
    if (setup.plugins.length) {
      bridge ??= fresh("markdownItPlugin");
      want(
        "markdown-it-to-comark/plugins",
        bridge === "markdownItPlugin" ? "markdownItPlugin" : `markdownItPlugin as ${bridge}`,
      );
      settings.push(
        `plugins: [${setup.plugins.map((plugin) => `${bridge}(${[plugin.local!, ...(plugin.options ? [plugin.options] : [])].join(", ")})`).join(", ")}]`,
      );
    }
    const replacement = `${options}(${settings.length ? `{ ${settings.join(", ")} }` : ""})`;
    for (const statement of creation.statements)
      code.remove(statement.start, end(source, statement.end));
    if (creation.binding) {
      // `const md: MarkdownIt = …` would now hold options, so the annotation goes.
      for (const [node, parent] of info.parent)
        if (
          parent.type === "VariableDeclarator" &&
          node === parent.init &&
          node.start <= creation.start &&
          node.end >= creation.end &&
          parent.id.type === "Identifier" &&
          parent.id.typeAnnotation
        )
          code.remove(parent.id.typeAnnotation.start, parent.id.typeAnnotation.end);
      code.overwrite(creation.start, creation.end, replacement);
      for (const call of setup.renders)
        code.overwrite(
          call.start,
          call.end,
          `(await ${render}(${call.input}, ${creation.binding}))`,
        );
    } else {
      const call = setup.renders[0]!;
      code.overwrite(creation.start, call.end, `(await ${render}(${call.input}, ${replacement}))`);
    }
    rewrites.push({ file, line: setup.line, rewritten: true });
    replaced++;
  }
  if (!replaced) return { code: source, rewrites };
  // markdown-it's import goes once nothing else in the file uses it.
  const rewritten = code.toString();
  for (const declaration of imports) {
    if (declaration.type !== "ImportDeclaration" || !/^markdown-it$/.test(declaration.source.value))
      continue;
    const locals = declaration.specifiers.map((specifier) => specifier.local.name);
    const still = parseSync(file, rewritten);
    const used = new Set<string>();
    const visit = (node: Node, parent?: Node) => {
      if (node.type === "ImportDeclaration") return;
      if (
        node.type === "Identifier" &&
        !(parent?.type === "MemberExpression" && (parent as { property: Node }).property === node)
      )
        used.add(node.name);
      for (const child of children(node)) visit(child, node);
    };
    visit(still.program);
    if (locals.some((name) => used.has(name))) continue;
    code.remove(declaration.start, end(source, declaration.end));
  }
  const lines = [...wanted].map(
    ([from, names]) => `import { ${[...names].join(", ")} } from "${from}";`,
  );
  const last = imports.at(-1);
  if (last) code.appendRight(end(source, last.end), `${lines.join("\n")}\n`);
  else code.prepend(`${lines.join("\n")}\n`);
  return { code: code.toString(), rewrites };
}

/** The end of a statement's line, so removing it leaves no blank line. */
function end(source: string, at: number): number {
  let index = at;
  while (source[index] === " " || source[index] === "\t" || source[index] === ";") index++;
  if (source[index] === "\r") index++;
  if (source[index] === "\n") index++;
  return index;
}
