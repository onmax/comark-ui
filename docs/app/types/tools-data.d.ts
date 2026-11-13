// docs/tools.ts writes these before `nuxi dev` and `nuxi build`. Typechecks run without it, so the pages' imports
// fall back to these shapes when the files aren't there.
declare module "~~/.generated/tools-data/gallery.json" {
  const groups: {
    slug: string;
    label: string;
    icon: string;
    npm: string;
    examples: { id: string; label: string; page: string; playable: boolean; play?: string }[];
  }[];
  export default groups;
}
