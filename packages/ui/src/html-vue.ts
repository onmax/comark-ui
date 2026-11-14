import { defineComponent, h, onMounted, ref, watch } from "vue";

/**
 * HTML that `comark-ui/html` rendered, such as a document rendered at build time, with its inline scripts running. A
 * `v-html` leaves them inert, so blocks like zoom, carousels, and embeds would never start. It runs them again after it
 * mounts and whenever `html` changes; each script starts once per page, so the copies the server's HTML already ran do
 * nothing. `tag` is the element it renders, `div` by default; use `span` inside a paragraph.
 */
export const ComarkHtml = defineComponent({
  name: "ComarkHtml",
  props: {
    html: { type: String, required: true },
    tag: { type: String, default: "div" },
  },
  setup(props) {
    const root = ref<HTMLElement>();
    // A script the parser didn't insert only runs as a new element.
    const run = () => {
      for (const old of root.value?.querySelectorAll("script") ?? []) {
        const script = document.createElement("script");
        for (const { name, value } of old.attributes) script.setAttribute(name, value);
        script.textContent = old.textContent;
        old.replaceWith(script);
      }
    };
    onMounted(run);
    watch(() => props.html, run, { flush: "post" });
    return () => h(props.tag, { ref: root, innerHTML: props.html });
  },
});
