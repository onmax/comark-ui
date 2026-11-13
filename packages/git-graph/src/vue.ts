import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { GitGraphAttributes, GitGraphLinesAttributes, GitGraphMeta } from "./index.ts";

/** `::git-graph` for `@comark/vue`. */
export const GitGraph = defineComponent({
  name: "GitGraph",
  inheritAttrs: false,
  props: { label: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "figure",
        {
          class: "cgg",
          "data-comark-frame": "",
          "data-not-typeset": "",
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
  },
});

/** The lines and dots of a `::git-graph`, an SVG the parse plugin drew and escaped. */
export const GitGraphLines = defineComponent({
  name: "GitGraphLines",
  inheritAttrs: false,
  props: { svg: String, width: Number, height: Number },
  setup(props) {
    return () => h("div", { class: "cgg-lines", innerHTML: props.svg ?? "" });
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { GitGraph, GitGraphLines };
