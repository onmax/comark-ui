import type { ElementNode } from "comark";
import type { NodeHandler, RenderMarkdownOptions } from "comark/render";
import { indent } from "comark/utils";

// Nodes the codec writes itself, rather than through the handler Comark's writer picks by tag. Keyed by node, so a
// component named like a Markdown element, such as `:comment` or `::table`, still writes as a component.
const handlers = new WeakMap<ElementNode, NodeHandler>();

const isElement = (node: unknown): node is ElementNode => Array.isArray(node) && node[0] !== null;

/** Marks `node` to be written by `handler`. */
export function own(node: ElementNode, handler: NodeHandler): ElementNode {
  handlers.set(node, handler);
  return node;
}

export const writeOptions: RenderMarkdownOptions = {
  headingIds: false,
  // Authors write a component's props on its line; past three, Comark moves them into a YAML block.
  maxInlineAttributes: Number.POSITIVE_INFINITY,
  components: {
    owned: {
      match: (node) => handlers.has(node),
      handler: (node, state, parent) => handlers.get(node)?.(node, state, parent) ?? "",
    },
  },
};

const TABLE = "comark-editor-table";

/**
 * A block component, `::name`. Written with no parent, since Comark indents a component inside another, and authors
 * write them flush: the colons already say how deep each one is.
 */
export const blockComponent: NodeHandler = async (node, state) => {
  const [tag, attrs, ...children] = node;
  // Comark's writer prints any element named `table` as an HTML table.
  if (tag !== "table") return state.handlers.mdc(node, state);
  return (await state.handlers.mdc([TABLE, attrs, ...children], state)).replace(TABLE, "table");
};

/** An inline component, `:name[text]{props}`, which Comark would write as a block when it's alone in its paragraph. */
export const inlineComponent: NodeHandler = async (node, state, parent) => {
  const revert = state.applyContext({ inline: true });
  try {
    return await state.handlers.mdc(node, state, parent);
  } finally {
    state.applyContext(revert);
  }
};

/**
 * A task, written as a list item with its check box added after the marker. Comark's own writer indents the blocks
 * under a task by the width of `- [ ] `, which reads them back as code.
 */
export const task =
  (checked: boolean): NodeHandler =>
  async (node, state, parent) =>
    (await state.handlers.li(node, state, parent)).replace(
      /^(- |\d+\. )/,
      `$1[${checked ? "x" : " "}] `,
    );

// A private-use character, which ends the code while Comark's writer trims it and is taken out after.
const END = "\uE000";

/** A code block that ends in blank lines, which Comark's writer trims off. */
export const trailingLines: NodeHandler = async ([tag, attrs, ...children], state) => {
  const written = await state.handlers.pre([tag, attrs, ...children, END], state);
  const at = written.lastIndexOf(END);
  return written.slice(0, at) + written.slice(at + END.length);
};

/** Inline content between two delimiters, such as `{++` and `++}`. */
export const between =
  (open: string, close: string): NodeHandler =>
  async (node, state) =>
    `${open}${await state.flow(node, state)}${close}`;

/** `{~~old~>new~~}`, from its `del` and `ins` halves. */
export const substitution: NodeHandler = async ([, , removed, added], state) => {
  const flow = async (half: ElementNode[number]) =>
    isElement(half) ? state.flow(half, state) : "";
  return `{~~${await flow(removed)}~>${await flow(added)}~~}`;
};

export const footnoteReference =
  (label: string): NodeHandler =>
  () =>
    `[^${label}]`;

/** `[^label]: text`, with the rest of its blocks indented under it. */
export const footnoteDefinition =
  (label: string): NodeHandler =>
  async (node, state) => {
    const content = (await state.flow(node, state)).trim();
    return `[^${label}]: ${indent(content, { width: 4, ignoreFirstLine: true })}${state.context.blockSeparator}`;
  };

/** Each term on its line, each definition after `:   ` with its blocks indented under it, and a blank line before the next term. */
export const definitionList: NodeHandler = async (node, state) => {
  let written = "";
  for (const item of node.slice(2)) {
    if (!isElement(item)) continue;
    const content = (await state.flow(item, state)).trim();
    if (item[0] === "dt") written += `${written ? "\n" : ""}${content}\n`;
    else written += `:   ${indent(content, { width: 4, ignoreFirstLine: true })}\n`;
  }
  return written.trimEnd() + state.context.blockSeparator;
};
