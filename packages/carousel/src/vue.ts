import { css as zoomCss, start as startZoom } from "comark-zoom/client";
import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { css, start } from "./client.ts";

export { default } from "./index.ts";

const off = (value: unknown) => value === false || value === "false";
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

/** `::carousel` for `@comark/vue`. */
export const Carousel = /* @__PURE__ */ defineComponent({
  name: "Carousel",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  props: {
    count: [String, Number],
    columns: [String, Number],
    title: String,
    zoom: { type: [Boolean, String], default: undefined },
  },
  setup(props, { slots }) {
    let stops: (() => void)[] = [];
    onMounted(() => (stops = [start(css), ...(off(props.zoom) ? [] : [startZoom(zoomCss)])]));
    onBeforeUnmount(() => stops.forEach((stop) => stop()));
    return () => {
      const count = Number(props.count) || 0;
      const columns = Math.min(3, Math.max(1, Number(props.columns) || 1));
      const controls =
        count > 1
          ? h("div", { class: "cc-controls" }, [
              h("span", { class: "cc-count", "aria-live": "polite" }, `1 / ${count}`),
              h("div", { class: "cc-steps" }, [
                h(
                  "button",
                  {
                    type: "button",
                    class: "cc-step",
                    "data-carousel-step": "-1",
                    "aria-label": "Previous slide",
                    "aria-disabled": "true",
                  },
                  [chevron("m15 18-6-6 6-6")],
                ),
                h(
                  "button",
                  {
                    type: "button",
                    class: "cc-step",
                    "data-carousel-step": "1",
                    "aria-label": "Next slide",
                  },
                  [chevron("m9 18 6-6-6-6")],
                ),
              ]),
            ])
          : null;
      return h(
        "div",
        {
          class: "cc",
          "data-carousel-columns": columns > 1 ? String(columns) : undefined,
          "data-carousel-fits": count <= columns ? "" : undefined,
          "data-zoom-gallery": off(props.zoom) ? undefined : "",
          role: "region",
          "aria-roledescription": "carousel",
          "aria-label": props.title ?? "Carousel",
        },
        [h("div", { class: "cc-track" }, slots.default?.()), controls],
      );
    };
  },
});

/** `:::slide` for `@comark/vue`. */
export const Slide = /* @__PURE__ */ defineComponent({
  name: "Slide",
  inheritAttrs: false,
  props: {
    index: [String, Number],
    count: [String, Number],
    title: String,
    zoom: { type: [Boolean, String], default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      const zoom = !off(props.zoom);
      return h(
        "div",
        {
          class: "cc-slide",
          role: "group",
          "aria-roledescription": "slide",
          "aria-label": `${props.index} of ${props.count}`,
          "data-zoom": zoom ? "" : undefined,
          tabindex: zoom ? "0" : undefined,
          "data-zoom-title": zoom ? props.title : undefined,
        },
        slots.default?.(),
      );
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Carousel, Slide };
