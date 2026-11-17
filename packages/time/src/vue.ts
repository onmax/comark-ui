import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { css, start } from "./client.ts";

export { default, TIME_TAG } from "./index.ts";
export type { TimeAttributes, TimeMeta, TimeOptions } from "./index.ts";

/** `:time` for `@comark/vue`. */
export const RelativeTime = defineComponent({
  name: "RelativeTime",
  inheritAttrs: false,
  props: { id: String, datetime: String, mode: String, label: String, tip: String },
  setup(props) {
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop?.());
    return () =>
      props.datetime && props.label
        ? h(
            "time",
            {
              class: "ctm",
              datetime: props.datetime,
              "data-mode": props.mode,
              tabindex: 0,
              "aria-describedby": props.id,
            },
            [
              props.label,
              h("span", { class: "ctm-tip", role: "tooltip", id: props.id }, [
                h("span", { class: "ctm-pill" }, props.tip),
              ]),
            ],
          )
        : null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { RelativeTime };
