import { MarkdownDocument as VueDocument } from "@comark/vue";
import type { MarkdownDocument } from "comark";
import { type Component, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

/** A parsed document rendered by Vue's server renderer, as an SSR app sends it before it hydrates. */
export const vueServerRender = (
  value: MarkdownDocument,
  components: Record<string, Component>,
): Promise<string> =>
  renderToString(createSSRApp({ render: () => h(VueDocument, { value, components }) }));
