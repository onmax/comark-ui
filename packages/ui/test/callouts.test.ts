import { createHtmlRenderer } from "@comark/html";
import { callouts } from "../../github/src/callouts.ts";
import tabs, { components as tabComponents } from "../../tabs/src/html.ts";
import details, { components as detailComponents } from "../../details/src/html.ts";
import { components as githubComponents } from "../../github/src/html.ts";
import cards from "../../cards/src/index.ts";
import { lint } from "../../lint/src/index.ts";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import html from "../src/html.ts";
import { isElement } from "../../../shared/nodes.ts";

const preset = () =>
  html({
    chips: { download: false },
    badge: { download: false },
    icon: { fetch: false },
    diagrams: { draw: false },
    time: { now: "2026-11-13", locale: "en-US", timeZone: "UTC" },
  });

describe("block callout paragraphs", () => {
  for (const tag of ["note", "tip", "important", "warning", "caution", "callout"]) {
    for (const prose of [
      "The :badge[New] feature.",
      "Choose `#ff0000` today.",
      "Available :time[2026-11-01] now.",
      "The :custom[New] feature.",
    ]) {
      it(`keeps ${prose} in one ${tag} paragraph`, async () => {
        const options = preset();
        const markdown = `::${tag}\n${prose}\n::`;
        const tree = await parseMarkdown(markdown, options);
        const callout = tree.nodes.find((node) => isElement(node) && node[0] === "github-callout");
        expect(callout?.slice(2)).toHaveLength(1);
        expect(callout?.[2]).toEqual([
          "p",
          {},
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ]);
        const render = createHtmlRenderer(options);
        const block = await render(markdown);
        const quote = await render(
          `> [!${tag === "callout" ? "NOTE" : tag.toUpperCase()}]\n> ${prose}`,
        );
        // Tooltip IDs include the source document's hash, which differs between the two syntaxes.
        const stable = (value: string) => value.replace(/ctm-[a-z0-9]+-/g, "ctm-document-");
        expect(stable(block)).toBe(stable(quote));
      });
    }
  }
});

describe("nested callout blocks", () => {
  const markdown = ':::note\n::card{title="Example"}\nBody.\n::\n:::';
  it("keeps component props clean in either plugin order", async () => {
    for (const plugins of [
      [callouts(), cards()],
      [cards(), callouts()],
    ]) {
      const tree = await parseMarkdown(markdown, { plugins });
      expect(tree.meta.issues ?? []).toEqual([]);
      expect(JSON.stringify(tree.nodes)).not.toContain("block-boundary");
      expect(tree.nodes[0]?.[2]?.[0]).toBe("card");
    }
  });
  for (const tag of ["note", "tip", "important", "warning", "caution", "callout"]) {
    it(`renders and lints valid nested cards in ${tag}`, async () => {
      const source = `:::${tag}
::card{title="Example"}
Body.
::

::columns{cols="2"}
One.
::

::field{name="value" type="string"}
Description.
::

::stats
| Metric | Before | After |
| --- | --- | --- |
| Size | 4 | 2 |
::

::table
| Name | Value |
| --- | --- |
| A | 1 |
::
:::`;
      const options = preset();
      const tree = await parseMarkdown(source, options);
      expect(tree.meta.issues ?? []).toEqual([]);
      expect(
        await lint(source, {
          ...options,
          components: [...Object.keys(options.components), ...options.blocks, ...options.tags],
        }),
      ).toEqual([]);
      const rendered = await createHtmlRenderer(options)(source);
      expect(rendered).toContain("Example");
      expect(rendered).not.toContain("block-boundary");
      expect(rendered).not.toMatch(/<p>\s*<div/);
    });
  }
});

describe("containers inside callouts", () => {
  for (const tag of ["note", "tip", "important", "warning", "caution", "callout"]) {
    it(`preserves compare and annotation ownership in ${tag}`, async () => {
      const source = `::::${tag}
::compare
:::screenshot{src="before.png" alt="Before" viewport="900x360"}
::::annotation{x=10 y=20 w=30 h=15}
Before note.
::::
:::
:::screenshot{src="after.png" alt="After" viewport="900x360"}
::::annotation{x=50 y=20 w=10 h=10}
After note.
::::
:::
::
::::`;
      const options = preset();
      const tree = await parseMarkdown(source, options);
      expect(tree.meta.issues ?? []).toEqual([]);
      const rendered = await createHtmlRenderer(options)(source);
      expect(rendered).toContain("Before note.");
      expect(rendered).toContain("After note.");
      expect(rendered).not.toContain("block-boundary");
    });
    it(`preserves carousel ownership in ${tag}`, async () => {
      const source = `::::${tag}\n::carousel\n:::slide{title="First"}\nOne\n:::\n::\n::::`;
      const options = preset();
      const tree = await parseMarkdown(source, options);
      expect(tree.meta.issues ?? []).toEqual([]);
      expect(
        await lint(source, {
          ...options,
          components: [...Object.keys(options.components), ...options.blocks, ...options.tags],
        }),
      ).toEqual([]);
      expect(await createHtmlRenderer(options)(source)).toContain('data-zoom-title="First"');
    });
    for (const [name, plugin, item, components] of [
      ["tabs", tabs, "tabs-item", tabComponents],
      ["accordion", details, "accordion-item", detailComponents],
    ] as const) {
      for (const reversed of [false, true]) {
        it(`preserves ${name} items in ${tag}, reversed=${reversed}`, async () => {
          const container = plugin();
          const plugins = reversed ? [callouts(), container] : [container, callouts()];
          const source = `::::${tag}\n::${name}\n:::${item}{label="First"}\nUnique item body\n:::\n::\n::::`;
          const options = { plugins, components: { ...githubComponents, ...components } };
          const tree = await parseMarkdown(source, options);
          expect(tree.meta.issues ?? []).toEqual([]);
          const rendered = await createHtmlRenderer(options)(source);
          expect(rendered).toContain("Unique item body");
          expect(rendered).toContain("First");
          expect(rendered).not.toMatch(/<p>\s*<(?:div|details)/);
        });
      }
    }
  }
});
