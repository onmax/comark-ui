import { defineComponent, h } from "vue";
import { typesetCss } from "./typeset-css.ts";

// Rendered with the document rather than added on mount, so `@scope` styles its root and server renders arrive styled.
export const typeset = defineComponent({
  name: "ComarkTypeset",
  setup: () => () => h("style", { "data-comark-typeset": "", innerHTML: typesetCss }),
});

export const components = { "typeset-styles": typeset };
