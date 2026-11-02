---
title: Vite Doctor
description: Report the migration's findings as part of a Vite Doctor run.
install: pnpm add -D markdown-it-to-comark vite-doctor
---

Add the migration's findings to a [Vite Doctor](https://github.com/onmax/vite-doctor) run, so they show up in the same report as comark-linter.

## Setup

```ts
// doctor.config.ts
import { defineDoctorConfig } from "vite-doctor/config";
import markdownItToComark from "markdown-it-to-comark/doctor";

export default defineDoctorConfig({
  extends: ["markdown-it-to-comark/recommended"],
  extensions: [markdownItToComark()],
});
```

Each rule covers one kind of finding and reports the same text as `markdown-it-to-comark check`, with a link to [Diagnostics](/markdown-it-to-comark/diagnostics/). `vite-doctor . --format agent` adds the fix and the command to rerun.

## Fixes

- `vite-doctor . --fix` escapes the Markdown in each `MIC0302` file, like `markdown-it-to-comark content --write`.
- `vite-doctor . --unsafe-fix` also rewrites each `MIC0202` setup, like `markdown-it-to-comark rewrite --write`. Install @comark/html and markdown-it-to-comark afterwards, since the new code imports them.

Every other finding is report-only.
