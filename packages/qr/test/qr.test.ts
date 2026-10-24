import { createHtmlRenderer } from "@comark/html";
import { type Node, parseMarkdown } from "comark";
import { renderSVG } from "uqr";
import { describe, expect, it } from "vite-plus/test";
import qr, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [qr()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [qr()] })).meta.issues;
const attrsOf = async (markdown: string) => {
  const { nodes } = await parseMarkdown(markdown, { plugins: [qr()] });
  const find = (list: Node[]): Record<string, unknown> | undefined => {
    for (const node of list) {
      if (!Array.isArray(node)) continue;
      if (node[0] === "qr") return node[1];
      const [, , ...children] = node;
      const found = find(children);
      if (found) return found;
    }
  };
  return find(nodes);
};

describe("comark-qr", () => {
  it("draws a QR code as an inline SVG path, and inlines the styles once", async () => {
    const html = await render(
      'Scan :qr{value="https://comark-ui.onmax.me"} or :qr{value="https://example.com/a&b"}',
    );
    expect(html.match(/<style data-comark-qr>/g)).toHaveLength(1);
    expect(html.replace(/<style[^>]*>.*?<\/style>/, "")).toMatch(
      /Scan <span class="cqr" role="img" aria-label="QR code: https:\/\/comark-ui\.onmax\.me"><svg viewBox="0 0 (\d+) \1" width="128" height="128" aria-hidden="true"><path d="M[\d hHvMz]+" fill="currentColor"><\/path><\/svg><\/span>/,
    );
    expect(html).toContain('aria-label="QR code: https://example.com/a&amp;b"');
  });

  it("encodes the same modules as uqr, with a two-module quiet zone", async () => {
    const attrs = await attrsOf(':qr{value="https://comark-ui.onmax.me"}');
    // uqr draws each dark module as its own 10-unit square; the plugin joins each row's runs into one.
    const squares = [
      ...renderSVG("https://comark-ui.onmax.me", { border: 2, ecc: "M" }).matchAll(
        /M(\d+),(\d+)h10v10h-10z/g,
      ),
    ];
    const dark = new Set(squares.map(([, x, y]) => `${Number(x) / 10},${Number(y) / 10}`));
    const drawn = new Set<string>();
    for (const [, x, y, length] of String(attrs?.path).matchAll(/M(\d+) (\d+)h(\d+)/g))
      for (let n = 0; n < Number(length); n++) drawn.add(`${Number(x) + n},${y}`);
    expect(dark.size).toBeGreaterThan(100);
    expect(drawn).toEqual(dark);
    expect(attrs).toMatchObject({ value: "https://comark-ui.onmax.me", size: 29 });
  });

  it("reports each problem, naming the block and the fix, and renders nothing for it", async () => {
    expect(await issues(`:qr\n\n:qr{value="${"x".repeat(5000)}"}`)).toEqual([
      '`:qr` 1 needs a `value` to encode, such as `:qr{value="https://example.com"}`.',
      expect.stringMatching(/^`:qr` 2 can't encode its `value` \(.+\)\. Shorten it\.$/),
    ]);
    expect(await render(":qr")).not.toContain("cqr");
  });

  it("names each issue's rule, and reports text in its brackets and props it doesn't read", async () => {
    const { meta, nodes } = await parseMarkdown(
      ':qr[Scan me]{value="https://example.com" url="https://example.com"} :qr',
      { plugins: [qr()] },
    );
    expect(meta.issueRules).toEqual({
      "`:qr` 1 drops the text in its brackets. Put the link in `value`, and write any text outside the `:qr`.":
        "comark/qr/content-dropped",
      "`:qr` 1: `url` isn't a prop of `:qr`, so it's ignored. Use `value`.":
        "comark/qr/unknown-prop",
      '`:qr` 2 needs a `value` to encode, such as `:qr{value="https://example.com"}`.':
        "comark/qr/missing-value",
    });
    expect(JSON.stringify(nodes)).not.toContain("Scan me");
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown(":qr", { plugins: [earlier, qr()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
