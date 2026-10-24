export type RuleInfo = {
  /** Its Vite Doctor code. Each package has its own hundred: core 00, then one block per package in `index.ts`. */
  code: `COMARK${string}`;
  /** What the rule asks for, as an imperative. */
  title: string;
  /** `warn` when left out. */
  severity?: "error";
};
