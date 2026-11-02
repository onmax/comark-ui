# migrate-to-comark

[![npm version](https://comark-ui.onmax.me/badge.svg?source=npm-version&package=migrate-to-comark&icon=npm)](https://npmx.dev/package/migrate-to-comark)
[![license](https://comark-ui.onmax.me/badge.svg?label=license&value=MIT)](https://npmx.dev/package/migrate-to-comark)
[![docs](https://comark-ui.onmax.me/badge.svg?label=docs&value=comark-ui.onmax.me)](https://comark-ui.onmax.me/migrate-to-comark/)

A wizard that moves a project to [Comark](https://comark.dev). It reads every package.json, finds remark, markdown-it, or marked, runs the migrator for each, and asks before writing what they would write.

```sh
npx migrate-to-comark            # asks before writing
npx migrate-to-comark --dry-run  # reports only
npx migrate-to-comark --yes      # writes without asking
npx migrate-to-comark --json     # for agents
```

| Library | Migrator |
| --- | --- |
| remark, unified, react-markdown, MDX, Astro, Docusaurus | [remark-to-comark](https://comark-ui.onmax.me/remark-to-comark/) |
| markdown-it, VitePress, VuePress, Eleventy | [markdown-it-to-comark](https://comark-ui.onmax.me/markdown-it-to-comark/) |
| marked | [marked-to-comark](https://comark-ui.onmax.me/marked-to-comark/) |

A file two migrators both want goes to the library its nearest package.json declares; if that doesn't settle it, the wizard leaves the file alone. It also skips any file that changed after the check read it, and keeps the code that renders Markdown on its library until every Markdown file it renders is migrated. Each migrator's `check --verbose` lists what's left to do, with a fix for each finding.

See the [docs](https://comark-ui.onmax.me/migrate-to-comark/).
