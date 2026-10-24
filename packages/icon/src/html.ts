import type { NodeHandler, State } from "comark";
import { escapeHtml } from "comark/utils";
import { iconStyle } from "./client.ts";
import { ICON_TAG } from "./index.ts";
import { css } from "./styles.ts";

export {
  createIcons,
  default,
  describeIconProblem,
  ICON_TAG,
  iconProblemRule,
  parseIconName,
} from "./index.ts";
export type {
  IconCollection,
  IconData,
  IconMeta,
  IconOptions,
  IconProblem,
  IconRule,
  Icons,
} from "./index.ts";
export { css };

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });

/**
 * An icon as HTML: decorative, or announced as an image when it has a `label`. The styles come separately: from the
 * `icon` renderer once per document, or `css` in the page.
 */
export function iconHtml(
  icon: { src: string; ratio?: string | number; mask?: unknown },
  label?: string,
): string {
  const style = Object.entries(iconStyle(icon.src, icon.ratio))
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
  return `<span class="ci"${icon.mask ? " data-mask" : ""} ${label ? `role="img" aria-label="${attr(label)}"` : 'aria-hidden="true"'} style="${attr(style)}"></span>`;
}

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

/** The icon styles as one inline `<style>`, once per render. Other plugins' HTML renderers call it to draw icons. */
export function iconStyles(state: State): string {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-icon>${css}</style>`;
}

// SAFETY: the parse plugin writes every attribute the renderer reads as a string.
const str = (value: unknown) => (value === undefined ? "" : String(value as string));

const icon: NodeHandler = ([, attrs], state) => {
  const src = str(attrs.src);
  if (!src) return "";
  return `${iconStyles(state)}${iconHtml({ src, ratio: str(attrs.ratio), mask: attrs.mask }, str(attrs.label))}`;
};

/** The HTML renderer for `:icon`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<typeof ICON_TAG, NodeHandler> = { [ICON_TAG]: icon };
