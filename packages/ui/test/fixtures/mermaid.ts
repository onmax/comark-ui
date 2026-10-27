import { createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { mount } from "svelte";
import { createApp, h, ref } from "vue";
import { typesetCss } from "../../src/client.ts";
import react from "../../src/react.ts";
import vue from "../../src/vue.ts";
import SvelteDiagram from "./Mermaid.svelte";

const ReactDiagram = react().components.pele!;
const VueDiagram = vue().components.pele!;

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
