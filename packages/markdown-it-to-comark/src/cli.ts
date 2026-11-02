#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { glob } from "tinyglobby";
import { check, contentSetups, IGNORE, migrateScoped, nodeReader, scanProject } from "./check.ts";
import { formatFindings } from "./report.ts";
import { rewriteSource } from "./rewrite.ts";
import { mentions, scan } from "./scan.ts";

const USAGE = `Usage:
  markdown-it-to-comark check [dir] [--json] [--verbose]  everything below, as diagnostics with fixes and docs links
  markdown-it-to-comark scan [dir]                     list markdown-it setups and what each plugin and option becomes
  markdown-it-to-comark rewrite [dir] [--write]        replace markdown-it setups with Comark's renderHtml
  markdown-it-to-comark content <glob...> [--write]    rewrite Markdown so Comark reads it like markdown-it`;

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
    const preset = setup.preset ? ` ${setup.preset}` : "";
    const options = Object.entries(setup.options)
      .map(([name, text]) => `${name}: ${text.replace(/\s+/g, " ").slice(0, 30)}`)
      .join(", ");
    console.log(
      `${setup.file}:${setup.line} (${setup.host}${preset})${options ? ` { ${options} }` : ""}`,
    );
    for (const plugin of setup.plugins) {
      const { kind, note } = plugin.mapping;
      console.log(
        `  ${plugin.name.padEnd(36)} ${kind.padEnd(11)} ${note ?? plugin.mapping.call ?? ""}`,
      );
    }
    for (const item of setup.customized)
      console.log(`  ${item.what.padEnd(36)} by hand     line ${item.line}`);
  }
} else if (command === "rewrite") {
  const root = directory(rest[0] ?? ".");
  let rewritten = 0;
  let left = 0;
  const files = await glob(["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}"], {
    cwd: root,
    ignore: [...IGNORE, "**/*.d.ts"],
    // check() reads dot folders too (.vitepress, .github), so every edit it reports is one --write makes.
    dot: true,
  });
  for (const path of files.sort()) {
    const file = join(root, path);
    const source = readFileSync(file, "utf8");
    if (!mentions(source, path)) continue;
    const result = rewriteSource(source, relative(root, file));
    for (const rewrite of result.rewrites) {
      console.log(
        `${join(root, rewrite.file)}:${rewrite.line} ${rewrite.rewritten ? (values.write ? "rewritten" : "can be rewritten") : `left: it ${rewrite.reason}`}`,
      );
      if (rewrite.rewritten) rewritten++;
      else left++;
    }
    if (values.write && result.code !== source) writeFileSync(file, result.code);
  }
  // Framework hooks are never rewritten; say so, so an empty run doesn't read as "nothing to do".
  const owned = (await scanProject(nodeReader(root)))
    .flatMap((entry) => entry.setups)
    .filter((setup) => setup.host !== "markdown-it").length;
  console.log(
    `\n${rewritten} markdown-it ${rewritten === 1 ? "setup" : "setups"} ${values.write ? "rewritten" : "can be rewritten (add --write)"}, ${left} left as ${left === 1 ? "it is" : "they are"}${owned ? `; ${owned} framework or caller-owned ${owned === 1 ? "setup" : "setups"} not rewritten. Run \`markdown-it-to-comark check ${root} --verbose\` for what each needs` : ""}.`,
  );
} else if (command === "content") {
  const matched = (
    await glob(rest.length ? rest : ["**/*.{md,markdown}"], {
      ignore: IGNORE,
      absolute: true,
      dot: true,
    })
  ).sort();
  // The project's setups decide what's text, wherever content runs from.
  const root = projectRoot(process.cwd());
  const reader = nodeReader(root);
  const setupFor = await contentSetups(root, reader, await scanProject(reader));
  let changed = 0;
  for (const file of matched) {
    const setup = await setupFor(relative(root, file));
    const shown = relative(process.cwd(), file);
    if (setup.missing.length && values.write) {
      console.error(
        `${shown}: left as written (MIC0302): ${setup.missing.join(", ")} couldn't be loaded. Install this project's dependencies, then run this again.`,
      );
      process.exitCode = 1;
      continue;
    }
    const source = readFileSync(file, "utf8");
    const result =
      values.syntax === "plain"
        ? { markdown: source, changes: [], skipped: [] }
        : migrateScoped(source, setup);
    if (result.skipped.length)
      console.log(
        `${shown}: left ${result.skipped.length} ${result.skipped.length === 1 ? "block" : "blocks"} as written on lines ${result.skipped.slice(0, 8).join(", ")} (MIC0303; check them by hand)`,
      );
    if (!result.changes.length) continue;
    changed++;
    const lines = [...new Set(result.changes.map((change) => change.line))];
    console.log(
      `${shown}: ${result.changes.length} changes on lines ${lines.slice(0, 12).join(", ")}${lines.length > 12 ? ", …" : ""}`,
    );
    if (values.write) writeFileSync(file, result.markdown);
  }
  console.log(
    `\n${changed} of ${matched.length} Markdown files ${values.write ? "changed" : "would change (add --write)"}.`,
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

/** The repository root above `from` (the nearest .git), so setups above the working directory still count. */
function projectRoot(from: string): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return resolve(from);
  }
}
