import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default, isColor } from "./index.ts";
export type { ColorAttributes, ColorsMeta } from "./index.ts";

/** A color in inline code, or a line of a `::palette`, for `@comark/vue`. */
export const Color = defineComponent({
  name: "Color",
  inheritAttrs: false,
  props: { value: String, name: String },
  setup(props) {
    onMounted(addStyles);
    return () => {
      if (!props.value) return null;
      const style = { "--cco": props.value };
      if (props.name)
        return h("li", [
          h("span", { class: "cco-tile", style }),
          h("span", { class: "cco-name" }, props.name),
          h("span", { class: "cco-value" }, props.value),
        ]);
      return h("code", { class: "cco" }, [
        h("span", { class: "cco-swatch", style, "aria-hidden": "true" }),
        props.value,
      ]);
    };
  },
});

/** `::palette` for `@comark/vue`. */
export const Palette = defineComponent({
  name: "Palette",
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("ul", { class: "cco-palette" }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Color, Palette };
