export function normalizeCode(code?: string | null) {
  if (code == null) {
    return "-";
  }

  return code
    .toUpperCase()
    .replace(/[^ÅÄÖA-Z0-9_]/g, "_")
    .replace(/_/g, "_");
}

export function getSortableCode(code: string) {
  return code.replace("00S", "0S0");
}

export function getSortedCodes(codes: string[]) {
  return codes.sort((a, b) =>
    getSortableCode(a).localeCompare(getSortableCode(b))
  );
}
