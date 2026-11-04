// Serves a directory the way the Cloudflare site does: a directory answers with its index.html. The end-to-end checks
// pass docs/public for the images their fixtures show; with no argument it serves the built docs in docs/dist.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const output = new URL("../docs/dist/", import.meta.url).pathname;
// Nitro has written its static files to `dist/public`, `dist/.output/public`, and `dist` itself.
const roots = process.argv[2]
  ? [resolve(process.argv[2])]
  : [join(output, "public"), join(output, ".output", "public"), output];
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

createServer(async (request, response) => {
  const path = normalize(
    decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname),
  ).replace(/^(\.\.[/\\])+/, "");
  const relativePath = path.replace(/^[/\\]+/, "");
  const relatives =
    relativePath === ""
      ? ["index.html"]
      : relativePath.endsWith("/")
        ? [`${relativePath}index.html`, `${relativePath.slice(0, -1)}.html`]
        : [relativePath, `${relativePath}.html`];
  // Try each known Nitro root and route layout so the test server mirrors the
  // generated output rather than depending on one Nuxt version's structure.
  for (const root of roots) {
    for (const relative of relatives) {
      const file = join(root, relative);
      try {
        const body = await readFile(file);
        response
          .writeHead(200, {
            "content-type": types[extname(file)] ?? "application/octet-stream",
          })
          .end(body);
        return;
      } catch {
        // Try the next root or route layout.
      }
    }
  }
  response.writeHead(404).end("Not found");
}).listen(Number(process.env.E2E_PORT ?? 4173), "127.0.0.1", () =>
  console.log(`${roots.at(-1)} at http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`),
);
