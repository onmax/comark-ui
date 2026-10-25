import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { colors, default } from "./index.ts";
export type { BadgeAttributes, BadgeColor, BadgeMeta, BadgeOptions } from "./index.ts";

/** `:badge` for `@comark/vue`. */
export const Badge = defineComponent({
  name: "Badge",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: { color: { type: String, default: "primary" }, src: String, label: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      props.src
        ? h("img", { class: "cb-image", src: props.src, alt: props.label ?? "Badge", height: 26 })
        : h("span", { class: "cb", "data-color": props.color }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Badge };
