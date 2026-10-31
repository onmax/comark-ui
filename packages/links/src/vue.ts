import { defineComponent, h, onMounted, type PropType } from "vue";
import type { Anchor } from "./anchors.ts";
import { addStyles } from "./client.ts";
import { rawText } from "../../../shared/text.ts";

export { anchors, external, STYLES_TAG } from "./index.ts";
export type { Anchor, AnchorsOptions, ExternalOptions } from "./index.ts";

const heading = (tag: string) =>
  defineComponent({
    name: tag.toUpperCase(),
    // Everything but `anchor` belongs to the heading itself.
    inheritAttrs: false,
    // SAFETY: the parse plugin is the only writer of `anchor`, always as an `Anchor`.
    props: { anchor: Object as PropType<Anchor> },
    setup(props, { attrs, slots }) {
      onMounted(() => props.anchor && addStyles());
      return () => {
        const element = h(tag, attrs, slots.default?.());
        const id = rawText(attrs.id);
        if (!props.anchor || !id) return element;
        return h("div", { class: "cl-heading" }, [
          element,
          h("a", { class: "cl-anchor", href: `#${id}` }, [
            h("span", { "aria-hidden": "true" }, props.anchor.icon),
            h("span", { class: "cl-sr" }, props.anchor.label),
          ]),
        ]);
      };
    },
  });

/** Adds the styles for the new-tab warning, and renders nothing. */
export const LinksStyles = defineComponent({
  name: "LinksStyles",
  setup() {
    onMounted(addStyles);
    return () => null;
  },
});

export const H1 = heading("h1");
export const H2 = heading("h2");
export const H3 = heading("h3");
export const H4 = heading("h4");
export const H5 = heading("h5");
export const H6 = heading("h6");

/** Pass these as `components` to `@comark/vue`. */
export const components = { H1, H2, H3, H4, H5, H6, LinksStyles };
