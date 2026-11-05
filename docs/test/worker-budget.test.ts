import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const script = fileURLToPath(new URL("../worker-budget.ts", import.meta.url));
const mib = 1024 ** 2;

function checkBudget(files: Record<string, string | Buffer>) {
  const directory = mkdtempSync(join(tmpdir(), "comark-worker-budget-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      const path = join(directory, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
    return spawnSync(process.execPath, [script, directory], { encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("Worker upload budgets", () => {
  it("accepts nested modules and maps while excluding Wrangler metadata", () => {
    const result = checkBudget({
      "index.js": "export default {}",
      "chunks/page.js": "export const page = 1",
      "chunks/page.js.map": "{}",
      "README.md": Buffer.alloc(65 * mib),
      "bundle-meta.json": Buffer.alloc(65 * mib),
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("MiB uncompressed");
    expect(result.stdout).toContain("MiB gzip");
  });

  it("requires source maps", () => {
    const result = checkBudget({ "index.js": "export default {}" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Pass --upload-source-maps to Wrangler");
  });

  it.each([
    ["worker", "chunks/page.js", 33],
    ["maps", "chunks/page.js.map", 31],
  ] as const)(
    "rejects %s exceeding the uncompressed limit even when gzip is tiny",
    (kind, name, size) => {
      const result = checkBudget({
        "index.js": "export default {}",
        "index.js.map": "{}",
        [name]: Buffer.alloc(size * mib),
        [`nested/${name}`]: Buffer.alloc(size * mib),
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(new RegExp(`${kind} exceeds the .* MiB uncompressed budget`));
    },
  );

  it.each([
    ["worker", "index.js", 9],
    ["maps", "index.js.map", 13],
  ] as const)("retains the %s gzip budget", (kind, name, size) => {
    const result = checkBudget({
      "index.js": "export default {}",
      "index.js.map": "{}",
      [name]: randomBytes(size * mib),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(new RegExp(`${kind} exceeds the .* MiB gzip budget`));
  });
});
