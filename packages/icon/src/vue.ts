import { defineComponent, h, onMounted } from "vue";
import { addStyles, iconStyle } from "./client.ts";

export {
  createIcons,
  default,
  describeIconProblem,
  ICON_TAG,
  iconProblemRule,
  parseIconName,
} from "./index.ts";
export type {
  IconCollection,
  IconData,
  IconMeta,
  IconOptions,
  IconProblem,
  IconRule,
  Icons,
} from "./index.ts";

/** `:icon` for `@comark/vue`, and an icon for other plugins' components to draw. */
export const Icon = defineComponent({
  name: "Icon",
  inheritAttrs: false,
  props: { src: String, ratio: [String, Number], mask: [String, Boolean], label: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.src
        ? h("span", {
            class: "ci",
            "data-mask": props.mask ? "" : undefined,
            ...(props.label
              ? { role: "img", "aria-label": props.label }
              : { "aria-hidden": "true" }),
            style: iconStyle(props.src, props.ratio),
          })
        : null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Icon };
