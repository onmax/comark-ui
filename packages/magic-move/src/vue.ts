import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { css, start } from "./client.ts";

export { default } from "./index.ts";
export type { MagicMoveMeta } from "./index.ts";

const chevron = (d: string) =>
  h(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    [h("path", { d })],
  );
const button = (by: number, label: string, path: string, disabled?: boolean) =>
  h(
    "button",
    {
      type: "button",
      class: "cmv-button",
      "data-magic-move-step": String(by),
      "aria-label": label,
      "aria-disabled": disabled ? "true" : undefined,
    },
    [chevron(path)],
  );

/** `::magic-move` for `@comark/vue`. */
export const MagicMove = /* @__PURE__ */ defineComponent({
  name: "MagicMove",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: { count: [String, Number], title: String },
  setup(props, { slots }) {
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop?.());
    return () => {
      const count = Number(props.count) || 0;
      const controls =
        count > 1
          ? h("div", { class: "cmv-controls" }, [
              h("span", { class: "cmv-count", "aria-live": "polite" }, `1 / ${count}`),
              h("div", { class: "cmv-steps" }, [
                button(-1, "Previous step", "m15 18-6-6 6-6", true),
                button(1, "Next step", "m9 18 6-6-6-6"),
              ]),
            ])
          : null;
      return h(
        "div",
        {
          class: "cmv",
          role: "region",
          "aria-roledescription": "code steps",
          "aria-label": props.title ?? "Code steps",
        },
        [h("div", { class: "cmv-stage" }, slots.default?.()), controls],
      );
    };
  },
});

/** Each step of a `::magic-move` for `@comark/vue`. */
export const MagicMoveStep = /* @__PURE__ */ defineComponent({
  name: "MagicMoveStep",
  inheritAttrs: false,
  props: { index: [String, Number], count: [String, Number], label: String },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          class: "cmv-step",
          role: "group",
          "aria-roledescription": "step",
          "aria-label": `${props.index} of ${props.count}`,
          "data-inactive": Number(props.index) > 1 ? "" : undefined,
        },
        [props.label ? h("div", { class: "cmv-label" }, props.label) : null, slots.default?.()],
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { MagicMove, MagicMoveStep };
