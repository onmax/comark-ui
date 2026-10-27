import type { NodeHandler, State } from "comark";
import { resolveAttributes } from "comark/render";
import { escapeHtml } from "comark/utils";
import { start } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { MagicMoveMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The magic move script as one inline `<script>`, once per render. */
export function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-magic-move>${css}</style><script>(${start.toString()})("")</script>`;
}

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? undefined
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);

// `:bound` props resolve the way Comark's Vue, React, and Svelte renderers resolve them, so all four agree.
const props = (attrs: Record<string, unknown>, state: State) =>
  resolveAttributes(attrs, state.renderData, { parseJson: true });

const namespaces = new WeakMap<object, string>();
const idFor = (uid: unknown, state: State) => {
  let namespace = namespaces.get(state.context);
  if (!namespace) {
    // HTML fragments can be rendered independently, even in separate processes, then joined on one page.
    namespace = Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
      part.toString(16).padStart(8, "0"),
    ).join("");
    namespaces.set(state.context, namespace);
  }
  return attr(`${text(uid) ?? "cmv"}-${namespace}`);
};

const tab = (uid: string, label: string, index: number) =>
  `<button type="button" class="cmv-tab" role="tab" id="${uid}-tab-${index}" aria-controls="${uid}-panel-${index}" aria-selected="${index === 1}" tabindex="${index === 1 ? 0 : -1}">${escapeHtml(label)}</button>`;

const magicMove: NodeHandler = async ([, attrs, ...children], state) => {
  const { uid, labels, title } = props(attrs, state);
  const id = idFor(uid, state);
  const name = text(title);
  const tabs = (Array.isArray(labels) ? labels.map(String) : []).map((label, at) =>
    tab(id, label, at + 1),
  );
  return (
    `<div class="cmv"><div class="cmv-list" role="tablist"${name ? ` aria-label="${attr(name)}"` : ""}>${tabs.join("")}</div>` +
    `<div class="cmv-stage">${await state.flow(["div", {}, ...children], state)}</div></div>${runtime(state)}`
  );
};

const step: NodeHandler = async ([, attrs, ...children], state) => {
  const { uid, index, label } = props(attrs, state);
  const at = attr(text(index) ?? "");
  const base = idFor(uid, state);
  return (
    `<div class="cmv-step" role="tabpanel" id="${base}-panel-${at}" aria-labelledby="${base}-tab-${at}" tabindex="0"${Number(index) > 1 ? " data-inactive" : ""}>` +
    `<div class="cmv-caption">${escapeHtml(text(label) ?? "")}</div>${await state.flow(["div", {}, ...children], state)}</div>`
  );
};

/** HTML renderers for `::magic-move` and its steps. Pass them as `components`. */
export const components: Record<"magic-move" | "magic-move-step", NodeHandler> = {
  "magic-move": magicMove,
  "magic-move-step": step,
};
