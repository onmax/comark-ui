import { defineComponent, h, onMounted } from "vue";
import { addStyles, classOf } from "./client.ts";

export { default } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

/** Math for `@comark/vue`. */
export const Formula = defineComponent({
  name: "Formula",
  inheritAttrs: false,
  props: { tex: String, display: Boolean, html: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.html
        ? // The plugin typeset `html` itself, with links and other trusted commands off.
          h("span", { class: classOf(props.display, true), innerHTML: props.html })
        : h("span", { class: classOf(props.display, false) }, props.tex ?? "");
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Formula };
