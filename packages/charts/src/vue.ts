import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { bar, css, start } from "./client.ts";

export { default } from "./index.ts";
export type { ChartsMeta, ChartsOptions, DrawnChart } from "./index.ts";

/** A chart for `@comark/vue`. Its marks are drawn only by `@comark/html`. */
export const Chart = defineComponent({
  name: "Chart",
  inheritAttrs: false,
  props: { type: String, title: String, svg: String },
  setup(props, { slots }) {
    let stop = () => {};
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop());
    return () =>
      props.svg
        ? h("figure", { class: "cch", "data-type": props.type }, [
            props.title ? h("figcaption", props.title) : null,
            h("div", { class: "cch-plot", innerHTML: props.svg }),
            h("div", { class: "cch-bar", innerHTML: bar() }),
            h("details", { class: "cch-data" }, [h("summary", "Data"), slots.default?.()]),
          ])
        : h("div", slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Chart };
