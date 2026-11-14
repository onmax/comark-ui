import { defineAsyncComponent, defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { addMermaidStyles, mermaidBar, startMermaid } from "./client.ts";
import { typesetCss } from "./typeset-css.ts";

// Pele is about 270 kB gzipped, so it loads only when a document has a diagram. Vue's server renderer waits for it, so a
// server render still arrives drawn.
const Pele = defineAsyncComponent(() =>
  import("comark-pele/vue").then(({ createPeleComponent }) =>
    createPeleComponent({ onRender: addMermaidStyles, onError: addMermaidStyles }),
  ),
);

// Pele's card in `.cmm` with the bar of buttons, as `comark-ui/html` draws it. In the browser Pele's own `mount()` zooms
// the diagram in place, so it doesn't zoom with comark-zoom.
export const Mermaid = defineComponent({
  name: "ComarkMermaid",
  inheritAttrs: false,
  props: { content: { type: String, default: "" } },
  setup(props, { attrs }) {
    let stop = () => {};
    onMounted(() => (stop = startMermaid()));
    onBeforeUnmount(() => stop());
    return () =>
      h("div", { class: "cmm", "data-comark-frame": "", "data-source": props.content }, [
        // SAFETY: Comark passes the node's attributes, whose `class` is a string, as Pele's prop takes it.
        h(Pele, { ...(attrs as { class?: string }), content: props.content }),
        h("div", { class: "cmm-bar", innerHTML: mermaidBar() }),
      ]);
  },
});

// Rendered with the document rather than added on mount, so `@scope` styles its root and server renders arrive styled.
export const typeset = defineComponent({
  name: "ComarkTypeset",
  setup: () => () => h("style", { "data-comark-typeset": "", innerHTML: typesetCss }),
});
