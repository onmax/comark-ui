import { createHtmlRenderer } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import { createLazyHighlighter, type Loader } from "../src/highlighter.ts";
import html from "../src/html.ts";

const offline = { chips: { download: false }, icon: { fetch: false as const } };
const fence = (language: string, body: string) => `\`\`\`${language}\n${body}\n\`\`\``;

/** Counts the calls to each loader, so a test sees what loaded and how often. */
function counted<T extends object>(loaders: Record<string, Loader<T>>) {
  const calls: string[] = [];
  const wrapped = Object.fromEntries(
    Object.entries(loaders).map(([name, load]) => [
      name,
      () => {
        calls.push(name);
        return load();
      },
    ]),
  );
  return { calls, loaders: wrapped };
}

const themes = {
  light: () => import("shiki/themes/github-light.mjs"),
  dark: () => import("shiki/themes/github-dark.mjs"),
};

describe("createLazyHighlighter", () => {
  it("colors code in the preset, loading each grammar once, on first use", async () => {
    const grammars = counted({
      typescript: () => import("shiki/langs/typescript.mjs"),
      json: () => import("shiki/langs/json.mjs"),
    });
    const shiki = createLazyHighlighter({
      languages: grammars.loaders,
      aliases: { ts: "typescript", deno: "typescript" },
      themes,
    });
    const render = createHtmlRenderer(html({ ...offline, shiki }));

    const out = await render(
      [
        fence("deno", "const a = 1"),
        fence("ts", "const b = 2"),
        fence("cobol", "MOVE A TO B"),
      ].join("\n\n"),
    );
    expect(out.match(/<pre[^>]*class="shiki"/g)).toHaveLength(2);
    expect(out).toMatch(/<span style="color:#[0-9A-F]{6};--shiki-dark:#[0-9A-F]{6}">const<\/span>/);
    expect(out).toContain("MOVE A TO B");
    expect(grammars.calls).toEqual(["typescript"]);

    await Promise.all([render(fence("ts", "let c")), render(fence("ts", "let d"))]);
    expect(grammars.calls).toEqual(["typescript"]);
  });

  it("names the grammar a fence's info string or alias stands for", () => {
    const shiki = createLazyHighlighter({
      languages: { typescript: () => import("shiki/langs/typescript.mjs") },
      aliases: { ts: "typescript", py: "python" },
      themes: { light: themes.light },
    });
    expect(shiki.languages).toEqual(["typescript"]);
    expect(shiki.themes).toEqual({ light: "light" });
    expect(shiki.language("TS {2} [app.ts]")).toBe("typescript");
    expect(shiki.language("typescript")).toBe("typescript");
    // An alias to a grammar it doesn't have, and Object's own keys, name nothing.
    expect(shiki.language("py")).toBeUndefined();
    expect(shiki.language("constructor")).toBeUndefined();
    expect(shiki.language("")).toBeUndefined();
    expect(shiki.language(null)).toBeUndefined();
  });

  it("leaves a block plain when its grammar fails to load, and loads it again next time", async () => {
    let fail = true;
    const shiki = createLazyHighlighter({
      languages: {
        json: () =>
          fail ? Promise.reject(new Error("chunk failed")) : import("shiki/langs/json.mjs"),
      },
      themes,
    });
    const render = createHtmlRenderer(html({ ...offline, shiki }));

    const plain = await render(fence("json", '{ "a": 1 }'));
    expect(plain).not.toContain('class="shiki"');
    fail = false;
    expect(await render(fence("json", '{ "a": 1 }'))).toContain('class="shiki"');
  });
});
