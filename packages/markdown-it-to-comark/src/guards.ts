// What a value loaded from a project (a module, a parsed option) holds, without `typeof`.
export const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  value instanceof Function;
export const isText = (value: unknown): value is string => value === String(value);
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value instanceof Object && !(value instanceof Function) && !Array.isArray(value);
