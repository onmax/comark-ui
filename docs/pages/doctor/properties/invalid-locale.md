The properties plugin's `locale` option needs a language tag such as `"de-DE"` or `"es-ES"`. An invalid tag, such as `"en_US"` or an empty string, is ignored: dates render in English and the browser rewrites them in the reader's locale.

This invalid tag falls back to the reader's locale:

```ts
import properties from "comark-properties";

const plugins = [properties({ locale: "en_US" })];
```

Use a valid tag to fix the locale:

```ts
import properties from "comark-properties";

const plugins = [properties({ locale: "de-DE" })];
```

Or leave `locale` unset to use the reader's locale.
