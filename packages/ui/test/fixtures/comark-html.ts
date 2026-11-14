import { createApp, h, ref } from "vue";
import { ComarkHtml } from "../../src/vue.ts";

/** Mounts `ComarkHtml` into `target` in a client-only app, and returns a function that replaces its HTML. */
export function mount(target: HTMLElement, html: string, tag?: string) {
  const current = ref(html);
  createApp({ render: () => h(ComarkHtml, { html: current.value, tag }) }).mount(target);
  return (next: string) => {
    current.value = next;
  };
}
