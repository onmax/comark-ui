import { defineComponent, h, onMounted } from "vue";
import { addStyles, classOf } from "./client.ts";

export { default, KATEX_TAGS, MATHML_TAGS } from "./index.ts";
export type { FormulaAttributes, MathMeta, MathOptions, MathOutput } from "./index.ts";

/** Math for `@comark/vue`. The typeset MathML arrives as its default slot. */
export const Formula = defineComponent({
  name: "Formula",
  inheritAttrs: false,
  props: { tex: String, display: Boolean },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const math = slots.default?.();
      return math?.length
        ? h("span", { class: classOf(props.display, true) }, math)
        : h("span", { class: classOf(props.display, false) }, props.tex ?? "");
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Formula };
