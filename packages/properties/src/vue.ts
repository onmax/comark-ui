import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/vue`. */
export const Properties = defineComponent({
  name: "Properties",
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => {
      const rows = slots.default?.();
      return rows?.length ? h("dl", { class: "cfm" }, rows) : null;
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Properties };
