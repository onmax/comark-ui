---
title: Doctor
description: Every problem comark-linter reports, with its code, what it means, and how to fix it.
tagline: Every problem comark-linter and Vite Doctor report in a Comark document, one page each. A report's code links here, and each page shows Markdown that triggers it and the same Markdown fixed.
---

[comark-linter](/lint/) reports each problem under a rule, and [Vite Doctor](/lint/vite-doctor/) reports it under that rule's code.

The core rules catch what Comark forgives: blocks never closed, misspelled components, broken anchors, and unsafe URLs. Each package adds one rule for each kind of problem its plugin puts in `meta.issues`. That way you can tell them apart in a report and look each one up here.

```txt
docs/review.md:8:1 comark/annotate/box-outside-image screenshot "after.png", annotation 2: the box runs past the image edge. Keep x + w and y + h within 100.
```

## Run it

```sh
pnpm comark-lint "docs/**/*.md"
```

Or add `comark-linter/doctor` to `doctor.config.ts`, and the `comark/recommended` preset turns every rule on. [Vite Doctor](/lint/vite-doctor/) has the setup.

## How plugins name their rules

Each plugin adds its sentences to `meta.issues`, as it always has, and also names the rule of each one in `meta.issueRules`, keyed by the sentence:

```ts
const { meta } = await parseMarkdown(markdown, { plugins: [embed()] });
meta.issues; // ["`::embed` 1: `url` must start with https://."]
meta.issueRules; // { "`::embed` 1: `url` must start with https://.": "comark/embed/insecure-url" }
```

An issue no rule names, such as one from a plugin of your own, is reported as [`comark/plugin-issue`](/doctor/plugin-issue/).

## Rules

::rules
::
