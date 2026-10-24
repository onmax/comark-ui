import { defineComponent, h, onMounted, type PropType } from "vue";
import { Icon, type IconData } from "comark-icon/vue";
import { addStyles, external, isExternalHref, isSafeHref, rel } from "./client.ts";

export { colors, default, variants } from "./index.ts";
export type {
  CardAttributes,
  CardColor,
  CardVariant,
  CardsMeta,
  CardsOptions,
  ColumnsAttributes,
} from "./index.ts";

const arrow = () =>
  h(
    "svg",
    {
      class: "ccr-external",
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    [h("path", { d: external })],
  );

/** `::card` for `@comark/vue`. */
export const Card = defineComponent({
  name: "Card",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: {
    color: { type: String, default: "primary" },
    variant: String,
    to: String,
    target: String,
    external: [String, Boolean],
    label: String,
    // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
    icon: Object as PropType<IconData>,
  },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h("div", { class: "ccr", "data-color": props.color, "data-variant": props.variant }, [
        isSafeHref(props.to)
          ? h("a", {
              class: "ccr-link",
              href: props.to,
              target: props.target || (isExternalHref(props.to) ? "_blank" : undefined),
              rel: rel(props.target || (isExternalHref(props.to) ? "_blank" : undefined)),
              "aria-label": props.label,
            })
          : null,
        props.icon?.src ? h(Icon, { ...props.icon }) : null,
        props.external ? arrow() : null,
        slots.default?.(),
      ]);
  },
});

/** A card's title for `@comark/vue`. */
export const CardTitle = defineComponent({
  name: "CardTitle",
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h("p", { class: "ccr-title" }, slots.default?.());
  },
});

/** `::card-group` for `@comark/vue`. */
export const CardGroup = defineComponent({
  name: "CardGroup",
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("div", { class: "ccr-group" }, slots.default?.());
  },
});

/** `::columns` for `@comark/vue`. */
export const Columns = defineComponent({
  name: "Columns",
  inheritAttrs: false,
  props: { cols: { type: [String, Number], default: "2" } },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h("div", { class: "ccr-columns", "data-cols": String(props.cols) }, slots.default?.());
  },
});

/** Each cell of a `::columns` for `@comark/vue`. */
export const Column = defineComponent({
  name: "Column",
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h("div", { class: "ccr-column" }, slots.default?.());
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Card, CardTitle, CardGroup, Columns, Column };
