import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { createIcons, type IconCollection } from "comark-icon";
import { describe, expect, it } from "vite-plus/test";
import fileTree, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [fileTree()], components });
const parse = async (markdown: string) => await parseMarkdown(markdown, { plugins: [fileTree()] });
const block = (tree: string) => `::file-tree\n\`\`\`\n${tree}\n\`\`\`\n::`;
const body = (html: string) => html.replace(/<style[^>]*>.*?<\/style>/gs, "");
const glyph = (kind: "folder" | "file") =>
  new RegExp(`<svg class="cft-glyph"[^>]*><path d="M${kind === "folder" ? "20 20" : "15 2"}`);

describe("comark-file-tree", () => {
  it("nests two-space indents, and draws folders as open details", async () => {
    const html = await render(
      block("src/\n  components/\n    Button.vue\n  index.ts\npackage.json"),
    );
    const tree = body(html).replace(/<svg.*?<\/svg>/g, "");
    expect(tree).toBe(
      '<div class="cft"><ul>' +
        '<li data-type="folder"><details open><summary><span class="cft-entry"><span class="cft-name">src</span></span></summary><ul>' +
        '<li data-type="folder"><details open><summary><span class="cft-entry"><span class="cft-name">components</span></span></summary><ul>' +
        '<li data-type="file"><span class="cft-entry"><span class="cft-name">Button.vue</span></span></li></ul></details></li>' +
        '<li data-type="file"><span class="cft-entry"><span class="cft-name">index.ts</span></span></li></ul></details></li>' +
        '<li data-type="file"><span class="cft-entry"><span class="cft-name">package.json</span></span></li></ul></div>',
    );
    expect(html).toMatch(glyph("folder"));
    expect(html).toMatch(glyph("file"));
    expect(html.match(/<style data-comark-file-tree>/g)).toHaveLength(1);
  });

  it("reads pasted `tree` output, in Unicode or ASCII, without its root and summary", async () => {
    const unicode = await parse(
      block(
        ".\n├── src\n│   ├── index.ts\n│   └── utils\n│       └── a.ts\n└── package.json\n\n2 directories, 3 files",
      ),
    );
    const ascii = await parse(
      block(".\n|-- src\n|   |-- index.ts\n|   `-- utils\n|       `-- a.ts\n`-- package.json"),
    );
    const asciiTree = await parse(
      block(
        ".\n+--- src\n|   +--- index.ts\n|   \\--- utils\n|       \\--- a.ts\n\\--- package.json",
      ),
    );
    const expected = [
      "file-tree",
      {},
      [
        "file-tree-item",
        { type: "folder", name: "src" },
        ["file-tree-item", { type: "file", name: "index.ts" }],
        [
          "file-tree-item",
          { type: "folder", name: "utils" },
          ["file-tree-item", { type: "file", name: "a.ts" }],
        ],
      ],
      ["file-tree-item", { type: "file", name: "package.json" }],
    ];
    expect(unicode.nodes).toEqual([expected]);
    expect(ascii.nodes).toEqual([expected]);
    expect(asciiTree.nodes).toEqual([expected]);
    expect(unicode.meta.issues).toEqual([]);
  });

  it("marks entries added, removed, or changed, with notes and placeholders", async () => {
    const { nodes } = await parse(
      block(
        "src/\n  + new.ts  # the new entry\n  - old.ts\n  ~ app.vue  # reads the new one\n  ...\n__init__.py\n[id].vue\n#notes.md",
      ),
    );
    expect(nodes).toEqual([
      [
        "file-tree",
        {},
        [
          "file-tree-item",
          { type: "folder", name: "src" },
          [
            "file-tree-item",
            { type: "file", name: "new.ts", state: "added", note: "the new entry" },
          ],
          ["file-tree-item", { type: "file", name: "old.ts", state: "removed" }],
          [
            "file-tree-item",
            { type: "file", name: "app.vue", state: "changed", note: "reads the new one" },
          ],
          ["file-tree-item", { type: "more" }],
        ],
        ["file-tree-item", { type: "file", name: "__init__.py" }],
        ["file-tree-item", { type: "file", name: "[id].vue" }],
        ["file-tree-item", { type: "file", name: "#notes.md" }],
      ],
    ]);
    const html = body(await render(block("+ new.ts  # added <b>here</b>\n...")));
    expect(html).toContain('<li data-type="file" data-state="added"><span class="cft-entry"><svg');
    expect(html).toContain(
      '<span class="cft-mark">+</span><span class="cft-name">new.ts</span><span class="cft-note">added &lt;b&gt;here&lt;/b&gt;</span>',
    );
    expect(html).toContain('<li data-type="more">…</li>');
  });

  it("reports a Markdown list, and renders it as it was written", async () => {
    const markdown = "::file-tree\n- src/\n  - index.ts\n::";
    const { meta } = await parse(markdown);
    expect(meta.issues).toEqual([
      "`::file-tree` 1 holds a Markdown list, which turns names like `__init__.py` bold and drops `[id].vue`. Write the tree in a fenced block.",
    ]);
    expect(body(await render(markdown))).toMatch(/^<ul>\s*<li>\s*<p>src\/<\/p>/);
  });

  it("reports content beside the fence, an empty fence, and a block with nothing", async () => {
    const { meta } = await parse(
      `${block("a.ts")}\n\n::file-tree\nSee below.\n\n\`\`\`\nb.ts\n\`\`\`\n::\n\n${block("")}\n\n::file-tree\n::`,
    );
    expect(meta.issues).toEqual([
      '`::file-tree` 2: only one fenced block goes inside, so the paragraph "See below." doesn\'t render. Move it out of the block.',
      "`::file-tree` 3's fenced block is empty. Write one entry per line.",
      "`::file-tree` 4 has no tree. Write the tree in a fenced block inside it, one entry per line.",
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parse(
      `::file-tree{title="Pond"}\n- ducks.ts\n::\n\n${block("")}\n\n::file-tree\nSee below.\n\n\`\`\`\nb.ts\n\`\`\`\n::`,
    );
    expect(meta.issueRules).toEqual({
      "`::file-tree` 1: `title` isn't a prop of `::file-tree`, which takes none, so it's ignored. Remove it.":
        "comark/file-tree/unknown-prop",
      "`::file-tree` 1 holds a Markdown list, which turns names like `__init__.py` bold and drops `[id].vue`. Write the tree in a fenced block.":
        "comark/file-tree/list-instead-of-fence",
      "`::file-tree` 2's fenced block is empty. Write one entry per line.":
        "comark/file-tree/empty-tree",
      '`::file-tree` 3: only one fenced block goes inside, so the paragraph "See below." doesn\'t render. Move it out of the block.':
        "comark/file-tree/content-dropped",
    });
  });

  it("draws icons from comark-icon by name, then extension, when given a resolver", async () => {
    const files: IconCollection = {
      prefix: "files",
      icons: {
        folder: { body: '<path d="M0 0h8v8H0z"/>' },
        file: { body: '<path d="M1 1h6v6H1z"/>' },
        npm: { body: '<path fill="#c00" d="M0 0h8v8H0z"/>' },
        vue: { body: '<path fill="#41b883" d="M0 0h8v8H0z"/>' },
      },
    };
    const plugin = fileTree({
      iconResolver: createIcons({ collections: { files } }),
      icons: {
        folder: "files:folder",
        file: "files:file",
        "package.json": "files:npm",
        ".vue": "files:vue",
        ".ts": "files:missing",
      },
    });
    const { nodes } = await parseMarkdown(block("src/\n  App.vue\n  a.ts\npackage.json\nREADME"), {
      plugins: [plugin],
    });
    const names = (node: unknown): string[] =>
      Array.isArray(node)
        ? [
            ...(node[1]?.icon ? [`${node[1].name}:${node[1].icon.name}`] : []),
            ...node.slice(2).flatMap(names),
          ]
        : [];
    // An icon that doesn't resolve leaves the plain glyph.
    expect(names(nodes[0])).toEqual([
      "src:files:folder",
      "App.vue:files:vue",
      "package.json:files:npm",
      "README:files:file",
    ]);
    const html = await createHtmlRenderer({ plugins: [plugin], components })(block("App.vue"));
    expect(html).toContain('<span class="cft-entry"><span class="ci" aria-hidden="true" style=');
    expect(html.match(/<style data-comark-icon>/g)).toHaveLength(1);
  });

  it("adds its issues to the ones other plugins found", async () => {
    const before = defineComarkPlugin(() => ({
      name: "before",
      post(state) {
        state.tree.meta.issues = ["An earlier plugin's issue."];
      },
    }));
    const document = await parseMarkdown("::file-tree\n::", { plugins: [before(), fileTree()] });
    expect(document.meta.issues).toHaveLength(2);
    expect(document.meta.issues[0]).toBe("An earlier plugin's issue.");
  });
});
