// Reads what `git log --parents` printed into commits and branches. A transcript starts each command with `$ git …`;
// text before the first one is read as `git log` output, and so is every `$ git log` after it. The other commands'
// output isn't read: a `#commit-<sha>` slot says what happened to a commit.

export interface Commit {
  sha: string;
  hashes: string[];
  /** The PR number from a subject that ends in `(#123)` or a `Merge pull request #123` message. */
  ref: string;
  text: string;
  lane: number;
  /** The row of its second parent, for a merge. */
  mergeFrom: number | undefined;
  tags: string[];
  /** How many older commits this row stands for, when `max-count` folded them. */
  elided: number;
}

export interface Lane {
  name: string;
  /** A PR number taken from the merge message of a branch that no longer has a tip. */
  ref: string;
  /** The branch was merged and deleted: no `--decorate` label names it, its merge does. */
  deleted: boolean;
  /** The row it branched off, on another lane. */
  from: number | undefined;
}

export interface Graph {
  /** Oldest first. */
  commits: Commit[];
  lanes: Lane[];
  problems: Problem[];
}

export type Problem =
  | { kind: "no-commits" }
  | { kind: "no-parents" }
  | { kind: "unread-commands"; commands: string[] };

interface Section {
  argv: string[];
  lines: string[];
}

interface Logged {
  sha: string;
  parents: string[];
  refs: string[];
  subject: string;
}

const GRAPH = String.raw`[\s*|\\/_.-]*?`;
// `* 69a6efb a002d09 (release/2.4) Stop polling` from `--oneline`, with parents and labels when they were asked for.
const ONELINE = new RegExp(
  `^${GRAPH}([0-9a-f]{7,40})((?: [0-9a-f]{7,40})*)(?: \\(([^)]*)\\))?(?: (.*))?$`,
);
// `commit 69a6efb… a002d09… (release/2.4)` from the long format, whose subject follows on an indented line.
const LONG = new RegExp(
  `^${GRAPH}commit ([0-9a-f]{7,40})((?: [0-9a-f]{7,40})*)(?: \\(([^)]*)\\))?\\s*$`,
);

function sections(source: string): Section[] {
  const out: Section[] = [{ argv: ["log"], lines: [] }];
  for (const line of source.split("\n")) {
    const command = /^\s*\$ git\s+(.*)$/.exec(line);
    if (command) out.push({ argv: command[1].trim().split(/\s+/), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
}

function readLog(lines: string[]): Logged[] {
  const out: Logged[] = [];
  let pending: Logged | undefined;
  const split = (refs: string | undefined) =>
    (refs ?? "")
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean);
  const parents = (list: string) => list.trim().split(/\s+/).filter(Boolean);
  for (const line of lines) {
    const long = LONG.exec(line);
    if (long) {
      pending = {
        sha: long[1],
        parents: parents(long[2]),
        refs: split(long[3]),
        subject: "",
      };
      out.push(pending);
      continue;
    }
    if (pending) {
      // The long format's subject is its first indented line after the headers.
      const subject = /^[\s*|\\/_.-]*?\s{4}(\S.*)$/.exec(line);
      if (
        !pending.subject &&
        subject &&
        !/^(Author|Date|Merge|Commit|AuthorDate|CommitDate):/.test(subject[1].trim())
      )
        pending.subject = subject[1].trim();
      continue;
    }
    const one = ONELINE.exec(line);
    if (one)
      out.push({
        sha: one[1],
        parents: parents(one[2]),
        refs: split(one[3]),
        subject: one[4] ?? "",
      });
  }
  return out;
}

const PR = /\s*\(#(\d+)\)$/;
const MERGE_PR = /^Merge pull request #(\d+) from [^/\s]+\/(\S+)/;
const MERGE_BRANCH = /^Merge (?:remote-tracking )?branch '([^']+)'/;

/** Each proper prefix maps to its sole longest spelling, or null if several hashes share it. */
function expansions(logged: Logged[]): Map<string, string | null> {
  const hashes = new Set(logged.flatMap(({ sha, parents }) => [sha, ...parents]));
  const prefixes = new Map<string, string | null>();
  for (const hash of [...hashes].sort((a, b) => b.length - a.length)) {
    if (prefixes.has(hash)) continue;
    for (let length = 7; length < hash.length; length++) {
      const prefix = hash.slice(0, length);
      prefixes.set(prefix, prefixes.has(prefix) ? null : hash);
    }
  }
  return prefixes;
}

/** Reads a pasted transcript of git commands and their output. */
export function readGraph(source: string): Graph {
  const problems: Problem[] = [];
  const all = sections(source);
  const unread = [
    ...new Set(
      all
        .slice(1)
        .filter((section) => section.argv[0] !== "log")
        .map((section) => `git ${section.argv[0]}`),
    ),
  ];
  if (unread.length) problems.push({ kind: "unread-commands", commands: unread });
  const logged = all
    .filter((section) => section.argv[0] === "log")
    .flatMap((section) => readLog(section.lines));
  const prefixes = expansions(logged);
  const bySha = new Map<string, Logged & { hashes: string[] }>();
  for (const entry of logged) {
    const sha = prefixes.get(entry.sha) ?? entry.sha;
    const existing = bySha.get(sha);
    if (!existing) bySha.set(sha, { ...entry, sha, hashes: [entry.sha] });
    else {
      if (!existing.hashes.includes(entry.sha)) existing.hashes.push(entry.sha);
      existing.refs = [...new Set([...existing.refs, ...entry.refs])];
      if (!existing.parents.length) existing.parents = entry.parents;
      if (!existing.subject) existing.subject = entry.subject;
    }
  }
  const unique = [...bySha.values()];
  if (!unique.length)
    return { commits: [], lanes: [], problems: [{ kind: "no-commits" }, ...problems] };

  const order = [...unique].reverse();
  const index = new Map(order.map((entry, i) => [entry.sha, i]));
  const noParents = order.length > 1 && order.every((entry) => !entry.parents.length);
  if (noParents) problems.unshift({ kind: "no-parents" });
  const tips = new Map<string, string>();
  const tags = new Map<string, string[]>();
  for (const entry of unique)
    for (const raw of entry.refs) {
      if (raw.startsWith("tag: ")) {
        tags.set(entry.sha, [...(tags.get(entry.sha) ?? []), raw.slice(5)]);
        continue;
      }
      const ref = raw.replace(/^HEAD -> /, "");
      if (ref === "HEAD" || ref.endsWith("/HEAD")) continue;
      const local = ref.replace(/^[^/]+\/(?=.)/, (remote) =>
        /^(origin|upstream)\/$/.test(remote) ? "" : remote,
      );
      // A local branch wins over its remote-tracking one.
      if (!tips.has(local) || local === ref) tips.set(local, entry.sha);
    }

  const commits: Commit[] = order.map((entry) => {
    const pr = PR.exec(entry.subject);
    return {
      sha: entry.sha,
      hashes: entry.hashes,
      ref: pr?.[1] ?? "",
      text: pr ? entry.subject.slice(0, pr.index) : entry.subject,
      lane: -1,
      mergeFrom: undefined,
      tags: tags.get(entry.sha) ?? [],
      elided: 0,
    };
  });
  const parentsOf = (i: number) => {
    // Without parents the best guess is the order git printed: each commit on top of the one below it.
    if (noParents) return i ? [i - 1] : [];
    return order[i].parents
      .map((parent) => {
        const expanded = prefixes.get(parent);
        return expanded === null ? undefined : index.get(expanded ?? parent);
      })
      .filter((row): row is number => row !== undefined && row !== i);
  };

  // The trunk walks first-parent from its tip. Each other branch walks first-parent until it reaches a commit a lane
  // owns, shortest walk first, so a stack of branches splits into one lane per branch.
  const lanes: Lane[] = [];
  const walk = (start: number) => {
    const rows = new Set<number>();
    let row: number | undefined = start;
    while (row !== undefined && commits[row].lane < 0 && !rows.has(row)) {
      rows.add(row);
      row = parentsOf(row)[0];
    }
    return { rows, stop: row !== undefined && !rows.has(row) ? row : undefined };
  };
  const claim = (name: string, start: number, extra: Partial<Lane> = {}) => {
    const { rows, stop } = walk(start);
    if (!rows.size) return;
    for (const row of rows) commits[row].lane = lanes.length;
    lanes.push({ name, ref: "", deleted: false, from: stop, ...extra });
  };
  const names = [...tips.keys()].filter((name) => index.has(tips.get(name) ?? ""));
  const trunk = names.find((name) => ["main", "master", "trunk"].includes(name)) ?? names[0];
  claim(
    trunk ?? "main",
    trunk ? (index.get(tips.get(trunk) ?? "") ?? order.length - 1) : order.length - 1,
  );
  const rest = names.filter((name) => name !== trunk);
  while (rest.length) {
    rest.sort(
      (a, b) =>
        walk(index.get(tips.get(a) ?? "") ?? 0).rows.size -
        walk(index.get(tips.get(b) ?? "") ?? 0).rows.size,
    );
    const name = rest.shift() ?? "";
    claim(name, index.get(tips.get(name) ?? "") ?? 0);
  }
  // A merged branch with no label left gets its name from the merge's message.
  commits.forEach((commit, i) => {
    for (const parent of parentsOf(i).slice(1)) {
      if (commits[parent].lane >= 0) continue;
      const message = `${commit.text}${commit.ref ? ` (#${commit.ref})` : ""}`;
      const pr = MERGE_PR.exec(message);
      const branch = MERGE_BRANCH.exec(message);
      claim(pr?.[2] ?? branch?.[1] ?? "merged branch", parent, {
        deleted: true,
        ref: pr?.[1] ?? "",
      });
    }
  });
  for (let i = commits.length - 1; i >= 0; i--)
    if (commits[i].lane < 0) claim(commits[i].sha.slice(0, 7), i, { deleted: true });
  commits.forEach((commit, i) => {
    const second = parentsOf(i)[1];
    if (second !== undefined && commits[second].lane !== commit.lane) commit.mergeFrom = second;
    const pr = MERGE_PR.exec(commit.text);
    if (pr && second !== undefined) {
      commit.ref = pr[1];
      commit.text = `Merge ${lanes[commits[second].lane].name}`;
    }
  });

  return { commits, lanes, problems };
}

/** `max-count`, as in `git log -n`: keeps the newest `count` commits and folds the rest into one row. */
export function limit(graph: Graph, count: number): Graph {
  const cut = graph.commits.length - count;
  if (cut <= 0) return graph;
  const shift = (row: number | undefined) =>
    row === undefined || row < cut ? undefined : row - cut + 1;
  const elided: Commit = {
    sha: "",
    hashes: [],
    ref: "",
    text: "",
    lane: 0,
    mergeFrom: undefined,
    tags: [],
    elided: cut,
  };
  return {
    ...graph,
    commits: [
      elided,
      ...graph.commits
        .slice(cut)
        .map((commit) => ({ ...commit, mergeFrom: shift(commit.mergeFrom) })),
    ],
    lanes: graph.lanes.map((lane) => ({
      ...lane,
      from: lane.from === undefined ? undefined : Math.max(0, lane.from - cut + 1),
    })),
  };
}
