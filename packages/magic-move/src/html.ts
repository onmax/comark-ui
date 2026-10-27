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
const chevron = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

// `:bound` props resolve the way Comark's Vue, React, and Svelte renderers resolve them, so all four agree.
const props = (attrs: Record<string, unknown>, state: State) =>
  resolveAttributes(attrs, state.renderData, { parseJson: true });

const magicMove: NodeHandler = async ([, attrs, ...children], state) => {
  const { count, title } = props(attrs, state);
  const total = Number(count) || 0;
  const controls =
    total > 1
      ? `<div class="cmv-controls"><span class="cmv-count" aria-live="polite">1 / ${total}</span><div class="cmv-steps">` +
        `<button type="button" class="cmv-button" data-magic-move-step="-1" aria-label="Previous step" aria-disabled="true">${chevron("m15 18-6-6 6-6")}</button>` +
        `<button type="button" class="cmv-button" data-magic-move-step="1" aria-label="Next step">${chevron("m9 18 6-6-6-6")}</button></div></div>`
      : "";
  return (
    `<div class="cmv" role="region" aria-roledescription="code steps" aria-label="${attr(text(title) ?? "Code steps")}">` +
    `<div class="cmv-stage">${await state.flow(["div", {}, ...children], state)}</div>${controls}</div>${runtime(state)}`
  );
};

const step: NodeHandler = async ([, attrs, ...children], state) => {
  const { index, count, label } = props(attrs, state);
  const name = text(label);
  return (
    `<div class="cmv-step" role="group" aria-roledescription="step" aria-label="${attr(`${text(index) ?? ""} of ${text(count) ?? ""}`)}"${Number(index) > 1 ? " data-inactive" : ""}>` +
    `${name ? `<div class="cmv-label">${escapeHtml(name)}</div>` : ""}${await state.flow(["div", {}, ...children], state)}</div>`
  );
};

/** HTML renderers for `::magic-move` and its steps. Pass them as `components`. */
export const components: Record<"magic-move" | "magic-move-step", NodeHandler> = {
  "magic-move": magicMove,
  "magic-move-step": step,
};
