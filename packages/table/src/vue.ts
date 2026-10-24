import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { bar, css, start } from "./client.ts";

export { default, TABLE_TAG } from "./index.ts";
export type { TableAttributes, TableMeta, TableOptions, TableReader } from "./index.ts";

/** Tables for `@comark/vue`. */
export const DataTable = defineComponent({
  name: "DataTable",
  inheritAttrs: false,
  props: { sort: Boolean, copy: Boolean },
  setup(props, { slots }) {
    let stop = () => {};
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop());
    return () =>
      h("div", { class: "ctb" }, [
        props.copy ? h("div", { class: "ctb-bar", innerHTML: bar() }) : null,
        h("div", { class: "ctb-scroll" }, slots.default?.()),
      ]);
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { DataTable };
