export function setValueIfExists<T>(
  value: T | null | undefined,
  assertValue: (t: T) => boolean,
  assign: (t: T) => void
) {
  if (value != null) {
    if (assertValue(value)) {
      assign(value);
    } else {
      throw new Error(`Manual replacement value does not assert to true`);
    }
  }
}
