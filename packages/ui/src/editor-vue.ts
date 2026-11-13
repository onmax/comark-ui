import type { AnyExtension } from "@tiptap/core";
import { Editor, EditorContent } from "@tiptap/vue-3";
import type { ComarkPlugin, Node } from "comark";
import { rowsOf, type PropertiesOptions } from "comark-properties";
import { Properties } from "comark-properties/vue";
import { childrenOf, isElement } from "../../../shared/nodes.ts";
import {
  Comment,
  defineComponent,
  Fragment,
  h,
  isVNode,
  type VNode,
  type VNodeChild,
  onScopeDispose,
  type PropType,
  type Ref,
  ref,
  shallowRef,
  type SlotsType,
  watch,
} from "vue";
import { type ComponentField, type ComponentInfo, componentView } from "./editor/component-view.ts";
import {
  checkMarkdown,
  ComarkKit,
  type ComarkKitOptions,
  fromMarkdown,
  type PageParser,
  toMarkdown,
} from "./editor.ts";

/**
 * Pass how the page parses Markdown, `plugins` and `registerDefaultPlugins` as given to Comark's parser, so the editor
 * reads a document as readers see it, and opens read-only one a save would change for them.
 */
export interface UseComarkEditorOptions extends PageParser {
  /** Added after ComarkKit, such as a placeholder. */
  extensions?: AnyExtension[];
  kit?: ComarkKitOptions;
  /**
   * What the component view shows for each component name, with the props it edits as typed fields, or `false` to
   * draw components as bare elements. A `componentView` in `kit` replaces the view.
   */
  components?: Record<string, ComponentInfo> | false;
  /** Draws a typed prop's field, such as a media picker. Return `undefined` for the view's own field. */
  field?: (field: ComponentField) => VNodeChild | undefined;
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
    const page = {
      plugins: options.plugins,
      registerDefaultPlugins: options.registerDefaultPlugins,
    };
    const [check, read] = await Promise.all([
      checkMarkdown(source, page),
      fromMarkdown(source, page),
    ]);
    if (run !== loads) return;
    frontmatter.value = read.frontmatter;
    editable.value = check.editable;
    if (editor.value) {
      editor.value.commands.setContent(read.doc, { emitUpdate: false });
      editor.value.setEditable(check.editable, false);
      return;
    }
    const { components = {}, field } = options;
    const view = components === false ? undefined : componentView({ components, field });
    editor.value = new Editor({
      extensions: [
        ComarkKit.configure({ componentView: view, ...options.kit }),
        ...(options.extensions ?? []),
      ],
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
function vnode(node: Node): VNode | string | null {
  if (!isElement(node)) return Array.isArray(node) ? null : node;
  return h(node[0], node[1], childrenOf(node).map(vnode));
}

// Match Vue's slot fallback: comments and empty fragments leave the built-in field in place.
const renders = (nodes: unknown): boolean =>
  Array.isArray(nodes) &&
  nodes.some(
    (node) =>
      !isVNode(node) ||
      (node.type !== Comment && (node.type !== Fragment || renders(node.children))),
  );

/**
 * `useComarkEditor` as a component: `<ComarkEditor v-model="markdown" />`. The frontmatter keys that comark-properties
 * shows on the page show above the text the same way, read-only. Pass its options in `properties`, or `false` to hide them.
 * `components` and the `#field` slot set up the component view, as the composable's `components` and `field` do.
 */
export const ComarkEditor = defineComponent({
  name: "ComarkEditor",
  inheritAttrs: false,
  props: {
    properties: {
      // SAFETY: Vue's runtime constructor cannot express the options object's type.
      type: [Object, Boolean] as PropType<PropertiesOptions | boolean>,
      default: true,
    },
    modelValue: { type: String, required: true },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    extensions: { type: Array as PropType<AnyExtension[]>, default: undefined },
    // SAFETY: Vue's runtime constructor cannot express the array's element type.
    plugins: { type: Array as PropType<ComarkPlugin<any, any>[]>, default: undefined },
    components: {
      // SAFETY: Vue's runtime constructor cannot express the record's value type.
      type: [Object, Boolean] as PropType<Record<string, ComponentInfo> | false>,
      default: undefined,
    },
    registerDefaultPlugins: { type: Boolean, default: undefined },
  },
  emits: ["update:modelValue"],
  // SAFETY: Vue's runtime constructor cannot express the slots' types.
  slots: Object as SlotsType<{ field: ComponentField }>,
  setup(props, { attrs, emit, slots }) {
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
      components: props.components,
      field: (field) => {
        const nodes = slots.field?.(field);
        return renders(nodes) ? nodes : undefined;
      },
      registerDefaultPlugins: props.registerDefaultPlugins,
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

export {
  componentView,
  componentViewCss,
  type ComponentField,
  type ComponentInfo,
  type ComponentProp,
  type ComponentViewOptions,
} from "./editor/component-view.ts";
export {
  CodeLanguageSelect,
  codeLanguagesCss,
  type CodeLanguageSlot,
} from "./editor/code-languages.ts";
