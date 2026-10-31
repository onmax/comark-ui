import { mount } from "svelte";
import Properties from "./Properties.svelte";

export function start(target: HTMLElement) {
  return mount(Properties, { target }).update;
}
