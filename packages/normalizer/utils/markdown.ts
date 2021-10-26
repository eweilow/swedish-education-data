import { NodeHtmlMarkdown } from "node-html-markdown";

export function getMarkdownFromHtml(html?: string) {
  if (html == null) {
    return null;
  }

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
          if (row.startsWith("*")) {
            return row.replace(/^\*/, `${i + 1}.`);
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
