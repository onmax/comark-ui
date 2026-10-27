/** One file of a skill, at its path from the skill's folder, such as `SKILL.md` or `references/example.md`. */
export interface SkillFile {
  path: string;
  text: string;
}

/** An Agent Skill: its folder's name, its frontmatter, and every file in it, `SKILL.md` first. */
export interface Skill {
  name: string;
  description: string;
  frontmatter: Record<string, unknown>;
  files: SkillFile[];
}

// The build reads the repository's skills/ folder into these, so a host can serve the skills without reading files
// from node_modules, as a Worker can't.
declare const __COMARK_SKILLS__: Skill[];
declare const __COMARK_UI_VERSION__: string;

/** Every agent skill this version of comark-ui ships, in the order of their names. */
export const skills: Skill[] = __COMARK_SKILLS__;

/** The comark-ui version the skills come from, for a host's cache key or a digest. */
export const version: string = __COMARK_UI_VERSION__;
