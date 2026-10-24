import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import readingTime, { countWords } from "../src/index.ts";

const timeOf = async (markdown: string, options = {}) =>
  (await parseMarkdown(markdown, { plugins: [readingTime(options)] })).meta.readingTime;

describe("comark-reading-time", () => {
  it("counts the words outside code blocks, and rounds the minutes up", async () => {
    expect(
      await timeOf(
        "# The loft\n\nPigeons fly `home` fast.\n\n```ts\nconst skipped = 'these words';\n```\n\n- One\n- Two",
      ),
    ).toEqual({ words: 8, minutes: 1 });
    expect(await timeOf(Array.from({ length: 401 }, () => "word").join(" "))).toEqual({
      words: 401,
      minutes: 3,
    });
  });

  it("counts each CJK character as a word, beside the words around it", async () => {
    expect(await timeOf("鳩は家に帰る。Pigeons go home. 비둘기")).toEqual({
      words: 12,
      minutes: 1,
    });
    expect(countWords("漢字 and 한국어")).toBe(6);
  });

  it("leaves raw HTML code blocks out", async () => {
    expect(
      await timeOf(
        "<script>const hidden = 'words'</script>\n\n<style>.hidden { content: 'words' }</style>\n\n<textarea>hidden words</textarea>\n\nVisible words",
      ),
    ).toEqual({
      words: 2,
      minutes: 1,
    });

    expect(await timeOf("<Pre>hidden words</Pre>\n\nVisible words")).toEqual({
      words: 2,
      minutes: 1,
    });
  });

  it("leaves punctuation, frontmatter, and comments out", async () => {
    expect(
      await timeOf(
        "---\ntitle: Not counted here\n---\n\nOne — two... three!\n\n<!-- hidden words -->",
      ),
    ).toEqual({
      words: 3,
      minutes: 1,
    });
  });

  it("reads at the speed in the options, and gives 0 minutes to an empty document", async () => {
    const text = Array.from({ length: 100 }, () => "word").join(" ");
    expect(await timeOf(text, { wordsPerMinute: 50 })).toEqual({ words: 100, minutes: 2 });
    expect(await timeOf("")).toEqual({ words: 0, minutes: 0 });
  });

  it("changes nothing a renderer draws", async () => {
    const markdown = "Pigeons fly home.";
    const plain = await createHtmlRenderer()(markdown);
    expect(await createHtmlRenderer({ plugins: [readingTime()] })(markdown)).toBe(plain);
  });
});
