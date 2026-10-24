import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { viewBox } from "./client.ts";
import { css } from "./styles.ts";

export { default } from "./index.ts";
export type { QrAttributes, QrMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });
// SAFETY: the parse plugin writes every attribute the renderer reads as a string or a number.
const str = (value: unknown) => (value === undefined ? "" : String(value as string | number));

const qr: NodeHandler = ([, attrs], state) => {
  const path = str(attrs.path);
  if (!path) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-qr>${css}</style>`;
  styled.add(state.context);
  return (
    `${styles}<span class="cqr" role="img" aria-label="QR code: ${attr(str(attrs.value))}">` +
    `<svg viewBox="${viewBox(Number(attrs.size))}" width="128" height="128" aria-hidden="true"><path d="${attr(path)}" fill="currentColor"></path></svg></span>`
  );
};

/** The HTML renderer for `:qr`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"qr", NodeHandler> = { qr };
