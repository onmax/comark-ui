// @vitest-environment happy-dom
import { EditorContent } from "@tiptap/vue-3";
import type { LanguageRegistration } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import dark from "shiki/themes/github-dark.mjs";
import light from "shiki/themes/github-light.mjs";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createApp, defineComponent, h, nextTick, ref, type VNode } from "vue";
import { CodeHighlight, toMarkdown } from "../src/editor.ts";
import { CodeLanguageSelect, type CodeLanguageSlot, useComarkEditor } from "../src/editor-vue.ts";

const source = "```ts\nconst a = 1\n```\n\n```cobol\nMOVE A TO B\n```\n";

const shiki = await createHighlighterCore({
  themes: [light, dark],
  langs: [],
  engine: createJavaScriptRegexEngine(),
});
const grammars: Record<string, () => Promise<{ default: LanguageRegistration[] }>> = {
  ts: () => import("shiki/langs/typescript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
};
const themes = { light: "github-light", dark: "github-dark" };

const unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts.splice(0)) unmount();
});

type SelectProps = {
  languages: Record<string, string>;
  language?: (info: string) => string | undefined;
};

async function mount(select?: SelectProps, slots?: { select: (slot: CodeLanguageSlot) => VNode }) {
  const asked: string[] = [];
  const highlighter = async (language: string) => {
    asked.push(language);
    const grammar = grammars[language];
    if (!grammar) return undefined;
    await shiki.loadLanguage(...(await grammar()).default);
    return shiki;
  };
  const markdown = ref(source);
  let binding!: ReturnType<typeof useComarkEditor>;
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(
    defineComponent(() => {
      binding = useComarkEditor(markdown, {
        extensions: [CodeHighlight.configure({ highlighter, themes })],
      });
      return () => {
        const editor = binding.editor.value;
        if (!editor) return null;
        return h("div", { style: "position:relative" }, [
          h(EditorContent, { editor }),
          select ? h(CodeLanguageSelect, { editor, ...select }, slots) : null,
        ]);
      };
    }),
  );
  app.mount(host);
  unmounts.push(() => {
    app.unmount();
    host.remove();
  });
  await vi.waitFor(() => expect(host.querySelector("pre")).not.toBeNull());
  await nextTick();
  return { markdown, editor: binding.editor.value!, host, asked };
}

describe("CodeHighlight", () => {
  it("colors code blocks with the page's Shiki and leaves the document plain", async () => {
    const { editor, host, asked } = await mount();
    await vi.waitFor(() => expect(host.querySelector("pre.shiki")).not.toBeNull());
    const [ts, cobol] = host.querySelectorAll("pre");
    expect(ts!.textContent).toBe("const a = 1");
    expect(ts!.querySelector("span[style]")?.getAttribute("style")).toMatch(
      /^color: ?#[0-9A-F]{6}; ?--shiki-dark: ?#[0-9A-F]{6};?$/,
    );
    expect(cobol!.classList.contains("shiki")).toBe(false);
    expect(cobol!.querySelector("span[style]")).toBeNull();
    expect(document.querySelector("style[data-comark-editor-highlight]")?.textContent).toContain(
      "--shiki-dark",
    );
    expect(await toMarkdown(editor.getJSON())).toBe(source);

    // Typing recolors the block, and asks for no language twice, even one it doesn't have.
    editor.commands.insertContentAt(1, "let b = 2\n");
    await nextTick();
    expect(host.querySelector("pre.shiki")?.textContent).toBe("let b = 2\nconst a = 1");
    expect(host.querySelectorAll("pre.shiki span[style]").length).toBeGreaterThan(4);
    expect(asked).toEqual(["ts", "cobol"]);
  });
});

describe("CodeLanguageSelect", () => {
  const languages = { typescript: "TypeScript", json: "JSON" };
  const language = (info: string) =>
    ({ ts: "typescript", typescript: "typescript", json: "json" })[info.split(" ")[0]!];

  it("shows each block's language and writes the one picked", async () => {
    const { host, markdown } = await mount({ languages, language });
    const selects = [...host.querySelectorAll<HTMLSelectElement>(".cel-select")];
    expect(selects).toHaveLength(2);
    expect(selects.map((select) => select.getAttribute("aria-label"))).toEqual([
      "Code language",
      "Code language",
    ]);
    expect([...selects[0]!.options].map((option) => option.textContent)).toEqual([
      "Plain text",
      "JSON",
      "TypeScript",
    ]);
    expect(selects[0]!.value).toBe("typescript");
    // A language it doesn't offer shows as written.
    expect(selects[1]!.value).toBe("cobol");

    selects[1]!.value = "json";
    selects[1]!.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(markdown.value).toContain("```json\nMOVE A TO B\n```"));
    selects[0]!.value = "";
    selects[0]!.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(markdown.value).toContain("```\nconst a = 1\n```"));
  });

  it("refreshes silent loads and rejects choices in read-only mode", async () => {
    const { host, markdown, editor } = await mount({ languages, language });
    markdown.value = source.replace("```ts", "```json");
    await vi.waitFor(() => expect(editor.state.doc.firstChild?.attrs.language).toBe("json"));
    await nextTick();
    const select = host.querySelector<HTMLSelectElement>(".cel-select")!;
    expect(select.value).toBe("json");
    select.value = "typescript";
    select.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(markdown.value).toContain("```typescript"));
    const protectedSource = "---\n# Preserve this comment\ntitle: Example\n---\n\n" + source;
    markdown.value = protectedSource;
    await vi.waitFor(() => expect(editor.isEditable).toBe(false));
    await nextTick();
    const disabled = host.querySelector<HTMLSelectElement>(".cel-select")!;
    expect(disabled.disabled).toBe(true);
    disabled.value = "json";
    disabled.dispatchEvent(new Event("change"));
    await nextTick();
    expect(markdown.value).toBe(protectedSource);
  });

  it("maps retained choices through edits and invalidates deleted targets", async () => {
    const choices: CodeLanguageSlot[] = [];
    const { editor } = await mount(
      { languages },
      {
        select: (slot) => {
          choices.push(slot);
          return h("span", String(slot.editable));
        },
      },
    );
    const chooseFirst = choices[0]!.choose;
    editor.setEditable(false, false);
    await nextTick();
    expect(choices.at(-1)!.editable).toBe(false);
    chooseFirst("json");
    expect(editor.state.doc.firstChild?.attrs.language).toBe("ts");
    editor.setEditable(true, false);
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph" });
    const paragraphPos = editor.state.doc.content.size - 2;
    const inserted = editor.schema.nodes.codeBlock!.create(
      { language: "ts" },
      editor.schema.text("new"),
    );
    editor.view.dispatch(
      editor.state.tr.delete(paragraphPos, paragraphPos + 2).insert(0, inserted),
    );
    await nextTick();
    chooseFirst("json");
    expect(editor.state.doc.child(0).attrs.language).toBe("ts");
    expect(editor.state.doc.child(1).attrs.language).toBe("json");
    const pos = inserted.nodeSize;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + editor.state.doc.child(1).nodeSize));
    await nextTick();
    const before = editor.getJSON();
    expect(() => chooseFirst("typescript")).not.toThrow();
    expect(editor.getJSON()).toEqual(before);
  });

  it("draws the `#select` slot in place of the native select", async () => {
    const { host, markdown } = await mount(
      { languages },
      {
        select: ({ language, written, choose }: CodeLanguageSlot) =>
          h("button", { class: "pick", onClick: () => choose("json") }, language ?? written),
      },
    );
    const buttons = [...host.querySelectorAll<HTMLButtonElement>(".cel-block > .pick")];
    expect(host.querySelector(".cel-select")).toBeNull();
    // With no `language`, a block's first word names it only when it's a key of `languages`.
    expect(buttons.map((button) => button.textContent)).toEqual(["ts", "cobol"]);
    buttons[0]!.click();
    await vi.waitFor(() => expect(markdown.value).toContain("```json\nconst a = 1\n```"));
  });
});
