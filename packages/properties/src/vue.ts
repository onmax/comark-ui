import { defineComponent, h, onMounted, onUpdated, shallowRef } from "vue";
import { addStyles, localizeDates } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/vue`. */
export const Properties = defineComponent({
  name: "Properties",
  inheritAttrs: false,
  setup(_, { slots }) {
    const box = shallowRef<HTMLElement>();
    const localize = () => box.value && localizeDates(box.value);
    onMounted(() => {
      addStyles();
      localize();
    });
    onUpdated(localize);
    return () => {
      const rows = slots.default?.();
      return rows?.length ? h("dl", { class: "cfm", ref: box }, rows) : null;
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Properties };
