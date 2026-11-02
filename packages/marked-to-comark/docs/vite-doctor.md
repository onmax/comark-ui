---
title: Vite Doctor
description: Report the migration's findings as part of a Vite Doctor run.
install: pnpm add -D marked-to-comark vite-doctor
---

Add the migration's findings to a [Vite Doctor](https://github.com/onmax/vite-doctor) run, so they show up in the same report as comark-linter.

## Setup

```ts
// doctor.config.ts
import { defineDoctorConfig } from "vite-doctor/config";
import markedToComark from "marked-to-comark/doctor";

export default defineDoctorConfig({
  extends: ["marked-to-comark/recommended"],
  extensions: [markedToComark()],
});
```

Each rule covers one kind of finding and reports the same text as `marked-to-comark check`, with a link to [Diagnostics](/marked-to-comark/diagnostics/). `vite-doctor . --format agent` adds the fix and the command to rerun.

## Fixes

- `vite-doctor . --fix` escapes the Markdown in each `MKC0302` file, like `marked-to-comark content --write`.
- `vite-doctor . --unsafe-fix` also rewrites each `MKC0202` call, like `marked-to-comark rewrite --write`. Install comark, @comark/html, and marked-to-comark afterwards, since the new code imports them.

Every other finding is report-only.
