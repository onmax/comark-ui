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
    count("MKC0101") && `${count("MKC0101")} marked setups can't be read (MKC0101).`,
    count("MKC0105") &&
      `${count("MKC0105")} pieces of the project's own marked code need porting by hand (MKC0105).`,
    count("MKC0106") &&
      `${count("MKC0106")} options or extensions have no Comark counterpart (MKC0106).`,
    count("MKC0201") &&
      `${count("MKC0201")} marked calls can't be rewritten as they are (MKC0201).`,
    count("MKC0303") &&
      `${count("MKC0303")} Markdown files have blocks left as written; check them by hand (MKC0303).`,
    count("MKC0304") && `Markdown no marked code reads was left alone (MKC0304).`,
  ].filter(Boolean);
  const next = [
    count("MKC0302") &&
      `marked-to-comark content ${[...new Set(findings.flatMap((finding) => (finding.code === "MKC0302" ? [finding.file.includes("/") ? `${finding.file.slice(0, finding.file.lastIndexOf("/"))}/**/*.md` : finding.file] : [])))].map(quoted).join(" ")} --write   # ${count("MKC0302")} Markdown files; content changes only what Comark would read differently`,
    count("MKC0202") &&
      `marked-to-comark rewrite ${quoted(root)} --write   # ${count("MKC0202")} marked calls`,
    (count("MKC0302") || count("MKC0202")) &&
      `marked-to-comark check ${quoted(root)}   # again, to see what's left`,
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
