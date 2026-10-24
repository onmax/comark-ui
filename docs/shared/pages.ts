export interface Page {
  slug: string;
  title: string;
  description: string;
  /** Everything in the page's `<body>`, scripts included. */
  body: string;
  /** The site's icon styles. */
  css: string;
}
