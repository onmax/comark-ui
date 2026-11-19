The deploy failed because the **build step** ran before `pnpm install` finished. Here is what changed and how to fix it.

> [!NOTE]
> The cache key includes the lockfile, so a new dependency always misses the cache.

::counter
::

Run the install first, then the build:

```sh
pnpm install --frozen-lockfile
pnpm build
```

::code-group

```ts [build.ts]
export async function build() {
  await install();
  return bundle({ minify: true });
}
```

```ts [install.ts]
export const install = () => run("pnpm", ["install"]);
```

::

| Step | Before | After |
| --- | --- | --- |
| Install | 41 s | 38 s |
| Build | failed | 12 s |

After the change, the counter above keeps its count while this paragraph streams in, and so does the selected tab in the code group. The [workflow file](https://example.com/workflow) runs the two steps in order.

1. Push the branch.
2. Wait for the build.
3. Open the preview.
