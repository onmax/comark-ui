import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type {
  BundleAttributes,
  BundleLister,
  BundleMeta,
  BundleOptions,
  BundleReader,
} from "./index.ts";

/** `::bundle` for `@comark/vue`. */
export const Bundle = defineComponent({
  name: "Bundle",
  inheritAttrs: false,
  props: { label: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "figure",
        {
          class: "cbr",
          "data-comark-frame": "",
          "data-not-typeset": "",
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Bundle };
