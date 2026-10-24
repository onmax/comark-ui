import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { SourcesAttributes, SourcesMeta } from "./index.ts";

/** `::sources` for `@comark/vue`. */
export const Sources = defineComponent({
  name: "Sources",
  inheritAttrs: false,
  props: { title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const list = slots.default?.();
      if (!list?.length) return null;
      const title = props.title || "Sources";
      return h("section", { class: "cso", "aria-label": title }, [
        h("p", { class: "cso-title" }, title),
        list,
      ]);
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Sources };
