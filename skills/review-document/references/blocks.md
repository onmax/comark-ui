# Blocks for a review document

These blocks come with `comark-ui`, or alone with `comark-github`, `comark-tests`, `comark-diff`, and `comark-code`. The comark-ui skill (`vp dlx skills add onmax/comark-ui`) documents every block in full.

## The verdict: a callout

```md
> [!CAUTION] Request changes
> One blocking finding: after a large avatar loads, every smaller one shows the large image.
```

The text after the marker is the title. `[!CAUTION]` fits request changes or blocked, `[!WARNING]` approve with changes, `[!TIP]` approve, and `[!NOTE]` context the reader needs before the findings. Any other marker stays a plain quote and is reported.

## A test run: `::tests`

Paste the JUnit XML the runner wrote, unedited, so the counts are the run's own:

````md
::tests{title="pnpm test src/avatars"}
```xml
<testsuite name="cache.test.ts" time="0.18">
  <testcase classname="cache.test.ts" name="returns a cached avatar"/>
  <testcase classname="cache.test.ts" name="returns a 32px avatar after a 512px one">
    <failure message="expected 512 to be 32">AssertionError: expected 512 to be 32</failure>
  </testcase>
</testsuite>
```
::
````

It shows the passed, failed, and skipped counts and each failure's message and stack. Most runners write the report with a flag: `vitest run --reporter=junit --outputFile=junit.xml`, `pytest --junitxml=junit.xml`, `jest --reporters=jest-junit`. For a command that isn't a test run, paste its output in a `txt` or `sh` fence instead.

## The lines that cause it: a fence with `mark`

````md
```ts [src/avatars/cache.ts] mark={1}
const cache = new Map<string, Blob>();
```
````

`mark={1}` highlights the block's first line; ranges look like `{3-4}` or `{1, 3-4}`. Copy a few lines from the file, the ones your text names.

## The fix: `::diff`

````md
::diff{line=18 label="Fix"}
```ts [src/avatars/cache.ts]
const key = user.id;
```
```ts
const key = `${user.id}:${size}`;
```
::
````

Two fenced blocks, before then after, starting at the file's line `line`. One file per diff, a few lines each.

## A long log: `<details>`

```md
<details>
<summary>Full test output</summary>

…

</details>
```

Fold away anything the reader may skip, such as a full log under the failure that matters.
