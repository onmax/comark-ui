import type { NodeHandler, State } from "comark";
import { css } from "./styles.ts";

export { default } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

function styles(state: State): string {
  if (styled.has(state.context)) return "";
  styled.add(state.context);
  return `<style data-comark-mark>${css}</style>`;
}

// The tag renders as it would without the components, with the class beside any the Markdown gave it.
const classed =
  (name: string): NodeHandler =>
  async ([tag, attrs, ...children], state, parent) => {
    // The default handler writes the attributes Comark resolved for this node, not the node's own.
    const outer = state.renderData;
    const className = [name, outer.props.class ?? attrs.class].filter(Boolean).join(" ");
    state.renderData = { ...outer, props: { ...outer.props, class: className } };
    try {
      const html = await state.handlers.html(
        [tag, { ...attrs, class: className }, ...children],
        state,
        parent,
      );
      return styles(state) + html;
    } finally {
      state.renderData = outer;
    }
  };

/** The HTML renderer for highlights and superscripts. Pass it as `components`. */
export const components: Record<"mark" | "sup", NodeHandler> = {
  mark: classed("cmk-mark"),
  sup: classed("cmk-sup"),
};
