import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

// Reserve 20% below Cloudflare's 10 MiB Worker and 15 MiB source-map limits.
const limits = { worker: 8 * 1024 ** 2, maps: 12 * 1024 ** 2 };
const directory = resolve(process.argv[2] ?? ".wrangler/dry-run");
const files = await readdir(directory, { recursive: true, withFileTypes: true });
const sizes = { worker: 0, maps: 0 };
for (const file of files) {
  if (!file.isFile() || ["README.md", "bundle-meta.json"].includes(file.name)) continue;
  const kind = file.name.endsWith(".map") ? "maps" : "worker";
  sizes[kind] += gzipSync(await readFile(resolve(file.parentPath, file.name))).length;
}
assert(
  sizes.maps > 0,
  "Worker verification needs source maps. Pass --upload-source-maps to Wrangler.",
);
for (const kind of ["worker", "maps"] as const) {
  console.info(`${kind}: ${(sizes[kind] / 1024 ** 2).toFixed(2)} MiB gzip`);
  assert(
    sizes[kind] <= limits[kind],
    `${kind} exceeds the ${(limits[kind] / 1024 ** 2).toFixed(0)} MiB gzip budget`,
  );
}
