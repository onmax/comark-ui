import type { AnyExtension } from "@tiptap/core";
import { Editor, EditorContent } from "@tiptap/vue-3";
import type { ComarkPlugin } from "comark";
import {
  defineComponent,
  h,
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
  let frontmatter: Record<string, unknown> = {};
  // What this editor last wrote, so the watcher doesn't read its own save back and move the cursor.
  let written: string | undefined;
  let loads = 0;
  let saves = 0;

  async function save() {
    const current = editor.value;
    if (!current) return;
    const run = ++saves;
    const next = await toMarkdown(current.getJSON(), { frontmatter });
    if (run !== saves) return;
    written = next;
    markdown.value = next;
  }

  async function load(source: string) {
    const run = ++loads;
    const [check, read] = await Promise.all([
      checkMarkdown(source, { plugins: options.plugins }),
      fromMarkdown(source),
    ]);
    if (run !== loads) return;
    frontmatter = read.frontmatter;
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

  return { editor, editable };
}

/** `useComarkEditor` as a component: `<ComarkEditor v-model="markdown" />`. */
export const ComarkEditor = defineComponent({
  name: "ComarkEditor",
  props: {
    modelValue: { type: String, required: true },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    extensions: { type: Array as PropType<AnyExtension[]>, default: undefined },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    plugins: { type: Array as PropType<ComarkPlugin<any, any>[]>, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const markdown = ref(props.modelValue);
    watch(
      () => props.modelValue,
      (value) => (markdown.value = value),
    );
    watch(markdown, (value) => {
      if (value !== props.modelValue) emit("update:modelValue", value);
    });
    const { editor } = useComarkEditor(markdown, {
      extensions: props.extensions,
      plugins: props.plugins,
    });
    return () => (editor.value ? h(EditorContent, { editor: editor.value }) : null);
  },
});
