import { defineComponent, h, onMounted } from "vue";
import { addStyles } from "./client.ts";

export { default, NOTES_TAG } from "./index.ts";
export type { CodeNotesAttributes, CodeNotesMeta } from "./index.ts";

/** The notes under an annotated fence, for `@comark/vue`. */
export const CodeNotes = defineComponent({
  name: "CodeNotes",
  inheritAttrs: false,
  props: { start: Number },
  setup(props, { slots }) {
    onMounted(addStyles);
    return () =>
      h(
        "ol",
        { class: "cn-notes", start: props.start && props.start !== 1 ? props.start : undefined },
        slots.default?.(),
      );
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { CodeNotes };
