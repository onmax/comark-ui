---
title: Vite Doctor
description: Report the migration's findings as part of a Vite Doctor run.
install: pnpm add -D remark-to-comark vite-doctor
---

Add remark-to-comark's findings to a [Vite Doctor](https://github.com/onmax/vite-doctor) run, so an agent that already runs `vite-doctor`, for comark-linter or anything else, sees the migration work in the same report.

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

Each rule groups the codes of one kind, from `remark-to-comark/framework` to `remark-to-comark/content`, and reports the same text as `remark-to-comark check`, with the file, the line, and a link to the code's section in [Diagnostics](/remark-to-comark/diagnostics/). `vite-doctor . --format agent` adds the remediation and the command to rerun.
