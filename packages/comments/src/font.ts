import { caveat } from "comark-annotate/font";

// Written once a document has a pen mark, since the font is about 32 KB. It has its own module so `css` doesn't carry it.
export const fontCss = `@font-face{font-family:comark-caveat;src:url(data:font/woff2;base64,${caveat}) format("woff2");font-display:block}`;
