// Iconify's VS Code icons, the set most readers know their files by. comark-file-tree draws its entries with them, and
// comark-tabs the tabs of a code group that are named after files.
export const FILE_ICONS: Record<string, string> = {
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
};

/** The icon of a file by its whole name, else by its extension, from `icons` keyed in lowercase. */
export function fileIcon(name: string, icons: Record<string, string>): string | undefined {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return icons[lower] ?? (dot >= 0 ? icons[lower.slice(dot)] : undefined);
}
