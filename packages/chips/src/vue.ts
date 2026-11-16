import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { CHIP_TAG, chipNode, default } from "./index.ts";
export type { ChipsMeta, ChipsOptions } from "./index.ts";

/** A chip for `@comark/vue`. */
export const Chip = defineComponent({
  name: "Chip",
  inheritAttrs: false,
  props: { href: String, kind: String, src: String, title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h("a", { class: "cp", href: props.href, "data-kind": props.kind, title: props.title }, [
        props.src ? h("img", { class: "cp-img", src: props.src, alt: "" }) : null,
        slots.default?.(),
      ]);
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Chip };
