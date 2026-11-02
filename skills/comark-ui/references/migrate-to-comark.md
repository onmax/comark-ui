# Moving a project to Comark

migrate-to-comark finds the Markdown libraries a project uses and moves it with each library's migrator: remark-to-comark, markdown-it-to-comark, and marked-to-comark. Start here when you don't know which library the project uses, or it uses more than one.

## Run it

```sh
npx migrate-to-comark --json             # what it found and would change; writes nothing
npx migrate-to-comark --yes              # write every change
npx migrate-to-comark --yes --only marked   # one library at a time
```

- It reads every package.json for remark, markdown-it, and marked, and the frameworks built on them: Astro, Docusaurus, and react-markdown for remark; VitePress, VuePress, and Eleventy for markdown-it; svelte-markdown and ngx-markdown for marked.
- It writes only what each migrator's `rewrite --write` and `content --write` would. A file two migrators want goes to the library its nearest package.json declares. When that doesn't settle it, `conflicts` in the JSON names the file and both migrators, and the file stays as it is.
- In an agent's shell it can't ask, so without `--yes` it reports and writes nothing.

## What it leaves to you

Everything each migrator reports. Run each one's check at the end, and follow its reference for the fixes:

```sh
npx remark-to-comark check . --json
npx markdown-it-to-comark check . --json
npx marked-to-comark check . --json
```

See the [remark-to-comark](remark-to-comark.md), [markdown-it-to-comark](markdown-it-to-comark.md), and [marked-to-comark](marked-to-comark.md) references.

## Register

- In `comark-ui`: not included. Run it with `npx`, or install it beside the preset for the migration.
- Alone: `pnpm add -D migrate-to-comark`. It installs the command `migrate-to-comark`, the library `migrate-to-comark` (`detect`, `plan`, `apply`), and the three migrators.
