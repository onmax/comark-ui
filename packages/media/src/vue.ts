import { defineComponent, h, onBeforeUnmount, onMounted, watch } from "vue";
import { controls, css, start } from "./client.ts";

export { default } from "./index.ts";
export type { MediaAttributes, MediaMeta, MediaOptions } from "./index.ts";

/** Videos and audio for `@comark/vue`. */
export const Media = defineComponent({
  name: "Media",
  inheritAttrs: false,
  props: {
    kind: String,
    src: String,
    label: String,
    poster: String,
    width: Number,
    height: Number,
    autoplay: Boolean,
    loop: Boolean,
    muted: Boolean,
    native: Boolean,
  },
  setup(props) {
    let stop = () => {};
    const sync = () => {
      stop();
      stop = () => {};
      if ((props.kind === "video" || props.kind === "audio") && props.src && !props.native)
        stop = start(css);
    };
    watch(() => [props.kind, props.src, props.native], sync);
    onMounted(sync);
    onBeforeUnmount(() => stop());
    return () => {
      const { kind, src, label } = props;
      if ((kind !== "video" && kind !== "audio") || !src) return null;
      const video = kind === "video";
      const attrs = {
        src,
        controls: true,
        playsinline: video || undefined,
        preload: "metadata",
        poster: video ? props.poster : undefined,
        width: video ? props.width : undefined,
        height: video ? props.height : undefined,
        autoplay: props.autoplay || undefined,
        loop: props.loop || undefined,
        muted: props.muted || undefined,
        "aria-label": label || undefined,
      };
      const fallback = [h("a", { href: src }, label || src)];
      if (props.native) return h(kind, { class: "cm", ...attrs }, fallback);
      return h(
        "span",
        {
          class: `cm cm-${kind}`,
          role: label ? "group" : undefined,
          "aria-label": label || undefined,
        },
        [h(kind, attrs, fallback), h("span", { class: "cm-bar", innerHTML: controls(kind) })],
      );
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Media };
