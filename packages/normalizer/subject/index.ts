import { readFileSync, writeFileSync } from "fs";
import { parseXML, pickOnlyIf } from "../utils/xml";

import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";

import { getMarkdownFromHtml, normalizeSections } from "../utils/markdown";
import { assert } from "chai";
import { normalizeCode } from "../utils/code";

function fixPurpose(rows: string[]) {
  let hasFoundHeader = false;

  return rows.flatMap((row, index) => {
    if (
      /^Undervisningen i ämnet .+? ska ge eleverna förutsättningar att utveckla följande:/.test(
        row
      )
    ) {
      hasFoundHeader = true;
      return `# ${row}`;
    }

    if (row.startsWith("1.") && !hasFoundHeader) {
      hasFoundHeader = true;
      return [
        `# Undervisningen i ämnet PLACEHOLDER ska ge eleverna förutsättningar att utveckla följande:`,
        row,
      ];
    }

    if (row.startsWith("#")) {
      hasFoundHeader = true;
    }

    return row;
  });
}

function parsePurpose(purpose?: string) {
  const markdownRows = getMarkdownFromHtml(pickOnlyIf.string(purpose) ?? "")
    ?.split("\n")
    ?.map((el) => el.trim());

  if (markdownRows == null) {
    return null;
  }

  const fixedRows = fixPurpose(markdownRows);

  return normalizeSections(fixedRows);
}

function parseDescription(description: string | null) {
  return getMarkdownFromHtml(pickOnlyIf.string(description) ?? "")
    ?.split("\n")
    ?.map((el) => el.trim());
}

export async function normalizeSubjects(
  inputDirectory: string,
  outputDirectory: string
) {
  const subjectsDir = join(outputDirectory, "./subjects");
  mkdirp.sync(subjectsDir);

  for (const file of glob.sync("gyP4_0_S3_0/subject/*.xml", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    const contents = readFileSync(file, "utf-8");

    const data = await parseXML(contents);
    const { subject } = data;

    const result = {
      name: pickOnlyIf.string(subject.name?.[0]),
      code: pickOnlyIf.string(subject.code?.[0]),
      description: parseDescription(subject.description?.[0]),
      purpose: parsePurpose(subject.purpose?.[0]),
      isPublished: pickOnlyIf.oneOf(subject.status?.[0], "PUBLISHED"),
      gradeScale: pickOnlyIf.string(subject.gradescale?.[0]),
      typeOfSchooling: pickOnlyIf.string(
        subject.originatortypeofschooling?.[0]
      ),
      createdDate: new Date(subject?.createddate?.[0]),
      modifiedDate: new Date(subject?.modifieddate?.[0]),
      courseCodes: (
        subject.courses?.map((course: any) => {
          return pickOnlyIf.string(course.code?.[0]);
        }) ?? []
      ).filter((el: string | null) => el != null) as string[],
    };

    assert.isNotNull(result.name);
    assert.isNotNull(result.code);
    assert.lengthOf(result.description ?? [], 1, `${result.code}: description`);
    assert.lengthOf(
      result.purpose?.sections ?? [],
      3,
      `${result.code}: purpose`
    );
    assert.equal(result.purpose?.sections?.[0]?.title, null);
    assert.match(
      result.purpose?.sections?.[1]?.title ?? "-",
      /Undervisningen i .+? ska ge eleverna/
    );
    assert.match(result.purpose?.sections?.[2]?.title ?? "-", /Kurser i ämnet/);

    for (const section of result.purpose?.sections?.slice?.(0, 1) ?? []) {
      for (const row of section.rows) {
        assert.match(
          row,
          /^[A-zÅÄÖ].+\.$/i,
          `in ${result.name} (${result.code})`
        );
      }
    }
    for (const section of result.purpose?.sections?.slice?.(1) ?? []) {
      for (const row of section.rows) {
        assert.match(
          row,
          /^[0-9]+\. .+\.$/i,
          `in ${result.name} (${result.code})`
        );
      }
    }

    writeFileSync(
      join(subjectsDir, `s_${normalizeCode(result.code)}.json`),
      JSON.stringify(result, null, "  ")
    );
  }
}
