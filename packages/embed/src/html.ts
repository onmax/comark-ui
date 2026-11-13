import type { NodeHandler } from "comark";
import { allow, icons, referrerPolicy, start } from "./client.ts";
import { css } from "./styles.ts";
import { attr, inlineScript } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { EmbedAttributes, EmbedMeta, EmbedOptions, Player, Size } from "./index.ts";

const inline = inlineScript(`(${start.toString()})()`);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`: the one that sizes X posts. They're the same on every
 * render, so a page with a strict Content Security Policy can allow them by hash or add its nonce.
 */
export const scripts: string[] = [inline];

// Each render gets a fresh `state.context`, so a document carries the styles, and the script X posts need, once.
const styled = new WeakSet<object>();
const started = new WeakSet<object>();

const icon = (d: string) =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"></path></svg>`;

const embed: NodeHandler = ([, attrs], state) => {
  const { provider, src, label, size, height, href, title, host } = attrs;
  if (!href) return "";
  const styles = styled.has(state.context) ? "" : `<style data-comark-embed>${css}</style>`;
  styled.add(state.context);
  const script =
    provider === "x" && !started.has(state.context) ? `<script>${inline}</script>` : "";
  if (script) started.add(state.context);
  if (!src)
    return `${styles}<a class="ce-card" data-comark-frame href="${attr(href)}">${icon(icons.globe)}<strong>${attr(title)}</strong> <span>${attr(host)}</span></a>`;
  return (
    `${styles}${script}<figure class="ce" data-comark-frame data-provider="${attr(provider)}" data-size="${attr(size)}"${height ? ` style="--ce-app-height:${attr(height)}px"` : ""}><div class="ce-frame">` +
    `<iframe src="${attr(src)}" title="${attr(label)}" loading="lazy" allow="${allow}" allowfullscreen referrerpolicy="${referrerPolicy}"></iframe></div>` +
    `<figcaption><a href="${attr(href)}">${attr(title)}${icon(icons.external)}</a></figcaption></figure>`
  );
};

/**
 * The HTML renderer for `::embed`. Pass it as `components`; it inlines the styles once per document, and the script
 * that sizes X posts once per document that has one.
 */
export const components: Record<"embed", NodeHandler> = { embed };
