import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import { callouts, components, references } from "../src/html.ts";

type Options = Parameters<typeof callouts>[0];
const render = (markdown: string, options?: Options, registerDefaultPlugins = true) =>
  createHtmlRenderer({ plugins: [callouts(options)], components, registerDefaultPlugins })(
    markdown,
  );
const callout = (html: string) =>
  /<div class="cgc" data-type="(\w+)">.*?<p class="cgc-title">(.*?)<\/p><div class="cgc-body">([\s\S]*?)<\/div><\/div>/.exec(
    html.replaceAll("\n", " "),
  );

describe("comark-github callouts", () => {
  it("turns each GitHub alert into a callout with its icon, title, and body, and inlines the styles once", async () => {
    const types = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
    const html = await render(types.map((type) => `> [!${type}]\n> Body of ${type}.`).join("\n\n"));
    for (const type of types) {
      const lower = type.toLowerCase();
      expect(html).toMatch(
        new RegExp(
          `<div class="cgc" data-type="${lower}"><span class="cgc-icon" aria-hidden="true"><svg [^>]+>.+?</svg></span><p class="cgc-title">${lower[0]!.toUpperCase()}${lower.slice(1)}</p>`,
        ),
      );
      expect(html).toContain(`Body of ${type}.`);
    }
    expect(html.match(/<style data-comark-github>/g)).toHaveLength(1);
    expect(html).not.toContain("[!");
  });

  it("works with Comark's default plugins and without them", async () => {
    for (const defaults of [true, false]) {
      const match = callout(await render("> [!tip]\n> Use **pnpm**.", undefined, defaults));
      expect(match?.[1]).toBe("tip");
      expect(match?.[3]).toMatch(/^\s*<p>\s*Use <strong>pnpm<\/strong>.\s*<\/p>\s*$/);
    }
  });

  it("takes the rest of the marker's line as the title", async () => {
    const match = callout(await render("> [!WARNING] Breaking change in **v2**\n> The API moved."));
    expect(match?.[2]).toBe("Breaking change in v2");
    expect(match?.[3]).toContain("The API moved.");
    expect(match?.[3]).not.toContain("Breaking");
  });

  it("splits inline formatting that crosses the marker line", async () => {
    const match = callout(await render("> [!NOTE] **title\n> continued**\n> Body"));
    expect(match?.[2]).toBe("title");
    expect(match?.[3]).toContain("<strong>continued</strong>");
    expect(match?.[3]).toContain("Body");
  });

  it("keeps every block of the body, and allows a callout with no body", async () => {
    const html = await render(
      "> [!NOTE]\n> First.\n>\n> - one\n> - two\n>\n> ```ts\n> const a = 1\n> ```\n\n> [!TIP]",
    );
    const body = callout(html)?.[3];
    expect(body).toContain("First.");
    expect(body).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(body).toContain("const a = 1");
    expect(html).toMatch(
      /data-type="tip">.*<p class="cgc-title">Tip<\/p><div class="cgc-body"><\/div>/s,
    );
  });

  it("leaves plain quotes and unknown types as blockquotes", async () => {
    const html = await render("> Just a quote.\n\n> [!DANGER]\n> Not a GitHub type.");
    expect(html).not.toContain('class="cgc"');
    expect(html.match(/<blockquote>/g)).toHaveLength(2);
    expect(html).not.toContain("<style");
  });

  it("reports a marker that isn't a GitHub type, and names each issue's rule", async () => {
    for (const defaults of [true, false]) {
      const { meta } = await parseMarkdown(
        "> [!INFO]\n> Ducks.\n\n> [!tip]\n> Pigeons.\n\n> [x] Done.",
        {
          plugins: [callouts(), references({ repo: "pond" })],
          registerDefaultPlugins: defaults,
        },
      );
      expect(meta.issues).toEqual([
        'The quote marked "[!INFO]" isn\'t a GitHub callout, so it renders as a plain quote with the marker as text. Use `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]`.',
        expect.stringMatching(/^references: `repo` must be owner\/name/),
      ]);
      expect(meta.issues.map((issue) => meta.issueRules[issue])).toEqual([
        "comark/github/unknown-callout-type",
        "comark/github/invalid-repo",
      ]);
    }
  });

  it("finds callouts nested in lists and other blocks", async () => {
    const html = await render("- Item\n\n  > [!IMPORTANT]\n  > Inside a list.");
    expect(html).toMatch(
      /<li>[\s\S]*<div class="cgc" data-type="important">[\s\S]*Inside a list\./,
    );
  });

  it("translates the default titles, and escapes a custom one", async () => {
    const html = await render("> [!NOTE]\n> a\n\n> [!TIP] <b>x</b>\n> b", {
      titles: { note: "Nota" },
    });
    expect(html).toContain('<p class="cgc-title">Nota</p>');
    expect(html).not.toContain("<b>");
  });
});
