import { lineOffset, scriptBlocks } from "./sfc.ts";
import MagicString from "magic-string";
import type {
  BindingIdentifier,
  BindingPattern,
  BindingRestElement,
  Expression,
  ImportDeclaration,
  Node,
  ParamPattern,
  Program,
  PropertyKey,
} from "oxc-parser";
import { parseSync, visitorKeys } from "oxc-parser";
import type { FoundPlugin, Setup } from "./scan.ts";
import { scanSource } from "./scan.ts";

export interface Rewrite {
  file: string;
  line: number;
  /** Whether the chain was replaced; otherwise `reason` says why it was left. */
  rewritten: boolean;
  reason?: string;
}

export interface RewriteResult {
  code: string;
  rewrites: Rewrite[];
}

const REWRITABLE = new Set(["pipeline", "setup", "builtin", "plugin", "port"]);

/** The object literal `options` holds, parsed on its own, if it is one. */
function optionsObject(options: string | undefined) {
  const statement = parseSync("options.ts", `(${options})`).program.body[0];
  let object: Expression | undefined =
    statement?.type === "ExpressionStatement" ? statement.expression : undefined;
  while (object?.type === "ParenthesizedExpression") object = object.expression;
  return object?.type === "ObjectExpression" ? object : undefined;
}

const keyName = (key: PropertyKey) =>
  key.type === "Identifier" || key.type === "PrivateIdentifier"
    ? key.name
    : key.type === "Literal"
      ? String(key.value)
      : undefined;

/**
 * One boolean option of a plugin, read from its options' AST: `true`/`false` when written as a literal or absent
 * (`undefined` default), `null` when it's computed, spread, or held in a variable, so the policy can't be known.
 */
function option(setup: Setup, plugin: string, name: string): boolean | undefined | null {
  const found = setup.plugins.find((item) => item.name === plugin);
  if (!found?.options) return undefined;
  const object = optionsObject(found.options);
  if (!object) return null;
  let value: boolean | undefined | null;
  for (const property of object.properties) {
    if (property.type !== "Property" || property.computed) return null;
    if (keyName(property.key) !== name) continue;
    const literal = property.value.type === "Literal" ? property.value.value : undefined;
    value = literal === true || literal === false ? literal : null;
  }
  return value;
}

/**
 * Whether the chain kept raw HTML. remark-rehype drops it unless `allowDangerousHtml` is set (with rehype-raw or a
 * stringifier that also allows it), and remark-html drops it unless `sanitize: false`. `null` when an option is
 * computed and the policy can't be read.
 */
export function keepsHtml(setup: Setup): boolean | null {
  if (setup.plugins.some((plugin) => plugin.name === "remark-html")) {
    const sanitize = option(setup, "remark-html", "sanitize");
    return sanitize === null ? null : sanitize === false;
  }
  const bridge = option(setup, "remark-rehype", "allowDangerousHtml");
  const stringify = option(setup, "rehype-stringify", "allowDangerousHtml");
  if (bridge === null || (bridge && stringify === null)) return null;
  return (
    Boolean(bridge) &&
    (setup.plugins.some((plugin) => plugin.name === "rehype-raw") || stringify === true)
  );
}

/** What the rewrite needs to know about a script's bindings, from one parse: no regexes over source. */
interface Facts {
  /** Every identifier name in the file, bound or not (`Math`, a parameter), so a new import never shadows one. */
  names: Set<string>;
  /** Names bound by something other than an import: parameters, variables, functions, classes. */
  shadowed: Set<string>;
  imports: {
    node: ImportDeclaration;
    source: string;
    specifiers: { local: string; imported: string; typeOnly: boolean }[];
  }[];
  /** Where each name is read, by offset. */
  references: Map<string, Node[]>;
  parent: WeakMap<Node, Node>;
}

/** Each child of `node` with the property that holds it. */
function children(node: Node): [string, Node][] {
  const found: [string, Node][] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    // SAFETY: visitorKeys names, for each node type, exactly the properties that hold a child node, null, or a list of them.
    const value = Reflect.get(node, key) as Node | null | (Node | null)[];
    for (const child of Array.isArray(value) ? value : [value]) if (child) found.push([key, child]);
  }
  return found;
}

const FUNCTIONS = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
  "ArrowFunctionExpression",
  "TSFunctionType",
]);
const isFunction = (node: Node): node is Extract<Node, { params: ParamPattern[] }> =>
  FUNCTIONS.has(node.type);

function bindingNames(
  pattern: BindingPattern | ParamPattern | BindingRestElement | null | undefined,
  into: BindingIdentifier[],
) {
  if (!pattern) return;
  if (pattern.type === "Identifier") into.push(pattern);
  else if (pattern.type === "ObjectPattern")
    for (const property of pattern.properties)
      bindingNames(property.type === "RestElement" ? property.argument : property.value, into);
  else if (pattern.type === "ArrayPattern")
    for (const element of pattern.elements) bindingNames(element, into);
  else if (pattern.type === "AssignmentPattern") bindingNames(pattern.left, into);
  else if (pattern.type === "RestElement") bindingNames(pattern.argument, into);
  else if (pattern.type === "TSParameterProperty") bindingNames(pattern.parameter, into);
}

function facts(program: Program): Facts {
  const result: Facts = {
    names: new Set(),
    shadowed: new Set(),
    imports: [],
    references: new Map(),
    parent: new WeakMap(),
  };
  const bindings = new WeakSet<Node>();
  const visit = (node: Node, parent?: Node, key?: string) => {
    if (parent) result.parent.set(node, parent);
    if (node.type === "ImportDeclaration") {
      const typeOnly = node.importKind === "type";
      result.imports.push({
        node,
        source: node.source.value,
        specifiers: node.specifiers.map((specifier) => ({
          local: specifier.local.name,
          imported:
            specifier.type === "ImportSpecifier"
              ? specifier.imported.type === "Literal"
                ? specifier.imported.value
                : specifier.imported.name
              : specifier.type === "ImportDefaultSpecifier"
                ? "default"
                : "*",
          typeOnly:
            typeOnly || (specifier.type === "ImportSpecifier" && specifier.importKind === "type"),
        })),
      });
      for (const specifier of node.specifiers) result.names.add(specifier.local.name);
      return;
    }
    const declared: BindingIdentifier[] = [];
    if (node.type === "VariableDeclarator") bindingNames(node.id, declared);
    if (isFunction(node)) {
      if ("id" in node && node.id) declared.push(node.id);
      for (const param of node.params) bindingNames(param, declared);
    }
    if ((node.type === "ClassDeclaration" || node.type === "ClassExpression") && node.id)
      declared.push(node.id);
    if (node.type === "CatchClause") bindingNames(node.param, declared);
    for (const binding of declared) {
      bindings.add(binding);
      result.shadowed.add(binding.name);
    }
    if (node.type === "Identifier" || node.type === "JSXIdentifier") {
      const name = node.name;
      result.names.add(name);
      const isKey =
        (parent?.type === "MemberExpression" && key === "property" && !parent.computed) ||
        ((parent?.type === "Property" ||
          parent?.type === "PropertyDefinition" ||
          parent?.type === "MethodDefinition") &&
          key === "key" &&
          !parent.computed &&
          !("shorthand" in parent && parent.shorthand));
      if (!isKey && !bindings.has(node))
        result.references.set(name, [...(result.references.get(name) ?? []), node]);
    }
    for (const [childKey, child] of children(node)) visit(child, node, childKey);
  };
  for (const node of program.body) visit(node);
  return result;
}

const unwrap = (
  node: Node | undefined,
  parent: WeakMap<Node, Node>,
): [Node | undefined, Node | undefined] => {
  let child = node;
  let up = node && parent.get(node);
  while (
    up &&
    (up.type === "ParenthesizedExpression" ||
      up.type === "TSAsExpression" ||
      up.type === "TSNonNullExpression")
  ) {
    child = up;
    up = parent.get(up);
  }
  return [child, up];
};

/** Whether `node` (a VFile) is only ever turned into its string: `String(x)`, `x.toString()`, `${x}`. */
function usedAsString(node: Node, parent: WeakMap<Node, Node>): boolean {
  const [self, up] = unwrap(node, parent);
  if (!up || !self) return false;
  if (
    up.type === "CallExpression" &&
    up.callee.type === "Identifier" &&
    up.callee.name === "String" &&
    up.arguments[0] === self
  )
    return true;
  if (up.type === "TemplateLiteral") return true;
  if (
    up.type === "MemberExpression" &&
    up.object === self &&
    !up.computed &&
    up.property.name === "toString"
  ) {
    const call = parent.get(up);
    return call?.type === "CallExpression" && call.callee === up && !call.arguments.length;
  }
  return false;
}

/**
 * Why the result of `process` can't become a string, if it can't. Only uses proven to stringify the VFile are kept:
 * `String(await …)`, `(await …).toString()`, `${await …}`, `.then((file) => String(file))`, and a `const` read only
 * those ways. Returning it, passing it on, or reading `.value`/`.data` would see a string instead of a VFile.
 */
function resultUse(chainNode: Node, info: Facts, source: string): string | undefined {
  const { parent } = info;
  const [, up] = unwrap(chainNode, parent);
  if (up?.type === "AwaitExpression") {
    if (usedAsString(up, parent)) return undefined;
    const [, holder] = unwrap(up, parent);
    if (
      holder?.type === "VariableDeclarator" &&
      holder.id.type === "Identifier" &&
      !holder.id.typeAnnotation
    ) {
      const name = holder.id.name;
      const reads = (info.references.get(name) ?? []).filter(
        (reference) => reference.start > holder.end,
      );
      if (reads.length && reads.every((reference) => usedAsString(reference, parent)))
        return undefined;
      return `reads \`${name}\` as the VFile \`process\` returns; \`renderHtml\` returns a string`;
    }
    return "uses the VFile `process` returns in a way the rewrite can't prove is a string conversion; wrap it in `String(…)` and run the rewrite again";
  }
  if (up?.type === "MemberExpression" && !up.computed && up.property.name === "then") {
    const call = parent.get(up);
    const callback = call?.type === "CallExpression" ? call.arguments[0] : undefined;
    const param = callback && isFunction(callback) ? callback.params[0] : undefined;
    if (
      call?.type === "CallExpression" &&
      call.arguments.length === 1 &&
      param?.type === "Identifier"
    ) {
      const name = param.name;
      const reads = (info.references.get(name) ?? []).filter(
        (reference) => reference.start > param.end && reference.end <= callback!.end,
      );
      if (reads.length && reads.every((reference) => usedAsString(reference, parent)))
        return undefined;
    }
    return "reads the VFile in `.then`; `renderHtml` resolves to a string";
  }
  void source;
  return "returns or passes on the VFile `process` resolves to; `renderHtml` resolves to a string, so callers would change";
}

/** Why the input isn't known to be a string, if it isn't: `renderHtml` takes Markdown text, not a VFile or a Buffer. */
function inputUse(
  chain: NonNullable<Setup["chain"]>,
  info: Facts,
  program: Program,
): string | undefined {
  const type = chain.inputType;
  if (type === "Literal" || type === "TemplateLiteral" || type === "MemberExpression")
    return undefined;
  // `content.trim()`, `String(x)`: calls that always return a string.
  if (
    type === "CallExpression" &&
    /^(String\(|[\w$.]+\.(trim|trimStart|trimEnd|replace|replaceAll|slice|toString|normalize|toLowerCase|toUpperCase|padEnd|padStart)\()/.test(
      chain.input ?? "",
    )
  )
    return undefined;
  if (type !== "Identifier")
    return `passes ${type === "NewExpression" || type === "ObjectExpression" ? "a VFile-like object" : "an expression"} to \`process\`; \`renderHtml\` takes the Markdown string, so pass a string variable`;
  const name = chain.input!;
  // Its declarations: a parameter or variable typed as anything but `string`, or holding an object, isn't a string.
  let verdict: string | undefined;
  const visit = (node: Node) => {
    if (verdict) return;
    const ids: BindingIdentifier[] = [];
    if (node.type === "VariableDeclarator") bindingNames(node.id, ids);
    if (isFunction(node)) for (const param of node.params) bindingNames(param, ids);
    for (const id of ids) {
      if (id.name !== name) continue;
      const annotation = id.typeAnnotation?.typeAnnotation;
      const init = node.type === "VariableDeclarator" ? node.init : null;
      if (annotation && annotation.type !== "TSStringKeyword")
        verdict = `passes \`${name}\`, typed as something other than \`string\`, to \`process\`; \`renderHtml\` takes the Markdown string`;
      else if (init && /^(NewExpression|ObjectExpression|ArrayExpression)$/.test(init.type))
        verdict = `passes \`${name}\`, a VFile-like object, to \`process\`; \`renderHtml\` takes the Markdown string`;
    }
    for (const [, child] of children(node)) visit(child);
  };
  visit(program);
  void info;
  return verdict;
}

/** Why a chain can't become `renderHtml(markdown, options)` without changing what it does, if it can't. */
function blocker(
  setup: Setup,
  source: string,
  file: string,
  info: Facts,
  program: Program,
  node: Node | undefined,
): string | undefined {
  const chain = setup.chain!;
  const blocked = setup.plugins.filter((plugin) => !REWRITABLE.has(plugin.mapping.kind));
  if (blocked.length) {
    const own = blocked
      .filter((plugin) => plugin.mapping.kind === "custom")
      .map((plugin) => (/^(an? |\.)/.test(plugin.name) ? plugin.name : `\`${plugin.name}\``));
    const missing = blocked
      .filter((plugin) => plugin.mapping.kind !== "custom")
      .map((plugin) => plugin.name);
    return [
      own.length &&
        `uses the project's own ${own.length > 1 ? "plugins" : "plugin"} (${own.join(", ")})`,
      missing.length &&
        `${missing.join(", ")} ${missing.length > 1 ? "have" : "has"} no Comark counterpart`,
    ]
      .filter(Boolean)
      .join("; ");
  }
  if (file.endsWith(".cjs") || !info.imports.length)
    return "is CommonJS; the rewrite emits ES imports";
  if (keepsHtml(setup) === null)
    return "sets its HTML options in code the rewrite can't read; whether raw HTML is kept can't be known";
  if (chain.method !== "process" || !chain.input)
    return `ends in \`${chain.method ?? "use"}\`; only \`.process(markdown)\` maps to \`renderHtml\``;
  if (
    !setup.plugins.some(
      (plugin) => plugin.name === "rehype-stringify" || plugin.name === "remark-html",
    )
  )
    return "doesn't render HTML (no rehype-stringify or remark-html)";
  if ((chain.args ?? 0) > 1)
    return "passes a callback to `process`; `renderHtml` returns a promise";
  if (chain.calls?.length)
    return `calls \`.${chain.calls[0]}()\` on the processor, which \`renderHtml\` has no counterpart for`;
  const names = setup.plugins.map((plugin) => plugin.name);
  const repeated = names.find((name, index) => names.indexOf(name) !== index);
  if (repeated) return `registers ${repeated} more than once; which options win can't be read`;
  // A local binding with the same name as an import (a parameter `gfm`) may not be the imported plugin at all.
  const ambiguous = [chain.rootLocal, ...setup.plugins.map((plugin) => plugin.local)].find(
    (name) => name && info.shadowed.has(name),
  );
  if (ambiguous)
    return `\`${ambiguous}\` is also bound locally (a parameter or variable), so which plugin it is can't be known`;
  const dropped = setup.plugins.find((plugin) => plugin.options && !optionsKept(plugin));
  if (dropped)
    return `passes options to ${dropped.name} that the Comark setup doesn't take; port them by hand`;
  const input = inputUse(chain, info, program);
  if (input) return input;
  if (!node) return "couldn't be located in the file";
  void source;
  return resultUse(node, info, source);
}

// Options the setup reads: the HTML policy of the pipeline plugins, and what a mapping passes through as `$options`.
const POLICY = new Map([
  ["remark-rehype", ["allowDangerousHtml"]],
  ["rehype-stringify", ["allowDangerousHtml"]],
  ["remark-html", ["sanitize"]],
]);
function optionsKept(plugin: FoundPlugin): boolean {
  if (plugin.mapping.call?.includes("$options")) return true;
  const allowed = POLICY.get(plugin.name);
  if (!allowed) return false;
  const object = optionsObject(plugin.options);
  if (!object) return false;
  return object.properties.every(
    (property) =>
      property.type === "Property" &&
      !property.computed &&
      allowed.includes(keyName(property.key) ?? ""),
  );
}

/**
 * Replaces each unified chain that renders Markdown to HTML (`unified().use(…).process(md)`) with `renderHtml` from
 * `@comark/html` on `comarkOptions()`, adds the imports, and drops the remark imports nothing else uses. A chain whose
 * behavior the replacement wouldn't keep is left, with the reason.
 */
export function rewriteSource(source: string, file: string): RewriteResult {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return rewriteScript(source, file);
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  if (
    sorted.some(
      (block, index) =>
        index && block.start < sorted[index - 1]!.start + sorted[index - 1]!.code.length,
    )
  ) {
    return {
      code: source,
      rewrites: scanSource(source, file)
        .filter((setup) => setup.chain)
        .map((setup) => ({
          file,
          line: setup.line,
          rewritten: false,
          reason: "sits in script blocks that overlap; rewrite it by hand",
        })),
    };
  }
  let code = source;
  const rewrites: Rewrite[] = [];
  // From the last block back, so earlier blocks' offsets still hold after a splice.
  for (const block of [...sorted].reverse()) {
    // The rest of the component (the template, other scripts) can name an import too.
    const outside = source.slice(0, block.start) + source.slice(block.start + block.code.length);
    const result = rewriteScript(block.code, block.name, outside);
    const offset = lineOffset(source, block);
    rewrites.unshift(
      ...result.rewrites.map((rewrite) => ({ ...rewrite, file, line: rewrite.line + offset })),
    );
    code = code.slice(0, block.start) + result.code + code.slice(block.start + block.code.length);
  }
  return { code, rewrites };
}

function rewriteScript(source: string, file: string, outside = ""): RewriteResult {
  const setups = scanSource(source, file).filter(
    (setup) => setup.host === "unified" && setup.chain,
  );
  if (!setups.length) return { code: source, rewrites: [] };
  const { program } = parseSync(file, source);
  const info = facts(program);
  const nodes = new Map<number, Node>();
  const find = (node: Node) => {
    if (node.type === "CallExpression") nodes.set(node.start * 1e7 + node.end, node);
    for (const [, child] of children(node)) find(child);
  };
  find(program);
  const code = new MagicString(source);
  const rewrites: Rewrite[] = [];
  const imports = new Map<string, { names: Set<string>; defaultName?: string }>();
  const removable = new Set<string>();
  const outsideWords = new Set(outside.match(/[A-Za-z_$][\w$]*/g) ?? []);
  // What the file already imports as a value, as `module:name` → local binding (`renderHtml as render` → `render`).
  const bound = new Map<string, string>();
  for (const declaration of info.imports)
    for (const specifier of declaration.specifiers)
      if (!specifier.typeOnly)
        bound.set(`${declaration.source}:${specifier.imported}`, specifier.local);
  const taken = new Set([...info.names, ...outsideWords]);
  const allocated = new Map<string, string>();
  // The binding to use for `name` from `from`: the file's own value import if it has one, else a name nothing uses.
  const local = (name: string, from: string) => {
    const key = `${from}:${name}`;
    const existing = bound.get(key) ?? allocated.get(key);
    if (existing) return existing;
    let candidate = name;
    for (let suffix = 1; taken.has(candidate); suffix++)
      candidate = `${name}FromComark${suffix > 1 ? suffix : ""}`;
    taken.add(candidate);
    allocated.set(key, candidate);
    return candidate;
  };
  const want = (from: string, imported: string, as: string, named: boolean) => {
    if (bound.get(`${from}:${named ? imported : "default"}`) === as) return;
    const entry = imports.get(from) ?? { names: new Set<string>() };
    if (named) entry.names.add(as === imported ? imported : `${imported} as ${as}`);
    else entry.defaultName = as;
    imports.set(from, entry);
  };
  const done: [number, number][] = [];
  for (const setup of setups) {
    const chain = setup.chain!;
    if (done.some(([start, end]) => chain.start < end && chain.end > start)) {
      rewrites.push({
        file,
        line: setup.line,
        rewritten: false,
        reason: "is nested in another chain being rewritten; run the rewrite again",
      });
      continue;
    }
    const reason = blocker(
      setup,
      source,
      file,
      info,
      program,
      nodes.get(chain.start * 1e7 + chain.end),
    );
    if (reason) {
      rewrites.push({ file, line: setup.line, rewritten: false, reason });
      continue;
    }
    const calls: string[] = [];
    const components: string[] = [];
    removable.add(chain.root);
    for (const plugin of setup.plugins) {
      removable.add(plugin.name);
      const use = plugin.mapping.use;
      if (!plugin.mapping.call || !use) continue;
      const name = local(use.name, use.from);
      const call = plugin.mapping.call
        .replace(use.name, () => name)
        .replace("$options", () => plugin.options ?? "");
      if (calls.includes(call)) continue;
      calls.push(call);
      want(use.from, use.named ? use.name : "default", name, Boolean(use.named));
      if (plugin.mapping.component) {
        const component = local(plugin.mapping.component, use.from);
        want(use.from, plugin.mapping.component, component, true);
        components.push(
          component === plugin.mapping.component
            ? component
            : `${plugin.mapping.component}: ${component}`,
        );
      }
    }
    const render = local("renderHtml", "@comark/html");
    const options = local("comarkOptions", "remark-to-comark/setup");
    want("@comark/html", "renderHtml", render, true);
    want("remark-to-comark/setup", "comarkOptions", options, true);
    const names = setup.plugins.map((plugin) => plugin.name);
    const settings = [
      ...(calls.length ? [`plugins: [${calls.join(", ")}]`] : []),
      ...(keepsHtml(setup) ? [] : ["html: false"]),
      // Comark's setup reads GFM and frontmatter; a chain without them must not start parsing either.
      ...(names.includes("remark-gfm") ? [] : ["gfm: false"]),
      ...(names.includes("remark-frontmatter") ? [] : ["frontmatter: false"]),
    ];
    const parser = `${options}(${settings.length ? `{ ${settings.join(", ")} }` : ""})`;
    code.overwrite(
      chain.start,
      chain.end,
      `${render}(${chain.input}, ${components.length ? `{ ...${parser}, components: { ${components.join(", ")} } }` : parser})`,
    );
    done.push([chain.start, chain.end]);
    rewrites.push({ file, line: setup.line, rewritten: true });
  }
  if (!done.length) return { code: source, rewrites };

  // Drop an import declaration of replaced plugins once none of its bindings is read outside the replaced chains, in
  // this script or the rest of the component. Side-effect imports and partly used declarations stay.
  const outsideChains = (node: Node) =>
    !done.some(([start, end]) => node.start >= start && node.end <= end);
  for (const declaration of info.imports) {
    if (!removable.has(declaration.source) || !declaration.specifiers.length) continue;
    const used = declaration.specifiers.some(
      (specifier) =>
        (info.references.get(specifier.local) ?? []).some(outsideChains) ||
        outsideWords.has(specifier.local),
    );
    if (used) continue;
    let end = declaration.node.end;
    while (source[end] === " " || source[end] === "\t") end++;
    if (source[end] === "\r") end++;
    if (source[end] === "\n") end++;
    code.remove(declaration.node.start, end);
  }
  const lines: string[] = [];
  for (const [from, { names, defaultName }] of imports) {
    const parts = [
      ...(defaultName ? [defaultName] : []),
      ...(names.size ? [`{ ${[...names].join(", ")} }`] : []),
    ];
    if (parts.length) lines.push(`import ${parts.join(", ")} from "${from}";`);
  }
  if (!lines.length) return { code: code.toString(), rewrites };
  const lastImport = info.imports.at(-1);
  if (lastImport) {
    let end = lastImport.node.end;
    while (end < source.length && source[end] !== "\n") end++;
    if (end < source.length) code.appendRight(end + 1, `${lines.join("\n")}\n`);
    else code.append(`\n${lines.join("\n")}\n`);
  } else code.prepend(`${lines.join("\n")}\n`);
  return { code: code.toString(), rewrites };
}
