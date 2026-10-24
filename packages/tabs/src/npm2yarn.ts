import npmToYarn from "npm-to-yarn";

// SAFETY: npm-to-yarn's ES module exports `convert` as its default, but its types sit in a CommonJS package, so
// TypeScript reads that default as the whole module.
const convert = npmToYarn as unknown as typeof npmToYarn.default;

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

export const defaultManagers: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

// npm-to-yarn matches `npm` anywhere in what it's given, so `cd my-npm-app` would break: it only sees commands that
// start a line or follow `&&`, `||`, or `;`.
const COMMAND = /^\s*np[mx] /;
const FAILED = "# couldn't auto-convert command";

// Keep shell separators inside quoted arguments with the argument they belong to. This is intentionally a small
// scanner rather than a shell parser: npm-to-yarn still owns command conversion, while we only identify boundaries.
function splitCommands(line: string) {
  const hasClosingBacktick = (from: number) => {
    for (let index = from + 1; index < line.length; index++) {
      if (line[index] === "\\") {
        index++;
      } else if (line[index] === "`") {
        return true;
      }
    }
    return false;
  };
  const parts: string[] = [];
  let start = 0;
  let quote: "'" | '"' | undefined;
  type Substitution =
    | { kind: "paren"; depth: number; restore: "'" | '"' | undefined }
    | { kind: "backtick"; restore: "'" | '"' | undefined };
  const substitutions: Substitution[] = [];

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const substitution = substitutions.at(-1);

    if (substitution?.kind === "backtick") {
      if (char === "\\") index++;
      else if (char === "`") {
        substitutions.pop();
        quote = substitution.restore;
      }
      continue;
    }

    if (substitution?.kind === "paren") {
      if (quote) {
        if (char === "\\" && quote === '"') index++;
        else if (char === quote) quote = undefined;
        continue;
      }
      if (char === "\\") {
        index++;
      } else if (char === "(") {
        substitution.depth++;
      } else if (char === ")") {
        if (--substitution.depth === 0) {
          const finished = substitutions.pop();
          quote = finished?.restore;
        }
      } else if (char === "`") {
        substitutions.push({ kind: "backtick", restore: quote });
        quote = undefined;
      } else if (char === "'" || char === '"') {
        quote = char;
      }
      continue;
    }

    if (char === "$" && line[index + 1] === "(" && quote !== "'") {
      substitutions.push({ kind: "paren", depth: 1, restore: quote });
      quote = undefined;
      index++;
      continue;
    }
    if (char === "`" && quote !== "'" && hasClosingBacktick(index)) {
      substitutions.push({ kind: "backtick", restore: quote });
      quote = undefined;
      continue;
    }
    if (quote) {
      if (char === "\\" && quote === '"') index++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "\\") {
      index++;
      continue;
    }
    const separator =
      line.startsWith("&&", index) || line.startsWith("||", index) ? 2 : char === ";" ? 1 : 0;
    if (!separator) continue;
    parts.push(line.slice(start, index), line.slice(index, index + separator));
    index += separator - 1;
    start = index + 1;
  }
  parts.push(line.slice(start));
  return parts;
}

// Bun's docs, Nuxt's, and Starlight's write `bunx` and `bun create astro`, where npm-to-yarn writes `bun x` and
// `bunx create-astro`. pnpm's form of a create command is already bun's, once it says bun.
function toBun(command: string) {
  if (/^\s*npm (?:init|create) [^-]/.test(command))
    return convert(command, "pnpm").replace(/^(\s*)pnpm/, "$1bun");
  return convert(command, "bun").replace(/^(\s*)bun x /, "$1bunx ");
}

/** Whether the source has a command a manager could write in its own words. */
export const hasCommand = (source: string) =>
  source.split("\n").some((line) => splitCommands(line).some((part) => COMMAND.test(part)));

/** The source in each manager's words, or the npm commands it has no form for. */
export function translate(source: string, manager: PackageManager) {
  if (manager === "npm") return { code: source, failed: [] };
  const failed: string[] = [];
  const lines = source.split("\n").map((line) =>
    splitCommands(line)
      .map((part) => {
        if (!COMMAND.test(part)) return part;
        const result = manager === "bun" ? toBun(part) : convert(part, manager);
        // npm-to-yarn trims what it converts, which would glue the command to the `&&` after it.
        if (!result.includes(FAILED)) return result.trimEnd() + part.slice(part.trimEnd().length);
        failed.push(part.trim());
        return part;
      })
      .join(""),
  );
  return { code: lines.join("\n"), failed };
}
