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
    ?.map((el) => el.trim())
    ?.filter((el) => !!el)
    ?.filter((el) => !el.includes("Ämnet har upphört men kan tillämpas"));

  if (markdownRows == null) {
    return null;
  }

  assert.lengthOf(markdownRows, 1, `in ${name} (${code})`);

  const expr =
    /^Kursen.+?(?:ska omfatta|omfattar|omfattar|bygger på)(.+?)(?:under rubriken Ämnets? syfte|under Ämnets? syfte|\.)/;

  const row = markdownRows[0];
  assert.match(row, expr, `in ${name} (${code})`);

  const [, match] = expr.exec(row)!;

  const finalMatchExpr = /(([0-9]+[-][0-9]+)|([0-9]+)|(samtliga mål))/g;
  const matches = [...match.matchAll(finalMatchExpr)].map((el) => el[1]);
  assert.isAtLeast(matches.length, 1, `in ${name} (${code})`);

  return {
    string: row,
    entries: matches,
  };
}

const createDummySection = (i: number) =>
  `${i}THIS ${i}IS ${i}THE ${i}START ${i}OF ${i}SECTION`;

const isDummySection = (str: string) =>
  /\d+THIS \d+IS \d+THE \d+START \d+OF \d+SECTION/.test(str);

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
    return [null, null];
  }

  const { sections } = normalizeSections(markdownRows);

  assert.lengthOf(sections, 1, `in ${name} (${code})`);
  assert.match(
    sections[0].title ?? "",
    /^Betyget [ABCDE]$/,
    `in ${name} (${code})`
  );

  const splitRows = sections[0].rows.flatMap((el, i) =>
    el
      .replace(/\*\*\.\*\*\s+/g, ". ")
      .replace(/\.\*\*\s+/g, "**. ")
      .replace(/\*\*\.\*\*/g, ".")
      .replace(/\.\*\*/g, "**.")
      .split(".")
      .map((el) => [el, i] as const)
  );

  return splitRows
    .map(([el, i]) => {
      if (!el && i === splitRows.length - 1) {
        return "";
      }
      if (!el) {
        return createDummySection(i);
      }

      return (
        el
          .trim()
          .replace(/\*\* \*\*/g, " ")
          .replace(/\*\*\*\*/g, "**")
          .replaceAll("hans eller hennes", "hens")
          .replaceAll("hennes eller hans", "hens")
          .replaceAll("honom eller henne", "hen")
          .replaceAll("henne eller honom", "hen")
          .replaceAll("han eller hon", "hen")
          .replaceAll("hon eller han", "hen") + "."
      );
    })
    .filter((el) => !!el);
}

import * as jaroWinklerDistance from "jaro-winkler";

import { computeClosestMatches } from "../utils/matrix";

class Matrix<I, J, Value> {
  private _i = new Set<I>();
  private _j = new Set<J>();

  private _data: Map<J, Map<I, Value>> = new Map();

  set(i: I, j: J, value: Value) {
    this._i.add(i);
    this._j.add(j);

    const row = this._data.get(j) ?? new Map<I, Value>();
    row.set(i, value);

    this._data.set(j, row);
  }

  get(i: I, j: J) {
    return this._data.get(j)?.get?.(i) ?? null;
  }

  getRow(i: I) {
    const items: Value[] = [];
    for (const [j, row] of this._data) {
      items.push(row.get(i)!);
    }

    return items;
  }
}

function numberOfDummySections(rows: string[]) {
  return rows.filter((el) => isDummySection(el)).length;
}

function padDummySectionsToLength(rows: string[], length: number) {
  for (let i = numberOfDummySections(rows); i < length; i++) {
    rows.push(createDummySection(i));
  }
}

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

  const matrix = new Matrix<string, number, string>();

  const gradesE = grades["E"];
  const gradesC = grades["C"];
  const gradesA = grades["A"];

  const maxNumberOfDummySections = Math.max(
    numberOfDummySections(gradesE),
    numberOfDummySections(gradesC),
    numberOfDummySections(gradesA)
  );

  let base = gradesE;
  let baseGrade = "E";
  if (gradesC.length >= base.length) {
    base = gradesC;
    baseGrade = "C";
  }
  if (gradesA.length >= base.length) {
    base = gradesA;
    baseGrade = "A";
  }

  padDummySectionsToLength(gradesE, maxNumberOfDummySections);
  padDummySectionsToLength(gradesC, maxNumberOfDummySections);
  padDummySectionsToLength(gradesA, maxNumberOfDummySections);

  for (let i = 0; i < base.length; i++) {
    matrix.set(baseGrade, i, base[i]);
  }

  const matchesE = computeClosestMatches(gradesE, base, (a, b) =>
    jaroWinklerDistance(
      a.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " "),
      b.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " ")
    )
  );
  const matchesC = computeClosestMatches(gradesC, base, (a, b) =>
    jaroWinklerDistance(
      a.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " "),
      b.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " ")
    )
  );
  const matchesA = computeClosestMatches(gradesA, base, (a, b) =>
    jaroWinklerDistance(
      a.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " "),
      b.replace(/\*\*.+?\*\*/g, "").replace(/\s+/g, " ")
    )
  );

  for (let i = 0; i < gradesE.length; i++) {
    matrix.set("E", matchesE[i], gradesE[i]);
    matrix.set("C", matchesE[i], gradesE[i]);
    matrix.set("A", matchesE[i], gradesE[i]);
  }
  for (let i = 0; i < gradesC.length; i++) {
    matrix.set("C", matchesC[i], gradesC[i]);
    matrix.set("A", matchesC[i], gradesC[i]);
  }
  for (let i = 0; i < gradesA.length; i++) {
    matrix.set("A", matchesA[i], gradesA[i]);
  }

  const collect = (grade: string) => {
    const split: string[][] = [];
    let collector: string[] = [];
    for (const row of matrix.getRow(grade)) {
      if (row != null && isDummySection(row)) {
        split.push(collector);
        collector = [];
      } else {
        collector.push(row);
      }
    }
    split.push(collector);

    return split.filter((el) => el.length > 0);
  };

  const collectedE = collect("E");
  const collectedC = collect("C");
  const collectedA = collect("A");

  assert.equal(
    collectedE.length,
    collectedC.length,
    `E->C, in ${name} (${code})`
  );
  assert.equal(
    collectedC.length,
    collectedA.length,
    `C->A, in ${name} (${code})`
  );

  return {
    E: collectedE,
    C: collectedC,
    A: collectedA,
  };
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
    if (file.includes("parallell version")) {
      console.info(`Ignoring '${file}' due to parallell version`);
      continue;
    }

    const contents = readFileSync(file, "utf-8")
      .replaceAll("–", "-")
      .replaceAll("—", "-")
      .replaceAll(String.fromCharCode(173), "");

    const subjectData = await parseXML(contents);
    const { subject } = subjectData;
    const appliesFrom = new Date(subject.appliancedate[0]);

    if (Date.now() < +appliesFrom) {
      console.info(`Ignoring '${file}' due to not yet applicable`);
      continue; // Ignore if not yet applicable
    }

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
