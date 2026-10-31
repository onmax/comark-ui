import type { NodeHandler } from "comark";
import { allow, icons, referrerPolicy } from "./client.ts";
import { css } from "./styles.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { EmbedAttributes, EmbedMeta, Size } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const icon = (d: string) =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

const embed: NodeHandler = ([, attrs], state) => {
  const { provider, src, label, size, href, title, host } = attrs;
  if (!href) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-embed>${css}</style>`;
  styled.add(state.context);
  if (!src)
    return `${styles}<a class="ce-card" href="${attr(href)}">${icon(icons.globe)}<strong>${attr(title)}</strong> <span>${attr(host)}</span></a>`;
  return (
    `${styles}<figure class="ce" data-provider="${attr(provider)}" data-size="${attr(size)}"><div class="ce-frame">` +
    `<iframe src="${attr(src)}" title="${attr(label)}" loading="lazy" allow="${allow}" allowfullscreen referrerpolicy="${referrerPolicy}"></iframe></div>` +
    `<figcaption><a href="${attr(href)}">${attr(title)}${icon(icons.external)}</a></figcaption></figure>`
  );
};

/** The HTML renderer for `::embed`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"embed", NodeHandler> = { embed };
