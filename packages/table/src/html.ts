import type { NodeHandler, State } from "comark";
import { bar, start } from "./client.ts";
import { css } from "./styles.ts";

export { default, TABLE_TAG } from "./index.ts";
export type { TableAttributes, TableMeta, TableOptions, TableReader } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

/** The table script as one inline `<script>`, once per render. */
function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  // The styles come inline before the script, so the script has nothing to add.
  return `<style data-comark-table>${css}</style><script>(${start.toString()})("")</script>`;
}

const on = (value: unknown) => value === true || value === "true";

const table: NodeHandler = async ([, attrs, ...children], state) =>
  `<div class="ctb">${on(attrs.copy) ? `<div class="ctb-bar">${bar()}</div>` : ""}` +
  `<div class="ctb-scroll">${await state.flow(["div", {}, ...children], state)}</div></div>${runtime(state)}`;

/** The HTML renderer for tables. Pass it as `components`; it inlines the script and styles once per document. */
export const components: Record<"data-table", NodeHandler> = { "data-table": table };
