import type { AnyExtension } from "@tiptap/core";
import { Editor, EditorContent } from "@tiptap/vue-3";
import type { ComarkPlugin, ElementNode, Node } from "comark";
import { rowsOf, type PropertiesOptions } from "comark-properties";
import { Properties } from "comark-properties/vue";
import {
  defineComponent,
  h,
  type VNode,
  onScopeDispose,
  type PropType,
  type Ref,
  ref,
  shallowRef,
  watch,
} from "vue";
import {
  checkMarkdown,
  ComarkKit,
  type ComarkKitOptions,
  fromMarkdown,
  toMarkdown,
} from "./editor.ts";

export interface UseComarkEditorOptions {
  /** Added after ComarkKit, such as a placeholder. */
  extensions?: AnyExtension[];
  kit?: ComarkKitOptions;
  /** The parse plugins the page renders with, so a document only they read is opened read-only. */
  plugins?: readonly ComarkPlugin<any, any>[];
}

/**
 * A Tiptap editor bound to a Markdown string: an edit writes the Markdown back, and a change from outside reloads the
 * editor. A document the editor can't save unchanged (see `checkMarkdown`) opens read-only, with `editable` false.
 */
export function useComarkEditor(markdown: Ref<string>, options: UseComarkEditorOptions = {}) {
  const editor = shallowRef<Editor>();
  const editable = ref(false);
  /** The document's frontmatter, which the editor keeps beside the text and writes back on each save. */
  const frontmatter = shallowRef<Record<string, unknown>>({});
  // What this editor last wrote, so the watcher doesn't read its own save back and move the cursor.
  let written: string | undefined;
  let loads = 0;
  let saves = 0;

  async function save() {
    const current = editor.value;
    if (!current) return;
    const run = ++saves;
    const next = await toMarkdown(current.getJSON(), { frontmatter: frontmatter.value });
    if (run !== saves) return;
    written = next;
    markdown.value = next;
  }

  async function load(source: string) {
    const run = ++loads;
    ++saves; // An external load supersedes serialization of the previous editor state.
    const [check, read] = await Promise.all([
      checkMarkdown(source, { plugins: options.plugins }),
      fromMarkdown(source),
    ]);
    if (run !== loads) return;
    frontmatter.value = read.frontmatter;
    editable.value = check.editable;
    if (editor.value) {
      editor.value.commands.setContent(read.doc, { emitUpdate: false });
      editor.value.setEditable(check.editable, false);
      return;
    }
    editor.value = new Editor({
      extensions: [ComarkKit.configure(options.kit), ...(options.extensions ?? [])],
      content: read.doc,
      editable: check.editable,
      onUpdate: () => void save(),
    });
  }

  watch(
    markdown,
    (value) => {
      if (value !== written) void load(value);
    },
    { immediate: true },
  );
  onScopeDispose(() => editor.value?.destroy());

  return { editor, editable, frontmatter };
}

/** A comark node as a Vue node, for the few elements the properties rows hold. */
function vnode(node: Node): VNode | string {
  if (typeof node === "string") return node;
  // SAFETY: the rows are elements and strings, which `rowsOf` builds.
  const [tag, attributes, ...children] = node as ElementNode;
  return h(tag, attributes, children.map(vnode));
}

/**
 * `useComarkEditor` as a component: `<ComarkEditor v-model="markdown" />`. The frontmatter keys that comark-properties
 * shows on the page show above the text the same way, read-only. Pass its options in `properties`, or `false` to hide them.
 */
export const ComarkEditor = defineComponent({
  name: "ComarkEditor",
  inheritAttrs: false,
  props: {
    properties: {
      type: [Object, Boolean] as PropType<PropertiesOptions | boolean>,
      default: true,
    },
    modelValue: { type: String, required: true },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    extensions: { type: Array as PropType<AnyExtension[]>, default: undefined },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    plugins: { type: Array as PropType<ComarkPlugin<any, any>[]>, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    const markdown = ref(props.modelValue);
    watch(
      () => props.modelValue,
      (value) => (markdown.value = value),
    );
    watch(markdown, (value) => {
      if (value !== props.modelValue) emit("update:modelValue", value);
    });
    const { editor, frontmatter } = useComarkEditor(markdown, {
      extensions: props.extensions,
      plugins: props.plugins,
    });
    return () => {
      if (!editor.value) return null;
      const content = h(EditorContent, { ...attrs, editor: editor.value });
      if (props.properties === false) return content;
      const options = props.properties === true ? {} : props.properties;
      const { rows } = rowsOf(frontmatter.value, options);
      return rows.length ? [h(Properties, null, () => rows.map(vnode)), content] : content;
    };
  },
});
