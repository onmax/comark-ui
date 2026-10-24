// The Doctor section: one page per comark-linter rule, each with Markdown the rule reports and the same Markdown fixed.
// The build renders them and test/doctor.test.ts checks them, both through `checkExample`.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { ElementNode, Node } from "comark";
import { parseMarkdown } from "comark";
import { textContent } from "comark/utils";
import { icons as lucide } from "@iconify-json/lucide";
import cards from "../packages/cards/src/index.ts";
import critic, { type CriticOptions } from "../packages/critic/src/index.ts";
import diagrams from "../packages/diagrams/src/index.ts";
import cast from "../packages/cast/src/index.ts";
import icon, { createIcons } from "../packages/icon/src/index.ts";
import include from "../packages/include/src/index.ts";
import { lint, type Diagnostic, type Rule } from "../packages/lint/src/index.ts";
import { catalog, type RuleInfo } from "../packages/lint/src/rules/index.ts";
import table from "../packages/table/src/index.ts";
import tabs from "../packages/tabs/src/index.ts";
import tests from "../packages/tests/src/index.ts";
import { browserPlugins, components } from "./plugins.ts";

const repo = new URL("../", import.meta.url);

/** Every rule, in the catalog's order, with its page's slug under the site and its group in the column. */
export const doctorRules = Object.entries(catalog as Record<string, RuleInfo>).map(([id, info]) => {
  // SAFETY: the catalog's keys are exactly the rules.
  const rule = id as Rule;
  const path = rule.replace(/^comark\//, "");
  const [group, name] = path.includes("/") ? path.split("/", 2) : ["core", path];
  return { rule, ...info, slug: `doctor/${path}`, group: group!, name: name! };
});

export const doctorRule = (slug: string) => doctorRules.find((entry) => entry.slug === slug);

// Icons come from lucide alone, so an example's icon problem doesn't depend on the network, and no diagram goes to
// Kroki. The include, cast, table, and tests examples read files from docs/doctor-include/, outside the pages so none
// is linted or built as one.
const icons = createIcons({ collections: { lucide }, fetch: false });
const files = fileURLToPath(new URL("docs/doctor-include/", repo));
const offline: Record<string, ReturnType<typeof browserPlugins>[number]> = {
  "comark-icon": icon(icons),
  "comark-tabs": tabs({ iconResolver: icons }),
  "comark-cards": cards({ iconResolver: icons }),
  "comark-diagrams": diagrams({ draw: false }),
  "comark-cast": cast({ root: files }),
  "comark-table": table({ root: files }),
  "comark-tests": tests({ root: files }),
};
const plugins = () => [
  ...browserPlugins({}, { download: false }).map((plugin) => offline[plugin.name] ?? plugin),
  include({ root: files }),
];
// comark-tabs turns `::code-group` into `::tabs`, comark-metrics `::stats` into a table, comark-include and comark-xref
// replace `:include` and `:ref`, and comark-details turns its items and collapsibles into `disclosure` while parsing,
// so no renderer has them.
const known = [
  ...Object.keys(components),
  "code-group",
  "tabs-item",
  "include",
  "ref",
  "stats",
  "accordion-item",
  "collapsible",
];

// Links to files are checked only in a document with a path, so broken-link's examples lint as a page in
// docs/doctor-include/, next to the files they link. The other examples have none, so their links aren't checked.
const fileOf: Partial<Record<Rule, string>> = {
  "comark/broken-link": fileURLToPath(new URL("docs/doctor-include/page.md", repo)),
};

export const lintExample = (
  source: string,
  rule?: Rule,
  criticMode?: "view" | "accept" | "reject" | "merge",
) => {
  const configured = plugins();
  if (criticMode) {
    const index = configured.findIndex((plugin) => plugin.name === "comark-critic");
    if (index >= 0) configured[index] = critic({ mode: criticMode as CriticOptions["mode"] });
  }
  return lint(source, { plugins: configured, components: known, file: rule && fileOf[rule] });
};

const isElement = (node: Node): node is ElementNode => Array.isArray(node) && node[0] !== null;

/** The Markdown of a rule page's `::incorrect` and `::correct` blocks, in order. */
export async function examplesOf(slug: string) {
  const { nodes } = await parseMarkdown(
    await readFile(new URL(`docs/pages/${slug}.md`, repo), "utf8"),
  );
  const found: { kind: "incorrect" | "correct"; source: string }[] = [];
  const walk = (list: Node[]) => {
    for (const node of list) {
      if (!isElement(node)) continue;
      const [tag, , ...children] = node;
      if (tag === "incorrect" || tag === "correct") {
        const pre = children.find((child) => isElement(child) && child[0] === "pre");
        found.push({ kind: tag, source: pre ? textContent(pre) : "" });
      } else walk(children);
    }
  };
  walk(nodes);
  return found;
}

/**
 * Lints one example and says what's wrong with it as an example: Markdown marked incorrect must report `rule` and
 * nothing else, and Markdown marked correct must report nothing.
 */
export async function checkExample(
  rule: Rule,
  kind: "incorrect" | "correct",
  source: string,
): Promise<{ found: Diagnostic[]; problem?: string }> {
  const found = await lintExample(
    source,
    rule,
    rule === "comark/critic/invalid-mode" && kind === "incorrect" ? "merge" : undefined,
  );
  const other = found.filter((diagnostic) => diagnostic.rule !== rule);
  const list = (diagnostics: Diagnostic[]) =>
    diagnostics.map((d) => `\n  ${d.rule}: ${d.message} ${d.fix}`).join("");
  if (!source.trim()) return { found, problem: `its ::${kind} block needs a fenced code block.` };
  if (kind === "correct")
    return found.length
      ? { found, problem: `its ::correct example still reports:${list(found)}` }
      : { found };
  if (found.length === other.length)
    return { found, problem: `its ::incorrect example doesn't report ${rule}.${list(found)}` };
  if (other.length)
    return {
      found,
      problem: `its ::incorrect example reports other rules too; keep it to ${rule}:${list(other)}`,
    };
  return { found };
}
