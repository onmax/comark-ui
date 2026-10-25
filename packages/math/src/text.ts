/** An attribute as text: Comark writes strings, numbers, and booleans, and anything else reads as empty. */
export const text = (value: unknown) =>
  value === undefined || value === null || value instanceof Object
    ? ""
    : // SAFETY: undefined, null, objects, and arrays returned above, so only a string, number, or boolean is left.
      String(value as string | number | boolean);
