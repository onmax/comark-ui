An icon from a set that isn't in `collections` is downloaded from the Iconify API while the document is parsed. When the request fails, because the build is offline or the API answers with an error, the icon is left out of the page. The message gives the reason.

A failed download isn't kept, so the next parse tries again. For a build that shouldn't depend on the network, install the set and pass it in `collections`:

```ts
import { icons as lucide } from "@iconify-json/lucide";
import { createIcons } from "comark-icon";

const icons = createIcons({ collections: { lucide }, fetch: false });
```

The same rule covers the `icon` of a `:::tabs-item`, a code group's block, a `::card`, or a comark-code action. It has no example here, since it depends on the network and not on the Markdown.
