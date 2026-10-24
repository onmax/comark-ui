`::tests` found the report but couldn't read it: the file isn't readable, it's a folder, or a `read` option of your own threw. The message gives the path and the error.

Nothing in the Markdown is wrong. Check the file's permissions, or the `read` you pass. In a browser or an edge runtime, where there's no disk, `read` returns the file's text, or `undefined` when it doesn't exist:

```ts
import tests from "comark-tests";

const reports: Record<string, string> = { "junit.xml": pondReport };
const plugins = [tests({ read: (path) => reports[path] })];
```

It has no example to lint here, since it depends on the reader and not on the Markdown.
