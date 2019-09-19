import * as $ from "cheerio";

export function checkTextEquality(
  left: string,
  right: string,
  allowedDifference: string | null = null
): boolean {
  const leftText = $(left)
    .text()
    .replace(/(\s|\n)+/g, " ");

  let rightText = $(right)
    .text()
    .replace(/(\s|\n)+/g, " ");

  if (allowedDifference != null) {
    const diffText = $(allowedDifference)
      .text()
      .replace(/(\s|\n)+/g, " ");
    rightText = rightText.replace(diffText, " ").replace(/(\s|\n)+/g, " ");
  }

  if (leftText === rightText) {
    return true;
  }
  console.warn(`left:\n${leftText}\ndoes not equal right:\n${rightText}`);
  return false;
}
