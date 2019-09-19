const $ = require("cheerio");

export function checkTextEquality(left: string, right: string): boolean {
  const leftText = $.load(left)
    .text()
    .replace(/(\s|\n)+/g, " ");
  const rightText = $.load(right)
    .text()
    .replace(/(\s|\n)+/g, " ");

  return leftText === rightText;
}
