// @vitest-environment happy-dom
import { getSchema } from "@tiptap/core";
import { EditorContent } from "@tiptap/vue-3";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { compile, createApp, defineComponent, h, nextTick, ref } from "vue";
import { ComarkKit, toMarkdown } from "../src/editor.ts";
import {
  ComarkEditor,
  componentView,
  type ComponentField,
  useComarkEditor,
  type UseComarkEditorOptions,
} from "../src/editor-vue.ts";

const nested = `::card-group
:::card{title="One" icon="lucide:star"}
Body with :badge[New]{color="success"}.

#footer
Foot
:::

:::card{title="Two"}
Second
:::
::

::chart{type="stacked" labels}
| team | done |
| ---- | ---- |
| docs | 3    |
::
`;

const unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts.splice(0)) unmount();
});

async function mount(source: string, options: UseComarkEditorOptions = {}, drawn = ".cev-block") {
  const markdown = ref(source);
  let binding!: ReturnType<typeof useComarkEditor>;
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent(() => {
      binding = useComarkEditor(markdown, options);
      return () =>
        binding.editor.value ? h(EditorContent, { editor: binding.editor.value }) : null;
    }),
  );
  app.mount(host);
  unmounts.push(() => {
    app.unmount();
    host.remove();
  });
  await vi.waitFor(() => expect(host.querySelector(drawn)).not.toBeNull());
  await nextTick();
  return { markdown, editor: binding.editor.value!, host };
}

// The panel of the component whose bar or tag names it.
function panelOf(host: HTMLElement, tag: string) {
  const owner = [...host.querySelectorAll<HTMLElement>(".cev-block,.cev-inline")].find(
    (element) =>
      element.getAttribute("data-comark-block") === tag ||
      element.getAttribute("data-comark-inline") === tag,
  );
  const panel = owner?.querySelector<HTMLElement>(".cev-panel");
  if (!panel) throw new Error(`No panel for ${tag}`);
  return panel;
}

function field<T extends HTMLElement>(panel: HTMLElement, label: string) {
  const target = [...panel.querySelectorAll("label")].find(
    (element) => element.textContent === label,
  );
  const control = target && panel.querySelector<T>(`[id="${target.htmlFor}"]`);
  if (!control) throw new Error(`No field ${label}`);
  return control;
}

function type(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
  event = "input",
) {
  control.value = value;
  control.dispatchEvent(new Event(event, { bubbles: true }));
}

describe("componentView", () => {
  it("draws nested components and slots and writes the Markdown unchanged", async () => {
    const { editor, host } = await mount(nested);
    expect(
      [...host.querySelectorAll(".cev-block")].map((block) =>
        block.getAttribute("data-comark-block"),
      ),
    ).toEqual(["card-group", "card", "card", "chart"]);
    expect(host.querySelector(".cev-inline .cev-tag")?.textContent).toContain(":badge");
    expect(host.querySelector(".cev-block [data-comark-slot='footer']")?.textContent).toBe("Foot");
    expect(host.querySelector("[data-comark-block='chart'] .cev-props")?.textContent).toContain(
      "type=stacked :labels=true",
    );
    expect(await toMarkdown(editor.getJSON())).toBe(nested);
  });

  it("keeps the schema a room shares, with or without the view", () => {
    const plain = getSchema([ComarkKit]);
    const drawn = getSchema([ComarkKit.configure({ componentView: componentView() })]);
    const shape = (schema: typeof plain) =>
      Object.values(schema.nodes).map(({ name, spec }) => [
        name,
        spec.content,
        spec.group,
        Object.keys(spec.attrs ?? {}),
      ]);
    expect(shape(drawn)).toEqual(shape(plain));
  });

  it("edits typed props, and writes them as Comark does", async () => {
    const { markdown, host } = await mount(nested, {
      components: {
        chart: {
          label: "Chart",
          props: {
            type: { options: ["bar", "stacked", "line"], default: "bar" },
            labels: { type: "boolean" },
            title: {},
          },
        },
      },
    });
    const panel = panelOf(host, "chart");
    type(field<HTMLSelectElement>(panel, "type"), "line", "change");
    type(field<HTMLInputElement>(panel, "title"), "Done per team");
    const labels = field<HTMLInputElement>(panel, "labels");
    labels.checked = false;
    labels.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() =>
      expect(markdown.value).toContain('::chart{type="line" title="Done per team"}\n| team'),
    );
    expect(host.querySelector("[data-comark-block='chart'] .cev-name")?.textContent).toBe("Chart");
  });

  it("edits, adds, and removes the props of a component it has no schema for", async () => {
    const { markdown, host } = await mount(nested);
    const panel = panelOf(host, "badge");
    type(field<HTMLInputElement>(panel, "color"), "warning");
    await vi.waitFor(() => expect(markdown.value).toContain(':badge[New]{color="warning"}'));

    const [name, value] = panel.querySelectorAll<HTMLInputElement>(".cev-add input");
    type(name!, ":count");
    type(value!, "3");
    panel
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(markdown.value).toContain(':badge[New]{color="warning" :count="3"}'),
    );

    panelOf(host, "badge").querySelector<HTMLButtonElement>("[aria-label='Remove color']")!.click();
    await vi.waitFor(() => expect(markdown.value).toContain(':badge[New]{:count="3"}'));
  });

  it("decodes bound string values for text, option, and host fields", async () => {
    const fields: ComponentField[] = [];
    const { editor, markdown, host } = await mount(
      `::card{:title='"hello"' :kind='"hello"' :image='"media.png"' :count="2" :enabled="true"}\nBody\n::\n`,
      {
        components: {
          card: {
            props: {
              title: {},
              kind: { options: ["hello", "bye"] },
              image: { type: "image" },
              count: { type: "number" },
              enabled: { type: "boolean" },
            },
          },
        },
        field: (field) => {
          fields.push(field);
          return undefined;
        },
      },
    );
    expect(editor.isEditable).toBe(true);
    const panel = panelOf(host, "card");
    expect(field<HTMLInputElement>(panel, "title").value).toBe("hello");
    expect(field<HTMLSelectElement>(panel, "kind").value).toBe("hello");
    expect(field<HTMLInputElement>(panel, "image").value).toBe("media.png");
    expect(fields.find((field) => field.name === "image")?.value).toBe("media.png");
    expect(field<HTMLInputElement>(panel, "count").value).toBe("2");
    expect(field<HTMLInputElement>(panel, "enabled").checked).toBe(true);

    type(field<HTMLInputElement>(panel, "title"), "hello!");
    type(field<HTMLSelectElement>(panel, "kind"), "bye", "change");
    await vi.waitFor(() => expect(markdown.value).toContain('title="hello!" kind="bye"'));
  });

  it.each(["[3,4]", "[3,"])(
    "keeps the pending JSON draft %s through content and prop transactions",
    async (draft) => {
      const { editor, markdown, host } = await mount(
        '::card{:rows="[1,2]" title="Before"}\nBody\n::\n',
        {
          components: { card: { props: { rows: { type: "json" }, title: {} } } },
        },
      );
      const panel = panelOf(host, "card");
      const rows = field<HTMLTextAreaElement>(panel, "rows");
      const storedRows = editor.state.doc.firstChild!.attrs.props[":rows"];
      expect(rows.value).toBe("[1,2]");
      rows.focus();
      type(rows, draft);
      let end = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text === "Body") end = pos + node.nodeSize;
      });
      editor.view.dispatch(editor.state.tr.insertText("!", end));
      await vi.waitFor(() => expect(markdown.value).toContain("Body!"));
      expect(document.activeElement).toBe(rows);
      expect(rows.value).toBe(draft);

      type(field<HTMLInputElement>(panel, "title"), "After");
      await vi.waitFor(() => expect(markdown.value).toContain("After"));
      expect(rows.value).toBe(draft);
      if (draft === "[3,") {
        rows.dispatchEvent(new Event("change", { bubbles: true }));
        expect(rows.getAttribute("aria-invalid")).toBe("true");
        expect(editor.state.doc.firstChild!.attrs.props[":rows"]).toEqual(storedRows);
      }
      type(rows, "[3,4]");
      rows.dispatchEvent(new Event("change", { bubbles: true }));
      await vi.waitFor(() => expect(markdown.value).toContain(':rows="[3,4]" title="After"'));
      expect(markdown.value).toContain("Body!");
      expect(rows.hasAttribute("aria-invalid")).toBe(false);
    },
  );

  it("lets a host draw a prop's field", async () => {
    const fields: ComponentField[] = [];
    const { markdown, host } = await mount(nested, {
      components: { card: { props: { icon: { type: "image" } } } },
      field: (field) => {
        fields.push(field);
        return h(
          "button",
          { type: "button", class: "pick", onClick: () => field.update("lucide:rocket") },
          "Pick",
        );
      },
    });
    expect(fields[0]).toMatchObject({
      component: "card",
      name: "icon",
      value: "lucide:star",
      editable: true,
    });
    panelOf(host, "card").querySelector<HTMLButtonElement>(".pick")!.click();
    await vi.waitFor(() =>
      expect(markdown.value).toContain(':::card{title="One" icon="lucide:rocket"}'),
    );
  });

  it("keeps intervening prop edits when a host field completes later", async () => {
    const fields: ComponentField[] = [];
    const { markdown, host } = await mount(nested, {
      components: { card: { props: { icon: { type: "image" } } } },
      field: (field) => {
        fields.push(field);
        return undefined;
      },
    });
    const pending = fields[0]!;
    type(field<HTMLInputElement>(panelOf(host, "card"), "title"), "Renamed");
    await vi.waitFor(() => expect(markdown.value).toContain('title="Renamed"'));

    pending.update("lucide:rocket");
    await vi.waitFor(() =>
      expect(markdown.value).toContain(':::card{title="Renamed" icon="lucide:rocket"}'),
    );
  });

  it("takes `components`, parser options, and the `#field` slot on ComarkEditor", async () => {
    const url = "https://example.com";
    const markdown = ref(`${nested}\n${url}\n`);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(
      defineComponent(
        () => () =>
          h(
            ComarkEditor,
            {
              modelValue: markdown.value,
              "onUpdate:modelValue": (value: string) => (markdown.value = value),
              components: { card: { props: { icon: { type: "image" } } } },
              registerDefaultPlugins: false,
            },
            {
              field: (field: ComponentField) =>
                h(
                  "button",
                  { type: "button", class: "pick", onClick: () => field.update("lucide:rocket") },
                  "Pick",
                ),
            },
          ),
      ),
    );
    app.mount(host);
    unmounts.push(() => {
      app.unmount();
      host.remove();
    });
    await vi.waitFor(() => expect(host.querySelector(".pick")).not.toBeNull());
    expect(host.querySelector(`a[href="${url}"]`)).toBeNull();
    host.querySelector<HTMLButtonElement>(".pick")!.click();
    await vi.waitFor(() => expect(markdown.value).toContain('icon="lucide:rocket"'));
    expect(markdown.value).toContain(`\n\n${url}\n`);
  });

  it("leaves components bare with `components: false`", async () => {
    const { host } = await mount(nested, { components: false }, "[data-comark-block]");
    expect(host.querySelector(".cev-block")).toBeNull();
  });

  it.each(["comment", "fragment"])(
    "keeps built-in fields for a conditional slot's empty %s",
    async (empty) => {
      const markdown = ref('::card{title="Title"}\nBody\n::\n');
      const host = document.createElement("div");
      document.body.append(host);
      const picker = `<button v-if="field.prop.type === 'image'" :id="field.id" class="pick" @click="field.update('media.png')">Pick</button>`;
      const app = createApp(
        defineComponent({
          components: { ComarkEditor },
          setup: () => ({
            markdown,
            components: {
              card: {
                props: { title: {}, enabled: { type: "boolean" }, image: { type: "image" } },
              },
            },
          }),
          render: compile(
            `<ComarkEditor v-model="markdown" :components="components"><template #field="field">${empty === "fragment" ? `<template v-for="item in [1]" :key="item">${picker}</template>` : picker}</template></ComarkEditor>`,
          ),
        }),
      );
      app.mount(host);
      unmounts.push(() => {
        app.unmount();
        host.remove();
      });
      await vi.waitFor(() => expect(host.querySelector(".pick")).not.toBeNull());
      const panel = panelOf(host, "card");
      expect(field<HTMLInputElement>(panel, "title").value).toBe("Title");
      expect(field<HTMLInputElement>(panel, "enabled").type).toBe("checkbox");
      type(field<HTMLInputElement>(panel, "title"), "Renamed");
      field<HTMLButtonElement>(panel, "image").click();
      await vi.waitFor(() => expect(markdown.value).toContain('title="Renamed" image="media.png"'));
    },
  );
});
