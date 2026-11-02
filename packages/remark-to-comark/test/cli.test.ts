import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

function run(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

function project(files: Record<string, string>, git = true) {
  const root = mkdtempSync(join(tmpdir(), "remark-to-comark-cli-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  if (git) {
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
    };
    execFileSync("git", ["init", "-q"], { cwd: root, env });
    execFileSync("git", ["add", "."], { cwd: root, env });
    execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root, env });
  }
  return root;
}

const files = {
  "package.json": "{}",
  "src/render.ts": `import { remark } from "remark";\nimport html from "remark-html";\n\nexport async function toHtml(markdown: string) {\n  const result = await remark().use(html).process(markdown);\n  return result.toString();\n}\n`,
  "src/other.ts": `import { remark } from "remark";\nimport html from "remark-html";\nimport mine from "./mine.js";\n\nexport const other = async (md: string) => String(await remark().use(mine).use(html).process(md));\n`,
  "docs/a.md": "# A\n\nSet {value} first.\n",
};

describe("cli", () => {
  it.each([["--help"], ["-h"], ["help"], []])("prints usage for %j", (...args) => {
    const result = run(tmpdir(), ...args);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("remark-to-comark migrate [dir]");
  });

  it("names an unknown option and prints usage instead of a stack trace", () => {
    const result = run(tmpdir(), "check", "--nope");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--nope");
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).not.toContain("at parseArgs");
  });

  it("migrates in one command: escapes Markdown, rewrites chains, and reports what's left", () => {
    const root = project(files);
    const result = run(root, "migrate");
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).not.toBe(files["docs/a.md"]);
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toContain("renderHtml(markdown");
    expect(result.stdout).toContain("Not migrated:");
    expect(result.stdout).toContain("unified chains can't be rewritten as they are (RTC0201)");
    expect(result.stdout).toContain(
      "Migrated: 1 Markdown file escaped, 1 unified chain rewritten. Install what the rewritten code imports",
    );
  });

  it.each([
    ["uncommitted changes", true, "git has uncommitted changes"],
    ["no git repository", false, "this isn't a git repository"],
  ])("refuses to migrate with %s unless forced", (_, git, reason) => {
    const root = project(files, git);
    if (git) writeFileSync(join(root, "docs/b.md"), "draft\n");
    const refused = run(root, "migrate");
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain(reason);
    expect(readFileSync(join(root, "docs/a.md"), "utf8")).toBe(files["docs/a.md"]);
    expect(run(root, "migrate", "--force").status).toBe(0);
    expect(readFileSync(join(root, "src/render.ts"), "utf8")).toContain("renderHtml(markdown");
  });
});
