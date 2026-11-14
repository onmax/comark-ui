import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:icon`. */
export const componentInfo = {
  icon: {
    kind: "inline",
    label: "Icon",
    description: "An Iconify icon, or an image of your own, as tall as the text.",
    props: {
      name: {
        type: "string",
        description: "An icon as set:name, such as lucide:apple, or an image URL. Required.",
      },
      label: {
        type: "string",
        description: "What the icon means, for screen readers. Without it, they skip the icon.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
