---
title: How it was tested
description: The 100 projects marked-to-comark ran on, what it checks on each, and what still differs.
---

marked-to-comark was run on the 100 most-starred GitHub repositories that declare `marked` in a package.json, among them Vue, Open WebUI, Angular, MUI, Uptime Kuma, Mermaid, and Grafana. Each run works on a copy of the project at a pinned commit, with up to 300 Markdown files sampled from it.

marked renders each document at the version the project declares, from 0.3 to 18, with the options the scan finds and the extensions the test can load. Comark renders the same document with `comarkOptions()` set the way `rewrite` would set it. Both outputs are parsed as HTML and compared after whitespace a browser collapses is normalized.

On every project, the run checks that:

- `check`, `rewrite`, and `content` never throw.
- Rewritten code still parses and keeps its imports consistent, and a second run changes nothing.
- marked, at the project's version, renders every escaped file byte for byte as before.
- Comark's HTML ends up no further from marked's than it was before the escapes.
- Each rewritten call, rebuilt from its setup, renders the project's documents like its replacement.

## What it compares

Most marked projects render strings at runtime, such as chat replies, comments, or CMS fields, which the test can't see. It compares the Markdown in the repository instead. Where the project's marked code names a folder, such as `posts/`, those files are reported apart; the rest is a sample of the repository's Markdown, which marked may not render at all.

## Results

RESULTS
