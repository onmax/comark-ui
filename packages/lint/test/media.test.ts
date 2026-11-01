import { describe, expect, it } from "vite-plus/test";
import media from "../../media/src/index.ts";
import { lint } from "../src/index.ts";

describe("comark/media/missing-size", () => {
  const options = { plugins: [media({ size: false })] };

  it("locates the authored video after other content, including its column", async () => {
    const found = await lint("# Demo\n\nSome text.\n\nWatch this: ![Demo](demo.mp4)", options);
    expect(found).toEqual([
      expect.objectContaining({
        rule: "comark/media/missing-size",
        severity: "warn",
        line: 5,
        column: 13,
      }),
    ]);
  });

  it("locates videos with angle-bracket destinations", async () => {
    const found = await lint("x\n\nWatch this: ![Demo](<demo.mp4>)", options);
    expect(found).toEqual([
      expect.objectContaining({ rule: "comark/media/missing-size", line: 3, column: 13 }),
    ]);
  });

  it("locates repeated videos across destination spellings in source order", async () => {
    const found = await lint(
      "x\n\n![Demo](<demo.mp4>)\n\nWatch this: ![Demo](demo.mp4)\n\n![Demo](<demo.mp4>)",
      options,
    );
    expect(found.map(({ rule, line, column }) => ({ rule, line, column }))).toEqual([
      { rule: "comark/media/missing-size", line: 3, column: 1 },
      { rule: "comark/media/missing-size", line: 5, column: 13 },
      { rule: "comark/media/missing-size", line: 7, column: 1 },
    ]);
  });

  it.each(["demo.mp4", "<demo.mp4>"])(
    "skips matching video syntax in code examples (%s)",
    async (destination) => {
      const found = await lint(
        `\`\`\`md\n![Demo](${destination})\n\`\`\`\n\n\`![Demo](${destination})\`\n\n![Demo](${destination})`,
        options,
      );
      expect(found).toEqual([
        expect.objectContaining({ rule: "comark/media/missing-size", line: 7, column: 1 }),
      ]);
    },
  );

  it.each(["demo.mp4", "<demo.mp4>"])(
    "locates both warnings when the same video also has unmuted autoplay (%s)",
    async (destination) => {
      const found = await lint(
        `# Demo\n\nSome text.\n\n![Demo](${destination}){autoplay}`,
        options,
      );
      expect(found.map(({ rule, line, column }) => ({ rule, line, column }))).toEqual([
        { rule: "comark/media/autoplay-without-muted", line: 5, column: 1 },
        { rule: "comark/media/missing-size", line: 5, column: 1 },
      ]);
    },
  );
});
