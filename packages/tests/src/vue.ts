import { defineComponent, h, onMounted } from "vue";
import { addStyles, summary } from "./client.ts";

export { default } from "./index.ts";
export type { TestsAttributes, TestsMeta, TestsOptions, TestsReader } from "./index.ts";

/** `::tests` for `@comark/vue`. */
export const Tests = defineComponent({
  name: "Tests",
  inheritAttrs: false,
  props: { passed: Number, failed: Number, skipped: Number, duration: String, title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "section",
        {
          class: "ctr",
          "data-status": props.failed ? "failed" : "passed",
          "aria-label": props.title || "Test results",
        },
        [
          h("p", { class: "ctr-summary" }, [
            props.title ? h("strong", { class: "ctr-title" }, props.title) : null,
            ...summary(props).map(({ kind, text }) =>
              h("span", { class: "ctr-count", "data-kind": kind }, text),
            ),
            props.duration ? h("span", { class: "ctr-time" }, props.duration) : null,
          ]),
          slots.default?.(),
        ],
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Tests };
