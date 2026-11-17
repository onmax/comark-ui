import { chromium } from "@playwright/test";
import { parseMarkdown } from "comark";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compile } from "svelte/compiler";
import { build } from "vite";
import { afterAll, describe, expect, it } from "vite-plus/test";
import math from "../src/index.ts";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Bundles @comark/svelte with this package's Formula, so both share Svelte's internals, for the server or the browser.
async function bundle(entry: string, generate: "server" | "client") {
  const result = await build({
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "comark-mathml/client": source("../src/client.ts"),
        "comark-mathml": source("../src/index.ts"),
      },
      conditions: ["svelte", "browser"],
    },
    ssr: { noExternal: true, resolve: { conditions: ["svelte"] } },
    plugins: [
      {
        name: "math-test-svelte",
        transform(code, id) {
          if (id.endsWith(".svelte")) return compile(code, { filename: id, generate }).js;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      ...(generate === "server"
        ? { ssr: source(entry), rollupOptions: { output: { format: "es" as const } } }
        : { lib: { entry: source(entry), formats: ["iife" as const], name: "fixture" } }),
    },
  });
  const output = (Array.isArray(result) ? result[0]! : result) as {
    output: { type: string; code?: string }[];
  };
  return output.output.find((chunk) => chunk.type === "chunk")!.code!;
}

const markdown = "Mass $\\frac{a}{b}$, and a broken $\\frac{a}$.\n\n$$\n\\sum_i i\n$$\n";
const browser = chromium.launch();
afterAll(async () => (await browser).close());

describe("comark-mathml in @comark/svelte", async () => {
  const value = await parseMarkdown(markdown, { plugins: [math()] });

  it("server-renders typeset formulas as MathML and a broken one as its TeX", async () => {
    const dir = await mkdtemp(join(tmpdir(), "comark-mathml-svelte-"));
    try {
      const file = join(dir, "render.mjs");
      await writeFile(file, await bundle("./fixtures/svelte-server.ts", "server"));
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

  it("gives formulas made in the browser MathML's namespace", async () => {
    const page = await (await browser).newPage();
    try {
      await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
      await page.addScriptTag({ content: await bundle("./fixtures/svelte-client.ts", "client") });
      // The document goes as JSON, the form a page receives it in.
      await page.evaluate(
        (json) =>
          (
            window as unknown as { fixture: { mountDocument: (document: unknown) => void } }
          ).fixture.mountDocument(JSON.parse(json)),
        JSON.stringify(value),
      );
      await page.waitForFunction(() => document.querySelectorAll(".cmh").length === 3);
      const shown = await page.evaluate(() =>
        [...document.querySelectorAll(".cmh")].map((formula) => {
          const visible = [...formula.querySelectorAll("math")].filter(
            (math) => math.getBoundingClientRect().width > 0,
          );
          return {
            source: formula.classList.contains("cmh-source") ? formula.textContent : null,
            namespaces: visible.map((math) => [
              math.namespaceURI,
              math.querySelector("mi, mn, mo")?.namespaceURI,
            ]),
          };
        }),
      );
      const MATHML = "http://www.w3.org/1998/Math/MathML";
      expect(shown).toEqual([
        { source: null, namespaces: [[MATHML, MATHML]] },
        { source: "\\frac{a}", namespaces: [] },
        { source: null, namespaces: [[MATHML, MATHML]] },
      ]);
    } finally {
      await page.close();
    }
  });
});
