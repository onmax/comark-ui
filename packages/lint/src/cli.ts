#!/usr/bin/env node
import { existsSync } from "node:fs";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { lintFiles, resolveConfig, type Config, type Diagnostic } from "./index.ts";
import { errorText } from "../../../shared/text.ts";

const USAGE = `Usage: comark-lint <file or glob>... [--format text|json] [--config comark-lint.config.ts] [--check-urls]

Checks Comark documents with every comark-ui package installed. Exits with 1 if there are problems.
Without --config, it loads comark-lint.config.ts (or .mts, .mjs, .js, or a lint-comark.config file)
from the working directory when there is one.
--check-urls also requests every external URL and reports dead ones.
The command is also installed as lint-comark.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: "string", default: "text" },
    config: { type: "string", short: "c" },
    "check-urls": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !positionals.length || (values.format !== "text" && values.format !== "json")) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}

let failed = false;
const fail = (message: string) => {
  console.error(`comark-lint: ${message}`);
  failed = true;
};

const configFile =
  values.config ??
  ["comark-lint", "lint-comark"]
    .flatMap((name) => ["ts", "mts", "mjs", "js"].map((extension) => `${name}.config.${extension}`))
    .find((file) => existsSync(file));
let config: Config = {};
if (configFile) {
  try {
    // SAFETY: a config module's default export is the object defineConfig returns.
    const module = (await import(pathToFileURL(resolve(configFile)).href)) as {
      default?: Config;
    };
    config = module.default ?? {};
  } catch (error) {
    fail(`can't load ${configFile}: ${errorText(error)}`);
    process.exit(2);
  }
}
const options = await resolveConfig(config);
if (values["check-urls"]) options.links = { ...options.links, urls: options.links?.urls || true };

const files: string[] = [];
for (const input of positionals) {
  if (!/[*?[\]{}]/.test(input)) {
    files.push(input);
    continue;
  }
  const matches: string[] = [];
  for await (const match of glob(input, {
    exclude: (path) => /(?:^|[/\\])(?:node_modules|dist)$/.test(path),
  }))
    matches.push(match);
  if (!matches.length) fail(`${input} matches no files`);
  files.push(...matches.sort());
}

const results: (Omit<Diagnostic, "cause"> & { file: string })[] = [];
for (const { file, text, diagnostics } of await lintFiles([...new Set(files)], options)) {
  if (text === undefined) fail(`can't read ${file}`);
  // Exceptions can contain cycles; the CLI keeps its results serializable.
  for (const { rule, severity, line, column, message, fix } of diagnostics)
    results.push({ file, rule, severity, line, column, message, fix });
}

if (values.format === "json") console.log(JSON.stringify(results, null, 2));
else {
  for (const { file, line, column, rule, message, fix } of results)
    console.log(`${file}:${line}:${column ?? 1} ${rule} ${message} ${fix}`);
  if (!results.length && !failed) console.log("No problems.");
}
process.exit(failed ? 2 : results.length ? 1 : 0);
