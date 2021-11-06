import * as mkdirp from "mkdirp";
import * as glob from "glob";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { getSortableCode, getSortedCodes, normalizeCode } from "../utils/code";
import { getIndicesFromRange } from "../utils/range";

function removeNumberingFromRows(rows: any[]) {
  return rows?.map((row) => row.replace(/^\d+\. /, ""));
}

let allSubjects: any[];

function readSubjects(inputDirectory: string) {
  if (allSubjects != null) return allSubjects;

  allSubjects = [];
  for (const file of glob.sync("subjects/**/*.json", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    allSubjects.push(JSON.parse(readFileSync(file, "utf-8")));
  }

  return allSubjects;
}

export async function parseCourses(
  inputDirectory: string,
  outputDirectory: string
) {
  const coursesDir = join(outputDirectory, "./course");
  mkdirp.sync(coursesDir);

  const courses: any[] = [];

  for (const file of glob.sync("courses/**/*.json", {
    cwd: inputDirectory,
    absolute: true,
  })) {
    const contents = JSON.parse(readFileSync(file, "utf-8"));

    const allSubjectData = readSubjects(inputDirectory);
    const subject = allSubjectData.find((el) =>
      contents.code.startsWith(el.code)
    );

    const coursesInfo =
      subject.purpose.sections.find((section: any) =>
        section.title?.startsWith("Kurser i ämnet")
      )?.rows ?? [];

    let points: number | null = null;
    for (const row of removeNumberingFromRows(coursesInfo)) {
      if (row.toLowerCase().includes(contents.name.toLowerCase() + ", ")) {
        const split = row.split(",");
        points = parseInt(split[split.length - 1].replace("poäng.", ""));
        break;
      }
    }

    let centralContent: any[] = [];
    if (contents.centralContent.sections.length > 1) {
      for (const section of contents.centralContent.sections.slice(1)) {
        centralContent.push([
          section.title,
          removeNumberingFromRows(section.rows),
        ]);
      }
    } else {
      centralContent.push([
        null,
        removeNumberingFromRows(contents.centralContent.sections[0].rows),
      ]);
    }

    const fixCriteria = (entry: string[][]) => {
      const result: string[][] = [];
      for (const array of entry) {
        result.push(
          array.map(
            (row) =>
              row?.replace(
                /\*\*([^*]+?)\*\*/g,
                (_, repl) => `<strong>${repl}</strong>`
              ) ?? null
          )
        );
      }
      return result;
    };

    const result = {
      subject: subject.code,
      title: contents.name,
      code: contents.code,
      points,
      criteria: {
        A: fixCriteria(contents.knowledgeRequirements.A),
        // .replace(
        //   /\*\*()\*\*/g,
        //   (repl) => `<strong>${repl}</strong>`
        // ),
        C: fixCriteria(contents.knowledgeRequirements.C),
        // .replace(
        //   /\*\*()\*\*/g,
        //   (repl) => `<strong>${repl}</strong>`
        // ),
        E: fixCriteria(contents.knowledgeRequirements.E),
        // .replace(
        //   /\*\*()\*\*/g,
        //   (repl) => `<strong>${repl}</strong>`
        // ),
      },
      centralContent,
      UNSAFE_description: contents.focusAreas.string,
      applicableSubjectPurposes: contents.focusAreas.entries.flatMap(
        (range: string) => getIndicesFromRange(range)
      ),
    };

    if (contents.centralContent.sections.length > 1) console.log(result);

    const name = `c_${normalizeCode(result.code)}.json`;
    writeFileSync(join(coursesDir, name), JSON.stringify(result, null, "  "));

    courses.push({
      code: result.code,
      title: result.title,
      file: "./course/" + name,
    });
  }

  courses.sort((a, b) =>
    getSortableCode(a.code).localeCompare(getSortableCode(b.code))
  );
  writeFileSync(
    join(outputDirectory, "./courses.json"),
    JSON.stringify(courses, null, "  ")
  );
}
