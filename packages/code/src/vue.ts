import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { css, parts, start } from "./client.ts";

export { default } from "./index.ts";

/** Code blocks for `@comark/vue`. */
export const Pre = defineComponent({
  name: "Pre",
  // Everything the parse plugin didn't write for the wrapper belongs to the `pre` itself, such as Shiki's class and the
  // block's language.
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    let stop = () => {};
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop());
    return () => {
      const { wrapper, pre, bar } = parts(attrs);
      return h("div", wrapper, [
        h("pre", pre, slots.default?.()),
        h("div", { class: "ck-bar", innerHTML: bar }),
      ]);
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Pre };
