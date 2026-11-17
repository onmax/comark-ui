import { defineComponent, h, onBeforeUnmount, onMounted, onUpdated, shallowRef } from "vue";
import { start } from "./client.ts";

export { default } from "./index.ts";
export type { PropertiesMeta, PropertiesOptions } from "./index.ts";

/** The properties box for `@comark/vue`. */
export const Properties = defineComponent({
  name: "Properties",
  inheritAttrs: false,
  setup(_, { slots }) {
    const box = shallowRef<HTMLElement>();
    let stop: (() => void) | undefined;
    const refresh = () => {
      stop?.();
      stop = box.value ? start(box.value) : undefined;
    };
    onMounted(refresh);
    onUpdated(refresh);
    onBeforeUnmount(() => stop?.());
    return () => {
      const rows = slots.default?.();
      return rows?.length
        ? h("dl", { class: "cfm", "data-comark-frame": "", ref: box }, rows)
        : null;
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Properties };
