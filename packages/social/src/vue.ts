import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default } from "./index.ts";
export type {
  ConversationAttributes,
  PostAttributes,
  SocialMeta,
  SocialOptions,
  ThreadAttributes,
} from "./index.ts";

const flag = (value: string | undefined) => (value === undefined ? undefined : "");

/** `::post` for `@comark/vue`. */
export const Post = defineComponent({
  name: "Post",
  inheritAttrs: false,
  props: {
    platform: String,
    label: String,
    quote: { type: String, default: undefined },
    thread: { type: String, default: undefined },
    focal: { type: String, default: undefined },
    rail: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () => {
      const outer = props.quote === undefined && props.thread === undefined;
      return h(
        "article",
        {
          class: "csl",
          "data-platform": props.platform || "generic",
          "data-quote": flag(props.quote),
          "data-thread": flag(props.thread),
          "data-focal": flag(props.focal),
          "data-rail": flag(props.rail),
          "data-comark-frame": outer ? "" : undefined,
          "data-not-typeset": outer ? "" : undefined,
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
    };
  },
});

/** `::thread` for `@comark/vue`. */
export const Thread = defineComponent({
  name: "Thread",
  inheritAttrs: false,
  props: { platform: String, label: String },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "div",
        {
          class: "csl-thread",
          role: "group",
          "data-platform": props.platform || "generic",
          "data-comark-frame": "",
          "data-not-typeset": "",
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
  },
});

/** `::conversation` for `@comark/vue`. */
export const Conversation = defineComponent({
  name: "Conversation",
  inheritAttrs: false,
  props: { platform: String, label: String, request: { type: String, default: undefined } },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "div",
        {
          class: "csl-chat",
          role: "group",
          "data-platform": props.platform || "generic",
          "data-request": props.request === undefined ? undefined : "",
          "data-comark-frame": "",
          "data-not-typeset": "",
          "aria-label": props.label || undefined,
        },
        slots.default?.(),
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { Post, Thread, Conversation };
