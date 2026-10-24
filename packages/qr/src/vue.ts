import { defineComponent, h, onMounted } from "vue";
import { addStyles, viewBox } from "./client.ts";

export { default } from "./index.ts";
export type { QrAttributes, QrMeta } from "./index.ts";

/** `:qr` for `@comark/vue`. */
export const Qr = defineComponent({
  name: "Qr",
  inheritAttrs: false,
  props: { value: String, size: Number, path: String },
  setup(props) {
    onMounted(addStyles);
    return () =>
      props.path
        ? h("span", { class: "cqr", role: "img", "aria-label": `QR code: ${props.value ?? ""}` }, [
            h(
              "svg",
              {
                viewBox: viewBox(props.size ?? 0),
                width: "128",
                height: "128",
                "aria-hidden": "true",
              },
              [h("path", { d: props.path, fill: "currentColor" })],
            ),
          ])
        : null;
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Qr };
