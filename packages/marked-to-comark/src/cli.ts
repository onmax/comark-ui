#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { glob } from "tinyglobby";
import {
  check,
  contentSetups,
  type ContentSetup,
  declaredVersions,
  nodeReader,
  scanProject,
  sharedElsewhere,
  versionOf,
} from "./check.ts";
import { migrateContent } from "./content.ts";
import { formatFindings } from "./report.ts";
import { rewriteSource } from "./rewrite.ts";
import { scan } from "./scan.ts";

const USAGE = `Usage:
  marked-to-comark check [dir] [--json] [--verbose]  everything below, as diagnostics with fixes and docs links
  marked-to-comark scan [dir]                     list marked setups and what each option and extension becomes
  marked-to-comark rewrite [dir] [--write]        replace marked calls with Comark's renderHtml
  marked-to-comark content <glob...> [--write]    rewrite Markdown so Comark reads it like marked`;

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
    console.log(
      `${setup.file}:${setup.line} (${setup.host === "instance" ? `new Marked()${setup.binding ? ` as ${setup.binding}` : ""}` : "shared marked"}, ${setup.calls.length} ${setup.calls.length === 1 ? "call" : "calls"})`,
    );
    for (const plugin of setup.plugins) {
      const { kind, note, setting } = plugin.mapping;
      const name =
        plugin.type === "option"
          ? `${plugin.name}: ${(plugin.options ?? "").replace(/\s+/g, " ").slice(0, 24)}`
          : plugin.name;
      console.log(
        `  ${name.padEnd(36)} ${kind.padEnd(11)} ${setting ? `${setting}. ` : ""}${note ?? plugin.mapping.call ?? ""}`,
      );
    }
  }
} else if (command === "rewrite") {
  const root = directory(rest[0] ?? ".");
  let rewritten = 0;
  let left = 0;
  const reader = nodeReader(root);
  const scanned = await scanProject(reader);
  const versions = await declaredVersions(reader);
  for (const { file: path } of scanned) {
    const file = join(root, path);
    const source = readFileSync(file, "utf8");
    const version = versionOf(versions, path);
    const result = rewriteSource(source, path, { version, ...sharedElsewhere(scanned, path) });
    for (const rewrite of result.rewrites) {
      console.log(
        `${join(root, rewrite.file)}:${rewrite.line} ${rewrite.rewritten ? (values.write ? "rewritten" : "can be rewritten") : `left: it ${rewrite.reason}`}`,
      );
      if (rewrite.rewritten) rewritten++;
      else left++;
    }
    if (values.write && result.code !== source) writeFileSync(file, result.code);
  }
  console.log(
    `\n${rewritten} marked ${rewritten === 1 ? "call" : "calls"} ${values.write ? "rewritten" : "can be rewritten (add --write)"}, ${left} left as ${left === 1 ? "it is" : "they are"}${left ? `. Run \`marked-to-comark check ${root} --verbose\` for what each needs` : ""}.`,
  );
} else if (command === "content") {
  // Only Markdown, whatever the patterns match: `content .` must not escape a package.json.
  const matched = (
    await glob(rest.length ? rest : ["**/*.{md,markdown}"], {
      ignore: ["**/node_modules/**"],
      absolute: true,
    })
  )
    .filter((file) => /\.(md|markdown)$/i.test(file))
    .sort();
  // Each document follows the marked setups of its own repository, wherever content runs from.
  const setups = new Map<string, Promise<(file: string) => Promise<ContentSetup>>>();
  const setupOf = (file: string) => {
    const root = projectRoot(dirname(file));
    let setupFor = setups.get(root);
    if (!setupFor) {
      const reader = nodeReader(root);
      setupFor = scanProject(reader).then((scanned) => contentSetups(root, reader, scanned));
      setups.set(root, setupFor);
    }
    return setupFor.then((resolve) => resolve(relative(root, file)));
  };
  let changed = 0;
  let skipped = 0;
  for (const file of matched) {
    const shown = relative(process.cwd(), file);
    const bytes = readFileSync(file);
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (source.includes("\u0000")) throw new Error("binary");
    } catch {
      console.error(`${shown}: left as written: it isn't UTF-8 text.`);
      skipped++;
      continue;
    }
    const setup = await setupOf(file);
    if (setup.reason || (setup.missing.length && values.write)) {
      console.error(
        `${shown}: left as written (MKC0303): ${setup.reason ?? `${setup.missing.join(", ")} couldn't be loaded. Install this project's dependencies, then run this again.`}`,
      );
      if (values.write) process.exitCode = 1;
      skipped++;
      continue;
    }
    const result = migrateContent(source, { ...setup, syntax });
    if (result.skipped.length)
      console.log(
        `${shown}: left ${result.skipped.length} ${result.skipped.length === 1 ? "block" : "blocks"} as written on lines ${result.skipped.slice(0, 8).join(", ")} (MKC0303: no edit kept marked's output; check them by hand)`,
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
    `\n${changed} of ${matched.length} Markdown files ${values.write ? "changed" : "would change (add --write)"}${skipped ? `; ${skipped} left as written` : ""}.`,
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
