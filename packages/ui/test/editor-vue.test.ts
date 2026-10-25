import { effectScope, nextTick, ref } from "vue";
import { expect, it, vi } from "vite-plus/test";
import { useComarkEditor } from "../src/editor-vue.ts";

const mocks = vi.hoisted(() => ({
  serialize: vi.fn(),
  update: () => {},
  setContent: vi.fn(),
}));

vi.mock("../src/editor.ts", () => ({
  ComarkKit: { configure: () => ({}) },
  checkMarkdown: async () => ({ editable: true }),
  fromMarkdown: async (source: string) => ({ doc: { source }, frontmatter: {} }),
  toMarkdown: mocks.serialize,
}));
vi.mock("@tiptap/vue-3", () => ({
  EditorContent: {},
  Editor: class {
    commands = { setContent: mocks.setContent };
    constructor(options: { onUpdate: () => void }) {
      mocks.update = options.onUpdate;
    }
    getJSON() {
      return {};
    }
    setEditable() {}
    destroy() {}
  },
}));

it("does not overwrite an external load when an older save finishes", async () => {
  const scope = effectScope();
  const markdown = ref("Old document");
  let finish!: (value: string) => void;
  mocks.serialize.mockReturnValueOnce(
    new Promise<string>((resolve) => {
      finish = resolve;
    }),
  );
  const binding = scope.run(() => useComarkEditor(markdown))!;
  try {
    await vi.waitFor(() => expect(binding.editor.value).toBeDefined());
    mocks.update();
    expect(mocks.serialize).toHaveBeenCalledOnce();
    markdown.value = "New external document";
    await nextTick();
    finish("Stale editor save");
    await vi.waitFor(() =>
      expect(mocks.setContent).toHaveBeenCalledWith(
        { source: "New external document" },
        { emitUpdate: false },
      ),
    );
    expect(markdown.value).toBe("New external document");
  } finally {
    scope.stop();
  }
});
