import type { NodeHandler } from "comark";
import { summary } from "./client.ts";
import { css } from "./styles.ts";
import { rawText } from "../../../shared/text.ts";
import { attr } from "../../../shared/html.ts";

export { default } from "./index.ts";
export type { TestsAttributes, TestsMeta, TestsOptions, TestsReader } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const count = (value: unknown) => Number(value) || 0;

const tests: NodeHandler = async ([, attrs, ...children], state) => {
  const styles = styled.has(state.context) ? "" : `<style data-comark-tests>${css}</style>`;
  styled.add(state.context);
  const failed = count(attrs.failed);
  const counts = summary({ passed: count(attrs.passed), failed, skipped: count(attrs.skipped) });
  const title = rawText(attrs.title);
  return (
    `${styles}<section class="ctr" data-status="${failed ? "failed" : "passed"}" aria-label="${attr(title || "Test results")}"><p class="ctr-summary">` +
    (title ? `<strong class="ctr-title">${attr(title)}</strong>` : "") +
    counts
      .map(({ kind, text }) => `<span class="ctr-count" data-kind="${kind}">${text}</span>`)
      .join("") +
    (attrs.duration ? `<span class="ctr-time">${attr(attrs.duration)}</span>` : "") +
    `</p>${children.length ? await state.flow(["div", {}, ...children], state) : ""}</section>`
  );
};

/** The HTML renderer for `::tests`. Pass it as `components`; it inlines the styles once per document. */
export const components: Record<"tests", NodeHandler> = { tests };
