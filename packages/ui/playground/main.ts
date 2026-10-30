// Shared by the local editor playground and the docs build.
import { EditorContent } from "@tiptap/vue-3";
import { createApp, defineComponent, h, ref, watch } from "vue";
import { Upload } from "../src/editor.ts";
import { useComarkEditor } from "../src/editor-vue.ts";

// A slow upload that reports progress, so the placeholder shows. Its URL lives only in this tab.
const upload = Upload.configure({
  async upload(file, progress) {
    for (let step = 1; step <= 10; step++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      progress(step / 10);
    }
    return URL.createObjectURL(file);
  },
});

const sample = `# Release notes

Ship it on **Friday**, after the [review](https://comark-ui.onmax.me). :badge[New]{color="success"}

- [x] Write the changelog
- [ ] Tag the release
  - Wait for CI

::note{type="info"}
Edit this note in either pane.
::

> [!TIP] Before you tag
> Check the {--old--}{++new++} changelog{>>Mention the migration.<<} against the docs[^docs].

::question{#release-day}
When does the release go out?

- [x] Friday, after the review
  > The review is the last step before tagging.
- [ ] Monday
  > Monday is for the retro.
::

[^docs]: The [editor guide](https://comark-ui.onmax.me/guide/editor/) lists what the editor keeps.

| Package | Size |
| :-- | --: |
| comark-ui | 18 kB |

\`\`\`ts [release.ts]
await release({ tag: "v1.0.0" })
\`\`\`
`;

const App = defineComponent(() => {
  const markdown = ref(sample);
  const { editor, editable } = useComarkEditor(markdown, { extensions: [upload] });
  watch(editor, (current) =>
    current?.setOptions({
      editorProps: {
        attributes: { role: "textbox", "aria-label": "Rich text", "aria-multiline": "true" },
      },
    }),
  );
  return () =>
    h("main", [
      h("section", { class: "source" }, [
        h("label", { for: "markdown" }, "Markdown source"),
        h("textarea", {
          id: "markdown",
          value: markdown.value,
          // SAFETY: the listener sits on the textarea, which is the event's target.
          onInput: (event: Event) => (markdown.value = (event.target as HTMLTextAreaElement).value),
          "aria-label": "Markdown",
          spellcheck: false,
        }),
      ]),
      h("section", { class: "pane", "aria-label": "Rich-text editor" }, [
        h("h2", "Rich text"),
        h(
          "p",
          { class: "status", role: "status" },
          !editor.value
            ? "Loading editor…"
            : editable.value
              ? "Changes update the Markdown source."
              : "Read-only: this document contains syntax the editor cannot preserve.",
        ),
        editor.value ? h(EditorContent, { editor: editor.value }) : null,
      ]),
    ]);
});

createApp(App).mount("#app");
