import { NodeHtmlMarkdown } from "node-html-markdown";

export function getMarkdownFromHtml(html?: string) {
  if (html == null) {
    return null;
  }

  return NodeHtmlMarkdown.translate(html).replace(/\\\./g, ".");
}
