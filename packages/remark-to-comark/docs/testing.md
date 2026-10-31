---
title: How it was tested
description: The 100 projects remark-to-comark ran on, what it checks on each, and what still differs.
---

remark-to-comark was run on the 100 most-starred GitHub repositories that declare a remark, rehype, unified, react-markdown, or MDX dependency, among them freeCodeCamp, n8n, Dify, Next.js, Supabase, and Storybook. Each run works on a copy of the project, with up to 300 Markdown files sampled from it.

On every project, the run checks that:

- `check`, `rewrite`, and `content` never throw.
- Rewritten code still parses and keeps its imports consistent, and a second run changes nothing.
- remark renders every escaped file byte for byte as before.
- Comark's HTML ends up no further from remark's than it was before the escapes.

## Results

Of 14,470 sampled documents that aren't MDX, 95.7% render the same HTML in Comark and in remark after migration, once whitespace is normalized. On the 31 projects whose remark plugins the test could load, it's 98.0%. No document broke the checks above. One project, MUI, ran past the test's 15-minute limit.

`rewrite` replaced 13 of the 161 unified chains it found, the other 148 having a reason to stay. Each of the 13 was rebuilt from its plugins and run against its replacement on that project's documents, and they match at 99.8 to 100%.

Most of what still differs are Comark bugs: about 30 causes, each with a minimal input and a playground link in [comarkdown/comark#525](https://github.com/comarkdown/comark/issues/525). The setup that `comarkOptions()` returns works around the ones it can, such as tight lists that keep a `<p>`, Markdown images that lose `alt=""`, and inline tags left open across blocks.
