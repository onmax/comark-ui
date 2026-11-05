import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const check = (html: string, files: Record<string, string> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "comark-docs-links-"));
  try {
    mkdirSync(join(dir, "dist/public"), { recursive: true });
    mkdirSync(join(dir, "server/utils"), { recursive: true });
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    for (const file of ["links.ts", "link-excludes.ts"])
      copyFileSync(new URL(`../docs/${file}`, import.meta.url), join(dir, file));
    copyFileSync(
      new URL("../docs/server/utils/site.ts", import.meta.url),
      join(dir, "server/utils/site.ts"),
    );
    writeFileSync(join(dir, "dist/public/index.html"), html);
    for (const [path, body] of Object.entries(files)) {
      const file = join(dir, "dist/public", path);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, body);
    }
    return spawnSync(process.execPath, [join(dir, "links.ts")], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe("built docs links", () => {
  it("accepts the dynamic badge endpoint without a static file", () => {
    const result = check(`
      <img src="/badge.svg?repo=onmax/comark-ui&amp;metric=stars">
      <a href="https://comark-ui.onmax.me/badge.svg?value=ready">Badge</a>
    `);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Checked the links of 1 pages.");
  });

  it("still rejects missing pages and files, including names similar to the badge route", () => {
    const result = check(`
      <a href="/missing/">Missing page</a>
      <img src="/missing.svg">
      <img src="/badge.svg/missing">
      <img src="/other/badge.svg">
    `);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("4 broken links");
    for (const path of ["/missing/", "/missing.svg", "/badge.svg/missing", "/other/badge.svg"])
      expect(result.stderr).toContain(`links to ${path}, which has no page or file.`);
  });

  it("resolves the docs app's flat page URLs and their fragments", () => {
    const result = check(`<a href="/zoom#theme">Zoom</a><a href="/tabs/#usage">Tabs</a>`, {
      "zoom.html": '<h2 id="theme">Theme</h2>',
      "tabs.html": '<h2 id="usage">Usage</h2>',
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Checked the links of 3 pages.");
  });

  it("checks fragments on flat pages and does not accept a directory as a page", () => {
    const result = check(
      `<a href="/zoom#missing">Missing heading</a><a href="/empty">Missing page</a>`,
      { "zoom.html": "<h2>Zoom</h2>", "empty/child.html": "<p>Child</p>" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("2 broken links");
    expect(result.stderr).toContain('no heading or element with the id "missing"');
    expect(result.stderr).toContain("links to /empty, which has no page or file.");
  });

  it("resolves relative links from flat page routes", () => {
    const result = check("", {
      "guide/editor.html": '<a href="theming#theme">Theme</a>',
      "guide/theming.html": '<h2 id="theme">Theme</h2>',
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("keeps the Nuxt checker's exclusions for deliberate examples and the live playground", () => {
    const result = check(`
      <a href="/census">Example</a><a href="/ducks/mallard">Example</a>
      <img src="/spinner.mp4"><a href="https://comark-ui.onmax.me/play/#preset=code-copy-and-wrap">Playground</a>
    `);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("still checks redirects and static page fragments", () => {
    const result = check(`
      <a href="/zoom/getting-started/">Redirected page</a>
      <a href="#missing">Missing heading</a>
      <a href="#present">Existing heading</a>
      <h2 id="present">Present</h2>
    `);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("2 broken links");
    expect(result.stderr).toContain(
      "which the Worker redirects to https://comark-ui.onmax.me/zoom/",
    );
    expect(result.stderr).toContain('no heading or element with the id "missing"');
  });
});
