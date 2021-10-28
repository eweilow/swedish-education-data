import { readFileSync, writeFileSync } from "fs";
import { parseXML, pickOnlyIf } from "../utils/xml";

import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";

import { getMarkdownFromHtml, normalizeSections } from "../utils/markdown";
import { assert } from "chai";
import { normalizeCode } from "../utils/code";

function fixCentralContent(rows: string[]) {
  let hasFoundHeader = false;

  return rows
    .flatMap((row) => {
      if (
        row.includes("behandla följande centrala innehåll") ||
        row.includes("behandla följande centrala") ||
        row.includes("behandla följande central") ||
        row.includes("behandla följande innehåll")
      ) {
        return "# Undervisningen i kursen ska behandla följande centrala innehåll:";
      }

      // Rows starting with ** and ends with **
      if (row.startsWith("**") && row.endsWith("**")) {
        return `# ${row.slice(2, -2)}`;
      }

      return row;
    })
    .flatMap((row) => {
      if ((row.startsWith("1. ") || row.startsWith("* ")) && !hasFoundHeader) {
        hasFoundHeader = true;
        return [
          `# Undervisningen i kursen ska behandla följande centrala innehåll:`,
          row,
        ];
      }

      if (row.startsWith("#")) {
        hasFoundHeader = true;
      }

      return row;
    });
}

function parseCentralContent(centralContent: string | null) {
  const markdownRows = getMarkdownFromHtml(
    pickOnlyIf.string(centralContent) ?? ""
  )
    ?.split("\n")
    ?.map((el) => el.trim());

  if (markdownRows == null) {
    return null;
  }

  const fixedRows = fixCentralContent(markdownRows);
  return normalizeSections(fixedRows);
}

function getFocusAreas(description: string | null, name: string, code: string) {
  const markdownRows = getMarkdownFromHtml(pickOnlyIf.string(description) ?? "")
    ?.split("\n")
    ?.map((el) => el.trim());

  if (markdownRows == null) {
    return null;
  }

  assert.lengthOf(markdownRows, 1, `in ${name} (${code})`);

  const expr =
    /^Kursen.+?(?:ska omfatta|omfattar|omfattar|bygger på)(.+?)(?:under rubriken Ämnets? syfte|under Ämnets? syfte|\.)/;

  const row = markdownRows[0];
  assert.match(row, expr, `in ${name} (${code})`);

  const [, match] = expr.exec(row)!;

  const finalMatchExpr = /(([0-9]+–[0-9]+)|([0-9]+)|(samtliga mål))/g;
  const matches = [...match.matchAll(finalMatchExpr)].map((el) => el[1]);
  assert.isAtLeast(matches.length, 1, `in ${name} (${code})`);

  return {
    string: row,
    entries: matches,
  };
}

function getKnowledgeRequirement(
  knowledgerequirement: string | null,
  name: string,
  code: string
) {
  const markdownRows = getMarkdownFromHtml(
    pickOnlyIf.string(
      knowledgerequirement
        ?.replace?.(/([a-ö]) Vidare/, (repl) => repl + ". Vidare")
        ?.replace?.(/([a-ö]) Eleven/, (repl) => repl + ". Eleven")
        ?.replace?.(/([a-ö]) Dessutom/, (repl) => repl + ". Dessutom")
        ?.replace?.(/handledareproblem/, "handledare problem")
    ) ?? ""
  )
    ?.split("\n")
    ?.map((el) => el.trim());

  if (markdownRows == null) {
    return null;
  }

  const { sections } = normalizeSections(markdownRows);

  assert.lengthOf(sections, 1, `in ${name} (${code})`);
  assert.match(
    sections[0].title ?? "",
    /^Betyget [ABCDE]$/,
    `in ${name} (${code})`
  );

  return sections[0].rows
    .flatMap((el) => el.split("."))
    .map((el) => el.trim())
    .filter((el) => !!el);
}

import * as jaroWinklerDistance from "jaro-winkler";

import { computeClosestMatches, computeStringMetrics } from "../utils/matrix";

function getKnowledgeRequirements(
  knowledgerequirements: any[],
  name: string,
  code: string
) {
  const grades = Object.fromEntries(
    knowledgerequirements.map((req) => [
      req?.gradestep?.[0],
      getKnowledgeRequirement(req?.text?.[0], name, code),
    ])
  );

  console.log(knowledgerequirements, grades);

  assert.isAtMost(
    grades["E"].length,
    grades["C"].length,
    `E->C, in ${name} (${code})`
  );
  assert.isAtMost(
    grades["C"].length,
    grades["A"].length,
    `C->A, in ${name} (${code})`
  );

  return computeClosestMatches(grades["E"], grades["C"], (a, b) =>
    jaroWinklerDistance(a, b)
  );
}

export async function normalizeCourses(
  inputDirectory: string,
  outputDirectory: string
) {
  const coursesDir = join(outputDirectory, "./courses");
  mkdirp.sync(coursesDir);

  for (const file of glob.sync("gyP4_0_S3_0/subject/*.xml", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    const contents = readFileSync(file, "utf-8");

    const subjectData = await parseXML(contents);
    const { subject } = subjectData;

    for (const course of subject.courses) {
      const result = {
        name: pickOnlyIf.string(course.name?.[0]),
        code: pickOnlyIf.string(course.code?.[0]),
        focusAreas: getFocusAreas(
          course.description?.[0],
          pickOnlyIf.string(course.name?.[0]) ?? "-",
          pickOnlyIf.string(course.code?.[0]) ?? "-"
        ),
        centralContent: parseCentralContent(
          course.centralcontent?.[0]?.text?.[0]
        ),
        knowledgeRequirements: getKnowledgeRequirements(
          course.knowledgerequirement,
          pickOnlyIf.string(course.name?.[0]) ?? "-",
          pickOnlyIf.string(course.code?.[0]) ?? "-"
        ),
      };

      assert.isNotNull(result.name);
      assert.isNotNull(result.code);

      assert.match(
        result.centralContent?.sections?.[0]?.title ?? "",
        /Undervisningen i kursen ska behandla följande centrala innehåll/,
        `in ${result.name} (${result.code})`
      );

      for (const section of result.centralContent?.sections ?? []) {
        for (const row of section.rows) {
          assert.match(
            row,
            /^[0-9]+\. .+\.$/i,
            `in ${result.name} (${result.code})`
          );
        }
      }

      writeFileSync(
        join(coursesDir, `c_${normalizeCode(result.code)}.json`),
        JSON.stringify(result, null, "  ")
      );
    }
  }
}
