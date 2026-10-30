import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import annotate from "comark-annotate/html";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { runProjectFixture } from "vite-doctor/testkit";
import { lint, lintFiles, type LintOptions } from "../src/index.ts";
import comark from "../src/doctor.ts";

// A project in memory: paths are absolute under /site, and folders exist when a file sits in them.
const project = (files: Record<string, string>) => {
  const paths = Object.keys(files).map((path) => `/site/${path}`);
  const folders = new Set(
    paths.flatMap((path) =>
      path
        .split("/")
        .slice(1, -1)
        .map((_, index, parts) => `/${parts.slice(0, index + 1).join("/")}`),
    ),
  );
  return {
    root: "/site",
    read: (path: string) => files[path.slice("/site/".length)],
    exists: (path: string) => paths.includes(path) || folders.has(path),
    list: (path: string) => [
      ...new Set(
        [...paths, ...folders]
          .filter((entry) => entry.startsWith(`${path}/`))
          .map((entry) => entry.slice(path.length + 1).split("/")[0]!),
      ),
    ],
  } satisfies LintOptions;
};

const site = project({
  "docs/index.md": "# Home\n",
  "docs/guide/setup.md": "# Setup\n\n## Install\n\n## Configure {#config}\n",
  "docs/guide/shot.png": "",
  "README.md": "# Readme\n",
});

const check = async (markdown: string, options: LintOptions = {}) =>
  (await lint(markdown, { ...site, file: "docs/page.md", ...options })).map(
    ({ rule, line, message, fix }) => ({ rule, line, message: `${message} ${fix}` }),
  );

describe("comark/broken-link", () => {
  it("passes links and images that resolve, with or without `.md`", async () => {
    expect(
      await check(
        [
          "[a](./guide/setup.md) [b](guide/setup) [c](./guide/) [d](../README.md?plain=1)",
          "![shot](./guide/shot.png) [e](/docs/guide/setup.md) [f](mailto:a@b.c)",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("reports a missing file and image, and suggests the nearest name", async () => {
    expect(
      await check(
        `# Page\n\n[Setup](./guide/setp.md)\n\n![Shot](./guide/shot.jpg)\n\n::screenshot{src="./guide/before.png" alt="A"}\n::`,
        { plugins: [annotate()] },
      ),
    ).toEqual([
      {
        rule: "comark/broken-link",
        line: 3,
        message:
          "The link to `./guide/setp.md` on line 3 points at `docs/guide/setp.md`, which doesn't exist. Did you mean `./guide/setup.md`?",
      },
      {
        rule: "comark/broken-link",
        line: 5,
        message:
          "The image `./guide/shot.jpg` on line 5 points at `docs/guide/shot.jpg`, which doesn't exist. Did you mean `./guide/shot.png`?",
      },
      {
        rule: "comark/broken-link",
        line: 7,
        message:
          "The image `./guide/before.png` on line 7 points at `docs/guide/before.png`, which doesn't exist. Fix the path, or add the missing file.",
      },
    ]);
  });

  it("resolves `/x` from the root, and points at `links.routes` when that fails", async () => {
    expect(await check("[Setup](/guide/setup/)")).toEqual([
      {
        rule: "comark/broken-link",
        line: 1,
        message:
          "The link to `/guide/setup/` on line 1 points at `guide/setup`, which doesn't exist. Fix the path, or add the missing file. If your site serves `/guide/setup/` from another folder than the project root, map it in `links.routes`.",
      },
    ]);
  });

  it("resolves `/x` through `routes`, by the longest prefix", async () => {
    const links = { routes: { "/": "nowhere", "/guide": "docs/guide", "/home": "docs" } };
    expect(await check("[a](/guide/setup/) [b](/home/) [c](/home/index)", { links })).toEqual([]);
    expect(await check("[a](/guide/stup/)", { links })).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("Did you mean `/guide/setup/`?"),
      }),
    ]);
    expect(await check("[a](/blog/)", { links: { routes: { "/guide": "docs/guide" } } })).toEqual([
      {
        rule: "comark/broken-link",
        line: 1,
        message:
          "The link to `/blog/` on line 1 matches no route in `links.routes`. Fix the path, or add the missing file. Add a route for `/blog/` to `links.routes`.",
      },
    ]);
  });

  it("takes a function as `routes`, where `true` means the page exists", async () => {
    const routes = (path: string) =>
      path.startsWith("/play") ? true : path.startsWith("/guide") ? `docs${path}` : undefined;
    expect(
      await check("[a](/play/#preset=x) [b](/guide/setup/#install)", { links: { routes } }),
    ).toEqual([]);
    expect(await check("[a](/guide/setup/#nope)", { links: { routes } })).toEqual([
      expect.objectContaining({ rule: "comark/broken-anchor" }),
    ]);
  });

  it("is off without `file`", async () => {
    expect(await lint("[a](./missing.md) ![b](/missing.png)", site)).toEqual([]);
  });
});

describe("comark/broken-anchor across files", () => {
  it("checks the fragment against the other document's ids", async () => {
    expect(
      await check(
        "[a](./guide/setup.md#install) [b](./guide/setup#config)\n\n[c](./guide/setup.md#instal)",
      ),
    ).toEqual([
      {
        rule: "comark/broken-anchor",
        line: 3,
        message:
          "The link to `./guide/setup.md#instal` on line 3 matches no heading or id in `docs/guide/setup.md`. Did you mean `#install`? Ids there: `#setup`, `#install`, `#config`.",
      },
    ]);
  });

  it("reads ids with the `headingIds` you render with", async () => {
    const nested = project({ "a.md": "## Setup\n\n### Install\n" });
    const options = { ...nested, file: "b.md" };
    expect(await lint("[x](./a.md#setup-install)", options)).toHaveLength(1);
    expect(await lint("[x](./a.md#setup-install)", { ...options, headingIds: "nested" })).toEqual(
      [],
    );
    expect(
      await lint("## Setup\n\n### Install\n\n[x](#setup-install)", { headingIds: "nested" }),
    ).toEqual([]);
  });
});

describe("comark/blocked-url", () => {
  it("reports local, private, tunnel, and preview addresses, bare URLs in prose included", async () => {
    const found = await check(
      [
        "Open http://localhost:5173/ to see it.",
        "[api](http://127.0.0.1:3000) [lan](http://192.168.1.4/) [box](http://nas.local/)",
        `<a href="file:///Users/me/a.png">file</a> [tunnel](https://abc.ngrok-free.app/)`,
        "[netlify](https://deploy-preview-42--mysite.netlify.app/) [vercel](https://app-git-fix-menu-team.vercel.app/)",
      ].join("\n"),
    );
    expect(found.map(({ line, message }) => [line, message])).toEqual([
      [
        1,
        "The link to `http://localhost:5173/` on line 1 points at the writer's own machine, so it opens nothing for anyone else. Link the deployed page, or write the address as code (`` `http://localhost:5173/` ``). Comark turns a bare URL in prose into a link.",
      ],
      [
        2,
        expect.stringContaining(
          "`http://127.0.0.1:3000` on line 2 points at the writer's own machine",
        ),
      ],
      [
        2,
        expect.stringContaining(
          "`http://192.168.1.4/` on line 2 points at a private network address",
        ),
      ],
      [
        2,
        expect.stringContaining(
          "`http://nas.local/` on line 2 points at a private network address",
        ),
      ],
      [3, expect.stringContaining("is a `file:` URL, which points at the writer's own disk")],
      [3, expect.stringContaining("goes through a tunnel to the writer's machine")],
      [
        4,
        "The link to `https://deploy-preview-42--mysite.netlify.app/` on line 4 is a deploy preview, which goes away or changes once its branch merges. Link the production page instead, or add the URL to `links.skip` if the preview is meant to stay.",
      ],
      [
        4,
        expect.stringContaining(
          "`https://app-git-fix-menu-team.vercel.app/` on line 4 is a deploy preview",
        ),
      ],
    ]);
  });

  it("passes production hosts, and addresses written as code", async () => {
    expect(
      await check(
        "[kit](https://annotationkit.vercel.app) [site](https://mysite.netlify.app/)\n\nRun `http://localhost:5173`.\n\n```sh\ncurl http://localhost:3000\n```",
      ),
    ).toEqual([]);
  });

  it("skips what `skip` matches, adds `block`, and turns the built-in list off with `false`", async () => {
    const markdown = "[a](http://localhost:3000/) [b](https://example.com/old/page)";
    expect(await check(markdown, { links: { skip: ["localhost:3000"] } })).toEqual([]);
    expect(await check(markdown, { links: { block: false } })).toEqual([]);
    expect(
      await check(markdown, { links: { block: ["example.com/old"], skip: [/^http:\/\/local/] } }),
    ).toEqual([
      {
        rule: "comark/blocked-url",
        line: 1,
        message:
          "The link to `https://example.com/old/page` on line 1 matches `links.block`. Link another page, or take the pattern out of `links.block`.",
      },
    ]);
  });

  it("reports hosts `allow` doesn't match", async () => {
    const links = { allow: ["*.github.com", "github.com", (url: URL) => url.hostname === "x.dev"] };
    expect(
      await check(
        "[a](https://github.com/a) [b](https://docs.github.com/) [c](https://x.dev/) [d](https://evil.example/)",
        {
          links,
        },
      ),
    ).toEqual([
      {
        rule: "comark/blocked-url",
        line: 1,
        message:
          "The link to `https://evil.example/` on line 1 goes to `evil.example`, which `links.allow` doesn't list. Link a page on an allowed host, or add `evil.example` to `links.allow`.",
      },
    ]);
  });
});

describe("comark/dead-url", () => {
  const fetches: string[] = [];
  const answer = (url: string): Response => {
    fetches.push(url);
    const failure = (code: string) =>
      Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error(code), { code }),
      });
    const path = new URL(url).pathname;
    if (url.startsWith("https://gone.invalid")) throw failure("ENOTFOUND");
    if (url.startsWith("https://expired.example")) throw failure("CERT_HAS_EXPIRED");
    if (path === "/slow") throw new DOMException("timed out", "TimeoutError");
    const status = Number(path.slice(1)) || 200;
    return new Response("body", { status });
  };
  const stub = (respond: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => respond(url, init)),
    );
  afterEach(() => {
    fetches.length = 0;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const links = { urls: { cache: false } as const };

  it("is off by default", async () => {
    stub(answer);
    expect(await check("[a](https://example.com/404)")).toEqual([]);
    expect(fetches).toEqual([]);
  });

  it("reports 404, 410, DNS failures, and TLS errors", async () => {
    stub(answer);
    const found = await check(
      "[a](https://example.com/404#top)\n[b](https://example.com/410)\n[c](https://gone.invalid/)\n[d](https://expired.example/)",
      { links },
    );
    expect(found.map(({ rule, line, message }) => [rule, line, message])).toEqual([
      [
        "comark/dead-url",
        1,
        "The link to `https://example.com/404#top` on line 1 answers 404 Not Found. Link the page where it moved, or its archived copy (`https://web.archive.org/web/https://example.com/404`). If the page is there and the site answers 404 anyway, add the URL to `links.skip`.",
      ],
      ["comark/dead-url", 2, expect.stringContaining("answers 410 Gone.")],
      [
        "comark/dead-url",
        3,
        "The link to `https://gone.invalid/` on line 3 goes to `gone.invalid`, which has no DNS record. Check the host's spelling, or link where the site moved. If it only resolves on your network, add it to `links.skip`.",
      ],
      ["comark/dead-url", 4, expect.stringContaining("fails its TLS check (`CERT_HAS_EXPIRED`)")],
    ]);
  });

  it("stays silent on 401, 403, 429, 999, 5xx after a retry, and timeouts", async () => {
    stub(answer);
    expect(
      await check(
        "[a](https://example.com/401) [b](https://example.com/403) [c](https://example.com/429) [d](https://example.com/999) [e](https://example.com/503) [f](https://example.com/slow) [g](https://example.com/)",
        { links },
      ),
    ).toEqual([]);
    expect(fetches.filter((url) => url.endsWith("/503"))).toHaveLength(2);
    expect(fetches.filter((url) => url.endsWith("/404"))).toHaveLength(0);
  });

  it("requests each URL once per run, across files", async () => {
    stub(answer);
    const files = project({
      "a.md": "[x](https://example.com/404) [y](./b.md#later)",
      "b.md": "## Later\n\n[x](https://example.com/404)",
    });
    const results = await lintFiles(["a.md", "b.md", "missing.md"], { ...files, links });
    expect(
      results.map(({ file, text, diagnostics }) => [
        file,
        text !== undefined,
        diagnostics.map(({ rule }) => rule),
      ]),
    ).toEqual([
      ["a.md", true, ["comark/dead-url"]],
      ["b.md", true, ["comark/dead-url"]],
      ["missing.md", false, []],
    ]);
    expect(fetches).toEqual(["https://example.com/404"]);
  });

  it("sends GITHUB_TOKEN to github.com only", async () => {
    vi.stubEnv("GITHUB_TOKEN", "secret");
    const auth: Record<string, string | undefined> = {};
    stub((url, init) => {
      auth[new URL(url).hostname] = new Headers(init?.headers).get("authorization") ?? undefined;
      return new Response(null, { status: 200 });
    });
    await check("[a](https://github.com/onmax) [b](https://example.com/)", { links });
    expect(auth).toEqual({ "github.com": "Bearer secret", "example.com": undefined });
  });

  it("caches the URLs that worked and checks dead ones again", async () => {
    stub(answer);
    const root = await mkdtemp(join(tmpdir(), "lint-comark-"));
    const options = { root, links: { urls: true } } as const;
    const markdown = "[a](https://example.com/) [b](https://example.com/404)";
    expect(await lint(markdown, options)).toHaveLength(1);
    expect(await lint(markdown, options)).toHaveLength(1);
    expect(fetches).toEqual([
      "https://example.com/",
      "https://example.com/404",
      "https://example.com/404",
    ]);
    const cache = JSON.parse(
      await readFile(join(root, "node_modules/.cache/comark-linter/urls.json"), "utf8"),
    );
    expect(Object.keys(cache)).toEqual(["https://example.com/"]);
  });

  it("warns once and reports nothing when offline", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    stub(() => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    });
    expect(await check("[a](https://a.example/) [b](https://b.example/)", { links })).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "comark-lint: the network is unreachable, so comark/dead-url checked no URLs.",
    );
  });
});

describe("lint-comark/doctor links", () => {
  it("reports broken links and blocked URLs through ctx.fs", async () => {
    const result = await runProjectFixture({
      framework: "vite",
      extensions: [comark({ links: { routes: { "/": "docs" } } })],
      files: {
        "docs/page.md": `# Page\n\n[Guide](./guid.md) [Home](/guide/#intro)\n\nhttp://localhost:3000\n`,
        "docs/guide.md": `# Guide\n\n## Intro\n`,
      },
    });
    expect(
      result.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.range?.line]),
    ).toEqual([
      ["COMARK0011", 3],
      ["COMARK0012", 5],
    ]);
  });
});
