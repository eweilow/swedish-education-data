import { format } from "prettier";

export function normalizeHTML(html: string) {
  const srcString = html
    .replace(/(\s|\n)+/gm, " ")
    .replace(/\>\s{2,}\</g, "> <")
    .replace(/\s{2,}\</g, " <")
    .replace(/\>\s{2,}/g, "> ")
    .replace(/\<p\>\s*\<\/p\>/g, "")
    .replace(/(\s|\n)+/gm, " ");

  return format(srcString, {
    parser: "html",
    printWidth: 80,
    tabWidth: 2,
    useTabs: false
  })
    .replace("<p></p>", "")
    .trim();
}
