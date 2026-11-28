import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { PostAttributes, SocialMeta, SocialOptions } from "./index.ts";

/** `::post` for `@comark/vue`. */
export const Post = defineComponent({
  name: "Post",
  inheritAttrs: false,
  props: { platform: String, label: String, quote: { type: String, default: undefined } },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const outer = props.quote === undefined;
      return h(
        "article",
        {
          class: "csl",
          "data-platform": props.platform || "generic",
          "data-quote": outer ? undefined : "",
          "data-comark-frame": outer ? "" : undefined,
          "data-not-typeset": outer ? "" : undefined,
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Post };
