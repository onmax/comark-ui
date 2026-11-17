import { mount } from "svelte";
import Host from "./SvelteHost.svelte";

/** Mounts a document and returns a function that replaces it. */
export const mountDocument = (value: unknown) => {
  const host = mount(Host, { target: document.body, props: { initial: value } }) as {
    update: (next: unknown) => void;
  };
  return (next: unknown) => host.update(next);
};
