// A dev page for the editor alone: the Markdown on the left and the editor on the right, bound both ways.
import { createApp, defineComponent, h, ref } from "vue";
import { ComarkEditor } from "../src/editor-vue.ts";

const sample = `# Release notes

Ship it on **Friday**, after the [review](https://comark-ui.onmax.me). :badge[New]{color="success"}

- [x] Write the changelog
- [ ] Tag the release
  - Wait for CI

::note{type="info"}
Edit this note in either pane.
::

| Package | Size |
| :-- | --: |
| comark-ui | 18 kB |

\`\`\`ts [release.ts]
await release({ tag: "v1.0.0" })
\`\`\`
`;

const App = defineComponent(() => {
  const markdown = ref(sample);
  return () =>
    h("main", [
      h("textarea", {
        value: markdown.value,
        onInput: (event: Event) => (markdown.value = (event.target as HTMLTextAreaElement).value),
        "aria-label": "Markdown",
      }),
      h("div", { class: "pane" }, [
        h(ComarkEditor, {
          modelValue: markdown.value,
          "onUpdate:modelValue": (value: string) => (markdown.value = value),
        }),
      ]),
    ]);
});

createApp(App).mount("#app");
