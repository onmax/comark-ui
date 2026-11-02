import MagicString from "magic-string";
import type {
  BindingIdentifier,
  BindingPattern,
  BindingRestElement,
  ImportDeclaration,
  Node,
  ParamPattern,
  Program,
} from "oxc-parser";
import { parseSync, visitorKeys } from "oxc-parser";
import { parseScript, scanSource, type Call, type FoundPlugin, type Setup } from "./scan.ts";
import { lineOffset, scriptBlocks } from "./sfc.ts";

export interface Rewrite {
  file: string;
  line: number;
  /** Whether the call was replaced; otherwise `reason` says why it was left. */
  rewritten: boolean;
  reason?: string;
}

export interface RewriteResult {
  code: string;
  rewrites: Rewrite[];
}

/** What the rewrite knows about the rest of the project, which one file can't tell it. */
export interface RewriteContext {
  /** The marked range the file's package declares, which decides the settings that copy how that version read Markdown. */
  version?: string;
  /**
   * Files elsewhere in the project that configure the shared `marked` (`marked.use()`, `marked.setOptions()`). Its
   * settings reach every call, so a call on it is rewritten only when this is empty.
   */
  shared?: string[];
  /** Files elsewhere that call the shared `marked`, which still need this file's `marked.use()` once its calls are rewritten. */
  callers?: string[];
}

const REWRITABLE = new Set(["pipeline", "setup", "builtin", "plugin", "port"]);
/** What the rewrite needs to know about a script's bindings, from one parse: no regexes over source. */
interface Facts {
  /** Every identifier name in the file, bound or not (`Math`, a parameter), so a new import never shadows one. */
  names: Set<string>;
  /** Names bound by something other than an import: parameters, variables, functions, classes. */
  shadowed: Set<string>;
  /** How many times each name is bound other than by an import. */
  declared: Map<string, number>;
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
    declared: new Map(),
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
      result.declared.set(binding.name, (result.declared.get(binding.name) ?? 0) + 1);
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
  for (const node of program.body) visit(node, program);
  return result;
}

/** The lowest version a declared range allows, as `[major, minor]`, or undefined when it can't be read (a tag, a link). */
const lowest = (range: string | undefined) => {
  const match = /(\d+)(?:\.(\d+))?/.exec(range?.replace(/^npm:marked@/, "") ?? "");
  return match ? [Number(match[1]), Number(match[2] ?? 0)] : undefined;
};

/** The literal value of a setting in a setup, last write wins, or `undefined` when no place sets it. */
function setting(plugins: FoundPlugin[], name: string): string | undefined {
  return plugins
    .filter((plugin) => plugin.type === "option" && plugin.name === name)
    .at(-1)
    ?.options?.trim();
}

/** The plugins a call renders with: its setup's, plus the options written on the call itself. */
function pluginsFor(setup: Setup, call: Call): FoundPlugin[] {
  // The call's own options override the setup's, whatever their order in the file.
  return [
    ...setup.plugins.filter((plugin) => plugin.call === undefined),
    ...setup.plugins.filter((plugin) => plugin.call === call.start),
  ];
}

/**
 * The statements that only configure a setup: `marked.use(…)` and `marked.setOptions(…)` for the shared `marked`, and
 * an instance's declaration and its own `use` calls. Undefined when the instance is read anywhere else.
 */
function configuration(
  program: Program,
  setup: Setup,
  info: Facts,
  outside: Set<string>,
): [number, number][] | undefined {
  const ranges: [number, number][] = [];
  const markedNames = info.imports
    .filter((item) => item.source === "marked")
    .flatMap((item) => item.specifiers);
  const isShared = (node: Node) =>
    node.type === "Identifier" &&
    markedNames.some(
      (specifier) =>
        specifier.local === node.name &&
        (specifier.imported === "marked" ||
          specifier.imported === "default" ||
          specifier.imported === "*"),
    );
  const isConfig = (expression: Node): boolean => {
    if (expression.type !== "CallExpression") return false;
    const callee = expression.callee;
    if (callee.type === "Identifier")
      return (
        setup.host === "marked" &&
        markedNames.some(
          (specifier) =>
            specifier.local === callee.name && /^(use|setOptions)$/.test(specifier.imported),
        )
      );
    if (
      callee.type !== "MemberExpression" ||
      callee.computed ||
      callee.property.type !== "Identifier" ||
      !/^(use|setOptions)$/.test(callee.property.name)
    )
      return false;
    return setup.host === "marked"
      ? isShared(callee.object)
      : callee.object.type === "Identifier" && callee.object.name === setup.binding;
  };
  for (const statement of program.body) {
    if (statement.type === "ExpressionStatement" && isConfig(statement.expression))
      ranges.push([statement.start, statement.end]);
    if (
      setup.host === "instance" &&
      statement.type === "VariableDeclaration" &&
      statement.declarations.length === 1 &&
      statement.declarations[0]!.id.type === "Identifier" &&
      statement.declarations[0]!.id.name === setup.binding
    )
      ranges.push([statement.start, statement.end]);
  }
  // Every read of the instance, or of the shared `marked`, must be one of the setup's calls or the statements removed
  // with it: an alias, an export, or a template that reads it still needs its configuration.
  const accounted = (node: Node) =>
    ranges.some(([start, end]) => node.start >= start && node.end <= end) ||
    setup.calls.some((call) => node.start >= call.start && node.end <= call.end);
  if (setup.host === "instance") {
    if (!setup.binding || ranges.length === 0 || outside.has(setup.binding.replace(/^this\./, "")))
      return undefined;
    if (!(info.references.get(setup.binding) ?? []).every(accounted)) return undefined;
  } else {
    const shared = markedNames.filter((specifier) =>
      /^(marked|default|\*)$/.test(specifier.imported),
    );
    if (
      shared.some(
        (specifier) =>
          outside.has(specifier.local) ||
          !(info.references.get(specifier.local) ?? []).every(accounted),
      )
    )
      return undefined;
  }
  return ranges;
}

/** Why a call can't become `renderHtml(markdown, comarkOptions(…))` without changing what it does, if it can't. */
function blocker(
  setup: Setup,
  call: Call,
  plugins: FoundPlugin[],
  file: string,
  info: Facts,
  node: Node | undefined,
  context: RewriteContext,
): string | undefined {
  if (setup.unresolved) return setup.unresolved.replace(/^\S+ /, "");
  const blocked = plugins.filter((plugin) => !REWRITABLE.has(plugin.mapping.kind));
  if (blocked.length) {
    const own = blocked.flatMap((plugin) =>
      plugin.mapping.kind === "custom" ? [`\`${plugin.name}\``] : [],
    );
    const missing = blocked.flatMap((plugin) =>
      plugin.mapping.kind === "custom"
        ? []
        : [plugin.type === "option" ? `\`${plugin.name}: ${plugin.options ?? ""}\`` : plugin.name],
    );
    return [
      own.length && `uses the project's own code (${own.join(", ")})`,
      missing.length &&
        `${missing.join(", ")} ${missing.length > 1 ? "have" : "has"} no Comark counterpart`,
    ]
      .filter(Boolean)
      .join("; ");
  }
  const dropped = plugins.find(
    (plugin) =>
      plugin.type === "extension" && plugin.options && !plugin.mapping.call?.includes("$options"),
  );
  if (dropped)
    return `passes options to ${dropped.name} that Comark's counterpart doesn't take; port them by hand`;
  if (setup.host === "marked" && context.shared?.length)
    return `calls the shared \`marked\`, which ${context.shared.slice(0, 2).join(", ")}${context.shared.length > 2 ? ", and others" : ""} also configure; their settings reach every call, so move them together by hand`;
  if (setup.commonjs || file.endsWith(".cjs") || !info.imports.length)
    return "is CommonJS; the rewrite emits ES imports";
  if (call.method === "tokens")
    return "works on marked's tokens (`lexer`, `parser`); Comark's tree replaces them, so port that code to the nodes `parseMarkdown()` from comark returns";
  if (call.method === "parseInline")
    return "renders inline Markdown only (`parseInline`); `renderHtml` reads blocks too and wraps text in `<p>`";
  if (call.args > 2) return "passes a callback; `renderHtml` returns a promise";
  if (!call.input) return "passes no Markdown";
  if (!node) return "couldn't be located in the file";
  const names = plugins.flatMap((plugin) => (plugin.type === "extension" ? [plugin.name] : []));
  const repeated = names.find((name, index) => names.indexOf(name) !== index);
  if (repeated) return `registers ${repeated} more than once; which options win can't be read`;
  // A local `marked` (a parameter, say) may not be the import at all, and a second `md` may not be the instance.
  if (
    call.callee &&
    (setup.host === "marked"
      ? info.shadowed.has(call.callee)
      : (info.declared.get(call.callee) ?? 0) > 1)
  )
    return `calls \`${call.callee}\`, which is also bound locally, so whether it's marked can't be known`;
  const shadowed = plugins.find((plugin) => plugin.local && info.shadowed.has(plugin.local));
  if (shadowed)
    return `\`${shadowed.local}\` is also bound locally (a parameter or variable), so which extension it is can't be known`;
  if (isAsync(setup, plugins)) return undefined;
  // marked returns the HTML string; renderHtml a promise of it. Awaiting it is only possible in an async function.
  const fn = enclosingFunction(node, info.parent);
  if (!fn || !("async" in fn) || !fn.async)
    return fn
      ? "runs in a function that isn't async; `renderHtml` returns a promise, so the function and its callers would change. Make it async, then run the rewrite again"
      : "runs at the top of the module; `renderHtml` returns a promise, so await it in an async function, then run the rewrite again";
  // An async function's parameter defaults, and a class field or static block inside it, can't `await`.
  const params = fn.params;
  if (params.length && node.start >= params[0]!.start && node.end <= params.at(-1)!.end)
    return "runs in a parameter's default value, where `await` isn't allowed; move it into the function body";
  for (let up = info.parent.get(node); up && up !== fn; up = info.parent.get(up))
    if (
      up.type === "PropertyDefinition" ||
      up.type === "AccessorProperty" ||
      up.type === "StaticBlock"
    )
      return "runs in a class field or static block, where `await` isn't allowed; move it into an async method";
  return undefined;
}

/**
 * Whether marked already returns a promise here: `async: true`, set anywhere in the setup or on the call, or an async
 * extension such as `markedHighlight({ async: true })`.
 */
const isAsync = (setup: Setup, plugins: FoundPlugin[]) =>
  setting(plugins, "async") === "true" ||
  plugins.some((plugin) => plugin.type === "extension" && topLevelTrue(plugin.options, "async"));

/** Whether an options object literal sets `name: true` at its top level, not in a nested object or function. */
function topLevelTrue(options: string | undefined, name: string): boolean {
  if (!options) return false;
  const statement = parseSync("options.ts", `(${options})`).program.body[0];
  let object = statement?.type === "ExpressionStatement" ? statement.expression : undefined;
  while (object?.type === "ParenthesizedExpression") object = object.expression;
  return (
    object?.type === "ObjectExpression" &&
    object.properties.some(
      (property) =>
        property.type === "Property" &&
        !property.computed &&
        property.key.type === "Identifier" &&
        property.key.name === name &&
        property.value.type === "Literal" &&
        property.value.value === true,
    )
  );
}

function enclosingFunction(node: Node, parent: WeakMap<Node, Node>): Node | undefined {
  for (let up = parent.get(node); up; up = parent.get(up)) if (isFunction(up)) return up;
  return undefined;
}

/** What `comarkOptions()` needs for the call: the settings its options map to, and the plugins its extensions become. */
function comarkSettings(plugins: FoundPlugin[], context: RewriteContext) {
  const settings = new Set<string>();
  // An option set twice (`setOptions({ breaks: true })`, then `{ breaks: false }`) takes its last value, as in marked.
  const last = new Map<string, FoundPlugin>();
  for (const plugin of plugins)
    last.set(plugin.type === "option" ? plugin.name : `${plugin.type}:${plugin.name}`, plugin);
  for (const plugin of last.values())
    if (plugin.mapping.setting) settings.add(plugin.mapping.setting);
  const version = lowest(context.version);
  const ids =
    version && version[0] === 0 && version[1] < 6 ? `headerIds: "legacy"` : "headerIds: true";
  settings.delete("headerIds: true");
  // marked gave headings ids by default until v7.
  if (version && version[0] < 7 && setting(plugins, "headerIds") !== "false") settings.add(ids);
  else if (setting(plugins, "headerIds") === "true") settings.add(ids);
  if (version && version[0] >= 1 && version[0] < 18) settings.add("underscoreTags: true");
  if (version && version[0] < 4) settings.add(`expandTabs: "all"`);
  else if (version && version[0] < 14) settings.add(`expandTabs: "leading"`);
  if (version && version[0] === 0 && version[1] < 4) settings.add("legacyTables: true");
  if (version && version[0] === 0 && version[1] < 4 && !setting(plugins, "langPrefix"))
    settings.add(`langPrefix: "lang-"`);
  // A prefix only matters with ids.
  if (!settings.has(ids))
    for (const item of settings) if (item.startsWith("headerPrefix:")) settings.delete(item);
  return [...settings];
}

/**
 * Replaces each marked call that renders Markdown to HTML (`marked(md)`, `marked.parse(md)`, `instance.parse(md)`) with
 * `renderHtml` from `@comark/html` on `comarkOptions()`, adds the imports, and drops the marked imports nothing else
 * uses. A call whose behavior the replacement wouldn't keep is left, with the reason.
 */
export function rewriteSource(
  source: string,
  file: string,
  context: RewriteContext = {},
): RewriteResult {
  const blocks = scriptBlocks(source, file);
  if (!blocks) return rewriteScript(source, file, context);
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  if (
    sorted.some(
      (block, index) =>
        index && block.start < sorted[index - 1]!.start + sorted[index - 1]!.code.length,
    )
  )
    return {
      code: source,
      rewrites: scanSource(source, file).flatMap((setup) =>
        setup.calls.map((call) => ({
          file,
          line: call.line,
          rewritten: false,
          reason: "sits in script blocks that overlap; rewrite it by hand",
        })),
      ),
    };
  let code = source;
  const rewrites: Rewrite[] = [];
  // From the last block back, so earlier blocks' offsets still hold after a splice.
  for (const block of [...sorted].reverse()) {
    // The rest of the component (the template, other scripts) can name an import too.
    const outside = source.slice(0, block.start) + source.slice(block.start + block.code.length);
    const result = rewriteScript(block.code, block.name, context, outside);
    const offset = lineOffset(source, block);
    rewrites.unshift(
      ...result.rewrites.map((rewrite) => ({ ...rewrite, file, line: rewrite.line + offset })),
    );
    code = code.slice(0, block.start) + result.code + code.slice(block.start + block.code.length);
  }
  return { code, rewrites };
}

function rewriteScript(
  source: string,
  file: string,
  context: RewriteContext,
  outside = "",
): RewriteResult {
  const setups = scanSource(source, file).filter((setup) => setup.calls.length);
  if (!setups.length) return { code: source, rewrites: [] };
  const { program } = parseScript(file, source);
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
  const outsideWords = new Set(outside.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const bound = new Map<string, string>();
  for (const declaration of info.imports)
    for (const specifier of declaration.specifiers)
      if (!specifier.typeOnly)
        bound.set(`${declaration.source}:${specifier.imported}`, specifier.local);
  const taken = new Set([...info.names, ...outsideWords]);
  const allocated = new Map<string, string>();
  // The binding to use for `name` from `from`: the file's own import if it has one, else a name nothing uses.
  const local = (name: string, from: string) => {
    const key = `${from}:${name}`;
    const own = bound.get(key);
    const existing = (own && !info.shadowed.has(own) ? own : undefined) ?? allocated.get(key);
    if (existing) return existing;
    let candidate = name;
    for (let suffix = 1; taken.has(candidate); suffix++)
      candidate = `${name}FromComark${suffix > 1 ? suffix : ""}`;
    taken.add(candidate);
    allocated.set(key, candidate);
    return candidate;
  };
  const want = (from: string, imported: string, as: string) => {
    if (bound.get(`${from}:${imported}`) === as) return;
    const entry = imports.get(from) ?? { names: new Set<string>() };
    if (imported === "default") entry.defaultName = as;
    else entry.names.add(as === imported ? imported : `${imported} as ${as}`);
    imports.set(from, entry);
  };
  const done: [number, number][] = [];
  // The replacements copy extension options (`highlight: (code) => hljs…`), whose names must keep their imports.
  const written: string[] = [];
  const removable = new Set<string>(["marked"]);
  for (const setup of setups) {
    for (const call of setup.calls) {
      const node = nodes.get(call.start * 1e7 + call.end);
      if (done.some(([start, end]) => call.start < end && call.end > start)) {
        rewrites.push({
          file,
          line: call.line,
          rewritten: false,
          reason: "is nested in another call being rewritten; run the rewrite again",
        });
        continue;
      }
      const plugins = pluginsFor(setup, call);
      const reason = blocker(setup, call, plugins, file, info, node, context);
      if (reason) {
        rewrites.push({ file, line: call.line, rewritten: false, reason });
        continue;
      }
      const calls: string[] = [];
      const components: string[] = [];
      for (const plugin of plugins) {
        if (plugin.type === "extension") removable.add(plugin.name);
        const use = plugin.mapping.use;
        if (!plugin.mapping.call || !use) continue;
        const name = local(use.name, use.from);
        const expression = plugin.mapping.call
          .replace(use.name, () => name)
          .replace("$options", () => plugin.options ?? "");
        if (calls.includes(expression)) continue;
        calls.push(expression);
        want(use.from, use.named ? use.name : "default", name);
        if (plugin.mapping.component) {
          const component = local(plugin.mapping.component, use.from);
          want(use.from, plugin.mapping.component, component);
          components.push(
            component === plugin.mapping.component
              ? component
              : `${plugin.mapping.component}: ${component}`,
          );
        }
      }
      const render = local("renderHtml", "@comark/html");
      const options = local("comarkOptions", "marked-to-comark/setup");
      want("@comark/html", "renderHtml", render);
      want("marked-to-comark/setup", "comarkOptions", options);
      const settings = [
        ...comarkSettings(plugins, context),
        ...(calls.length ? [`plugins: [${calls.join(", ")}]`] : []),
      ];
      const parser = `${options}(${settings.length ? `{ ${settings.join(", ")} }` : ""})`;
      let replacement = `${render}(${call.input}, ${components.length ? `{ ...${parser}, components: { ${components.join(", ")} } }` : parser})`;
      // A sync call returned the string; awaiting the promise keeps the expression a string.
      if (!isAsync(setup, plugins)) {
        const [self, up] = unwrap(node!, info.parent);
        const needsParens =
          (up?.type === "MemberExpression" && up.object === self) ||
          (up?.type === "CallExpression" && up.callee === self) ||
          up?.type === "TaggedTemplateExpression" ||
          (up?.type === "BinaryExpression" && up.operator === "**" && up.left === self);
        replacement = needsParens ? `(await ${replacement})` : `await ${replacement}`;
      }
      code.overwrite(call.start, call.end, replacement);
      written.push(replacement);
      done.push([call.start, call.end]);
      rewrites.push({ file, line: call.line, rewritten: true });
    }
  }
  if (!done.length) return { code: source, rewrites };

  // A setup whose every call was rewritten loses its `use()` and `setOptions()` statements, and an instance its
  // declaration, when nothing else reads them. The shared `marked` keeps them while other files call it.
  const removed: [number, number][] = [];
  const inside = (node: Node, ranges: [number, number][]) =>
    ranges.some(([start, end]) => node.start >= start && node.end <= end);
  for (const setup of setups) {
    if (
      !setup.calls.every((call) =>
        done.some(([start, end]) => start === call.start && end === call.end),
      )
    )
      continue;
    if (setup.host === "marked" && (context.shared?.length || context.callers?.length)) continue;
    const statements = configuration(program, setup, info, outsideWords);
    if (!statements) continue;
    removed.push(...statements);
  }
  for (const [start, end] of removed) {
    let stop = end;
    while (source[stop] === " " || source[stop] === "\t") stop++;
    if (source[stop] === "\r") stop++;
    if (source[stop] === "\n") stop++;
    code.remove(start, stop);
  }

  // Drop an import declaration of marked or a replaced extension once none of its bindings is read outside the
  // replaced calls, in this script or the rest of the component. Side-effect imports and partly used ones stay.
  const outsideCalls = (node: Node) => !inside(node, done) && !inside(node, removed);
  for (const declaration of info.imports) {
    if (!removable.has(declaration.source) || !declaration.specifiers.length) continue;
    const used = declaration.specifiers.some(
      (specifier) =>
        (info.references.get(specifier.local) ?? []).some(outsideCalls) ||
        outsideWords.has(specifier.local) ||
        written.some((text) =>
          new RegExp(`(?<![\\w$])${specifier.local.replace(/\$/g, "\\$")}(?![\\w$])`).test(text),
        ),
    );
    if (used) continue;
    let end = declaration.node.end;
    while (source[end] === " " || source[end] === "\t") end++;
    if (source[end] === "\r") end++;
    if (source[end] === "\n") end++;
    code.remove(declaration.node.start, end);
  }
  const lines = [...imports].map(([from, { names, defaultName }]) => {
    const parts = [
      ...(defaultName ? [defaultName] : []),
      ...(names.size ? [`{ ${[...names].join(", ")} }`] : []),
    ];
    return `import ${parts.join(", ")} from "${from}";`;
  });
  const lastImport = info.imports.at(-1);
  if (lastImport) {
    let end = lastImport.node.end;
    while (end < source.length && source[end] !== "\n") end++;
    if (end < source.length) code.appendRight(end + 1, `${lines.join("\n")}\n`);
    else code.append(`\n${lines.join("\n")}\n`);
  } else code.prepend(`${lines.join("\n")}\n`);
  return { code: code.toString(), rewrites };
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
