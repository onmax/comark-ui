import { defineDiagnostics } from "nostics";
import { uiDocs } from "./map.ts";

const SKILL =
  "Agents: the comark-ui skill (`npx skills add onmax/comark-ui`) covers Comark's blocks and plugins.";
const DOCS = "https://comark-ui.onmax.me/marked-to-comark/diagnostics";

interface Where {
  /** `file:line`, for the sentence. */
  at: string;
}
interface Plugin extends Where {
  plugin: string;
}

/**
 * Every finding the migration reports, as nostics codes: one sentence on what was found, one on what to do, and a
 * docs link. The CLI prints them and the Vite Doctor extension reports them, so agents get the same text either way.
 */
export const catalog = {
  MKC0101: {
    ruleId: "marked-to-comark/unresolved",
    severity: "warn",
    why: (p: Where & { reason: string }) =>
      `The marked setup at ${p.at} can't be read: ${p.reason}`,
    fix: () =>
      `Write its options and extensions as literals in the \`marked.use()\`, \`setOptions()\`, or \`new Marked()\` call, then run the check again. ${SKILL}`,
  },
  MKC0102: {
    ruleId: "marked-to-comark/extension",
    severity: "info",
    why: (p: Plugin & { ui: string }) =>
      `${p.plugin} (${p.at}) has a comark-ui counterpart: ${p.ui} (${uiDocs(p.ui)}).`,
    fix: (p: Plugin & { ui: string; comark?: string; port?: string }) =>
      `Install ${p.ui} and register it as its docs say; its markup differs from ${p.plugin}'s, so check pages that style it.${
        p.port
          ? ` For output identical to ${p.plugin}, use ${p.port} from marked-to-comark/plugins instead, tested against it; the rewrite does.`
          : p.comark
            ? ` Comark's own ${p.comark} also does the job.`
            : ""
      } ${SKILL}`,
  },
  MKC0103: {
    ruleId: "marked-to-comark/extension",
    severity: "info",
    why: (p: Plugin & { how: string }) => `${p.plugin} (${p.at}) is covered: ${p.how}`,
    fix: () => "Nothing to do; the rewrite carries it over.",
  },
  MKC0104: {
    ruleId: "marked-to-comark/extension",
    severity: "info",
    why: (p: Plugin & { port: string }) =>
      `${p.plugin} (${p.at}) becomes ${p.port} from marked-to-comark/plugins, tested against the original extension.`,
    fix: (p: Plugin & { port: string }) =>
      `Register \`${p.port}\` where ${p.plugin} was; options carry over.`,
  },
  MKC0105: {
    ruleId: "marked-to-comark/custom-code",
    severity: "warn",
    why: (p: Plugin & { note: string }) =>
      `${p.plugin} (${p.at}) is the project's own code for marked, so nothing replaces it. ${p.note}`,
    fix: () =>
      `Port it to a Comark plugin (a \`post\` hook over \`state.tree\`) or a component, then compare its HTML with marked's on a few of the project's own documents. ${SKILL}`,
  },
  MKC0106: {
    ruleId: "marked-to-comark/unsupported",
    severity: "warn",
    why: (p: Plugin & { note: string }) =>
      `${p.plugin} (${p.at}) has no Comark counterpart: ${p.note}`,
    fix: () =>
      "Keep what it does outside the parser, as the note says, or port it and compare its HTML with marked's on the project's documents.",
  },
  MKC0201: {
    ruleId: "marked-to-comark/call",
    severity: "warn",
    why: (p: Where & { reason: string }) =>
      `The marked call at ${p.at} can't be rewritten without changing what it does: it ${p.reason}.`,
    fix: (p: Where & { reason: string }) =>
      /own code|counterpart/.test(p.reason)
        ? "Port or drop that code first (its MKC0105 and MKC0106 findings say how), then run `marked-to-comark rewrite` again."
        : /isn't async|top of the module/.test(p.reason)
          ? "Comark renders asynchronously. Make the function async and await its callers, or keep marked here; then run `marked-to-comark rewrite` again."
          : /shared `marked`/.test(p.reason)
            ? "Move every call on the shared `marked` to an instance (`const md = new Marked(…)`) in one file, or rewrite them together by hand with `renderHtml(markdown, comarkOptions(…))`."
            : "Change the call by hand to `await renderHtml(markdown, comarkOptions(…))`, or keep marked for it.",
  },
  MKC0202: {
    ruleId: "marked-to-comark/rewritable-call",
    severity: "info",
    why: (p: Where) =>
      `The marked call at ${p.at} can become \`await renderHtml(markdown, comarkOptions(…))\`.`,
    fix: () =>
      "Run `marked-to-comark rewrite <dir> --write`, then install comark, @comark/html, and the imports it adds.",
  },
  MKC0302: {
    ruleId: "marked-to-comark/content",
    severity: "warn",
    why: (p: Where & { count: number; lines: string }) =>
      `${p.at} has ${p.count} ${p.count === 1 ? "spot" : "spots"} Comark would read differently from marked, on lines ${p.lines}.`,
    fix: (p: Where & { missing?: string }) =>
      p.missing
        ? `Install the project's dependencies first: ${p.missing} couldn't be loaded, and without it the rewrite would escape the syntax it adds. Then run \`marked-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`.`
        : `Run \`marked-to-comark content "${p.at.replace(/:\d+$/, "")}" --write\`; marked renders the rewritten file exactly as before.`,
  },
  MKC0303: {
    ruleId: "marked-to-comark/content",
    severity: "warn",
    why: (p: Where & { count?: number; lines?: string; reason?: string }) =>
      p.reason
        ? `${p.at} was left as written. ${p.reason}`
        : `${p.at} has ${p.count} ${p.count === 1 ? "block" : "blocks"} the rewrite left as written, on lines ${p.lines}, because no edit kept marked's output the same. Comark may read ${p.count === 1 ? "it" : "them"} differently.`,
    fix: (p: Where & { reason?: string }) =>
      p.reason
        ? "Migrate this document by hand with the settings of the marked setup that renders it."
        : "Look at each line and escape what Comark reads as syntax (`\\{`, `\\[`, `\\:`) by hand where marked keeps it as text, then run the check again.",
  },
  MKC0304: {
    ruleId: "marked-to-comark/content",
    severity: "info",
    why: (p: Where & { count: number }) =>
      `${p.count} Markdown ${p.count === 1 ? "file isn't" : "files aren't"} in a folder the project's marked code reads (${p.at}), so the check didn't migrate ${p.count === 1 ? "it" : "them"}; marked often renders strings from elsewhere, such as chat replies or CMS fields.`,
    fix: () =>
      'If marked renders any of these files, run `marked-to-comark content "<glob>" --write` on them. Strings rendered at runtime need nothing: Comark reads them with `comarkOptions()`.',
  },
} as const;

export type Code = keyof typeof catalog;

export const diagnostics = defineDiagnostics({
  docsBase: (code) => `${DOCS}#${String(code).toLowerCase()}`,
  codes: catalog,
});
