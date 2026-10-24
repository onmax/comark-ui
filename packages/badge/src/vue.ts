import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { colors, default } from "./index.ts";
export type { BadgeAttributes, BadgeColor, BadgeMeta } from "./index.ts";

/** `:badge` for `@comark/vue`. */
export const Badge = defineComponent({
  name: "Badge",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: { color: { type: String, default: "primary" } },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => h("span", { class: "cb", "data-color": props.color }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Badge };
