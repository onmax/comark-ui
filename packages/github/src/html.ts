import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import { icon, typeOf } from "./icons.ts";
import { CALLOUT_TAG } from "./callouts.ts";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";

export { CALLOUT_TAG, callouts, html, HTML_TAGS, references } from "./index.ts";
export type { CalloutsOptions, CalloutType, GitHubMeta, ReferencesOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const callout: NodeHandler = async ([, attrs, ...children], state) => {
  const type = typeOf(attrs.type);
  const styles = styled.has(state.context) ? "" : `<style data-comark-github>${css}</style>`;
  styled.add(state.context);
  return (
    `${styles}<div class="cgc" data-type="${type}"><span class="cgc-icon" aria-hidden="true">${icon(type)}</span>` +
    `<p class="cgc-title">${escapeHtml(rawText(attrs.title))}</p>` +
    `<div class="cgc-body">${await state.flow(["div", {}, ...children], state)}</div></div>`
  );
};

/** The HTML renderer for callouts. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<typeof CALLOUT_TAG, NodeHandler> = { [CALLOUT_TAG]: callout };
