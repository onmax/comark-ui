type Assets = { fetch: (request: Request) => Promise<Response> };

/**
 * The prerendered file for a request, from the assets binding: a page, a file, or the page's Markdown copy for an agent
 * that asks for Markdown. A path with no file returns nothing, and Nitro goes on to its own routes.
 */
export async function fromAssets(request: Request, assets: Assets): Promise<Response | undefined> {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  if (!/\.\w+$/.test(url.pathname) && request.headers.get("accept")?.includes("text/markdown")) {
    url.pathname = url.pathname === "/" ? "/raw/index.md" : `/raw${url.pathname}.md`;
    const markdown = await assets.fetch(new Request(url, request));
    if (markdown.ok) return markdown;
  }
  const asset = await assets.fetch(request);
  if (asset.status !== 404) return asset;
}
