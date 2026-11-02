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
    count("MIC0101") &&
      `${count("MIC0101")} framework or caller-owned setups are reported, not rewritten (MIC0101).`,
    count("MIC0105") &&
      `${count("MIC0105")} plugins or hand-made changes need checking on Comark (MIC0105).`,
    count("MIC0106") && `${count("MIC0106")} plugins have no Comark counterpart (MIC0106).`,
    count("MIC0107") && `${count("MIC0107")} options don't carry over as written (MIC0107).`,
    count("MIC0201") &&
      `${count("MIC0201")} markdown-it setups can't be rewritten as they are (MIC0201).`,
    count("MIC0303") &&
      `${count("MIC0303")} Markdown files have blocks left as written; check them by hand (MIC0303).`,
  ].filter(Boolean);
  const next = [
    count("MIC0302") &&
      `markdown-it-to-comark content ${quoted(root === "." ? "**/*.md" : `${root}/**/*.md`)} --write   # ${count("MIC0302")} Markdown files`,
    count("MIC0202") &&
      `markdown-it-to-comark rewrite ${quoted(root)} --write   # ${count("MIC0202")} markdown-it setups`,
    (count("MIC0302") || count("MIC0202")) &&
      `markdown-it-to-comark check ${quoted(root)}   # again, to see what's left`,
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
