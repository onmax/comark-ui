import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import math from "../src/index.ts";
import { svelteBundle } from "./svelte-bundle.ts";

// e2e/math-svelte.e2e.ts mounts the same document in a browser.
const markdown = "Mass $\\frac{a}{b}$, and a broken $\\frac{a}$.\n\n$$\n\\sum_i i\n$$\n";

describe("comark-mathml in @comark/svelte", async () => {
  const value = await parseMarkdown(markdown, { plugins: [math()] });

  it("server-renders typeset formulas as MathML and a broken one as its TeX", async () => {
    const dir = await mkdtemp(join(tmpdir(), "comark-mathml-svelte-"));
    try {
      const file = join(dir, "render.mjs");
      await writeFile(file, await svelteBundle("./fixtures/svelte-server.ts", "server"));
      const { render } = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
        render: (document: typeof value) => string;
      };
      const html = render(value);
      expect(html).toContain('<span class="cmh cmh-source">\\frac{a}</span>');
      expect(html.match(/<span class="cmh(?: cmh-display)?">/g)).toHaveLength(2);
      expect(html).toContain("<mfrac>");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
