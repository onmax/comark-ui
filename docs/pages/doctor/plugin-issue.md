A problem a plugin added to `meta.issues` without naming its rule in `meta.issueRules`, such as one from a plugin of your own, or a document Comark couldn't parse at all. Every comark-ui package names its rules, so its problems have their own pages under [Doctor](/doctor/).

It's placed on the block the message names when the source shows where that is, and on line 1 otherwise. The message's last sentence is its fix.

To give your own plugin's problems a rule, add each sentence to `meta.issues` and name its rule in `meta.issueRules`. A rule comark-linter doesn't know is reported as `comark/plugin-issue`:

```ts
import { defineComarkPlugin } from "comark";

export default defineComarkPlugin(() => ({
  name: "duck-count",
  post({ tree }) {
    const issue = "duck-count 1: `pond` is required. Write `::duck-count{pond=\"north\"}`.";
    tree.meta.issues = [...(tree.meta.issues ?? []), issue];
    tree.meta.issueRules = { ...tree.meta.issueRules, [issue]: "duck-count/missing-pond" };
  },
}));
```
