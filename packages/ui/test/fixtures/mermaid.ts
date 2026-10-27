import { createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { mount } from "svelte";
import { createApp, h, ref } from "vue";
import { createPeleComponent as reactPele } from "comark-pele/react";
import { createPeleComponent as vuePele } from "comark-pele/vue";
import { addMermaidStyles, typesetCss } from "../../src/client.ts";
import SvelteDiagram from "./Mermaid.svelte";

// The same Pele components and render callback used by the three comark-ui presets.
const ReactDiagram = reactPele({ onRender: addMermaidStyles });
const VueDiagram = vuePele({ onRender: addMermaidStyles });

export function diagram(renderer: string, target: HTMLElement, content: string) {
  if (renderer === "react") {
    const root = createRoot(target);
    const update = (content: string) =>
      root.render(
        createElement(
          Fragment,
          null,
          createElement("style", { dangerouslySetInnerHTML: { __html: typesetCss } }),
          createElement(ReactDiagram, { content }),
        ),
      );
    update(content);
    return update;
  }
  if (renderer === "vue") {
    const source = ref(content);
    createApp({
      render: () => [h("style", typesetCss), h(VueDiagram, { content: source.value })],
    }).mount(target);
    return (content: string) => {
      source.value = content;
    };
  }
  return mount(SvelteDiagram, { target, props: { initial: content } }).update;
}
