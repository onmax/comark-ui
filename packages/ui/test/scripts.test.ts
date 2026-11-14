import { Script } from "node:vm";
import { createHtmlRenderer } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import html, { mermaidScript, type PresetOptions } from "../src/html.ts";
import vue from "../src/vue.ts";

const offline: PresetOptions = {
  chips: { download: false },
  badge: { download: false },
  icon: { fetch: false },
  diagrams: { draw: false },
  outline: { rail: true },
};

// A block of every plugin whose HTML renderer writes a script.
const document = [
  "---\ndate: 2026-10-23\n---",
  "::properties\n::",
  "## Pigeons",
  "Pigeons find home by the sun :cite[1].",
  "::sources\n1. [Magnetoreception](https://en.wikipedia.org/wiki/Magnetoreception)\n::",
  "## Ducks",
  "![A duck](/duck.png)",
  "::carousel\n:::slide\nOne.\n:::\n\n:::slide\nTwo.\n:::\n::",
  '::screenshot{src="/before.png" alt="Toolbar" viewport="640x250"}\n:::annotation{x=4 y=28 w=40 h=40}\nWraps.\n:::\n::',
  '::chart{title="Pigeons"}\n| day | pigeons |\n| --- | --: |\n| Mon | 3 |\n| Tue | 4 |\n::',
  "```csv\nBird,Seen\nHeron,2\n```",
  "```ts\nconst a = 1\n```",
  "::code-group\n```sh [pnpm]\npnpm add x\n```\n```sh [npm]\nnpm i x\n```\n::",
  '::magic-move{title="Rename"}\n```ts [Before]\nconst a = 1\n```\n\n```ts [After]\nconst b = 1\n```\n::',
  "![A flower](https://example.com/flower.webm){width=960 height=540}",
  '::embed{url="https://x.com/_onmax/status/2116191062418997278" title="A post"}\n::',
  "::question{#first}\nWhich runs first?\n\n- [x] A promise\n- [ ] A timer\n::",
  "```mermaid\nflowchart LR\n  A --> B\n```",
].join("\n\n");

const scriptsIn = (out: string) =>
  [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]!);

describe("preset scripts", () => {
  it.each([
    "![Sound](sound.mp3)",
    "- Item\n\n  ```ts\n  const a = 1\n  ```",
    "> ```ts\n> const a = 1\n> ```",
    "::tabs\n:::tab{label=One}\nOne\n:::\n::",
    "::question{#nested}\nWhich?\n\n- [x] One\n- [ ] Two\n::",
    "::sources\n1. [One](https://example.com)\n::",
  ])("allowlists scripts under native parents: %s", async (markdown) => {
    const preset = html(offline);
    for (const input of [
      markdown,
      markdown
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    ]) {
      const out = await createHtmlRenderer(preset)(input);
      const written = scriptsIn(out);
      expect(written.length).toBeGreaterThan(0);
      for (const script of written) expect(preset.scripts).toContain(script);
    }
  });
  it("lists the text of every inline script the HTML renderer writes, each once", async () => {
    const preset = html(offline);
    for (const script of preset.scripts) expect(() => new Script(script)).not.toThrow();
    const out = await createHtmlRenderer(preset)(document);
    const written = new Set(scriptsIn(out));
    // Zoom, carousel, annotate, charts, sources, table, code, tabs, magic move, media, embed, quiz, outline,
    // properties, and Mermaid.
    expect(written.size).toBe(15);
    expect(preset.scripts.toSorted()).toEqual([...written].toSorted());
    expect(preset.scripts).toContain(mermaidScript);
  });

  it("leaves out the scripts of the plugins that are off, and has none outside HTML", async () => {
    const all = html(offline).scripts;
    const fewer = html({ ...offline, quiz: false, mermaid: false, tabs: false }).scripts;
    expect(fewer.length).toBe(all.length - 3);
    expect(fewer).not.toContain(mermaidScript);
    const preset = html({ ...offline, quiz: false });
    const out = await createHtmlRenderer(preset)(document);
    for (const script of scriptsIn(out)) expect(preset.scripts).toContain(script);
    expect(vue(offline).scripts).toEqual([]);
  });
});
