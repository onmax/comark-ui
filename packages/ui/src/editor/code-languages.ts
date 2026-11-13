import type { Editor } from "@tiptap/vue-3";
import { theme } from "comark-zoom/theme";
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  shallowRef,
  type SlotsType,
} from "vue";
import { addStyles } from "../../../../shared/styles.ts";

/** What the `#select` slot gets for each code block. */
export interface CodeLanguageSlot {
  /** The name in `languages` the block's language stands for. */
  language: string | undefined;
  /** The block's language as written, which shows when it isn't in `languages`. */
  written: string | undefined;
  /** Whether the editor takes edits. */
  editable: boolean;
  /** Sets the block's language. `null` makes it plain text. */
  choose: (language: string | null) => void;
}

interface Block {
  /** Stays with its code block while blocks are added or removed above it, so an open select stays on its block. */
  id: number;
  element: HTMLElement;
  top: number;
  right: number;
  language: string | undefined;
  written: string | undefined;
}

export const codeLanguagesCss = `@layer comark{${[
  theme(".cel-layer", "primary"),
  `.cel-layer{position:absolute;inset:0;z-index:1;pointer-events:none}`,
  `.cel-block{position:absolute;pointer-events:auto}`,
  `.cel-select{max-width:12rem;padding:.125rem .375rem;border:0;border-radius:calc(var(--_comark-radius)*.6);background:transparent;color:var(--_comark-muted);font:500 .75rem/1.4 var(--_comark-font);cursor:pointer}`,
  `.cel-select:hover{color:var(--_comark-foreground)}`,
  `.cel-select:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:1px}`,
  `.cel-select:disabled{cursor:default}`,
].join("")}}`;

const firstWord = (info: string) => info.trim().split(/\s/, 1)[0]?.toLowerCase() || undefined;

/**
 * A language select in the top right corner of each code block. It sits over the editor rather than inside it, so
 * ProseMirror's DOM stays as the schema draws it, and a choice is an edit to the block's `language` attribute, which a
 * collaborative room syncs like any other. Place it beside `EditorContent` in a positioned element.
 */
export const CodeLanguageSelect = defineComponent({
  name: "CodeLanguageSelect",
  props: {
    // SAFETY: Vue's runtime constructor cannot express the editor's type.
    editor: { type: Object as PropType<Editor>, required: true },
    /** The languages it offers, by name, with the label each shows. */
    // SAFETY: Vue's runtime constructor cannot express the record's value type.
    languages: { type: Object as PropType<Record<string, string>>, required: true },
    /** The name in `languages` a block's language stands for, such as an alias's. Its first word by default. */
    // SAFETY: Vue's runtime constructor cannot express the function's type.
    language: {
      type: Function as PropType<(info: string) => string | undefined>,
      default: undefined,
    },
  },
  // SAFETY: Vue's runtime constructor cannot express the slots' types.
  slots: Object as SlotsType<{ select: CodeLanguageSlot }>,
  setup(props, { slots }) {
    const blocks = shallowRef<Block[]>([]);
    const layer = shallowRef<HTMLElement>();
    // ProseMirror keeps a code block's DOM node across edits, so the node names the block.
    const ids = new WeakMap<HTMLElement, number>();
    let lastId = 0;
    const idOf = (element: HTMLElement) => {
      let id = ids.get(element);
      if (id === undefined) ids.set(element, (id = ++lastId));
      return id;
    };
    const nameOf = (info: string) => {
      if (props.language) return props.language(info);
      const word = firstWord(info);
      return word && Object.hasOwn(props.languages, word) ? word : undefined;
    };

    function measure() {
      const box = layer.value?.getBoundingClientRect();
      if (!box) return;
      const { view } = props.editor;
      const next: Block[] = [];
      props.editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== "codeBlock") return;
        const element = view.nodeDOM(pos);
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          const info = String(node.attrs.language ?? "");
          next.push({
            id: idOf(element),
            element,
            top: rect.top - box.top,
            right: box.right - rect.right,
            language: nameOf(info),
            written: info.trim().split(/\s/, 1)[0] || undefined,
          });
        }
        return false;
      });
      blocks.value = next;
    }

    // The block's position comes from its DOM at the moment of choosing, since a teammate's edit moves it.
    function choose(block: Block, language: string | null) {
      const { view } = props.editor;
      const pos = view.posAtDOM(block.element, 0) - 1;
      if (view.state.doc.nodeAt(pos)?.type.name !== "codeBlock") return;
      props.editor
        .chain()
        .command(({ tr }) => {
          tr.setNodeAttribute(pos, "language", language);
          return true;
        })
        .run();
    }

    // Wrapping, images loading, and the window resizing move blocks without an edit.
    let resize: ResizeObserver | undefined;
    onMounted(() => {
      addStyles("editor-languages", codeLanguagesCss);
      measure();
      props.editor.on("update", measure);
      if ("ResizeObserver" in globalThis) {
        resize = new ResizeObserver(() => measure());
        resize.observe(props.editor.view.dom);
      }
    });
    onBeforeUnmount(() => {
      props.editor.off("update", measure);
      resize?.disconnect();
    });

    const options = () =>
      Object.entries(props.languages)
        .toSorted(([, a], [, b]) => a.localeCompare(b))
        .map(([value, label]) => h("option", { value }, label));

    const select = (block: Block, editable: boolean) =>
      h(
        "select",
        {
          class: "cel-select",
          "aria-label": "Code language",
          disabled: !editable,
          value: block.language ?? block.written ?? "",
          onChange: (event: Event) => {
            // SAFETY: the listener is on this select.
            const { value } = event.target as HTMLSelectElement;
            choose(block, value || null);
          },
        },
        [
          h("option", { value: "" }, "Plain text"),
          // A language it doesn't offer still shows, as written.
          block.written && !block.language
            ? h("option", { value: block.written, disabled: true }, block.written)
            : null,
          ...options(),
        ],
      );

    return () => {
      const editable = props.editor.isEditable;
      return h(
        "div",
        { ref: layer, class: "cel-layer" },
        blocks.value.map((block) =>
          h(
            "div",
            {
              key: block.id,
              class: "cel-block",
              style: { top: `${block.top + 4}px`, right: `${block.right + 4}px` },
            },
            slots.select
              ? slots.select({
                  language: block.language,
                  written: block.written,
                  editable,
                  choose: (language) => choose(block, language),
                })
              : select(block, editable),
          ),
        ),
      );
    };
  },
});
