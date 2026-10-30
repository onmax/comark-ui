import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import annotate, { components as annotateComponents } from "../packages/annotate/src/html.ts";
import carousel, { components as carouselComponents } from "../packages/carousel/src/html.ts";
import charts, { components as chartComponents } from "../packages/charts/src/html.ts";
import chips, { components as chipsComponents } from "../packages/chips/src/html.ts";
import code, { components as codeComponents } from "../packages/code/src/html.ts";
import diff, { components as diffComponents } from "../packages/diff/src/html.ts";
import embed, { components as embedComponents } from "../packages/embed/src/html.ts";
import {
  callouts,
  html,
  references,
  components as githubComponents,
} from "../packages/github/src/html.ts";
import icon, { components as iconComponents, createIcons } from "../packages/icon/src/html.ts";
import include, { type IncludeReader } from "../packages/include/src/index.ts";
import tabs, { components as tabsComponents } from "../packages/tabs/src/html.ts";
import zoom, { components as zoomComponents } from "../packages/zoom/src/html.ts";

const components = {
  ...annotateComponents,
  ...carouselComponents,
  ...chartComponents,
  ...chipsComponents,
  ...codeComponents,
  ...diffComponents,
  ...embedComponents,
  ...githubComponents,
  ...iconComponents,
  ...tabsComponents,
  ...zoomComponents,
};

const collections = {
  lucide: {
    prefix: "lucide",
    width: 24,
    height: 24,
    icons: { star: { body: '<path d="M1 1h2"/>' } },
  },
};
const icons = createIcons({ collections });
const reader: IncludeReader = async (path) =>
  ({
    "a.md": 'Included **A** :icon{name="lucide:star"}',
    "nested.md": ':include{src="a.md"}',
  })[path];

const pluginFactories = [
  () => annotate(),
  () => carousel(),
  () => charts(),
  () => chips({ download: false }),
  () =>
    code({
      iconResolver: icons,
      actions: [
        { id: "run", label: "Run", icon: "lucide:star", languages: ["js", "ts"] },
        { id: "missing", icon: "lucide:missing", title: "Missing" },
      ],
    }),
  () => diff(),
  () => embed(),
  () => callouts(),
  () => references({ repo: "onmax/comark-plugins" }),
  () => html(),
  () => icon({ collections, fetch: false }),
  () => include({ read: reader }),
  () => tabs({ iconResolver: icons }),
  () => zoom(),
];

const snippets = [
  "",
  "plain **text** with @user #12 and https://example.com/ 😀",
  '::screenshot{src="" alt=""}\n:::annotation{x= y= w= h=}\n\n:::\n::',
  '::screenshot{src="😀.png" alt="界面" viewport="1440×900" href="https://x.dev/a?b=1"}\n:::annotation{x=1 y=2 w=3 h=4 mark="circle" color="#abc"}\nNote **bold**\n:::\n::',
  '::compare\n:::screenshot{src="a.png" alt="A"}\n::::annotation{x=40 y=50 w=20 h=10}\nNote\n::::\n:::\n::',
  '::carousel{columns=""}\n:::slide\n![x](a.png)\n:::\n::',
  '::carousel{title="🚀" columns=3 zoom=false}\n![A](a.png)\n\nSecond\n::',
  '::tabs{sync=""}\n:::tabs-item{label=""}\nText\n:::\n::',
  '::code-group\n```js [x]\nconst x = "😀";\n```\n::',
  '::diff{file=""}\n```\na\n```\n\n```\nb\n```\n::',
  '::diff{file="src/界.ts" line=2 label="😀"}\n```ts [src/界.ts]\nconst a = 1;\n```\n\n```ts [src/界.ts]\nconst b = 2;\n```\n::',
  '::embed{url="https://youtu.be/"}\n::',
  '::embed{url="https://www.youtube.com/watch?v=KCrXgy8qtjM" title="😀" start=90}\n::',
  "> [!NOTE]\n> title\n> body",
  ':chip[]{href="https://example.com"} :icon{name="lucide:star"}',
  ':chip[界]{href="https://example.com" title="😀"} :icon{name="lucide:star" label="☆"}',
  ':include{src="nested.md"}\n\n```md\n::tabs\n::\n```',
  '::chart{type="bar"}\n| x | y |\n| - | - |\n| A | 1 |\n::',
  '::unknown{a="b"}\n:::inner\nß漢字\n:::\n::',
  "---\ntitle: 😀\n---\n" + "x".repeat(4000),
  '::tabs\n::::tabs\n:::::tabs-item{label="中"}\n🚀\n:::::\n::::\n::',
];

const words = [
  "",
  "x",
  "😀漢字",
  'a\\"b',
  "a'b",
  "{}",
  "\\\\",
  "0",
  "-1",
  "1e9",
  "<b>",
  "https://x.dev/a?b=1&c=2",
];
const names = [
  "screenshot",
  "compare",
  "annotation",
  "carousel",
  "slide",
  "tabs",
  "tabs-item",
  "diff",
  "embed",
  "chart",
  "unknown",
];
const attrs = [
  "",
  "{}",
  "{x}",
  "{x=}",
  '{x=""}',
  "{x='😀'}",
  '{x="a}b"}',
  '{x="a b" y=2}',
  "{x=1 y=2 w=3 h=4}",
  '{src="https://x.dev/" alt="😀"}',
  '{__proto__="x"}',
  '{constructor="x"}',
  '{:src="javascript:alert(1)"}',
  '{data-x="😀" aria-label="界"}',
];

function generatedBlock(random: () => number, depth = 0): string {
  const name = names[Math.floor(random() * names.length)]!;
  const fence = ":".repeat(2 + Math.floor(random() * 3));
  const attr = attrs[Math.floor(random() * attrs.length)]!;
  const bodyCount = Math.floor(random() * 4);
  const body: string[] = [];
  for (let i = 0; i < bodyCount; i++) {
    if (depth < 2 && random() < 0.35) body.push(generatedBlock(random, depth + 1));
    else if (random() < 0.3)
      body.push(
        "```" +
          (random() < 0.5 ? "js" : "") +
          "\n" +
          words[Math.floor(random() * words.length)]!.repeat(1 + Math.floor(random() * 8)) +
          "\n```",
      );
    else
      body.push(words[Math.floor(random() * words.length)]!.repeat(1 + Math.floor(random() * 6)));
  }
  const close = random() < 0.1 ? "" : `\n${fence}`;
  return `${fence}${name}${attr}\n${body.join("\n\n")}${close}`;
}

function rng(seed: number) {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
    seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
    return ((seed ^ (seed >>> 16)) >>> 0) / 2 ** 32;
  };
}
function sourceFor(seed: number, random: () => number) {
  const count = 1 + Math.floor(random() * 4);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    let part = snippets[Math.floor(random() * snippets.length)]!;
    if (random() < 0.35)
      part = part.replaceAll("Text", `Text ${"界".repeat(1 + Math.floor(random() * 12))}`);
    if (random() < 0.25) part = part + "\n" + "z".repeat(100 + Math.floor(random() * 500));
    if (random() < 0.2) part = `${"  ".repeat(1 + Math.floor(random() * 3))}${part}`;
    parts.push(part);
  }
  if (random() < 0.8) parts.push(generatedBlock(random));
  if (random() < 0.7)
    parts.push(words[Math.floor(random() * words.length)]!.repeat(1 + Math.floor(random() * 250)));
  if (seed % 7 === 0) parts.push('::broken{a="unterminated\n::');
  return parts.join("\n\n");
}

beforeAll(() => {
  vi.stubGlobal("fetch", async () => new Response("Not Found", { status: 404 }));
});

afterAll(() => vi.unstubAllGlobals());

const seeds = Array.from({ length: process.env.COMARK_FUZZ === "full" ? 2048 : 256 }, (_, i) => i);

describe("public parse/render fuzz", () => {
  it.each(seeds)("renders seed %i twice without throwing or corrupting output", async (seed) => {
    const random = rng(seed + 1);
    const source = sourceFor(seed, random);
    const order = pluginFactories.map((_, index) => index).sort(() => random() - 0.5);
    const plugins = order.map((index) => pluginFactories[index]!());
    try {
      const document = await parseMarkdown(source, { plugins });
      const output = await renderHtmlFromDocument(document, { components });
      const second = await renderHtmlFromDocument(document, { components });
      expect(second, `seed ${seed}`).toBe(output);
      const bad = output
        .replace(/<script>.*?<\/script>/gs, "")
        .match(/.{0,100}\b(?:undefined|NaN)\b.{0,100}/s);
      if (bad) throw new Error(`bad output seed ${seed}: ${bad[0]}`);
    } catch (error) {
      throw new Error(
        `seed ${seed}\n${source}\n${error instanceof Error ? error.stack : String(error)}`,
      );
    }
  });
});
