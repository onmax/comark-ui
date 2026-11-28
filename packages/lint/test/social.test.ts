import social from "comark-social";
import { expect, it } from "vite-plus/test";
import { lint } from "../src/index.ts";

it("locates social issues on the authored quote and the later post", async () => {
  const markdown = [
    '::post{author="First"}',
    ':::post{author="Quoted"}',
    ":::",
    "::",
    "",
    '::post{author="Second" likes="many"}',
    "::",
    "",
    '::post{author="Third"}',
    ":::post",
    ":::",
    "::",
  ].join("\n");
  const issues = await lint(markdown, { plugins: [social()] });
  expect(issues).toContainEqual(
    expect.objectContaining({ rule: "comark/social/invalid-count", line: 6 }),
  );
  expect(issues).toContainEqual(
    expect.objectContaining({ rule: "comark/social/missing-author", line: 10 }),
  );
});
