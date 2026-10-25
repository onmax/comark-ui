// Serves docs/dist for the end-to-end checks, like the Cloudflare site: a directory answers with its index.html.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const output = new URL("../docs/dist/", import.meta.url).pathname;
// Nitro writes static assets below `public/`; older Nuxt output placed them
// directly in the configured directory. Supporting both keeps the test server
// aligned with the generated output used by each supported Nuxt version.
// Nitro has used both `dist/public` and `dist/.output/public` for generated
// static files, while older Nuxt versions wrote directly to `dist`.
const roots = [join(output, "public"), join(output, ".output", "public"), output];
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
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
  console.log(`docs/dist at http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`),
);
