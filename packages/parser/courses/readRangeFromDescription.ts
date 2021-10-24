import { readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

export function testDescriptions() {
  const lines = readFileSync(join(__dirname, "./descriptions.txt"), "utf-8")
    .split("\n")
    .map((el) => el.trim());

  let maxLength = 0;
  const out: string[] = [];
  for (const line of lines) {
    const parsed = readRangeFromDescription(line);
    maxLength = Math.max(parsed.length, maxLength);

    out.push(parsed);
  }

  writeFileSync(
    join(__dirname, "./ranges.txt"),
    out
      .map((el, i) => ({ el, i }))
      .filter(({ el }) => el === "invalid")
      .map(
        ({ el, i }) => `${`'${el}'`.padEnd(maxLength + 5, " ")} '${lines[i]}'`
      )
      .join("\n")
  );

  appendFileSync(
    join(__dirname, "./ranges.txt"),
    out
      .map((el, i) => ({ el, i }))
      .filter(({ el }) => el !== "invalid")
      .map(
        ({ el, i }) => `${`'${el}'`.padEnd(maxLength + 5, " ")} '${lines[i]}'`
      )
      .join("\n")
  );

  maxLength = 0;
  const out2: string[] = [];
  const set = [...new Set(out)];
  for (const line of set) {
    const parsed = getIndicesFromRange(line).join(" ");
    out2.push(parsed);
    maxLength = Math.max(parsed.length, maxLength);
  }

  writeFileSync(
    join(__dirname, "./indices.txt"),
    out2
      .map((el, i) => `${`'${el}'`.padEnd(maxLength + 3, " ")} '${set[i]}'`)
      .join("\n")
  );
}

export function readRangeFromDescription(description: string) {
  let re!: () => RegExp;

  re = () => /omfattar?\s+punkterna(.*?)under\s+(rubriken\s+)?Ämnets?/i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /omfattar?\s+punkterna(.*?)(\.|\,\s+med särskild)/i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /bygger\s+på(.*?)under\s+(rubriken\s+)?Ämnets?/i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /bygger\s+på(.*?)under\s+rubriken\s+Ämnets?/i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /omfattar?\s+punkterna(.*?)\./i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /omfattar?\s+punkt(.*?)under\s+(rubriken\s+)?Ämnets?/i;
  if (re().test(description)) {
    return description.match(re())![1].trim();
  }

  re = () => /omfattar\s+samtliga\s+mål\s+under\s+(rubriken\s+)?Ämnets?/i;
  if (re().test(description)) {
    return "samtliga mål";
  }

  return "invalid";
}

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
