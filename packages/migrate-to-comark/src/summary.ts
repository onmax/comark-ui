import type { Change, Load, Plan, Report } from "./migrate.ts";

const NAMES = { remark: "remark", "markdown-it": "markdown-it", marked: "marked" } as const;

/** Where the project declares a library, in one line: the first few dependencies and their package.json files. */
export function declared(report: Pick<Report, "detection">): string {
  const { uses } = report.detection;
  const names = [...new Set(uses.map((use) => use.dependency))];
  const manifests = [...new Set(uses.map((use) => use.manifest))];
  return `${names.slice(0, 4).join(", ")}${names.length > 4 ? `, and ${names.length - 4} more` : ""} in ${manifests.length === 1 ? manifests[0] : `${manifests.length} package.json files`}`;
}

/** Each migrator's result as plain lines: what it can change, then each kind of warning it leaves, with its docs. */
export async function describe(plan: Plan, load: Load): Promise<string[]> {
  const lines: string[] = [];
  for (const report of plan.reports) {
    const { library, migrator } = report.detection;
    if (!report.findings) {
      lines.push(
        `${NAMES[library]}: ${migrator} couldn't run (${report.error}). Run \`npx ${migrator} check .\` to see why.`,
      );
      continue;
    }
    const module = await load(migrator);
    const changes = plan.changes.filter((change) => change.migrator === migrator);
    const warnings = report.findings.filter(
      (finding) => module.catalog[finding.code]?.severity === "warn" && !finding.edit,
    );
    lines.push(
      `${NAMES[library]} (${declared(report)}): ${counted(changes)}, ${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"} left to you.`,
    );
    const byCode = new Map<string, number>();
    for (const finding of warnings) byCode.set(finding.code, (byCode.get(finding.code) ?? 0) + 1);
    for (const [code, count] of [...byCode].sort((a, b) => b[1] - a[1])) {
      const first = warnings.find((finding) => finding.code === code)!;
      const { docs } = module.toDiagnostic(first);
      lines.push(`  ${count} × ${code} ${module.catalog[code]!.ruleId}${docs ? ` (${docs})` : ""}`);
    }
  }
  return lines;
}

/** "3 Markdown files and 1 code file to change", from the edits a migrator carries. */
export function counted(changes: Change[]): string {
  const markdown = changes.filter((change) => /\.(md|mdx|markdown)$/i.test(change.file)).length;
  const code = changes.length - markdown;
  if (!changes.length) return "nothing to change automatically";
  const parts = [
    markdown && `${markdown} Markdown ${markdown === 1 ? "file" : "files"}`,
    code && `${code} code ${code === 1 ? "file" : "files"}`,
  ].filter(Boolean);
  return `${parts.join(" and ")} to change`;
}
