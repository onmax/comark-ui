import {
  defineComponent,
  h,
  inject,
  type InjectionKey,
  onBeforeUnmount,
  onMounted,
  type PropType,
  provide,
  useId,
} from "vue";
import { css, start } from "./client.ts";

export { default } from "./index.ts";
export type { MagicMoveMeta } from "./index.ts";

const magicMoveId: InjectionKey<() => string> = Symbol("comark-magic-move");

/** `::magic-move` for `@comark/vue`. */
export const MagicMove = /* @__PURE__ */ defineComponent({
  name: "MagicMove",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: {
    uid: String,
    // SAFETY: the parse plugin writes `labels` as an array of strings.
    labels: { type: Array as PropType<string[]>, default: () => [] },
    title: String,
  },
  setup(props, { slots }) {
    const instanceId = useId();
    const id = () => `${props.uid ?? "cmv"}-${instanceId}`;
    provide(magicMoveId, id);
    let stop: (() => void) | undefined;
    onMounted(() => (stop = start(css)));
    onBeforeUnmount(() => stop?.());
    return () =>
      h("div", { class: "cmv" }, [
        h(
          "div",
          { class: "cmv-list", role: "tablist", "aria-label": props.title || undefined },
          props.labels.map((label, at) =>
            h(
              "button",
              {
                type: "button",
                class: "cmv-tab",
                role: "tab",
                id: `${id()}-tab-${at + 1}`,
                "aria-controls": `${id()}-panel-${at + 1}`,
                "aria-selected": String(at === 0),
                tabindex: at === 0 ? "0" : "-1",
              },
              String(label),
            ),
          ),
        ),
        h("div", { class: "cmv-stage" }, slots.default?.()),
      ]);
  },
});

/** Each step of a `::magic-move` for `@comark/vue`. */
export const MagicMoveStep = /* @__PURE__ */ defineComponent({
  name: "MagicMoveStep",
  inheritAttrs: false,
  props: { uid: String, index: [String, Number], label: String },
  setup(props, { slots }) {
    const id = inject(magicMoveId, () => props.uid ?? "");
    return () =>
      h(
        "div",
        {
          class: "cmv-step",
          role: "tabpanel",
          id: `${id()}-panel-${props.index}`,
          "aria-labelledby": `${id()}-tab-${props.index}`,
          tabindex: "0",
          "data-inactive": Number(props.index) > 1 ? "" : undefined,
        },
        [h("div", { class: "cmv-caption" }, props.label), slots.default?.()],
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { MagicMove, MagicMoveStep };
