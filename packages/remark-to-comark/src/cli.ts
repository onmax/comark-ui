#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { glob } from "tinyglobby";
import { check, contentSetups, nodeReader, scanProject, splitMdx } from "./check.ts";
import { migrateContent } from "./content.ts";
import { formatFindings } from "./report.ts";
import { rewriteSource } from "./rewrite.ts";
import { scan } from "./scan.ts";

const USAGE = `Usage:
  remark-to-comark migrate [dir] [--force]          escape the Markdown, rewrite the unified chains, then check what's left
  remark-to-comark check [dir] [--json] [--verbose]  everything below, as diagnostics with fixes and docs links
  remark-to-comark scan [dir]                     list remark setups and what each plugin becomes
  remark-to-comark rewrite [dir] [--write]        replace unified chains with Comark's renderHtml
  remark-to-comark content <glob...> [--write]    rewrite Markdown so Comark reads it like remark

dir defaults to the current directory.`;

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      write: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      syntax: { type: "string", default: "comark" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
} catch (error) {
  console.error(`${error instanceof Error ? error.message : error}\n\n${USAGE}`);
  process.exit(1);
}
const { positionals, values } = parsed;
const [command, ...rest] = positionals;
const syntax = values.syntax === "plain" ? "plain" : "comark";

if (values.help || command === undefined || command === "help") {
  console.log(USAGE);
} else if (command === "migrate") {
  const root = directory(rest[0] ?? ".");
  const dirty = uncommitted(root);
  if (dirty && !values.force) {
    console.error(
      `migrate writes files, and ${dirty}. Commit or stash first so \`git diff\` shows what it changed and \`git checkout .\` undoes it, or pass --force.`,
    );
    process.exit(1);
  }
  const content = await escapeContent(["**/*.{md,mdx}"], root, true);
  const chains = await rewriteChains(root, true);
  const findings = await check(root, nodeReader(root), { display: root });
  console.log(
    `\n${formatFindings(findings, { color: process.stdout.isTTY, root })}\n\nMigrated: ${content.changed} Markdown ${content.changed === 1 ? "file" : "files"} escaped, ${chains.rewritten} unified ${chains.rewritten === 1 ? "chain" : "chains"} rewritten.${chains.rewritten ? " Install what the rewritten code imports: comark, @comark/html, and remark-to-comark." : ""} Review it with \`git diff\`.`,
  );
} else if (command === "check") {
  const root = directory(rest[0] ?? ".");
  const findings = await check(root, nodeReader(root), { display: root });
  console.log(
    formatFindings(findings, {
      json: values.json,
      verbose: values.verbose,
      color: process.stdout.isTTY,
      root,
    }),
  );
} else if (command === "scan") {
  const root = directory(rest[0] ?? ".");
  for (const setup of await scan(root)) {
    console.log(`${setup.file}:${setup.line} (${setup.host})`);
    for (const plugin of setup.plugins) {
      const { kind, note } = plugin.mapping;
      console.log(
        `  ${plugin.name.padEnd(36)} ${kind.padEnd(11)} ${note ?? plugin.mapping.call ?? ""}`,
      );
    }
  }
} else if (command === "rewrite") {
  const root = directory(rest[0] ?? ".");
  const { rewritten, left } = await rewriteChains(root, values.write);
  // Framework configs and component props are never rewritten; say so, so an empty run doesn't read as "nothing to do".
  const owned = (await scanProject(nodeReader(root)))
    .flatMap((entry) => entry.setups)
    .filter((setup) => setup.host !== "unified").length;
  console.log(
    `\n${rewritten} unified ${rewritten === 1 ? "chain" : "chains"} ${values.write ? "rewritten" : "can be rewritten (add --write)"}, ${left} left as ${left === 1 ? "it is" : "they are"}${owned ? `; ${owned} framework or component ${owned === 1 ? "setup" : "setups"} not rewritten. Run \`remark-to-comark check ${root} --verbose\` for what each needs` : ""}.`,
  );
} else if (command === "content") {
  const { changed, total, mdx } = await escapeContent(
    rest.length ? rest : ["**/*.{md,mdx}"],
    process.cwd(),
    values.write,
  );
  console.log(
    `\n${changed} of ${total} Markdown files ${values.write ? "changed" : "would change (add --write)"}${mdx ? `; ${mdx} MDX ${mdx === 1 ? "file" : "files"} left as ${mdx === 1 ? "it is" : "they are"}` : ""}.`,
  );
} else {
  console.error(`Unknown command \`${command}\`.\n\n${USAGE}`);
  process.exitCode = 1;
}

/** Replaces the unified chains under `root` it can prove render the same, printing each one it finds. */
async function rewriteChains(root: string, write: boolean) {
  let rewritten = 0;
  let left = 0;
  const files = await glob(["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte,astro}"], {
    cwd: root,
    ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  });
  for (const path of files.sort()) {
    const file = join(root, path);
    const source = readFileSync(file, "utf8");
    if (!/unified|remark|rehype/.test(source)) continue;
    const result = rewriteSource(source, relative(root, file));
    for (const rewrite of result.rewrites) {
      console.log(
        `${join(root, rewrite.file)}:${rewrite.line} ${rewrite.rewritten ? (write ? "rewritten" : "can be rewritten") : `left: ${rewrite.reason}`}`,
      );
      if (rewrite.rewritten) rewritten++;
      else left++;
    }
    if (write && result.code !== source) writeFileSync(file, result.code);
  }
  return { rewritten, left };
}

/** Escapes the Markdown files `patterns` match under `cwd` so Comark reads them like remark, printing each change. */
async function escapeContent(patterns: string[], cwd: string, write: boolean) {
  const matched = (
    await glob(patterns, { cwd, ignore: ["**/node_modules/**"], absolute: true })
  ).sort();
  // The project's syntax plugins and Docusaurus configs decide what's safe to escape, wherever content runs from.
  const root = projectRoot(cwd);
  const reader = nodeReader(root);
  const scanned = await scanProject(reader);
  const setupFor = await contentSetups(root, reader, scanned);
  const split = await splitMdx(
    reader,
    matched.map((file) => relative(root, file)),
  );
  const mdx = matched
    .filter((file) => split.mdx.has(relative(root, file)))
    .map((file) => relative(process.cwd(), file));
  if (mdx.length) {
    console.log(
      formatFindings(
        [
          {
            code: "RTC0301",
            params: {
              at: `${mdx.slice(0, 3).join(", ")}${mdx.length > 3 ? `, and ${mdx.length - 3} more` : ""}`,
              count: mdx.length,
              docusaurus: split.docusaurus.size,
              unresolved: split.unresolved.size,
              files: mdx,
            },
            file: mdx[0]!,
            line: 1,
          },
        ],
        { color: process.stdout.isTTY },
      ).split("\n\n")[0],
    );
  }
  let changed = 0;
  for (const file of matched) {
    if (split.mdx.has(relative(root, file))) continue;
    const setup = await setupFor(relative(root, file));
    if (setup.reason || (setup.missing.length && write)) {
      console.error(
        `${relative(process.cwd(), file)}: left as written (RTC0303): ${setup.reason ?? `${setup.missing.join(", ")} couldn't be loaded. Install this site's dependencies, then run this again.`}`,
      );
      if (write) process.exitCode = 1;
      continue;
    }
    const source = readFileSync(file, "utf8");
    const result = migrateContent(source, { ...setup, syntax });
    if (result.skipped.length)
      console.log(
        `${relative(process.cwd(), file)}: left ${result.skipped.length} ${result.skipped.length === 1 ? "block" : "blocks"} as written on lines ${result.skipped.slice(0, 8).join(", ")} (RTC0303: a URL after an unclosed \`[\`; check them by hand)`,
      );
    if (!result.changes.length) continue;
    changed++;
    const lines = [...new Set(result.changes.map((change) => change.line))];
    console.log(
      `${relative(process.cwd(), file)}: ${result.changes.length} changes on lines ${lines.slice(0, 12).join(", ")}${lines.length > 12 ? ", …" : ""}`,
    );
    if (write) writeFileSync(file, result.markdown);
  }
  return { changed, total: matched.length - mdx.length, mdx: mdx.length };
}

/** Why `migrate` shouldn't write under `root` yet, or nothing when git has every file committed. */
function uncommitted(root: string): string | undefined {
  const status = spawnSync("git", ["status", "--porcelain", "--", "."], {
    cwd: root,
    encoding: "utf8",
  });
  if (status.error || status.status !== 0) return "this isn't a git repository";
  if (status.stdout.trim()) return "git has uncommitted changes here";
}

/** The directory the user named, or exit with a message when there isn't one. */
function directory(path: string): string {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    console.error(`Cannot check \`${path}\`: no such directory.`);
    process.exit(1);
  }
  return path;
}

/** The repository root above `from` (the nearest .git), so configs above the working directory still count. */
function projectRoot(from: string): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return resolve(from);
  }
}
