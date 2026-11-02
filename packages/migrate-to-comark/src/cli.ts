#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import * as prompts from "@clack/prompts";
import type { Detected } from "./detect.ts";
import { apply, load, plan, type Plan } from "./migrate.ts";
import { describe } from "./summary.ts";

const USAGE = `Usage:
  migrate-to-comark [dir]             find the project's Markdown libraries and move it to Comark, asking first
  migrate-to-comark [dir] --dry-run   report what would change, and write nothing
  migrate-to-comark [dir] --yes       write every change without asking
  migrate-to-comark [dir] --json      the report as JSON, for agents (add --yes to write)
  migrate-to-comark [dir] --only markdown-it   move only this library (remark, markdown-it, or marked; repeatable)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    yes: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    only: { type: "string", multiple: true },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length > 1) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}
const root = positionals[0] ?? ".";
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Cannot migrate \`${root}\`: no such directory.`);
  process.exit(1);
}

const LIBRARIES = ["remark", "markdown-it", "marked"];
const unknown = values.only?.find((library) => !LIBRARIES.includes(library));
if (unknown) {
  console.error(`Cannot move \`${unknown}\`: --only takes ${LIBRARIES.join(", ")}.`);
  process.exit(1);
}
const only = values.only?.length ? values.only : undefined;
const interactive =
  process.stdin.isTTY && process.stdout.isTTY && !values.yes && !values["dry-run"] && !values.json;

if (values.json) await json();
else if (interactive) await wizard();
else await report();

async function wizard() {
  prompts.intro("migrate-to-comark");
  const first = await plan(root, { only: [], load });
  if (!found(first.detected, (line) => prompts.log.warn(line))) {
    prompts.outro("Nothing to migrate.");
    return;
  }
  for (const detection of first.detected.libraries)
    prompts.log.info(`Found ${detection.library}, moved by ${detection.migrator}.`);
  let picked: string[] = first.detected.libraries
    .map((detection) => detection.library)
    .filter((library) => !only || only.includes(library));
  if (!only && picked.length > 1) {
    const chosen = await prompts.multiselect({
      message: "Which libraries do you want to move to Comark?",
      options: picked.map((library) => ({ value: library, label: library })),
      initialValues: picked,
    });
    if (prompts.isCancel(chosen)) return prompts.cancel("Nothing written.");
    picked = chosen;
  }
  const spinner = prompts.spinner();
  spinner.start("Checking the project");
  const result = await plan(root, { only: picked, load });
  spinner.stop("Checked the project");
  prompts.note((await describe(result, load)).join("\n"), "What each migrator found");
  for (const conflict of result.conflicts)
    prompts.log.warn(
      `${conflict.file} is left as it is: ${conflict.migrators.join(" and ")} would both change it. Run each one's \`content\` command on it and keep the result that renders right.`,
    );
  if (!result.changes.length) {
    prompts.outro(next(result));
    return;
  }
  const go = await prompts.confirm({
    message: `Write ${result.changes.length} ${result.changes.length === 1 ? "file" : "files"}?`,
  });
  if (prompts.isCancel(go) || !go) return prompts.cancel("Nothing written.");
  const { written, stale } = apply(root, result.changes);
  prompts.log.success(`Wrote ${written.length} ${written.length === 1 ? "file" : "files"}.`);
  for (const file of stale)
    prompts.log.warn(
      `${file} changed while the wizard ran, so it was left as it is. Run the wizard again.`,
    );
  prompts.outro(next(result));
}

async function report() {
  const result = await plan(root, { only, load });
  if (!found(result.detected, (line) => console.log(line))) return;
  console.log((await describe(result, load)).join("\n"));
  for (const conflict of result.conflicts)
    console.log(
      `${conflict.file} is left as it is: ${conflict.migrators.join(" and ")} would both change it.`,
    );
  if (values.yes) {
    const { written, stale } = apply(root, result.changes);
    console.log(`\nWrote ${written.length} ${written.length === 1 ? "file" : "files"}.`);
    for (const file of stale) console.log(`${file} changed while the wizard ran; left as it is.`);
  } else if (result.changes.length) {
    console.log(
      `\nNothing written. Run again with --yes to write ${result.changes.length} ${result.changes.length === 1 ? "file" : "files"}.`,
    );
  }
  console.log(`\n${next(result)}`);
}

async function json() {
  const result = await plan(root, { only, load });
  const written = values.yes ? apply(root, result.changes) : undefined;
  console.log(
    JSON.stringify(
      {
        libraries: result.detected.libraries,
        unsupported: result.detected.unsupported,
        comark: result.detected.comark,
        reports: result.reports.map(({ detection, findings, error }) => ({
          library: detection.library,
          migrator: detection.migrator,
          findings: findings?.length,
          error,
        })),
        changes: result.changes.map(({ file, migrator }) => ({ file, migrator })),
        conflicts: result.conflicts,
        ...written,
      },
      null,
      2,
    ),
  );
}

/** Says what was found; false when there's nothing any migrator moves. */
function found(detected: Detected, say: (line: string) => void): boolean {
  for (const { name, uses } of detected.unsupported)
    say(`${name} (${uses[0]!.manifest}) has no migrator yet, so its Markdown stays as it is.`);
  if (detected.libraries.length) return true;
  say(
    `No package.json under ${root} declares remark, markdown-it, or marked${detected.comark ? ", and comark is already a dependency" : ""}.`,
  );
  return false;
}

/** The commands that show what's left, one per migrator that ran. */
function next(result: Plan): string {
  const commands = result.reports.map(
    ({ detection }) => `npx ${detection.migrator} check ${JSON.stringify(root)} --verbose`,
  );
  return [
    "Review the changes with `git diff`. Every finding, with its fix:",
    ...commands.map((command) => `  ${command}`),
  ].join("\n");
}
