import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import badge, { components } from "../src/html.ts";
import { badgeParams, readBadge } from "../src/svg.ts";
const render = createHtmlRenderer({ plugins: [badge()], components });

describe("image badges", () => {
  it("renders static badges locally while keeping prose badges unchanged", async () => {
    const html = await render(
      ':badge[New] :badge[Comark UI]{label="built with" icon="package" color="#15803d"}',
    );
    expect(html).toContain('class="cb" data-color="primary">New</span>');
    expect(html).toContain('class="cb-image" src="data:image/svg+xml,');
    expect(html).toContain('alt="built with: Comark UI"');
    expect(decodeURIComponent(/src="data:image\/svg\+xml,([^"]+)"/.exec(html)![1]!)).toContain(
      "<svg",
    );
  });
  it("encodes live badge options in a hosted image without fetching during parse", async () => {
    const html = await render(
      ':badge{source="github-actions" repository="onmax/comark-ui" workflow="ci.yml" branch="feat/new"}',
    );
    expect(html).toContain("https://comark-ui.onmax.me/badge.svg?");
    expect(html).toContain("repository=onmax%2Fcomark-ui");
    expect(html).toContain("branch=feat%2Fnew");
    expect(html).not.toContain("data:image");
  });
  it("uses a custom HTTPS endpoint", async () => {
    const custom = createHtmlRenderer({
      plugins: [badge({ endpoint: "https://example.com/status.svg" })],
      components,
    });
    expect(await custom(':badge{source="npm-version" package="comark-ui"}')).toContain(
      "https://example.com/status.svg?",
    );
  });
  it("reports malformed image options with a linter rule, without throwing", async () => {
    const value = await parseMarkdown(':badge{source="npm-version" package="../oops"}', {
      plugins: [badge()],
    });
    expect(value.meta.issues).toHaveLength(1);
    expect(Object.values(value.meta.issueRules)).toEqual(["comark/badge/invalid-image"]);
    expect(await render(':badge{source="bad"}')).not.toContain("src=");
  });
  it("round-trips builder syntax with quotes, braces, apostrophes, and non-ASCII text", async () => {
    const parsed = readBadge({
      label: "\"Ship\" {it} & say 'hi'",
      value: "日本語 🚀",
      icon: "check",
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const source = `:badge{${[...badgeParams(parsed.value)].map(([key, value]) => `:${key}='${JSON.stringify(value).replaceAll("'", "\\u0027")}'`).join(" ")}}`;
    const document = await parseMarkdown(source, { plugins: [badge()] });
    expect(document.meta.issues).toEqual([]);
    const html = await render(source);
    expect(html).toContain("日本語 🚀");
  });
});
