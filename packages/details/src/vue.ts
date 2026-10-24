import { defineComponent, h, onMounted, type PropType } from "vue";
import { Icon, type IconData } from "comark-icon/vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type {
  DetailsMeta,
  DetailsOptions,
  DisclosureAttributes,
  DisclosureSummaryAttributes,
} from "./index.ts";

/** `::accordion` for `@comark/vue`. */
export const Accordion = defineComponent({
  name: "Accordion",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("div", { class: "cdt-accordion" }, slots.default?.());
  },
});

/** `::details`, each `:::accordion-item`, and `::collapsible` for `@comark/vue`. */
export const Disclosure = defineComponent({
  name: "Disclosure",
  inheritAttrs: false,
  props: { variant: String, name: String, open: [String, Boolean] },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "details",
        {
          class: "cdt",
          "data-variant": props.variant,
          name: props.name || undefined,
          open: props.open ? "" : undefined,
        },
        slots.default?.(),
      );
  },
});

/** The summary of a disclosure for `@comark/vue`. */
export const DisclosureSummary = defineComponent({
  name: "DisclosureSummary",
  inheritAttrs: false,
  props: {
    // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
    icon: Object as PropType<IconData>,
    show: String,
    hide: String,
  },
  setup(props, { slots }) {
    return () =>
      h("summary", { class: "cdt-summary" }, [
        props.icon?.src ? h(Icon, { ...props.icon }) : null,
        h("span", [
          props.show
            ? h("span", {
                class: "cdt-toggle",
                "data-show": `${props.show} `,
                "data-hide": `${props.hide} `,
              })
            : null,
          slots.default?.(),
        ]),
      ]);
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Accordion, Disclosure, DisclosureSummary };
