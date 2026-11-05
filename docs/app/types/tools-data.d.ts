// docs/tools.ts writes these before `nuxi dev` and `nuxi build`. Typechecks run without it, so the pages' imports
// fall back to these shapes when the files aren't there.
declare module "~~/.generated/tools-data/play.json" {
  const first: {
    npm: string;
    source: string;
    config: string;
    sourcePaint: string;
    configPaint: string;
  };
  export default first;
}

declare module "~~/.generated/tools-data/gallery.json" {
  const groups: {
    slug: string;
    label: string;
    icon: string;
    npm: string;
    examples: { id: string; label: string; page: string; playable: boolean }[];
  }[];
  export default groups;
}
