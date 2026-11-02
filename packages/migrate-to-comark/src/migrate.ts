import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { detect, type Detected, type Detection } from "./detect.ts";

/** What every migrator's check reports, the shape remark-to-comark set. */
export interface Finding {
  code: string;
  params: Record<string, unknown> & { at: string };
  file: string;
  line: number;
  edit?: { source: string; start: number; end: number; text: string };
}

/** The part of a migrator package the wizard drives. Each one exports these from its root. */
export interface Migrator {
  check: (root: string) => Promise<Finding[]>;
  catalog: Record<string, { severity: "warn" | "info"; ruleId: string }>;
  toDiagnostic: (finding: Finding) => { why: string; fix: string; docs?: string };
}

export interface Report {
  detection: Detection;
  /** Undefined when the migrator couldn't be loaded or threw; `error` says why. */
  findings?: Finding[];
  error?: string;
}

/** One file's change: the migrator that wants it and the edit, against the text the check read. */
export interface Change {
  file: string;
  migrator: string;
  source: string;
  edit: NonNullable<Finding["edit"]>;
}

export interface Plan {
  detected: Detected;
  reports: Report[];
  changes: Change[];
  /** Files more than one migrator wants to change, left as they are. */
  conflicts: { file: string; migrators: string[] }[];
}

export type Load = (migrator: string) => Promise<Migrator>;

/** Imports a migrator package by name, from the wizard's own dependencies. */
export const load: Load = async (migrator) => {
  // SAFETY: every migrator package exports `check`, `catalog`, and `toDiagnostic` from its root (AGENTS.md).
  return (await import(migrator)) as Migrator;
};

/**
 * Detects the project's Markdown libraries, runs the migrator of each one in `only` (all by default), and collects the
 * edits their findings carry: the same ones each migrator's `rewrite --write` and `content --write` make.
 */
export async function plan(
  root: string,
  options: { only?: string[]; load?: Load } = {},
): Promise<Plan> {
  const detected = await detect(root);
  const reports: Report[] = [];
  for (const detection of detected.libraries) {
    if (options.only && !options.only.includes(detection.library)) continue;
    try {
      const migrator = await (options.load ?? load)(detection.migrator);
      reports.push({ detection, findings: await migrator.check(root) });
    } catch (error) {
      reports.push({
        detection,
        error: String(error instanceof Error ? error.message : error).split("\n")[0],
      });
    }
  }
  const wanted = new Map<string, Change[]>();
  for (const { detection, findings } of reports) {
    // Safe content edits can still be written, but switching parsers must wait for every unresolved document.
    const unresolvedContent = findings?.some(
      (finding) =>
        finding.code.endsWith("0303") || (finding.code.endsWith("0302") && !finding.edit),
    );
    for (const finding of findings ?? []) {
      if (!finding.edit) continue;
      if (unresolvedContent && finding.code.endsWith("0202")) continue;
      const changes = wanted.get(finding.file) ?? [];
      // A migrator puts the same edit on every finding in a file, such as each rewritten chain in it.
      if (
        changes.some(
          (change) => change.migrator === detection.migrator && same(change.edit, finding.edit!),
        )
      )
        continue;
      changes.push({
        file: finding.file,
        migrator: detection.migrator,
        source: finding.edit.source,
        edit: finding.edit,
      });
      wanted.set(finding.file, changes);
    }
  }
  const changes: Change[] = [];
  const conflicts: Plan["conflicts"] = [];
  for (const [file, list] of [...wanted].sort(([a], [b]) => a.localeCompare(b))) {
    const owned = list.length === 1 ? list[0] : owner(file, list, detected);
    if (owned) changes.push(owned);
    else conflicts.push({ file, migrators: [...new Set(list.map((change) => change.migrator))] });
  }
  return { detected, reports, changes, conflicts };
}

/**
 * In a monorepo every migrator wants every Markdown file, so a file goes to the library its nearest declaring
 * package.json uses, such as a VitePress site's own package. A package.json that declares several of them decides
 * nothing.
 */
function owner(file: string, list: Change[], detected: Detected): Change | undefined {
  const declared = new Map<string, Set<string>>();
  for (const { migrator, uses } of detected.libraries)
    for (const { manifest } of uses)
      declared.set(manifest, new Set([...(declared.get(manifest) ?? []), migrator]));
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    const manifest = dir === "." ? "package.json" : `${dir}/package.json`;
    const competing = list.filter((change) => declared.get(manifest)?.has(change.migrator));
    if (competing.length) return competing.length === 1 ? competing[0] : undefined;
    if (dir === "." || dir === dirname(dir)) return undefined;
  }
}

const same = (a: Change["edit"], b: Change["edit"]) =>
  a.start === b.start && a.end === b.end && a.text === b.text;

/**
 * Writes each change, unless its file changed since the check read it. Returns the files written and the ones skipped.
 */
export function apply(root: string, changes: Change[]): { written: string[]; stale: string[] } {
  const written: string[] = [];
  const stale: string[] = [];
  for (const { file, source, edit } of changes) {
    const path = join(root, file);
    if (readFileSync(path, "utf8") !== source) {
      stale.push(file);
      continue;
    }
    writeFileSync(path, source.slice(0, edit.start) + edit.text + source.slice(edit.end));
    written.push(file);
  }
  return { written, stale };
}
