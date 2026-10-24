import { defineComponent, h, onMounted, type PropType } from "vue";
import { Icon, type IconData } from "comark-icon/vue";
import { addStyles, glyphs, marks } from "./client.ts";

export { default } from "./index.ts";
export type { EntryState, FileTreeItemAttributes, FileTreeMeta, FileTreeOptions } from "./index.ts";

const glyph = (d: string) =>
  h(
    "svg",
    {
      class: "cft-glyph",
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

/** `::file-tree` for `@comark/vue`. */
export const FileTree = defineComponent({
  name: "FileTree",
  // The other renderers drop `{#id .class}`, so Vue drops it too instead of falling it through to the root.
  inheritAttrs: false,
  setup(_, { slots }) {
    onMounted(addStyles);
    return () => h("div", { class: "cft" }, [h("ul", slots.default?.())]);
  },
});

/** Each entry of a `::file-tree` for `@comark/vue`. */
export const FileTreeItem = defineComponent({
  name: "FileTreeItem",
  inheritAttrs: false,
  props: {
    type: String,
    name: String,
    state: String,
    note: String,
    // SAFETY: the parse plugin writes `icon` as comark-icon's `IconData`.
    icon: Object as PropType<IconData>,
  },
  setup(props, { slots }) {
    return () => {
      if (props.type === "more") return h("li", { "data-type": "more" }, "…");
      const folder = props.type === "folder";
      const mark = marks.get(String(props.state));
      const entry = h("span", { class: "cft-entry" }, [
        props.icon?.src ? h(Icon, { ...props.icon }) : glyph(folder ? glyphs.folder : glyphs.file),
        mark ? h("span", { class: "cft-mark" }, mark) : null,
        h("span", { class: "cft-name" }, props.name),
        props.note ? h("span", { class: "cft-note" }, props.note) : null,
      ]);
      return h(
        "li",
        { "data-type": folder ? "folder" : "file", "data-state": mark ? props.state : undefined },
        folder
          ? [h("details", { open: true }, [h("summary", [entry]), h("ul", slots.default?.())])]
          : [entry],
      );
    };
  },
});

/** Pass these as `components` to `@comark/vue`. */
export const components = { FileTree, FileTreeItem };
