`references({ repo })` is the repository a bare `#123` links into, written as `owner/name`. Anything else, such as a full URL, can't be joined into an issue link, so every `#123` in the document stays plain text. `@user` and `owner/name#123` still link.

The repository is a plugin option, not part of the document:

```ts
import { references } from "comark-github";

// Not "https://github.com/onmax/comark-ui".
const plugins = [references({ repo: "onmax/comark-ui" })];
```
