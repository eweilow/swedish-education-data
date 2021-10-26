export function normalizeCode(code?: string | null) {
  if (code == null) {
    return "-";
  }

  return code
    .toUpperCase()
    .replace(/[^ÅÄÖA-Z0-9_]/g, "_")
    .replace(/_/g, "_");
}
