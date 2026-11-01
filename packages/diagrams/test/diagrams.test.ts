import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import diagrams, { components, type DiagramsOptions, sanitizeSvg } from "../src/html.ts";

const svg = (label: string) =>
  `<?xml version="1.0"?>\n<!DOCTYPE svg>\n<!-- drawn -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>${label}</text></svg>`;
let requests: { url: string; body: string }[] = [];
// Kroki, mocked: a source with "bad" in it fails as Kroki fails, and "offline" as a dropped connection.
const kroki = vi.fn(async (url: string, init: RequestInit) => {
  const body = typeof init.body === "string" ? init.body : "";
  requests.push({ url, body });
  if (body.includes("offline")) throw new TypeError("fetch failed");
  if (body.includes("bad"))
    return new Response(
      "Error 400: Error: <stdin>: syntax error in line 1 near 'bad'\n (exit code 1)",
      {
        status: 400,
      },
    );
  return new Response(svg(body.split("\n")[0] ?? ""), {
    headers: { "content-type": "image/svg+xml" },
  });
});

beforeEach(() => {
  requests = [];
  vi.stubGlobal("fetch", kroki);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const render = (markdown: string, options?: DiagramsOptions) =>
  createHtmlRenderer({ plugins: [diagrams(options)], components })(markdown);
const issues = async (markdown: string, options?: DiagramsOptions) =>
  (await parseMarkdown(markdown, { plugins: [diagrams(options)] })).meta.issues;

describe("comark-diagrams", () => {
  it("draws each fence through Kroki as inline SVG, with its title, and the styles once", async () => {
    const html = await render(
      "```d2 [Login flow]\nuser -> api\n```\n\n```dot\ndigraph { a -> b }\n```",
    );
    expect(requests).toEqual([
      { url: "https://kroki.io/d2/svg", body: "user -> api" },
      { url: "https://kroki.io/graphviz/svg", body: "digraph { a -> b }" },
    ]);
    expect(html).toContain(
      '<figure class="cdg" data-type="d2"><div class="cdg-svg" role="img" aria-label="Login flow"><svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>user -&gt; api</text></svg></div><figcaption>Login flow</figcaption></figure>',
    );
    expect(html).toContain('<figure class="cdg" data-type="graphviz"><div class="cdg-svg"><svg');
    expect(html).not.toMatch(/<\?xml|DOCTYPE|<!-- drawn/);
    expect(html.match(/<style data-comark-diagrams>/g)).toHaveLength(1);
  });

  it("sends plantuml, dbml, goat, and svgbob to their Kroki types, and uses `server`", async () => {
    await render(
      ["plantuml", "dbml", "goat", "svgbob"]
        .map((language) => `\`\`\`${language}\n${language} source\n\`\`\``)
        .join("\n\n"),
      { server: "https://kroki.internal/" },
    );
    expect(requests.map(({ url }) => url)).toEqual([
      "https://kroki.internal/plantuml/svg",
      "https://kroki.internal/dbml/svg",
      "https://kroki.internal/goat/svg",
      "https://kroki.internal/svgbob/svg",
    ]);
  });

  it("tries a diagram again when Kroki times out, drops it, or fails, but not when it refuses the source", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValueOnce(new Response(svg("after a timeout")))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(svg("after a drop")))
      .mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(svg("after a 502")));
    vi.stubGlobal("fetch", fetch);
    expect(await render("```dot\nretry timeout\n```")).toContain("after a timeout");
    expect(await render("```dot\nretry drop\n```")).toContain("after a drop");
    expect(await render("```dot\nretry 502\n```")).toContain("after a 502");
    expect(fetch).toHaveBeenCalledTimes(6);
    vi.stubGlobal("fetch", kroki);
    await render("```dot\nbad once\n```");
    expect(requests.filter(({ body }) => body === "bad once")).toHaveLength(1);
  });

  it("reports a persistent server error without blaming the diagram source", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Service Unavailable", { status: 503 })),
    );
    expect(await issues("```dot\npersistent outage\n```")).toEqual([
      "The ```dot fence 1: the Kroki server at https://kroki.io returned HTTP 503 (Service Unavailable). Check `server`, or build again.",
    ]);
  });

  it.each(["TimeoutError", "AbortError"])(
    "retries when a timeout interrupts the SVG body with %s",
    async (name) => {
      const controller = new AbortController();
      vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(controller.signal);
      const response = new Response(svg("interrupted"));
      vi.spyOn(response, "text").mockImplementationOnce(async () => {
        controller.abort(new DOMException("timed out", "TimeoutError"));
        throw new DOMException("body interrupted", name);
      });
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce(new Response(svg("recovered body")));
      vi.stubGlobal("fetch", fetch);
      expect(await render(`\`\`\`dot\nretry body ${name}\n\`\`\``)).toContain("recovered body");
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[1]?.[1].signal).not.toBe(controller.signal);
    },
  );

  it("reports a repeated timeout after two attempts", async () => {
    const fetch = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    vi.stubGlobal("fetch", fetch);
    expect(await issues("```dot\nrepeated timeout\n```")).toEqual([
      "The ```dot fence 1: couldn't reach the Kroki server at https://kroki.io (timed out). Check `server`, or build again.",
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1].signal).not.toBe(fetch.mock.calls[0]?.[1].signal);
  });

  it.each([new TypeError("fetch failed"), new DOMException("aborted", "AbortError")])(
    "reports a repeated connection error after retrying: %s",
    async (error) => {
      const fetch = vi.fn().mockRejectedValue(error);
      vi.stubGlobal("fetch", fetch);
      expect(await issues(`\`\`\`dot\nrepeated error ${error.name}\n\`\`\``)).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("draws a source once per process", async () => {
    await render("```d2\ncached once\n```");
    await render("```d2\ncached once\n```");
    expect(requests.filter(({ body }) => body === "cached once")).toHaveLength(1);
  });

  it("keeps the code and reports a diagram Kroki can't draw, or a server it can't reach", async () => {
    expect(await render("```dot\nbad graph\n```")).toContain("<pre");
    expect(await issues("```dot\nbad graph\n```")).toEqual([
      "The ```dot fence 1: Kroki couldn't draw it: Error: <stdin>: syntax error in line 1 near 'bad'. Fix the diagram's source.",
    ]);
    expect(await issues("Text\n\n```d2\noffline\n```")).toEqual([
      "The ```d2 fence 1: couldn't reach the Kroki server at https://kroki.io (fetch failed). Check `server`, or build again.",
    ]);
  });

  it("names each issue's rule", async () => {
    const { meta } = await parseMarkdown("```dot\nbad graph\n```\n\n```d2\noffline\n```", {
      plugins: [diagrams()],
    });
    expect(meta.issueRules).toEqual({
      "The ```dot fence 1: Kroki couldn't draw it: Error: <stdin>: syntax error in line 1 near 'bad'. Fix the diagram's source.":
        "comark/diagrams/draw-failed",
      "The ```d2 fence 2: couldn't reach the Kroki server at https://kroki.io (fetch failed). Check `server`, or build again.":
        "comark/diagrams/server-unreachable",
    });
  });

  it("sends nothing with `draw: false`, and leaves other fences alone", async () => {
    expect(await render("```d2\na -> b\n```", { draw: false })).toContain("<pre");
    expect(await render("```ts\nconst a = 1\n```")).toContain("<pre");
    expect(requests).toEqual([]);
  });

  it("ignores an `svg` the document writes on a diagram itself", async () => {
    const markdown = '::diagram{svg="<svg onload=alert(1)></svg>"}\n::\n\n```d2\nuser -> api\n```';
    for (const options of [undefined, { draw: false }]) {
      expect(await render(markdown, options)).not.toContain("onload");
      expect(await issues(markdown, options)).toEqual([
        "`::diagram` 1 sets `svg`, which only comark-diagrams writes, so it's ignored. Draw the diagram from a fence, such as ```d2.",
      ]);
    }
    expect(await render(markdown)).toContain("user -&gt; api");
  });

  it("drops scripts, event handlers, embedded documents, animations, and unsafe links from the SVG", () => {
    expect(
      sanitizeSvg(
        '<svg onload="alert(1)"><script>alert(2)</script><foreignObject><div>x</div></foreignObject>' +
          '<a href="javascript:alert(3)"><text>a</text></a><a xlink:href="https://example.com"><text>b</text></a>' +
          '<use href="#arrow"/><animate attributeName="href" to="javascript:alert(4)"/><image href="data:image/svg+xml,x"/>' +
          "<style>@import url(https://evil.test/x.css);@im\\70ort url(https://evil.test/y.css);.a{fill:red}</style><rect ONCLICK='x' width=\"2\"/></svg>",
      ),
    ).toBe(
      '<svg><a><text>a</text></a><a xlink:href="https://example.com"><text>b</text></a><use href="#arrow"/><image/><style>.a{fill:red}</style><rect width="2"/></svg>',
    );
  });
});
