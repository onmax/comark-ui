import { styleText } from "node:util";
import { formatDiagnostic, type Diagnostic } from "nostics";
import { ansiFormatter } from "nostics/formatters/ansi";
import type { Finding } from "./check.ts";
import { catalog, diagnostics, type Code } from "./diagnostics.ts";

const ansi = ansiFormatter({
  red: (text) => styleText("red", text),
  yellow: (text) => styleText("yellow", text),
  cyan: (text) => styleText("cyan", text),
  gray: (text) => styleText("gray", text),
  bold: (text) => styleText("bold", text),
  dim: (text) => styleText("dim", text),
});

export function toDiagnostic(finding: Finding): Diagnostic<unknown> {
  // SAFETY: check() gives each finding the params its code's diagnostic reads.
  const params = { ...finding.params, sources: [`${finding.file}:${finding.line}`] } as never;
  return diagnostics[finding.code](params);
}

const ORDER = { warn: 0, info: 1 };

/**
 * Findings as nostics diagnostics, warnings first, then a summary that says what the migration leaves undone and
 * what to run next. With `json`, one JSON array an agent can read.
 */
export function formatFindings(
  findings: Finding[],
  options: { json?: boolean; color?: boolean; verbose?: boolean; root?: string } = {},
): string {
  const root = options.root ?? ".";
  const quoted = (path: string) => JSON.stringify(path);
  const sorted = [...findings].sort(
    (a, b) => ORDER[catalog[a.code].severity] - ORDER[catalog[b.code].severity],
  );
  if (options.json) {
    return JSON.stringify(
      sorted.map((finding) => {
        const diagnostic = toDiagnostic(finding);
        return {
          code: finding.code,
          severity: catalog[finding.code].severity,
          rule: catalog[finding.code].ruleId,
          file: finding.file,
          line: finding.line,
          files: finding.params.files,
          why: diagnostic.why,
          fix: diagnostic.fix,
          docs: diagnostic.docs,
        };
      }),
      null,
      2,
    );
  }
  const format = options.color ? ansi : formatDiagnostic;
  // Info findings are the plan; without --verbose they're summed up so the warnings stay readable.
  const shown = options.verbose
    ? sorted
    : sorted.filter((finding) => catalog[finding.code].severity !== "info");
  const count = (code: Code) => findings.filter((finding) => finding.code === code).length;
  const warnings = findings.filter((finding) => catalog[finding.code].severity === "warn").length;
  const left = [
    count("RTC0101") &&
      `${count("RTC0101")} framework or component setups are reported, not rewritten (RTC0101).`,
    count("RTC0105") &&
      `${count("RTC0105")} of the project's own plugins need porting by hand (RTC0105).`,
    count("RTC0106") && `${count("RTC0106")} plugins have no Comark counterpart (RTC0106).`,
    count("RTC0201") &&
      `${count("RTC0201")} unified chains can't be rewritten as they are (RTC0201).`,
    count("RTC0301") && `MDX is left as it is (RTC0301).`,
    count("RTC0303") &&
      `${count("RTC0303")} Markdown files have blocks left as written; check them by hand (RTC0303).`,
  ].filter(Boolean);
  const next = [
    count("RTC0302") &&
      `remark-to-comark content ${quoted(root === "." ? "**/*.{md,mdx}" : `${root}/**/*.{md,mdx}`)} --write   # ${count("RTC0302")} Markdown files; MDX stays as it is`,
    count("RTC0202") &&
      `remark-to-comark rewrite ${quoted(root)} --write   # ${count("RTC0202")} unified chains`,
    (count("RTC0302") || count("RTC0202")) &&
      `remark-to-comark check ${quoted(root)}   # again, to see what's left`,
  ].filter(Boolean);
  const summary = [
    `${findings.length} findings: ${warnings} to act on, ${findings.length - warnings} informational${options.verbose ? "" : " (--verbose lists them)"}.`,
    ...(left.length ? ["", "Not migrated:", ...left.map((line) => `  - ${line}`)] : []),
    ...(next.length ? ["", "Next:", ...next.map((line) => `  ${line}`)] : []),
  ];
  return [...shown.map((finding) => format(toDiagnostic(finding))), summary.join("\n")].join(
    "\n\n",
  );
}
