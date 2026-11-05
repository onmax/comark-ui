import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { site } from "../docs/paths.ts";

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
      <a href="/package.json">Package</a>
      <img src="/doctor/xref/missing.png">
      <img src="/guide/pond.png">
      <img src="/pond-typo.png">
      <img src="/pond.png/missing">
    `);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("9 broken links");
    for (const path of [
      "/missing/",
      "/missing.svg",
      "/badge.svg/missing",
      "/other/badge.svg",
      "/package.json",
      "/doctor/xref/missing.png",
      "/guide/pond.png",
      "/pond-typo.png",
      "/pond.png/missing",
    ])
      expect(result.stderr).toContain(`links to ${path}, which has no page or file.`);
  });

  it("ignores include inputs and source text that are not browser links", () => {
    const result = check('<code>:include{src="source.md"}</code>', {
      "doctor/include/open-block-in-partial.html":
        '<include src="tour.md"></include><include src="tour-closed.md"></include>',
      "doctor/include/path-outside-root.html":
        '<include src="../../package.json"></include><include src="ducks.md"></include>',
      "doctor/include/read-failed.html":
        '<include src="ponds"></include><include src="ponds/north.md"></include>',
      "doctor/include/remote-file.html": '<include src="ducks.md"></include>',
      "doctor/include/too-deep.html":
        '<include src="nest/1.md"></include><include src="nest/2.md"></include>',
      "doctor/include/unclosed-region.html":
        '<include src="feed.sh"></include><include src="deploy.sh"></include>',
      "include.html":
        '<include src="./partials/install.md"></include><include src="./partials/ducks.ts"></include>',
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("excludes the deliberately broken links in Doctor's rendered examples", () => {
    const result = check("", {
      "doctor/broken-anchor.html": '<a href="#methods">Method</a><h2 id="method">Method</h2>',
      "doctor/chips/invalid-avatar.html": '<img src="octocat">',
      "doctor/xref/inline-figure.html": '<img src="roof.png">',
      "doctor/xref/missing-id.html": '<img src="ducks.png">',
      "doctor/xref/ref-content.html": '<img src="pond.png">',
      "doctor/xref/unknown-label.html": '<img src="pigeon.png">',
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("excludes the fictional screenshot in Doctor's annotate examples", () => {
    const result = check("", {
      "doctor/annotate/undefined-binding.html": '<img src="/pond.png">',
      "doctor/annotate/unknown-mark.html": '<img src="/pond.png">',
      "doctor/annotate/unknown-prop.html": '<img src="/pond.png">',
      "doctor/annotate/unsafe-bound-url.html": '<img src="/pond.png">',
    });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("still checks other Doctor fragments and similarly named example assets", () => {
    const result = check('<a href="#methods">Missing heading</a>', {
      "doctor/broken-anchor.html": '<a href="#typo">Missing heading</a>',
      "doctor/chips/invalid-avatar.html": '<img src="octocat.png">',
      "doctor/xref/inline-figure.html": '<img src="roof-typo.png">',
      "guide/example.html": '<img src="roof.png">',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("5 broken links");
    expect(result.stderr).toContain('no heading or element with the id "methods"');
    expect(result.stderr).toContain('no heading or element with the id "typo"');
    for (const path of [
      "/doctor/chips/octocat.png",
      "/doctor/xref/roof-typo.png",
      "/guide/roof.png",
    ])
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

  it("keeps the Nuxt checker's exclusions for deliberate examples", () => {
    const result = check(`
      <a href="/census">Example</a><a href="/ducks/mallard">Example</a><img src="/spinner.mp4">
    `);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("reads the playground's fragment as its state, and checks the gallery's as ids", () => {
    const result = check(
      `<a href="/play#md=y0zMyQEA">Playground</a><a href="/play/#preset=tabs-tabs">Preset</a>
      <a href="/play/gallery#tabs-tabs">Gallery</a><a href="/play/gallery#missing">Missing</a>`,
      { "play/index.html": "", "play/gallery/index.html": '<article id="tabs-tabs"></article>' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1 broken link");
    expect(result.stderr).toContain('no heading or element with the id "missing"');
  });

  it("keeps playground links on the site and drops the old trailing slash elsewhere", () => {
    expect(site("/play/#preset=code-copy-and-wrap")).toBe("/play#preset=code-copy-and-wrap");
    expect(site("/play#md=eJx-test_123")).toBe("/play#md=eJx-test_123");
    expect(site("/zoom/#theme")).toBe("/zoom#theme");
    expect(site("/playwright/")).toBe("/playwright");
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
