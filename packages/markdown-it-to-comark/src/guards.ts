// What a value loaded from a project (a module, a parsed option) holds, without `typeof`. By its tag rather than
// `instanceof`, so a function or object from another realm (a `vm` context, a null-prototype record) still counts.
const tag = (value: unknown) => Object.prototype.toString.call(value);
export const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  tag(value).endsWith("Function]");
export const isText = (value: unknown): value is string => value === String(value);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  tag(value) === "[object Object]" || tag(value) === "[object Module]";
