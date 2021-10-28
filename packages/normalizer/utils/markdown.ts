import { NodeHtmlMarkdown } from "node-html-markdown";

export function getMarkdownFromHtml(html?: string) {
  if (html == null) {
    return null;
  }

  html = html.replace(/<br>/g, " "); // Remove line breaks
  html = html.replace(/<i>\s*\.\s*<\/i>/g, "."); // Remove dots with emphasis
  html = html.replace(/\.<\/i>/g, "</i>."); // Move dot out of <i></i>
  html = html.replace(/\.<\/strong>/g, "</strong>."); // Move dot out of <strong></strong>
  html = html.replace(/\.<\/em>/g, "</em>."); // Move dot out of <em></em>
  return NodeHtmlMarkdown.translate(html).replace(/\\\./g, ".");
}

export function normalizeSections(markdownRows: string[]) {
  const sections: Array<{ title: string | null; rows: string[] }> = [];
  let header: string | null = null;
  let rows: string[] = [];

  const pop = () => {
    if (rows.length === 0) {
      return;
    }

    sections.push({
      title: header?.replace(/^#+/g, "")?.trim() ?? null,
      rows: rows
        .filter((el) => !!el)
        .map((row, i) => {
          if (row.startsWith("* ")) {
            return row.replace(/^\* /, `${i + 1}. `);
          }

          return row;
        })
        .map((row) => {
          if (!row.endsWith(".") && /[A-ZÅÄÖ0-9]$/i.test(row)) {
            return `${row}.`;
          }

          if (row.endsWith(",")) {
            return `${row.slice(0, -1)}.`; // Remove the , and replace with .
          }

          return row;
        }),
    });
    rows = [];
  };

  for (let row of markdownRows) {
    // Current row is a header
    if (row.startsWith("#")) {
      pop();
      header = row;
      continue;
    }

    rows.push(row);
  }

  pop();

  return {
    sections,
  };
}
