An `@user`, a link into an account, or an `avatar` whose image answered with an HTTP error, such as 404 for an account that doesn't exist. The chip is drawn with no image, and the reason is usually a misspelled login.

comark-chips only finds this while it downloads the images, so it isn't reported with `download: false`:

```ts
import chips from "comark-chips";

// Downloads every chip's image while parsing, so a missing one is reported.
const plugins = [chips()];
```

Check the login, such as `@pigeon-keepr` for `@pigeon-keeper`, or set `avatar` to an image that exists.
