import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default, PROGRESS_TAG, STATS_TILES_TAG } from "./index.ts";
export type { DeltaAttributes, MetricsMeta, ProgressAttributes } from "./index.ts";

/** `:delta`, and each change in a `::stats` table, for `@comark/vue`. */
export const Delta = defineComponent({
  name: "Delta",
  inheritAttrs: false,
  props: { from: String, to: String, change: String, direction: String, verdict: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.change
        ? h(
            "span",
            {
              class: "cmt-delta",
              "data-direction": props.direction,
              "data-verdict": props.verdict,
            },
            [
              ...(props.from && props.to
                ? [
                    h("span", { class: "cmt-from" }, props.from),
                    " → ",
                    h("span", { class: "cmt-to" }, props.to),
                    " ",
                  ]
                : []),
              h("span", { class: "cmt-change" }, props.change),
            ],
          )
        : null;
  },
});

/** `:progress` for `@comark/vue`. */
export const ProgressBar = defineComponent({
  name: "ProgressBar",
  inheritAttrs: false,
  props: { value: Number, max: Number, percent: String, label: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.percent
        ? h("span", { class: "cmt-progress" }, [
            props.label ? h("span", { class: "cmt-label" }, props.label) : null,
            h(
              "progress",
              { value: props.value, max: props.max, "aria-label": props.label || undefined },
              props.percent,
            ),
            h("span", { class: "cmt-percent" }, props.percent),
          ])
        : null;
  },
});

/** `::stats{tiles}` for `@comark/vue`. */
export const StatTiles = defineComponent({
  name: "StatTiles",
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("dl", { class: "cmt-tiles" }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Delta, ProgressBar, StatTiles };
