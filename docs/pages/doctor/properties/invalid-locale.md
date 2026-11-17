The properties plugin's `locale` option needs a language tag such as `"de-DE"` or `"es-ES"`. An invalid tag, such as `"en_US"` or an empty string, is ignored, and dates are in English.

This invalid tag falls back to English:

```ts
import properties from "comark-properties";

const plugins = [properties({ locale: "en_US" })];
```

Use a valid tag to set the language:

```ts
import properties from "comark-properties";

const plugins = [properties({ locale: "de-DE" })];
```

Or leave `locale` unset for English.
