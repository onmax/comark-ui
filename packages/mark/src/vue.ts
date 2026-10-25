import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";

// The tag renders as it would without the components, with the class beside any the Markdown gave it; Vue merges them.
const classed = (tag: string, name: string) =>
  defineComponent({
    name: tag.charAt(0).toUpperCase() + tag.slice(1),
    setup(_props, { slots }) {
      onMounted(addStyles);
      return () => h(tag, { class: name }, slots.default?.());
    },
  });

export const Mark = classed("mark", "cmk-mark");
export const Sup = classed("sup", "cmk-sup");

/** Pass these as `components` to `@comark/vue`. */
export const components = { Mark, Sup };
