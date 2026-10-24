import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type { FieldAttributes, FieldsMeta } from "./index.ts";

/** `::field` for `@comark/vue`. */
export const Field = defineComponent({
  name: "Field",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: { name: String, type: String, required: [String, Boolean], default: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h("div", { class: "cfl" }, [
        h("div", { class: "cfl-head" }, [
          props.name ? h("code", { class: "cfl-name" }, props.name) : null,
          props.type ? h("span", { class: "cfl-type" }, props.type) : null,
          props.required ? h("span", { class: "cfl-required" }, "required") : null,
          props.default
            ? h("span", { class: "cfl-default" }, ["Default: ", h("code", props.default)])
            : null,
        ]),
        h("div", { class: "cfl-body" }, slots.default?.()),
      ]);
  },
});

/** `::field-group` for `@comark/vue`. */
export const FieldGroup = defineComponent({
  name: "FieldGroup",
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("div", { class: "cfl-group" }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Field, FieldGroup };
