import { fileURLToPath } from "node:url";
import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import cast, { components } from "../src/html.ts";

const root = fileURLToPath(new URL("fixtures/", import.meta.url));
const render = createHtmlRenderer({ plugins: [cast({ root })], components });
const issues = async (markdown: string, options = {}) =>
  (await parseMarkdown(markdown, { plugins: [cast({ root, ...options })] })).meta.issues;
const screen = async (markdown: string) =>
  /<pre class="cca-term">(.*?)<\/pre>/s.exec(await render(markdown))?.[1];
const inline = (...lines: string[]) => `::cast\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n::`;
const header = '{"version": 2, "width": 20, "height": 4}';

describe("comark-cast", () => {
  it("renders a cast's final screen as colored text, and inlines the styles once", async () => {
    const html = await render(
      '::cast{src="test.cast" title="pnpm test"}\n::\n\n::cast{src="v3.cast"}\n::',
    );
    expect(html).toContain(
      '<figure class="cca" data-mode="screen"><figcaption>pnpm test</figcaption><pre class="cca-term">' +
        'Running <span class="cca-f2">done</span>\n' +
        '<span class="cca-f2 cca-bold">✓</span> cart <span class="cca-dim">(4)</span>\n' +
        '<span class="cca-f1">✗</span> checkout\n' +
        '<span style="color:#ff8700">o</span><span style="color:#010203">k</span> <span class="cca-fi cca-bi">inv</span></pre></figure>',
    );
    // The first line scrolled off the five-row screen, and input, markers, and the exit code draw nothing.
    expect(html).not.toContain("$ pnpm test");
    expect(html).toContain('<pre class="cca-term">two\nthree\nfour</pre>');
    expect(html.match(/<style data-comark-cast>/g)).toHaveLength(1);
    expect(await issues('::cast{src="test.cast"}\n::')).toEqual([]);
  });

  it("renders everything the program printed with mode=log", async () => {
    expect(await screen('::cast{src="v3.cast" mode="log"}\n::')).toBe("one\ntwo\nthree\nfour");
    const log = await render('::cast{src="test.cast" mode="log"}\n::');
    expect(log).toContain('data-mode="log"');
    // A line redrawn in place shows only its last state.
    expect(log).toContain(
      '<pre class="cca-term">$ pnpm test\nRunning <span class="cca-f2">done</span>\n',
    );
  });

  it("reads a cast written in a code block inside the block", async () => {
    expect(
      await screen(
        inline(
          header,
          '[0.1, "o", "\\u001b[1;94mhi\\u001b[0m there\\r\\n"]',
          '[0.2, "o", "a\\tb\\bc"]',
        ),
      ),
    ).toBe('<span class="cca-f12 cca-bold">hi</span> there\na       c');
  });

  it("keeps ANSI sequences split across output events", async () => {
    expect(await screen(inline(header, '[0.1, "o", "\\u001b[31"]', '[0.2, "o", "mred"]'))).toBe(
      '<span class="cca-f1">red</span>',
    );
  });

  it("replays cursor moves, erases, wide characters, wrapping, and the alternate screen", async () => {
    const replay = (...events: string[]) =>
      screen(inline(header, ...events.map((data) => JSON.stringify([0, "o", data]))));
    expect(await replay("abcdef\u001b[3D\u001b[KX")).toBe("abcX");
    expect(await replay("one\r\ntwo\u001b[1;1H1\u001b[2;3Hx")).toBe("1ne\ntwx");
    expect(await replay("old\u001b[2J\u001b[Hnew")).toBe("new");
    expect(await replay("漢字abc")).toBe("漢字abc");
    expect(await replay("👩‍💻|é|")).toBe("👩‍💻|é|");
    expect(await replay("0123456789012345678901")).toBe("01234567890123456789\n01");
    expect(await replay("shell\r\n\u001b[?1049hvim\u001b[?1049l$ ")).toBe("shell\n$");
    expect(await replay("\u001b[41m  \u001b[0m")).toBe('<span class="cca-b1">  </span>');
  });

  it("escapes what it prints", async () => {
    expect(await screen(inline(header, '[0, "o", "<b>&</b>"]'))).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  it("reports each problem, naming the block and the fix, and renders nothing for a broken cast", async () => {
    expect(
      await issues(
        [
          "::cast\n::",
          '::cast{src="missing.cast"}\n::',
          '::cast{src="../outside.cast"}\n::',
          '::cast{src="https://example.com/a.cast"}\n::',
          inline("not json"),
          inline(header, "[0.1, 5]"),
          inline(header, '[0.1, "i", "q"]'),
          '::cast{src="v3.cast" mode="player"}\n::',
        ].join("\n\n"),
      ),
    ).toEqual([
      '`::cast` 1 needs a cast: write `::cast{src="demo.cast"}`, or put the cast in a code block inside it.',
      '`::cast` 2 "missing.cast": file not found. It resolved to "missing.cast" under the root; check the path or `root`.',
      '`::cast` 3 "../outside.cast": the path leaves the root. Move the file under the root or widen `root`.',
      '`::cast` 4 "https://example.com/a.cast": only local files can be read.',
      '`::cast` 5 isn\'t an asciinema cast: its first line must be a JSON header with `"version": 2` or `3`. Record it with `asciinema rec`.',
      '`::cast` 6: line 2 isn\'t an event like `[0.5, "o", "text"]`. Fix it or remove it.',
      "`::cast` 7 has no output events, so there's nothing to show.",
      '`::cast` 8 "v3.cast": `mode` must be `screen` or `log`; it shows the screen.',
    ]);
    expect(await render('::cast{src="missing.cast"}\n::')).not.toContain("cca");
  });

  it("reads through a custom reader, and reports its errors", async () => {
    const read = (path: string) =>
      path === "a.cast" ? `${header}\n[0, "o", "custom"]` : undefined;
    expect(
      await parseMarkdown('::cast{src="./a.cast"}\n::', { plugins: [cast({ read })] }).then(
        (document) => document.meta.issues,
      ),
    ).toEqual([]);
    expect(
      await issues('::cast{src="a.cast"}\n::', {
        read: () => {
          throw new Error("denied");
        },
      }),
    ).toEqual([
      '`::cast` 1 "a.cast": reading "a.cast" failed: denied. Check the file or the `read` option.',
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      '::cast{src="v3.cast" titel="pnpm test" mode="player"}\n::\n\n::cast\n::',
      { plugins: [cast({ root })] },
    );
    expect(meta.issueRules).toEqual({
      "`::cast` 1 \"v3.cast\": `titel` isn't a prop of `::cast`, so it's ignored. Use `src`, `mode`, or `title`.":
        "comark/cast/unknown-prop",
      '`::cast` 1 "v3.cast": `mode` must be `screen` or `log`; it shows the screen.':
        "comark/cast/invalid-mode",
      '`::cast` 2 needs a cast: write `::cast{src="demo.cast"}`, or put the cast in a code block inside it.':
        "comark/cast/missing-cast",
    });
  });

  it("keeps the issues other plugins reported", async () => {
    const earlier = {
      name: "earlier",
      post(state: { tree: { meta: { issues?: string[] } } }) {
        state.tree.meta.issues = ["An earlier issue."];
      },
    };
    const { meta } = await parseMarkdown("::cast\n::", { plugins: [earlier, cast()] });
    expect(meta.issues[0]).toBe("An earlier issue.");
    expect(meta.issues).toHaveLength(2);
  });
});
