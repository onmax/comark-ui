import { defineComponent, onBeforeUnmount, onMounted } from "vue";
import { start } from "./client.ts";

export { default, RUNTIME_TAG } from "./index.ts";

/** Starts the motion layer while a document is on the page. The plugin adds it to every document. */
export const MotionRuntime = /* @__PURE__ */ defineComponent({
  name: "MotionRuntime",
  setup() {
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start()));
    onBeforeUnmount(() => stop?.());
    return () => null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { MotionRuntime };
