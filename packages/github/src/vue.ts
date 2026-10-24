import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";
import { icon, typeOf } from "./icons.ts";

export { CALLOUT_TAG, callouts, html, references } from "./index.ts";
export type { CalloutsOptions, CalloutType, GitHubMeta, ReferencesOptions } from "./index.ts";

/** A callout for `@comark/vue`. */
export const GithubCallout = defineComponent({
  name: "GithubCallout",
  inheritAttrs: false,
  props: { type: String, title: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const type = typeOf(props.type);
      return h("div", { class: "cgc", "data-type": type }, [
        h("span", { class: "cgc-icon", "aria-hidden": "true", innerHTML: icon(type) }),
        h("p", { class: "cgc-title" }, props.title),
        h("div", { class: "cgc-body" }, slots.default?.()),
      ]);
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { GithubCallout };
