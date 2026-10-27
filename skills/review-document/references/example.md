# Review: avatar cache

> [!CAUTION] Request changes
> One blocking finding: after a large avatar loads, every smaller one on the page shows the large image. The fix is one line.

Reviewed [acme/web#418](https://github.com/acme/web/pull/418) at `9f3c2e1`.

## 1. Small avatars load the 512px image (blocking)

`src/avatars/cache.ts:18`. The cache key is the user's id alone, so once the profile header loads someone's 512px avatar, the 32px avatars in comments get the same file. Reproduced with a test:

::tests{title="pnpm test src/avatars"}
```xml
<testsuite name="cache.test.ts" time="0.18">
  <testcase classname="cache.test.ts" name="returns a cached avatar" time="0.01"/>
  <testcase classname="cache.test.ts" name="returns a 32px avatar after a 512px one" time="0.02">
    <failure message="expected 512 to be 32">AssertionError: expected 512 to be 32
    at cache.test.ts:27:31</failure>
  </testcase>
</testsuite>
```
::

::diff{line=18 label="Fix"}
```ts [src/avatars/cache.ts]
const key = user.id;
```
```ts
const key = `${user.id}:${size}`;
```
::

## 2. The cache never evicts (should fix)

`src/avatars/cache.ts:9`. Read in the code, not measured: the map grows by one entry per user and size for as long as the tab stays open, which on the team directory is thousands of images.

```ts [src/avatars/cache.ts] mark={1}
const cache = new Map<string, Blob>();
```

Cap it, such as an LRU of 500 entries, or decide the tab's lifetime is short enough not to.

## Checked

- Ran `pnpm test src/avatars`: one failure, above.
- Opened a profile on the preview at 1440px and watched the comment avatars after the header loaded.

## Not checked

- Server rendering: the cache only runs in the browser, and I didn't confirm the server skips it.
- Safari's memory use.
