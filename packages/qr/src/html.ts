import type { NodeHandler } from "comark";
import { viewBox } from "./client.ts";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";
import { rawText } from "../../../shared/text.ts";

export { default } from "./index.ts";
export type { QrAttributes, QrMeta } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const qr: NodeHandler = ([, attrs], state) => {
  const path = rawText(attrs.path);
  if (!path) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-qr>${css}</style>`;
  styled.add(state.context);
  return (
    `${styles}<span class="cqr" role="img" aria-label="QR code: ${attr(rawText(attrs.value))}">` +
    `<svg viewBox="${viewBox(Number(attrs.size))}" width="128" height="128" aria-hidden="true"><path d="${attr(path)}" fill="currentColor"></path></svg></span>`
  );
};

/** The HTML renderer for `:qr`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"qr", NodeHandler> = { qr };
