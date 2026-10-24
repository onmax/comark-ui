import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default, LANGUAGES, sanitizeSvg } from "./index.ts";
export type { DiagramAttributes, DiagramsMeta, DiagramsOptions } from "./index.ts";

/** Diagrams for `@comark/vue`. */
export const Diagram = defineComponent({
  name: "Diagram",
  inheritAttrs: false,
  props: { type: String, svg: String, label: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.svg
        ? h("figure", { class: "cdg", "data-type": props.type }, [
            // The plugin sanitized the SVG when it drew it.
            h("div", {
              class: "cdg-svg",
              role: props.label ? "img" : undefined,
              "aria-label": props.label || undefined,
              innerHTML: props.svg,
            }),
            props.label ? h("figcaption", props.label) : null,
          ])
        : null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Diagram };
