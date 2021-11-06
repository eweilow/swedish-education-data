export function getIndicesFromRange(range: string, specificCount: number = 1) {
  if (range.includes("samtliga mål")) {
    const arr: number[] = [];
    for (let i = 0; i < specificCount; i++) {
      arr.push(i);
    }
    return arr;
  }

  const split = range
    .replace("och", ",")
    .split(",")
    .map((el) => el.trim())
    .map((el) =>
      el
        .replace(/[^0-9]/g, "-")
        .replace(/^-+/g, "")
        .replace(/-+$/g, "")
        .replace(/-+/g, "-")
    )
    .filter((el) => !!el);

  const indices = new Set<number>();
  for (const part of split) {
    if (part.includes("-")) {
      const [a, b] = part.split("-");
      const from = parseInt(a, 10);
      const to = parseInt(b, 10);
      for (let i = from; i <= to; i++) {
        indices.add(i);
      }
    } else {
      indices.add(parseInt(part, 10));
    }
  }
  const arr = [...indices].map((el) => el - 1);
  arr.sort((a, b) => a - b);

  return arr;
}
