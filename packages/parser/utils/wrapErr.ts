export function wrapError(err: Error, context: string) {
  const newErr = new Error(`[${JSON.stringify(context)}] ${err.message}`);
  newErr.stack = `[${JSON.stringify(context, null, "  ")}]\n${err.stack ||
    newErr.stack}`;
  newErr.name = err.name;
  return newErr;
}

export async function rethrowErrorsWithContext<T>(
  context: string,
  fn: () => Promise<T> | T
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw wrapError(err, context);
  }
}
