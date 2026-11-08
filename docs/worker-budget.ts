import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

// Reserve at least 20% below Cloudflare's 64 MiB uncompressed Worker limit and
// source-map limits of 60 MiB uncompressed and 15 MiB gzip.
// https://developers.cloudflare.com/workers/platform/limits/#worker-size
// https://developers.cloudflare.com/workers/observability/source-maps/#limits
const limits = {
  // Worker gzip is a performance budget; Cloudflare only limits uncompressed bytes.
  worker: { uncompressed: 51 * 1024 ** 2, gzip: 8 * 1024 ** 2 },
  maps: { uncompressed: 48 * 1024 ** 2, gzip: 12 * 1024 ** 2 },
};
const directory = resolve(process.argv[2] ?? ".wrangler/dry-run");
const directories = { worker: directory, maps: resolve(process.argv[3] ?? directory) };
const sizes = { worker: { uncompressed: 0, gzip: 0 }, maps: { uncompressed: 0, gzip: 0 } };
for (const kind of ["worker", "maps"] as const) {
  const files = await readdir(directories[kind], { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (!file.isFile() || ["README.md", "bundle-meta.json"].includes(file.name)) continue;
    if (file.name.endsWith(".map") !== (kind === "maps")) continue;
    const content = await readFile(resolve(file.parentPath, file.name));
    sizes[kind].uncompressed += content.length;
    sizes[kind].gzip += gzipSync(content).length;
  }
}
assert(
  sizes.maps.gzip > 0,
  "Worker verification needs source maps. Pass --upload-source-maps to Wrangler.",
);
for (const kind of ["worker", "maps"] as const) {
  for (const dimension of ["uncompressed", "gzip"] as const) {
    console.info(`${kind}: ${(sizes[kind][dimension] / 1024 ** 2).toFixed(2)} MiB ${dimension}`);
    assert(
      sizes[kind][dimension] <= limits[kind][dimension],
      `${kind} exceeds the ${(limits[kind][dimension] / 1024 ** 2).toFixed(0)} MiB ${dimension} budget`,
    );
  }
}
