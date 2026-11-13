// The rail: the packages in its order, its categories, and the site's own sections. docs/content.ts writes them into
// each section's .navigation.yml, and nuxt.config.ts passes the categories to @vite-hub/docs.

// The packages in the order the rail lists them. A package with no docs/ is left out.
export const packageOrder = [
  "annotate",
  "cast",
  "charts",
  "diagrams",
  "mermaid",
  "chips",
  "colors",
  "diff",
  "git-graph",
  "magic-move",
  "embed",
  "media",
  "metrics",
  "table",
  "tests",
  "github",
  "properties",
  "time",
  "sources",
  "icon",
  "qr",
  "links",
  "zoom",
  "carousel",
  "tabs",
  "code",
  "details",
  "file-tree",
  "fields",
  "badge",
  "code-notes",
  "cards",
  "steps",
  "quiz",
  "cjk",
  "figure",
  "mark",
  "critic",
  "comments",
  "deflist",
  "footnotes",
  "math",
  "keys",
  "include",
  "outline",
  "xref",
  "reading-time",
  "chat",
  "lint",
  "migrate-to-comark",
  "remark-to-comark",
  "markdown-it-to-comark",
  "marked-to-comark",
];

// The rail's categories, in its order. A package's `group` picks its category; the site's own sections pick theirs here.
export const categories = [
  "Start",
  "Review blocks",
  "Charts and diagrams",
  "Docs blocks",
  "Page behavior",
  "Markdown syntax",
  "Authoring tools",
  "Chat",
  "Linter",
  "Migration",
  "Recipes",
];
// `last` puts a section after its category's packages: Doctor's rules follow comark-linter's own pages, and Mermaid
// follows Diagrams.
export const siteSections: Record<
  string,
  { title: string; icon: string; category: string; group?: string; last?: boolean }
> = {
  guide: { title: "Guides", icon: "i-lucide-book-open", category: "Start", group: "Docs" },
  skills: { title: "Skills", icon: "i-lucide-graduation-cap", category: "Start" },
  recipes: { title: "Recipes", icon: "i-lucide-chef-hat", category: "Recipes", group: "Docs" },
  compare: { title: "Compare", icon: "i-lucide-scale", category: "Recipes", group: "Docs" },
  mermaid: {
    title: "Mermaid",
    icon: "i-lucide-network",
    category: "Charts and diagrams",
    group: "Components",
    last: true,
  },
  doctor: {
    title: "Doctor",
    icon: "i-lucide-stethoscope",
    category: "Linter",
    group: "Linter",
    last: true,
  },
};

// The rail, as on the old site: a few kinds of page, one item each, whose sidebar lists their sections under their
// categories. One item per package put each package in the rail and again in the sidebar beside it.
export const railGroups = [
  { title: "Docs", icon: "i-lucide-book-open", categories: ["Authoring tools"] },
  {
    title: "Components",
    icon: "i-lucide-blocks",
    categories: ["Review blocks", "Charts and diagrams", "Docs blocks", "Page behavior", "Chat"],
  },
  { title: "Typography", icon: "i-lucide-type", categories: ["Markdown syntax"] },
  { title: "Linter", icon: "i-lucide-stethoscope", categories: ["Linter"] },
  { title: "Migrate", icon: "i-lucide-arrow-right-left", categories: ["Migration"] },
];

// The rail item a package's category puts it in.
export const railGroupOf = (category: string) =>
  railGroups.find((group) => group.categories.includes(category))?.title;
