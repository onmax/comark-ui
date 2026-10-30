import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "packages:build": {
        command: 'pnpm -r --filter "./packages/*" run build',
        cache: {
          input: [
            "packages/*/src/**",
            "packages/*/package.json",
            "packages/*/tsdown.config.ts",
            "packages/*/README.md",
            "packages/*/LICENSE",
            "skills/**",
            "tsdown.shared.ts",
            "tsconfig.json",
            "package.json",
            "pnpm-lock.yaml",
            "pnpm-workspace.yaml",
            ".node-version",
            "vite.config.ts",
          ],
          output: ["packages/*/dist/**"],
          env: ["NODE_ENV"],
        },
      },
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  // oxfmt reads Comark blocks as plain Markdown and breaks them.
  fmt: { ignorePatterns: ["**/dist/**", "**/*.md"] },
  lint: {
    ignorePatterns: ["**/dist/**"],
    options: { typeAware: true, typeCheck: false },
  },
});
