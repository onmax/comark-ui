import type { ElementNode, Node } from "comark";
import { defineComarkPlugin } from "comark";
import { textContent } from "comark/utils";
import type { IconData, Icons } from "comark-icon";
import { childrenOf, isElement } from "../../../shared/nodes.ts";

export type FileTreeOptions = {
  /**
   * Resolves file and folder icons, from `createIcons()` in comark-icon. Without it, files and folders get the same
   * plain glyph each and nothing is fetched. Pass the one the page's other plugins use, so they share its `collections`.
   */
  iconResolver?: Icons;
  /**
   * Icons by file name, such as `{ "nuxt.config.ts": "vscode-icons:file-type-nuxt" }`, or by extension, such as
   * `{ ".vue": "logos:vue" }`, on top of the built-in ones. `folder` and `file` set the fallbacks.
   */
  icons?: Record<string, string>;
};

export type FileTreeMeta = {
  /** One readable sentence per problem with a `::file-tree`. Empty when the document has none. Other plugins add theirs too. */
  issues: string[];
  /** The comark-linter rule of each issue, by its sentence, so the linter reports it under its own code. */
  issueRules: Record<string, string>;
};

type Issue = { rule: `comark/file-tree/${string}`; message: string };

/** How an entry changed: written as `+`, `-`, or `~` before its name. */
export type EntryState = "added" | "removed" | "changed";

/**
 * What each line of a tree becomes, as a `file-tree-item` node whose children are its entries. A `more` entry is a
 * `...` placeholder and has no name.
 */
export type FileTreeItemAttributes = {
  type?: "folder" | "file" | "more";
  name?: string;
  state?: EntryState;
  note?: string;
  icon?: IconData;
};

// Comments render nothing, so they aren't content a tree would drop.
const isContent = (node: Node) => (Array.isArray(node) ? node[0] !== null : node.trim() !== "");
const clip = (value: string) => {
  const words = value.trim().replace(/\s+/g, " ");
  return words.length > 40 ? `${words.slice(0, 39)}…` : words;
};

// Iconify's VS Code icons, the set most readers know their files by.
const ICONS = {
  folder: "vscode-icons:default-folder-opened",
  file: "vscode-icons:default-file",
  ".ts": "vscode-icons:file-type-typescript-official",
  ".mts": "vscode-icons:file-type-typescript-official",
  ".cts": "vscode-icons:file-type-typescript-official",
  ".tsx": "vscode-icons:file-type-reactts",
  ".js": "vscode-icons:file-type-js-official",
  ".mjs": "vscode-icons:file-type-js-official",
  ".cjs": "vscode-icons:file-type-js-official",
  ".jsx": "vscode-icons:file-type-reactjs",
  ".json": "vscode-icons:file-type-json",
  ".md": "vscode-icons:file-type-markdown",
  ".mdx": "vscode-icons:file-type-mdx",
  ".vue": "vscode-icons:file-type-vue",
  ".svelte": "vscode-icons:file-type-svelte",
  ".astro": "vscode-icons:file-type-astro",
  ".css": "vscode-icons:file-type-css",
  ".scss": "vscode-icons:file-type-scss",
  ".html": "vscode-icons:file-type-html",
  ".yaml": "vscode-icons:file-type-yaml",
  ".yml": "vscode-icons:file-type-yaml",
  ".toml": "vscode-icons:file-type-toml",
  ".py": "vscode-icons:file-type-python",
  ".rs": "vscode-icons:file-type-rust",
  ".go": "vscode-icons:file-type-go",
  ".sh": "vscode-icons:file-type-shell",
  ".svg": "vscode-icons:file-type-svg",
  ".png": "vscode-icons:file-type-image",
  ".jpg": "vscode-icons:file-type-image",
  ".jpeg": "vscode-icons:file-type-image",
  ".gif": "vscode-icons:file-type-image",
  ".webp": "vscode-icons:file-type-image",
  ".txt": "vscode-icons:file-type-text",
  ".env": "vscode-icons:file-type-dotenv",
  ".gitignore": "vscode-icons:file-type-git",
  "package.json": "vscode-icons:file-type-npm",
  "tsconfig.json": "vscode-icons:file-type-tsconfig",
  "pnpm-lock.yaml": "vscode-icons:file-type-pnpm",
  "pnpm-workspace.yaml": "vscode-icons:file-type-pnpm",
  dockerfile: "vscode-icons:file-type-docker",
  license: "vscode-icons:file-type-license",
} satisfies Record<string, string>;

const STATES = new Map<string, EntryState>([
  ["+", "added"],
  ["-", "removed"],
  ["~", "changed"],
]);
// What `tree` draws before a name: `│   ` and spaces for each level above, then `├── ` or `└── `, or the same in ASCII.
const BRANCHES = /^(?:[│|][\s ]{2,3}|[\s ])*(?:[├└|`+\\](?:──|--)[─-]*[\s ]?)?/u;
const NOTE = /\s+#\s+(.*)$/;
// The summary `tree` prints last.
const SUMMARY = /^\d+ director(?:y|ies)(?:, \d+ files?)?$/;

interface Line {
  column: number;
  item: ElementNode;
}

function entry(source: string): ElementNode | undefined {
  let rest = source;
  const note = NOTE.exec(rest);
  if (note) rest = rest.slice(0, note.index);
  rest = rest.trim();
  const marker = /^([+~-])\s+/.exec(rest);
  if (marker) rest = rest.slice(marker[0].length);
  if (!rest) return undefined;
  const attrs: Record<string, string> = {};
  if (rest === "..." || rest === "…") attrs.type = "more";
  else if (rest.endsWith("/")) {
    attrs.type = "folder";
    attrs.name = rest.replace(/\/+$/, "");
  } else {
    attrs.type = "file";
    attrs.name = rest;
  }
  const state = STATES.get(marker?.[1] ?? "");
  if (state) attrs.state = state;
  if (note?.[1]?.trim()) attrs.note = note[1].trim();
  return ["file-tree-item", attrs];
}

// Each line's column is where its name starts, so two-space indents, four, and `tree` output all nest alike: an entry
// belongs to the last one before it that starts further left.
function readTree(source: string): ElementNode[] {
  const roots: ElementNode[] = [];
  const open: Line[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const column = BRANCHES.exec(line)?.[0].length ?? 0;
    if (SUMMARY.test(line.slice(column))) continue;
    const item = entry(line.slice(column));
    if (!item) continue;
    while (open.length && (open.at(-1)?.column ?? 0) >= column) open.pop();
    const parent = open.at(-1)?.item;
    if (parent) {
      // An entry with entries under it is a folder, as `tree` prints folders without a slash.
      if (parent[1].type === "file") parent[1].type = "folder";
      parent.push(item);
    } else roots.push(item);
    if (item[1].type !== "more") open.push({ column, item });
  }
  // `tree` starts with `.` for the folder it ran in, which says nothing.
  const [only] = roots;
  if (roots.length === 1 && only?.[1].name === ".") return childrenOf(only).filter(isElement);
  return roots;
}

function iconKey(item: ElementNode, icons: Record<string, string>) {
  // SAFETY: `readTree` writes `name` as a string, or leaves it out of a placeholder.
  const name = ((item[1].name as string | undefined) ?? "").toLowerCase();
  if (item[1].type === "folder") return icons[`${name}/`] ?? icons.folder;
  const dot = name.lastIndexOf(".");
  return icons[name] ?? (dot >= 0 ? icons[name.slice(dot)] : undefined) ?? icons.file;
}

function* items(nodes: Node[]): Generator<ElementNode> {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node[0] === "file-tree-item") yield node;
    yield* items(childrenOf(node));
  }
}

const KINDS = new Map([
  ["p", "paragraph"],
  ["ul", "list"],
  ["ol", "list"],
  ["blockquote", "quote"],
  ["table", "table"],
]);

function describe(node: Node) {
  if (!Array.isArray(node)) return `the text "${clip(node)}"`;
  if (!isElement(node)) return "a comment";
  const kind = KINDS.get(node[0]) ?? `\`${node[0]}\``;
  const words = clip(textContent(node));
  return `the ${kind}${words ? ` "${words}"` : ""}`;
}

// The nodes that take the block's place: the tree, or what was written instead of one, so nothing is lost.
function fileTree(node: ElementNode, name: string, issues: Issue[]): Node[] {
  for (const key of Object.keys(node[1])) {
    const prop = key.replace(/^:/, "");
    if (prop !== "id" && prop !== "class")
      issues.push({
        rule: "comark/file-tree/unknown-prop",
        message: `${name}: \`${prop}\` isn't a prop of \`::file-tree\`, which takes none, so it's ignored. Remove it.`,
      });
  }
  const content = childrenOf(node).filter(isContent);
  const blocks = content.filter((child) => isElement(child) && child[0] === "pre");
  const [block] = blocks;
  if (!isElement(block)) {
    const list = content.find((child) => isElement(child) && /^[ou]l$/.test(child[0]));
    issues.push(
      list
        ? {
            rule: "comark/file-tree/list-instead-of-fence",
            message: `${name} holds a Markdown list, which turns names like \`__init__.py\` bold and drops \`[id].vue\`. Write the tree in a fenced block.`,
          }
        : {
            rule: "comark/file-tree/empty-tree",
            message: `${name} has no tree. Write the tree in a fenced block inside it, one entry per line.`,
          },
    );
    return content;
  }
  for (const child of content)
    if (child !== block)
      issues.push({
        rule: "comark/file-tree/content-dropped",
        message: `${name}: only one fenced block goes inside, so ${describe(child)} doesn't render. Move it out of the block.`,
      });
  const tree = readTree(textContent(block));
  if (!tree.length)
    issues.push({
      rule: "comark/file-tree/empty-tree",
      message: `${name}'s fenced block is empty. Write one entry per line.`,
    });
  node.splice(1, node.length - 1, {}, ...tree);
  return [node];
}

/**
 * Turns `::file-tree` around a fenced block, one entry per line indented by two spaces or pasted from `tree`, into a
 * tree of folders and files. A trailing `/` makes a folder, `+`, `-`, and `~` mark an entry added, removed, or
 * changed, `# note` ends a line with a note, and `...` stands for entries left out. Problems are added to `meta.issues`.
 */
export default defineComarkPlugin<FileTreeOptions, FileTreeMeta>((options = {}) => {
  // Names match without regard to case, as they do on most file systems readers browse.
  const icons = Object.fromEntries(
    Object.entries({ ...ICONS, ...options.icons }).map(([key, icon]) => [key.toLowerCase(), icon]),
  );
  return {
    name: "comark-file-tree",
    async post(state) {
      const { tree } = state;
      const issues: Issue[] = [];
      let count = 0;
      const transform = (nodes: Node[]): Node[] =>
        nodes.flatMap((node) => {
          if (!isElement(node)) return [node];
          if (node[0] === "file-tree") return fileTree(node, `\`::file-tree\` ${++count}`, issues);
          node.splice(2, node.length - 2, ...transform(childrenOf(node)));
          return [node];
        });
      tree.nodes = transform(tree.nodes);
      if (options.iconResolver) {
        const all = [...items(tree.nodes)].filter((item) => item[1].type !== "more");
        const keys = all.map((item) => iconKey(item, icons));
        const resolved = await options.iconResolver.resolve(
          keys.filter((key): key is string => Boolean(key)),
        );
        // An icon that doesn't load leaves its entry with the plain glyph: the document has nothing to fix.
        for (const [at, item] of all.entries()) {
          const icon = resolved.get(keys[at] ?? "");
          if (icon && "src" in icon) item[1].icon = icon;
        }
      }
      tree.meta.issues = [...(tree.meta.issues ?? []), ...issues.map((issue) => issue.message)];
      tree.meta.issueRules = {
        ...tree.meta.issueRules,
        ...Object.fromEntries(issues.map((issue) => [issue.message, issue.rule])),
      };
    },
  };
});
