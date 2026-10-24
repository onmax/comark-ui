import { defineComponent, h, onMounted } from "vue";
import { addStyles, counterReset } from "./client.ts";

export { default } from "./index.ts";
export type { StepAttributes, StepsAttributes, StepsMeta } from "./index.ts";

/** `::steps` for `@comark/vue`. */
export const Steps = defineComponent({
  name: "Steps",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: { start: [String, Number] },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const reset = counterReset(props.start);
      return h(
        "ol",
        // Vue writes an empty `style` for an undefined one, so a list from 1 gets neither.
        reset
          ? { class: "cs", start: String(props.start), style: { counterReset: reset } }
          : { class: "cs" },
        slots.default?.(),
      );
    };
  },
});

/** Each step of a `::steps` for `@comark/vue`. */
export const Step = defineComponent({
  name: "Step",
  inheritAttrs: false,
  props: { index: [String, Number] },
  setup(_, { slots }) {
    return () => h("li", { class: "cs-step" }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Steps, Step };
