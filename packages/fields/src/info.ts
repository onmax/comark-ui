import type { ComponentInfo } from "../../../shared/component-info.ts";

/** What an editor shows for `::field` and `::field-group`. */
export const componentInfo = {
  field: {
    kind: "block",
    label: "Field",
    description:
      "A prop, option, or parameter with its type, default, and description. Fields inside it are its properties.",
    props: {
      name: {
        type: "string",
        description: "The prop, option, or parameter, shown in code. Required.",
      },
      type: { type: "string", description: "Its type, as written in TypeScript." },
      required: { type: "boolean", description: "Adds a required tag." },
      default: { type: "string", description: "Its default, shown in code." },
      description: {
        type: "string",
        description:
          "The text shown when the field has no content of its own, or above its nested fields.",
      },
    },
  },
  "field-group": {
    kind: "block",
    label: "Field group",
    description: "Fields stacked with a line between them.",
  },
} satisfies Record<string, ComponentInfo>;
