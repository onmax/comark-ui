---
title: Vite Doctor
description: Report the migration's findings as part of a Vite Doctor run.
install: pnpm add -D remark-to-comark vite-doctor
---

Add the migration's findings to a [Vite Doctor](https://github.com/onmax/vite-doctor) run, so they show up in the same report as comark-linter.

## Setup

```ts
// doctor.config.ts
import { defineDoctorConfig } from "vite-doctor/config";
import remarkToComark from "remark-to-comark/doctor";

export default defineDoctorConfig({
  extends: ["remark-to-comark/recommended"],
  extensions: [remarkToComark()],
});
```

Each rule covers one kind of finding and reports the same text as `remark-to-comark check`, with a link to [Diagnostics](/remark-to-comark/diagnostics/). `vite-doctor . --format agent` adds the fix and the command to rerun.

## Fixes

- `vite-doctor . --fix` escapes the Markdown in each `RTC0302` file, like `remark-to-comark content --write`.
- `vite-doctor . --unsafe-fix` also rewrites each `RTC0202` chain, like `remark-to-comark rewrite --write`. Install @comark/html and remark-to-comark afterwards, since the new code imports them.

Every other finding is report-only.
