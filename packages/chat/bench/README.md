# Streaming benchmark

Streams a Markdown reply into comark-chat's React `MessageParts`, with comark-ui's React preset and its lazy Shiki, the way an AI SDK chat renders one. It builds the page twice from this checkout: once with our files as they are at `--base` (default `origin/main`), and once from the working tree. It then compares the two in Chromium. Both builds read every workspace package from its source, so neither needs `pnpm build`. Dependencies come from the lockfile.

```sh
node packages/chat/bench/stream.mjs                # time: 5 paired runs of the SIMD replay
node packages/chat/bench/stream.mjs --mode check   # the DOM after every tenth update matches
node packages/chat/bench/stream.mjs --mode chat    # a short reply keeps its components' state
```

`time` replays the SIMD document from Pierre's Words benchmark: 39,898 bytes, 38 Python fences, 105 headings, fetched once from a pinned commit and checked by hash. It sends 256 UTF-16 units per update, 40 ms apart. The runs alternate which side goes first. Each run reports two kinds of numbers:

- Commit time: from `root.render()` to the DOM commit of that update's deferred render. The build marks `@comark/react`'s root with the length of the source it parsed, so React's first commit, which still shows the previous tree, doesn't count.
- Main-thread time from Chromium's performance metrics: tasks, styles, layout, and script, over the whole replay. A commit leaves styles and layout for the next frame, so commit time alone misses that work.

`check` compares the DOM between the two sides after every tenth update and at the end. It ignores where the typeset `<style>` and the streaming caret sit, and the empty `style` React leaves on a span the caret moved out of. `chat` streams `mixed.md` 32 units at a time. Once the table starts arriving, it clicks a stateful component and picks a code group's second tab. It then checks that both survive the rest of the stream, and where the caret sits while streaming.

Pass `--base <ref>` to compare another commit, `--runs`, `--interval`, `--fixture <file.md>`, and `--out <file.json>` for the raw samples. An invalid ref or a missing baseline source fails the comparison rather than substituting the working-tree file.
