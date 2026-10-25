import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { start } from "./client.ts";

export { default, RUNTIME_TAG } from "./index.ts";
export type { ZoomOptions } from "./index.ts";
export type { ZoomDetail } from "./client.ts";

/** `::zoom` for `@comark/vue`. */
export const Zoom = /* @__PURE__ */ defineComponent({
  name: "Zoom",
  // Only the id and class pass through, as in the other renderers.
  inheritAttrs: false,
  props: { group: String, title: String },
  setup(props, { attrs, slots }) {
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start()));
    onBeforeUnmount(() => stop?.());
    return () =>
      h(
        "div",
        {
          class: ["cz", attrs.class],
          id: attrs.id,
          "data-zoom": "",
          tabindex: "0",
          "data-zoom-group": props.group,
          "data-zoom-title": props.title,
        },
        slots.default?.(),
      );
  },
});

/** Starts the zoom script for zoomable images. The plugin adds it to documents that need it. */
export const ZoomRuntime = /* @__PURE__ */ defineComponent({
  name: "ZoomRuntime",
  setup() {
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start()));
    onBeforeUnmount(() => stop?.());
    return () => null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Zoom, ZoomRuntime };
