import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { CastAttributes, CastMeta, CastOptions, CastReader } from "./index.ts";

/** `::cast` for `@comark/vue`. */
export const Cast = defineComponent({
  name: "Cast",
  inheritAttrs: false,
  props: { mode: String, title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      props.mode
        ? h("figure", { class: "cca", "data-mode": props.mode }, [
            props.title ? h("figcaption", props.title) : null,
            h("pre", { class: "cca-term" }, slots.default?.()),
          ])
        : null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Cast };
