import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { mount, unmount } from "svelte";
import { createApp, h, ref } from "vue";
import type { EmbedAttributes } from "../../src/index.ts";
import { Embed as ReactEmbed } from "../../src/react.ts";
import { Embed as VueEmbed } from "../../src/vue.ts";
import SvelteEmbed from "./Embed.svelte";

export function embed(renderer: string, target: HTMLElement, initial: EmbedAttributes) {
  if (renderer === "react") {
    const root = createRoot(target);
    const update = (attrs: EmbedAttributes) => root.render(createElement(ReactEmbed, attrs));
    update(initial);
    return { update, stop: () => root.unmount() };
  }
  if (renderer === "vue") {
    const attrs = ref(initial);
    const app = createApp({ render: () => h(VueEmbed, attrs.value) });
    app.mount(target);
    return {
      update: (next: EmbedAttributes) => {
        attrs.value = next;
      },
      stop: () => app.unmount(),
    };
  }
  const app = mount(SvelteEmbed, { target, props: { initial } });
  return { update: app.update, stop: () => unmount(app) };
}
