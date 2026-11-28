import { MarkdownDocument } from "@comark/svelte";
import type { MarkdownDocument as Document } from "comark";
import { render as ssr } from "svelte/server";
import { components } from "../../src/svelte/index.js";

export const render = (value: Document) =>
  ssr(MarkdownDocument, { props: { value, components } }).body;
