import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { addStyles, start } from "./client.ts";

export { default, RAIL_TAG } from "./index.ts";
export type {
  OutlineMeta,
  OutlineOptions,
  RailAttributes,
  RailOptions,
  TocAttributes,
} from "./index.ts";

/** `::toc` for `@comark/vue`. */
export const Toc = defineComponent({
  name: "Toc",
  inheritAttrs: false,
  props: { title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const list = slots.default?.();
      if (!list?.length) return null;
      return h("nav", { class: "cto", "aria-label": props.title || "Contents" }, [
        props.title ? h("p", { class: "cto-title" }, props.title) : null,
        list,
      ]);
    };
  },
});

/** The side outline for `@comark/vue`. It starts the script that places it when it mounts. */
export const TocRail = defineComponent({
  name: "TocRail",
  inheritAttrs: false,
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    let stop: (() => void) | undefined;
    onMounted(() => {
      addStyles();
      stop = start();
    });
    onBeforeUnmount(() => stop?.());
    return () =>
      h("nav", { class: "cto cto-rail", "aria-label": props.title }, [
        h("p", { class: "cto-title" }, props.title),
        slots.default?.(),
      ]);
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Toc, TocRail };
