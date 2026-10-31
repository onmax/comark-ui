#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { glob } from "tinyglobby";
import { check, contentSetup, nodeReader, scanProject, splitMdx } from "./check.ts";
import { migrateContent } from "./content.ts";
import { formatFindings } from "./report.ts";
import { rewriteSource } from "./rewrite.ts";
import { scan } from "./scan.ts";

const USAGE = `Usage:
  remark-to-comark check [dir] [--json] [--verbose]  everything below, as diagnostics with fixes and docs links
  remark-to-comark scan [dir]                     list remark setups and what each plugin becomes
  remark-to-comark rewrite [dir] [--write]        replace unified chains with Comark's renderHtml
  remark-to-comark content <glob...> [--write]    rewrite Markdown so Comark reads it like remark`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    write: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    syntax: { type: "string", default: "comark" },
  },
});
const [command, ...rest] = positionals;
const syntax = values.syntax === "plain" ? "plain" : "comark";

if (command === "check") {
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
        `${join(root, rewrite.file)}:${rewrite.line} ${rewrite.rewritten ? (values.write ? "rewritten" : "can be rewritten") : `left: ${rewrite.reason}`}`,
      );
      if (rewrite.rewritten) rewritten++;
      else left++;
    }
    if (values.write && result.code !== source) writeFileSync(file, result.code);
  }
  // Framework configs and component props are never rewritten; say so, so an empty run doesn't read as "nothing to do".
  const owned = (await scanProject(nodeReader(root)))
    .flatMap((entry) => entry.setups)
    .filter((setup) => setup.host !== "unified").length;
  console.log(
    `\n${rewritten} unified ${rewritten === 1 ? "chain" : "chains"} ${values.write ? "rewritten" : "can be rewritten (add --write)"}, ${left} left as ${left === 1 ? "it is" : "they are"}${owned ? `; ${owned} framework or component ${owned === 1 ? "setup" : "setups"} not rewritten. Run \`remark-to-comark check ${root} --verbose\` for what each needs` : ""}.`,
  );
} else if (command === "content") {
  const matched = (
    await glob(rest.length ? rest : ["**/*.{md,mdx}"], {
      ignore: ["**/node_modules/**"],
      absolute: true,
    })
  ).sort();
  // The project's syntax plugins and Docusaurus configs decide what's safe to escape, wherever content runs from.
  const root = projectRoot(process.cwd());
  const reader = nodeReader(root);
  const scanned = await scanProject(reader);
  const setup = await contentSetup(
    root,
    scanned.flatMap((entry) => entry.setups),
    scanned.map((entry) => entry.source),
  );
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
  if (setup.missing.length && values.write) {
    console.error(
      `${setup.missing.join(", ")} couldn't be loaded, and without it the rewrite would escape the syntax it adds. Install the project's dependencies, then run this again.`,
    );
    process.exit(1);
  }
  let changed = 0;
  for (const file of matched) {
    if (split.mdx.has(relative(root, file))) continue;
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
    if (values.write) writeFileSync(file, result.markdown);
  }
  console.log(
    `\n${changed} of ${matched.length - mdx.length} Markdown files ${values.write ? "changed" : "would change (add --write)"}${mdx.length ? `; ${mdx.length} MDX ${mdx.length === 1 ? "file" : "files"} left as ${mdx.length === 1 ? "it is" : "they are"}` : ""}.`,
  );
} else {
  console.error(USAGE);
  process.exitCode = 1;
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
