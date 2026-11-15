import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `:qr`. */
export const componentInfo = {
  qr: {
    kind: "inline",
    label: "QR code",
    description: "A QR code for a link or other text, drawn as an SVG.",
    props: {
      value: {
        type: "string",
        description: "The text to encode, usually a link, up to about 2,300 characters. Required.",
      },
    },
  },
} satisfies Record<string, ComponentInfo>;
