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

  it.each([
    'demo.mp4 "Video title"',
    "demo.mp4 'Video title'",
    "demo.mp4 (Video title)",
    '<demo.mp4> "Video title"',
    "<demo.mp4> 'Video title'",
    "<demo.mp4> (Video title)",
    'demo.mp4\t"Video title"',
    'demo.mp4\n"Video title"',
  ])("locates both media diagnostics for a titled destination (%s)", async (destination) => {
    const found = await lint(`x\n\nWatch this: ![Demo](${destination})`, options);
    expect(found.map(({ rule, line, column }) => ({ rule, line, column }))).toEqual([
      { rule: "comark/media/unknown-prop", line: 3, column: 13 },
      { rule: "comark/media/missing-size", line: 3, column: 13 },
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

  it("locates repeated missing-size warnings across titled and untitled destinations", async () => {
    const found = await lint(
      'x\n\n![Demo](<demo.mp4>)\n\nWatch this: ![Demo](demo.mp4 "Title")\n\n![Demo](<demo.mp4>)',
      options,
    );
    expect(
      found
        .filter(({ rule }) => rule === "comark/media/missing-size")
        .map(({ rule, line, column }) => ({ rule, line, column })),
    ).toEqual([
      { rule: "comark/media/missing-size", line: 3, column: 1 },
      { rule: "comark/media/missing-size", line: 5, column: 13 },
      { rule: "comark/media/missing-size", line: 7, column: 1 },
    ]);
  });

  it.each(["demo.mp4?download=1", "demo.mp4/other.mp4", "demo.mp4-extra.mp4"])(
    "does not confuse a destination with a longer URL (%s)",
    async (destination) => {
      const found = await lint(
        `x\n\n![Demo](${destination} "Title")\n\nWatch this: ![Demo](demo.mp4 "Title")`,
        options,
      );
      expect(found.map(({ rule, line, column }) => ({ rule, line, column }))).toEqual([
        { rule: "comark/media/unknown-prop", line: 3, column: 1 },
        { rule: "comark/media/missing-size", line: 3, column: 1 },
        { rule: "comark/media/unknown-prop", line: 5, column: 13 },
        { rule: "comark/media/missing-size", line: 5, column: 13 },
      ]);
    },
  );

  it.each(["demo.mp4", "<demo.mp4>", 'demo.mp4 "Title"', '<demo.mp4> "Title"'])(
    "skips matching video syntax in code examples (%s)",
    async (destination) => {
      const found = await lint(
        `\`\`\`md\n![Demo](${destination})\n\`\`\`\n\n\`![Demo](${destination})\`\n\n![Demo](${destination})`,
        options,
      );
      expect(found.filter(({ rule }) => rule === "comark/media/missing-size")).toEqual([
        expect.objectContaining({ line: 7, column: 1 }),
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
