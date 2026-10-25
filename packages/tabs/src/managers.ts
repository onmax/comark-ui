export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

export const defaultManagers: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

type Flag = "dev" | "global" | "exact" | "peer" | "optional";

/** A command in no manager's words, which every manager writes in its own. */
type Command =
  | { action: "install" | "ci" }
  | { action: "init"; yes: boolean }
  | { action: "add" | "remove"; packages: string[]; flags: Set<Flag> }
  | { action: "update"; packages: string[] }
  | { action: "run" | "exec" | "create"; target: string; args: string[] };

type Action = "add" | "remove" | "ci" | "run" | "script" | "exec" | "create" | "init" | "update";

const BINS: Record<string, [PackageManager, string?]> = {
  npm: ["npm"],
  npx: ["npm", "exec"],
  pnpm: ["pnpm"],
  pnpx: ["pnpm", "dlx"],
  yarn: ["yarn"],
  bun: ["bun"],
  bunx: ["bun", "x"],
  deno: ["deno"],
};

const ACTIONS: Record<Exclude<PackageManager, "deno">, Record<string, Action>> = {
  npm: {
    install: "add",
    i: "add",
    add: "add",
    ci: "ci",
    "clean-install": "ci",
    uninstall: "remove",
    un: "remove",
    remove: "remove",
    rm: "remove",
    r: "remove",
    run: "run",
    "run-script": "run",
    test: "script",
    t: "script",
    start: "script",
    stop: "script",
    restart: "script",
    exec: "exec",
    x: "exec",
    create: "create",
    init: "init",
    update: "update",
    up: "update",
    upgrade: "update",
  },
  pnpm: {
    install: "add",
    i: "add",
    add: "add",
    remove: "remove",
    rm: "remove",
    uninstall: "remove",
    un: "remove",
    run: "run",
    test: "script",
    t: "script",
    start: "script",
    exec: "exec",
    dlx: "exec",
    create: "create",
    init: "init",
    update: "update",
    up: "update",
    upgrade: "update",
  },
  yarn: {
    install: "add",
    add: "add",
    remove: "remove",
    run: "run",
    test: "script",
    start: "script",
    dlx: "exec",
    create: "create",
    init: "init",
    up: "update",
    upgrade: "update",
  },
  bun: {
    install: "add",
    i: "add",
    add: "add",
    a: "add",
    remove: "remove",
    rm: "remove",
    run: "run",
    x: "exec",
    create: "create",
    c: "create",
    init: "init",
    update: "update",
  },
};

// pnpm, yarn, and bun run a script by its name alone, so any other word is a script unless it's one of their own
// commands. `bun test` is Bun's test runner, not the `test` script.
const BUILTINS = new Set(
  "audit bin build cache config dedupe exec help info link list login logout ls node outdated pack patch pm prune publish rebuild root store test unlink version view why whoami workspace workspaces".split(
    " ",
  ),
);

const FLAGS: Record<string, Flag | null> = {
  "-D": "dev",
  "--save-dev": "dev",
  "--dev": "dev",
  "-g": "global",
  "--global": "global",
  "-E": "exact",
  "--save-exact": "exact",
  "--exact": "exact",
  "--save-peer": "peer",
  "--peer": "peer",
  "-O": "optional",
  "--save-optional": "optional",
  "--optional": "optional",
  // A production dependency is what every manager adds by default.
  "-S": null,
  "--save": null,
  "--save-prod": null,
  "--prod": null,
};
const FROZEN = new Set(["--frozen-lockfile", "--immutable", "--frozen"]);

// `-P` is a peer dependency in yarn and a production one in npm and pnpm, and `-d` is bun's `-D`.
function flagOf(token: string, manager: PackageManager) {
  if (token === "-P") return manager === "yarn" ? "peer" : null;
  if (token === "-d" && manager === "bun") return "dev";
  return FLAGS[token];
}

function dependencies(
  action: "add" | "remove",
  rest: string[],
  manager: PackageManager,
): Command | undefined {
  const flags = new Set<Flag>();
  const packages: string[] = [];
  let frozen = false;
  for (const token of rest) {
    if (!token.startsWith("-")) packages.push(token);
    else if (FROZEN.has(token)) frozen = true;
    else {
      const flag = flagOf(token, manager);
      if (flag === undefined) return undefined;
      if (flag) flags.add(flag);
    }
  }
  if (action === "add" && !packages.length && !flags.size)
    return { action: frozen ? "ci" : "install" };
  if (frozen || !packages.length) return undefined;
  return { action, packages, flags };
}

// An argument list without the first `--`, which only npm needs before an option for the script.
const unfenced = (args: string[]) => {
  const at = args.indexOf("--");
  return at === -1 ? args : args.toSpliced(at, 1);
};
const fenced = (args: string[]) => {
  const at = args.findIndex((arg) => arg.startsWith("-"));
  return at === -1 ? args : args.toSpliced(at, 0, "--");
};
const isWord = (token: string | undefined): token is string =>
  token !== undefined && !token.startsWith("-");

function readDeno(sub: string, rest: string[]): Command | undefined {
  if (sub === "install" || sub === "i" || sub === "add" || sub === "remove" || sub === "rm") {
    const command = dependencies(sub === "remove" || sub === "rm" ? "remove" : "add", rest, "deno");
    if (command?.action !== "add" && command?.action !== "remove") return command;
    // A bare name is a JSR package to `deno add`, which no other manager installs.
    if (command.action === "add" && !command.packages.every((name) => name.startsWith("npm:")))
      return undefined;
    return { ...command, packages: command.packages.map((name) => name.replace(/^npm:/, "")) };
  }
  if (sub === "task") {
    const [script, ...args] = rest;
    return isWord(script) ? { action: "run", target: script, args: unfenced(args) } : undefined;
  }
  if (sub === "run") {
    // Skip the permission flags, such as `-A`, before the package.
    const at = rest.findIndex((token) => !token.startsWith("-"));
    const spec = rest[at];
    return spec?.startsWith("npm:")
      ? { action: "exec", target: spec.slice(4), args: rest.slice(at + 1) }
      : undefined;
  }
  if (sub === "init") {
    if (!rest.length) return { action: "init", yes: false };
    const [npm, target, ...args] = rest;
    return npm === "--npm" && isWord(target) ? { action: "create", target, args } : undefined;
  }
  if (sub === "outdated" && rest.includes("--update")) {
    const packages = rest.filter((token) => token !== "--update");
    return packages.every(isWord) ? { action: "update", packages } : undefined;
  }
  return undefined;
}

function read(manager: PackageManager, sub: string, rest: string[]): Command | undefined {
  if (manager === "deno") return readDeno(sub, rest);
  if (manager === "yarn" && sub === "global") {
    const [verb, ...packages] = rest;
    return verb === "add" || verb === "remove"
      ? dependencies(verb, ["-g", ...packages], manager)
      : undefined;
  }
  let action: Action | undefined = ACTIONS[manager][sub];
  if (!action && manager !== "npm" && isWord(sub) && sub && !BUILTINS.has(sub)) action = "script";
  switch (action) {
    case "add":
    case "remove":
      return dependencies(action, rest, manager);
    case "ci":
      return rest.length ? undefined : { action: "ci" };
    case "script":
      return { action: "run", target: sub, args: unfenced(rest) };
    case "run": {
      const [script, ...args] = rest;
      return isWord(script) ? { action: "run", target: script, args: unfenced(args) } : undefined;
    }
    case "exec": {
      let at = 0;
      while (rest[at] === "-y" || rest[at] === "--yes") at++;
      if (rest[at] === "--") at++;
      const [target, ...args] = rest.slice(at);
      return isWord(target) ? { action: "exec", target, args } : undefined;
    }
    case "create": {
      const [target, ...args] = rest;
      return isWord(target) ? { action: "create", target, args: unfenced(args) } : undefined;
    }
    case "init": {
      // `npm init vue` is `npm create vue`.
      if (isWord(rest[0])) return read(manager, "create", rest);
      return rest.every((token) => token === "-y" || token === "--yes")
        ? { action: "init", yes: rest.length > 0 }
        : undefined;
    }
    case "update":
      return rest.every(isWord) ? { action: "update", packages: rest } : undefined;
    default:
      return undefined;
  }
}

const ADD = {
  npm: "npm install",
  pnpm: "pnpm add",
  yarn: "yarn add",
  bun: "bun add",
  deno: "deno add",
};
const REMOVE = {
  npm: "npm uninstall",
  pnpm: "pnpm remove",
  yarn: "yarn remove",
  bun: "bun remove",
  deno: "deno remove",
};
const CI = {
  npm: "npm ci",
  pnpm: "pnpm install --frozen-lockfile",
  yarn: "yarn install --immutable",
  bun: "bun install --frozen-lockfile",
  deno: "deno install --frozen",
};
// Modern yarn has no global installs, and deno adds only to `deno.json`, without these sections.
const WORDS: Record<PackageManager, Partial<Record<Flag, string>>> = {
  npm: { dev: "-D", global: "-g", exact: "-E", peer: "--save-peer", optional: "-O" },
  pnpm: { dev: "-D", global: "-g", exact: "-E", peer: "--save-peer", optional: "-O" },
  yarn: { dev: "-D", exact: "-E", peer: "--peer", optional: "--optional" },
  bun: { dev: "-d", global: "-g", exact: "--exact", peer: "--peer", optional: "--optional" },
  deno: { dev: "-D" },
};
// A script named like one of yarn's commands needs `yarn run`.
const YARN_COMMANDS = new Set(
  "add bin cache config constraints create dedupe dlx exec explain global info init install link node npm pack patch plugin rebuild remove run set unlink unplug up upgrade version why workspace workspaces".split(
    " ",
  ),
);

function write(manager: PackageManager, command: Command): string | undefined {
  const words = (() => {
    switch (command.action) {
      case "install":
        return [manager, "install"];
      case "ci":
        return [CI[manager]];
      case "init":
        return [
          manager,
          "init",
          ...(command.yes && manager !== "pnpm" && manager !== "deno" ? ["-y"] : []),
        ];
      case "add":
      case "remove": {
        const flags = [...command.flags]
          .filter((flag) => command.action === "add" || flag === "global")
          .map((flag) => WORDS[manager][flag]);
        if (flags.includes(undefined)) return undefined;
        const packages =
          manager === "deno" ? command.packages.map((name) => `npm:${name}`) : command.packages;
        return [(command.action === "add" ? ADD : REMOVE)[manager], ...flags, ...packages];
      }
      case "update":
        if (manager === "yarn")
          return command.packages.length ? ["yarn up", ...command.packages] : undefined;
        return [
          manager === "deno" ? "deno outdated --update" : `${manager} update`,
          ...command.packages,
        ];
      case "run": {
        const { target, args } = command;
        if (manager === "npm") return ["npm run", target, ...fenced(args)];
        if (manager === "yarn")
          return [YARN_COMMANDS.has(target) ? "yarn run" : "yarn", target, ...args];
        return [manager === "deno" ? "deno task" : `${manager} run`, target, ...args];
      }
      case "exec": {
        const { target, args } = command;
        const bin = {
          npm: "npx",
          pnpm: "pnpm dlx",
          yarn: "yarn dlx",
          bun: "bunx",
          deno: "deno run -A",
        };
        return [bin[manager], manager === "deno" ? `npm:${target}` : target, ...args];
      }
      case "create": {
        // npm caches the starters it runs, so its docs ask for the latest one; the others always fetch it.
        const { target, args } = command;
        if (manager === "npm")
          return ["npm create", /.@/.test(target) ? target : `${target}@latest`, ...fenced(args)];
        const name = target.replace(/(.)@latest$/, "$1");
        return [manager === "deno" ? "deno init --npm" : `${manager} create`, name, ...args];
      }
    }
  })();
  return words?.join(" ");
}

type Quote = "'" | '"' | undefined;

// Splits `line` at every boundary outside quotes, `$(…)`, and backticks, and keeps the boundaries: [part, boundary,
// part, …]. This is intentionally a small scanner rather than a shell parser.
function split(line: string, boundary: (at: number) => number) {
  const hasClosingBacktick = (from: number) => {
    for (let index = from + 1; index < line.length; index++) {
      if (line[index] === "\\") index++;
      else if (line[index] === "`") return true;
    }
    return false;
  };
  const parts: string[] = [];
  let start = 0;
  let quote: Quote;
  type Substitution =
    | { kind: "paren"; depth: number; restore: Quote }
    | { kind: "backtick"; restore: Quote };
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
      if (char === "\\") index++;
      else if (char === "(") substitution.depth++;
      else if (char === ")") {
        if (--substitution.depth === 0) quote = substitutions.pop()?.restore;
      } else if (char === "`") {
        substitutions.push({ kind: "backtick", restore: quote });
        quote = undefined;
      } else if (char === "'" || char === '"') quote = char;
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
    const length = boundary(index);
    if (!length) continue;
    parts.push(line.slice(start, index), line.slice(index, index + length));
    index += length - 1;
    start = index + 1;
  }
  parts.push(line.slice(start));
  return parts;
}

const commandsOf = (line: string) =>
  split(line, (at) =>
    line.startsWith("&&", at) || line.startsWith("||", at) ? 2 : line[at] === ";" ? 1 : 0,
  );

// A command's words, or undefined when its first word is no package manager's.
function parse(part: string) {
  const body = part.trim();
  const tokens = split(body, (at) => /^\s+/.exec(body.slice(at))?.[0].length ?? 0).filter(
    (_, index) => index % 2 === 0,
  );
  const bin = BINS[tokens[0] ?? ""];
  if (!bin) return undefined;
  const [manager, implied] = bin;
  const [sub = manager === "yarn" ? "install" : "", ...rest] = implied
    ? [implied, ...tokens.slice(1)]
    : tokens.slice(1);
  return { manager, command: read(manager, sub, rest) };
}

/** The manager of the source's first command, or undefined when it has none. */
export function writtenIn(source: string) {
  for (const line of source.split("\n"))
    for (const part of commandsOf(line)) {
      const parsed = parse(part);
      if (parsed) return parsed.manager;
    }
  return undefined;
}

/** The source in a manager's words, and the commands it has no form for. */
export function translate(source: string, manager: PackageManager) {
  const failed: string[] = [];
  const lines = source.split("\n").map((line) =>
    commandsOf(line)
      .map((part) => {
        const parsed = parse(part);
        if (!parsed || parsed.manager === manager) return part;
        const result = parsed.command && write(manager, parsed.command);
        if (result === undefined) {
          failed.push(part.trim());
          return part;
        }
        // Keep the spaces around the command, so it doesn't glue to the `&&` after it.
        return (
          part.slice(0, part.length - part.trimStart().length) +
          result +
          part.slice(part.trimEnd().length)
        );
      })
      .join(""),
  );
  return { code: lines.join("\n"), failed };
}
