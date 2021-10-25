import { readFileSync, writeFileSync } from "fs";
import { parseXML, pickOnlyIf } from "../utils/xml";

import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";

import { getMarkdownFromHtml } from "../utils/markdown";
import { assert } from "chai";

function parsePurpose(purpose?: string) {
  const markdown = getMarkdownFromHtml(pickOnlyIf.string(purpose) ?? "")
    ?.split("\n")
    ?.map((el) => el.trim());

  if (markdown == null) {
    return null;
  }

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

  for (let row of markdown) {
    // Current row is a header
    if (
      row.startsWith("#") ||
      /Undervisningen i ämnet .+? ska ge eleverna förutsättningar att utveckla följande:/.test(
        row
      )
    ) {
      pop();
      header = row;
      continue;
    }

    // We are in the "first" section, but encountered a list. Pop the section and force a header
    if (header == null && row.startsWith("1.")) {
      pop();
      header = `Undervisningen i ämnet ska ge eleverna förutsättningar att utveckla följande:`;
    }

    rows.push(row);
  }

  pop();

  if (sections.length !== 3) {
    console.log(sections);
  }

  return {
    sections,
  };
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
      `${result.code}: description`
    );
    assert.equal(result.purpose?.sections?.[0]?.title, null);
    assert.match(
      result.purpose?.sections?.[1]?.title ?? "-",
      /Undervisningen i .+? ska ge eleverna/
    );
    assert.match(result.purpose?.sections?.[2]?.title ?? "-", /Kurser i ämnet/);

    writeFileSync(
      join(subjectsDir, `s_${result.code}.json`),
      JSON.stringify(result, null, "  ")
    );
  }
}
