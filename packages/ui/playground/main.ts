// Shared by the local editor playground and the docs build.
import { EditorContent } from "@tiptap/vue-3";
import { createApp, defineComponent, h, ref, watch } from "vue";
import { Upload } from "../src/editor.ts";
import { type ComponentInfo, useComarkEditor } from "../src/editor-vue.ts";

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
Edit this note in either pane. Open a component's props from its bar.
::

::card-group
:::card{title="Renderers" icon="lucide:rocket" to="/guide/renderers"}
Draw the saved Markdown in Vue, React, Svelte, or HTML.

#footer
Read the guide.
:::

:::card{title="Theming" color="neutral"}
Match the editor to your app.
:::
::

::chart{type="stacked" labels title="Review time (min)"}
| week | reading | writing |
| --- | --: | --: |
| 1 | 12 | 30 |
| 2 | 9 | 21 |
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

[^docs]: The [editor guide](https://comark-ui.onmax.me/guide/editor) lists what the editor keeps.

| Package | Size |
| :-- | --: |
| comark-ui | 18 kB |

\`\`\`ts [release.ts]
await release({ tag: "v1.0.0" })
\`\`\`
`;

const colors = ["primary", "secondary", "success", "info", "warning", "error", "neutral"];
// Typed fields for the blocks the sample uses. Any other component edits its props as names and values.
const components = {
  chart: {
    label: "Chart",
    props: {
      type: {
        options: [
          "bar",
          "stacked",
          "line",
          "area",
          "scatter",
          "dumbbell",
          "waterfall",
          "pie",
          "gantt",
          "sankey",
        ],
        default: "bar",
      },
      title: {},
      labels: { type: "boolean", description: "Prints the numbers on the chart." },
      horizontal: { type: "boolean" },
    },
  },
  "card-group": { label: "Card group" },
  card: {
    label: "Card",
    props: {
      title: {},
      icon: { description: "An Iconify name, such as lucide:rocket." },
      to: { label: "Link" },
      color: { options: colors, default: "primary" },
      variant: { options: ["outline", "soft", "subtle"], default: "outline" },
    },
  },
  badge: { label: "Badge", props: { color: { options: colors, default: "primary" } } },
} satisfies Record<string, ComponentInfo>;

const App = defineComponent(() => {
  const markdown = ref(sample);
  const { editor, editable } = useComarkEditor(markdown, { extensions: [upload], components });
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
        h("div", { class: "pane-head" }, [
          h("h2", "Rich text"),
          h(
            "button",
            {
              type: "button",
              disabled: !editable.value,
              onClick: () => editor.value?.chain().focus().chooseFiles().run(),
            },
            "Insert image",
          ),
        ]),
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
