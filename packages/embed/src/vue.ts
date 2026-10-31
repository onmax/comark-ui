import { defineComponent, h, onBeforeUnmount, onMounted } from "vue";
import { addStyles, allow, icons, referrerPolicy, start } from "./client.ts";

export { default } from "./index.ts";
export type { EmbedAttributes, EmbedMeta, Size } from "./index.ts";

const icon = (d: string) =>
  h(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    [h("path", { d })],
  );

/** `::embed` for `@comark/vue`. */
export const Embed = defineComponent({
  name: "Embed",
  inheritAttrs: false,
  props: {
    provider: String,
    src: String,
    label: String,
    size: String,
    href: String,
    title: String,
    host: String,
  },
  setup(props) {
    let stop: (() => void) | undefined;
    onMounted(() => {
      addStyles();
      if (props.provider === "x") stop = start();
    });
    onBeforeUnmount(() => stop?.());
    return () => {
      if (!props.href) return null;
      if (!props.src)
        return h("a", { class: "ce-card", href: props.href }, [
          icon(icons.globe),
          h("strong", props.title),
          " ",
          h("span", props.host),
        ]);
      return h(
        "figure",
        { class: "ce", "data-provider": props.provider, "data-size": props.size },
        [
          h("div", { class: "ce-frame" }, [
            h("iframe", {
              src: props.src,
              title: props.label,
              loading: "lazy",
              allow,
              allowfullscreen: "",
              referrerpolicy: referrerPolicy,
            }),
          ]),
          h("figcaption", [h("a", { href: props.href }, [props.title, icon(icons.external)])]),
        ],
      );
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Embed };
