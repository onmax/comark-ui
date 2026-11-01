import { relative } from "node:path";
import type { RuleContext, RuleMeta } from "vite-doctor/extension";
import {
  createRule,
  defineDoctorDiagnostics,
  defineDoctorExtension,
  defineRulePack,
} from "vite-doctor/extension";
import { check, IGNORE, type Finding } from "./check.ts";
import { catalog, type Code } from "./diagnostics.ts";

const DOCS = "https://comark-ui.onmax.me/remark-to-comark/diagnostics";
// SAFETY: the keys of the catalog are exactly its codes.
const codes = Object.keys(catalog) as Code[];
const rules = [...new Set(codes.map((code) => catalog[code].ruleId))];

const diagnostics = defineDoctorDiagnostics(
  codes.map((code) => ({ code, ruleId: catalog[code].ruleId })),
  { docsBase: (code) => `${DOCS}#${code.toLowerCase()}` },
);

const TITLES = new Map([
  ["remark-to-comark/framework", "A framework owns the remark setup"],
  ["remark-to-comark/plugin", "A remark plugin and what it becomes on Comark"],
  ["remark-to-comark/custom-plugin", "The project's own remark plugin needs a port"],
  ["remark-to-comark/unsupported-plugin", "A remark plugin with no Comark counterpart"],
  ["remark-to-comark/chain", "A unified chain the rewrite can't replace"],
  ["remark-to-comark/rewritable-chain", "A unified chain the rewrite can replace"],
  ["remark-to-comark/mdx", "MDX the migration leaves alone"],
  ["remark-to-comark/content", "Markdown Comark would read differently from remark"],
]);

// Content edits keep remark's output byte for byte, so `--fix` applies them. A rewritten chain imports @comark/html and
// remark-to-comark/setup, which the project may not have installed yet, so only `--unsafe-fix` applies it.
const FIXES: Partial<Record<Code, { kind: "safe" | "unsafe"; message: string }>> = {
  RTC0302: {
    kind: "safe",
    message: "Escapes the Markdown Comark would read differently; remark renders it as before.",
  },
  RTC0202: {
    kind: "unsafe",
    message:
      "Replaces the chain with `renderHtml(markdown, comarkOptions(…))`; install @comark/html and remark-to-comark afterwards.",
  },
};

/**
 * A Doctor Extension that reports what moving the project from remark to Comark involves, with the same diagnostics
 * as `remark-to-comark check`. Register it in `doctor.config.ts` next to comark-linter's and run `vite-doctor .`.
 */
export default function remarkToComark() {
  // Every Rule reads one check of the project; the first one to run makes it.
  const checkProject = (ctx: RuleContext) => {
    const key = `remark-to-comark:${ctx.project.root}`;
    let findings = ctx.cache.get<Promise<Finding[]>>(key);
    if (!findings) {
      const root = ctx.project.root;
      findings = check(root, {
        glob: (pattern) =>
          ctx.fs.glob(pattern, { exclude: IGNORE }).map((file) => relative(root, file)),
        read: (file) => ctx.fs.readText(`${root}/${file}`),
      });
      ctx.cache.set(key, findings);
    }
    return findings;
  };

  const doctorRules = rules.map((id) => {
    const own = codes.filter((code) => catalog[code].ruleId === id);
    const warns = own.some((code) => catalog[code].severity === "warn");
    const fixable: RuleMeta["fixable"] =
      own.map((code) => FIXES[code]?.kind).find(Boolean) ?? false;
    return createRule({
      meta: {
        id,
        title: TITLES.get(id) ?? id,
        category: "migration",
        severity: warns ? "warn" : "info",
        fixable,
        execution: "manifest",
        cacheScope: "none",
      },
      create(ctx) {
        return {
          async onProjectEnd() {
            for (const finding of await checkProject(ctx)) {
              const entry = catalog[finding.code];
              if (entry.ruleId !== id) continue;
              // SAFETY: check() gives each finding the params its code's why and fix read.
              const params = finding.params as never;
              const fix = FIXES[finding.code];
              ctx.report(
                diagnostics.diagnostics[finding.code]({
                  why: entry.why(params),
                  fix: entry.fix(params),
                  sources: [`${finding.file}:${finding.line}`],
                }),
                {
                  file: `${ctx.project.root}/${finding.file}`,
                  range: lineRange(
                    ctx.fs.readText(`${ctx.project.root}/${finding.file}`) ?? "",
                    finding.line,
                  ),
                  ...(fix &&
                    finding.edit && {
                      fix: {
                        kind: fix.kind,
                        message: fix.message,
                        edits: [
                          {
                            range: { start: finding.edit.start, end: finding.edit.end },
                            text: finding.edit.text,
                          },
                        ],
                      },
                    }),
                },
              );
            }
          },
        };
      },
    });
  });

  return defineDoctorExtension({
    name: "remark-to-comark",
    rulePacks: [
      defineRulePack({
        name: "remark-to-comark",
        version: "0.0.0",
        rules: doctorRules,
        diagnostics,
        presets: { recommended: rules },
      }),
    ],
  });
}

/** The offsets of a 1-based line, so editors and agents that read offsets land on the finding. */
function lineRange(source: string, line: number) {
  let start = 0;
  for (let current = 1; current < line && start !== -1; current++)
    start = source.indexOf("\n", start) + 1 || -1;
  if (start === -1) start = 0;
  const end = source.indexOf("\n", start);
  return { start, end: end === -1 ? source.length : end, line, column: 1 };
}
