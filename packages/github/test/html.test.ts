import { createHtmlRenderer } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import { parseMarkdown } from "comark";
import { html, HTML_TAGS } from "../src/html.ts";

const render = (markdown: string, registerDefaultPlugins = true) =>
  createHtmlRenderer({ plugins: [html()], registerDefaultPlugins })(markdown);

describe("comark-github html", () => {
  it("keeps the tags GitHub allows, with or without Comark's default plugins", async () => {
    for (const defaults of [true, false]) {
      const out = await render(
        "Press <kbd>Ctrl</kbd>, see H<sub>2</sub>O and x<sup>2</sup>.\n\n<details open>\n<summary>More</summary>\nHidden.\n</details>",
        defaults,
      );
      expect(out).toContain("<kbd>Ctrl</kbd>");
      expect(out).toContain("<sub>2</sub>");
      expect(out).toContain("<sup>2</sup>");
      expect(out).toMatch(
        /<details open>\s*<summary>\s*More\s*<\/summary>\s*Hidden.\s*<\/details>/,
      );
    }
  });

  it("drops scripts and styles with their content, and unwraps other tags", async () => {
    const out = await render(
      '<div><script>alert(1)</script><style>p{}</style><iframe src="https://x.dev"></iframe><custom-el>kept</custom-el></div>',
    );
    expect(out).not.toMatch(/script|alert|style|p\{\}|iframe|custom-el/);
    expect(out).toContain("kept");
  });

  it("exports the tags it keeps, so a host can allow the same ones", async () => {
    const raw = `<div>${["section", "iframe", ...HTML_TAGS].map((tag) => `<${tag}>x</${tag}>`).join("")}</div>`;
    const { nodes } = await parseMarkdown(raw, { plugins: [html()] });
    const kept = new Set<string>();
    const walk = (node: unknown) => {
      if (!Array.isArray(node) || typeof node[0] !== "string") return;
      kept.add(node[0]);
      node.slice(2).forEach(walk);
    };
    nodes.forEach(walk);
    expect([...kept].filter((tag) => !HTML_TAGS.includes(tag))).toEqual([]);
    expect(HTML_TAGS).toContain("kbd");
    expect(HTML_TAGS).not.toContain("iframe");
  });

  it("keeps GitHub's attributes and drops the rest", async () => {
    const out = await render(
      '<p align="center" class="x" id="y" style="color:red" onclick="steal()"><img src="logo.png" width="80" alt="Logo" onerror="steal()"></p>',
    );
    expect(out).toContain('align="center"');
    expect(out).toMatch(/<img src="logo.png" width="80" alt="Logo"\s*\/?>/);
    expect(out).not.toMatch(/class=|id=|style=|onclick|onerror/);
  });

  it("drops URLs that aren't relative, http, https, or mailto", async () => {
    const out = await render(
      '<a href="javascript:alert(1)">a</a> <a href="java\tscript:x">b</a> <a href="mailto:me@onmax.dev">c</a> <a href="/docs">d</a> <img src="data:image/png;base64,x"> <picture><source srcset="https://x.dev/d.png, javascript:x 2x"><img src="https://x.dev/l.png"></picture>',
    );
    expect(out).not.toMatch(/javascript|java\tscript|data:|srcset/);
    expect(out).toContain('href="mailto:me@onmax.dev"');
    expect(out).toContain('href="/docs"');
    expect(out).toContain('src="https://x.dev/l.png"');
  });

  it("leaves HTML written in Markdown alone", async () => {
    const out = await render('Text with `<script>` and a [link](https://x.dev "Title").');
    expect(out).toContain("<code>&lt;script&gt;</code>");
    expect(out).toContain('href="https://x.dev"');
  });
});
