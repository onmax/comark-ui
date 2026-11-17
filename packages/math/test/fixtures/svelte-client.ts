import { MarkdownDocument } from "@comark/svelte";
import type { MarkdownDocument as Document } from "comark";
import { mount } from "svelte";
import { components } from "../../src/svelte/index.js";

export const mountDocument = (value: Document) =>
  mount(MarkdownDocument, { target: document.body, props: { value, components } });
