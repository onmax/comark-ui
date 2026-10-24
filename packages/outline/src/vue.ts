import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { TocAttributes, OutlineMeta } from "./index.ts";

/** `::toc` for `@comark/vue`. */
export const Toc = defineComponent({
  name: "Toc",
  inheritAttrs: false,
  props: { title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const list = slots.default?.();
      if (!list?.length) return null;
      return h("nav", { class: "cto", "aria-label": props.title || "Contents" }, [
        props.title ? h("p", { class: "cto-title" }, props.title) : null,
        list,
      ]);
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Toc };
