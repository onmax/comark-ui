# Notes on lines of code

comark-code-notes turns a numbered comment at the end of a line, like `// <1>`, into a marker that links to its note in the numbered list right after the fence, and back. Use it when a reviewer would ask why a line is there.

## Syntax

````md
```ts [src/pigeons.ts]
export async function countPigeons(plaza: string) {
  const res = await fetch(`/api/plazas/${plaza}/pigeons`) // <1>
  if (!res.ok) return 0 // <2>
  return (await res.json()).length
}
```

1. One request per plaza, so the map loads the counts in parallel.
2. A plaza the census hasn't reached yet counts as empty, so the page still loads.
````

- End a line with a comment that holds its note's number in angle brackets. The comment goes and a marker takes its place. A comment with words keeps them: `// retry once <2>` shows `// retry once` and marker 2.
- A line can carry several markers, like `// <1> <2>`, and two lines can share a number.
- Write the comment the language accepts, so the code stays valid: `// <1>`, `# <1>`, `-- <1>`, `; <1>`, `% <1>`, `/* <1> */`, or `<!-- <1> -->`. Any of them works in any fence.
- Put the numbered list right after the fence, with nothing but a blank line between them. Item 1 is note 1, and a list that starts at `3.` numbers its notes from 3. Each note starts with a marker that links back to its line.
- A fence with no numbered list right after it keeps its markers as written, and is reported. A ` ```md ` fence never changes, so show the syntax in one.
- `meta.issues` also reports a marker with no note, a note with no marker, and Shiki running after the plugin.

## Write the notes

Mark the lines a reviewer would ask about: the request that runs in parallel, the case that returns early, the number from a benchmark. Keep each note to a sentence or two, and put a longer explanation in the text around the block. The plugin pairs markers and notes by number alone, so read each note against its line. CSS draws the marker numbers, so copied code leaves them out. On GitHub, the comments stay in the code and the notes read as a list under it.

## Register

- In `comark-ui`: on as `codeNotes`, listed after `code`. The preset leaves Shiki out; add it right before comark-code, as the [code reference](code.md) shows, which keeps it ahead of code notes.
- Alone: `pnpm add comark @comark/html comark-code-notes`, then `createHtmlRenderer({ plugins: [shiki(), codeNotes()], components })` with `shiki` from `@comark/html/plugins/shiki`, and `codeNotes` and `components` from `comark-code-notes/html`. It goes after `shiki`; in the other order the code isn't highlighted and `meta.issues` says so. Without Shiki it draws the lines itself. It takes no options, and `comark-code-notes/vue`, `/react`, and `/svelte` render it too.
