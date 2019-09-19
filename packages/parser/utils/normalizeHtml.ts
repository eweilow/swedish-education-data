import { format } from "prettier";

export function normalizeHTML(html: string) {
  return format(html, {
    parser: "html",
    printWidth: 80,
    tabWidth: 2,
    useTabs: false
  })
    .replace("<p></p>", "")
    .trim();
}
