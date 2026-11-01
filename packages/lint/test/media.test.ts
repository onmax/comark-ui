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

  it("skips matching video syntax in code examples", async () => {
    const found = await lint(
      "```md\n![Demo](demo.mp4)\n```\n\n`![Demo](demo.mp4)`\n\n![Demo](demo.mp4)",
      options,
    );
    expect(found).toEqual([
      expect.objectContaining({ rule: "comark/media/missing-size", line: 7, column: 1 }),
    ]);
  });

  it("locates both warnings when the same video also has unmuted autoplay", async () => {
    const found = await lint("# Demo\n\nSome text.\n\n![Demo](demo.mp4){autoplay}", options);
    expect(found.map(({ rule, line, column }) => ({ rule, line, column }))).toEqual([
      { rule: "comark/media/autoplay-without-muted", line: 5, column: 1 },
      { rule: "comark/media/missing-size", line: 5, column: 1 },
    ]);
  });
});
