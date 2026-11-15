import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::carousel` and `:::slide`. */
export const componentInfo = {
  carousel: {
    kind: "block",
    label: "Carousel",
    description:
      "Slides that scroll and snap, with arrows, a counter, and zoom. Each block inside is a slide.",
    props: {
      title: { type: "string", default: "Carousel", description: "The name screen readers read." },
      columns: {
        type: "number",
        default: 1,
        description: "How many slides a wide page shows at once: 1, 2, or 3.",
      },
      zoom: { type: "boolean", default: true },
    },
  },
  slide: {
    kind: "block",
    label: "Slide",
    description: "One slide of a carousel that holds several blocks.",
    props: { title: { type: "string", description: "The heading of the slide when it's zoomed." } },
  },
} satisfies Record<string, ComponentInfo>;
